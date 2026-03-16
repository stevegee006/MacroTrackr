'use client';

import { X } from 'lucide-react';
import type { FoodLogEntry, MacroTotals } from '@macrotracker/shared';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '@macrotracker/shared';
import type { MacroKey } from './MacroRings';

const MACRO_CONFIG: Record<
  MacroKey,
  { label: string; unit: string; color: string; field: keyof FoodLogEntry }
> = {
  calories: { label: 'Calories', unit: 'kcal', color: '#10b981', field: 'totalCalories' },
  protein: { label: 'Protein', unit: 'g', color: '#ef4444', field: 'totalProteinG' },
  carbs: { label: 'Carbs', unit: 'g', color: '#f59e0b', field: 'totalCarbsG' },
  fat: { label: 'Fat', unit: 'g', color: '#3b82f6', field: 'totalFatG' },
};

const TOTALS_KEY: Record<MacroKey, keyof MacroTotals> = {
  calories: 'calories',
  protein: 'proteinG',
  carbs: 'carbsG',
  fat: 'fatG',
};

interface MacroBreakdownModalProps {
  macro: MacroKey;
  entries: FoodLogEntry[];
  totals: MacroTotals;
  targets: MacroTotals;
  onClose: () => void;
}

export function MacroBreakdownModal({ macro, entries, totals, targets, onClose }: MacroBreakdownModalProps) {
  const config = MACRO_CONFIG[macro];
  const totalValue = totals[TOTALS_KEY[macro]];
  const targetValue = targets[TOTALS_KEY[macro]];

  // Find the max single-entry value for proportional bars
  const maxEntryValue = Math.max(...entries.map((e) => Number(e[config.field]) || 0), 1);

  // Group entries by meal type, sorted by contribution (highest first) within each group
  const grouped = MEAL_TYPES.map((mealType) => {
    const mealEntries = entries
      .filter((e) => e.mealType === mealType)
      .sort((a, b) => (Number(b[config.field]) || 0) - (Number(a[config.field]) || 0));
    return { mealType, entries: mealEntries };
  }).filter((g) => g.entries.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
            <h2 className="text-lg font-semibold">{config.label}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(totalValue)} / {Math.round(targetValue)} {config.unit}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {grouped.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
              No food logged yet today.
            </p>
          ) : (
            grouped.map(({ mealType, entries: mealEntries }) => (
              <div key={mealType}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {MEAL_TYPE_LABELS[mealType]}
                </h3>
                <div className="space-y-2">
                  {mealEntries.map((entry) => {
                    const value = Number(entry[config.field]) || 0;
                    const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    const barWidth = (value / maxEntryValue) * 100;

                    return (
                      <div key={entry.id} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{entry.foodItem?.name ?? 'Unknown food'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.servingQty} × {entry.servingSizeG}g
                            </p>
                          </div>
                          <div className="text-right ml-3 shrink-0">
                            <p className="text-sm font-semibold">{Math.round(value)} {config.unit}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(pct)}%</p>
                          </div>
                        </div>
                        {/* Proportional bar */}
                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${barWidth}%`, backgroundColor: config.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
