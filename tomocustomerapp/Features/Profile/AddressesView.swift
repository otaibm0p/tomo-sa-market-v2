//
//  AddressesView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct AddressesView: View {
    @EnvironmentObject var languageManager: LanguageManager

    @State private var items: [String] = [
        "Dammam • Al Faisaliyah • Street 10 • Building 3",
        "Khobar • Al Ulaya • Street 2 • Building 7"
    ]

    var body: some View {
        List {
            Section {
                ForEach(items, id: \.self) { a in
                    Text(a).font(.system(size: 13, weight: .semibold))
                }
                .onDelete { idx in items.remove(atOffsets: idx) }
            }

            Button {
                items.insert(languageManager.t("new_address_mock"), at: 0)
            } label: {
                Text(languageManager.t("add_address"))
            }
        }
        .navigationTitle(languageManager.t("addresses_title"))
    }
}

#Preview {
    NavigationStack {
        AddressesView()
            .environmentObject(LanguageManager())
    }
}
