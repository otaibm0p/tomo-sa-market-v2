//
//  CatalogViewModel.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Observation

@Observable
final class CatalogViewModel {
    private let repo: CatalogRepository

    var categories:[AdminCategory] = []
    var featured:[AdminProduct] = []
    var categoryProducts:[AdminProduct] = []

    var isLoading = false

    init(repo: CatalogRepository){ self.repo = repo }

    @MainActor
    func loadHome() async {
        isLoading = true
        async let c = repo.fetchCategories()
        async let f = repo.fetchFeaturedProducts()
        categories = (try? await c) ?? []
        featured = (try? await f) ?? []
        isLoading = false
    }

    @MainActor
    func loadCategory(id:String) async {
        isLoading = true
        categoryProducts = (try? await repo.fetchProducts(categoryId: id)) ?? []
        isLoading = false
    }
}
