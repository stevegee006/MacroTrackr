'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { MealPlan, MealPlanData, MealPlanMeal } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS } from '@macrotracker/shared';
import { Trash2, Loader2, Pencil, X, RefreshCw } from 'lucide-react';

interface MealPlanEditForm {
  name: string;
  targetCalories: string;
  targetProteinG: string;
  targetCarbsG: string;
  targetFatG: string;
}

export default function MealPlanPage() {
  const queryClient = useQueryClient();
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(1);
  const [restrictions, setRestrictions] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MealPlanEditForm | null>(null);
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null); // "planId-day-index"

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
      // Use raw fetch for DELETE to avoid 204 parsing issues
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">AI Meal Plans</h1>

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

      <h2 className="text-lg font-semibold">Your Meal Plans</h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : plans?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">
          No meal plans yet. Generate your first one above!
        </Card>
      ) : (
        <div className="space-y-3">
          {plans?.data.map((plan) => {
            const planData = plan.planData as MealPlanData;
            const isExpanded = expandedPlan === plan.id;
            const isEditingThis = editingPlanId === plan.id;

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
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(plan.createdAt).toLocaleDateString()} &middot;{' '}
                          {plan.targetCalories} kcal/day
                        </p>
                      </div>
                      <span className="text-gray-400 mr-2">{isExpanded ? '−' : '+'}</span>
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
                          {day.meals.map((meal, i) => (
                            <MealCard
                              key={i}
                              meal={meal}
                              isRegenerating={regeneratingMeal === `${plan.id}-${day.dayNumber}-${i}`}
                              onRegenerate={() =>
                                regenerateMutation.mutate({
                                  planId: plan.id,
                                  dayNumber: day.dayNumber,
                                  mealIndex: i,
                                })
                              }
                            />
                          ))}
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
    </div>
  );
}

function MealCard({ meal, isRegenerating, onRegenerate }: { meal: MealPlanMeal; isRegenerating?: boolean; onRegenerate?: () => void }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{meal.name}</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {MEAL_TYPE_LABELS[meal.mealType]} &middot; {meal.prepTimeMinutes}min
          </span>
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
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{meal.instructions}</p>
      </details>
    </div>
  );
}
