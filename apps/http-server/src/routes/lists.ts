import { Router, Response, NextFunction } from 'express';
import prisma from '@repo/db/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireBoardMember, BoardAuthRequest } from '../middleware/boardAuth';
import { createListSchema, updateListSchema, reorderListsSchema } from '../validators/list';
import { broadcast } from '../lib/broadcast';

const router: Router = Router();
router.use(authenticate);

// Middleware to authorize list operations
const requireListAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listId = req.params.listId as string;
    const list = await prisma.list.findUnique({ where: { id: listId } });
    
    if (!list) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'List not found' } });
      return;
    }

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId: req.user!.id } }
    });

    if (!member) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this list' } });
      return;
    }

    // Attach list and member role to request for later use
    (req as any).list = list;
    (req as any).boardRole = member.role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
};


// POST /boards/:boardId/lists - Create a new list
router.post('/boards/:boardId/lists', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    const validatedData = createListSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    let { title, position } = validatedData.data;
    const boardId = req.params.boardId as string;

    if (position === undefined) {
      // Find highest position
      const lastList = await prisma.list.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' }
      });
      position = lastList ? lastList.position + 1000 : 1000;
    }

    const list = await prisma.list.create({
      data: {
        title,
        position,
        boardId
      }
    });

    broadcast(boardId, 'list.created', list);

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create list' } });
  }
});

// PATCH /boards/:boardId/lists/reorder - Reorder multiple lists
router.patch('/boards/:boardId/lists/reorder', requireBoardMember, async (req: BoardAuthRequest, res) => {
  try {
    const validatedData = reorderListsSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const { items } = validatedData.data;
    const boardId = req.params.boardId as string;

    // Use a transaction to perform all updates
    await prisma.$transaction(
      items.map((item) => 
        prisma.list.updateMany({
          where: { id: item.id, boardId },
          data: { position: item.position }
        })
      )
    );

    broadcast(boardId, 'lists.reordered', { items });

    res.json({ success: true, message: 'Lists reordered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reorder lists' } });
  }
});

// PATCH /lists/:listId - Update list
router.patch('/lists/:listId', requireListAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = updateListSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const listId = req.params.listId as string;
    const list = await prisma.list.update({
      where: { id: listId },
      data: validatedData.data
    });

    const boardId = (req as any).list.boardId;
    broadcast(boardId, 'list.updated', list);

    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update list' } });
  }
});

// DELETE /lists/:listId - Delete list
router.delete('/lists/:listId', requireListAccess, async (req: AuthRequest, res) => {
  try {
    const listId = req.params.listId as string;
    await prisma.list.delete({
      where: { id: listId }
    });

    const boardId = (req as any).list.boardId;
    broadcast(boardId, 'list.deleted', { id: listId });

    res.json({ success: true, message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete list' } });
  }
});

export default router;
