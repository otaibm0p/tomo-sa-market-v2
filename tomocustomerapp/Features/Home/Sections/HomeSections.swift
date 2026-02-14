//
//  HomeSections.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct BannerCard: View {
    let banner: Banner

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.green.opacity(0.18))
                .frame(width: 280, height: 120)

            Text(banner.title)
                .font(.headline)
                .padding(14)
        }
    }
}

struct HeaderSection: View {
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    @State private var showDebug = false
    @State private var tapCount = 0
    @State private var lastTapTime = Date()

    var body: some View {
        HStack(spacing: 10) {

            #if DEBUG
            Button {
                let now = Date()
                if now.timeIntervalSince(lastTapTime) < 1.0 {
                    tapCount += 1
                } else {
                    tapCount = 1
                }
                lastTapTime = now
                
                if tapCount >= 5 {
                    showDebug = true
                    tapCount = 0
                }
            } label: {
                Text("TOMO")
                    .font(.system(size: 28, weight: .bold))
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $showDebug) {
                DebugPanel()
            }
            #else
            Text("TOMO")
                .font(.system(size: 28, weight: .bold))
            #endif

            Spacer()

            // Orders button
            Button {
                uiState.selectedTab = .orders
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "clock.arrow.circlepath")
                    Text("Orders")
                        .font(.system(size: 13, weight: .bold))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .cornerRadius(14)
            }
            .buttonStyle(.plain)

            // Profile button
            Button {
                uiState.selectedTab = .profile
            } label: {
                Image(systemName: "person.crop.circle")
                    .font(.system(size: 18, weight: .semibold))
                    .padding(10)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
            }
            .buttonStyle(.plain)

            // Notifications icon (keep)
            Button {
                // TODO later
            } label: {
                Image(systemName: "bell")
                    .font(.system(size: 16, weight: .semibold))
                    .padding(10)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
    }
}

struct SearchSection: View {
    @Binding var searchText: String
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    
    var body: some View {
        Button {
            uiState.selectedTab = .search
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                    .font(.system(size: 18))
                
                Text("home_search_placeholder".localized)
                    .foregroundColor(.secondary)
                    .font(.system(size: 16))
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 20)
    }
}

struct BannerSection: View {
    let banners: [Banner]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(banners) { banner in
                    BannerCard(banner: banner)
                }
            }
            .padding(.horizontal, 20)
        }
    }
}

struct CategoriesGridSection: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    let categories: [AdminCategory]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(languageManager.isArabic ? "الأقسام" : "Categories")
                .font(.headline)
                .padding(.horizontal, 20)
            
            let cols = [GridItem(.adaptive(minimum: 110), spacing: 12)]
            LazyVGrid(columns: cols, spacing: 12) {
                ForEach(categories) { category in
                    CategoryCard(category: category, router: router, languageManager: languageManager)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 20)
        }
    }
}

struct FeaturedProductsSection: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var cart: TomoCartManager
    let products: [AdminProduct]

    init(products: [AdminProduct] = []) {
        self.products = products
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(languageManager.isArabic ? "منتجات مميزة" : "Featured Products")
                .font(.headline)
                .padding(.horizontal, 20)
            
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    if products.isEmpty {
                        Text("No featured products")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .frame(height: 200)
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(products) { product in
                            Button {
                                router.push(.product(product))
                            } label: {
                                ProductCard(product: product) {
                                    cart.add(product)
                                }
                                .environmentObject(languageManager)
                            }
                            .buttonStyle(.plain)
                            .frame(width: 170, height: 220)
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
            .frame(height: 240)
        }
    }
}
