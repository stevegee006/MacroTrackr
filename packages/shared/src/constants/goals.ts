import type { Goal } from '../types/user.js';

export const GOAL_LABELS: Record<Goal, string> = {
  LOSE_WEIGHT: 'Lose Weight',
  MAINTAIN: 'Maintain Weight',
  GAIN_MUSCLE: 'Gain Muscle',
};

export const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  LOSE_WEIGHT: -500,
  MAINTAIN: 0,
  GAIN_MUSCLE: 300,
};
