#!/usr/bin/env node
// Patches the generated iOS project so our native dependencies (MLKit) work.
// Idempotent — safe to run after every `cap sync`.
//
// Changes applied:
// 1. Bump the Podfile's iOS platform target to 16.0 so GoogleMLKit 8.x can
//    resolve. Capacitor's default is 14.0 which is too low for MLKit >= 7.
// 2. Add NSCameraUsageDescription to Info.plist so the barcode scanner is
//    allowed to open the camera. Without this iOS silently blocks the request.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iosDir = resolve(__dirname, '..', 'ios', 'App');
const podfile = resolve(iosDir, 'Podfile');
const infoPlist = resolve(iosDir, 'App', 'Info.plist');

const CAMERA_USAGE = 'MacroTrackr uses the camera to scan food barcodes.';
// GoogleMLKit 8.x actually requires iOS 17+. 16 isn't enough — pod install
// fails with "Specs satisfying GoogleMLKit/BarcodeScanning (~> 8.0.0) were
// found, but they required a higher minimum deployment target."
const IOS_MIN = '17.0';

let changed = false;

// --- Podfile -----------------------------------------------------------------
if (existsSync(podfile)) {
  const before = readFileSync(podfile, 'utf8');
  const after = before.replace(
    /platform :ios, '[\d.]+'/,
    `platform :ios, '${IOS_MIN}'`,
  );
  if (after !== before) {
    writeFileSync(podfile, after);
    console.log(`  Podfile: platform :ios bumped to ${IOS_MIN}`);
    changed = true;
  }
} else {
  console.warn(`  [skip] ${podfile} does not exist — did you run \`cap add ios\`?`);
}

// --- Info.plist --------------------------------------------------------------
if (existsSync(infoPlist)) {
  let plist = readFileSync(infoPlist, 'utf8');
  if (!plist.includes('<key>NSCameraUsageDescription</key>')) {
    plist = plist.replace(
      /<\/dict>\s*<\/plist>\s*$/,
      `	<key>NSCameraUsageDescription</key>\n	<string>${CAMERA_USAGE}</string>\n</dict>\n</plist>\n`,
    );
    writeFileSync(infoPlist, plist);
    console.log('  Info.plist: NSCameraUsageDescription added');
    changed = true;
  }
} else {
  console.warn(`  [skip] ${infoPlist} does not exist — did you run \`cap add ios\`?`);
}

if (!changed) {
  console.log('  iOS project already configured — nothing to do.');
}
