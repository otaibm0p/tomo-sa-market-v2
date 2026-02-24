//
//  ContentView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var languageManager = LanguageManager.shared
    @EnvironmentObject private var cart: TomoCartManager
    @EnvironmentObject private var router: AppRouter
    @EnvironmentObject private var uiState: AppUIState
    
    var body: some View {
        TabView(selection: $uiState.selectedTab) {
            // Home Tab
            HomeView()
                .tabItem {
                    Label("tab_home".localized, systemImage: "house.fill")
                }
                .tag(AppTab.home)
            
            // Search Tab
            SearchView()
                .tabItem {
                    Label("tab_search".localized, systemImage: "magnifyingglass")
                }
                .tag(AppTab.search)
            
            // Cart Tab
            CartView()
                .tabItem {
                    Label("tab_cart".localized, systemImage: "cart.fill")
                }
                .badge(cart.totalItems)
                .tag(AppTab.cart)
            
            // Orders Tab
            OrdersView()
                .tabItem {
                    Label("tab_orders".localized, systemImage: "bag.fill")
                }
                .tag(AppTab.orders)
            
            // Profile Tab
            ProfileView()
                .tabItem {
                    Label("tab_profile".localized, systemImage: "person.fill")
                }
                .tag(AppTab.profile)
        }
        .tabViewStyle(.automatic)
        .accentColor(Color(red: 0.2, green: 0.6, blue: 0.3))
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarBackground(Color.white, for: .tabBar)
        .onChange(of: uiState.selectedTab) { _, _ in
            router.reset()
        }
        .environmentObject(languageManager)
        .environment(\.layoutDirection, languageManager.currentLanguage.isRTL ? .rightToLeft : .leftToRight)
        .id(languageManager.currentLanguage) // Force refresh on language change
    }
}

#Preview {
    ContentView()
        .environmentObject(LanguageManager())
        .environmentObject(TomoCartManager())
}
