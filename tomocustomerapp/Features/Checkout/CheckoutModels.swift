//
//  CheckoutModels.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

enum PaymentMethod: String, CaseIterable, Identifiable {
    case card = "Card"
    case cash = "Cash"
    case applePay = "Apple Pay" // placeholder for later

    var id: String { rawValue }
}

struct CheckoutAddress: Equatable {
    var label: String = "Home"
    var city: String = "Dammam"
    var district: String = ""
    var street: String = ""
    var building: String = ""
    var notes: String = ""
}

struct DeliverySlot: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let etaMinutes: Int
}

struct OrderDraft {
    var address: CheckoutAddress
    var slot: DeliverySlot?
    var payment: PaymentMethod = .card
}
