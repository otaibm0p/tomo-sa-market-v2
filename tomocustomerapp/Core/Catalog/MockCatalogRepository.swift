import Foundation

final class MockCatalogRepository: CatalogRepository {

    private let categories: [AdminCategory] = [
        .init(id: "c1", nameAr: "خضار وفواكه", nameEn: "Fresh", icon: "leaf", image: nil, sortOrder: 1, isActive: true),
        .init(id: "c2", nameAr: "مخبوزات", nameEn: "Bakery", icon: "birthday.cake", image: nil, sortOrder: 2, isActive: true),
        .init(id: "c3", nameAr: "ألبان", nameEn: "Dairy", icon: "carton", image: nil, sortOrder: 3, isActive: true),
        .init(id: "c4", nameAr: "مشروبات", nameEn: "Drinks", icon: "cup.and.saucer", image: nil, sortOrder: 4, isActive: true)
    ]

    private let products: [AdminProduct] = [
        .init(id: "p1", sku: nil, nameAr: "تفاح أحمر", nameEn: "Red Apple", descriptionAr: "طازج", descriptionEn: "Fresh", price: 7.5, currency: "SAR", unit: "kg", isAvailable: true, isFeatured: true, categoryId: "c1", images: [], primaryImage: nil),
        .init(id: "p2", sku: nil, nameAr: "موز", nameEn: "Banana", descriptionAr: "ممتاز", descriptionEn: "Good", price: 6.0, currency: "SAR", unit: "kg", isAvailable: true, isFeatured: true, categoryId: "c1", images: [], primaryImage: nil),
        .init(id: "p3", sku: nil, nameAr: "حليب", nameEn: "Milk", descriptionAr: "1 لتر", descriptionEn: "1L", price: 5.5, currency: "SAR", unit: "1L", isAvailable: true, isFeatured: false, categoryId: "c3", images: [], primaryImage: nil),
        .init(id: "p4", sku: nil, nameAr: "كرواسون", nameEn: "Croissant", descriptionAr: "طازج", descriptionEn: "Fresh", price: 3.0, currency: "SAR", unit: "piece", isAvailable: true, isFeatured: false, categoryId: "c2", images: [], primaryImage: nil)
    ]

    private let map: [String:[String]] = [
        "c1":["p1","p2"],
        "c2":["p4"],
        "c3":["p3"],
        "c4":[]
    ]

    func fetchCategories() async throws -> [AdminCategory] {
        categories.filter { $0.isActive }.sorted { $0.sortOrder < $1.sortOrder }
    }

    func fetchFeaturedProducts() async throws -> [AdminProduct] {
        products.filter { $0.isFeatured && $0.isAvailable }
    }

    func fetchProducts(categoryId: String) async throws -> [AdminProduct] {
        let ids = map[categoryId] ?? []
        return products.filter { ids.contains($0.id) && $0.isAvailable }
    }

    func fetchProduct(id: String) async throws -> AdminProduct? {
        products.first { $0.id == id }
    }
}
