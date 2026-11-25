import { registerPlugin } from '@capacitor/core';
import type { HealthKitPlugin } from './definitions';

const HealthKit = registerPlugin<HealthKitPlugin>('HealthKit');

export * from './definitions';
export { HealthKit };
