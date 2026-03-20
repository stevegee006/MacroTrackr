'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { GOAL_LABELS } from '@macrotracker/shared';
import type { MacroPlan, Goal } from '@macrotracker/shared';
import { Check, Trash2, Loader2, Pencil, X } from 'lucide-react';

type Tab = 'manual' | 'ai';

interface PlanEditForm {
  name: string;
  goal: Goal;
  targetCalories: string;
  targetProteinG: string;
  targetCarbsG: string;
  targetFatG: string;
}

export default function MacroPlanPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('manual');

  // Shared state
  const [goal, setGoal] = useState<Goal>('MAINTAIN');
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planEditForm, setPlanEditForm] = useState<PlanEditForm | null>(null);

  // AI tab state
  const [customNotes, setCustomNotes] = useState('');

  // Manual tab state
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

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

  const manualMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: MacroPlan }>('/macro-plan', {
        method: 'POST',
        body: JSON.stringify({
          name: manualName,
          goal,
          targetCalories: parseInt(manualCalories) || 0,
          targetProteinG: parseInt(manualProtein) || 0,
          targetCarbsG: parseInt(manualCarbs) || 0,
          targetFatG: parseInt(manualFat) || 0,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macro-plans'] });
      setManualName('');
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      setActivatingId(id);
      return apiFetch(`/macro-plan/${id}/activate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macro-plans'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary'] });
    },
    onError: (error) => {
      console.error('Activate failed:', error);
    },
    onSettled: () => setActivatingId(null),
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiFetch(`/macro-plan/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macro-plans'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary'] });
      setEditingPlanId(null);
      setPlanEditForm(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/macro-plan/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete plan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macro-plans'] });
    },
    onSettled: () => setDeletingId(null),
  });

  function startEditingPlan(plan: MacroPlan) {
    setEditingPlanId(plan.id);
    setPlanEditForm({
      name: plan.name,
      goal: plan.goal as Goal,
      targetCalories: plan.targetCalories.toString(),
      targetProteinG: plan.targetProteinG.toString(),
      targetCarbsG: plan.targetCarbsG.toString(),
      targetFatG: plan.targetFatG.toString(),
    });
  }

  function cancelEditingPlan() {
    setEditingPlanId(null);
    setPlanEditForm(null);
  }

  function saveEditPlan(planId: string) {
    if (!planEditForm) return;
    updatePlanMutation.mutate({
      id: planId,
      data: {
        name: planEditForm.name,
        goal: planEditForm.goal,
        targetCalories: parseInt(planEditForm.targetCalories) || 0,
        targetProteinG: parseInt(planEditForm.targetProteinG) || 0,
        targetCarbsG: parseInt(planEditForm.targetCarbsG) || 0,
        targetFatG: parseInt(planEditForm.targetFatG) || 0,
      },
    });
  }

  const manualFormValid =
    manualName.trim().length > 0 && parseInt(manualCalories) > 0;

  return (
    <div className="space-y-6" data-tutorial="macro-plan-header">
      <h1 className="text-xl font-bold">Macro Plans</h1>

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
          Manual
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

      {/* Manual creation form */}
      {tab === 'manual' && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Create Custom Plan</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set your own macro targets manually.
          </p>

          <Input
            label="Plan name"
            placeholder="e.g., Cut Phase 1"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setGoal(key)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    goal === key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Calories"
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
            onClick={() => manualMutation.mutate()}
            isLoading={manualMutation.isPending}
            disabled={!manualFormValid}
            className="w-full"
          >
            Create Plan
          </Button>

          {manualMutation.isError && (
            <p className="text-sm text-red-600">
              {(manualMutation.error as any)?.message || 'Failed to create plan'}
            </p>
          )}
        </Card>
      )}

      {/* AI generation form */}
      {tab === 'ai' && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Generate with AI</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uses your profile stats and OpenAI to calculate personalized macro targets.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setGoal(key)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    goal === key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
              {(generateMutation.error as any)?.message || 'Failed to generate plan. Make sure your profile is complete and API key is set.'}
            </p>
          )}
        </Card>
      )}

      {/* Plans list */}
      <h2 className="text-lg font-semibold">Your Plans</h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : plans?.data.length === 0 ? (
        <Card className="py-6 text-center text-gray-500 dark:text-gray-400">
          No plans yet. Create your first macro plan above!
        </Card>
      ) : (
        <div className="space-y-3">
          {plans?.data.map((plan) => {
            const isEditingThisPlan = editingPlanId === plan.id;

            if (isEditingThisPlan && planEditForm) {
              return (
                <Card key={plan.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Edit Plan</h3>
                    <button
                      onClick={cancelEditingPlan}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <Input
                    label="Plan name"
                    value={planEditForm.name}
                    onChange={(e) => setPlanEditForm({ ...planEditForm, name: e.target.value })}
                  />

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Goal</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPlanEditForm({ ...planEditForm, goal: key })}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            planEditForm.goal === key
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Calories"
                      type="number"
                      min={0}
                      value={planEditForm.targetCalories}
                      onChange={(e) => setPlanEditForm({ ...planEditForm, targetCalories: e.target.value })}
                    />
                    <Input
                      label="Protein (g)"
                      type="number"
                      min={0}
                      value={planEditForm.targetProteinG}
                      onChange={(e) => setPlanEditForm({ ...planEditForm, targetProteinG: e.target.value })}
                    />
                    <Input
                      label="Carbs (g)"
                      type="number"
                      min={0}
                      value={planEditForm.targetCarbsG}
                      onChange={(e) => setPlanEditForm({ ...planEditForm, targetCarbsG: e.target.value })}
                    />
                    <Input
                      label="Fat (g)"
                      type="number"
                      min={0}
                      value={planEditForm.targetFatG}
                      onChange={(e) => setPlanEditForm({ ...planEditForm, targetFatG: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEditPlan(plan.id)}
                      isLoading={updatePlanMutation.isPending}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelEditingPlan} className="flex-1">
                      Cancel
                    </Button>
                  </div>

                  {updatePlanMutation.isError && (
                    <p className="text-xs text-red-600">Failed to update plan</p>
                  )}
                </Card>
              );
            }

            return (
              <Card
                key={plan.id}
                className={
                  plan.isActive
                    ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/50'
                    : 'opacity-75'
                }
              >
                {plan.isActive && (
                  <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Active Plan</span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{plan.name}</p>
                      {(plan as any).aiModel === 'manual' && (
                        <span className="text-[10px] font-medium uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!plan.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateMutation.mutate(plan.id)}
                        isLoading={activatingId === plan.id}
                        disabled={activatingId !== null}
                      >
                        Activate
                      </Button>
                    )}
                    <button
                      onClick={() => startEditingPlan(plan)}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-emerald-600 active:text-emerald-700 transition-colors rounded-lg hover:bg-emerald-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this macro plan?')) {
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

                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="font-semibold">{plan.targetCalories}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">kcal</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">{plan.targetProteinG}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Protein</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600">{plan.targetCarbsG}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Carbs</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600">{plan.targetFatG}g</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fat</p>
                  </div>
                </div>

                {plan.reasoning && (plan as any).aiModel !== 'manual' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      Show reasoning
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.reasoning}</p>
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
