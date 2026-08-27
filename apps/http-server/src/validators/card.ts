import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().optional(),
  position: z.number().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(), // ISO string date
});

export const moveCardSchema = z.object({
  toListId: z.string(),
  position: z.number(),
});

export const reorderCardsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    position: z.number()
  }))
});
