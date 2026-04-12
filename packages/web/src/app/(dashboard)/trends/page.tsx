'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { addDays, todayString } from '@/lib/utils';
import type { MacroTotals, MacroPlan } from '@macrotracker/shared';

interface RangeEntry {
  date: string;
  totals: MacroTotals;
  targets: MacroTotals;
}

function BarChart({
  data,
  valueKey,
  targetKey,
  label,
}: {
  data: RangeEntry[];
  valueKey: keyof MacroTotals;
  targetKey: keyof MacroTotals;
  label: string;
}) {
  const maxVal = Math.max(...data.map((d) => (d.totals[valueKey] as number) || 0), 1);

  return (
    <Card>
      <p className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-100">
        {label} — last 7 days
      </p>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((d) => {
          const val = (d.totals[valueKey] as number) || 0;
          const target = (d.targets[targetKey] as number) || 0;
          const hasData = val > 0;
          const isOver = hasData && target > 0 && val > target;
          const heightPct = hasData ? Math.min((val / maxVal) * 100, 100) : 4;
          const barColor = !hasData
            ? 'bg-gray-200 dark:bg-gray-700'
            : isOver
            ? 'bg-red-400 dark:bg-red-500'
            : 'bg-emerald-400 dark:bg-emerald-500';

          const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                {hasData ? Math.round(val) : '—'}
              </span>
              <div className="w-full flex items-end" style={{ height: '48px' }}>
                <div
                  className={`w-full rounded-t-sm transition-all ${barColor}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">{dayLabel}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Under target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Over target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">Not logged</span>
        </div>
      </div>
    </Card>
  );
}

const DEFAULT_TARGETS: MacroTotals = {
  calories: 2050,
  proteinG: 180,
  carbsG: 205,
  fatG: 55,
  fiberG: 30,
  sugarG: 50,
};

export default function TrendsPage() {
  const today = todayString();
  const sevenDaysAgo = addDays(today, -6);

  const { data: rangeRes, isLoading: rangeLoading } = useQuery({
    queryKey: ['food-log-range', sevenDaysAgo, today],
    queryFn: () =>
      apiFetch<{ data: { date: string; totals: MacroTotals; entries: number }[] }>(
        `/food-log/range?from=${sevenDaysAgo}&to=${today}`,
      ),
  });

  const { data: plansRes, isLoading: plansLoading } = useQuery({
    queryKey: ['macro-plans'],
    queryFn: () => apiFetch<{ data: MacroPlan[] }>('/macro-plan'),
  });

  const isLoading = rangeLoading || plansLoading;

  const activePlan = plansRes?.data?.find((p) => p.isActive);
  const targets: MacroTotals = activePlan
    ? {
        calories: activePlan.targetCalories,
        proteinG: activePlan.targetProteinG,
        carbsG: activePlan.targetCarbsG,
        fatG: activePlan.targetFatG,
        fiberG: DEFAULT_TARGETS.fiberG,
        sugarG: DEFAULT_TARGETS.sugarG,
      }
    : DEFAULT_TARGETS;

  const rangeData: RangeEntry[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(sevenDaysAgo, i);
    const existing = rangeRes?.data?.find((d) => d.date?.startsWith(date));
    return {
      date,
      totals: existing?.totals ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0 },
      targets,
    };
  });

  const loggedDays = rangeData.filter((d) => d.totals.calories > 0).length;
  const avgCalories =
    loggedDays > 0
      ? Math.round(rangeData.reduce((s, d) => s + d.totals.calories, 0) / loggedDays)
      : 0;
  const avgProtein =
    loggedDays > 0
      ? Math.round(rangeData.reduce((s, d) => s + d.totals.proteinG, 0) / loggedDays)
      : 0;

  const calorieTarget = targets.calories;
  const proteinTarget = targets.proteinG;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
          LAST 7 DAYS
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your nutrition over time</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3 px-3">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Avg calories</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {avgCalories > 0 ? avgCalories.toLocaleString() : '—'}
          </p>
          <p className={`text-[10px] mt-0.5 ${avgCalories > 0 && avgCalories <= calorieTarget ? 'text-emerald-500' : avgCalories > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {avgCalories > 0 ? `${avgCalories <= calorieTarget ? '\u2193' : '\u2191'} vs ${calorieTarget} target` : 'No data'}
          </p>
        </Card>
        <Card className="py-3 px-3">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Avg protein</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {avgProtein > 0 ? `${avgProtein}g` : '—'}
          </p>
          <p className={`text-[10px] mt-0.5 ${avgProtein >= proteinTarget ? 'text-emerald-500' : avgProtein > 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {avgProtein > 0 ? `${avgProtein >= proteinTarget ? '\u2713' : '\u2193'} vs ${proteinTarget}g target` : 'No data'}
          </p>
        </Card>
        <Card className="py-3 px-3">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Days logged</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{loggedDays}/7</p>
          <p className={`text-[10px] mt-0.5 ${loggedDays >= 5 ? 'text-emerald-500' : loggedDays >= 3 ? 'text-amber-500' : 'text-red-400'}`}>
            {Math.round((loggedDays / 7) * 100)}% consistency
          </p>
        </Card>
      </div>

      <BarChart
        data={rangeData}
        valueKey="calories"
        targetKey="calories"
        label="Calories"
      />

      <BarChart
        data={rangeData}
        valueKey="proteinG"
        targetKey="proteinG"
        label="Protein"
      />

      <BarChart
        data={rangeData}
        valueKey="carbsG"
        targetKey="carbsG"
        label="Carbs"
      />

      <BarChart
        data={rangeData}
        valueKey="fatG"
        targetKey="fatG"
        label="Fat"
      />

      <BarChart
        data={rangeData}
        valueKey="fiberG"
        targetKey="fiberG"
        label="Fiber"
      />

      <BarChart
        data={rangeData}
        valueKey="sugarG"
        targetKey="sugarG"
        label="Sugar"
      />
    </div>
  );
}
