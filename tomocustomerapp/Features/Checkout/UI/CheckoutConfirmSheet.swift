//
//  CheckoutConfirmSheet.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutConfirmSheet: View {

    let totalText: String
    let paymentText: String
    let addressText: String
    let slotText: String
    let onConfirm: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Capsule()
                .fill(Color(.systemGray4))
                .frame(width: 44, height: 5)
                .padding(.top, 8)

            Text("Confirm Order")
                .font(.system(size: 18, weight: .bold))
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 8) {
                row("Total", totalText, bold: true)
                row("Payment", paymentText)
                row("Address", addressText)
                row("Slot", slotText)
            }
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
            .padding(.horizontal)

            Button {
                onConfirm()
            } label: {
                HStack {
                    Spacer()
                    Text("Confirm & Place Order")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.vertical, 14)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.10, green: 0.45, blue: 0.25), Color(red: 0.05, green: 0.30, blue: 0.15)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(18)
                .padding(.horizontal)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 14)
        }
    }

    private func row(_ title: String, _ value: String, bold: Bool = false) -> some View {
        HStack(alignment: .top) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.secondary)
                .frame(width: 70, alignment: .leading)

            Text(value)
                .font(.system(size: 13, weight: bold ? .bold : .semibold))
            Spacer()
        }
    }
}
