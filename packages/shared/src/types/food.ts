export type FoodSource = 'OPENFOODFACTS' | 'MANUAL' | 'LABEL_SCAN' | 'AI_ESTIMATE';

export interface FoodItem {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number;
  servingUnit: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  imageUrl: string | null;
  source: FoodSource;
}
