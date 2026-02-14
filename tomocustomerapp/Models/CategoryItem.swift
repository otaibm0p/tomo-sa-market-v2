import Foundation

struct CategoryItem: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
}

extension CategoryItem {
    static let mock: [CategoryItem] = [
        CategoryItem(name: "Vegetables", icon: "leaf"),
        CategoryItem(name: "Fruits", icon: "applelogo"),
        CategoryItem(name: "Meat", icon: "fork.knife"),
        CategoryItem(name: "Dairy", icon: "drop.fill"),
        CategoryItem(name: "Bakery", icon: "birthday.cake"),
        CategoryItem(name: "Beverages", icon: "cup.and.saucer"),
        CategoryItem(name: "Snacks", icon: "bag.fill"),
        CategoryItem(name: "Frozen", icon: "snowflake")
    ]
}
