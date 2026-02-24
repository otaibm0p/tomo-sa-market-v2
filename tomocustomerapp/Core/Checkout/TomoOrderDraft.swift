//
//  TomoOrderDraft.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct TomoOrderDraft: Identifiable, Codable {
    let id: String
    let items: [TomoCartItemSnapshot]
    let address: TomoAddress?
    let payment: TomoPaymentMethod
    let deliverySlot: TomoDeliverySlot?
    let subtotal: Double
    let deliveryFee: Double
    let total: Double
    
    var currency: String {
        items.first?.currency ?? "SAR"
    }
    
    var totalText: String {
        "\(currency) \(String(format: "%.2f", total))"
    }
}
