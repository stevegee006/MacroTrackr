import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

export const updateProfileSchema = z.object({
  heightCm: z.number().positive().max(300).nullable().optional(),
  weightKg: z.number().positive().max(500).nullable().optional(),
  age: z.number().int().positive().max(150).nullable().optional(),
  sex: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  activityLevel: z
    .enum(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'EXTREMELY_ACTIVE'])
    .nullable()
    .optional(),
  goal: z.enum(['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE']).nullable().optional(),
  targetCalories: z.number().int().positive().max(10000).nullable().optional(),
  targetProteinG: z.number().int().nonnegative().max(1000).nullable().optional(),
  targetCarbsG: z.number().int().nonnegative().max(2000).nullable().optional(),
  targetFatG: z.number().int().nonnegative().max(1000).nullable().optional(),
});

export const updateSettingsSchema = z.object({
  openaiApiKey: z.string().min(1).max(500).optional(),
  preferredUnits: z.enum(['METRIC', 'IMPERIAL']).optional(),
  darkMode: z.boolean().optional(),
  timezone: z.string().min(1).max(100).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  mealieUrl: z.string().url().max(500).nullable().optional(),
  mealieApiKey: z.string().min(1).max(500).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

export const appSettingsSchema = z.object({
  signupsEnabled: z.boolean().optional(),
  usdaApiKey: z.string().max(100).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
