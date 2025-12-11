import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../shared/validators';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().max(100, 'Name too long').optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
