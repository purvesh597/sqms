import { z } from 'zod';

export const idParam = z.object({ id: z.string().min(1) });
export const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
export const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm (24h) format');
export const email = z.string().trim().toLowerCase().email('Enter a valid email address');
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');
export const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,16}$/, 'Enter a valid phone number')
  .optional()
  .or(z.literal('').transform(() => undefined));
