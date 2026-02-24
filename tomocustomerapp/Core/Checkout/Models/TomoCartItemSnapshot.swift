//
//  TomoCartItemSnapshot.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct TomoCartItemSnapshot: Identifiable, Codable {
    let id: String
    let productId: String
    let name: String
    let unit: String
    let price: Double
    let currency: String
    let quantity: Int
    
    var total: Double {
        price * Double(quantity)
    }
}
