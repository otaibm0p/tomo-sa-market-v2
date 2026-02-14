//
//  ProductsDataSource.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

protocol ProductsDataSource {
    func fetchProducts() async throws -> [AdminProduct]
}

final class BundledJSONProductsDataSource: ProductsDataSource {
    private let filename: String
    init(filename: String = "products") { self.filename = filename }

    func fetchProducts() async throws -> [AdminProduct] {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            throw NSError(domain: "ProductsDataSource", code: 404, userInfo: [NSLocalizedDescriptionKey: "Missing \(filename).json in bundle"])
        }
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode([AdminProduct].self, from: data)
    }
}
