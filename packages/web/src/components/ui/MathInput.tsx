'use client';

import { useState, useEffect } from 'react';
import { cn, evalMathExpr } from '@/lib/utils';

interface MathInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: number | string;
  className?: string;
  inputMode?: 'decimal' | 'numeric';
}

/**
 * A number input that also accepts simple math expressions.
 * Users can type e.g. "150-32" and it evaluates to "118" on blur.
 * Shows a subtle indicator when the input contains an expression.
 */
export function MathInput({ label, value, onChange, min, step, className, inputMode }: MathInputProps) {
  const [raw, setRaw] = useState(value);
  const [hasExpr, setHasExpr] = useState(false);

  // Sync external value changes
  useEffect(() => {
    setRaw(value);
    setHasExpr(false);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setRaw(v);
    // Check if it contains math operators
    const isMath = /[+\-*/]/.test(v.replace(/^-/, '')); // ignore leading negative
    setHasExpr(isMath);
    // If it's a plain number, update immediately
    if (!isMath) {
      onChange(v);
    }
  }

  function handleBlur() {
    if (hasExpr) {
      const result = evalMathExpr(raw);
      if (result != null) {
        const str = String(result);
        setRaw(str);
        onChange(str);
        setHasExpr(false);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && hasExpr) {
      e.preventDefault();
      handleBlur();
    }
  }

  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode={inputMode ?? 'decimal'}
          value={raw}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          step={step}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500',
            hasExpr && 'border-amber-400 dark:border-amber-500',
            className,
          )}
        />
        {hasExpr && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-500 font-medium pointer-events-none">
            = {evalMathExpr(raw)?.toFixed(1) ?? '?'}
          </span>
        )}
      </div>
    </div>
  );
}
