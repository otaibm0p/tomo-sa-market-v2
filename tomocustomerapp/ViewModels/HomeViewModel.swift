//
//  HomeViewModel.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Combine

/// ViewModel for Home screen
/// Manages banners, categories, and featured products using APIClient
@MainActor
final class HomeViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    /// List of promotional banners
    @Published var banners: [Banner] = []
    
    /// List of featured products (AdminProduct)
    @Published var featuredProducts: [AdminProduct] = []
    
    /// List of all products (AdminProduct)
    @Published var products: [AdminProduct] = []
    
    /// Loading state
    @Published var isLoading: Bool = false
    
    /// Error message if loading fails
    @Published var errorMessage: String?
    
    private let dataSource: ProductsDataSource
    
    // MARK: - Initialization
    
    init(dataSource: ProductsDataSource? = nil) {
        // ✅ Create datasource with explicit filename to avoid mainActor isolation warning
        self.dataSource = dataSource ?? BundledJSONProductsDataSource(filename: "products")
        // Auto-load on init
        Task {
            await loadHome()
        }
    }
    
    // MARK: - Public Methods
    
    /// Async version for use with .task modifier
    func loadHome() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        
        do {
            let list = try await dataSource.fetchProducts()
            self.products = list.filter { $0.isAvailable }
            self.featuredProducts = self.products.filter { $0.isFeatured }
            // Mock banners for now
            self.banners = Banner.mock
        } catch {
            // Fallback to legacy API
            let response = APIClient.fetchHome()
            let uiData = response.toUI()
            
            self.banners = uiData.banners.isEmpty ? Banner.mock : uiData.banners
            self.featuredProducts = uiData.products
            self.products = self.featuredProducts
        }
    }
}
