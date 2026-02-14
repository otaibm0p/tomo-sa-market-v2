//
//  RootTabView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct RootTabView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    @EnvironmentObject var cart: TomoCartManager
    
    var body: some View {
        TabView(selection: $uiState.selectedTab) {
            HomeView()
                .tabItem {
                    Label("tab_home".localized, systemImage: "house.fill")
                }
                .tag(AppTab.home)
            
            SearchView()
                .tabItem {
                    Label("tab_search".localized, systemImage: "magnifyingglass")
                }
                .tag(AppTab.search)
            
            CartView()
                .tabItem {
                    Label("tab_cart".localized, systemImage: "cart.fill")
                }
                .badge(cart.totalItems)
                .tag(AppTab.cart)
            
            OrdersView()
                .tabItem {
                    Label("tab_orders".localized, systemImage: "bag.fill")
                }
                .tag(AppTab.orders)
            
            ProfileView()
                .tabItem {
                    Label("tab_profile".localized, systemImage: "person.fill")
                }
                .tag(AppTab.profile)
        }
        .tabViewStyle(.automatic)
        .accentColor(Color(red: 0.2, green: 0.6, blue: 0.3))
        .onChange(of: uiState.selectedTab) { _, _ in
            router.reset()
        }
        .environment(\.layoutDirection, languageManager.currentLanguage.isRTL ? .rightToLeft : .leftToRight)
    }
}

#Preview {
    RootTabView()
        .environmentObject(LanguageManager())
}
