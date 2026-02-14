//
//  TomoCheckoutManager.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Observation

@Observable
final class TomoCheckoutManager {
    var selectedAddress: TomoAddress? = TomoAddress.sampleHome()
    var selectedPayment: TomoPaymentMethod = .cash
    var selectedSlot: TomoDeliverySlot? = TomoDeliverySlot.defaults().first

    var availableSlots: [TomoDeliverySlot] = TomoDeliverySlot.defaults()
    var savedAddresses: [TomoAddress] = [TomoAddress.sampleHome()]

    func buildDraft(from cart: TomoCartManager) -> TomoOrderDraft {
        let items = cart.items.map {
            TomoCartItemSnapshot(
                id: $0.id,
                productId: $0.product.id,
                name: $0.product.nameAr,        // اربطها مع اللغة لاحقاً
                unit: $0.product.unit,
                price: $0.product.price,
                currency: $0.product.currency,
                quantity: $0.quantity
            )
        }

        let subtotal = cart.subtotal
        let fee = selectedSlot?.fee ?? 0
        let total = subtotal + fee

        return TomoOrderDraft(
            id: UUID().uuidString,
            items: items,
            address: selectedAddress,
            payment: selectedPayment,
            deliverySlot: selectedSlot,
            subtotal: subtotal,
            deliveryFee: fee,
            total: total
        )
    }

    func canPlaceOrder(cart: TomoCartManager) -> Bool {
        !cart.items.isEmpty && selectedAddress != nil && selectedSlot != nil
    }
}
