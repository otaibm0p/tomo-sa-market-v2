import Foundation

struct Banner: Identifiable {
    let id = UUID()
    let title: String
}

extension Banner {
    static let mock: [Banner] = [
        Banner(title: "Special Offer"),
        Banner(title: "New Arrivals"),
        Banner(title: "Flash Sale")
    ]
}
