//
//  APIClient.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

struct APIClient {
    static func fetchHome() -> HomeResponse {
        return HomeResponse(
            banners: [
                BannerDTO(title: "Special Offer", subtitle: "Get 20% off"),
                BannerDTO(title: "New Arrivals", subtitle: "Fresh products"),
                BannerDTO(title: "Flash Sale", subtitle: "Limited time")
            ],
            categories: [
                CategoryDTO(name: "Vegetables", icon: "leaf"),
                CategoryDTO(name: "Fruits", icon: "applelogo"),
                CategoryDTO(name: "Meat", icon: "fork.knife"),
                CategoryDTO(name: "Dairy", icon: "drop.fill"),
                CategoryDTO(name: "Bakery", icon: "birthday.cake"),
                CategoryDTO(name: "Beverages", icon: "cup.and.saucer"),
                CategoryDTO(name: "Snacks", icon: "bag.fill"),
                CategoryDTO(name: "Frozen", icon: "snowflake")
            ],
            featuredProducts: [
                ProductDTO(name: "Banana", price: 3.00, unit: "kg", imageSystemName: "banana"),
                ProductDTO(name: "Apple", price: 5.50, unit: "kg", imageSystemName: "apple"),
                ProductDTO(name: "Milk", price: 6.00, unit: "1L", imageSystemName: "milk"),
                ProductDTO(name: "Bread", price: 2.50, unit: "pc", imageSystemName: "bread")
            ]
        )
    }
}
