//
//  Endpoints.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

// MARK: - API Endpoints
// TODO: Admin API Integration Point #9
// These endpoints should match the Admin API routes exactly
// Admin will configure these endpoints in their backend
// All endpoints return JSON data controlled by Admin through admin panel

enum Endpoint {
    case home
    case categories
    case banners
    case products
    case featuredProducts
    
    var path: String {
        switch self {
        case .home:
            return "/api/home"
        case .categories:
            return "/api/categories"
        case .banners:
            return "/api/banners"
        case .products:
            return "/api/products"
        case .featuredProducts:
            return "/api/products/featured"
        }
    }
    
    var method: HTTPMethod {
        switch self {
        case .home, .categories, .banners, .products, .featuredProducts:
            return .GET
        }
    }
}

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}
