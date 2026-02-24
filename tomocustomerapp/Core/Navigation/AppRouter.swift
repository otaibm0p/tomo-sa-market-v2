import SwiftUI
import Combine
import Foundation

enum AppRoute: Hashable {
    case category(AdminCategory)
    case product(AdminProduct)
    case checkout
    case orderDetails(OrderModel)
    
    // مفتاح ثابت للـ hashing بدون الاعتماد على Hashable التلقائي للـ associated values
    private var key: String {
        switch self {
        case .category(let c): return "category:\(c.id)"
        case .product(let p): return "product:\(p.id)"
        case .checkout: return "checkout"
        case .orderDetails(let o): return "orderDetails:\(o.id)"
        }
    }
    
    static func == (lhs: AppRoute, rhs: AppRoute) -> Bool {
        lhs.key == rhs.key
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(key)
    }
}

final class AppRouter: ObservableObject {
    // نعرّف publisher صراحة لتفادي أي مشاكل توليد تلقائي
    let objectWillChange = ObservableObjectPublisher()

    @Published var path: [AppRoute] = [] {
        willSet { objectWillChange.send() }
    }

    func push(_ route: AppRoute) { path.append(route) }
    func pop() { _ = path.popLast() }
    func popToRoot() { path.removeAll() }
    func resetToRoot() { path.removeAll() }
    func reset() { path.removeAll() }
}
