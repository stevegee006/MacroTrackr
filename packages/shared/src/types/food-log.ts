import type { FoodItem } from './food.js';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface FoodLogEntry {
  id: string;
  userId: string;
  foodItemId: string;
  logDate: string;
  mealType: MealType;
  servingQty: number;
  servingSizeG: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number | null;
  totalSugarG: number | null;
  notes: string | null;
  createdAt: string;
  foodItem?: FoodItem;
}

export interface DailySummary {
  date: string;
  totals: MacroTotals;
  targets: MacroTotals;
  entries: number;
}

export interface MacroTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
}
