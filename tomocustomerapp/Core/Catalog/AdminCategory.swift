//
//  AdminCategory.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct AdminCategory: Identifiable, Codable, Hashable {
    let id: String
    let nameAr: String
    let nameEn: String
    let icon: String?      // SF Symbol name (اختياري)
    let image: String?     // URL لاحقاً من الادمن
    let sortOrder: Int
    let isActive: Bool

    static func == (lhs: AdminCategory, rhs: AdminCategory) -> Bool { 
        lhs.id == rhs.id 
    }
    
    func hash(into hasher: inout Hasher) { 
        hasher.combine(id) 
    }
}
