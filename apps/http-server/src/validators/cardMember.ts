import { z } from 'zod';

export const addCardMemberSchema = z.object({
  userId: z.string(),
});
