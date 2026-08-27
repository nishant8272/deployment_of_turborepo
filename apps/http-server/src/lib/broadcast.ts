const WS_SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:3003';
const INTERNAL_WS_SECRET = process.env.INTERNAL_WS_SECRET || 'super-secret-internal-key';

export const broadcast = async (boardId: string, event: string, data: any) => {
  try {
    const res = await fetch(`${WS_SERVER_URL}/internal/broadcast`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_WS_SECRET
      },
      body: JSON.stringify({ boardId, event, data })
    });
    if (!res.ok) {
      console.error('WS Broadcast failed with status:', res.status);
    }
  } catch (error) {
    console.error('Failed to broadcast event to WS server:', error);
  }
};
