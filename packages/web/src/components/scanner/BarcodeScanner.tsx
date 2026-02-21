'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  async function startScanning() {
    if (!scannerRef.current) return;

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      const scanner = new Html5Qrcode('barcode-scanner', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Scan failure (frame without barcode) - ignore
        },
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      setHasPermission(false);
      onError?.(err.message || 'Failed to start camera');
    }
  }

  async function stopScanning() {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id="barcode-scanner"
        ref={scannerRef}
        className="overflow-hidden rounded-lg bg-black"
        style={{ minHeight: isScanning ? 300 : 0 }}
      />

      {hasPermission === false && (
        <p className="text-sm text-red-600">
          Camera permission denied. Please allow camera access in your browser settings.
        </p>
      )}

      <Button
        onClick={isScanning ? stopScanning : startScanning}
        variant="secondary"
        className="w-full"
      >
        {isScanning ? 'Stop Scanner' : 'Scan Barcode'}
      </Button>
    </div>
  );
}
