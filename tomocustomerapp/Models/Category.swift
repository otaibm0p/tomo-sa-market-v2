//
//  Category.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation
import SwiftUI

struct Category: Identifiable, Codable {
    let id: Int
    let name: String
    let icon: String
    let colorHex: String?
    
    // Computed property for SwiftUI Color
    var color: Color {
        if let hex = colorHex {
            return Color(hex: hex)
        }
        return Color(red: 0.2, green: 0.6, blue: 0.3)
    }
}

// Extension to convert hex string to Color
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
