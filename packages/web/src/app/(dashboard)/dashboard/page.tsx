'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString, addDays } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { MacroRings } from '@/components/log/MacroRings';
import type { MacroKey } from '@/components/log/MacroRings';
import { MacroBreakdownModal } from '@/components/log/MacroBreakdownModal';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Share2, Check, Plus } from 'lucide-react';
import type { DailySummary, FoodLogEntry } from '@macrotracker/shared';
import { MEAL_TYPE_LABELS } from '@macrotracker/shared';
import type { MealType } from '@macrotracker/shared';
import Link from 'next/link';

function getCurrentMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'BREAKFAST';
  if (hour < 14) return 'LUNCH';
  if (hour < 17) return 'SNACK';
  return 'DINNER';
}

interface FrequentFood {
  foodItem: { id: string; name: string; brand: string | null; caloriesPer100g: number };
  count: number;
  servingSizeG: number;
  servingQty: number;
}

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

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  dotColor: string,
  labelColor: string,
  valueColor: string,
  bgColor: string,
  borderColor: string,
  label: string,
  value: string,
) {
  const font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const boldFont = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.font = boldFont;
  const labelW = ctx.measureText(label).width;
  ctx.font = font;
  const valueW = ctx.measureText(value).width;
  const pillW = 10 + 6 + labelW + 6 + valueW + 12; // dot + gaps + padding
  const pillH = 24;
  const pillX = x - pillW / 2;
  const pillY = y - pillH / 2;
  const r = pillH / 2;

  // Background + border
  ctx.beginPath();
  ctx.moveTo(pillX + r, pillY);
  ctx.lineTo(pillX + pillW - r, pillY);
  ctx.arc(pillX + pillW - r, pillY + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(pillX + r, pillY + pillH);
  ctx.arc(pillX + r, pillY + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Dot
  let cx = pillX + 10;
  ctx.beginPath();
  ctx.arc(cx, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();
  cx += 8;

  // Label (bold)
  ctx.font = boldFont;
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, y);
  cx += labelW + 4;

  // Value
  ctx.font = font;
  ctx.fillStyle = valueColor;
  ctx.fillText(value, cx, y);
}

function generateShareImage(totals: DailySummary['totals'], targets: DailySummary['targets'], streak: number): Promise<Blob> {
  return new Promise((resolve) => {
    const dpr = 3; // High DPI for crisp rendering
    const w = 600, h = 380;
    const canvas = document.createElement('canvas');
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const ringRadius = 44;
    const ringY = 100;
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
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Today's Macros", w / 2, 36);

    rings.forEach((r, i) => {
      const cx = startX + i * gap;
      drawRingToCanvas(ctx, cx, ringY, ringRadius, r.value, r.max, r.color, r.targetColor, bgRing);

      // Value / target
      const isOver = r.value > r.max && r.max > 0;
      ctx.fillStyle = '#d1d5db';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const valStr = `${Math.round(r.value)}`;
      const maxStr = `/${Math.round(r.max)}${r.unit}`;
      const valW = ctx.measureText(valStr).width;
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const maxW = ctx.measureText(maxStr).width;
      const totalW = valW + maxW;
      const startXPos = cx - totalW / 2;

      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = isOver ? '#ef4444' : '#e5e7eb';
      ctx.fillText(valStr, startXPos, ringY + ringRadius + 22);
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(maxStr, startXPos + valW, ringY + ringRadius + 22);

      // Label
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(r.label, cx, ringY + ringRadius + 40);
    });

    // Divider line
    const dividerY = ringY + ringRadius + 56;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, dividerY);
    ctx.lineTo(w - 40, dividerY);
    ctx.stroke();

    // Fiber & Sugar pills
    const pillY = dividerY + 24;
    const pillGap = 130;
    drawPill(ctx, w / 2 - pillGap / 2, pillY, '', '#22c55e', '#15803d', '#9ca3af', 'rgba(34,197,94,0.08)', 'rgba(34,197,94,0.15)', 'Fiber', `${totals.fiberG}/${targets.fiberG}g`);
    drawPill(ctx, w / 2 + pillGap / 2, pillY, '', '#a855f7', '#7e22ce', '#9ca3af', 'rgba(168,85,247,0.08)', 'rgba(168,85,247,0.15)', 'Sugar', `${totals.sugarG}/${targets.sugarG}g`);

    // Streak pill (if applicable)
    if (streak > 0) {
      const streakY = pillY + 32;
      const streakText = `${streak} day streak`;
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const streakW = ctx.measureText(streakText).width + 36;
      const streakH = 24;
      const sx = w / 2 - streakW / 2;
      const sr = streakH / 2;

      ctx.beginPath();
      ctx.moveTo(sx + sr, streakY - sr);
      ctx.lineTo(sx + streakW - sr, streakY - sr);
      ctx.arc(sx + streakW - sr, streakY, sr, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(sx + sr, streakY + sr);
      ctx.arc(sx + sr, streakY, sr, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(249,115,22,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(249,115,22,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Flame emoji substitute (orange circle)
      ctx.beginPath();
      ctx.arc(sx + 14, streakY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();

      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#c2410c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(streakText, sx + 24, streakY);
    }

    // Branding
    ctx.fillStyle = '#4b5563';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('macrotrackr', w / 2, h - 12);

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

  // Frequent foods for current meal type
  const currentMeal = getCurrentMealType();
  const { data: frequentRes } = useQuery({
    queryKey: ['frequent-foods', currentMeal],
    queryFn: () =>
      apiFetch<{ data: FrequentFood[] }>(
        `/food-log/frequent?mealType=${currentMeal}&days=60&limit=8`,
      ),
  });

  // Fetch last 30 days for streak calculation
  const thirtyDaysAgo = addDays(today, -30);
  const { data: rangeData } = useQuery({
    queryKey: ['food-log-range', thirtyDaysAgo, today],
    queryFn: () =>
      apiFetch<{ data: { date: string; totals: { calories: number } }[] }>(
        `/food-log/range?from=${thirtyDaysAgo}&to=${today}`,
      ),
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

  // Calculate streak: consecutive days with logged food ending today
  const loggedDates = new Set(
    (rangeData?.data ?? [])
      .filter((d) => d.totals.calories > 0)
      .map((d) => d.date.split('T')[0]),
  );
  let streak = 0;
  for (let i = 0; i <= 30; i++) {
    const d = addDays(today, -i);
    if (loggedDates.has(d)) {
      streak++;
    } else {
      break;
    }
  }

  const MEAL_COLORS: Record<string, string> = {
    BREAKFAST: 'bg-amber-500',
    LUNCH: 'bg-blue-500',
    DINNER: 'bg-purple-500',
    SNACK: 'bg-rose-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Hi, {user?.displayName?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Here&apos;s your nutrition for today</p>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {s && (
          <Card className="lg:h-fit relative overflow-hidden border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/50" data-tutorial="macro-rings">
            <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-500/5 dark:bg-emerald-400/5 blur-2xl" />
            <button
              onClick={async () => {
                try {
                  const blob = await generateShareImage(s.totals, s.targets, streak);
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
                    const blob = await generateShareImage(s.totals, s.targets, streak);
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
            <MacroRings totals={s.totals} targets={s.targets} onRingTap={setActiveMacro} streak={streak} />
          </Card>
        )}

        <div className="space-y-4 mt-6 lg:mt-0 lg:col-span-2">
          <h2 className="text-lg font-semibold">Today&apos;s Log</h2>

          {/* Quick-add strip — common foods for current meal */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none" data-tutorial="quick-add-strip">
            <Link
              href="/scan"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-emerald-500/40 px-4 py-2.5 shrink-0 hover:border-emerald-500/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Add food</span>
            </Link>
            {(frequentRes?.data ?? []).map((item) => (
              <Link
                key={item.foodItem.id}
                href={`/scan?foodId=${item.foodItem.id}`}
                className="flex flex-col justify-center rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
              >
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[140px] truncate">{item.foodItem.name}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {Math.round(item.foodItem.caloriesPer100g * item.servingSizeG * item.servingQty / 100)} kcal · {MEAL_TYPE_LABELS[currentMeal].toLowerCase()}
                </span>
              </Link>
            ))}
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
                <Card key={entry.id} className="flex gap-0 p-0 overflow-hidden">
                  <div className={`w-1.5 shrink-0 rounded-l-2xl ${MEAL_COLORS[entry.mealType] ?? 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0 py-2.5 px-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entry.foodItem?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {MEAL_TYPE_LABELS[entry.mealType]} &middot; {entry.servingQty} &times; {entry.servingSizeG}g
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 shrink-0">
                      <span className="inline-flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        {Math.round(entry.totalCalories)}cal
                      </span>
                      <span className="inline-flex items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800/30 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        P:{Math.round(entry.totalProteinG)}g
                      </span>
                      <span className="inline-flex items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        C:{Math.round(entry.totalCarbsG)}g
                      </span>
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                        F:{Math.round(entry.totalFatG)}g
                      </span>
                    </div>
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
