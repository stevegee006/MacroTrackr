'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { MacroRings } from '@/components/log/MacroRings';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { DailySummary, FoodLogEntry } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS } from '@macrotracker/shared';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const today = todayString();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['food-log-summary', today],
    queryFn: () => apiFetch<{ data: DailySummary }>(`/food-log/summary?date=${today}`),
  });

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['food-log', today],
    queryFn: () => apiFetch<{ data: FoodLogEntry[] }>(`/food-log?date=${today}`),
  });

  if (summaryLoading || entriesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const s = summary?.data;
  const logs = entries?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          Hi, {user?.displayName || 'there'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Today&apos;s Progress</p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {s && (
          <Card>
            <MacroRings totals={s.totals} targets={s.targets} />
            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {s.totals.calories} / {s.targets.calories} kcal
            </div>
          </Card>
        )}

        <div className="space-y-4 mt-6 lg:mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today&apos;s Log</h2>
            <Link href="/scan" className="text-sm text-emerald-600 hover:underline">
              + Add Food
            </Link>
          </div>

          {logs.length === 0 ? (
            <Card className="py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No food logged today.</p>
              <Link href="/scan" className="mt-2 inline-block text-emerald-600 hover:underline">
                Scan a barcode to get started
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => (
                <Card key={entry.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{entry.foodItem?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {MEAL_TYPE_LABELS[entry.mealType]} &middot; {entry.servingQty} x {entry.servingSizeG}g
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Math.round(entry.totalCalories)} kcal</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      P:{Math.round(entry.totalProteinG)} C:{Math.round(entry.totalCarbsG)} F:{Math.round(entry.totalFatG)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
