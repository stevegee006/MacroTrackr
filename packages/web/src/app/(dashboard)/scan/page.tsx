'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { LabelScanner } from '@/components/scanner/LabelScanner';
import { ManualBarcodeEntry } from '@/components/scanner/ManualBarcodeEntry';
import { NutritionLabel } from '@/components/food/NutritionLabel';
import { AddToLogForm } from '@/components/food/AddToLogForm';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import type { FoodItem } from '@macrotracker/shared';

export default function ScanPage() {
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Scan Food</h1>

      <BarcodeScanner onScan={handleScan} />

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">or scan a label</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <LabelScanner
        onResult={(food) => {
          setScannedFood(food);
          setAdded(false);
        }}
      />

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">or enter barcode manually</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <ManualBarcodeEntry onSubmit={handleScan} />

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

      {scannedFood && !added && (
        <div className="space-y-4">
          <NutritionLabel food={scannedFood} onUpdated={(updated) => setScannedFood(updated)} />
          <LabelScanner
            existingFoodId={scannedFood.id}
            onResult={(updated) => setScannedFood(updated)}
          />
          <AddToLogForm food={scannedFood} onSuccess={() => setAdded(true)} />
        </div>
      )}

      {added && (
        <Card className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 text-center">
          <p className="font-medium">Added to your food log!</p>
          <button
            onClick={() => {
              setScannedFood(null);
              setAdded(false);
            }}
            className="mt-2 text-sm underline"
          >
            Scan another
          </button>
        </Card>
      )}
    </div>
  );
}
