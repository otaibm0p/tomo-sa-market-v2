//
//  CheckoutAddressCard.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutAddressCard: View {
    let checkout: TomoCheckoutManager
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(languageManager.currentLanguage == .ar ? "عنوان التوصيل" : "Delivery Address")
                .font(.headline)

            if let a = checkout.selectedAddress {
                Text("\(a.label) — \(a.city), \(a.district)")
                    .font(.subheadline)
                Text("\(a.street) \(a.building.isEmpty ? "" : a.building)")
                    .font(.footnote)
                    .opacity(0.8)
            } else {
                Text(languageManager.currentLanguage == .ar ? "اختر عنواناً" : "Select an address")
                    .font(.subheadline)
                    .opacity(0.7)
            }

            Menu {
                ForEach(checkout.savedAddresses) { a in
                    Button {
                        checkout.selectedAddress = a
                    } label: {
                        Text("\(a.label) — \(a.city) \(a.district)")
                    }
                }
            } label: {
                Text(languageManager.currentLanguage == .ar ? "تغيير العنوان" : "Change Address")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .background(.thinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
        }
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}
