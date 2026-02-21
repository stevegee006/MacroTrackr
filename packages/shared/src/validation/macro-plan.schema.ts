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

export type GenerateMacroPlanInput = z.infer<typeof generateMacroPlanSchema>;
export type MacroPlanResponse = z.infer<typeof macroPlanResponseSchema>;
