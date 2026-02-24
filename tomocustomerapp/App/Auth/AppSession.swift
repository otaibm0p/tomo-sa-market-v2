//
//  AppSession.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Combine

struct UserAccount: Codable, Hashable {
    var id: String
    var displayName: String
    var phone: String?
    var email: String?
    var provider: String // "phone" | "email" | "apple" | "google"
}

final class AppSession: ObservableObject {

    @Published private(set) var isAuthenticated: Bool = false
    @Published private(set) var user: UserAccount? = nil

    // Mock OTP code for now
    let mockOTP: String = "123456"

    func signInWithPhone(phone: String) {
        // In real life: call API -> send OTP
        // Here: we only store pending phone in AuthRouter
    }

    func verifyOTP(phone: String, code: String) -> Bool {
        guard code == mockOTP else { return false }
        let u = UserAccount(
            id: UUID().uuidString,
            displayName: "TOMO Customer",
            phone: phone,
            email: nil,
            provider: "phone"
        )
        user = u
        isAuthenticated = true
        return true
    }

    func signInWithEmail(email: String, password: String) -> Bool {
        // Real: API auth
        guard !email.isEmpty, !password.isEmpty else { return false }
        let u = UserAccount(
            id: UUID().uuidString,
            displayName: email.components(separatedBy: "@").first?.capitalized ?? "Customer",
            phone: nil,
            email: email,
            provider: "email"
        )
        user = u
        isAuthenticated = true
        return true
    }

    func signUpWithEmail(name: String, email: String, password: String) -> Bool {
        // Real: API create account
        guard !name.isEmpty, !email.isEmpty, password.count >= 6 else { return false }
        let u = UserAccount(
            id: UUID().uuidString,
            displayName: name,
            phone: nil,
            email: email,
            provider: "email"
        )
        user = u
        isAuthenticated = true
        return true
    }

    func signInWithAppleMock() {
        let u = UserAccount(
            id: UUID().uuidString,
            displayName: "Apple User",
            phone: nil,
            email: "apple@private.relay",
            provider: "apple"
        )
        user = u
        isAuthenticated = true
    }

    func signInWithGoogleMock() {
        let u = UserAccount(
            id: UUID().uuidString,
            displayName: "Google User",
            phone: nil,
            email: "google.user@gmail.com",
            provider: "google"
        )
        user = u
        isAuthenticated = true
    }

    func logout() {
        user = nil
        isAuthenticated = false
    }
}
