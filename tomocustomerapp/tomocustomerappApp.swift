//
//  tomocustomerappApp.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

@main
struct tomocustomerappApp: App {
    @StateObject private var languageManager = LanguageManager.shared
    
    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(languageManager)
                .id(languageManager.currentLanguage) // Force refresh on language change
        }
    }
}
