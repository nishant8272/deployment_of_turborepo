import { Router, Response, NextFunction } from 'express';
import prisma from '@repo/db/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireBoardMember, BoardAuthRequest } from '../middleware/boardAuth';
import { createBoardSchema, updateBoardSchema } from '../validators/board';

const router: Router = Router();

router.use(authenticate);

// GET /boards - List all boards for the authenticated user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: req.user!.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: boards });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch boards' } });
  }
});

// POST /boards - Create a new board
router.post('/', async (req: AuthRequest, res) => {
  try {
    const validatedData = createBoardSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const { title, description } = validatedData.data;

    const board = await prisma.board.create({
      data: {
        title,
        description,
        ownerId: req.user!.id,
        members: {
          create: {
            userId: req.user!.id,
            role: 'OWNER'
          }
        }
      }
    });

    res.status(201).json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create board' } });
  }
});

// GET /boards/:boardId - Get a specific board with lists and cards
router.get('/:boardId', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                members: {
                  include: {
                    user: { select: { id: true, name: true, email: true } }
                  }
                },
                comments: true
              }
            }
          }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    if (!board) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Board not found' } });
      return;
    }

    res.json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch board' } });
  }
});

// PATCH /boards/:boardId - Update board
router.patch('/:boardId', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    if (req.boardRole !== 'OWNER' && req.boardRole !== 'ADMIN') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Requires OWNER or ADMIN role' } });
      return;
    }

    const validatedData = updateBoardSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const boardId = req.params.boardId as string;
    const board = await prisma.board.update({
      where: { id: boardId },
      data: validatedData.data
    });

    res.json({ success: true, data: board });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update board' } });
  }
});

// DELETE /boards/:boardId - Delete board
router.delete('/:boardId', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    if (req.boardRole !== 'OWNER') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the OWNER can delete the board' } });
      return;
    }

    const boardId = req.params.boardId as string;
    await prisma.board.delete({
      where: { id: boardId }
    });

    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete board' } });
  }
});

// POST /boards/:boardId/members - Add member to board
router.post('/:boardId/members', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    if (req.boardRole !== 'OWNER' && req.boardRole !== 'ADMIN') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Requires OWNER or ADMIN role' } });
      return;
    }

    const { email, role } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    const boardId = req.params.boardId as string;
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: { boardId, userId: targetUser.id }
      }
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'User is already a member' } });
      return;
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: targetUser.id,
        role: role || 'MEMBER'
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add member' } });
  }
});

// DELETE /boards/:boardId/members/:userId - Remove member
router.delete('/:boardId/members/:userId', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    const userId = req.params.userId as string;
    if (req.boardRole !== 'OWNER' && req.boardRole !== 'ADMIN' && req.user!.id !== userId) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove other members' } });
      return;
    }

    const boardId = req.params.boardId as string;
    const targetMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } }
    });

    if (!targetMember) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      return;
    }

    if (targetMember.role === 'OWNER') {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cannot remove the board owner' } });
      return;
    }

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId, userId } }
    });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to remove member' } });
  }
});

export default router;
