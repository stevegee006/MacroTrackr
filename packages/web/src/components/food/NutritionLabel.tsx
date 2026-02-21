import type { FoodItem } from '@macrotracker/shared';
import { Card } from '@/components/ui/Card';

interface NutritionLabelProps {
  food: FoodItem;
}

export function NutritionLabel({ food }: NutritionLabelProps) {
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold text-lg">{food.name}</h3>
        {food.brand && <p className="text-sm text-gray-500">{food.brand}</p>}
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-medium uppercase text-gray-500 mb-2">Per 100g</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Calories</span>
            <span className="font-medium">{food.caloriesPer100g} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Protein</span>
            <span className="font-medium">{food.proteinPer100g}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Carbs</span>
            <span className="font-medium">{food.carbsPer100g}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fat</span>
            <span className="font-medium">{food.fatPer100g}g</span>
          </div>
          {food.fiberPer100g != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fiber</span>
              <span className="font-medium">{food.fiberPer100g}g</span>
            </div>
          )}
          {food.sugarPer100g != null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Sugar</span>
              <span className="font-medium">{food.sugarPer100g}g</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Default serving: {food.servingSizeG}g
      </p>
    </Card>
  );
}
