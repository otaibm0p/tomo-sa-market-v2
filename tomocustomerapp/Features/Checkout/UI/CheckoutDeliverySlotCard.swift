//
//  CheckoutDeliverySlotCard.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutDeliverySlotCard: View {
    let checkout: TomoCheckoutManager

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("وقت التوصيل").font(.headline)

            ForEach(checkout.availableSlots) { s in
                Button {
                    checkout.selectedSlot = s
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(s.title).font(.subheadline.weight(.semibold))
                            Text("رسوم: \(s.fee, specifier: "%.0f") SAR")
                                .font(.footnote).opacity(0.75)
                        }
                        Spacer()
                        Image(systemName: checkout.selectedSlot?.id == s.id ? "checkmark.circle.fill" : "circle")
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
        }
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}
