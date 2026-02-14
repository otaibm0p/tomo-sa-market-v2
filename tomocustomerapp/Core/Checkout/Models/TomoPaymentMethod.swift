//
//  TomoPaymentMethod.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

enum TomoPaymentMethod: String, CaseIterable, Identifiable, Codable {
    case cash = "Cash"
    case card = "Card"
    case applePay = "Apple Pay"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .cash: return "banknote"
        case .card: return "creditcard"
        case .applePay: return "apple.logo"
        }
    }
}
