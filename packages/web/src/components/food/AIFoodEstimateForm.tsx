'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Sparkles } from 'lucide-react';
import type { FoodItem } from '@macrotracker/shared';

interface AIFoodEstimateFormProps {
  onResult: (food: FoodItem) => void;
}

export function AIFoodEstimateForm({ onResult }: AIFoodEstimateFormProps) {
  const [description, setDescription] = useState('');
  const [weightG, setWeightG] = useState('');

  const estimateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: FoodItem }>('/food/estimate', {
        method: 'POST',
        body: JSON.stringify({
          description,
          weightG: parseFloat(weightG),
        }),
      }),
    onSuccess: (res) => {
      onResult(res.data);
      setDescription('');
      setWeightG('');
    },
  });

  const isValid = description.trim().length > 0 && parseFloat(weightG) > 0;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-semibold">AI Food Estimator</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Describe what you&apos;re eating and how much it weighs. AI will estimate the macros.
        Great for produce, meats, and non-prepackaged foods.
      </p>

      <Input
        label="Food description"
        placeholder="e.g., grilled chicken breast, banana, cooked brown rice"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <Input
        label="Weight (grams)"
        type="number"
        min={1}
        step={1}
        placeholder="e.g., 200"
        value={weightG}
        onChange={(e) => setWeightG(e.target.value)}
      />

      {estimateMutation.isPending ? (
        <div className="flex items-center justify-center gap-2 py-3">
          <Spinner />
          <span className="text-sm text-gray-500 dark:text-gray-400">Estimating nutrition with AI...</span>
        </div>
      ) : (
        <Button
          onClick={() => estimateMutation.mutate()}
          disabled={!isValid}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Estimate Macros
        </Button>
      )}

      {estimateMutation.isError && (
        <p className="text-sm text-red-600">
          {(estimateMutation.error as any)?.message || 'Failed to estimate nutrition. Try a more specific description.'}
        </p>
      )}
    </Card>
  );
}
