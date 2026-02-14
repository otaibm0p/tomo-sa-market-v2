//
//  AuthFlowView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct AuthFlowView: View {

    @EnvironmentObject var session: AppSession
    @StateObject private var authRouter = AuthRouter()

    var body: some View {
        NavigationStack(path: $authRouter.path) {
            AuthMethodView { action in
                switch action {
                case .phone:
                    authRouter.push(.phone)
                case .email:
                    authRouter.push(.emailLogin)
                case .apple:
                    session.signInWithAppleMock()
                case .google:
                    session.signInWithGoogleMock()
                }
            }
            .navigationDestination(for: AuthStep.self) { step in
                switch step {
                case .method:
                    AuthMethodView { _ in }
                case .phone:
                    PhoneLoginView(
                        onSendOTP: { phone in
                            session.signInWithPhone(phone: phone)
                            authRouter.push(.otp(phone: phone))
                        },
                        onBack: { authRouter.pop() }
                    )
                case .otp(let phone):
                    OTPVerifyView(
                        phone: phone,
                        onVerify: { code in
                            let ok = session.verifyOTP(phone: phone, code: code)
                            return ok
                        },
                        onBack: { authRouter.pop() }
                    )
                case .emailLogin:
                    EmailLoginView(
                        onLogin: { email, pass in
                            _ = session.signInWithEmail(email: email, password: pass)
                        },
                        onGoSignup: {
                            authRouter.push(.emailSignup)
                        },
                        onBack: { authRouter.pop() }
                    )
                case .emailSignup:
                    EmailSignupView(
                        onSignup: { name, email, pass in
                            _ = session.signUpWithEmail(name: name, email: email, password: pass)
                        },
                        onBack: { authRouter.pop() }
                    )
                }
            }
        }
    }
}
