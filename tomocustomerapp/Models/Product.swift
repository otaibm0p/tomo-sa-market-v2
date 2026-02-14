import Foundation

struct Product: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var price: Double
    var unit: String
    var image: String
    var oldPrice: Double?

    // ✅ init مرن: يدعم استدعاءات قديمة (بدون id/image/oldPrice) ويدعم unit
    init(
        name: String,
        price: Double,
        unit: String = "",
        image: String = "cart",
        oldPrice: Double? = nil,
        id: UUID = UUID()
    ) {
        self.id = id
        self.name = name
        self.price = price
        self.unit = unit
        self.image = image
        self.oldPrice = oldPrice
    }

    // ✅ Mock data
    static let mockFeatured: [Product] = [
        Product(name: "Banana", price: 3.00, unit: "kg", image: "banana", oldPrice: 4.00),
        Product(name: "Apple",  price: 5.50, unit: "kg", image: "apple"),
        Product(name: "Milk",   price: 6.00, unit: "1L", image: "milk"),
        Product(name: "Bread",  price: 2.50, unit: "pc", image: "bread")
    ]
}

// MARK: - Product to AdminProduct Conversion

extension Product {
    func toAdminProduct() -> AdminProduct {
        AdminProduct(
            id: id.uuidString,
            sku: nil,
            nameAr: name,
            nameEn: name,
            descriptionAr: "منتج عالي الجودة",
            descriptionEn: "High quality product",
            price: price,
            currency: "SAR",
            unit: unit,
            isAvailable: true,
            isFeatured: true,
            categoryId: nil,
            images: [image],
            primaryImage: image
        )
    }
}

// MARK: - AdminProduct to Product Conversion

extension AdminProduct {
    func toProduct() -> Product {
        Product(
            name: nameEn,
            price: price,
            unit: unit,
            image: resolvedPrimaryImage ?? "cart",
            oldPrice: nil,
            id: UUID(uuidString: id) ?? UUID()
        )
    }
}
