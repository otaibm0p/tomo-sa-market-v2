//
//  CheckoutSummaryCard.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutSummaryCard: View {
    let subtotal: Double
    let deliveryFee: Double
    let currency: String

    var body: some View {
        let total = subtotal + deliveryFee

        VStack(alignment: .leading, spacing: 10) {
            Text("ملخص الطلب").font(.headline)

            row("الإجمالي الفرعي", "\(subtotal, default: "%.2f") \(currency)")
            row("رسوم التوصيل", "\(deliveryFee, default: "%.2f") \(currency)")
            Divider().opacity(0.4)
            row("الإجمالي", "\(total, default: "%.2f") \(currency)", bold: true)
        }
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    @ViewBuilder
    private func row(_ title: String, _ value: String, bold: Bool = false) -> some View {
        HStack {
            Text(title).font(bold ? .headline : .subheadline)
            Spacer()
            Text(value).font(bold ? .headline : .subheadline).opacity(bold ? 1 : 0.85)
        }
    }
}
