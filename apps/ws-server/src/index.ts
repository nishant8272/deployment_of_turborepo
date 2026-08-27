import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import prisma from '@repo/db/client';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';
const INTERNAL_WS_SECRET = process.env.INTERNAL_WS_SECRET || 'super-secret-internal-key';
const PORT = process.env.PORT || 3003;

const broadcastSchema = z.object({
  boardId: z.string(),
  event: z.string(),
  data: z.any()
});

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/internal/broadcast') {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== INTERNAL_WS_SECRET) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const parsed = broadcastSchema.safeParse(payload);
        
        if (!parsed.success) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid payload schema' }));
          return;
        }

        const { boardId, event, data } = parsed.data;
        
        broadcastToBoard(boardId, { event, data });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Bad Request' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ 
  server,
  verifyClient: (info, cb) => {
  const token = getAccessTokenFromCookie(
    info.req.headers.cookie
  );

  if (!token) {
    cb(false, 401, 'Unauthorized');
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as { id: string };

    if (!decoded.id) {
      cb(false, 401, 'Unauthorized');
      return;
    }

    (info.req as any).userId = decoded.id;

    cb(true);
  } catch {
    cb(false, 401, 'Unauthorized');
  }
}
});


function getAccessTokenFromCookie(
  cookieHeader: string | undefined
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');

    if (name === 'access_token') {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return undefined;
}


interface CustomWebSocket extends WebSocket {
  userId?: string;
  boardId?: string;
  isAlive?: boolean;
}

const clients = new Set<CustomWebSocket>();

function broadcastToBoard(boardId: string, message: any) {
  const messageStr = JSON.stringify(message);
  for (const client of clients) {
    if (client.boardId === boardId && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

wss.on('connection', (ws: CustomWebSocket, req: http.IncomingMessage) => {
  ws.isAlive = true;
  ws.userId = (req as any).userId;
  clients.add(ws);

  ws.send(JSON.stringify({ event: 'authenticated' }));

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message: string) => {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.type === 'join') {
        if (!ws.userId) {
          ws.send(JSON.stringify({ error: 'Not authenticated' }));
          return;
        }
        
        const boardId = parsed.boardId;
        
        // Verify Board Authorization
        const membership = await prisma.boardMember.findUnique({
          where: {
            boardId_userId: { boardId, userId: ws.userId }
          }
        });

        if (!membership) {
          ws.send(JSON.stringify({ error: 'Forbidden: Not a board member' }));
          return;
        }

        ws.boardId = boardId;
        ws.send(JSON.stringify({ event: 'joined', boardId: ws.boardId }));
      }
      
      if (parsed.type === 'leave') {
        ws.boardId = undefined;
      }
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Heartbeat to clear dead connections
const interval = setInterval(() => {
  for (const ws of clients) {
    if (ws.isAlive === false) {
      clients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});