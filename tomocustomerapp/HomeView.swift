//
//  HomeView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

// MARK: - HomeView
// All data displayed here comes from HomeViewModel
// HomeViewModel fetches data from Admin API
// Admin controls: Banners, Categories, Featured Products
// No hardcoded data - everything is Admin-controlled

struct HomeView: View {
    // Centralized ViewModel - single source of truth for all Home data
    @StateObject private var viewModel = HomeViewModel()
    @ObservedObject private var languageManager = LanguageManager.shared
    @State private var searchText = ""
    @State private var contentAppeared = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Header Section (Title + Location Icon)
                    headerSection
                        .opacity(contentAppeared ? 1 : 0)
                        .scaleEffect(contentAppeared ? 1 : 0.95)
                        .animation(.easeOut(duration: 0.4).delay(0.1), value: contentAppeared)
                    
                    // Search Bar
                    searchSection
                        .padding(.top, 20)
                        .opacity(contentAppeared ? 1 : 0)
                        .scaleEffect(contentAppeared ? 1 : 0.95)
                        .animation(.easeOut(duration: 0.4).delay(0.15), value: contentAppeared)
                    
                    if viewModel.isLoading {
                        loadingContent
                    } else if let errorMessage = viewModel.errorMessage {
                        errorSection(message: errorMessage)
                            .padding(.top, 60)
                    } else {
                        contentSections
                    }
                }
                .padding(.bottom, 24)
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("app_title".localized)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                }
            }
            .task {
                await viewModel.loadHome()
                withAnimation {
                    contentAppeared = true
                }
            }
            .environment(\.layoutDirection, languageManager.isArabic ? .rightToLeft : .leftToRight)
        }
        .id(languageManager.currentLanguage) // Force refresh on language change
    }
    
    // MARK: - Loading Content
    
    private var loadingContent: some View {
        VStack(spacing: 24) {
            // Banner Skeleton
            bannerSkeletonSection
                .padding(.top, 20)
            
            // Categories Skeleton
            categoriesSkeletonSection
                .padding(.top, 24)
        }
    }
    
    // MARK: - Content Sections
    
    @ViewBuilder
    private var contentSections: some View {
        // Banners Slider
        if !viewModel.banners.isEmpty {
            bannersSection
                .padding(.top, 24)
                .opacity(contentAppeared ? 1 : 0)
                .scaleEffect(contentAppeared ? 1 : 0.96)
                .animation(.easeOut(duration: 0.5).delay(0.2), value: contentAppeared)
        }
        
        // Categories Grid
        if !viewModel.categories.isEmpty {
            categoriesSection
                .padding(.top, 32)
                .opacity(contentAppeared ? 1 : 0)
                .scaleEffect(contentAppeared ? 1 : 0.96)
                .animation(.easeOut(duration: 0.5).delay(0.3), value: contentAppeared)
        }
        
        // Featured Products
        if !viewModel.featuredProducts.isEmpty {
            featuredProductsSection
                .padding(.top, 32)
                .opacity(contentAppeared ? 1 : 0)
                .scaleEffect(contentAppeared ? 1 : 0.96)
                .animation(.easeOut(duration: 0.5).delay(0.4), value: contentAppeared)
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("app_title".localized)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.primary)
                
                HStack(spacing: 6) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                    
                    Text("home_delivery_location".localized)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Button(action: {
                // Location action
            }) {
                Image(systemName: "location.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                    .frame(width: 44, height: 44)
                    .background(Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.1))
                    .cornerRadius(12)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }
    
    // MARK: - Search Section
    
    private var searchSection: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                .font(.system(size: 18))
            
            TextField("home_search_placeholder".localized, text: $searchText)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(size: 16))
            
            if !searchText.isEmpty {
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        searchText = ""
                    }
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                        .font(.system(size: 18))
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 2)
        .padding(.horizontal, 20)
    }
    
    // MARK: - Banners Section
    
    private var bannersSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(Array(viewModel.banners.enumerated()), id: \.element.id) { index, banner in
                    BannerCard(banner: banner)
                        .opacity(contentAppeared ? 1 : 0)
                        .scaleEffect(contentAppeared ? 1 : 0.9)
                        .animation(.easeOut(duration: 0.4).delay(0.25 + Double(index) * 0.1), value: contentAppeared)
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - Banner Skeleton
    
    private var bannerSkeletonSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(0..<3, id: \.self) { _ in
                    SkeletonBannerCard()
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - Categories Section
    
    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("home_categories".localized)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.primary)
                .padding(.horizontal, 20)
            
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(Array(viewModel.categories.prefix(8).enumerated()), id: \.element.id) { index, category in
                    CategoryCard(category: CategoryItem(name: category.name, icon: category.icon, color: category.color))
                        .opacity(contentAppeared ? 1 : 0)
                        .scaleEffect(contentAppeared ? 1 : 0.9)
                        .animation(.easeOut(duration: 0.3).delay(0.35 + Double(index) * 0.03), value: contentAppeared)
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - Categories Skeleton
    
    private var categoriesSkeletonSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            SkeletonText(width: 120, height: 24)
                .padding(.horizontal, 20)
            
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12),
                GridItem(.flexible(), spacing: 12)
            ], spacing: 12) {
                ForEach(0..<8, id: \.self) { _ in
                    SkeletonCategoryCard()
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    // MARK: - Featured Products Section
    
    private var featuredProductsSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("home_featured_products".localized)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Button(action: {
                    // See all action
                }) {
                    Text("home_see_all".localized)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                }
            }
            .padding(.horizontal, 20)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(Array(viewModel.featuredProducts.enumerated()), id: \.element.id) { index, product in
                        ProductCard(product: product)
                            .opacity(contentAppeared ? 1 : 0)
                            .scaleEffect(contentAppeared ? 1 : 0.9)
                            .animation(.easeOut(duration: 0.4).delay(0.45 + Double(index) * 0.08), value: contentAppeared)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
    
    // MARK: - Error Section
    
    private func errorSection(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.orange)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
    }
}

// MARK: - Skeleton Views

struct SkeletonBannerCard: View {
    @State private var isAnimating = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.gray.opacity(0.15))
            .frame(height: 180)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0),
                                Color.white.opacity(0.3),
                                Color.white.opacity(0)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .offset(x: isAnimating ? 200 : -200)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}

struct SkeletonCategoryCard: View {
    @State private var isAnimating = false
    
    var body: some View {
        VStack(spacing: 10) {
            Circle()
                .fill(Color.gray.opacity(0.15))
                .frame(width: 64, height: 64)
                .overlay(
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0),
                                    Color.white.opacity(0.4),
                                    Color.white.opacity(0)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .rotationEffect(.degrees(isAnimating ? 360 : 0))
                )
            
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.gray.opacity(0.15))
                .frame(height: 12)
                .frame(maxWidth: 60)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .onAppear {
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                isAnimating = true
            }
        }
    }
}

struct SkeletonText: View {
    let width: CGFloat
    let height: CGFloat
    @State private var isAnimating = false
    
    var body: some View {
        RoundedRectangle(cornerRadius: 6)
            .fill(Color.gray.opacity(0.15))
            .frame(width: width, height: height)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0),
                                Color.white.opacity(0.3),
                                Color.white.opacity(0)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .offset(x: isAnimating ? width : -width)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
    }
}

// MARK: - Banner Card

struct BannerCard: View {
    let banner: Banner
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.8),
                            Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.6)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 180)
            
            VStack {
                Spacer()
                Text(banner.title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
            }
        }
        .shadow(color: Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
    }
}

// MARK: - Product Card

struct ProductCard: View {
    let product: Product
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Product Image
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.12))
                    .frame(width: 160, height: 160)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.system(size: 50))
                            .foregroundColor(.gray.opacity(0.4))
                    )
                
                if let discount = product.discountPercentage {
                    Text("-\(discount)%")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red)
                        .cornerRadius(6)
                        .padding(8)
                }
            }
            
            // Product Info
            VStack(alignment: .leading, spacing: 8) {
                Text(product.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .frame(height: 36, alignment: .top)
                
                HStack(alignment: .bottom, spacing: 6) {
                    Text("$\(product.formattedPrice)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                    
                    if let originalPrice = product.originalPrice {
                        Text("$\(String(format: "%.2f", originalPrice))")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .strikethrough()
                    }
                }
            }
            .padding(.top, 12)
        }
        .frame(width: 160)
        .padding(12)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 3)
    }
}

#Preview {
    HomeView()
}
