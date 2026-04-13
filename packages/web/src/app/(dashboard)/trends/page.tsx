'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { addDays, todayString } from '@/lib/utils';
import { TrendingUp, Ruler } from 'lucide-react';
import type { MacroTotals, MacroPlan, BodyMeasurement } from '@macrotracker/shared';

type TrendsTab = 'nutrition' | 'measurements';

interface RangeEntry {
  date: string;
  totals: MacroTotals;
  targets: MacroTotals;
}

// ─── Shared chart helpers ────────────────────────────────────────

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

function LineChart({
  data,
  label,
  color,
  unit,
}: {
  data: { date: string; value: number }[];
  label: string;
  color: string;
  unit: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">No data yet</p>
      </Card>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartH = 80;
  const chartW = 100; // percentage-based

  // Build SVG path
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * chartW;
    const y = chartH - ((d.value - min) / range) * (chartH - 16) - 8;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <Card>
      <p className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100">{label}</p>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-20" preserveAspectRatio="none">
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-[9px] text-gray-400 dark:text-gray-500">
        <span>{new Date(data[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span className="font-medium text-gray-600 dark:text-gray-300">
          Latest: {data[data.length - 1].value.toFixed(1)}{unit}
        </span>
        <span>{new Date(data[data.length - 1].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </Card>
  );
}

// ─── Constants ───────────────────────────────────────────────────

const DEFAULT_TARGETS: MacroTotals = {
  calories: 2050,
  proteinG: 180,
  carbsG: 205,
  fatG: 55,
  fiberG: 30,
  sugarG: 50,
};

const KG_PER_LB = 0.453592;
const LB_PER_KG = 2.20462;
const IN_PER_CM = 1 / 2.54;

// ─── Main page ───────────────────────────────────────────────────

export default function TrendsPage() {
  const [tab, setTab] = useState<TrendsTab>('nutrition');
  const today = todayString();
  const sevenDaysAgo = addDays(today, -6);
  const thirtyDaysAgo = addDays(today, -29);

  // Nutrition data
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

  // Measurement data (last 30 days)
  const { data: measureRes, isLoading: measureLoading } = useQuery({
    queryKey: ['measurements-range', thirtyDaysAgo, today],
    queryFn: () =>
      apiFetch<{ data: BodyMeasurement[] }>(
        `/measurements/range?from=${thirtyDaysAgo}&to=${today}`,
      ),
    enabled: tab === 'measurements',
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: { preferredUnits: string } }>('/users/me/settings'),
  });

  const isImperial = settingsData?.data?.preferredUnits === 'IMPERIAL';

  const isLoading = rangeLoading || plansLoading || (tab === 'measurements' && measureLoading);

  // ── Nutrition calculations ──
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

  // ── Measurement calculations ──
  const measurements = measureRes?.data ?? [];

  function extractSeries(key: keyof BodyMeasurement, convertFn?: (v: number) => number) {
    return measurements
      .filter((m) => m[key] != null)
      .map((m) => {
        const raw = m[key] as number;
        const dateStr = typeof m.measuredAt === 'string' ? m.measuredAt.slice(0, 10) : new Date(m.measuredAt).toISOString().slice(0, 10);
        return { date: dateStr, value: convertFn ? convertFn(raw) : raw };
      });
  }

  const weightData = extractSeries('weightKg', isImperial ? (v) => Math.round(v * LB_PER_KG * 10) / 10 : undefined);
  const bfData = extractSeries('bodyFatPct');
  const waistData = extractSeries('waist', isImperial ? (v) => Math.round(v * IN_PER_CM * 10) / 10 : undefined);
  const hipData = extractSeries('hip', isImperial ? (v) => Math.round(v * IN_PER_CM * 10) / 10 : undefined);

  const latestWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;
  const firstWeight = weightData.length > 0 ? weightData[0].value : null;
  const weightChange = latestWeight != null && firstWeight != null && weightData.length > 1 ? latestWeight - firstWeight : null;
  const latestBf = bfData.length > 0 ? bfData[bfData.length - 1].value : null;

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
          TRENDS
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your progress over time</p>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {([
          { key: 'nutrition' as const, label: 'Nutrition', icon: TrendingUp },
          { key: 'measurements' as const, label: 'Body', icon: Ruler },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 px-3 text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Nutrition tab ── */}
      {tab === 'nutrition' && (
        <div className="space-y-6">
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

          <BarChart data={rangeData} valueKey="calories" targetKey="calories" label="Calories" />
          <BarChart data={rangeData} valueKey="proteinG" targetKey="proteinG" label="Protein" />
          <BarChart data={rangeData} valueKey="carbsG" targetKey="carbsG" label="Carbs" />
          <BarChart data={rangeData} valueKey="fatG" targetKey="fatG" label="Fat" />
          <BarChart data={rangeData} valueKey="fiberG" targetKey="fiberG" label="Fiber" />
          <BarChart data={rangeData} valueKey="sugarG" targetKey="sugarG" label="Sugar" />
        </div>
      )}

      {/* ── Measurements tab ── */}
      {tab === 'measurements' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="py-3 px-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Current weight</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {latestWeight != null ? `${latestWeight.toFixed(1)}` : '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {latestWeight != null ? (isImperial ? 'lbs' : 'kg') : 'No data'}
              </p>
            </Card>
            <Card className="py-3 px-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">30d change</p>
              <p className={`text-lg font-bold ${weightChange != null ? (weightChange <= 0 ? 'text-emerald-500' : 'text-red-400') : 'text-gray-900 dark:text-gray-100'}`}>
                {weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {weightChange != null ? (isImperial ? 'lbs' : 'kg') : 'No data'}
              </p>
            </Card>
            <Card className="py-3 px-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Body fat</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {latestBf != null ? `${latestBf.toFixed(1)}%` : '—'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {latestBf != null ? 'Latest' : 'No data'}
              </p>
            </Card>
          </div>

          {/* Line charts */}
          <LineChart data={weightData} label={`Weight (${isImperial ? 'lbs' : 'kg'})`} color="#10b981" unit={isImperial ? 'lbs' : 'kg'} />
          <LineChart data={bfData} label="Body Fat (%)" color="#f59e0b" unit="%" />
          <LineChart data={waistData} label={`Waist (${isImperial ? 'in' : 'cm'})`} color="#3b82f6" unit={isImperial ? 'in' : 'cm'} />
          <LineChart data={hipData} label={`Hip (${isImperial ? 'in' : 'cm'})`} color="#a855f7" unit={isImperial ? 'in' : 'cm'} />
        </div>
      )}
    </div>
  );
}
