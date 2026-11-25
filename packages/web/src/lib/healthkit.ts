// Project-side facade for @macrotracker/healthkit. Centralises:
//   - platform gating (iOS only; all methods are no-ops elsewhere)
//   - the user's enabled/disabled setting, stored via @capacitor/preferences
//     so it survives app reinstalls on native and sits in localStorage on web
//   - defensive try/catch around every bridge call so a HealthKit failure
//     can never take down a food-log save or a dashboard render
//
// Everything a React component or service should know about HealthKit flows
// through here.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { HealthKit } from '@macrotracker/healthkit';

const ENABLED_KEY = 'healthkit.enabled';
const ADD_BURN_KEY = 'healthkit.addBurnToBudget';

export function isHealthKitAvailable(): boolean {
  // HealthKit only exists on iOS. Capacitor.getPlatform() returns 'ios' in
  // the native WKWebView, 'web' in a browser, 'android' on Android.
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export async function getHealthKitEnabled(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: ENABLED_KEY });
    return value === '1';
  } catch {
    return false;
  }
}

export async function setHealthKitEnabled(enabled: boolean): Promise<void> {
  try {
    await Preferences.set({ key: ENABLED_KEY, value: enabled ? '1' : '0' });
  } catch {
    // Preference storage unavailable (unlikely) — best effort only.
  }
}

/**
 * Prompt the user for HealthKit permissions and, if the system dialog
 * resolves without error, flip the enabled preference on. Returns true
 * only when both the permission call succeeded AND we stored the enabled
 * flag. iOS cannot tell us which specific permissions the user granted —
 * see the comment in HealthKitPlugin.swift — so "success" here just means
 * "the OS let us ask."
 */
export async function connectHealthKit(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;
  try {
    const { granted } = await HealthKit.requestPermissions();
    if (!granted) return false;
    await setHealthKitEnabled(true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Phase-2 preference: when true, the dashboard adds today's active-energy
 * kcal to the calorie target before computing the macro ring. Off by
 * default to preserve the display-only behaviour we shipped in Phase 1.
 * Only read when HealthKit is enabled; a true value with the integration
 * disabled is a no-op in the dashboard code.
 */
export async function getAddBurnToBudget(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: ADD_BURN_KEY });
    return value === '1';
  } catch {
    return false;
  }
}

export async function setAddBurnToBudget(enabled: boolean): Promise<void> {
  try {
    await Preferences.set({ key: ADD_BURN_KEY, value: enabled ? '1' : '0' });
  } catch {
    // Non-fatal.
  }
}

export async function disconnectHealthKit(): Promise<void> {
  // We can't revoke HealthKit permissions from code — iOS owns that — but we
  // can stop reading/writing. The user can fully revoke in Settings → Health.
  await setHealthKitEnabled(false);
}

/**
 * Today's ActiveEnergyBurned in kcal, or null if HealthKit isn't available
 * or the user hasn't enabled integration. Returning null rather than 0
 * lets the dashboard distinguish "no data" from "a true zero burn."
 */
export async function getTodayActiveEnergyKcal(): Promise<number | null> {
  if (!isHealthKitAvailable()) return null;
  if (!(await getHealthKitEnabled())) return null;
  try {
    const { kcal } = await HealthKit.getActiveEnergyToday();
    return Number.isFinite(kcal) ? Math.round(kcal) : 0;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget write of a single eating event. Callers should not await
 * this inside a critical path — HealthKit writes can take a few hundred ms
 * and should never block a food-log save from completing. Each nutrient is
 * optional; zero/missing values are dropped in Swift so the Health app
 * doesn't get polluted.
 */
export async function writeNutritionSample(input: {
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  timestamp?: Date;
}): Promise<void> {
  if (!isHealthKitAvailable()) return;
  if (!(await getHealthKitEnabled())) return;
  try {
    await HealthKit.writeNutrition({
      energyKcal: input.energyKcal,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      timestamp: input.timestamp
        ? Math.floor(input.timestamp.getTime() / 1000)
        : undefined,
    });
  } catch {
    // Non-fatal — the local log already saved.
  }
}
