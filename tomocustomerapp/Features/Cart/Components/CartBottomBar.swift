//
//  CartBottomBar.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CartBottomBar: View {
    let itemCount: Int
    let totalText: String
    let languageManager: LanguageManager
    @EnvironmentObject var uiState: AppUIState
    var onDismiss: (() -> Void)?

    var body: some View {
        Button {
            uiState.selectedTab = .cart
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.18))
                        .frame(width: 28, height: 28)

                    Image(systemName: "cart.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(languageManager.isArabic ? "عرض السلة" : "View Cart")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)

                    Text(languageManager.isArabic ? "• \(itemCount) عنصر • \(totalText)" : "• \(itemCount) item\(itemCount == 1 ? "" : "s") • \(totalText)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                if let onDismiss = onDismiss {
                    Button {
                        onDismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.9))
                            .padding(6)
                    }
                    .buttonStyle(.plain)
                } else {
                    Image(systemName: languageManager.isArabic ? "chevron.left" : "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white.opacity(0.9))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.10, green: 0.45, blue: 0.25), Color(red: 0.05, green: 0.30, blue: 0.15)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.14), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
    }
}
