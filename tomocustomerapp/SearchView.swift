//
//  SearchView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct SearchView: View {
    @State private var searchText = ""
    @State private var recentSearches = ["Tomatoes", "Bananas", "Chicken", "Milk"]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                        .padding(.leading, 12)
                    
                    TextField("Search products...", text: $searchText)
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
                
                if searchText.isEmpty {
                    // Recent Searches
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Searches")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                            .padding(.horizontal, 16)
                        
                        ForEach(recentSearches, id: \.self) { search in
                            Button(action: {
                                searchText = search
                            }) {
                                HStack {
                                    Image(systemName: "clock")
                                        .foregroundColor(.gray)
                                    Text(search)
                                        .foregroundColor(.primary)
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color.white)
                            }
                        }
                    }
                    .padding(.top, 20)
                } else {
                    // Search Results
                    ScrollView {
                        VStack(spacing: 16) {
                            Text("Search results for: \(searchText)")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.secondary)
                                .padding(.top, 20)
                            
                            Text("No results found")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                                .padding(.top, 40)
                        }
                    }
                }
                
                Spacer()
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationTitle("search_title".localized)
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

#Preview {
    SearchView()
}
