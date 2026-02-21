'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { FoodItem } from '@macrotracker/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pencil } from 'lucide-react';

interface NutritionLabelProps {
  food: FoodItem;
  onUpdated?: (food: FoodItem) => void;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

export function NutritionLabel({ food, onUpdated }: NutritionLabelProps) {
  const [editing, setEditing] = useState(false);
  const [inputMode, setInputMode] = useState<'serving' | '100g'>('serving');

  const servingFactor = food.servingSizeG / 100;
  const [form, setForm] = useState({
    name: food.name,
    brand: food.brand ?? '',
    servingSizeG: food.servingSizeG.toString(),
    calories: Math.round(food.caloriesPer100g * servingFactor).toString(),
    protein: round1(food.proteinPer100g * servingFactor),
    carbs: round1(food.carbsPer100g * servingFactor),
    fat: round1(food.fatPer100g * servingFactor),
    fiber: food.fiberPer100g != null ? round1(food.fiberPer100g * servingFactor) : '',
    sugar: food.sugarPer100g != null ? round1(food.sugarPer100g * servingFactor) : '',
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const servingSizeG = parseFloat(form.servingSizeG) || food.servingSizeG;
      // If user entered per-serving, convert to per-100g for storage
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

      return apiFetch<{ data: FoodItem }>(`/food/${food.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (res) => {
      setEditing(false);
      onUpdated?.(res.data);
    },
  });

  function toggleInputMode() {
    const servingSizeG = parseFloat(form.servingSizeG) || food.servingSizeG;
    const f = servingSizeG / 100;

    if (inputMode === 'serving') {
      setForm((prev) => ({
        ...prev,
        calories: Math.round((parseFloat(prev.calories) || 0) / f).toString(),
        protein: round1((parseFloat(prev.protein) || 0) / f),
        carbs: round1((parseFloat(prev.carbs) || 0) / f),
        fat: round1((parseFloat(prev.fat) || 0) / f),
        fiber: prev.fiber ? round1((parseFloat(prev.fiber) || 0) / f) : '',
        sugar: prev.sugar ? round1((parseFloat(prev.sugar) || 0) / f) : '',
      }));
      setInputMode('100g');
    } else {
      setForm((prev) => ({
        ...prev,
        calories: Math.round((parseFloat(prev.calories) || 0) * f).toString(),
        protein: round1((parseFloat(prev.protein) || 0) * f),
        carbs: round1((parseFloat(prev.carbs) || 0) * f),
        fat: round1((parseFloat(prev.fat) || 0) * f),
        fiber: prev.fiber ? round1((parseFloat(prev.fiber) || 0) * f) : '',
        sugar: prev.sugar ? round1((parseFloat(prev.sugar) || 0) * f) : '',
      }));
      setInputMode('serving');
    }
  }

  if (editing) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Edit Nutrition</h3>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>

        <Input
          label="Serving size (g)"
          type="number"
          value={form.servingSizeG}
          onChange={(e) => setForm({ ...form, servingSizeG: e.target.value })}
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Enter values</span>
          <button
            type="button"
            onClick={toggleInputMode}
            className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
              inputMode === 'serving'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {inputMode === 'serving' ? `Per serving (${form.servingSizeG}g)` : 'Per 100g'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Calories" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
          <Input label="Protein (g)" type="number" step="0.1" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
          <Input label="Carbs (g)" type="number" step="0.1" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
          <Input label="Fat (g)" type="number" step="0.1" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
          <Input label="Fiber (g)" type="number" step="0.1" value={form.fiber} placeholder="optional" onChange={(e) => setForm({ ...form, fiber: e.target.value })} />
          <Input label="Sugar (g)" type="number" step="0.1" value={form.sugar} placeholder="optional" onChange={(e) => setForm({ ...form, sugar: e.target.value })} />
        </div>

        <Button onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending} className="w-full">
          Save Changes
        </Button>
        {updateMutation.isError && <p className="text-sm text-red-600">Failed to update nutrition</p>}
      </Card>
    );
  }

  // Display mode
  const displayFactor = food.servingSizeG / 100;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{food.name}</h3>
          {food.brand && <p className="text-sm text-gray-500 dark:text-gray-400">{food.brand}</p>}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Edit nutrition"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
          Per serving ({food.servingSizeG}g)
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Calories</span>
            <span className="font-medium">{Math.round(food.caloriesPer100g * displayFactor)} kcal</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-600">Protein</span>
            <span className="font-medium">{round1(food.proteinPer100g * displayFactor)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-600">Carbs</span>
            <span className="font-medium">{round1(food.carbsPer100g * displayFactor)}g</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-600">Fat</span>
            <span className="font-medium">{round1(food.fatPer100g * displayFactor)}g</span>
          </div>
          {food.fiberPer100g != null && (
            <div className="flex justify-between">
              <span className="text-green-600">Fiber</span>
              <span className="font-medium">{round1(food.fiberPer100g * displayFactor)}g</span>
            </div>
          )}
          {food.sugarPer100g != null && (
            <div className="flex justify-between">
              <span className="text-purple-600">Sugar</span>
              <span className="font-medium">{round1(food.sugarPer100g * displayFactor)}g</span>
            </div>
          )}
        </div>
      </div>

      <details className="text-xs text-gray-400 dark:text-gray-500">
        <summary className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-400">Per 100g values</summary>
        <div className="grid grid-cols-2 gap-1 mt-2 text-gray-500 dark:text-gray-400">
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
