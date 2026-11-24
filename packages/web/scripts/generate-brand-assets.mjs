#!/usr/bin/env node
// Renders brand source PNGs from public/logo.svg into packages/web/assets/.
// These are the inputs @capacitor/assets consumes to generate every iOS icon
// size and the launch screen imageset. Re-run whenever logo.svg changes.
//
// What we output:
//   assets/icon.png            1024x1024, flame on brand-dark bg, safe margins
//   assets/icon-foreground.png 1024x1024, flame only on transparent (Android)
//   assets/icon-background.png 1024x1024, solid brand-dark (Android adaptive)
//   assets/splash.png          2732x2732, flame centered on brand-dark
//   assets/splash-dark.png     2732x2732, same (we're dark-first either way)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const assetsDir = resolve(root, 'assets');
// Use the tight-cropped flame SVG (viewBox 160 60 192 260) rather than the
// full logo.svg (viewBox 100 60 312 280) — the full-logo SVG has empty space
// to the left and right of the flame, which made the flame render tiny
// inside a square canvas even at large logoPx values.
const logoPath = resolve(root, 'public', 'logo-flame.svg');

const BRAND_BG = '#030712';

mkdirSync(assetsDir, { recursive: true });

const logoSvg = readFileSync(logoPath, 'utf8');

// The SVG's viewBox is "100 60 312 280". The flame itself sits roughly
// between x=210..302 and y=90..280 — i.e. the flame body is ~92 wide by ~190
// tall inside a 312x280 canvas. Rendering the whole SVG on a square canvas
// leaves wasted vertical space around the flame. We instead render the SVG
// to a target pixel size and composite the result centered on a solid
// brand-dark square, with margins tuned per surface.

/**
 * Render the logo SVG to a PNG buffer of the given pixel size (square).
 * The SVG's own viewBox defines the aspect, so we pass width only and let
 * sharp pick a matching height.
 */
async function renderLogo(targetPx) {
  // sharp handles SVG natively; density scales rasterization fidelity.
  // density=384 gives a clean raster at 1024 without blur even at 2732.
  return await sharp(Buffer.from(logoSvg), { density: 384 })
    .resize({ width: targetPx, fit: 'inside' })
    .png()
    .toBuffer();
}

async function compositeOnBg({ bgColor, canvasPx, logoPx, outPath }) {
  const logoBuffer = await renderLogo(logoPx);
  // Find the logo's actual rendered height so we can center it.
  const { height: logoHeight } = await sharp(logoBuffer).metadata();
  const canvas = sharp({
    create: {
      width: canvasPx,
      height: canvasPx,
      channels: 4,
      background: bgColor,
    },
  });
  const top = Math.round((canvasPx - (logoHeight ?? logoPx)) / 2);
  const left = Math.round((canvasPx - logoPx) / 2);
  const out = await canvas
    .composite([{ input: logoBuffer, top, left }])
    .png()
    .toBuffer();
  writeFileSync(outPath, out);
  console.log(`  wrote ${outPath} (${canvasPx}x${canvasPx})`);
}

async function compositeTransparent({ canvasPx, logoPx, outPath }) {
  const logoBuffer = await renderLogo(logoPx);
  const { height: logoHeight } = await sharp(logoBuffer).metadata();
  const canvas = sharp({
    create: {
      width: canvasPx,
      height: canvasPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const top = Math.round((canvasPx - (logoHeight ?? logoPx)) / 2);
  const left = Math.round((canvasPx - logoPx) / 2);
  const out = await canvas
    .composite([{ input: logoBuffer, top, left }])
    .png()
    .toBuffer();
  writeFileSync(outPath, out);
  console.log(`  wrote ${outPath} (${canvasPx}x${canvasPx})`);
}

async function solidBg({ canvasPx, outPath, color }) {
  const out = await sharp({
    create: {
      width: canvasPx,
      height: canvasPx,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer();
  writeFileSync(outPath, out);
  console.log(`  wrote ${outPath} (${canvasPx}x${canvasPx})`);
}

// --- Icon: flame on brand-dark. logoPx is the TARGET WIDTH of the flame SVG
// after rasterization; with the tight 192x260 viewBox the flame is roughly
// square-ish tall, so 560 width renders ~760 tall in a 1024 canvas, which
// gives nice ~75% vertical coverage with margins for iOS's rounded-corner
// crop. iOS icons have no transparency and get auto-rounded by iOS, so a
// solid edge-to-edge background is safest.
await compositeOnBg({
  bgColor: BRAND_BG,
  canvasPx: 1024,
  logoPx: 560,
  outPath: resolve(assetsDir, 'icon.png'),
});

// --- Android adaptive icon foreground + background (not used on iOS but
// @capacitor/assets expects them when it generates both platforms).
await compositeTransparent({
  canvasPx: 1024,
  logoPx: 480,
  outPath: resolve(assetsDir, 'icon-foreground.png'),
});
await solidBg({
  canvasPx: 1024,
  outPath: resolve(assetsDir, 'icon-background.png'),
  color: BRAND_BG,
});

// --- Splash: SOLID brand-dark, no flame. This is the native iOS launch
// screen image, shown from tap-open until the webview is ready to render.
// Putting the flame here makes the launch feel disjoint because the user
// sees a static flame BEFORE the AppSplash ignite animation starts — the
// animation then has nothing to "ignite" from. A solid dark field lets
// AppSplash provide the entire flame visual via its CSS animation, so the
// native launch reads as a brief dark pause before the app lights up.
await solidBg({
  canvasPx: 2732,
  outPath: resolve(assetsDir, 'splash.png'),
  color: BRAND_BG,
});
await solidBg({
  canvasPx: 2732,
  outPath: resolve(assetsDir, 'splash-dark.png'),
  color: BRAND_BG,
});

console.log('\n  brand assets ready. Next: npx capacitor-assets generate --ios');
