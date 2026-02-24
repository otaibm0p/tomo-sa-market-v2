//
//  ProfileRow.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct ProfileRow: View {
    @EnvironmentObject var languageManager: LanguageManager
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .frame(width: 24)
                    .foregroundColor(.secondary)

                Text(title)
                    .font(.system(size: 14, weight: .bold))

                Spacer()
                Image(systemName: languageManager.chevronForward)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 12)
            .background(Color(.systemGray6))
            .cornerRadius(14)
        }
        .buttonStyle(.plain)
    }
}
