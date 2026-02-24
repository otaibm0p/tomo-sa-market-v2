//
//  TomoDeliverySlot.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct TomoDeliverySlot: Identifiable, Equatable, Codable {
    let id: String
    let title: String
    let etaMinutes: Int
    
    init(id: String = UUID().uuidString, title: String, etaMinutes: Int) {
        self.id = id
        self.title = title
        self.etaMinutes = etaMinutes
    }
    
    var fee: Double {
        // Mock fee calculation based on ETA
        switch etaMinutes {
        case 0..<60: return 15.0
        case 60..<120: return 10.0
        case 120..<1440: return 5.0
        default: return 0.0
        }
    }
    
    static func defaults() -> [TomoDeliverySlot] {
        [
            TomoDeliverySlot(title: "الآن (30 دقيقة)", etaMinutes: 30),
            TomoDeliverySlot(title: "بعد ساعة", etaMinutes: 60),
            TomoDeliverySlot(title: "بعد ساعتين", etaMinutes: 120),
            TomoDeliverySlot(title: "غداً صباحاً", etaMinutes: 1440)
        ]
    }
}
