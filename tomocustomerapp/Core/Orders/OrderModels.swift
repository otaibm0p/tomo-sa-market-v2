import Foundation

// ✅ Single status enum (NO duplicates anywhere else)
enum OrderStatus: String, Codable, CaseIterable, Hashable {
    case placed
    case confirmed
    case preparing
    case readyForPickup
    case outForDelivery
    case delivered
    case cancelled
    
    var titleAr: String {
        switch self {
        case .placed: return "تم الطلب"
        case .confirmed: return "تم التأكيد"
        case .preparing: return "قيد التجهيز"
        case .readyForPickup: return "جاهز للاستلام"
        case .outForDelivery: return "في الطريق"
        case .delivered: return "تم التسليم"
        case .cancelled: return "ملغي"
        }
    }
    
    var titleEn: String {
        switch self {
        case .placed: return "Order placed"
        case .confirmed: return "Confirmed"
        case .preparing: return "Preparing"
        case .readyForPickup: return "Ready for pickup"
        case .outForDelivery: return "Out for delivery"
        case .delivered: return "Delivered"
        case .cancelled: return "Cancelled"
        }
    }
}

// ✅ Single order model used by the app
struct OrderModel: Identifiable, Codable, Hashable {
    let id: String
    var createdAt: Date
    var status: OrderStatus

    var itemsCount: Int
    var total: Double
    var deliveryFee: Double

    var addressLabel: String
    var etaMinutes: Int?

    var grandTotal: Double { total + deliveryFee }
}
