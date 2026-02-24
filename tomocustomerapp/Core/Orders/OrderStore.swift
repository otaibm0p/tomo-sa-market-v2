import Foundation
import Combine

@MainActor
final class OrderStore: ObservableObject {
    @Published var orders: [OrderModel] = []

    init() {}

    func seedMockIfNeeded() {
        guard orders.isEmpty else { return }
        // Safe: no try! or forced unwrapping
        orders = [
            OrderModel(
                id: "TOMO-1001",
                createdAt: Date().addingTimeInterval(-1800),
                status: .preparing,
                itemsCount: 6,
                total: 42.50,
                deliveryFee: 9.00,
                addressLabel: "الدمام - حي الشعلة",
                etaMinutes: 18
            )
        ]
    }
    
    func createOrderFromDraft(_ draft: TomoOrderDraft) -> OrderModel {
        let newOrder = OrderModel(
            id: "TOMO-\(Int.random(in: 1002...9999))",
            createdAt: Date(),
            status: .placed,
            itemsCount: draft.items.reduce(0) { $0 + $1.quantity },
            total: draft.subtotal,
            deliveryFee: draft.deliveryFee,
            addressLabel: draft.address?.label ?? "—",
            etaMinutes: 25
        )
        orders.insert(newOrder, at: 0)
        return newOrder
    }
}
