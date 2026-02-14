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
    
    @State private var qty: Int = 1

    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {

                // If you already have ProductGalleryView, keep it. Otherwise keep placeholder.
                if !product.images.isEmpty {
                    ProductGalleryView(images: product.images)
                } else {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color(.secondarySystemBackground))
                        .frame(height: 220)
                        .overlay(Image(systemName: "photo").foregroundColor(.secondary))
                }

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
    }

    private var addToCartBar: some View {
        // qty comes from your existing state (Int). If your file uses different name, update it.
        let safeQty = max(1, qty)

        return VStack(spacing: 10) {
            Divider().opacity(0.4)

            HStack(spacing: 12) {

                // Quantity controls (fixed hit area)
                HStack(spacing: 10) {
                    Button {
                        qty = max(1, qty - 1)
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(.secondary)
                    }
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())

                    Text("\(qty)")
                        .font(.system(size: 16, weight: .bold))
                        .frame(minWidth: 24)

                    Button {
                        qty += 1
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(.secondary)
                    }
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .frame(width: 150) // ✅ prevents overlap with the button

                // Add To Cart button (its own hit area)
                Button {
                    // A) Add to cart
                    cart.add(product: product, quantity: safeQty)
                    
                    // B) Navigate to Cart tab
                    withAnimation {
                        uiState.selectedTab = .cart
                    }
                    
                    // C) Close ProductDetails
                    dismiss()
                } label: {
                    Text(isAr ? "أضف إلى السلة" : "Add to Cart")
                        .font(.system(size: 16, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
                .background(Color(.systemGreen).opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .contentShape(Rectangle()) // ✅ ensures tap registers only here
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
        .background(Color(.systemBackground))
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
    }
}
