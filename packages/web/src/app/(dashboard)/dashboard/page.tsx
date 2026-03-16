'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { todayString } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { MacroRings } from '@/components/log/MacroRings';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Share2, Check } from 'lucide-react';
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
    ctx.fillText('macrotrakr', w / 2, 300);

    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = todayString();
  const [shared, setShared] = useState(false);

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
          <Card className="lg:h-fit relative">
            <button
              onClick={async () => {
                const text = `Today's Macros\n${s.totals.calories}/${s.targets.calories} kcal\nProtein: ${Math.round(s.totals.proteinG)}/${Math.round(s.targets.proteinG)}g\nCarbs: ${Math.round(s.totals.carbsG)}/${Math.round(s.targets.carbsG)}g\nFat: ${Math.round(s.totals.fatG)}/${Math.round(s.targets.fatG)}g`;
                try {
                  const blob = await generateShareImage(s.totals, s.targets);
                  const file = new File([blob], 'macros.png', { type: 'image/png' });
                  if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ text, files: [file] });
                  } else if (navigator.share) {
                    await navigator.share({ text });
                  } else {
                    await navigator.clipboard.writeText(text);
                    setShared(true);
                    setTimeout(() => setShared(false), 2000);
                  }
                } catch (e: any) {
                  if (e?.name !== 'AbortError') {
                    await navigator.clipboard.writeText(text);
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
