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
import { Trash2, Loader2 } from 'lucide-react';

export default function MealPlanPage() {
  const queryClient = useQueryClient();
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(1);
  const [restrictions, setRestrictions] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">AI Meal Plans</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold">Generate New Meal Plan</h2>
        <p className="text-sm text-gray-500">
          Creates a detailed meal plan using your active macro targets and OpenAI.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
          <div className="flex gap-2">
            {([1, 3, 7] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDurationDays(d)}
                className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
                  durationDays === d
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
        <Card className="py-6 text-center text-gray-500">
          No meal plans yet. Generate your first one above!
        </Card>
      ) : (
        <div className="space-y-3">
          {plans?.data.map((plan) => {
            const planData = plan.planData as MealPlanData;
            const isExpanded = expandedPlan === plan.id;

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
                        <p className="text-xs text-gray-500">
                          {new Date(plan.createdAt).toLocaleDateString()} &middot;{' '}
                          {plan.targetCalories} kcal/day
                        </p>
                      </div>
                      <span className="text-gray-400 mr-2">{isExpanded ? '−' : '+'}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this meal plan?')) {
                        deleteMutation.mutate(plan.id);
                      }
                    }}
                    disabled={deletingId === plan.id}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 shrink-0"
                  >
                    {deletingId === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isExpanded && planData?.days && (
                  <div className="mt-4 space-y-4">
                    {planData.days.map((day) => (
                      <div key={day.dayNumber}>
                        <h4 className="font-medium text-sm mb-2">Day {day.dayNumber}</h4>
                        <div className="space-y-2">
                          {day.meals.map((meal, i) => (
                            <MealCard key={i} meal={meal} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
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

function MealCard({ meal }: { meal: MealPlanMeal }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{meal.name}</p>
        <span className="text-xs text-gray-500">
          {MEAL_TYPE_LABELS[meal.mealType]} &middot; {meal.prepTimeMinutes}min
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {meal.macros.calories} kcal | P:{meal.macros.proteinG}g C:{meal.macros.carbsG}g F:{meal.macros.fatG}g
      </p>
      <details>
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
          Ingredients & instructions
        </summary>
        <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
          {meal.ingredients.map((ing, i) => (
            <li key={i}>
              {ing.name} ({ing.quantityG}g){ing.notes ? ` - ${ing.notes}` : ''}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-gray-600">{meal.instructions}</p>
      </details>
    </div>
  );
}
