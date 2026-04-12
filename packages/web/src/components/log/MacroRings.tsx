'use client';

import type { MacroTotals } from '@macrotracker/shared';
import { useTheme } from '@/providers/ThemeProvider';
import { Flame } from 'lucide-react';

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

interface MacroRingsProps {
  totals: MacroTotals;
  targets: MacroTotals;
  onRingTap?: (macro: MacroKey) => void;
  streak?: number;
}

function Ring({
  value,
  max,
  label,
  unit,
  color,
  targetColor,
  size = 72,
  bgStroke,
  onTap,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  targetColor?: string;
  size?: number;
  bgStroke: string;
  onTap?: () => void;
}) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - progress);
  const isOver = value > max && max > 0;
  const targetHit = value >= max && max > 0;
  const remaining = Math.max(0, Math.round(max - value));

  const activeColor = targetHit && targetColor ? targetColor : isOver ? '#ef4444' : color;

  const Wrapper = onTap ? 'button' : 'div';

  return (
    <Wrapper
      {...(onTap ? { type: 'button' as const, onClick: onTap } : {})}
      className={`flex flex-col items-center gap-0.5 min-w-0 ${onTap ? 'cursor-pointer active:scale-95 transition-transform rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500' : ''}`}
    >
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
            stroke={activeColor}
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
          className={`fill-current font-semibold ${targetHit && targetColor ? 'text-green-500' : isOver ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
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
    </Wrapper>
  );
}

export function MacroRings({ totals, targets, onRingTap, streak }: MacroRingsProps) {
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
          size={72}
          bgStroke={bgStroke}
          onTap={onRingTap ? () => onRingTap('calories') : undefined}
        />
        <Ring
          value={totals.proteinG}
          max={targets.proteinG}
          label="Protein"
          unit="g"
          color="#ef4444"
          targetColor="#10b981"
          bgStroke={bgStroke}
          onTap={onRingTap ? () => onRingTap('protein') : undefined}
        />
        <Ring
          value={totals.carbsG}
          max={targets.carbsG}
          label="Carbs"
          unit="g"
          color="#f59e0b"
          bgStroke={bgStroke}
          onTap={onRingTap ? () => onRingTap('carbs') : undefined}
        />
        <Ring
          value={totals.fatG}
          max={targets.fatG}
          label="Fat"
          unit="g"
          color="#3b82f6"
          bgStroke={bgStroke}
          onTap={onRingTap ? () => onRingTap('fat') : undefined}
        />
      </div>
      <div className="flex justify-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-800/40 px-2.5 py-0.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-green-700 dark:text-green-400 font-medium">Fiber</span>
          <span className="text-gray-500 dark:text-gray-400">{totals.fiberG}/{targets.fiberG}g</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 px-2.5 py-0.5 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span className="text-purple-700 dark:text-purple-400 font-medium">Sugar</span>
          <span className="text-gray-500 dark:text-gray-400">{totals.sugarG}/{targets.sugarG}g</span>
        </span>
      </div>
      {streak != null && streak > 0 && (
        <div className="flex justify-center pt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-800/40 px-2.5 py-0.5 text-xs">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-orange-700 dark:text-orange-400 font-medium">{streak} day streak</span>
          </span>
        </div>
      )}
    </div>
  );
}
