import { Router, Response, NextFunction } from 'express';
import prisma from '@repo/db/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createCardSchema, updateCardSchema, moveCardSchema, reorderCardsSchema } from '../validators/card';
import { createCommentSchema, updateCommentSchema } from '../validators/comment';
import { addCardMemberSchema } from '../validators/cardMember';
import { broadcast } from '../lib/broadcast';

const router: Router = Router();
router.use(authenticate);

// Middleware to authorize card operations
const requireCardAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.cardId as string;
    const card = await prisma.card.findUnique({ 
      where: { id: cardId },
      include: { list: true }
    });
    
    if (!card) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } });
      return;
    }

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } }
    });

    if (!member) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this card' } });
      return;
    }

    (req as any).card = card;
    (req as any).boardRole = member.role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
};

// Middleware to authorize list operations (for creating/reordering cards in a list)
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

    (req as any).list = list;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
};

// POST /lists/:listId/cards - Create a card
router.post('/lists/:listId/cards', requireListAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = createCardSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    let { title, description, position } = validatedData.data;
    const listId = req.params.listId as string;

    if (position === undefined) {
      const lastCard = await prisma.card.findFirst({
        where: { listId },
        orderBy: { position: 'desc' }
      });
      position = lastCard ? lastCard.position + 1000 : 1000;
    }

    const card = await prisma.card.create({
      data: {
        title,
        description,
        position,
        listId,
        createdById: req.user!.id
      }
    });

    const boardId = (req as any).list.boardId;
    broadcast(boardId, 'card.created', card);

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create card' } });
  }
});

// GET /cards/:cardId - Get specific card details
router.get('/cards/:cardId', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const cardId = req.params.cardId as string;
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        comments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });
    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch card' } });
  }
});

// PATCH /cards/:cardId - Update card details
router.patch('/cards/:cardId', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = updateCardSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const data: any = { ...validatedData.data };
    if (data.dueDate) {
      data.dueDate = new Date(data.dueDate);
    }

    const cardId = req.params.cardId as string;
    const card = await prisma.card.update({
      where: { id: cardId },
      data
    });

    const currentCard = (req as any).card;
    broadcast(currentCard.list.boardId, 'card.updated', card);

    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update card' } });
  }
});

// DELETE /cards/:cardId - Delete a card
router.delete('/cards/:cardId', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const cardId = req.params.cardId as string;
    await prisma.card.delete({
      where: { id: cardId }
    });

    const currentCard = (req as any).card;
    broadcast(currentCard.list.boardId, 'card.deleted', { id: cardId });

    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete card' } });
  }
});

// PATCH /cards/:cardId/move - Move a card to another list or reorder
router.patch('/cards/:cardId/move', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = moveCardSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const { toListId, position } = validatedData.data;
    
    const toList = await prisma.list.findUnique({ where: { id: toListId } });
    if (!toList) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target list not found' } });
      return;
    }
    
    const currentCard = (req as any).card;
    if (currentCard.list.boardId !== toList.boardId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Cannot move card to a different board' } });
      return;
    }

    const cardId = req.params.cardId as string;
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        listId: toListId,
        position
      }
    });

    const boardId = currentCard.list.boardId;
    broadcast(boardId, 'card.moved', { cardId, toListId, position });

    res.json({ success: true, data: card });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to move card' } });
  }
});

// PATCH /lists/:listId/cards/reorder - Reorder multiple cards in a list
router.patch('/lists/:listId/cards/reorder', requireListAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = reorderCardsSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const { items } = validatedData.data;
    const listId = req.params.listId as string;

    await prisma.$transaction(
      items.map((item) => 
        prisma.card.updateMany({
          where: { id: item.id, listId },
          data: { position: item.position }
        })
      )
    );

    const boardId = (req as any).list.boardId;
    broadcast(boardId, 'cards.reordered', { listId, items });

    res.json({ success: true, message: 'Cards reordered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reorder cards' } });
  }
});

// ========================
// COMMENT ENDPOINTS
// ========================

router.post('/cards/:cardId/comments', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = createCommentSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const cardId = req.params.cardId as string;
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.data.content,
        cardId,
        userId: req.user!.id
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create comment' } });
  }
});

// GET comments for a card
router.get('/cards/:cardId/comments', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const cardId = req.params.cardId as string;
    const comments = await prisma.comment.findMany({
      where: { cardId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch comments' } });
  }
});

// We need a middleware to check comment ownership for PATCH/DELETE
const requireCommentOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.commentId as string;
    const comment = await prisma.comment.findUnique({ 
      where: { id: commentId },
      include: { card: { include: { list: true } } }
    });
    if (!comment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } });
      return;
    }

    if (comment.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only modify your own comments' } });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
  }
};

router.patch('/comments/:commentId', requireCommentOwnership, async (req: AuthRequest, res) => {
  try {
    const validatedData = updateCommentSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const commentId = req.params.commentId as string;
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: validatedData.data.content }
    });

    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update comment' } });
  }
});

router.delete('/comments/:commentId', requireCommentOwnership, async (req: AuthRequest, res) => {
  try {
    const commentId = req.params.commentId as string;
    await prisma.comment.delete({
      where: { id: commentId }
    });
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete comment' } });
  }
});

// ========================
// CARD MEMBER ENDPOINTS
// ========================

router.post('/cards/:cardId/members', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const validatedData = addCardMemberSchema.safeParse(req.body);
    if (!validatedData.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: (validatedData as any).error.errors[0].message } });
      return;
    }

    const { userId } = validatedData.data;

    // Verify user is member of board
    const boardId = (req as any).card.list.boardId;
    const boardMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } }
    });

    if (!boardMember) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'User is not a member of the board' } });
      return;
    }

    const cardId = req.params.cardId as string;
    const cardMember = await prisma.cardMember.create({
      data: {
        cardId,
        userId
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    res.status(201).json({ success: true, data: cardMember });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add card member' } });
  }
});

router.delete('/cards/:cardId/members/:userId', requireCardAccess, async (req: AuthRequest, res) => {
  try {
    const cardId = req.params.cardId as string;
    const userId = req.params.userId as string;
    await prisma.cardMember.delete({
      where: {
        cardId_userId: {
          cardId,
          userId
        }
      }
    });
    res.json({ success: true, message: 'Card member removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to remove card member' } });
  }
});

export default router;
