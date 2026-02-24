//
//  CatalogRepository.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

/// Protocol for fetching categories and products by category
protocol CatalogRepository {
    /// Fetch all active categories
    func fetchCategories() async throws -> [AdminCategory]
    
    /// Fetch featured products (for home page)
    func fetchFeaturedProducts() async throws -> [AdminProduct]
    
    /// Fetch products for a specific category
    func fetchProducts(categoryId: String) async throws -> [AdminProduct]
    
    /// Fetch a single product by ID
    func fetchProduct(id: String) async throws -> AdminProduct?
}
