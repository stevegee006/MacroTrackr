import { z } from 'zod';

export const createFoodLogSchema = z.object({
  foodItemId: z.string().uuid(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  servingQty: z.number().positive(),
  servingSizeG: z.number().positive(),
  notes: z.string().max(500).optional(),
});

export const updateFoodLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).optional(),
  servingQty: z.number().positive().optional(),
  servingSizeG: z.number().positive().optional(),
  notes: z.string().max(500).nullable().optional(),
  // Direct macro overrides (skip recalculation when provided)
  totalCalories: z.number().nonnegative().optional(),
  totalProteinG: z.number().nonnegative().optional(),
  totalCarbsG: z.number().nonnegative().optional(),
  totalFatG: z.number().nonnegative().optional(),
  totalFiberG: z.number().nonnegative().nullable().optional(),
  totalSugarG: z.number().nonnegative().nullable().optional(),
});

export const foodLogQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const foodLogRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;
