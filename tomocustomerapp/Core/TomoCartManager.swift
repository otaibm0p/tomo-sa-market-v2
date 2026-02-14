//
//  TomoCartManager.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation
import Combine

// MARK: - CartItem Model

struct CartItem: Identifiable, Equatable, Hashable {
    // Stable identity
    var id: String { product.id }

    // Store product directly (simple & works)
    let product: AdminProduct
    var quantity: Int

    // ✅ ONLY ONE initializer (no duplicates)
    init(product: AdminProduct, quantity: Int = 1) {
        self.product = product
        self.quantity = quantity
    }

    // ✅ Manual Equatable (because AdminProduct is not Equatable)
    static func == (lhs: CartItem, rhs: CartItem) -> Bool {
        lhs.id == rhs.id && lhs.quantity == rhs.quantity
    }

    // ✅ Manual Hashable (because AdminProduct is not Hashable)
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(quantity)
    }
}

// MARK: - TomoCartManager

@MainActor
final class TomoCartManager: ObservableObject {

    @Published private(set) var items: [CartItem] = []
    @Published var deliveryFee: Double = 0.0

    // MARK: - Totals
    
    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    var totalItems: Int {
        itemCount
    }

    var subtotal: Double {
        items.reduce(0) { $0 + ($1.product.price * Double($1.quantity)) }
    }

    var total: Double {
        subtotal + deliveryFee
    }

    var totalText: String {
        "SAR \(String(format: "%.2f", total))"
    }
    
    // ✅ Backward compatibility
    var subtotalText: String {
        "SAR " + String(format: "%.2f", subtotal)
    }

    // MARK: - Actions
    
    func quantity(for product: AdminProduct) -> Int {
        items.first(where: { $0.product.id == product.id })?.quantity ?? 0
    }

    func add(_ product: AdminProduct, qty: Int = 1) {
        guard qty > 0 else { return }
        if let idx = items.firstIndex(where: { $0.product.id == product.id }) {
            items[idx].quantity += qty
        } else {
            items.append(CartItem(product: product, quantity: qty))
        }
    }
    
    // ✅ Backward compatibility
    func add(product: AdminProduct, quantity: Int = 1) {
        add(product, qty: quantity)
    }
    
    func add(_ product: AdminProduct) {
        add(product, qty: 1)
    }

    func increase(_ item: CartItem) {
        guard let idx = items.firstIndex(where: { $0.product.id == item.product.id }) else { return }
        items[idx].quantity += 1
    }
    
    // ✅ Backward compatibility
    func increment(_ item: CartItem) {
        increase(item)
    }

    func decrease(_ item: CartItem) {
        guard let idx = items.firstIndex(where: { $0.product.id == item.product.id }) else { return }
        items[idx].quantity -= 1
        if items[idx].quantity <= 0 {
            items.remove(at: idx)
        }
    }
    
    // ✅ Backward compatibility
    func decrement(_ item: CartItem) {
        decrease(item)
    }

    func remove(_ item: CartItem) {
        items.removeAll { $0.product.id == item.product.id }
    }
    
    // ✅ Remove by AdminProduct
    func remove(_ product: AdminProduct) {
        guard let idx = items.firstIndex(where: { $0.product.id == product.id }) else { return }
        items[idx].quantity -= 1
        if items[idx].quantity <= 0 {
            items.remove(at: idx)
        }
    }
    
    // ✅ Remove one quantity (for ProductDetailsView)
    func removeOne(_ product: AdminProduct) {
        remove(product)
    }

    func removeItems(at offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }

    func clear() {
        items.removeAll()
    }
    
}

extension Array {
    mutating func remove(atOffsets offsets: IndexSet) {
        for index in offsets.sorted(by: >) {
            remove(at: index)
        }
    }
}
