//
//  HomeViewModel.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation
import SwiftUI
import Combine

// MARK: - HomeViewModel
// Centralized ViewModel for Home screen
// All Home data (Banners, Categories, Featured Products) comes from Admin API through this ViewModel
// No hardcoded data - everything is controlled by Admin

@MainActor
class HomeViewModel: ObservableObject {
    // MARK: - Published Properties
    // All data is loaded from Admin API - no hardcoded values
    
    /// Categories loaded from Admin API
    /// Admin controls: name, icon, color, order, visibility
    @Published var categories: [Category] = []
    
    /// Banners loaded from Admin API
    /// Admin controls: title, image, link, active status, display order
    @Published var banners: [Banner] = []
    
    /// Featured products loaded from Admin API
    /// Admin controls: which products are featured, order, visibility
    @Published var featuredProducts: [Product] = []
    
    /// Loading state while fetching data from Admin API
    @Published var isLoading: Bool = false
    
    /// Error message if Admin API request fails
    @Published var errorMessage: String?
    
    // MARK: - Dependencies
    
    private let apiClient = APIClient.shared
    
    // MARK: - Public Methods
    
    /// Loads all home screen data from Admin API
    /// TODO: Admin API Integration Point #7
    /// This method calls the Admin API endpoint /api/home
    /// Admin controls all data returned:
    /// - Which categories are shown
    /// - Which banners are active
    /// - Which products are featured
    /// - All content, images, prices, etc.
    func loadHome() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // TODO: This will fetch data from Admin API
            // Admin will control all aspects of the response through their admin panel
            let response: HomeResponse = try await apiClient.request(
                endpoint: .home,
                responseType: HomeResponse.self
            )
            
            // Update UI with Admin-controlled data
            self.categories = response.categories
            self.banners = response.banners
            self.featuredProducts = response.featuredProducts
            self.isLoading = false
            
        } catch {
            // TODO: Handle Admin API errors appropriately
            // - Network errors
            // - Authentication errors
            // - Invalid response format
            self.errorMessage = error.localizedDescription
            self.isLoading = false
            print("Error loading home data from Admin API: \(error)")
        }
    }
    
    /// Refresh home data from Admin API
    /// Can be called when user pulls to refresh
    /// TODO: Admin API Integration Point #8
    /// Admin can update data in their panel, and this will fetch the latest
    func refresh() async {
        await loadHome()
    }
}
