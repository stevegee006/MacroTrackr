'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { LabelScanner } from '@/components/scanner/LabelScanner';
import { ManualBarcodeEntry } from '@/components/scanner/ManualBarcodeEntry';
import { ManualFoodForm } from '@/components/food/ManualFoodForm';
import { AIFoodEstimateForm } from '@/components/food/AIFoodEstimateForm';
import { FoodSearchForm } from '@/components/food/FoodSearchForm';
import { NutritionLabel } from '@/components/food/NutritionLabel';
import { AddToLogForm } from '@/components/food/AddToLogForm';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { FoodItem } from '@macrotracker/shared';

type InputMethod = 'search' | 'barcode' | 'label' | 'manual' | 'estimate';

const TABS: { key: InputMethod; label: string }[] = [
  { key: 'search', label: 'Search' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'label', label: 'Label' },
  { key: 'manual', label: 'Manual' },
  { key: 'estimate', label: 'AI Estimate' },
];

export default function ScanPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') ?? undefined;
  const [method, setMethod] = useState<InputMethod>('search');
  const [scannedFood, setScannedFood] = useState<FoodItem | null>(null);
  const [added, setAdded] = useState(false);

  const lookup = useMutation({
    mutationFn: (barcode: string) =>
      apiFetch<{ data: FoodItem }>(`/food/barcode/${barcode}`),
    onSuccess: (res) => {
      setScannedFood(res.data);
      setAdded(false);
    },
  });

  function handleScan(barcode: string) {
    lookup.mutate(barcode);
  }

  function handleFoodResult(food: FoodItem) {
    setScannedFood(food);
    setAdded(false);
  }

  function resetState() {
    setScannedFood(null);
    setAdded(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Add Food</h1>

      {/* Tab selector */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMethod(tab.key); resetState(); }}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              method === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {method === 'search' && !scannedFood && (
        <FoodSearchForm onResult={handleFoodResult} />
      )}

      {method === 'barcode' && !scannedFood && (
        <div className="space-y-4">
          <BarcodeScanner onScan={handleScan} />

          <div className="relative flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">or enter manually</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <ManualBarcodeEntry onSubmit={handleScan} />
        </div>
      )}

      {method === 'label' && !scannedFood && (
        <LabelScanner onResult={handleFoodResult} />
      )}

      {method === 'manual' && !scannedFood && (
        <ManualFoodForm onResult={handleFoodResult} />
      )}

      {method === 'estimate' && !scannedFood && (
        <AIFoodEstimateForm onResult={handleFoodResult} />
      )}

      {/* Loading state (barcode lookup) */}
      {lookup.isPending && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {lookup.isError && (
        <Card className="bg-red-50 dark:bg-red-950 text-red-700">
          <p className="text-sm">
            {(lookup.error as any)?.message || 'Product not found. Try a different barcode.'}
          </p>
        </Card>
      )}

      {/* Result area — shown for all input methods */}
      {scannedFood && !added && (
        <div className="space-y-4">
          <NutritionLabel food={scannedFood} onUpdated={(updated) => setScannedFood(updated)} />

          {/* Allow label rescan for barcode/label methods */}
          {(method === 'barcode' || method === 'label') && (
            <LabelScanner
              existingFoodId={scannedFood.id}
              onResult={(updated) => setScannedFood(updated)}
            />
          )}

          <AddToLogForm food={scannedFood} logDate={dateParam} onSuccess={() => setAdded(true)} />
        </div>
      )}

      {added && (
        <Card className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 text-center">
          <p className="font-medium">Added to your food log!</p>
          <button
            onClick={resetState}
            className="mt-2 text-sm underline"
          >
            Add another
          </button>
        </Card>
      )}
    </div>
  );
}
