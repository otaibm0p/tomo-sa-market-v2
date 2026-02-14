//
//  PaymentMethodPickerView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct PaymentMethodPickerView: View {

    @EnvironmentObject var payments: PaymentStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {

            HStack {
                Text("Payment")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Button {
                    payments.addMockCard()
                } label: {
                    Text("Add card")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(red: 0.10, green: 0.45, blue: 0.25))
                }
                .buttonStyle(.plain)
            }

            // Apple Pay (primary)
            Button {
                payments.selectApplePay()
            } label: {
                methodRow(
                    title: "Apple Pay",
                    subtitle: "Fast & secure",
                    icon: "apple.logo",
                    selected: payments.selected.kind == .applePay
                )
            }
            .buttonStyle(.plain)

            // Cards
            VStack(spacing: 10) {
                ForEach(payments.savedCards) { c in
                    Button {
                        payments.selectCard(c)
                    } label: {
                        methodRow(
                            title: "\(c.brand) •••• \(c.last4)",
                            subtitle: "Exp \(c.expiry)",
                            icon: "creditcard.fill",
                            selected: payments.selected.kind == .card && payments.selected.cardId == c.id
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            // Cash
            Button {
                payments.selectCash()
            } label: {
                methodRow(
                    title: "Cash",
                    subtitle: "Pay on delivery",
                    icon: "banknote.fill",
                    selected: payments.selected.kind == .cash
                )
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
    }

    private func methodRow(title: String, subtitle: String, icon: String, selected: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.secondary)
                .frame(width: 26)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .bold))
                Text(subtitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                .foregroundColor(selected ? Color(red: 0.10, green: 0.45, blue: 0.25) : .secondary)
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }
}
