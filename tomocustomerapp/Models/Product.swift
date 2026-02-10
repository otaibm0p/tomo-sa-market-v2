//
//  Product.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

struct Product: Identifiable, Codable {
    let id: Int
    let name: String
    let description: String?
    let price: Double
    let originalPrice: Double?
    let imageUrl: String
    let categoryId: Int
    let isAvailable: Bool
    let stock: Int
    
    // Computed property for discount percentage
    var discountPercentage: Int? {
        guard let originalPrice = originalPrice, originalPrice > price else {
            return nil
        }
        return Int(((originalPrice - price) / originalPrice) * 100)
    }
    
    // Computed property for formatted price
    var formattedPrice: String {
        return String(format: "%.2f", price)
    }
}
