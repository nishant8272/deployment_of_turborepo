import { z } from 'zod';

export const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long').optional(),
  description: z.string().optional(),
});
