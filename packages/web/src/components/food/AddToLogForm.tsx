'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString, parseDateLocal, addDays } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MathInput } from '@/components/ui/MathInput';
import { Minus, Plus } from 'lucide-react';
import type { FoodItem, MealType } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@macrotracker/shared';

interface AddToLogFormProps {
  food: FoodItem;
  /** Date to log to (YYYY-MM-DD). Defaults to today. User can change via date picker. */
  logDate?: string;
  onSuccess?: () => void;
}

function getMealTypeForTime(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'BREAKFAST';
  if (hour < 15) return 'LUNCH';
  if (hour < 20) return 'DINNER';
  return 'SNACK';
}

export function AddToLogForm({ food, logDate: initialDate, onSuccess }: AddToLogFormProps) {
  const [servingQty, setServingQty] = useState('1');
  const [servingSizeG, setServingSizeG] = useState(String(food.servingSizeG));
  const [mealType, setMealType] = useState<MealType>(getMealTypeForTime);
  const [logDate, setLogDate] = useState(initialDate ?? todayString());
  const queryClient = useQueryClient();

  const qtyNum = parseFloat(servingQty) || 0;
  const sizeNum = parseFloat(servingSizeG) || 0;
  const factor = (sizeNum * qtyNum) / 100;
  const isToday = logDate === todayString();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/food-log', {
        method: 'POST',
        body: JSON.stringify({
          foodItemId: food.id,
          logDate,
          mealType,
          servingQty: qtyNum || 1,
          servingSizeG: sizeNum || 100,
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
      {/* Date picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
        <input
          type="date"
          value={logDate}
          max={addDays(todayString(), 7)}
          onChange={(e) => setLogDate(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 appearance-none [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left"
        />
        {!isToday && (
          <p className={`text-xs mt-1 ${logDate > todayString() ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {logDate > todayString() ? 'Pre-logging for' : 'Logging for'} {parseDateLocal(logDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Servings</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const n = Math.max(0.1, Math.round(((parseFloat(servingQty) || 1) - 0.5) * 10) / 10);
                setServingQty(String(n));
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500"
              aria-label="Decrease servings"
            >
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.5}
              value={servingQty}
              onChange={(e) => setServingQty(e.target.value)}
              className="w-16 text-center"
            />
            <button
              type="button"
              onClick={() => {
                const n = Math.round(((parseFloat(servingQty) || 0) + 0.5) * 10) / 10;
                setServingQty(String(n));
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:active:bg-gray-500"
              aria-label="Increase servings"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <MathInput
          label="Serving size (g)"
          min={1}
          value={servingSizeG}
          onChange={setServingSizeG}
          className="w-32"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meal</label>
        <div className="flex gap-2 flex-wrap">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                mealType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {MEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-sm">
        <p className="font-medium mb-1">Total for this entry:</p>
        <p>
          {Math.round(food.caloriesPer100g * factor)} kcal &middot;{' '}
          <span className="text-red-600">P: {Math.round(food.proteinPer100g * factor)}g</span> &middot;{' '}
          <span className="text-amber-600">C: {Math.round(food.carbsPer100g * factor)}g</span> &middot;{' '}
          <span className="text-blue-600">F: {Math.round(food.fatPer100g * factor)}g</span>
        </p>
        {(food.fiberPer100g != null || food.sugarPer100g != null) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {food.fiberPer100g != null && (
              <><span className="text-green-600">Fiber: {Math.round(food.fiberPer100g * factor * 10) / 10}g</span>{' '}</>
            )}
            {food.sugarPer100g != null && (
              <span className="text-purple-600">Sugar: {Math.round(food.sugarPer100g * factor * 10) / 10}g</span>
            )}
          </p>
        )}
      </div>

      <div className="sticky bottom-20 z-40 -mx-4 bg-white px-4 py-3 border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:border-0">
        <Button
          onClick={() => mutation.mutate()}
          isLoading={mutation.isPending}
          className="w-full shadow-lg lg:shadow-none"
        >
          {isToday ? 'Add to Log' : `Add to ${parseDateLocal(logDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Log`}
        </Button>

        {mutation.isError && (
          <p className="text-sm text-red-600 mt-2">
            {(mutation.error as any)?.message || 'Failed to add to log'}
          </p>
        )}
      </div>
    </div>
  );
}
