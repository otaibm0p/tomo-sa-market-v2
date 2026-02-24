//
//  PaymentMethodsView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct PaymentMethodsView: View {
    @EnvironmentObject var payments: PaymentStore
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        List {
            Section(languageManager.t("preferred")) {
                Text(languageManager.t("apple_pay_when_enabled"))
            }

            Section(languageManager.t("saved_cards")) {
                ForEach(payments.savedCards) { c in
                    Text("\(c.brand) •••• \(c.last4) — Exp \(c.expiry)")
                        .font(.system(size: 13, weight: .semibold))
                }
            }

            Button {
                payments.addMockCard()
            } label: {
                Text(languageManager.t("add_card_mock"))
            }
        }
        .navigationTitle(languageManager.t("payments_title"))
    }
}

#Preview {
    NavigationStack {
        PaymentMethodsView()
            .environmentObject(PaymentStore())
            .environmentObject(LanguageManager())
    }
}
