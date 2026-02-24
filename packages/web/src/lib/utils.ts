import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format a Date to YYYY-MM-DD in local timezone (not UTC) */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateLocal(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date as YYYY-MM-DD in local timezone */
export function todayString(): string {
  return formatDate(new Date());
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC interpretation) */
export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Add/subtract days from a YYYY-MM-DD string, returns YYYY-MM-DD */
export function addDays(dateStr: string, offset: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}
