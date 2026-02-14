//
//  PaymentStore.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Combine

final class PaymentStore: ObservableObject {

    @Published var selected: SelectedPayment = .init(kind: .applePay, cardId: nil)

    // Mock saved cards
    @Published var savedCards: [SavedCard] = [
        .init(id: "c1", brand: "Visa", last4: "4242", expiry: "12/28", holder: "TOMO CUSTOMER"),
        .init(id: "c2", brand: "Mastercard", last4: "4444", expiry: "10/27", holder: "TOMO CUSTOMER")
    ]

    func selectApplePay() {
        selected = .init(kind: .applePay, cardId: nil)
    }

    func selectCash() {
        selected = .init(kind: .cash, cardId: nil)
    }

    func selectCard(_ card: SavedCard) {
        selected = .init(kind: .card, cardId: card.id)
    }

    func selectedCard() -> SavedCard? {
        guard selected.kind == .card, let id = selected.cardId else { return nil }
        return savedCards.first(where: { $0.id == id })
    }

    func addMockCard() {
        let n = Int.random(in: 1000...9999)
        savedCards.insert(.init(id: UUID().uuidString, brand: "Visa", last4: "\(n)", expiry: "01/30", holder: "TOMO CUSTOMER"), at: 0)
    }
}
