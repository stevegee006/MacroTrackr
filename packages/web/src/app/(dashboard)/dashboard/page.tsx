'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { MacroRings } from '@/components/log/MacroRings';
import type { MacroKey } from '@/components/log/MacroRings';
import { MacroBreakdownModal } from '@/components/log/MacroBreakdownModal';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Share2, Check, Flame, Plus } from 'lucide-react';
import type { DailySummary, FoodLogEntry } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS } from '@macrotracker/shared';
import Link from 'next/link';

function drawRingToCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  max: number,
  color: string,
  targetColor: string | null,
  bgColor: string,
) {
  const strokeWidth = 8;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const isOver = value > max && max > 0;
  const targetHit = value >= max && max > 0;
  const activeColor = isOver ? '#ef4444' : targetHit && targetColor ? targetColor : color;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = bgColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Progress ring
  if (progress > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Center text (remaining)
  const remaining = Math.max(0, Math.round(max - value));
  const display = isOver ? `+${Math.round(value - max)}` : `${remaining}`;
  ctx.fillStyle = isOver ? '#ef4444' : targetHit && targetColor ? '#10b981' : '#e5e7eb';
  ctx.font = `bold ${radius * 0.5}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(display, cx, cy);
}

function generateShareImage(totals: DailySummary['totals'], targets: DailySummary['targets']): Promise<Blob> {
  return new Promise((resolve) => {
    const w = 600, h = 320;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const ringRadius = 40;
    const ringY = 110;
    const gap = 130;
    const startX = (w - gap * 3) / 2;
    const bgRing = '#374151';

    const rings = [
      { label: 'Calories', value: totals.calories, max: targets.calories, color: '#10b981', targetColor: null, unit: '' },
      { label: 'Protein', value: totals.proteinG, max: targets.proteinG, color: '#ef4444', targetColor: '#10b981', unit: 'g' },
      { label: 'Carbs', value: totals.carbsG, max: targets.carbsG, color: '#f59e0b', targetColor: null, unit: 'g' },
      { label: 'Fat', value: totals.fatG, max: targets.fatG, color: '#3b82f6', targetColor: null, unit: 'g' },
    ];

    // Title
    ctx.fillStyle = '#f3f4f6';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Today's Macros", w / 2, 40);

    rings.forEach((r, i) => {
      const cx = startX + i * gap;
      drawRingToCanvas(ctx, cx, ringY, ringRadius, r.value, r.max, r.color, r.targetColor, bgRing);

      // Value / target
      ctx.fillStyle = '#d1d5db';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(r.value)}/${Math.round(r.max)}${r.unit}`, cx, ringY + ringRadius + 24);

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(r.label, cx, ringY + ringRadius + 42);
    });

    // Fiber / Sugar row
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Fiber: ${totals.fiberG}/${targets.fiberG}g    Sugar: ${totals.sugarG}/${targets.sugarG}g`, w / 2, 240);

    // Calorie total
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`${totals.calories} / ${targets.calories} kcal`, w / 2, 270);

    // Branding
    ctx.fillStyle = '#4b5563';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('macrotrackr', w / 2, 300);

    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = todayString();
  const [shared, setShared] = useState(false);
  const [activeMacro, setActiveMacro] = useState<MacroKey | null>(null);

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

  // Calculate streak (placeholder — will be replaced with actual API call)
  const streak = 0;

  const MEAL_COLORS: Record<string, string> = {
    BREAKFAST: 'bg-amber-500',
    LUNCH: 'bg-blue-500',
    DINNER: 'bg-purple-500',
    SNACK: 'bg-rose-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Hi, {user?.displayName?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here&apos;s your nutrition for today</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/50 px-3 py-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{streak}</span>
            <span className="text-xs text-orange-500 dark:text-orange-500">day streak</span>
          </div>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {s && (
          <Card className="lg:h-fit relative overflow-hidden border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/50" data-tutorial="macro-rings">
            <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-500/5 dark:bg-emerald-400/5 blur-2xl" />
            <button
              onClick={async () => {
                try {
                  const blob = await generateShareImage(s.totals, s.targets);
                  const file = new File([blob], 'macros.png', { type: 'image/png' });
                  if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file] });
                  } else if (navigator.share) {
                    await navigator.share({ files: [file] });
                  } else {
                    // Desktop fallback: download the image
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'macros.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }
                } catch (e: any) {
                  if (e?.name !== 'AbortError') {
                    // Fallback: download the image
                    const blob = await generateShareImage(s.totals, s.targets);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'macros.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }
                }
              }}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              title="Share macros"
            >
              {shared ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
            </button>
            <MacroRings totals={s.totals} targets={s.targets} onRingTap={setActiveMacro} />
            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {s.totals.calories} / {s.targets.calories} kcal
            </div>
          </Card>
        )}

        <div className="space-y-4 mt-6 lg:mt-0 lg:col-span-2">
          <h2 className="text-lg font-semibold">Today&apos;s Log</h2>

          {/* Quick-add strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <Link
              href="/scan"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-emerald-500/40 px-4 py-2.5 shrink-0 hover:border-emerald-500/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Add food</span>
            </Link>
            {(() => {
              // Deduplicate recent foods by foodItem id
              const seen = new Set<string>();
              const recentFoods: typeof logs = [];
              for (const entry of logs) {
                const fid = entry.foodItem?.id;
                if (fid && !seen.has(fid)) {
                  seen.add(fid);
                  recentFoods.push(entry);
                }
              }
              return recentFoods.map((entry) => (
                <Link
                  key={entry.foodItem!.id}
                  href={`/scan?foodId=${entry.foodItem!.id}`}
                  className="flex flex-col justify-center rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                >
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{entry.foodItem?.name}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{Math.round(entry.totalCalories)} kcal</span>
                </Link>
              ));
            })()}
          </div>

          {logs.length === 0 ? (
            <Card className="py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/50">
                <span className="text-2xl">🥗</span>
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-200">Nothing logged yet</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start tracking to hit your goals today</p>
              <Link
                href="/scan"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-95 transition-all"
              >
                + Add Your First Food
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => (
                <Card key={entry.id} className="flex items-center gap-3 py-3 px-3">
                  <div className={`h-full w-1 self-stretch rounded-full ${MEAL_COLORS[entry.mealType] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.foodItem?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {MEAL_TYPE_LABELS[entry.mealType]} &middot; {entry.servingQty} &times; {entry.servingSizeG}g
                    </p>
                  </div>
                  <div className="text-right shrink-0">
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

      {activeMacro && s && (
        <MacroBreakdownModal
          macro={activeMacro}
          entries={logs}
          totals={s.totals}
          targets={s.targets}
          onClose={() => setActiveMacro(null)}
        />
      )}
    </div>
  );
}
