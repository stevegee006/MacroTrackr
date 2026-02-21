'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GOAL_LABELS } from '@macrotracker/shared';
import type { MacroPlan, Goal } from '@macrotracker/shared';
import { Check } from 'lucide-react';

export default function MacroPlanPage() {
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState<Goal>('MAINTAIN');
  const [customNotes, setCustomNotes] = useState('');

  const { data: plans, isLoading } = useQuery({
    queryKey: ['macro-plans'],
    queryFn: () => apiFetch<{ data: MacroPlan[] }>('/macro-plan'),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: MacroPlan }>('/macro-plan/generate', {
        method: 'POST',
        body: JSON.stringify({ goal, customNotes: customNotes || undefined }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['macro-plans'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/macro-plan/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macro-plans'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">AI Macro Plans</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold">Generate New Plan</h2>
        <p className="text-sm text-gray-500">
          Uses your profile stats and OpenAI to calculate personalized macro targets.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGoal(key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  goal === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Additional notes (optional)"
          placeholder="e.g., high protein, low carb"
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
        />

        <Button
          onClick={() => generateMutation.mutate()}
          isLoading={generateMutation.isPending}
          className="w-full"
        >
          Generate Macro Plan
        </Button>

        {generateMutation.isError && (
          <p className="text-sm text-red-600">
            {(generateMutation.error as any)?.message || 'Failed to generate plan'}
          </p>
        )}
      </Card>

      <h2 className="text-lg font-semibold">Your Plans</h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : plans?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500">
          No plans yet. Generate your first macro plan above!
        </Card>
      ) : (
        <div className="space-y-3">
          {plans?.data.map((plan) => (
            <Card key={plan.id} className={plan.isActive ? 'ring-2 ring-emerald-500' : ''}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {plan.isActive ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <Check className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => activateMutation.mutate(plan.id)}
                    isLoading={activateMutation.isPending}
                  >
                    Activate
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="font-semibold">{plan.targetCalories}</p>
                  <p className="text-xs text-gray-500">kcal</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-600">{plan.targetProteinG}g</p>
                  <p className="text-xs text-gray-500">Protein</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-600">{plan.targetCarbsG}g</p>
                  <p className="text-xs text-gray-500">Carbs</p>
                </div>
                <div>
                  <p className="font-semibold text-red-600">{plan.targetFatG}g</p>
                  <p className="text-xs text-gray-500">Fat</p>
                </div>
              </div>

              {plan.reasoning && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                    Show reasoning
                  </summary>
                  <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">{plan.reasoning}</p>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
