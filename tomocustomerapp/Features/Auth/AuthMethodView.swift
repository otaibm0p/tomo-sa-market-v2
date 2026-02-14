//
//  AuthMethodView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

enum AuthMethodAction {
    case phone
    case email
    case apple
    case google
}

struct AuthMethodView: View {

    @EnvironmentObject var languageManager: LanguageManager
    let onAction: (AuthMethodAction) -> Void

    var body: some View {
        VStack(spacing: 14) {

            HStack {
                Spacer()
                LanguageMenuButton()
            }
            .padding(.top, 6)

            Spacer(minLength: 10)

            Text("TOMO")
                .font(.system(size: 34, weight: .bold))
                .foregroundColor(Color(red: 0.10, green: 0.45, blue: 0.25))

            Text(languageManager.t("auth_title"))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.secondary)

            VStack(spacing: 10) {

                primaryButton(languageManager.t("phone_otp"), icon: "phone.fill") {
                    onAction(.phone)
                }

                primaryButton(languageManager.t("email"), icon: "envelope.fill") {
                    onAction(.email)
                }

                Divider().padding(.horizontal)

                secondaryButton(languageManager.t("apple"), icon: "apple.logo") {
                    onAction(.apple)
                }

                secondaryButton(languageManager.t("google"), icon: "g.circle.fill") {
                    onAction(.google)
                }

                Text("Apple/Google are mock for now. We will connect real sign-in later.")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Text(languageManager.t("mock_otp"))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(.top, 4)
            }
            .padding(.top, 10)

            Spacer()

            Text(languageManager.t("terms"))
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.secondary)
                .padding(.bottom, 10)
        }
        .padding(.horizontal)
    }


    private func primaryButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                Text(title).font(.system(size: 15, weight: .bold))
                Spacer()
                Image(systemName: languageManager.chevronForward)
            }
            .foregroundColor(.white)
            .padding(14)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.10, green: 0.45, blue: 0.25), Color(red: 0.05, green: 0.30, blue: 0.15)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(18)
        }
        .buttonStyle(.plain)
    }

    private func secondaryButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                Text(title).font(.system(size: 15, weight: .bold))
                Spacer()
                Image(systemName: languageManager.chevronForward)
            }
            .foregroundColor(.primary)
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    AuthMethodView(onAction: { _ in })
        .environmentObject(LanguageManager())
}
