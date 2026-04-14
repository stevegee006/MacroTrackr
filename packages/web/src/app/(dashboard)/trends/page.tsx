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
  const svgW = 400;
  const svgH = 120;
  const pad = { top: 20, right: 16, bottom: 28, left: 16 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const points = data.map((d, i) => {
    const x = pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = pad.top + plotH - ((d.value - min) / range) * plotH;
    return { x, y, ...d };
  });

  // Smooth curve using catmull-rom to bezier conversion
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // Gradient fill path
  const fillD = smoothPath(points) + ` L ${points[points.length - 1].x} ${svgH - pad.bottom} L ${points[0].x} ${svgH - pad.bottom} Z`;
  const gradId = `grad-${label.replace(/\W/g, '')}`;

  // Date labels: show first, middle, last
  const dateLabels: { x: number; text: string }[] = [];
  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (points.length >= 1) dateLabels.push({ x: points[0].x, text: fmtDate(data[0].date) });
  if (points.length >= 3) {
    const mid = Math.floor(points.length / 2);
    dateLabels.push({ x: points[mid].x, text: fmtDate(data[mid].date) });
  }
  if (points.length >= 2) dateLabels.push({ x: points[points.length - 1].x, text: fmtDate(data[data.length - 1].date) });

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Latest: <span className="text-gray-700 dark:text-gray-200">{data[data.length - 1].value.toFixed(1)}{unit}</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: 120 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fill area */}
        <path d={fillD} fill={`url(#${gradId})`} />
        {/* Line */}
        <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#030712" stroke={color} strokeWidth="2" />
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500"
              fontSize="9"
              fontWeight="500"
            >
              {p.value.toFixed(1)}
            </text>
          </g>
        ))}
        {/* Date labels */}
        {dateLabels.map((dl, i) => (
          <text
            key={i}
            x={dl.x}
            y={svgH - 6}
            textAnchor={i === 0 ? 'start' : i === dateLabels.length - 1 ? 'end' : 'middle'}
            className="fill-gray-400 dark:fill-gray-500"
            fontSize="9"
          >
            {dl.text}
          </text>
        ))}
      </svg>
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
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1" data-tutorial="trends-tabs">
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
