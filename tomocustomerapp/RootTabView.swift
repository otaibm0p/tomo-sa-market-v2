//
//  RootTabView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct RootTabView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("tab_home".localized, systemImage: "house.fill")
                }
                .tag(0)
            
            SearchView()
                .tabItem {
                    Label("tab_search".localized, systemImage: "magnifyingglass")
                }
                .tag(1)
            
            CartView()
                .tabItem {
                    Label("tab_cart".localized, systemImage: "cart.fill")
                }
                .tag(2)
            
            OrdersView()
                .tabItem {
                    Label("tab_orders".localized, systemImage: "bag.fill")
                }
                .tag(3)
            
            ProfileView()
                .tabItem {
                    Label("tab_profile".localized, systemImage: "person.fill")
                }
                .tag(4)
        }
        .tabViewStyle(.automatic)
        .accentColor(Color(red: 0.2, green: 0.6, blue: 0.3))
        .environment(\.layoutDirection, languageManager.currentLanguage == "ar" ? .rightToLeft : .leftToRight)
    }
}

#Preview {
    RootTabView()
        .environmentObject(LanguageManager.shared)
}
