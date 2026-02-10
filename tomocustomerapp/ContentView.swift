//
//  ContentView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct ContentView: View {
    @ObservedObject private var languageManager = LanguageManager.shared
    @State private var searchText = ""
    
    let categories = [
        CategoryItem(name: "Vegetables", icon: "carrot.fill", color: Color(red: 0.2, green: 0.7, blue: 0.3)),
        CategoryItem(name: "Fruits", icon: "apple.fill", color: Color(red: 0.9, green: 0.3, blue: 0.2)),
        CategoryItem(name: "Meat", icon: "fork.knife", color: Color(red: 0.8, green: 0.2, blue: 0.2)),
        CategoryItem(name: "Dairy", icon: "drop.fill", color: Color(red: 0.9, green: 0.9, blue: 0.95)),
        CategoryItem(name: "Bakery", icon: "birthday.cake.fill", color: Color(red: 0.9, green: 0.7, blue: 0.4)),
        CategoryItem(name: "Beverages", icon: "cup.and.saucer.fill", color: Color(red: 0.3, green: 0.5, blue: 0.8)),
        CategoryItem(name: "Snacks", icon: "bag.fill", color: Color(red: 0.8, green: 0.6, blue: 0.2)),
        CategoryItem(name: "Frozen", icon: "snowflake", color: Color(red: 0.4, green: 0.7, blue: 0.9))
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                            .padding(.leading, 12)
                        
                        TextField("home_search_placeholder".localized, text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                            .padding(.vertical, 12)
                        
                        if !searchText.isEmpty {
                            Button(action: {
                                searchText = ""
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.gray)
                                    .padding(.trailing, 12)
                            }
                        }
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 2)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    
                    // Categories Grid
                    VStack(alignment: .leading, spacing: 16) {
                        Text("home_categories".localized)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                            .padding(.horizontal, 16)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16)
                        ], spacing: 16) {
                            ForEach(categories, id: \.name) { category in
                                CategoryCard(category: category)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.top, 8)
                }
                .padding(.bottom, 20)
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
            .environment(\.layoutDirection, languageManager.isArabic ? .rightToLeft : .leftToRight)
        }
        .id(languageManager.currentLanguage) // Force refresh on language change
    }
}

struct CategoryItem {
    let name: String
    let icon: String
    let color: Color
}

struct CategoryCard: View {
    let category: CategoryItem
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(category.color.opacity(0.2))
                    .frame(width: 60, height: 60)
                
                Image(systemName: category.icon)
                    .font(.system(size: 28))
                    .foregroundColor(category.color)
            }
            
            Text(category.name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

#Preview {
    ContentView()
}
