import { Response, NextFunction } from 'express';
import prisma from '@repo/db/client';
import { AuthRequest } from './auth';

export interface BoardAuthRequest extends AuthRequest {
  boardRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export const requireBoardMember = async (req: BoardAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const boardId = req.params.boardId as string;

    if (!userId || !boardId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
      return;
    }

    const member = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this board' } });
      return;
    }

    req.boardRole = member.role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
};
