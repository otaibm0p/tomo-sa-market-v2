//
//  PhoneLoginView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct PhoneLoginView: View {

    @State private var phone: String = ""
    @State private var error: String? = nil

    let onSendOTP: (String) -> Void
    let onBack: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            header("Phone Login", "Enter your mobile number to receive OTP")

            VStack(alignment: .leading, spacing: 8) {
                Text("Phone Number")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.secondary)

                TextField("+9665xxxxxxxx", text: $phone)
                    .keyboardType(.phonePad)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)

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
                let trimmed = phone.trimmingCharacters(in: .whitespacesAndNewlines)
                guard trimmed.count >= 8 else {
                    error = "Please enter a valid phone number"
                    return
                }
                error = nil
                onSendOTP(trimmed)
            } label: {
                cta("Send OTP")
            }
            .buttonStyle(.plain)
            .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("Phone")
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
