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
  brand: z.string().nullable().optional(),
  servingSizeG: z.coerce.number().positive(),
  caloriesPer100g: z.coerce.number().nonnegative(),
  proteinPer100g: z.coerce.number().nonnegative(),
  carbsPer100g: z.coerce.number().nonnegative(),
  fatPer100g: z.coerce.number().nonnegative(),
  fiberPer100g: z.coerce.number().nonnegative().nullable().optional(),
  sugarPer100g: z.coerce.number().nonnegative().nullable().optional(),
  sodiumPer100g: z.coerce.number().nonnegative().nullable().optional(),
});

export const estimateFoodSchema = z.object({
  description: z.string().min(1).max(500),
  weightG: z.number().positive(),
});

export const externalFoodSearchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().positive().max(25).default(10),
});

export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
export type UpdateFoodItemInput = z.infer<typeof updateFoodItemSchema>;
export type ScanLabelInput = z.infer<typeof scanLabelSchema>;
export type LabelScanResponse = z.infer<typeof labelScanResponseSchema>;
export type SearchFoodInput = z.infer<typeof searchFoodSchema>;
export type EstimateFoodInput = z.infer<typeof estimateFoodSchema>;
export const importUsdaFoodSchema = z.object({
  fdcId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  brand: z.string().max(255).nullable(),
  servingSizeG: z.number().positive(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().nullable(),
  sugarPer100g: z.number().nonnegative().nullable(),
  sodiumPer100g: z.number().nonnegative().nullable(),
  dataType: z.string().max(50),
});

export const importOffFoodSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  brand: z.string().max(255).nullable(),
  servingSizeG: z.number().positive(),
  caloriesPer100g: z.number().nonnegative(),
  proteinPer100g: z.number().nonnegative(),
  carbsPer100g: z.number().nonnegative(),
  fatPer100g: z.number().nonnegative(),
  fiberPer100g: z.number().nonnegative().nullable(),
  sugarPer100g: z.number().nonnegative().nullable(),
  sodiumPer100g: z.number().nonnegative().nullable(),
  imageUrl: z.string().nullable(),
  categories: z.string().nullable().optional(),
});

export type ExternalFoodSearchInput = z.infer<typeof externalFoodSearchSchema>;
export type ImportUsdaFoodInput = z.infer<typeof importUsdaFoodSchema>;
export type ImportOffFoodInput = z.infer<typeof importOffFoodSchema>;
