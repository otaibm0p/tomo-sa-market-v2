//
//  PaymentModels.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

enum PaymentMethodKind: String, CaseIterable, Identifiable, Codable {
    case applePay = "Apple Pay"
    case card = "Card"
    case cash = "Cash"

    var id: String { rawValue }
}

struct SavedCard: Identifiable, Hashable, Codable {
    let id: String
    let brand: String        // "Visa", "Mastercard"
    let last4: String        // "1234"
    let expiry: String       // "12/28"
    let holder: String       // "TOMO CUSTOMER"
}

struct SelectedPayment: Hashable {
    var kind: PaymentMethodKind
    var cardId: String? // if kind == .card
}
