//
//  LanguageUI.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct LanguageMenuButton: View {
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        Menu {
            Button {
                withAnimation(.easeInOut(duration: 0.20)) {
                    languageManager.currentLanguage = .ar
                }
            } label: {
                Text("العربية")
            }

            Button {
                withAnimation(.easeInOut(duration: 0.20)) {
                    languageManager.currentLanguage = .en
                }
            } label: {
                Text("English")
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "globe")
                Text(languageManager.currentLanguage.title)
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundColor(.primary)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

// ✅ IMPORTANT: no @EnvironmentObject here
struct GlobalLanguageModifier: ViewModifier {
    let languageManager: LanguageManager

    func body(content: Content) -> some View {
        content
            .environment(\.layoutDirection, languageManager.layoutDirection)
            .environment(\.locale, languageManager.locale)
            .animation(.easeInOut(duration: 0.20), value: languageManager.currentLanguage)
    }
}

extension View {
    // ✅ IMPORTANT: manager must be passed explicitly
    func applyGlobalLanguage(_ languageManager: LanguageManager) -> some View {
        self.modifier(GlobalLanguageModifier(languageManager: languageManager))
    }
}
