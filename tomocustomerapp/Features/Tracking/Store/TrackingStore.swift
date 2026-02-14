//
//  TrackingStore.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Combine

struct GeoPoint: Equatable {
    var lat: Double
    var lon: Double
}

final class TrackingStore: ObservableObject {

    // نقاط افتراضية (الدمام تقريباً) — عدلها لاحقاً حسب الطلب
    @Published var store: GeoPoint = .init(lat: 26.4207, lon: 50.0888)
    @Published var customer: GeoPoint = .init(lat: 26.3927, lon: 50.0970)
    @Published var driver: GeoPoint = .init(lat: 26.4350, lon: 50.0850)

    @Published var etaMinutes: Int = 18
    @Published var driverName: String = "TOMO Driver"
    @Published var driverPhoneMasked: String = "+966 ••• •• 1234"

    private var timer: AnyCancellable?
    private var realtime: RealtimeClient

    init(realtime: RealtimeClient = StubRealtimeClient()) {
        self.realtime = realtime
    }

    func start(orderId: UUID) {
        realtime.connect(orderId: orderId)
        realtime.onDriverLocation = { [weak self] lat, lon in
            self?.driver = .init(lat: lat, lon: lon)
        }

        // ✅ Simulated movement الآن (لين نوصل Realtime فعلي)
        startSimulation()
    }

    func stop() {
        realtime.disconnect()
        timer?.cancel()
        timer = nil
    }

    private func startSimulation() {
        timer?.cancel()

        timer = Timer.publish(every: 1.2, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self else { return }

                // move driver toward customer
                let step = 0.08 // 8% each tick
                let newLat = driver.lat + (customer.lat - driver.lat) * step
                let newLon = driver.lon + (customer.lon - driver.lon) * step

                driver = .init(lat: newLat, lon: newLon)

                // ETA decrease
                if etaMinutes > 1 { etaMinutes -= 1 }

                // stop near destination
                let dist = hypot(customer.lat - driver.lat, customer.lon - driver.lon)
                if dist < 0.0025 { // ~ قريب جداً
                    etaMinutes = 0
                    timer?.cancel()
                    timer = nil
                }
            }
    }
}
