//
//  OrdersView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct OrdersView: View {
    @EnvironmentObject var orderStore: OrderStore
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var languageManager: LanguageManager

    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        Group {
            if orderStore.orders.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "tray")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundColor(.gray)

                    Text(languageManager.l(.noOrders))
                        .font(.system(size: 22, weight: .bold))

                    Text(languageManager.l(.firstOrderHint))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Spacer()
                }
                .padding(.top, 50)
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(orderStore.orders) { order in
                            Button {
                                router.push(.orderDetails(order))
                            } label: {
                                HStack(spacing: 12) {
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(Color(.systemGray6))
                                        .frame(width: 56, height: 56)
                                        .overlay(
                                            Image(systemName: "shippingbox.fill")
                                                .foregroundColor(.gray)
                                        )

                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(order.id.isEmpty ? "—" : order.id)
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundColor(.primary)

                                        Text(isAr ? order.status.titleAr : order.status.titleEn)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.secondary)

                                        Text(order.createdAt.formatted(date: .abbreviated, time: .shortened))
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.secondary)
                                    }

                                    Spacer()

                                    VStack(alignment: .trailing, spacing: 6) {
                                        Text("SAR " + String(format: "%.2f", order.total))
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.primary)

                                        Image(systemName: "chevron.right")
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .padding(12)
                                .background(Color(.secondarySystemBackground))
                                .cornerRadius(18)
                                .padding(.horizontal)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.top, 10)
                }
            }
        }
        .navigationTitle(isAr ? "الطلبات" : "Orders")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            orderStore.seedMockIfNeeded()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                LanguageMenuButton()
            }
        }
    }
}

#Preview {
    OrdersView()
        .environmentObject(OrderStore())
        .environmentObject(AppRouter())
        .environmentObject(LanguageManager())
}
