//
//  String+Localized.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import Foundation

extension String {
    /// Returns a localized string using NSLocalizedString with current language
    var localized: String {
        let language = LanguageManager.shared.currentLanguageString
        guard let path = Bundle.main.path(forResource: language, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            // Fallback to default localization
            return NSLocalizedString(self, comment: "")
        }
        return bundle.localizedString(forKey: self, value: nil, table: nil)
    }
    
    /// Returns a localized string with arguments
    func localized(with arguments: CVarArg...) -> String {
        return String(format: self.localized, arguments: arguments)
    }
}
