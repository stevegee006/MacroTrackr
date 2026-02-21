'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Camera, X } from 'lucide-react';
import type { FoodItem } from '@macrotracker/shared';

interface LabelScannerProps {
  onResult: (food: FoodItem) => void;
  existingFoodId?: string;
}

export function LabelScanner({ onResult, existingFoodId }: LabelScannerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: (image: string) => {
      const url = existingFoodId
        ? `/food/${existingFoodId}/scan-label`
        : '/food/scan-label';
      return apiFetch<{ data: FoodItem }>(url, {
        method: 'POST',
        body: JSON.stringify({ image }),
      });
    },
    onSuccess: (res) => {
      onResult(res.data);
      clearPhoto();
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageBase64(null);
  }

  const buttonLabel = existingFoodId ? 'Rescan with Label Photo' : 'Scan Nutrition Label';
  const extractLabel = existingFoodId ? 'Update from Label' : 'Extract Nutrition';

  if (preview && imageBase64) {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Label Photo</h3>
          <button
            onClick={clearPhoto}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            disabled={scanMutation.isPending}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <img
          src={preview}
          alt="Nutrition label"
          className="w-full max-h-64 object-contain rounded-lg bg-gray-50 dark:bg-gray-800"
        />

        {scanMutation.isPending ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <Spinner />
            <span className="text-sm text-gray-500 dark:text-gray-400">Analyzing label with AI...</span>
          </div>
        ) : (
          <Button
            onClick={() => scanMutation.mutate(imageBase64)}
            className="w-full"
          >
            {extractLabel}
          </Button>
        )}

        {scanMutation.isError && (
          <p className="text-sm text-red-600">
            {(scanMutation.error as any)?.message || 'Failed to analyze label. Try a clearer photo.'}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2"
      >
        <Camera className="h-4 w-4" />
        {buttonLabel}
      </Button>
    </div>
  );
}
