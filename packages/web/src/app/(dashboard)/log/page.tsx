'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api-client';
import { todayString } from '@/lib/utils';
import { MacroRings } from '@/components/log/MacroRings';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import type { DailySummary, FoodLogEntry } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '@macrotracker/shared';
import Link from 'next/link';

export default function LogPage() {
  const [date, setDate] = useState(todayString());
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      // Use raw fetch for DELETE to avoid Content-Type: application/json
      // on a 204 No Content response which can cause parsing issues
      const baseUrl = getApiUrl();
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/food-log/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        throw new Error('Failed to delete entry');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-log', date] });
      queryClient.invalidateQueries({ queryKey: ['food-log-summary', date] });
    },
    onSettled: () => setDeletingId(null),
  });

  function changeDate(offset: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
  }

  const logs = entries?.data ?? [];
  const isToday = date === todayString();

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
        <Link href="/scan" className="text-sm text-emerald-600 hover:underline">
          + Add Food
        </Link>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium">
          {isToday ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isToday}>
          <ChevronRight className="h-5 w-5 disabled:opacity-30" />
        </button>
      </div>

      {summaryLoading || entriesLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          {summary?.data && (
            <Card>
              <MacroRings totals={summary.data.totals} targets={summary.data.targets} />
            </Card>
          )}

          {Object.keys(groupedLogs).length === 0 ? (
            <Card className="py-6 text-center text-gray-500">No food logged for this day.</Card>
          ) : (
            Object.entries(groupedLogs).map(([mealType, items]) => (
              <div key={mealType} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">
                  {MEAL_TYPE_LABELS[mealType as keyof typeof MEAL_TYPE_LABELS]}
                </h3>
                {items.map((entry) => (
                  <Card key={entry.id} className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.foodItem?.name}</p>
                      <p className="text-xs text-gray-500">
                        {entry.servingQty} x {entry.servingSizeG}g &middot;{' '}
                        {Math.round(entry.totalCalories)} kcal
                      </p>
                      <p className="text-xs mt-0.5">
                        <span className="text-blue-500">P:{Math.round(entry.totalProteinG)}g</span>
                        {' '}
                        <span className="text-amber-500">C:{Math.round(entry.totalCarbsG)}g</span>
                        {' '}
                        <span className="text-red-500">F:{Math.round(entry.totalFatG)}g</span>
                        {entry.totalFiberG != null && (
                          <>{' '}<span className="text-green-600">Fb:{Math.round(entry.totalFiberG)}g</span></>
                        )}
                        {entry.totalSugarG != null && (
                          <>{' '}<span className="text-purple-500">S:{Math.round(entry.totalSugarG)}g</span></>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(entry.id)}
                      disabled={deletingId === entry.id}
                      className="ml-2 p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50 active:bg-red-100"
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </Card>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
