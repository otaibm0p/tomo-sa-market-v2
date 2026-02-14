import Foundation

// MARK: - API DTOs (من السيرفر)
struct HomeResponse: Decodable {
    let banners: [BannerDTO]
    let categories: [CategoryDTO]
    let featuredProducts: [ProductDTO]
}

struct BannerDTO: Decodable {
    let title: String
    let subtitle: String?
}

struct CategoryDTO: Decodable {
    let name: String
    let icon: String
}

struct ProductDTO: Decodable {
    let name: String
    let price: Double
    let unit: String?
    let imageSystemName: String?
}

// MARK: - UI Models (داخل التطبيق)
// Note: Banner, CategoryItem, and AdminProduct are defined in their respective folders

// MARK: - Mapping (DTO -> UI)
extension HomeResponse {
    func toUI() -> (banners: [Banner], categories: [CategoryItem], products: [AdminProduct]) {
        let uiBanners = banners.map { Banner(title: $0.title) }

        let uiCategories = categories.map { CategoryItem(name: $0.name, icon: $0.icon) }

        let uiProducts = featuredProducts.map { dto in
            AdminProduct(
                id: UUID().uuidString,
                sku: nil,
                nameAr: dto.name,
                nameEn: dto.name,
                descriptionAr: "",
                descriptionEn: "",
                price: dto.price,
                currency: "SAR",
                unit: dto.unit ?? "",
                isAvailable: true,
                isFeatured: true,
                categoryId: nil,
                images: [],
                primaryImage: dto.imageSystemName
            )
        }

        return (uiBanners, uiCategories, uiProducts)
    }
}
