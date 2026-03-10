export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'GITHUB' | 'SAML' | 'OIDC';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';
export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHTLY_ACTIVE'
  | 'MODERATELY_ACTIVE'
  | 'VERY_ACTIVE'
  | 'EXTREMELY_ACTIVE';
export type Goal = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';
export type Units = 'METRIC' | 'IMPERIAL';
export type AiProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  targetCalories: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
  aiProvider: AiProvider;
  hasMealieConfig: boolean;
  preferredUnits: Units;
  darkMode: boolean;
  timezone: string | null;
  location: string | null;
}
