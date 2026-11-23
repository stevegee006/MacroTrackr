// Barcode scanning abstraction.
//
// On native (Capacitor iOS/Android) uses @capacitor-mlkit/barcode-scanning,
// which shows a fast, full-screen native scanner with a reticle and torch.
// On web, callers fall back to the inline html5-qrcode flow in BarcodeScanner.tsx.
//
// scanBarcodeNative() resolves with the decoded string, or null if the user
// cancelled / the scanner closed without a hit. It throws if permission was
// denied or Google ML Kit's on-device barcode module can't be installed.

import { Capacitor } from '@capacitor/core';

export function isNativeScannerAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function scanBarcodeNative(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Native scanner is only available on iOS/Android');
  }

  const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');

  // Make sure the Google ML Kit module is installed on-device. On iOS the
  // framework ships with the app; on Android it is downloaded on first use.
  // isGoogleBarcodeScannerModuleAvailable + installGoogleBarcodeScannerModule
  // are Android-only and no-op on iOS.
  const moduleCheck = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().catch(() => ({ available: true }));
  if (!moduleCheck.available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  // Ask for camera permission if we don't have it yet.
  const perm = await BarcodeScanner.checkPermissions();
  if (perm.camera !== 'granted' && perm.camera !== 'limited') {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== 'granted' && requested.camera !== 'limited') {
      throw new Error('Camera permission denied');
    }
  }

  // Launch the full-screen scanner. Returning zero barcodes means the user
  // closed it; otherwise we take the first hit.
  const { barcodes } = await BarcodeScanner.scan({
    formats: [
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
      BarcodeFormat.UpcA,
      BarcodeFormat.UpcE,
      BarcodeFormat.Code128,
      BarcodeFormat.Code39,
      BarcodeFormat.QrCode,
    ],
  });

  if (!barcodes.length) return null;
  return barcodes[0].rawValue ?? null;
}
