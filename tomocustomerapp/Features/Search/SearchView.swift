//
//  SearchView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct SearchView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var viewModel: HomeViewModel
    @EnvironmentObject var router: AppRouter
    @State private var searchText = ""
    
    private var isAr: Bool { languageManager.currentLanguage == .ar }
    
    // ✅ Updated: Filtered products based on search (AdminProduct)
    private var filteredProducts: [AdminProduct] {
        let q = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !q.isEmpty else { return [] }
        
        return viewModel.products.filter { p in
            let n = (isAr ? p.nameAr : p.nameEn).lowercased()
            return n.contains(q)
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
                // Search Bar
                searchBarSection
                    .padding(.top, 8)
                
                // Content
                if searchText.isEmpty {
                    // Empty State - No search yet
                    emptySearchState
                } else if filteredProducts.isEmpty {
                    // Empty State - No results
                    noResultsState
                } else {
                    // Search Results
                    searchResultsList
                }
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationTitle("search_title".localized)
            .navigationBarTitleDisplayMode(.large)
            .environment(\.layoutDirection, languageManager.currentLanguage.isRTL ? .rightToLeft : .leftToRight)
            .id(languageManager.currentLanguage)
    }
    
    // MARK: - Search Bar
    
    private var searchBarSection: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                .font(.system(size: 18))
            
            TextField("home_search_placeholder".localized, text: $searchText)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(size: 16))
                .autocapitalization(.none)
            
            if !searchText.isEmpty {
                Button(action: {
                    withAnimation {
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
    
    // MARK: - Empty Search State
    
    private var emptySearchState: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.5))
            
            Text("search_empty_title".localized)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.primary)
            
            Text("search_empty_subtitle".localized)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - No Results State
    
    private var noResultsState: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.5))
            
            Text("search_no_results".localized)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.primary)
            
            Text("search_no_results_subtitle".localized)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Search Results List
    
    private var searchResultsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredProducts) { product in
                    SearchResultRow(product: product, isAr: isAr)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
    }
}

// MARK: - Search Result Row

struct SearchResultRow: View {
    let product: AdminProduct
    let isAr: Bool
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    
    var body: some View {
        Button {
            router.push(.product(product))
        } label: {
            HStack(spacing: 16) {
                // Product Image
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.12))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Group {
                            if let imageUrl = product.resolvedPrimaryImage, let url = URL(string: imageUrl) {
                                AsyncImage(url: url) { phase in
                                    switch phase {
                                    case .success(let img):
                                        img.resizable().scaledToFill()
                                    default:
                                        Image(systemName: "photo")
                                            .font(.system(size: 30))
                                            .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.7))
                                    }
                                }
                            } else {
                                Image(systemName: "photo")
                                    .font(.system(size: 30))
                                    .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.7))
                            }
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Product Info
                VStack(alignment: .leading, spacing: 8) {
                    Text(isAr ? product.nameAr : product.nameEn)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(2)
                    
                    if !product.unit.isEmpty {
                        Text(product.unit)
                            .font(.system(size: 13))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    HStack(alignment: .bottom, spacing: 6) {
                        Text("\(product.currency) \(String(format: "%.2f", product.price))")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                    }
                }
                
                Spacer()
                
                Image(systemName: languageManager.chevronForward)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    SearchView()
        .environmentObject(LanguageManager())
        .environmentObject(HomeViewModel())
        .environmentObject(TomoCartManager())
}
