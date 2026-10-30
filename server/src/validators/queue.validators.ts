import { z } from 'zod';

export const generateTokenSchema = z.object({
  counterId: z.string().min(1, 'Select a counter'),
  mealId: z.string().min(1, 'Select a meal session'),
});

export const queueQuerySchema = z.object({
  counterId: z.string().min(1, 'counterId is required'),
  mealId: z.string().min(1, 'mealId is required'),
});

export const callNextSchema = queueQuerySchema;

export const activityQuerySchema = z.object({
  counterId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
