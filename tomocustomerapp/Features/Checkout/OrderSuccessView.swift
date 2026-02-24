//
//  OrderSuccessView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct OrderSuccessView: View {
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    let orderNumber: String
    let totalText: String
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color(.systemGreen).opacity(0.15))
                    .frame(width: 92, height: 92)

                Image(systemName: "checkmark")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Color(.systemGreen))
            }

            Text("Order Placed!")
                .font(.system(size: 24, weight: .bold))

            Text("Order #\(orderNumber)")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.secondary)

            Text("Total: \(totalText)")
                .font(.system(size: 16, weight: .bold))

            Text("Your order is being prepared. Tracking will be available when backend is connected.")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()

            VStack(spacing: 10) {
                Button {
                    // يفتح قائمة الطلبات
                    uiState.selectedTab = .orders
                } label: {
                    HStack {
                        Spacer()
                        Text("Track Order")
                            .font(.system(size: 16, weight: .bold))
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .background(Color(.systemGray6))
                    .cornerRadius(18)
                    .padding(.horizontal)
                }
                .buttonStyle(.plain)

                Button {
                    onDone()
                } label: {
                    HStack {
                        Spacer()
                        Text("Done")
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
                    .padding(.bottom, 10)
                }
                .buttonStyle(.plain)
            }
        }
        .navigationBarBackButtonHidden(true)
    }
}
