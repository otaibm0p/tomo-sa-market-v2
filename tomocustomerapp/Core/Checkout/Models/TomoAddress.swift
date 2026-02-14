//
//  TomoAddress.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

struct TomoAddress: Identifiable, Equatable, Codable {
    var id: String
    var label: String
    var city: String
    var district: String
    var street: String
    var building: String
    var notes: String?
    
    init(
        id: String = UUID().uuidString,
        label: String = "Home",
        city: String = "Dammam",
        district: String = "",
        street: String = "",
        building: String = "",
        notes: String? = nil
    ) {
        self.id = id
        self.label = label
        self.city = city
        self.district = district
        self.street = street
        self.building = building
        self.notes = notes
    }
    
    static func sampleHome() -> TomoAddress {
        TomoAddress(
            label: "Home",
            city: "Dammam",
            district: "Al Faisaliyah",
            street: "King Fahd Road",
            building: "Building 123"
        )
    }
    
    var fullAddress: String {
        [city, district, street, building].filter { !$0.isEmpty }.joined(separator: " • ")
    }
}
