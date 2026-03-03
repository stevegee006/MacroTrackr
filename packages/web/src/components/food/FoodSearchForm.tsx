'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
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

interface UsdaFood {
  fdcId: number;
  name: string;
  brand: string | null;
  servingSizeG: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  dataType: string;
}

type SearchMode = 'saved' | 'external';

export function FoodSearchForm({ onResult }: FoodSearchFormProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [mode, setMode] = useState<SearchMode>('saved');
  const [importingId, setImportingId] = useState<number | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
    setDebounceTimer(timer);
  }

  // Local DB search
  const localSearch = useQuery({
    queryKey: ['foodSearch', debouncedQuery],
    queryFn: () =>
      apiFetch<SearchResponse>(`/food/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`),
    enabled: mode === 'saved' && debouncedQuery.length >= 1,
  });

  // External USDA search
  const externalSearch = useQuery({
    queryKey: ['foodSearchExternal', debouncedQuery],
    queryFn: () =>
      apiFetch<{ data: UsdaFood[] }>(`/food/search/external?q=${encodeURIComponent(debouncedQuery)}&limit=15`),
    enabled: mode === 'external' && debouncedQuery.length >= 2,
  });

  // Import USDA food
  const importMutation = useMutation({
    mutationFn: async (food: UsdaFood) => {
      setImportingId(food.fdcId);
      const res = await apiFetch<{ data: FoodItem }>('/food/import/usda', {
        method: 'POST',
        body: JSON.stringify(food),
      });
      return res.data;
    },
    onSuccess: (imported) => {
      onResult(imported);
    },
    onSettled: () => setImportingId(null),
  });

  const isLoading = mode === 'saved' ? localSearch.isLoading : externalSearch.isLoading;
  const isError = mode === 'saved' ? localSearch.isError : externalSearch.isError;
  const errorMsg = mode === 'external' && externalSearch.isError
    ? ((externalSearch.error as any)?.message || 'Search failed')
    : 'Failed to search. Please try again.';

  const localFoods = localSearch.data?.data ?? [];
  const localTotal = localSearch.data?.pagination?.total ?? 0;
  const externalFoods = externalSearch.data?.data ?? [];

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
        <button
          onClick={() => setMode('saved')}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === 'saved'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Saved Foods
        </button>
        <button
          onClick={() => setMode('external')}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
            mode === 'external'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Restaurant & USDA
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={mode === 'saved' ? 'Search saved foods...' : 'Search restaurants, brands, foods...'}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          autoFocus
        />
      </div>

      {/* Loading */}
      {isLoading && debouncedQuery && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-red-600 text-center py-2">{errorMsg}</p>
      )}

      {/* Local results */}
      {mode === 'saved' && !isLoading && debouncedQuery && localFoods.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No foods found for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}

      {mode === 'saved' && localFoods.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {localTotal} result{localTotal !== 1 ? 's' : ''}
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {localFoods.map((food) => (
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
                      {Math.round(food.caloriesPer100g)} kcal
                    </p>
                    <p className="text-[10px] text-gray-400">
                      P {Math.round(food.proteinPer100g)}g · C {Math.round(food.carbsPer100g)}g · F {Math.round(food.fatPer100g)}g
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* External USDA results */}
      {mode === 'external' && !isLoading && debouncedQuery.length >= 2 && externalFoods.length === 0 && !isError && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No results found for &ldquo;{debouncedQuery}&rdquo;
        </p>
      )}

      {mode === 'external' && externalFoods.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {externalFoods.length} result{externalFoods.length !== 1 ? 's' : ''} from USDA
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {externalFoods.map((food) => (
              <button
                key={food.fdcId}
                onClick={() => importMutation.mutate(food)}
                disabled={importingId === food.fdcId}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {food.name}
                      </p>
                      <span className="text-[9px] font-semibold uppercase bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-1 py-0.5 rounded shrink-0">
                        USDA
                      </span>
                    </div>
                    {food.brand && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {food.brand}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    {importingId === food.fdcId ? (
                      <Spinner />
                    ) : (
                      <>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {Math.round(food.caloriesPer100g)} kcal
                        </p>
                        <p className="text-[10px] text-gray-400">
                          P {Math.round(food.proteinPer100g)}g · C {Math.round(food.carbsPer100g)}g · F {Math.round(food.fatPer100g)}g
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      {!debouncedQuery && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          {mode === 'saved'
            ? "Search for foods you've previously added by name."
            : 'Search restaurant, fast food, and branded nutrition data from USDA.'}
        </p>
      )}

      {mode === 'external' && debouncedQuery.length === 1 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
          Type at least 2 characters to search.
        </p>
      )}
    </div>
  );
}
