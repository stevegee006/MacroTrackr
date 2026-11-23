'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isNativeScannerAvailable, scanBarcodeNative } from '@/lib/barcode-scanner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // On native (Capacitor iOS/Android) render a simple button that launches the
  // fullscreen MLKit scanner. The result comes back as a string and we pass it
  // straight to onScan. Keeps the inline html5-qrcode UI off native.
  if (isNativeScannerAvailable()) {
    return (
      <div className="space-y-4">
        <Button
          onClick={async () => {
            try {
              const code = await scanBarcodeNative();
              if (code) onScan(code);
            } catch (err: any) {
              onError?.(err?.message ?? 'Scanner failed');
            }
          }}
          variant="secondary"
          className="w-full"
        >
          <span className="inline-flex items-center gap-2">
            <ScanBarcode className="h-4 w-4" />
            Scan Barcode
          </span>
        </Button>
      </div>
    );
  }

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
        {isScanning ? (
          'Stop Scanner'
        ) : (
          <span className="inline-flex items-center gap-2">
            <ScanBarcode className="h-4 w-4" />
            Scan Barcode
          </span>
        )}
      </Button>
    </div>
  );
}
