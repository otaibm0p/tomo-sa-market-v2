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
    let parentId: String? // Parent category ID (nil for top-level)
    
    // Computed: children (built from flat list in repository)
    var children: [AdminCategory] = []

    static func == (lhs: AdminCategory, rhs: AdminCategory) -> Bool { 
        lhs.id == rhs.id 
    }
    
    func hash(into hasher: inout Hasher) { 
        hasher.combine(id) 
    }
    
    // Helper: check if has children
    var hasChildren: Bool { !children.isEmpty }
    
    // Helper: check if is top-level
    var isTopLevel: Bool { parentId == nil }
}
