//
//  CheckoutView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutView: View {
    @EnvironmentObject var cart: TomoCartManager
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var uiState: AppUIState
    @EnvironmentObject var orderStore: OrderStore
    @Environment(\.dismiss) private var dismiss
    @State private var checkout = TomoCheckoutManager()

    @State private var showSuccess = false
    @State private var draft: TomoOrderDraft?

    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        Group {
            if cart.items.isEmpty {
                // Empty cart state - never show blank/warning
                VStack(spacing: 16) {
                    Image(systemName: "cart")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.gray)
                    
                    Text(isAr ? "السلة فارغة" : "Your Cart is Empty")
                        .font(.system(size: 22, weight: .bold))
                    
                    Text(isAr ? "أضف منتجات إلى السلة للمتابعة" : "Add items to your cart to continue")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    
                    Button {
                        // Navigate to Home
                        withAnimation(.easeInOut(duration: 0.25)) {
                            uiState.selectedTab = .home
                        }
                        // Dismiss checkout if presented via route
                        dismiss()
                    } label: {
                        Text(isAr ? "متابعة التسوق" : "Continue Shopping")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.green)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .padding(.horizontal, 40)
                    .padding(.top, 20)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // Cart has items - show checkout form
        ScrollView {
            VStack(spacing: 14) {
                CheckoutAddressCard(checkout: checkout)
                CheckoutDeliverySlotCard(checkout: checkout)
                CheckoutPaymentCard(checkout: checkout)

                CheckoutSummaryCard(
                    subtotal: cart.subtotal,
                    deliveryFee: checkout.selectedSlot?.fee ?? 0,
                    currency: cart.items.first?.product.currency ?? "SAR"
                )

                Button {
                            let draft = checkout.buildDraft(from: cart)
                            // Create order from draft
                            let newOrder = orderStore.createOrderFromDraft(draft)
                            // Clear cart
                            cart.clear()
                            // Navigate to success
                            self.draft = draft
                    showSuccess = true
                } label: {
                            Text(isAr ? "تأكيد الطلب" : "Confirm Order")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, minHeight: 52)
                        .background(Color.green)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .disabled(!checkout.canPlaceOrder(cart: cart))
                .opacity(checkout.canPlaceOrder(cart: cart) ? 1 : 0.5)

                Button {
                            // ⭐️ Navigation Hard Fix — Global UX
                            withAnimation(.easeInOut(duration: 0.25)) {
                                uiState.selectedTab = .home
                            }
                            // Dismiss checkout if presented via route
                    dismiss()
                } label: {
                    HStack {
                        Image(systemName: languageManager.chevronBack)
                                Text(isAr ? "متابعة التسوق" : "Continue Shopping")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(.thinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding()
        }
            }
        }
        .navigationTitle(isAr ? "الدفع" : "Checkout")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showSuccess) {
            CheckoutSuccessView(draft: draft)
        }
    }
}

#Preview {
    CheckoutView()
        .environmentObject(TomoCartManager())
        .environmentObject(LanguageManager())
}
