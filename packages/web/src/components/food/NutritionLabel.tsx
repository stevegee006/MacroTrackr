import type { FoodItem } from '@macrotracker/shared';
import { Card } from '@/components/ui/Card';

interface NutritionLabelProps {
  food: FoodItem;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

export function NutritionLabel({ food }: NutritionLabelProps) {
  const servingFactor = food.servingSizeG / 100;

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{food.name}</h3>
        {food.brand && <p className="text-sm text-gray-500">{food.brand}</p>}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-medium uppercase text-gray-500 mb-2">
          Per serving ({food.servingSizeG}g)
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Calories</span>
            <span className="font-medium">{Math.round(food.caloriesPer100g * servingFactor)} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Protein</span>
            <span className="font-medium">{round1(food.proteinPer100g * servingFactor)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600">Carbs</span>
            <span className="font-medium">{round1(food.carbsPer100g * servingFactor)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-600">Fat</span>
            <span className="font-medium">{round1(food.fatPer100g * servingFactor)}g</span>
          </div>
          {food.fiberPer100g != null && (
            <div className="flex justify-between">
              <span className="text-green-600">Fiber</span>
              <span className="font-medium">{round1(food.fiberPer100g * servingFactor)}g</span>
            </div>
          )}
          {food.sugarPer100g != null && (
            <div className="flex justify-between">
              <span className="text-purple-600">Sugar</span>
              <span className="font-medium">{round1(food.sugarPer100g * servingFactor)}g</span>
            </div>
          )}
        </div>
      </div>

      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">Per 100g values</summary>
        <div className="grid grid-cols-2 gap-1 mt-2 text-gray-500">
          <span>Cal: {Math.round(food.caloriesPer100g)}</span>
          <span>P: {round1(food.proteinPer100g)}g</span>
          <span>C: {round1(food.carbsPer100g)}g</span>
          <span>F: {round1(food.fatPer100g)}g</span>
          {food.fiberPer100g != null && <span>Fiber: {round1(food.fiberPer100g)}g</span>}
          {food.sugarPer100g != null && <span>Sugar: {round1(food.sugarPer100g)}g</span>}
        </div>
      </details>
    </Card>
  );
}
