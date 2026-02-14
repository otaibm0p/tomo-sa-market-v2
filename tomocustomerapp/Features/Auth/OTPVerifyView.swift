//
//  OTPVerifyView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct OTPVerifyView: View {

    let phone: String
    let onVerify: (String) -> Bool
    let onBack: () -> Void

    @State private var code: String = ""
    @State private var error: String? = nil

    var body: some View {
        VStack(spacing: 14) {
            header("Verify OTP", "We sent a code to \(phone)")

            VStack(alignment: .leading, spacing: 8) {
                Text("OTP Code")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.secondary)

                TextField("123456", text: $code)
                    .keyboardType(.numberPad)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(14)

                if let error {
                    Text(error)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.red)
                }

                Text("Mock: use 123456")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)
            }
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
            .padding(.horizontal)

            Button {
                let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
                guard trimmed.count >= 4 else {
                    error = "Invalid code"
                    return
                }
                let ok = onVerify(trimmed)
                if !ok { error = "Wrong OTP code" }
            } label: {
                cta("Verify & Continue")
            }
            .buttonStyle(.plain)
            .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("OTP")
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
