#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift HealthKitPlugin with Capacitor's plugin registry via
// the classic CAP_PLUGIN macro. Pair this with setting identifier / jsName
// / pluginMethods inside the Swift class's init() — not as `let` properties,
// which collide with CAPPlugin's @objc public var declarations and trip
// override-related compile errors.

CAP_PLUGIN(HealthKitPlugin, "HealthKit",
    CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getActiveEnergyToday, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(writeNutrition, CAPPluginReturnPromise);
)
