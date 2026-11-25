import Foundation
import Capacitor
import HealthKit

// Minimal HealthKit bridge for MacroTrackr. Uses the classic Capacitor
// registration pattern: Swift class extends CAPPlugin and sets identifier
// / jsName / pluginMethods inside init(); registration happens through the
// CAP_PLUGIN macro in HealthKitPlugin.m. The newer Capacitor 8
// CAPBridgedPlugin protocol + `public let` property pattern looked cleaner
// but collided with CAPPlugin's base-class @objc var declarations in the
// installed pod version, producing "overriding declaration requires an
// 'override' keyword" errors on every one of the properties. Setting them
// in init() mutates the inherited stored properties instead of redeclaring
// them, which sidesteps the whole class of override errors.
//
// Exposes three methods to JS:
//   - requestPermissions()      → prompts for the exact types we use
//   - getActiveEnergyToday()    → cumulative ActiveEnergyBurned, local-day
//   - writeNutrition(...)       → up to 4 dietary HKQuantitySamples
//
// All callbacks hop to .main before touching call.resolve/reject so the
// Capacitor plugin call completes on the JS thread's expectations. If the
// device has no HealthKit (iPad with no Health app on some SKUs, simulator
// in rare cases), isHealthDataAvailable() is false and we resolve with an
// explicit { granted: false } rather than throwing.

@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin {
    // Set identifier / jsName / pluginMethods in init() rather than as
    // `public let` properties. CAPPlugin's installed Capacitor-8 version
    // declares these as `@objc public var` on the base class, so `let`
    // overrides trip "Overriding declaration requires 'override' keyword"
    // and "Overriding instance method must be as accessible as its
    // enclosing type." Assigning in init sidesteps both by mutating the
    // inherited stored properties instead of redeclaring them.

    private let healthStore = HKHealthStore()

    public override init() {
        super.init()
        self.identifier = "HealthKitPlugin"
        self.jsName = "HealthKit"
        self.pluginMethods = [
            CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "getActiveEnergyToday", returnType: CAPPluginReturnPromise),
            CAPPluginMethod(name: "writeNutrition", returnType: CAPPluginReturnPromise),
        ]
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false])
            return
        }

        var readTypes = Set<HKObjectType>()
        if let t = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            readTypes.insert(t)
        }

        var writeTypes = Set<HKSampleType>()
        for id in [
            HKQuantityTypeIdentifier.dietaryEnergyConsumed,
            .dietaryProtein,
            .dietaryCarbohydrates,
            .dietaryFatTotal,
        ] {
            if let t = HKObjectType.quantityType(forIdentifier: id) {
                writeTypes.insert(t)
            }
        }

        healthStore.requestAuthorization(toShare: writeTypes, read: readTypes) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                call.resolve(["granted": success])
            }
        }
    }

    @objc func getActiveEnergyToday(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let type = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            call.resolve(["kcal": 0])
            return
        }

        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)

        let query = HKStatisticsQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, stats, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                let kcal = stats?.sumQuantity()?.doubleValue(for: HKUnit.kilocalorie()) ?? 0
                call.resolve(["kcal": kcal])
            }
        }
        healthStore.execute(query)
    }

    @objc func writeNutrition(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve()
            return
        }

        let timestamp = call.getDouble("timestamp") ?? Date().timeIntervalSince1970
        let date = Date(timeIntervalSince1970: timestamp)

        var samples: [HKQuantitySample] = []

        // Each entry: (JS key, HK identifier, HK unit). We only create a
        // sample if the JS value is > 0 — passing a zero-valued macro to
        // HealthKit pollutes the Health app with useless entries.
        let fields: [(String, HKQuantityTypeIdentifier, HKUnit)] = [
            ("energyKcal", .dietaryEnergyConsumed, HKUnit.kilocalorie()),
            ("proteinG", .dietaryProtein, HKUnit.gram()),
            ("carbsG", .dietaryCarbohydrates, HKUnit.gram()),
            ("fatG", .dietaryFatTotal, HKUnit.gram()),
        ]

        for (key, id, unit) in fields {
            let value = call.getDouble(key) ?? 0
            if value <= 0 { continue }
            guard let type = HKObjectType.quantityType(forIdentifier: id) else { continue }
            let quantity = HKQuantity(unit: unit, doubleValue: value)
            samples.append(HKQuantitySample(type: type, quantity: quantity, start: date, end: date))
        }

        if samples.isEmpty {
            call.resolve()
            return
        }

        healthStore.save(samples) { success, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                if !success {
                    call.reject("Failed to save nutrition samples")
                    return
                }
                call.resolve()
            }
        }
    }
}
