'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FoodItem } from '@macrotracker/shared';

interface ManualFoodFormProps {
  onResult: (food: FoodItem) => void;
}

export function ManualFoodForm({ onResult }: ManualFoodFormProps) {
  const [inputMode, setInputMode] = useState<'serving' | '100g'>('serving');
  const [form, setForm] = useState({
    name: '',
    brand: '',
    servingSizeG: '100',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const servingSizeG = parseFloat(form.servingSizeG) || 100;
      const factor = inputMode === 'serving' ? 100 / servingSizeG : 1;

      const body = {
        name: form.name,
        brand: form.brand || undefined,
        servingSizeG,
        caloriesPer100g: (parseFloat(form.calories) || 0) * factor,
        proteinPer100g: (parseFloat(form.protein) || 0) * factor,
        carbsPer100g: (parseFloat(form.carbs) || 0) * factor,
        fatPer100g: (parseFloat(form.fat) || 0) * factor,
        fiberPer100g: form.fiber ? (parseFloat(form.fiber) || 0) * factor : null,
        sugarPer100g: form.sugar ? (parseFloat(form.sugar) || 0) * factor : null,
      };

      return apiFetch<{ data: FoodItem }>('/food', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (res) => {
      onResult(res.data);
    },
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid = form.name.trim().length > 0 && parseFloat(form.servingSizeG) > 0;

  return (
    <Card className="space-y-4">
      <h3 className="text-sm font-semibold">Add Food Manually</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Enter the nutritional information from a label or your own knowledge.
      </p>

      <Input
        label="Food name"
        placeholder="e.g., Oatmeal, Greek Yogurt"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
      />

      <Input
        label="Brand (optional)"
        placeholder="e.g., Quaker"
        value={form.brand}
        onChange={(e) => updateField('brand', e.target.value)}
      />

      <Input
        label="Serving size (g)"
        type="number"
        min={1}
        placeholder="100"
        value={form.servingSizeG}
        onChange={(e) => updateField('servingSizeG', e.target.value)}
      />

      {/* Input mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Enter values</span>
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
          <button
            onClick={() => setInputMode('serving')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              inputMode === 'serving'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Per serving
          </button>
          <button
            onClick={() => setInputMode('100g')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              inputMode === '100g'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Per 100g
          </button>
        </div>
      </div>

      {/* Required macros */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Calories${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
          type="number"
          min={0}
          placeholder="0"
          value={form.calories}
          onChange={(e) => updateField('calories', e.target.value)}
        />
        <Input
          label={`Protein (g)${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
          type="number"
          min={0}
          step={0.1}
          placeholder="0"
          value={form.protein}
          onChange={(e) => updateField('protein', e.target.value)}
        />
        <Input
          label={`Carbs (g)${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
          type="number"
          min={0}
          step={0.1}
          placeholder="0"
          value={form.carbs}
          onChange={(e) => updateField('carbs', e.target.value)}
        />
        <Input
          label={`Fat (g)${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
          type="number"
          min={0}
          step={0.1}
          placeholder="0"
          value={form.fat}
          onChange={(e) => updateField('fat', e.target.value)}
        />
      </div>

      {/* Optional macros */}
      <details className="text-xs">
        <summary className="text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          Optional: Fiber & Sugar
        </summary>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <Input
            label={`Fiber (g)${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
            type="number"
            min={0}
            step={0.1}
            placeholder=""
            value={form.fiber}
            onChange={(e) => updateField('fiber', e.target.value)}
          />
          <Input
            label={`Sugar (g)${inputMode === 'serving' ? ' / serving' : ' / 100g'}`}
            type="number"
            min={0}
            step={0.1}
            placeholder=""
            value={form.sugar}
            onChange={(e) => updateField('sugar', e.target.value)}
          />
        </div>
      </details>

      <Button
        onClick={() => createMutation.mutate()}
        isLoading={createMutation.isPending}
        disabled={!isValid}
        className="w-full"
      >
        Save Food Item
      </Button>

      {createMutation.isError && (
        <p className="text-sm text-red-600">
          {(createMutation.error as any)?.message || 'Failed to save food item.'}
        </p>
      )}
    </Card>
  );
}
