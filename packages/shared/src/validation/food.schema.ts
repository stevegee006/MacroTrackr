import { z } from 'zod';

export const createFoodItemSchema = z.object({
  barcode: z.string().max(50).optional(),
  name: z.string().min(1).max(255),
  brand: z.string().max(255).optional(),
  servingSizeG: z.number().positive(),
  servingUnit: z.string().max(20).default('g'),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().nullable().optional(),
  sugarPer100g: z.number().nonnegative().nullable().optional(),
  sodiumPer100g: z.number().nonnegative().nullable().optional(),
});

export const searchFoodSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const updateFoodItemSchema = createFoodItemSchema.partial();

export const scanLabelSchema = z.object({
  image: z.string().min(1),
});

export const labelScanResponseSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  servingSizeG: z.number().positive(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().nullable().optional(),
  sugarPer100g: z.number().nonnegative().nullable().optional(),
  sodiumPer100g: z.number().nonnegative().nullable().optional(),
});

export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
export type UpdateFoodItemInput = z.infer<typeof updateFoodItemSchema>;
export type ScanLabelInput = z.infer<typeof scanLabelSchema>;
export type LabelScanResponse = z.infer<typeof labelScanResponseSchema>;
export type SearchFoodInput = z.infer<typeof searchFoodSchema>;
