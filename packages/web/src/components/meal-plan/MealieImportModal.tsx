'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { X, Search, ChefHat } from 'lucide-react';

interface MealieImportModalProps {
  onClose: () => void;
  onImport: (meal: any) => void;
}

export function MealieImportModal({ onClose, onImport }: MealieImportModalProps) {
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [mealType, setMealType] = useState('DINNER');

  const { data: recipes, isLoading, isError } = useQuery({
    queryKey: ['mealie-recipes', searchTerm],
    queryFn: () =>
      apiFetch<{ data: any[] }>(`/mealie/recipes?q=${encodeURIComponent(searchTerm)}`),
    enabled: searchTerm.length > 0,
  });

  const convertMutation = useMutation({
    mutationFn: (slug: string) =>
      apiFetch<{ data: any }>(`/mealie/recipes/${encodeURIComponent(slug)}/convert`, {
        method: 'POST',
        body: JSON.stringify({ mealType }),
      }),
    onSuccess: (result) => {
      onImport(result.data);
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(search.trim());
    setSelectedSlug(null);
  }

  function handleSelect(slug: string) {
    setSelectedSlug(slug);
  }

  function handleImport() {
    if (!selectedSlug) return;
    convertMutation.mutate(selectedSlug);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold">Import from Mealie</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!search.trim()}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Meal type selector */}
        <div className="px-4 pt-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Import as meal type
          </label>
          <div className="flex gap-1.5">
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((mt) => (
              <button
                key={mt}
                onClick={() => setMealType(mt)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  mealType === mt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {mt.charAt(0) + mt.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-600 text-center py-4">
              Failed to search Mealie recipes. Check your Mealie configuration in Settings.
            </p>
          )}

          {!searchTerm && !isLoading && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              Search for a recipe to import.
            </p>
          )}

          {searchTerm && !isLoading && recipes?.data?.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
              No recipes found for &quot;{searchTerm}&quot;.
            </p>
          )}

          {recipes?.data?.map((recipe: any) => (
            <button
              key={recipe.slug || recipe.id}
              onClick={() => handleSelect(recipe.slug)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedSlug === recipe.slug
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <p className="text-sm font-medium">{recipe.name}</p>
              {recipe.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {recipe.description}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedSlug}
            isLoading={convertMutation.isPending}
            className="flex-1"
          >
            Import Recipe
          </Button>
        </div>

        {convertMutation.isError && (
          <p className="px-4 pb-3 text-xs text-red-600">
            {(convertMutation.error as any)?.message || 'Failed to import recipe'}
          </p>
        )}
      </div>
    </div>
  );
}
