//
//  tomocustomerappApp.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

@main
struct tomocustomerappApp: App {

    @StateObject private var session = AppSession()
    @StateObject private var router = AppRouter()
    @StateObject private var cart = TomoCartManager()
    @StateObject private var orderStore = OrderStore()
    @StateObject private var tracking = TrackingStore()
    @StateObject private var payments = PaymentStore()
    @StateObject private var languageManager = LanguageManager()
    @StateObject private var uiState = AppUIState()

    var body: some Scene {
        WindowGroup {
            Group {
                if session.isAuthenticated {
                    RootShellView()
                } else {
                    AuthFlowView()
                }
            }
            .environmentObject(session)
            .environmentObject(router)
            .environmentObject(cart)
            .environmentObject(orderStore)
            .environmentObject(tracking)
            .environmentObject(payments)
            .environmentObject(languageManager)
            .environmentObject(uiState)
            .applyGlobalLanguage(languageManager)
            .id(languageManager.currentLanguage)
        }
    }
}
