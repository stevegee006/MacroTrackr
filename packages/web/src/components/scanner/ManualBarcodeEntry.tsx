'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ManualBarcodeEntryProps {
  onSubmit: (barcode: string) => void;
}

export function ManualBarcodeEntry({ onSubmit }: ManualBarcodeEntryProps) {
  const [barcode, setBarcode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (barcode.trim()) {
      onSubmit(barcode.trim());
      setBarcode('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        placeholder="Enter barcode number"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        className="flex-1"
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <Button type="submit" variant="secondary" disabled={!barcode.trim()}>
        Look Up
      </Button>
    </form>
  );
}
