//
//  AdminProduct.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct AdminProduct: Codable, Identifiable {
    let id: String
    let sku: String?
    let nameAr: String
    let nameEn: String
    let descriptionAr: String
    let descriptionEn: String
    let price: Double
    let currency: String        // "SAR"
    let unit: String            // "kg" / "pcs"
    let isAvailable: Bool
    let isFeatured: Bool
    let categoryId: String?
    let images: [String]        // array of URLs or asset names
    let primaryImage: String?   // optional explicit primary

    // Helpers
    func localizedName(isArabic: Bool) -> String { isArabic ? nameAr : nameEn }
    func localizedDescription(isArabic: Bool) -> String { isArabic ? descriptionAr : descriptionEn }

    var resolvedPrimaryImage: String? {
        if let primaryImage, !primaryImage.isEmpty { return primaryImage }
        return images.first
    }
    
    // ✅ Multi-image support (backward compatible)
    var allImages: [String] {
        if !images.isEmpty { return images }
        // Backward compatibility: if single imageUrl exists, use it
        if let single = resolvedPrimaryImage, !single.isEmpty { return [single] }
        return []
    }
}

// MARK: - Compatibility Extensions

extension AdminProduct {
    // 🔥 Compatibility with old Product model
    var name: String {
        return nameEn
    }

    var image: String {
        return resolvedPrimaryImage ?? ""
    }
}
