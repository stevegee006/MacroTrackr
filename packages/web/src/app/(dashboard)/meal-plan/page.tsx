'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { MealieImportModal } from '@/components/meal-plan/MealieImportModal';
import type { MealPlan, MealPlanData, MealPlanMeal, UserSettings } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS } from '@macrotracker/shared';
import { Trash2, Loader2, Pencil, X, RefreshCw, Plus, Minus, ChefHat } from 'lucide-react';

type Tab = 'manual' | 'ai';

interface MealPlanEditForm {
  name: string;
  targetCalories: string;
  targetProteinG: string;
  targetCarbsG: string;
  targetFatG: string;
}

interface IngredientForm {
  name: string;
  quantityG: string;
  notes: string;
}

interface MealForm {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  name: string;
  ingredients: IngredientForm[];
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  prepTimeMinutes: string;
  instructions: string;
}

interface DayForm {
  meals: MealForm[];
}

function emptyIngredient(): IngredientForm {
  return { name: '', quantityG: '', notes: '' };
}

function emptyMeal(): MealForm {
  return {
    mealType: 'BREAKFAST',
    name: '',
    ingredients: [emptyIngredient()],
    calories: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    prepTimeMinutes: '',
    instructions: '',
  };
}

export default function MealPlanPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('manual');

  // AI tab state
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(1);
  const [restrictions, setRestrictions] = useState('');
  const [cuisine, setCuisine] = useState('');

  // Shared plan list state
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MealPlanEditForm | null>(null);
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);

  // Inline meal editing state
  const [editingMealKey, setEditingMealKey] = useState<string | null>(null); // "planId-dayNumber-mealIndex"
  const [editingMealForm, setEditingMealForm] = useState<MealForm | null>(null);

  // Manual builder state
  const [builderStep, setBuilderStep] = useState<1 | 2>(1);
  const [manualName, setManualName] = useState('');
  const [manualDuration, setManualDuration] = useState('1');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [days, setDays] = useState<DayForm[]>([{ meals: [] }]);

  // Mealie import modal state
  const [mealieModalOpen, setMealieModalOpen] = useState(false);
  const [mealieImportTarget, setMealieImportTarget] = useState<{ dayIndex: number } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: UserSettings }>('/users/me/settings'),
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['meal-plans'],
    queryFn: () => apiFetch<{ data: MealPlan[] }>('/meal-plan'),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: MealPlan }>('/meal-plan/generate', {
        method: 'POST',
        body: JSON.stringify({
          durationDays,
          preferences: {
            dietaryRestrictions: restrictions ? restrictions.split(',').map((s) => s.trim()) : undefined,
            cuisinePreferences: cuisine ? cuisine.split(',').map((s) => s.trim()) : undefined,
            mealsPerDay: 4,
            cookingSkill: 'intermediate',
          },
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-plans'] }),
  });

  const createManualMutation = useMutation({
    mutationFn: (body: any) =>
      apiFetch<{ data: MealPlan }>('/meal-plan', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      resetManualBuilder();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiFetch(`/meal-plan/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      setEditingPlanId(null);
      setEditForm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/meal-plan/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete meal plan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
    onSettled: () => setDeletingId(null),
  });

  const regenerateMutation = useMutation({
    mutationFn: async ({ planId, dayNumber, mealIndex }: { planId: string; dayNumber: number; mealIndex: number }) => {
      setRegeneratingMeal(`${planId}-${dayNumber}-${mealIndex}`);
      return apiFetch<{ data: MealPlan }>(`/meal-plan/${planId}/regenerate-meal`, {
        method: 'POST',
        body: JSON.stringify({ dayNumber, mealIndex }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
    onSettled: () => setRegeneratingMeal(null),
  });

  const updatePlanDataMutation = useMutation({
    mutationFn: async ({ planId, planData }: { planId: string; planData: MealPlanData }) => {
      return apiFetch(`/meal-plan/${planId}/data`, {
        method: 'PUT',
        body: JSON.stringify(planData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      setEditingMealKey(null);
      setEditingMealForm(null);
    },
  });

  function startEditingMeal(planId: string, dayNumber: number, mealIndex: number, meal: MealPlanMeal) {
    const key = `${planId}-${dayNumber}-${mealIndex}`;
    setEditingMealKey(key);
    setEditingMealForm({
      mealType: meal.mealType as MealForm['mealType'],
      name: meal.name,
      ingredients: meal.ingredients.map((ing) => ({
        name: ing.name,
        quantityG: String(ing.quantityG),
        notes: ing.notes || '',
      })),
      calories: String(meal.macros.calories),
      proteinG: String(meal.macros.proteinG),
      carbsG: String(meal.macros.carbsG),
      fatG: String(meal.macros.fatG),
      prepTimeMinutes: String(meal.prepTimeMinutes),
      instructions: meal.instructions,
    });
  }

  function cancelEditingMeal() {
    setEditingMealKey(null);
    setEditingMealForm(null);
  }

  function saveEditedMeal(planId: string, dayNumber: number, mealIndex: number, currentPlanData: MealPlanData) {
    if (!editingMealForm) return;

    const updatedMeal = {
      mealType: editingMealForm.mealType,
      name: editingMealForm.name || 'Unnamed Meal',
      ingredients: editingMealForm.ingredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          name: ing.name,
          quantityG: parseFloat(ing.quantityG) || 100,
          notes: ing.notes || undefined,
        })),
      macros: {
        calories: parseFloat(editingMealForm.calories) || 0,
        proteinG: parseFloat(editingMealForm.proteinG) || 0,
        carbsG: parseFloat(editingMealForm.carbsG) || 0,
        fatG: parseFloat(editingMealForm.fatG) || 0,
      },
      prepTimeMinutes: parseInt(editingMealForm.prepTimeMinutes) || 15,
      instructions: editingMealForm.instructions || 'No instructions provided.',
    };

    const newPlanData: MealPlanData = {
      days: currentPlanData.days.map((day) => {
        if (day.dayNumber !== dayNumber) return day;

        const newMeals = day.meals.map((m, i) => (i === mealIndex ? updatedMeal : m));
        const dayTotals = {
          calories: newMeals.reduce((sum, ml) => sum + ml.macros.calories, 0),
          proteinG: newMeals.reduce((sum, ml) => sum + ml.macros.proteinG, 0),
          carbsG: newMeals.reduce((sum, ml) => sum + ml.macros.carbsG, 0),
          fatG: newMeals.reduce((sum, ml) => sum + ml.macros.fatG, 0),
        };

        return { ...day, meals: newMeals, dayTotals };
      }),
    };

    updatePlanDataMutation.mutate({ planId, planData: newPlanData });
  }

  function updateEditingMealField(field: keyof MealForm, value: any) {
    if (!editingMealForm) return;
    setEditingMealForm({ ...editingMealForm, [field]: value });
  }

  function addEditingIngredient() {
    if (!editingMealForm) return;
    setEditingMealForm({
      ...editingMealForm,
      ingredients: [...editingMealForm.ingredients, emptyIngredient()],
    });
  }

  function removeEditingIngredient(ingIndex: number) {
    if (!editingMealForm) return;
    setEditingMealForm({
      ...editingMealForm,
      ingredients: editingMealForm.ingredients.filter((_, i) => i !== ingIndex),
    });
  }

  function updateEditingIngredient(ingIndex: number, field: keyof IngredientForm, value: string) {
    if (!editingMealForm) return;
    const ings = [...editingMealForm.ingredients];
    ings[ingIndex] = { ...ings[ingIndex], [field]: value };
    setEditingMealForm({ ...editingMealForm, ingredients: ings });
  }

  function resetManualBuilder() {
    setBuilderStep(1);
    setManualName('');
    setManualDuration('1');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setDays([{ meals: [] }]);
  }

  function goToStep2() {
    const dur = parseInt(manualDuration) || 1;
    const clamped = Math.min(Math.max(dur, 1), 30);
    const newDays: DayForm[] = Array.from({ length: clamped }, () => ({ meals: [] }));
    setDays(newDays);
    setBuilderStep(2);
  }

  function addMealToDay(dayIndex: number) {
    setDays((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        meals: [...updated[dayIndex].meals, emptyMeal()],
      };
      return updated;
    });
  }

  function removeMealFromDay(dayIndex: number, mealIndex: number) {
    setDays((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        meals: updated[dayIndex].meals.filter((_, i) => i !== mealIndex),
      };
      return updated;
    });
  }

  function updateMeal(dayIndex: number, mealIndex: number, field: keyof MealForm, value: any) {
    setDays((prev) => {
      const updated = [...prev];
      const dayMeals = [...updated[dayIndex].meals];
      dayMeals[mealIndex] = { ...dayMeals[mealIndex], [field]: value };
      updated[dayIndex] = { ...updated[dayIndex], meals: dayMeals };
      return updated;
    });
  }

  function addIngredient(dayIndex: number, mealIndex: number) {
    setDays((prev) => {
      const updated = [...prev];
      const dayMeals = [...updated[dayIndex].meals];
      dayMeals[mealIndex] = {
        ...dayMeals[mealIndex],
        ingredients: [...dayMeals[mealIndex].ingredients, emptyIngredient()],
      };
      updated[dayIndex] = { ...updated[dayIndex], meals: dayMeals };
      return updated;
    });
  }

  function removeIngredient(dayIndex: number, mealIndex: number, ingIndex: number) {
    setDays((prev) => {
      const updated = [...prev];
      const dayMeals = [...updated[dayIndex].meals];
      dayMeals[mealIndex] = {
        ...dayMeals[mealIndex],
        ingredients: dayMeals[mealIndex].ingredients.filter((_, i) => i !== ingIndex),
      };
      updated[dayIndex] = { ...updated[dayIndex], meals: dayMeals };
      return updated;
    });
  }

  function updateIngredient(dayIndex: number, mealIndex: number, ingIndex: number, field: keyof IngredientForm, value: string) {
    setDays((prev) => {
      const updated = [...prev];
      const dayMeals = [...updated[dayIndex].meals];
      const ings = [...dayMeals[mealIndex].ingredients];
      ings[ingIndex] = { ...ings[ingIndex], [field]: value };
      dayMeals[mealIndex] = { ...dayMeals[mealIndex], ingredients: ings };
      updated[dayIndex] = { ...updated[dayIndex], meals: dayMeals };
      return updated;
    });
  }

  function handleMealieImport(dayIndex: number) {
    setMealieImportTarget({ dayIndex });
    setMealieModalOpen(true);
  }

  function onMealieImport(meal: any) {
    if (!mealieImportTarget) return;
    const { dayIndex } = mealieImportTarget;
    const newMeal: MealForm = {
      mealType: meal.mealType || 'DINNER',
      name: meal.name || '',
      ingredients: (meal.ingredients ?? []).map((ing: any) => ({
        name: ing.name || '',
        quantityG: String(ing.quantityG || ''),
        notes: ing.notes || '',
      })),
      calories: String(meal.macros?.calories || ''),
      proteinG: String(meal.macros?.proteinG || ''),
      carbsG: String(meal.macros?.carbsG || ''),
      fatG: String(meal.macros?.fatG || ''),
      prepTimeMinutes: String(meal.prepTimeMinutes || ''),
      instructions: meal.instructions || '',
    };
    if (newMeal.ingredients.length === 0) {
      newMeal.ingredients = [emptyIngredient()];
    }

    setDays((prev) => {
      const updated = [...prev];
      updated[dayIndex] = {
        ...updated[dayIndex],
        meals: [...updated[dayIndex].meals, newMeal],
      };
      return updated;
    });

    setMealieModalOpen(false);
    setMealieImportTarget(null);
  }

  function saveManualPlan() {
    const planData = {
      days: days.map((day, i) => {
        const meals = day.meals.map((m) => ({
          mealType: m.mealType,
          name: m.name || 'Unnamed Meal',
          ingredients: m.ingredients
            .filter((ing) => ing.name.trim())
            .map((ing) => ({
              name: ing.name,
              quantityG: parseFloat(ing.quantityG) || 100,
              notes: ing.notes || undefined,
            })),
          macros: {
            calories: parseFloat(m.calories) || 0,
            proteinG: parseFloat(m.proteinG) || 0,
            carbsG: parseFloat(m.carbsG) || 0,
            fatG: parseFloat(m.fatG) || 0,
          },
          prepTimeMinutes: parseInt(m.prepTimeMinutes) || 15,
          instructions: m.instructions || 'No instructions provided.',
        }));

        const dayTotals = {
          calories: meals.reduce((sum, ml) => sum + ml.macros.calories, 0),
          proteinG: meals.reduce((sum, ml) => sum + ml.macros.proteinG, 0),
          carbsG: meals.reduce((sum, ml) => sum + ml.macros.carbsG, 0),
          fatG: meals.reduce((sum, ml) => sum + ml.macros.fatG, 0),
        };

        return {
          dayNumber: i + 1,
          meals,
          dayTotals,
        };
      }),
    };

    createManualMutation.mutate({
      name: manualName || 'Manual Meal Plan',
      durationDays: parseInt(manualDuration) || 1,
      targetCalories: parseInt(manualCalories) || 2000,
      targetProteinG: parseInt(manualProtein) || 0,
      targetCarbsG: parseInt(manualCarbs) || 0,
      targetFatG: parseInt(manualFat) || 0,
      planData,
    });
  }

  function startEditing(plan: MealPlan) {
    setEditingPlanId(plan.id);
    setEditForm({
      name: plan.name,
      targetCalories: plan.targetCalories.toString(),
      targetProteinG: plan.targetProteinG.toString(),
      targetCarbsG: plan.targetCarbsG.toString(),
      targetFatG: plan.targetFatG.toString(),
    });
  }

  function cancelEditing() {
    setEditingPlanId(null);
    setEditForm(null);
  }

  function saveEdit(planId: string) {
    if (!editForm) return;
    updateMutation.mutate({
      id: planId,
      data: {
        name: editForm.name,
        targetCalories: parseInt(editForm.targetCalories) || 0,
        targetProteinG: parseInt(editForm.targetProteinG) || 0,
        targetCarbsG: parseInt(editForm.targetCarbsG) || 0,
        targetFatG: parseInt(editForm.targetFatG) || 0,
      },
    });
  }

  const step1Valid = manualName.trim().length > 0 && parseInt(manualDuration) > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Meal Plans</h1>

      {/* Tab toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => setTab('manual')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === 'manual'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Manual Builder
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            tab === 'ai'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          AI Generate
        </button>
      </div>

      {/* Manual builder */}
      {tab === 'manual' && builderStep === 1 && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Step 1: Plan Details</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set up the plan metadata and daily macro targets.
          </p>

          <Input
            label="Plan name"
            placeholder="e.g., Prep Week 1"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />

          <Input
            label="Duration (days)"
            type="number"
            min={1}
            max={30}
            placeholder="1"
            value={manualDuration}
            onChange={(e) => setManualDuration(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target calories"
              type="number"
              min={0}
              placeholder="2000"
              value={manualCalories}
              onChange={(e) => setManualCalories(e.target.value)}
            />
            <Input
              label="Protein (g)"
              type="number"
              min={0}
              placeholder="150"
              value={manualProtein}
              onChange={(e) => setManualProtein(e.target.value)}
            />
            <Input
              label="Carbs (g)"
              type="number"
              min={0}
              placeholder="200"
              value={manualCarbs}
              onChange={(e) => setManualCarbs(e.target.value)}
            />
            <Input
              label="Fat (g)"
              type="number"
              min={0}
              placeholder="65"
              value={manualFat}
              onChange={(e) => setManualFat(e.target.value)}
            />
          </div>

          <Button
            onClick={goToStep2}
            disabled={!step1Valid}
            className="w-full"
          >
            Next: Build Meals
          </Button>
        </Card>
      )}

      {tab === 'manual' && builderStep === 2 && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Step 2: Build Meals</h2>
              <Button variant="ghost" size="sm" onClick={() => setBuilderStep(1)}>
                Back
              </Button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add meals for each day. {settings?.data.hasMealieConfig && 'You can import recipes from Mealie.'}
            </p>
          </Card>

          {days.map((day, dayIndex) => (
            <Card key={dayIndex} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Day {dayIndex + 1}</h3>
                <div className="flex gap-1">
                  {settings?.data.hasMealieConfig && (
                    <button
                      onClick={() => handleMealieImport(dayIndex)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                    >
                      <ChefHat className="h-3.5 w-3.5" />
                      Mealie
                    </button>
                  )}
                  <button
                    onClick={() => addMealToDay(dayIndex)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Meal
                  </button>
                </div>
              </div>

              {day.meals.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                  No meals yet. Click &quot;Add Meal&quot; to get started.
                </p>
              )}

              {day.meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Meal {mealIndex + 1}</p>
                    <button
                      onClick={() => removeMealFromDay(dayIndex, mealIndex)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Type</label>
                      <select
                        value={meal.mealType}
                        onChange={(e) => updateMeal(dayIndex, mealIndex, 'mealType', e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="BREAKFAST">Breakfast</option>
                        <option value="LUNCH">Lunch</option>
                        <option value="DINNER">Dinner</option>
                        <option value="SNACK">Snack</option>
                      </select>
                    </div>
                    <Input
                      label="Name"
                      placeholder="e.g., Chicken Stir Fry"
                      value={meal.name}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'name', e.target.value)}
                    />
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      label="Cal"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={meal.calories}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'calories', e.target.value)}
                    />
                    <Input
                      label="P (g)"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={meal.proteinG}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'proteinG', e.target.value)}
                    />
                    <Input
                      label="C (g)"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={meal.carbsG}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'carbsG', e.target.value)}
                    />
                    <Input
                      label="F (g)"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={meal.fatG}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'fatG', e.target.value)}
                    />
                  </div>

                  <Input
                    label="Prep time (minutes)"
                    type="number"
                    min={1}
                    placeholder="15"
                    value={meal.prepTimeMinutes}
                    onChange={(e) => updateMeal(dayIndex, mealIndex, 'prepTimeMinutes', e.target.value)}
                  />

                  {/* Ingredients */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Ingredients</label>
                      <button
                        onClick={() => addIngredient(dayIndex, mealIndex)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
                      >
                        + Add
                      </button>
                    </div>
                    {meal.ingredients.map((ing, ingIndex) => (
                      <div key={ingIndex} className="flex gap-1.5 items-start">
                        <input
                          placeholder="Name"
                          value={ing.name}
                          onChange={(e) => updateIngredient(dayIndex, mealIndex, ingIndex, 'name', e.target.value)}
                          className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                        <input
                          placeholder="g"
                          type="number"
                          min={0}
                          value={ing.quantityG}
                          onChange={(e) => updateIngredient(dayIndex, mealIndex, ingIndex, 'quantityG', e.target.value)}
                          className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                        <input
                          placeholder="Notes"
                          value={ing.notes}
                          onChange={(e) => updateIngredient(dayIndex, mealIndex, ingIndex, 'notes', e.target.value)}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                        />
                        {meal.ingredients.length > 1 && (
                          <button
                            onClick={() => removeIngredient(dayIndex, mealIndex, ingIndex)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Instructions</label>
                    <textarea
                      placeholder="Cooking instructions..."
                      value={meal.instructions}
                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'instructions', e.target.value)}
                      rows={2}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
              ))}
            </Card>
          ))}

          <Button
            onClick={saveManualPlan}
            isLoading={createManualMutation.isPending}
            className="w-full"
          >
            Save Meal Plan
          </Button>

          {createManualMutation.isError && (
            <p className="text-sm text-red-600">
              {(createManualMutation.error as any)?.message || 'Failed to save meal plan'}
            </p>
          )}
        </div>
      )}

      {/* AI tab */}
      {tab === 'ai' && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Generate New Meal Plan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Creates a detailed meal plan using your active macro targets and OpenAI.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
            <div className="flex gap-2">
              {([1, 3, 7] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationDays(d)}
                  className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                    durationDays === d
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {d} day{d > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Dietary restrictions (comma-separated)"
            placeholder="e.g., gluten-free, dairy-free"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
          />

          <Input
            label="Cuisine preferences (comma-separated)"
            placeholder="e.g., Mediterranean, Asian"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
          />

          <Button
            onClick={() => generateMutation.mutate()}
            isLoading={generateMutation.isPending}
            className="w-full"
          >
            Generate Meal Plan
          </Button>

          {generateMutation.isError && (
            <p className="text-sm text-red-600">
              {(generateMutation.error as any)?.message || 'Failed to generate meal plan'}
            </p>
          )}
        </Card>
      )}

      {/* Plans list */}
      <h2 className="text-lg font-semibold">Your Meal Plans</h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : plans?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">
          No meal plans yet. Create your first one above!
        </Card>
      ) : (
        <div className="space-y-3">
          {plans?.data.map((plan) => {
            const planData = plan.planData as MealPlanData;
            const isExpanded = expandedPlan === plan.id;
            const isEditingThis = editingPlanId === plan.id;
            const isManual = (plan as any).aiModel === 'manual';

            if (isEditingThis && editForm) {
              return (
                <Card key={plan.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Edit Meal Plan</h3>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <Input
                    label="Plan name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Calories"
                      type="number"
                      min={0}
                      value={editForm.targetCalories}
                      onChange={(e) => setEditForm({ ...editForm, targetCalories: e.target.value })}
                    />
                    <Input
                      label="Protein (g)"
                      type="number"
                      min={0}
                      value={editForm.targetProteinG}
                      onChange={(e) => setEditForm({ ...editForm, targetProteinG: e.target.value })}
                    />
                    <Input
                      label="Carbs (g)"
                      type="number"
                      min={0}
                      value={editForm.targetCarbsG}
                      onChange={(e) => setEditForm({ ...editForm, targetCarbsG: e.target.value })}
                    />
                    <Input
                      label="Fat (g)"
                      type="number"
                      min={0}
                      value={editForm.targetFatG}
                      onChange={(e) => setEditForm({ ...editForm, targetFatG: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(plan.id)}
                      isLoading={updateMutation.isPending}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelEditing} className="flex-1">
                      Cancel
                    </Button>
                  </div>

                  {updateMutation.isError && (
                    <p className="text-xs text-red-600">Failed to update plan</p>
                  )}
                </Card>
              );
            }

            return (
              <Card key={plan.id}>
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{plan.name}</p>
                          {isManual && (
                            <span className="text-[10px] font-medium uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              Manual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(plan.createdAt).toLocaleDateString()} &middot;{' '}
                          {plan.targetCalories} kcal/day
                        </p>
                      </div>
                      <span className="text-gray-400 mr-2">{isExpanded ? '\u2212' : '+'}</span>
                    </div>
                  </button>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(plan);
                      }}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-emerald-600 active:text-emerald-700 transition-colors rounded-lg hover:bg-emerald-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this meal plan?')) {
                          deleteMutation.mutate(plan.id);
                        }
                      }}
                      disabled={deletingId === plan.id}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    >
                      {deletingId === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && planData?.days && (
                  <div className="mt-4 space-y-4">
                    {planData.days.map((day) => (
                      <div key={day.dayNumber}>
                        <h4 className="font-medium text-sm mb-2">Day {day.dayNumber}</h4>
                        <div className="space-y-2">
                          {day.meals.map((meal, i) => {
                            const mealKey = `${plan.id}-${day.dayNumber}-${i}`;
                            const isEditingThisMeal = editingMealKey === mealKey;

                            return (
                              <MealCard
                                key={i}
                                meal={meal}
                                isRegenerating={regeneratingMeal === mealKey}
                                onRegenerate={
                                  !isManual
                                    ? () =>
                                        regenerateMutation.mutate({
                                          planId: plan.id,
                                          dayNumber: day.dayNumber,
                                          mealIndex: i,
                                        })
                                    : undefined
                                }
                                isEditing={isEditingThisMeal}
                                editForm={isEditingThisMeal ? editingMealForm : null}
                                isSaving={updatePlanDataMutation.isPending && isEditingThisMeal}
                                onEdit={() => startEditingMeal(plan.id, day.dayNumber, i, meal)}
                                onCancelEdit={cancelEditingMeal}
                                onSaveEdit={() => saveEditedMeal(plan.id, day.dayNumber, i, planData)}
                                onFieldChange={updateEditingMealField}
                                onAddIngredient={addEditingIngredient}
                                onRemoveIngredient={removeEditingIngredient}
                                onUpdateIngredient={updateEditingIngredient}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Day totals: {day.dayTotals.calories} kcal | P:{day.dayTotals.proteinG}g C:{day.dayTotals.carbsG}g F:{day.dayTotals.fatG}g
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Mealie import modal */}
      {mealieModalOpen && (
        <MealieImportModal
          onClose={() => {
            setMealieModalOpen(false);
            setMealieImportTarget(null);
          }}
          onImport={onMealieImport}
        />
      )}
    </div>
  );
}

interface MealCardProps {
  meal: MealPlanMeal;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
  isEditing?: boolean;
  editForm?: MealForm | null;
  isSaving?: boolean;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  onFieldChange?: (field: keyof MealForm, value: any) => void;
  onAddIngredient?: () => void;
  onRemoveIngredient?: (index: number) => void;
  onUpdateIngredient?: (index: number, field: keyof IngredientForm, value: string) => void;
}

function MealCard({
  meal,
  isRegenerating,
  onRegenerate,
  isEditing,
  editForm,
  isSaving,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onFieldChange,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredient,
}: MealCardProps) {
  if (isEditing && editForm && onFieldChange && onCancelEdit && onSaveEdit) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-3 ring-2 ring-emerald-400 dark:ring-emerald-600">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Edit Meal</p>
          <button
            onClick={onCancelEdit}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select
              value={editForm.mealType}
              onChange={(e) => onFieldChange('mealType', e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="SNACK">Snack</option>
            </select>
          </div>
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder="Meal name"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Input
            label="Cal"
            type="number"
            min={0}
            value={editForm.calories}
            onChange={(e) => onFieldChange('calories', e.target.value)}
          />
          <Input
            label="P (g)"
            type="number"
            min={0}
            value={editForm.proteinG}
            onChange={(e) => onFieldChange('proteinG', e.target.value)}
          />
          <Input
            label="C (g)"
            type="number"
            min={0}
            value={editForm.carbsG}
            onChange={(e) => onFieldChange('carbsG', e.target.value)}
          />
          <Input
            label="F (g)"
            type="number"
            min={0}
            value={editForm.fatG}
            onChange={(e) => onFieldChange('fatG', e.target.value)}
          />
        </div>

        <Input
          label="Prep time (minutes)"
          type="number"
          min={1}
          value={editForm.prepTimeMinutes}
          onChange={(e) => onFieldChange('prepTimeMinutes', e.target.value)}
        />

        {/* Ingredients */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Ingredients</label>
            {onAddIngredient && (
              <button
                onClick={onAddIngredient}
                className="text-xs text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                + Add
              </button>
            )}
          </div>
          {editForm.ingredients.map((ing, ingIndex) => (
            <div key={ingIndex} className="flex gap-1.5 items-start">
              <input
                placeholder="Name"
                value={ing.name}
                onChange={(e) => onUpdateIngredient?.(ingIndex, 'name', e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <input
                placeholder="g"
                type="number"
                min={0}
                value={ing.quantityG}
                onChange={(e) => onUpdateIngredient?.(ingIndex, 'quantityG', e.target.value)}
                className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              <input
                placeholder="Notes"
                value={ing.notes}
                onChange={(e) => onUpdateIngredient?.(ingIndex, 'notes', e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
              {editForm.ingredients.length > 1 && onRemoveIngredient && (
                <button
                  onClick={() => onRemoveIngredient(ingIndex)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Instructions</label>
          <textarea
            value={editForm.instructions}
            onChange={(e) => onFieldChange('instructions', e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={onSaveEdit} isLoading={isSaving} className="flex-1">
            Save Meal
          </Button>
          <Button size="sm" variant="secondary" onClick={onCancelEdit} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{meal.name}</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {MEAL_TYPE_LABELS[meal.mealType]} &middot; {meal.prepTimeMinutes}min
          </span>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-500 active:text-blue-600 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-950"
              title="Edit this meal"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="p-1 text-gray-400 hover:text-emerald-600 active:text-emerald-700 transition-colors rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:opacity-50"
              title="Regenerate this meal"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {meal.macros.calories} kcal | P:{meal.macros.proteinG}g C:{meal.macros.carbsG}g F:{meal.macros.fatG}g
      </p>
      <details>
        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
          Ingredients & instructions
        </summary>
        <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
          {meal.ingredients.map((ing, i) => (
            <li key={i}>
              {ing.name} ({ing.quantityG}g){ing.notes ? ` - ${ing.notes}` : ''}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{meal.instructions}</p>
      </details>
    </div>
  );
}
