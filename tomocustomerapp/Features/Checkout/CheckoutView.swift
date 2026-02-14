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
    @State private var checkout = TomoCheckoutManager()

    @State private var showSuccess = false
    @State private var draft: TomoOrderDraft?

    var body: some View {
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
                    Text(languageManager.currentLanguage == .ar ? "تأكيد الطلب" : "Confirm Order")
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
                } label: {
                    HStack {
                        Image(systemName: languageManager.chevronBack)
                        Text(languageManager.currentLanguage == .ar ? "متابعة التسوق" : "Continue Shopping")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(.thinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            .padding()
        }
        .navigationTitle(languageManager.currentLanguage == .ar ? "الدفع" : "Checkout")
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
