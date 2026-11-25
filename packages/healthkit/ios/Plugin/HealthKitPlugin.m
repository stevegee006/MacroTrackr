#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift HealthKitPlugin with Capacitor's plugin registry.
// Without this macro expansion, Capacitor can't find the Swift class by
// name at runtime. The JS-facing name here ("HealthKit") must match
// registerPlugin<HealthKitPlugin>('HealthKit') in src/index.ts.

CAP_PLUGIN(HealthKitPlugin, "HealthKit",
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getActiveEnergyToday, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(writeNutrition, CAPPluginReturnPromise);
)
