// Minimal HealthKit surface exposed to the web layer. The Swift
// implementation lives in ios/Plugin/HealthKitPlugin.swift and registers
// under the JS name "HealthKit" (see the CAP_PLUGIN macro in
// HealthKitPlugin.m). All methods resolve synchronously on non-iOS targets
// via Capacitor's web-fallback shim, but they do nothing useful there.

export interface HealthKitPlugin {
  /**
   * Prompt iOS for read access to ActiveEnergyBurned and write access to
   * the four dietary sample types (energy, protein, carbs, fat). Returns
   * { granted: true } once the system dialog has been dismissed, whether
   * the user allowed anything or not — HealthKit cannot tell apps which
   * permissions were actually granted. The only way to verify read access
   * is to try reading and see if the result is empty.
   */
  requestPermissions(): Promise<{ granted: boolean }>;

  /**
   * Sum of ActiveEnergyBurned samples from local midnight to now, in
   * kilocalories. Returns 0 if nothing is recorded or if read access was
   * denied (HealthKit silently returns empty results in that case).
   */
  getActiveEnergyToday(): Promise<{ kcal: number }>;

  /**
   * Write up to four HKQuantitySamples for a single eating event. Any field
   * whose value is 0 or missing is skipped — pass only the nutrients the
   * caller actually has values for. `timestamp` is epoch seconds; defaults
   * to now when omitted. The write uses the timestamp for both start and
   * end, so it shows up as an instantaneous meal in the Health app.
   */
  writeNutrition(options: {
    energyKcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    timestamp?: number;
  }): Promise<void>;
}
