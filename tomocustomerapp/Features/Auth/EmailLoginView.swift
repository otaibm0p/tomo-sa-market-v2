//
//  EmailLoginView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct EmailLoginView: View {

    let onLogin: (String, String) -> Void
    let onGoSignup: () -> Void
    let onBack: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var error: String? = nil

    var body: some View {
        VStack(spacing: 14) {
            header("Email Login", "Sign in with your email and password")

            VStack(spacing: 10) {
                field("Email", text: $email, keyboard: .emailAddress)
                field("Password", text: $password, keyboard: .default, isSecure: true)

                if let error {
                    Text(error)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }
            }
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
            .padding(.horizontal)

            Button {
                let e = email.trimmingCharacters(in: .whitespacesAndNewlines)
                guard e.contains("@"), password.count >= 1 else {
                    error = "Enter valid credentials"
                    return
                }
                error = nil
                onLogin(e, password)
            } label: {
                cta("Login")
            }
            .buttonStyle(.plain)
            .padding(.horizontal)

            Button {
                onGoSignup()
            } label: {
                Text("Create account")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(red: 0.10, green: 0.45, blue: 0.25))
            }
            .buttonStyle(.plain)

            Spacer()
        }
        .navigationTitle("Email")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") { onBack() }
            }
        }
    }

    private func header(_ title: String, _ subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 20, weight: .bold))
            Text(subtitle).font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.top, 10)
    }

    private func field(_ title: String, text: Binding<String>, keyboard: UIKeyboardType, isSecure: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 12, weight: .bold)).foregroundColor(.secondary)
            Group {
                if isSecure {
                    SecureField(title, text: text)
                } else {
                    TextField(title, text: text)
                }
            }
            .keyboardType(keyboard)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(12)
            .background(Color(.systemGray6))
            .cornerRadius(14)
        }
    }

    private func cta(_ title: String) -> some View {
        HStack {
            Spacer()
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
            Spacer()
        }
        .padding(.vertical, 14)
        .background(
            LinearGradient(
                colors: [Color(red: 0.10, green: 0.45, blue: 0.25), Color(red: 0.05, green: 0.30, blue: 0.15)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(18)
    }
}
