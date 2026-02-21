'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FoodItem, MealType } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@macrotracker/shared';

interface AddToLogFormProps {
  food: FoodItem;
  onSuccess?: () => void;
}

export function AddToLogForm({ food, onSuccess }: AddToLogFormProps) {
  const [servingQty, setServingQty] = useState(1);
  const [servingSizeG, setServingSizeG] = useState(food.servingSizeG);
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const queryClient = useQueryClient();

  const factor = (servingSizeG * servingQty) / 100;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/food-log', {
        method: 'POST',
        body: JSON.stringify({
          foodItemId: food.id,
          logDate: todayString(),
          mealType,
          servingQty,
          servingSizeG,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-log'] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary'] });
      onSuccess?.();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          label="Servings"
          type="number"
          min={0.1}
          step={0.1}
          value={servingQty}
          onChange={(e) => setServingQty(parseFloat(e.target.value) || 0)}
          className="w-24"
        />
        <Input
          label="Serving size (g)"
          type="number"
          min={1}
          value={servingSizeG}
          onChange={(e) => setServingSizeG(parseFloat(e.target.value) || 0)}
          className="w-32"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meal</label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                mealType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {MEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3 text-sm">
        <p className="font-medium">Total for this entry:</p>
        <p>
          {Math.round(food.caloriesPer100g * factor)} kcal &middot;{' '}
          P: {Math.round(food.proteinPer100g * factor)}g &middot;{' '}
          C: {Math.round(food.carbsPer100g * factor)}g &middot;{' '}
          F: {Math.round(food.fatPer100g * factor)}g
        </p>
      </div>

      <Button
        onClick={() => mutation.mutate()}
        isLoading={mutation.isPending}
        className="w-full"
      >
        Add to Log
      </Button>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {(mutation.error as any)?.message || 'Failed to add to log'}
        </p>
      )}
    </div>
  );
}
