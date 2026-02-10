//
//  Banner.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

struct Banner: Identifiable, Codable {
    let id: Int
    let title: String
    let imageUrl: String
    let linkUrl: String?
    let isActive: Bool
}
