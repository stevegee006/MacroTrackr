// Barcode scanning abstraction.
//
// On native (Capacitor iOS/Android) we use @capacitor-mlkit/barcode-scanning's
// startScan() API, not scan(). Earlier builds used scan() because it provides
// its own native UI, but on iOS v7.5 scan() reliably fails: the modal view
// controller presents (reticle visible) but AVCaptureVideoPreviewLayer never
// renders the camera feed — the user just sees a reticle on black. The native
// logs show `Fig err=-12710` right after the scan() call, then TensorFlow Lite
// initializes, then the scan auto-cancels.
//
// startScan() is a different code path: the plugin attaches the preview layer
// to a native UIView BEHIND the WKWebView and emits barcodeScanned events
// through the Capacitor bridge. We make the webview transparent and render our
// own close-button + reticle overlay as HTML, so the camera feed is visible
// edge-to-edge behind our UI. More code, but it actually works.
//
// On web, callers fall back to the inline html5-qrcode flow in BarcodeScanner.tsx.
//
// scanBarcodeNative() resolves with the decoded string, or null if the user
// cancelled / the scanner closed without a hit. It throws if permission was
// denied.

import { Capacitor } from '@capacitor/core';

export function isNativeScannerAvailable(): boolean {
  // Intentionally returning false: on iOS 26 @capacitor-mlkit/barcode-scanning
  // fails to open an AVCaptureSession (Fig err=-12710 on both scan() and
  // startScan()), leaving the user staring at a frozen reticle. Rather than
  // chase the native plugin, we let every platform fall through to the
  // html5-qrcode path in BarcodeScanner.tsx, which uses WKWebView's
  // getUserMedia — iOS 14.3+ supports it and NSCameraUsageDescription is
  // already in Info.plist for the native permission prompt.
  //
  // To re-enable the native MLKit scanner later, flip this back to
  // `Capacitor.isNativePlatform()`.
  void Capacitor;
  return false;
}

const OVERLAY_ID = 'native-scanner-overlay';

function mountOverlay(onClose: () => void): void {
  // Idempotent — remove any stale overlay before mounting a new one.
  document.getElementById(OVERLAY_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <button class="ns-close" aria-label="Close scanner" type="button">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    <div class="ns-frame" aria-hidden="true"></div>
    <div class="ns-hint">Point the camera at a barcode</div>
  `;
  overlay.querySelector('.ns-close')?.addEventListener('click', onClose);
  document.body.appendChild(overlay);

  // Toggling these classes on <html> + <body> makes the WKWebView fully
  // transparent so the camera preview layer underneath becomes visible.
  // Styles are defined in globals.css.
  document.documentElement.classList.add('scanner-active');
  document.body.classList.add('scanner-active');
}

function unmountOverlay(): void {
  document.documentElement.classList.remove('scanner-active');
  document.body.classList.remove('scanner-active');
  document.getElementById(OVERLAY_ID)?.remove();
}

export async function scanBarcodeNative(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Native scanner is only available on iOS/Android');
  }

  const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');

  // Ask for camera permission if we don't have it yet.
  const perm = await BarcodeScanner.checkPermissions();
  if (perm.camera !== 'granted' && perm.camera !== 'limited') {
    const requested = await BarcodeScanner.requestPermissions();
    if (requested.camera !== 'granted' && requested.camera !== 'limited') {
      throw new Error('Camera permission denied');
    }
  }

  return new Promise<string | null>((resolve, reject) => {
    let listener: { remove: () => Promise<void> } | null = null;
    let settled = false;

    const cleanup = async () => {
      try {
        await listener?.remove();
      } catch {}
      try {
        await BarcodeScanner.stopScan();
      } catch {}
      unmountOverlay();
    };

    const finish = async (value: string | null) => {
      if (settled) return;
      settled = true;
      await cleanup();
      resolve(value);
    };

    const fail = async (err: unknown) => {
      if (settled) return;
      settled = true;
      await cleanup();
      reject(err);
    };

    (async () => {
      try {
        mountOverlay(() => void finish(null));

        listener = await BarcodeScanner.addListener('barcodesScanned', (event) => {
          // The event payload holds `barcodes: Barcode[]`. Any non-empty
          // rawValue wins — we only need the first hit to resolve.
          const value = event?.barcodes?.find((b) => b?.rawValue)?.rawValue ?? null;
          if (value) void finish(value);
        });

        await BarcodeScanner.startScan({
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
      } catch (err) {
        void fail(err);
      }
    })();
  });
}
