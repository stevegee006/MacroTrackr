import { z } from 'zod';

export const generateMealPlanSchema = z.object({
  durationDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  preferences: z
    .object({
      dietaryRestrictions: z.array(z.string().max(100)).max(10).optional(),
      cuisinePreferences: z.array(z.string().max(100)).max(10).optional(),
      mealsPerDay: z.number().int().min(2).max(6).optional(),
      cookingSkill: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      maxPrepTimeMinutes: z.number().int().positive().max(180).optional(),
    })
    .optional(),
});

export const mealPlanIngredientSchema = z.object({
  name: z.string(),
  quantityG: z.number().positive(),
  notes: z.string().optional(),
});

export const mealPlanMealSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
  name: z.string(),
  ingredients: z.array(mealPlanIngredientSchema),
  macros: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  }),
  prepTimeMinutes: z.number().int().positive(),
  instructions: z.string(),
});

const mealPlanDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  meals: z.array(mealPlanMealSchema),
  dayTotals: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  }),
});

export const mealPlanDataSchema = z.object({
  days: z.array(mealPlanDaySchema),
});

export const updateMealPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  targetCalories: z.number().int().positive().optional(),
  targetProteinG: z.number().int().nonnegative().optional(),
  targetCarbsG: z.number().int().nonnegative().optional(),
  targetFatG: z.number().int().nonnegative().optional(),
});

export const createManualMealPlanSchema = z.object({
  name: z.string().min(1).max(255),
  durationDays: z.number().int().positive().max(30),
  targetCalories: z.number().int().positive(),
  targetProteinG: z.number().int().nonnegative(),
  targetCarbsG: z.number().int().nonnegative(),
  targetFatG: z.number().int().nonnegative(),
  planData: mealPlanDataSchema,
});

export type GenerateMealPlanInput = z.infer<typeof generateMealPlanSchema>;
export type UpdateMealPlanInput = z.infer<typeof updateMealPlanSchema>;
export type MealPlanDataSchema = z.infer<typeof mealPlanDataSchema>;
export type CreateManualMealPlanInput = z.infer<typeof createManualMealPlanSchema>;
