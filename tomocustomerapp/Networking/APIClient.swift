//
//  APIClient.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

// MARK: - Configuration
// TODO: Admin API Integration Point #1
// Replace with actual admin API base URL when backend is ready
// Admin will configure this URL in their admin panel
// Example: "https://api.tomo-market.com" or "https://admin.tomo-market.com/api"
private let baseURL = "https://api.tomo-market.com"

// TODO: Admin API Integration Point #2
// Replace with actual authentication token from admin
// This should be retrieved from:
// 1. User login session (stored securely in Keychain)
// 2. Or admin-configured API key for public endpoints
// Admin will manage authentication tokens in their system
private let authToken = "YOUR_AUTH_TOKEN_HERE"

class APIClient {
    static let shared = APIClient()
    
    private init() {}
    
    // MARK: - Generic Request Method
    
    // TODO: Admin API Integration Point #3
    // Implement actual network request when admin API is ready
    // Expected Admin API Response Format:
    // - All endpoints should return JSON
    // - Response should match the Codable models (Category, Banner, Product, HomeResponse)
    // - Admin will control all data through their admin panel
    // - This method should:
    //   1. Build URL from baseURL + endpoint.path
    //   2. Add authentication headers (Bearer token)
    //   3. Make HTTP request using URLSession
    //   4. Parse JSON response into Codable models
    //   5. Handle errors (network, parsing, authentication)
    func request<T: Decodable>(
        endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        // TODO: Replace this mock implementation with real network call
        // For now, return mock data to simulate API responses
        
        // Simulate network delay (remove when real API is connected)
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        return try await mockData(for: endpoint, responseType: responseType)
    }
    
    // MARK: - Mock Data (Temporary - Remove when Admin API is ready)
    
    // TODO: Admin API Integration Point #4
    // This entire mockData method should be removed once Admin API is connected
    // All data will come from Admin's database and be controlled through admin panel:
    // - Categories: Admin can add/edit/delete categories
    // - Banners: Admin can upload images, set titles, configure links
    // - Products: Admin can manage inventory, prices, descriptions, images
    // - Featured Products: Admin can mark products as featured
    private func mockData<T: Decodable>(
        for endpoint: Endpoint,
        responseType: T.Type
    ) async throws -> T {
        switch endpoint {
        case .home:
            // TODO: Admin will control this response through admin panel
            // Expected Admin API: GET /api/home
            // Returns: { categories: [...], banners: [...], featuredProducts: [...] }
            let homeResponse = HomeResponse(
                categories: mockCategories,
                banners: mockBanners,
                featuredProducts: mockFeaturedProducts
            )
            return homeResponse as! T
            
        case .categories:
            // TODO: Admin will manage categories through admin panel
            // Expected Admin API: GET /api/categories
            // Admin can: Add, edit, delete, reorder categories
            return mockCategories as! T
            
        case .banners:
            // TODO: Admin will manage banners through admin panel
            // Expected Admin API: GET /api/banners?active=true
            // Admin can: Upload images, set titles, configure links, enable/disable
            return mockBanners as! T
            
        case .featuredProducts:
            // TODO: Admin will mark products as featured through admin panel
            // Expected Admin API: GET /api/products/featured
            // Admin can: Select which products appear as featured
            return mockFeaturedProducts as! T
            
        case .products:
            // TODO: Admin will manage all products through admin panel
            // Expected Admin API: GET /api/products?categoryId=X&page=1&limit=20
            // Admin can: Add products, set prices, manage inventory, upload images
            return mockFeaturedProducts as! T
        }
    }
    
    // MARK: - Mock Data Sources (Temporary - All controlled by Admin later)
    
    // TODO: Admin API Integration Point #5
    // All mock data below will be replaced by Admin-controlled data
    // Admin will manage this through their admin panel:
    // - Category management (name, icon, color)
    // - Banner management (images, titles, links, active status)
    // - Product management (name, price, description, images, stock, category)
    
    private var mockCategories: [Category] {
        [
            Category(id: 1, name: "Vegetables", icon: "carrot.fill", colorHex: "33B34D"),
            Category(id: 2, name: "Fruits", icon: "apple.fill", colorHex: "E64D33"),
            Category(id: 3, name: "Meat", icon: "fork.knife", colorHex: "CC3333"),
            Category(id: 4, name: "Dairy", icon: "drop.fill", colorHex: "E6E6F2"),
            Category(id: 5, name: "Bakery", icon: "birthday.cake.fill", colorHex: "E6B366"),
            Category(id: 6, name: "Beverages", icon: "cup.and.saucer.fill", colorHex: "4D80CC"),
            Category(id: 7, name: "Snacks", icon: "bag.fill", colorHex: "CC9933"),
            Category(id: 8, name: "Frozen", icon: "snowflake", colorHex: "66B3E6")
        ]
    }
    
    private var mockBanners: [Banner] {
        [
            Banner(id: 1, title: "Fresh Vegetables Sale", imageUrl: "https://example.com/banner1.jpg", linkUrl: nil, isActive: true),
            Banner(id: 2, title: "Summer Fruits Special", imageUrl: "https://example.com/banner2.jpg", linkUrl: nil, isActive: true),
            Banner(id: 3, title: "Organic Products", imageUrl: "https://example.com/banner3.jpg", linkUrl: nil, isActive: true)
        ]
    }
    
    private var mockFeaturedProducts: [Product] {
        [
            Product(id: 1, name: "Fresh Tomatoes", description: "Organic fresh tomatoes", price: 5.99, originalPrice: 7.99, imageUrl: "https://example.com/tomato.jpg", categoryId: 1, isAvailable: true, stock: 50),
            Product(id: 2, name: "Red Apples", description: "Crispy red apples", price: 4.99, originalPrice: nil, imageUrl: "https://example.com/apple.jpg", categoryId: 2, isAvailable: true, stock: 30),
            Product(id: 3, name: "Chicken Breast", description: "Fresh chicken breast", price: 12.99, originalPrice: 15.99, imageUrl: "https://example.com/chicken.jpg", categoryId: 3, isAvailable: true, stock: 20),
            Product(id: 4, name: "Fresh Milk", description: "1L fresh milk", price: 3.49, originalPrice: nil, imageUrl: "https://example.com/milk.jpg", categoryId: 4, isAvailable: true, stock: 40),
            Product(id: 5, name: "Whole Wheat Bread", description: "Fresh baked bread", price: 2.99, originalPrice: nil, imageUrl: "https://example.com/bread.jpg", categoryId: 5, isAvailable: true, stock: 25)
        ]
    }
}

// MARK: - Response Models
// TODO: Admin API Integration Point #6
// These response models should match the Admin API response structure exactly
// Admin will ensure their API returns data in this format
// If Admin changes the response structure, update these models accordingly

struct HomeResponse: Codable {
    let categories: [Category]
    let banners: [Banner]
    let featuredProducts: [Product]
}
