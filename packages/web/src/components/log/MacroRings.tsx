'use client';

import type { MacroTotals } from '@macrotracker/shared';
import { useTheme } from '@/providers/ThemeProvider';

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
  size = 72,
  bgStroke,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
  bgStroke: string;
}) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - progress);
  const isOver = value > max && max > 0;
  const remaining = Math.max(0, Math.round(max - value));

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgStroke}
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
        </g>
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-current font-semibold ${isOver ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
          fontSize={size * 0.18}
        >
          {isOver ? `+${Math.round(value - max)}` : remaining}
        </text>
      </svg>
      <div className="text-center min-w-0 w-full">
        <p className={`font-semibold leading-tight ${unit ? 'text-xs' : 'text-[11px]'}`}>
          <span className={isOver ? 'text-red-500' : ''}>{Math.round(value)}</span>
          <span className="text-gray-400 font-normal">/{Math.round(max)}</span>
          {unit && <span className="text-gray-400 font-normal">{unit}</span>}
        </p>
        <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export function MacroRings({ totals, targets }: MacroRingsProps) {
  const { isDark } = useTheme();
  const bgStroke = isDark ? '#374151' : '#e5e7eb';

  return (
    <div>
      <div className="grid grid-cols-4 gap-1 py-3">
        <Ring
          value={totals.calories}
          max={targets.calories}
          label="Calories"
          unit=""
          color="#10b981"
          size={76}
          bgStroke={bgStroke}
        />
        <Ring
          value={totals.proteinG}
          max={targets.proteinG}
          label="Protein"
          unit="g"
          color="#3b82f6"
          bgStroke={bgStroke}
        />
        <Ring
          value={totals.carbsG}
          max={targets.carbsG}
          label="Carbs"
          unit="g"
          color="#f59e0b"
          bgStroke={bgStroke}
        />
        <Ring
          value={totals.fatG}
          max={targets.fatG}
          label="Fat"
          unit="g"
          color="#ef4444"
          bgStroke={bgStroke}
        />
      </div>
      <div className="flex justify-center gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700 dark:text-gray-400">
        <span>
          <span className="text-green-600 font-medium">Fiber:</span>{' '}
          {totals.fiberG}/{targets.fiberG}g
        </span>
        <span>
          <span className="text-purple-500 font-medium">Sugar:</span>{' '}
          {totals.sugarG}/{targets.sugarG}g
        </span>
      </div>
    </div>
  );
}
