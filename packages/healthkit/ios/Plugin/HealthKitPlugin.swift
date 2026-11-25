import Foundation
import Capacitor
import HealthKit

// Minimal HealthKit bridge for MacroTrackr. Classic Capacitor plugin
// shape: a Swift CAPPlugin subclass that declares only its @objc methods,
// with ALL registration delegated to the CAP_PLUGIN macro in
// HealthKitPlugin.m. Every attempt to declare identifier / jsName /
// pluginMethods in Swift — as `let` properties, computed overrides, or
// init assignments — tripped "overriding declaration" errors on this
// Capacitor-8 pod version, so the Swift side owns no registration surface.
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
    // No property or init overrides. All plugin registration (name, JS
    // name, method table) is handled by the CAP_PLUGIN macro in
    // HealthKitPlugin.m. This is the classic Capacitor plugin shape that
    // has worked unchanged across Capacitor 2 through 8 — the moment this
    // class tries to override anything CAPPlugin owns, the installed pod
    // version throws override-keyword errors we can't satisfy without
    // reading the base-class headers for this specific build.

    private let healthStore = HKHealthStore()

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
