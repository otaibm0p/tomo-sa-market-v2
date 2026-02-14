//
//  SupportView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct SupportView: View {
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "headset")
                .font(.system(size: 42))
                .foregroundColor(.secondary)

            Text(languageManager.t("support_title"))
                .font(.system(size: 18, weight: .bold))

            Text(languageManager.t("support_subtitle"))
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()
        }
        .padding()
        .navigationTitle(languageManager.t("support_title"))
    }
}

#Preview {
    NavigationStack {
        SupportView()
            .environmentObject(LanguageManager())
    }
}
