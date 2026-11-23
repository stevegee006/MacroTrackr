#!/usr/bin/env node
// Patches the generated iOS project so our native dependencies (MLKit) work.
// Idempotent — safe to run after every `cap sync`.
//
// Changes applied:
// 1. Bump the Podfile's iOS platform target to IOS_MIN so GoogleMLKit can
//    resolve. Capacitor's default is 14.0 which is too low for MLKit >= 6.
// 2. Bump every IPHONEOS_DEPLOYMENT_TARGET in the Xcode pbxproj so the app
//    target matches the Podfile (Xcode would otherwise warn and fail to link).
// 3. Add NSCameraUsageDescription to Info.plist so the barcode scanner is
//    allowed to open the camera. Without this iOS silently blocks the request.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iosDir = resolve(__dirname, '..', 'ios', 'App');
const podfile = resolve(iosDir, 'Podfile');
const infoPlist = resolve(iosDir, 'App', 'Info.plist');
const pbxproj = resolve(iosDir, 'App.xcodeproj', 'project.pbxproj');

const CAMERA_USAGE = 'MacroTrackr uses the camera to scan food barcodes.';
// GoogleMLKit 7.x / 8.x transitive deps (MLKit* frameworks) advertise deployment
// targets that CocoaPods reports as too high even when the online podspecs
// claim 15.5. 17.0 is the empirical floor that gets pod install to succeed.
const IOS_MIN = '17.0';

let changed = false;

// --- Podfile -----------------------------------------------------------------
if (existsSync(podfile)) {
  const before = readFileSync(podfile, 'utf8');
  let after = before.replace(
    /platform :ios, '[\d.]+'/,
    `platform :ios, '${IOS_MIN}'`,
  );
  // If the Podfile doesn't have a platform line at all, add one at the top.
  if (!/platform :ios,/.test(after)) {
    after = `platform :ios, '${IOS_MIN}'\n` + after;
  }
  if (after !== before) {
    writeFileSync(podfile, after);
    console.log(`  Podfile: platform :ios set to ${IOS_MIN}`);
    changed = true;
  }
} else {
  console.warn(`  [skip] ${podfile} does not exist — did you run \`cap add ios\`?`);
}

// --- Xcode project (pbxproj) -------------------------------------------------
// Every build config in the pbxproj has an IPHONEOS_DEPLOYMENT_TARGET key.
// Bulk-replace them to IOS_MIN so Xcode and CocoaPods agree.
if (existsSync(pbxproj)) {
  const before = readFileSync(pbxproj, 'utf8');
  const after = before.replace(
    /IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;/g,
    `IPHONEOS_DEPLOYMENT_TARGET = ${IOS_MIN};`,
  );
  if (after !== before) {
    writeFileSync(pbxproj, after);
    console.log(`  pbxproj: IPHONEOS_DEPLOYMENT_TARGET bumped to ${IOS_MIN}`);
    changed = true;
  }
} else {
  console.warn(`  [skip] ${pbxproj} does not exist — did you run \`cap add ios\`?`);
}

// --- Info.plist --------------------------------------------------------------
// Entries we want to add if missing. Order matters only aesthetically.
const plistAdditions = [
  {
    key: 'NSCameraUsageDescription',
    value: `<string>${CAMERA_USAGE}</string>`,
  },
  {
    // Status bar text/icons should be white because the app's dark background
    // extends under the status bar (contentInset: 'never' in capacitor.config).
    key: 'UIStatusBarStyle',
    value: '<string>UIStatusBarStyleLightContent</string>',
  },
  {
    // Let Info.plist drive the status bar, not each view controller.
    key: 'UIViewControllerBasedStatusBarAppearance',
    value: '<false/>',
  },
];

if (existsSync(infoPlist)) {
  let plist = readFileSync(infoPlist, 'utf8');
  for (const { key, value } of plistAdditions) {
    if (!plist.includes(`<key>${key}</key>`)) {
      plist = plist.replace(
        /<\/dict>\s*<\/plist>\s*$/,
        `	<key>${key}</key>\n	${value}\n</dict>\n</plist>\n`,
      );
      console.log(`  Info.plist: ${key} added`);
      changed = true;
    }
  }
  writeFileSync(infoPlist, plist);
} else {
  console.warn(`  [skip] ${infoPlist} does not exist — did you run \`cap add ios\`?`);
}

if (!changed) {
  console.log('  iOS project already configured — nothing to do.');
}
