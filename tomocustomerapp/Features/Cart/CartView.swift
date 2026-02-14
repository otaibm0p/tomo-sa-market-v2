//
//  CartView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct CartView: View {
    @EnvironmentObject var cart: TomoCartManager
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        VStack(spacing: 0) {

            if cart.items.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "cart")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundColor(.gray)

                    Text("Your Cart is Empty")
                        .font(.system(size: 22, weight: .bold))

                    Text("Add items to start your order.")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.secondary)

                    Spacer()
                }
                .padding(.top, 50)

            } else {

                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(cart.items) { item in
                            CartLineItemRow(
                                item: item,
                                onPlus: { cart.increase(item) },
                                onMinus: { cart.decrease(item) },
                                onRemove: { cart.remove(item) }
                            )
                        }
                    }
                    .padding(.top, 10)

                    // Summary
                    VStack(spacing: 10) {
                        HStack {
                            Text("Subtotal")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(cart.subtotalText)
                                .font(.system(size: 15, weight: .bold))
                        }

                        HStack {
                            Text("Delivery")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("SAR 0.00")
                                .font(.system(size: 15, weight: .bold))
                        }

                        Divider()

                        HStack {
                            Text("Total")
                                .font(.system(size: 16, weight: .bold))
                            Spacer()
                            Text(cart.subtotalText)
                                .font(.system(size: 16, weight: .bold))
                        }
                    }
                    .padding(14)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(18)
                    .padding(.horizontal)
                    .padding(.top, 6)

                    // Continue Shopping Button
                    ContinueShoppingButton()
                        .padding(.horizontal)
                        .padding(.top, 10)

                    // Recommended Products
                    RecommendedProductsSection(viewModel: viewModel)
                        .padding(.horizontal)
                        .padding(.top, 6)

                    Spacer(minLength: 120)
                }
            }
        }
        .navigationTitle(languageManager.isArabic ? "السلة" : "Cart")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if !cart.items.isEmpty {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        // ⭐️ Navigation Hard Fix — Global UX
                        withAnimation(.easeInOut(duration: 0.25)) {
                        uiState.selectedTab = .home
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: languageManager.chevronBack)
                            Text(continueShoppingText)
                                .font(.system(size: 12, weight: .bold))
                        }
                    }
                    .buttonStyle(.plain)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(languageManager.isArabic ? "مسح" : "Clear") { cart.clear() }
                }
            }
        }
        .task {
            await viewModel.loadHome()
        }
        .environment(\.layoutDirection, languageManager.currentLanguage.isRTL ? .rightToLeft : .leftToRight)
        .safeAreaInset(edge: .bottom) {
            if !cart.items.isEmpty {
                Button {
                    guard !cart.items.isEmpty else { return }
                    // ✅ No async needed - router.push is synchronous
                    router.push(.checkout)
                } label: {
                    HStack {
                        Spacer()
                        Text("Checkout • \(cart.subtotalText)")
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
        .id(languageManager.currentLanguage)
    }
    
    // MARK: - Helpers
    
    private var continueShoppingText: String {
        languageManager.currentLanguage == .ar ? "متابعة التسوق" : "Continue Shopping"
    }
}

// MARK: - Continue Shopping Button

struct ContinueShoppingButton: View {
    @EnvironmentObject var uiState: AppUIState
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        Button {
            // ⭐️ Navigation Hard Fix — Global UX
            withAnimation(.easeInOut(duration: 0.25)) {
            uiState.selectedTab = .home
            }
        } label: {
            HStack {
                Image(systemName: "bag")
                Text(languageManager.currentLanguage == .ar ? "اكمل التسوق" : "Continue Shopping")
                    .font(.system(size: 14, weight: .bold))
                Spacer()
                Image(systemName: languageManager.chevronForward)
            }
            .foregroundColor(.primary)
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Recommended Products Section

struct RecommendedProductsSection: View {
    @ObservedObject var viewModel: HomeViewModel
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var cart: TomoCartManager

    var title: String {
        languageManager.currentLanguage == .ar ? "قد يعجبك أيضاً" : "You may also like"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            Text(title)
                .font(.system(size: 16, weight: .bold))
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.featuredProducts.prefix(6)) { product in
                        VStack(alignment: .leading, spacing: 6) {

                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.secondarySystemBackground))
                                .frame(width: 120, height: 90)
                                .overlay(
                                    Group {
                                        if let imageUrl = product.resolvedPrimaryImage, let url = URL(string: imageUrl) {
                                            AsyncImage(url: url) { phase in
                                                switch phase {
                                                case .success(let img):
                                                    img.resizable().scaledToFill()
                                                default:
                                                    Image(systemName: "photo")
                                                        .font(.system(size: 24))
                                                        .foregroundColor(.secondary)
                                                }
                                            }
                                        } else {
                                            Image(systemName: "photo")
                                                .font(.system(size: 24))
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12))

                            Text(languageManager.currentLanguage == .ar ? product.nameAr : product.nameEn)
                                .font(.system(size: 12, weight: .bold))
                                .lineLimit(1)

                            Text("\(product.currency) \(String(format: "%.2f", product.price))")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)

                            Button {
                                cart.add(product)
                            } label: {
                                Text(languageManager.currentLanguage == .ar ? "أضف" : "Add")
                                    .font(.system(size: 11, weight: .bold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 6)
                                    .background(Color.green.opacity(0.9))
                                    .foregroundColor(.white)
                                    .cornerRadius(8)
                            }
                        }
                        .frame(width: 120)
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.top, 6)
    }
}

#Preview {
    CartView()
        .environmentObject(TomoCartManager())
        .environmentObject(LanguageManager())
        .environmentObject(AppRouter())
}
