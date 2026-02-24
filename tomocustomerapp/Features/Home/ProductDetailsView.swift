//
//  ProductDetailsView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct ProductDetailsView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var cart: TomoCartManager
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    @Environment(\.dismiss) private var dismiss

    let product: AdminProduct

    private var isAr: Bool { languageManager.currentLanguage == .ar }
    
    // ✅ Helper to read current qty safely from cart
    private var currentQty: Int {
        cart.quantity(for: product)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {

                // Multi-image carousel
                ProductImageCarousel(images: product.images, height: 220)

                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(isAr ? product.nameAr : product.nameEn)
                            .font(.system(size: 22, weight: .bold))
                        Text(product.unit)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Text("\(product.currency) \(String(format: "%.2f", product.price))")
                        .font(.system(size: 18, weight: .bold))
                }

                Text(isAr ? "الوصف" : "Description")
                    .font(.system(size: 14, weight: .bold))

                Text(isAr ? product.descriptionAr : product.descriptionEn)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(isAr ? .trailing : .leading)

                Spacer(minLength: 28)
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }
        .safeAreaInset(edge: .bottom) {
            addToCartBar
        }
        .navigationTitle(isAr ? "تفاصيل المنتج" : "Product Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                CartIconWithBadge(count: cart.totalItems) {
                    router.popToRoot()
                    withAnimation {
                        uiState.selectedTab = .cart
                    }
                }
            }
        }
    }

    private var addToCartBar: some View {
        let qty = currentQty

        return VStack(spacing: 10) {
            Divider().opacity(0.35)

            HStack(spacing: 12) {

                // Quantity controls appear ONLY when item exists in cart
                if qty > 0 {
                    HStack(spacing: 10) {
                        Button {
                            cart.removeOne(product)
                        } label: {
                            Image(systemName: "minus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)

                        Text("\(qty)")
                            .font(.system(size: 16, weight: .semibold))
                            .frame(minWidth: 24)

                        Button {
                            cart.add(product, qty: 1)
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(Color.primary)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                // Main CTA: Add once OR View Cart (no increment by repeated taps)
                Button {
                    if qty == 0 {
                        // ✅ First time only: add product (qty=1)
                        cart.add(product, qty: 1)
                        
                        // Lightweight haptic feedback
                        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                        impactFeedback.impactOccurred()
                    } else {
                        // ✅ After added: go to cart (NOT re-adding)
                        router.popToRoot()
                        withAnimation {
                            uiState.selectedTab = .cart
                        }
                    }
                } label: {
                    Text(qty == 0 ? (isAr ? "أضف إلى السلة" : "Add to Cart") : (isAr ? "عرض السلة" : "View Cart"))
                        .font(.system(size: 16, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                }
                .foregroundStyle(qty == 0 ? Color.primary : Color.white)
                .background(
                    Group {
                        if qty == 0 {
                            Color(.systemGreen).opacity(0.18)
                        } else {
                            Color(.systemGreen)
                        }
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
        .background(.ultraThinMaterial)
    }
}


#Preview {
    NavigationStack {
        ProductDetailsView(product: AdminProduct(
            id: "test",
            sku: nil,
            nameAr: "موز",
            nameEn: "Banana",
            descriptionAr: "وصف",
            descriptionEn: "Description",
            price: 3.0,
            currency: "SAR",
            unit: "kg",
            isAvailable: true,
            isFeatured: true,
            categoryId: nil,
            images: ["https://picsum.photos/seed/banana1/900/700"],
            primaryImage: nil
        ))
        .environmentObject(TomoCartManager())
        .environmentObject(LanguageManager())
        .environmentObject(AppUIState())
    }
}
