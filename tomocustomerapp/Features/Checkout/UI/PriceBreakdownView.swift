//
//  PriceBreakdownView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct PriceBreakdownView: View {

    let subtotal: Double
    let deliveryFee: Double
    let serviceFee: Double
    let discount: Double

    var total: Double {
        max(0, subtotal + deliveryFee + serviceFee - discount)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            Text("Price Summary")
                .font(.system(size: 15, weight: .bold))

            row("Subtotal", subtotal)
            row("Delivery fee", deliveryFee)
            row("Service fee", serviceFee)

            if discount > 0 {
                row("Discount", -discount, isDiscount: true)
            }

            Divider()

            HStack {
                Text("Total")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text("SAR " + String(format: "%.2f", total))
                    .font(.system(size: 16, weight: .bold))
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
    }

    private func row(_ title: String, _ value: Double, isDiscount: Bool = false) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
            Spacer()
            Text("SAR " + String(format: "%.2f", value))
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isDiscount ? Color(.systemGreen) : .primary)
        }
    }
}
