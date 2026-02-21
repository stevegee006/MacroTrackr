'use client';

import type { MacroTotals } from '@macrotracker/shared';

interface MacroRingsProps {
  totals: MacroTotals;
  targets: MacroTotals;
}

function Ring({
  value,
  max,
  label,
  unit,
  color,
  size = 80,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
}) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - progress);
  const isOver = value > max && max > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#ef4444' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold">
          <span className={isOver ? 'text-red-500' : ''}>{Math.round(value)}</span>
          <span className="text-gray-400 font-normal"> / {Math.round(max)}</span>
          {unit && <span className="text-gray-400 font-normal text-xs">{unit}</span>}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function MacroRings({ totals, targets }: MacroRingsProps) {
  return (
    <div className="flex items-center justify-around py-4">
      <Ring
        value={totals.calories}
        max={targets.calories}
        label="Calories"
        unit=""
        color="#10b981"
        size={90}
      />
      <Ring
        value={totals.proteinG}
        max={targets.proteinG}
        label="Protein"
        unit="g"
        color="#3b82f6"
      />
      <Ring
        value={totals.carbsG}
        max={targets.carbsG}
        label="Carbs"
        unit="g"
        color="#f59e0b"
      />
      <Ring
        value={totals.fatG}
        max={targets.fatG}
        label="Fat"
        unit="g"
        color="#ef4444"
      />
    </div>
  );
}
