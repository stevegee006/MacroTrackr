import type { Goal } from './user.js';

export interface MacroPlan {
  id: string;
  userId: string;
  name: string;
  goal: Goal;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  reasoning: string;
  aiModel: string;
  isActive: boolean;
  createdAt: string;
}
