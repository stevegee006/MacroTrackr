'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { todayString, addDays, parseDateLocal } from '@/lib/utils';
import { MacroRings } from '@/components/log/MacroRings';
import { MacroBreakdownModal } from '@/components/log/MacroBreakdownModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ChevronLeft, ChevronRight, Trash2, Pencil, Loader2, X, Plus } from 'lucide-react';
import type { DailySummary, FoodLogEntry, MealType } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@macrotracker/shared';
import Link from 'next/link';

interface EditForm {
  logDate: string;
  servingQty: string;
  servingSizeG: string;
  mealType: MealType;
  showMacroOverride: boolean;
  totalCalories: string;
  totalProteinG: string;
  totalCarbsG: string;
  totalFatG: string;
  totalFiberG: string;
  totalSugarG: string;
}

export default function LogPage() {
  const [date, setDate] = useState(todayString());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [activeMacro, setActiveMacro] = useState<'calories' | 'protein' | 'carbs' | 'fat' | null>(null);
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['food-log-summary', date],
    queryFn: () => apiFetch<{ data: DailySummary }>(`/food-log/summary?date=${date}`),
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['food-log', date],
    queryFn: () => apiFetch<{ data: FoodLogEntry[] }>(`/food-log?date=${date}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/food-log/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to delete entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-log', date] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary', date] });
    },
    onSettled: () => setDeletingId(null),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return apiFetch(`/food-log/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-log'] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary'] });
      setEditingId(null);
      setEditForm(null);
    },
  });

  function startEditing(entry: FoodLogEntry) {
    setEditingId(entry.id);
    setEditForm({
      logDate: typeof entry.logDate === 'string' ? entry.logDate.split('T')[0] : date,
      servingQty: entry.servingQty.toString(),
      servingSizeG: entry.servingSizeG.toString(),
      mealType: entry.mealType as MealType,
      showMacroOverride: false,
      totalCalories: Math.round(entry.totalCalories).toString(),
      totalProteinG: Math.round(entry.totalProteinG).toString(),
      totalCarbsG: Math.round(entry.totalCarbsG).toString(),
      totalFatG: Math.round(entry.totalFatG).toString(),
      totalFiberG: entry.totalFiberG != null ? Math.round(entry.totalFiberG).toString() : '',
      totalSugarG: entry.totalSugarG != null ? Math.round(entry.totalSugarG).toString() : '',
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(null);
  }

  function saveEdit(entryId: string) {
    if (!editForm) return;

    const data: Record<string, unknown> = {
      logDate: editForm.logDate,
      servingQty: parseFloat(editForm.servingQty) || 1,
      servingSizeG: parseFloat(editForm.servingSizeG) || 100,
      mealType: editForm.mealType,
    };

    if (editForm.showMacroOverride) {
      data.totalCalories = parseFloat(editForm.totalCalories) || 0;
      data.totalProteinG = parseFloat(editForm.totalProteinG) || 0;
      data.totalCarbsG = parseFloat(editForm.totalCarbsG) || 0;
      data.totalFatG = parseFloat(editForm.totalFatG) || 0;
      data.totalFiberG = editForm.totalFiberG ? parseFloat(editForm.totalFiberG) : null;
      data.totalSugarG = editForm.totalSugarG ? parseFloat(editForm.totalSugarG) : null;
    }

    updateMutation.mutate({ id: entryId, data });
  }

  function changeDate(offset: number) {
    setDate(addDays(date, offset));
    cancelEditing();
  }

  const logs = entries?.data ?? [];
  const isToday = date === todayString();
  const maxDate = addDays(todayString(), 7);
  const isMaxDate = date >= maxDate;

  const MEAL_COLORS: Record<string, string> = {
    BREAKFAST: 'bg-amber-500',
    LUNCH: 'bg-blue-500',
    DINNER: 'bg-purple-500',
    SNACK: 'bg-rose-400',
  };

  const groupedLogs = MEAL_TYPES.reduce(
    (acc, type) => {
      const items = logs.filter((l) => l.mealType === type);
      if (items.length > 0) acc[type] = items;
      return acc;
    },
    {} as Record<string, FoodLogEntry[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Food Log</h1>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between" data-tutorial="log-date-nav">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">
          {isToday
            ? 'Today'
            : date === addDays(todayString(), 1)
              ? 'Tomorrow'
              : parseDateLocal(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30" disabled={isMaxDate}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {summaryLoading || entriesLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {summary?.data && (
            <Card>
              <MacroRings totals={summary.data.totals} targets={summary.data.targets} onRingTap={setActiveMacro} />
            </Card>
          )}

          {Object.keys(groupedLogs).length === 0 ? (
            <Card className="py-6 text-center text-gray-500 dark:text-gray-400">No food logged for this day.</Card>
          ) : (
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0" data-tutorial="log-entries">
            {Object.entries(groupedLogs).map(([mealType, items]) => {
              const mealCals = items.reduce((s, e) => s + e.totalCalories, 0);
              const mealP = items.reduce((s, e) => s + e.totalProteinG, 0);
              const mealC = items.reduce((s, e) => s + e.totalCarbsG, 0);
              const mealF = items.reduce((s, e) => s + e.totalFatG, 0);

              // Check if any item in this meal is being edited
              const editingEntry = items.find((e) => editingId === e.id);
              if (editingEntry && editForm) {
                const qty = parseFloat(editForm.servingQty) || 0;
                const sizeG = parseFloat(editForm.servingSizeG) || 0;
                const factor = (sizeG * qty) / 100;
                const fi = editingEntry.foodItem;
                return (
                  <Card key={mealType} className="space-y-3 py-3 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{fi?.name}</p>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="min-w-0">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                          <input
                            type="date"
                            value={editForm.logDate}
                            max={addDays(todayString(), 7)}
                            onChange={(e) => setEditForm({ ...editForm, logDate: e.target.value })}
                            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 appearance-none [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Input
                            label="Servings"
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={editForm.servingQty}
                            onChange={(e) => setEditForm({ ...editForm, servingQty: e.target.value })}
                            className="w-24"
                          />
                          <Input
                            label="Size (g)"
                            type="number"
                            min={1}
                            value={editForm.servingSizeG}
                            onChange={(e) => setEditForm({ ...editForm, servingSizeG: e.target.value })}
                            className="w-28"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meal</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {MEAL_TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, mealType: type })}
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                                  editForm.mealType === type
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                              >
                                {MEAL_TYPE_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toggle macro override */}
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, showMacroOverride: !editForm.showMacroOverride })}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          {editForm.showMacroOverride ? '− Hide macro overrides' : '+ Edit Macros Directly'}
                        </button>

                        {editForm.showMacroOverride ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                label="Calories"
                                type="number"
                                min={0}
                                value={editForm.totalCalories}
                                onChange={(e) => setEditForm({ ...editForm, totalCalories: e.target.value })}
                              />
                              <Input
                                label="Protein (g)"
                                type="number"
                                min={0}
                                value={editForm.totalProteinG}
                                onChange={(e) => setEditForm({ ...editForm, totalProteinG: e.target.value })}
                              />
                              <Input
                                label="Carbs (g)"
                                type="number"
                                min={0}
                                value={editForm.totalCarbsG}
                                onChange={(e) => setEditForm({ ...editForm, totalCarbsG: e.target.value })}
                              />
                              <Input
                                label="Fat (g)"
                                type="number"
                                min={0}
                                value={editForm.totalFatG}
                                onChange={(e) => setEditForm({ ...editForm, totalFatG: e.target.value })}
                              />
                              <Input
                                label="Fiber (g)"
                                type="number"
                                min={0}
                                placeholder="—"
                                value={editForm.totalFiberG}
                                onChange={(e) => setEditForm({ ...editForm, totalFiberG: e.target.value })}
                              />
                              <Input
                                label="Sugar (g)"
                                type="number"
                                min={0}
                                placeholder="—"
                                value={editForm.totalSugarG}
                                onChange={(e) => setEditForm({ ...editForm, totalSugarG: e.target.value })}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">Override values are used as-is (no recalculation).</p>
                          </div>
                        ) : (
                          /* Preview macros from serving calculation */
                          fi && (
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-xs">
                              <span className="font-medium">{Math.round((fi.caloriesPer100g ?? 0) * factor)} kcal</span>
                              {' · '}
                              <span className="text-red-500">P:{Math.round((fi.proteinPer100g ?? 0) * factor)}g</span>
                              {' '}
                              <span className="text-amber-500">C:{Math.round((fi.carbsPer100g ?? 0) * factor)}g</span>
                              {' '}
                              <span className="text-blue-500">F:{Math.round((fi.fatPer100g ?? 0) * factor)}g</span>
                            </div>
                          )
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(editingEntry.id)}
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
                          <p className="text-xs text-red-600">Failed to update entry</p>
                        )}
                  </Card>
                );
              }

              // Display mode — single card per meal with color indicator
              return (
                <Card key={mealType} className="flex gap-0 p-0 overflow-hidden">
                  <div className={`w-1.5 shrink-0 rounded-l-2xl ${MEAL_COLORS[mealType] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0 py-3 px-3">
                    {/* Meal header */}
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]}
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {Math.round(mealCals)} kcal
                        {' · '}
                        <span className="text-red-500">P:{Math.round(mealP)}g</span>
                        {' '}
                        <span className="text-amber-500">C:{Math.round(mealC)}g</span>
                        {' '}
                        <span className="text-blue-500">F:{Math.round(mealF)}g</span>
                      </p>
                    </div>
                    {/* Items */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {items.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{entry.foodItem?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.servingQty} &times; {entry.servingSizeG}g &middot;{' '}
                              {Math.round(entry.totalCalories)} kcal
                            </p>
                            <p className="text-xs mt-0.5">
                              <span className="text-red-500">P:{Math.round(entry.totalProteinG)}g</span>
                              {' '}
                              <span className="text-amber-500">C:{Math.round(entry.totalCarbsG)}g</span>
                              {' '}
                              <span className="text-blue-500">F:{Math.round(entry.totalFatG)}g</span>
                              {entry.totalFiberG != null && (
                                <>{' '}<span className="text-green-600">Fb:{Math.round(entry.totalFiberG)}g</span></>
                              )}
                              {entry.totalSugarG != null && (
                                <>{' '}<span className="text-purple-500">S:{Math.round(entry.totalSugarG)}g</span></>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center ml-2 shrink-0">
                            <button
                              onClick={() => startEditing(entry)}
                              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-emerald-600 active:text-emerald-700 transition-colors rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deletingId === entry.id}
                              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg"
                            >
                              {deletingId === entry.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
            </div>
          )}
          {activeMacro && summary?.data && (
            <MacroBreakdownModal
              macro={activeMacro}
              entries={logs}
              totals={summary.data.totals}
              targets={summary.data.targets}
              onClose={() => setActiveMacro(null)}
            />
          )}
        </>
      )}

      <Link
        href={isToday ? '/scan' : `/scan?date=${date}`}
        className="fixed bottom-28 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 pl-4 pr-5 py-3 shadow-lg transition-all active:scale-95 hover:from-emerald-700 hover:to-emerald-600 lg:hidden"
        aria-label="Add food"
      >
        <Plus className="h-5 w-5 text-white" />
        <span className="text-sm font-semibold text-white">Add Food</span>
      </Link>
    </div>
  );
}
