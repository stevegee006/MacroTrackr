'use client';

import { Capacitor } from '@capacitor/core';

// The dark-mode emerald glow at the top of every page. Pure decoration — a
// 384x384 blurred circle at 5% opacity centered horizontally and ~160px above
// the viewport top. Nice subtle ambiance in a web browser, but on iOS WKWebView
// the combination of filter: blur() and position: fixed renders as a diffuse
// lighter band across the top of the screen that's especially visible after a
// native modal (e.g. the MLKit camera) closes and re-triggers the compositor.
//
// Skip it entirely in native. The dark #030712 background is clean on its own.
export function BackgroundDecoration() {
  if (Capacitor.isNativePlatform()) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden dark:block">
      <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
    </div>
  );
}
