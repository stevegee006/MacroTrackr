import { z } from 'zod';

export const generateMacroPlanSchema = z.object({
  goal: z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE']),
  customNotes: z.string().max(1000).optional(),
});

export const macroPlanResponseSchema = z.object({
  targetCalories: z.number().int().positive(),
  targetProteinG: z.number().int().positive(),
  targetCarbsG: z.number().int().positive(),
  targetFatG: z.number().int().positive(),
  reasoning: z.string().min(50),
});

export const createManualMacroPlanSchema = z.object({
  name: z.string().min(1).max(255),
  goal: z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE']),
  targetCalories: z.number().int().positive(),
  targetProteinG: z.number().int().nonnegative(),
  targetCarbsG: z.number().int().nonnegative(),
  targetFatG: z.number().int().nonnegative(),
});

export const updateMacroPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  goal: z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE']).optional(),
  targetCalories: z.number().int().positive().optional(),
  targetProteinG: z.number().int().nonnegative().optional(),
  targetCarbsG: z.number().int().nonnegative().optional(),
  targetFatG: z.number().int().nonnegative().optional(),
});

export type GenerateMacroPlanInput = z.infer<typeof generateMacroPlanSchema>;
export type CreateManualMacroPlanInput = z.infer<typeof createManualMacroPlanSchema>;
export type UpdateMacroPlanInput = z.infer<typeof updateMacroPlanSchema>;
export type MacroPlanResponse = z.infer<typeof macroPlanResponseSchema>;
