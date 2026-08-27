import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  position: z.number().optional(), // If not provided, backend will calculate it
});

export const updateListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
});

export const reorderListsSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    position: z.number()
  }))
});
