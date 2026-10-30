import { z } from 'zod';
import { MENU_CATEGORIES } from '../config/constants';
import { dateStr, email, password, phone, timeStr } from './common';

const serviceSecs = z.coerce.number().int().min(20, 'Minimum 20 seconds').max(600, 'Maximum 600 seconds');

export const counterCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(60),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,3}$/, 'Code must be 1–3 letters'),
  description: z.string().trim().max(200).optional(),
  serviceSecs: serviceSecs.nullable().optional(),
  isActive: z.boolean().optional(),
});
export const counterUpdateSchema = counterCreateSchema.partial();

export const mealUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => !v.startTime || !v.endTime || v.startTime < v.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const settingsUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  defaultServiceSecs: serviceSecs.optional(),
  approachThreshold: z.coerce.number().int().min(1).max(10).optional(),
  enforceMealTimings: z.boolean().optional(),
});

export const menuQuerySchema = z.object({
  date: dateStr.optional(),
  mealId: z.string().optional(),
});

export const menuCreateSchema = z.object({
  name: z.string().trim().min(2, 'Item name is required').max(80),
  description: z.string().trim().max(200).optional(),
  category: z.enum(MENU_CATEGORIES),
  isVeg: z.boolean().default(true),
  date: dateStr,
  mealId: z.string().min(1, 'Select a meal session'),
});
export const menuUpdateSchema = menuCreateSchema.partial();

export const menuCopySchema = z
  .object({ fromDate: dateStr, toDate: dateStr, replace: z.boolean().default(false) })
  .refine((v) => v.fromDate !== v.toDate, { message: 'Source and target dates must differ', path: ['toDate'] });

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  email,
  phone,
  password,
  assignedCounterId: z.string().nullable().optional(),
});
export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: email.optional(),
  phone,
  password: password.optional().or(z.literal('').transform(() => undefined)),
  assignedCounterId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const reportQuerySchema = z
  .object({
    from: dateStr,
    to: dateStr,
    counterId: z.string().optional(),
    mealId: z.string().optional(),
    type: z.enum(['summary', 'tokens']).default('summary'),
  })
  .refine((v) => v.from <= v.to, { message: '"From" date must be on or before "To" date', path: ['to'] });
