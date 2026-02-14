//
//  CheckoutPaymentCard.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutPaymentCard: View {
    var checkout: TomoCheckoutManager
    @EnvironmentObject var languageManager: LanguageManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "creditcard.fill")
                    .foregroundColor(.green)
                Text(languageManager.currentLanguage == .ar ? "طريقة الدفع" : "Payment Method")
                    .font(.headline)
                Spacer()
            }
            
            ForEach(TomoPaymentMethod.allCases) { method in
                Button {
                    checkout.selectedPayment = method
                } label: {
                    HStack {
                        Image(systemName: method.icon)
                            .foregroundColor(.green)
                        Text(method.rawValue)
                            .font(.subheadline.weight(.semibold))
                        Spacer()
                        if checkout.selectedPayment == method {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                    .padding()
                    .background(checkout.selectedPayment == method ? Color.green.opacity(0.1) : Color(.systemGray6))
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}
