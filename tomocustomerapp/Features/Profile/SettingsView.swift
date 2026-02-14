//
//  SettingsView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        List {
            Section(languageManager.t("general")) {
                Text(languageManager.t("language_hint"))
                Text(languageManager.t("notifications_later"))
            }
            Section(languageManager.t("legal")) {
                Text(languageManager.t("terms_privacy_later"))
            }
        }
        .navigationTitle(languageManager.t("settings_title"))
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environmentObject(LanguageManager())
    }
}
