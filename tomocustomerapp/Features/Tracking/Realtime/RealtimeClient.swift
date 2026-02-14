//
//  RealtimeClient.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

// ✅ واجهة جاهزة للربط لاحقاً (WebSocket / SSE / MQTT)
protocol RealtimeClient {
    func connect(orderId: UUID)
    func disconnect()
    var onDriverLocation: ((Double, Double) -> Void)? { get set } // lat, lon
    var onOrderStatus: ((String) -> Void)? { get set }            // e.g. "onTheWay"
}

// ✅ Stub الآن (لا يتصل بشيء)
final class StubRealtimeClient: RealtimeClient {
    var onDriverLocation: ((Double, Double) -> Void)?
    var onOrderStatus: ((String) -> Void)?

    func connect(orderId: UUID) { /* later */ }
    func disconnect() { /* later */ }
}
