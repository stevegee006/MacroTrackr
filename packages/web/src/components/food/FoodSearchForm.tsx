'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Search } from 'lucide-react';
import type { FoodItem } from '@macrotracker/shared';

interface FoodSearchFormProps {
  onResult: (food: FoodItem) => void;
}

interface SearchResponse {
  data: FoodItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function FoodSearchForm({ onResult }: FoodSearchFormProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
    setDebounceTimer(timer);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () =>
      apiFetch<SearchResponse>(`/food/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`),
    enabled: debouncedQuery.length >= 1,
  });

  const foods = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search saved foods..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          autoFocus
        />
      </div>

      {isLoading && debouncedQuery && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600 text-center py-2">Failed to search. Please try again.</p>
      )}

      {!isLoading && debouncedQuery && foods.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No foods found for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}

      {foods.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {total} result{total !== 1 ? 's' : ''}
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {foods.map((food) => (
              <button
                key={food.id}
                onClick={() => onResult(food)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {food.name}
                    </p>
                    {food.brand && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {food.brand}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {food.caloriesPer100g} kcal
                    </p>
                    <p className="text-[10px] text-gray-400">
                      P {food.proteinPer100g}g · C {food.carbsPer100g}g · F {food.fatPer100g}g
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!debouncedQuery && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          Search for foods you&apos;ve previously added by name.
        </p>
      )}
    </div>
  );
}
