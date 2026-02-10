//
//  LanguageManager.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation
import SwiftUI
import Combine

class LanguageManager: ObservableObject {
    static let shared = LanguageManager()
    
    @Published var currentLanguage: String
    
    private let supportedLanguages = ["en", "ar"]
    private let languageKey = "app_language"
    
    private init() {
        // Initialize currentLanguage safely using UserDefaults with fallback to system language
        if let savedLanguage = UserDefaults.standard.string(forKey: languageKey),
           supportedLanguages.contains(savedLanguage) {
            self.currentLanguage = savedLanguage
        } else {
            // Get system language as fallback
            let systemLanguage = Locale.preferredLanguages.first ?? "en"
            if systemLanguage.hasPrefix("ar") {
                self.currentLanguage = "ar"
            } else {
                self.currentLanguage = "en"
            }
        }
    }
    
    func setLanguage(_ language: String) {
        guard supportedLanguages.contains(language) else { return }
        currentLanguage = language
        // Save to UserDefaults when language changes
        UserDefaults.standard.set(currentLanguage, forKey: languageKey)
        UserDefaults.standard.synchronize()
    }
    
    var isRTL: Bool {
        return currentLanguage == "ar"
    }
    
    var isArabic: Bool {
        return currentLanguage == "ar"
    }
    
    var languageName: String {
        switch currentLanguage {
        case "ar":
            return "العربية"
        case "en":
            return "English"
        default:
            return "English"
        }
    }
}
