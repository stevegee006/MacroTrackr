import type { MealType } from './food-log.js';

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  durationDays: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  planData: MealPlanData;
  preferences: MealPlanPreferences | null;
  aiModel: string;
  createdAt: string;
}

export interface MealPlanData {
  days: MealPlanDay[];
}

export interface MealPlanDay {
  dayNumber: number;
  meals: MealPlanMeal[];
  dayTotals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
}

export interface MealPlanMeal {
  mealType: MealType;
  name: string;
  ingredients: MealPlanIngredient[];
  macros: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  prepTimeMinutes: number;
  instructions: string;
}

export interface MealPlanIngredient {
  name: string;
  quantityG: number;
  notes?: string;
}

export interface MealPlanPreferences {
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  mealsPerDay?: number;
  cookingSkill?: 'beginner' | 'intermediate' | 'advanced';
  maxPrepTimeMinutes?: number;
}
