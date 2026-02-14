//
//  LanguageManager.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import SwiftUI
import Combine

enum AppLanguage: String, CaseIterable, Identifiable {
    case en = "en"
    case ar = "ar"
    var id: String { rawValue }

    var title: String { self == .ar ? "AR" : "EN" }
    var isRTL: Bool { self == .ar }
}

final class LanguageManager: ObservableObject {
    
    // Singleton support (for backward compatibility)
    static let shared = LanguageManager()
    
    // ✅ Persist automatically
    @AppStorage("tomo.language") private var storedLanguage: String = "ar"
    
    @Published var currentLanguage: AppLanguage {
        didSet { storedLanguage = currentLanguage.rawValue }
    }
    
    var layoutDirection: LayoutDirection {
        currentLanguage == .ar ? .rightToLeft : .leftToRight
    }
    
    var locale: Locale {
        Locale(identifier: currentLanguage.rawValue)
    }
    
    // Backward compatibility: String-based access
    var currentLanguageString: String {
        get { currentLanguage.rawValue }
        set {
            if let lang = AppLanguage(rawValue: newValue) {
                currentLanguage = lang
            }
        }
    }
    
    private let supportedLanguages = ["en", "ar"]
    private let languageKey = "app_language"

    init() {
        // Try new key first, then old key, then default
        let saved = UserDefaults.standard.string(forKey: "tomo.language") 
                ?? UserDefaults.standard.string(forKey: languageKey)
                ?? "ar"
        self.currentLanguage = AppLanguage(rawValue: saved) ?? .ar
        // Sync with @AppStorage
        self.storedLanguage = self.currentLanguage.rawValue
    }
    
    // Backward compatibility: setLanguage method
    func setLanguage(_ language: String) {
        guard supportedLanguages.contains(language) else { return }
        if let lang = AppLanguage(rawValue: language) {
            currentLanguage = lang
        }
    }
    
    var isRTL: Bool {
        return currentLanguage == .ar
    }
    
    var isArabic: Bool {
        return currentLanguage == .ar
    }
    
    var languageName: String {
        switch currentLanguage {
        case .ar:
            return "العربية"
        case .en:
            return "English"
        }
    }
    
    // ✅ Smart chevrons
    var chevronForward: String { currentLanguage.isRTL ? "chevron.left" : "chevron.right" }
    var chevronBack: String { currentLanguage.isRTL ? "chevron.right" : "chevron.left" }

    // Minimal strings for Auth (expand later)
    func t(_ key: String) -> String {
        switch (currentLanguage, key) {

        // Auth
        case (.en, "auth_title"): return "Sign in to start shopping"
        case (.ar, "auth_title"): return "سجّل دخولك للبدء بالتسوق"

        case (.en, "phone_otp"): return "Continue with Phone (OTP)"
        case (.ar, "phone_otp"): return "المتابعة برقم الجوال (OTP)"

        case (.en, "email"): return "Continue with Email"
        case (.ar, "email"): return "المتابعة بالبريد الإلكتروني"

        case (.en, "apple"): return "Continue with Apple"
        case (.ar, "apple"): return "المتابعة عبر Apple"

        case (.en, "google"): return "Continue with Google"
        case (.ar, "google"): return "المتابعة عبر Google"

        case (.en, "terms"): return "By continuing, you agree to TOMO Terms & Privacy."
        case (.ar, "terms"): return "بالمتابعة، أنت توافق على شروط وأحكام TOMO وسياسة الخصوصية."

        case (.en, "mock_otp"): return "Mock OTP code: 123456"
        case (.ar, "mock_otp"): return "رمز OTP التجريبي: 123456"

        // Profile
        case (.en, "profile_title"): return "Profile"
        case (.ar, "profile_title"): return "الملف الشخصي"

        case (.en, "provider"): return "Provider"
        case (.ar, "provider"): return "المزود"

        case (.en, "phone"): return "Phone"
        case (.ar, "phone"): return "الجوال"

        case (.en, "email"): return "Email"
        case (.ar, "email"): return "البريد"

        case (.en, "addresses"): return "Addresses"
        case (.ar, "addresses"): return "العناوين"

        case (.en, "payment_methods"): return "Payment Methods"
        case (.ar, "payment_methods"): return "طرق الدفع"

        case (.en, "settings"): return "Settings"
        case (.ar, "settings"): return "الإعدادات"

        case (.en, "support"): return "Support"
        case (.ar, "support"): return "الدعم"

        case (.en, "logout"): return "Logout"
        case (.ar, "logout"): return "تسجيل الخروج"

        // Addresses screen
        case (.en, "addresses_title"): return "Addresses"
        case (.ar, "addresses_title"): return "العناوين"

        case (.en, "add_address"): return "Add Address"
        case (.ar, "add_address"): return "إضافة عنوان"

        case (.en, "new_address_mock"): return "New Address (mock) • ..."
        case (.ar, "new_address_mock"): return "عنوان جديد (تجريبي) • ..."

        // Payments screen
        case (.en, "payments_title"): return "Payment Methods"
        case (.ar, "payments_title"): return "طرق الدفع"

        case (.en, "preferred"): return "Preferred"
        case (.ar, "preferred"): return "المفضلة"

        case (.en, "apple_pay_when_enabled"): return "Apple Pay (when enabled)"
        case (.ar, "apple_pay_when_enabled"): return "Apple Pay (عند تفعيله)"

        case (.en, "saved_cards"): return "Saved Cards"
        case (.ar, "saved_cards"): return "البطاقات المحفوظة"

        case (.en, "add_card_mock"): return "Add Card (mock)"
        case (.ar, "add_card_mock"): return "إضافة بطاقة (تجريبي)"

        // Settings screen
        case (.en, "settings_title"): return "Settings"
        case (.ar, "settings_title"): return "الإعدادات"

        case (.en, "general"): return "General"
        case (.ar, "general"): return "عام"

        case (.en, "language_hint"): return "Language (use globe button)"
        case (.ar, "language_hint"): return "اللغة (استخدم زر الكرة الأرضية)"

        case (.en, "notifications_later"): return "Notifications (later)"
        case (.ar, "notifications_later"): return "الإشعارات (لاحقاً)"

        case (.en, "legal"): return "Legal"
        case (.ar, "legal"): return "قانوني"

        case (.en, "terms_privacy_later"): return "Terms & Privacy (later)"
        case (.ar, "terms_privacy_later"): return "الشروط والخصوصية (لاحقاً)"

        // Support screen
        case (.en, "support_title"): return "Support"
        case (.ar, "support_title"): return "الدعم"

        case (.en, "support_subtitle"): return "Contact us via WhatsApp / Email (mock for now)."
        case (.ar, "support_subtitle"): return "تواصل معنا عبر واتساب / البريد (تجريبي حالياً)."

        default:
            return key
        }
    }
    
    // L10n integration
    func l(_ key: L10nKey) -> String {
        L10n.text(key, lang: currentLanguage)
    }
}
