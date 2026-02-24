//
//  AuthRouter.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import Combine

enum AuthStep: Hashable {
    case method
    case phone
    case otp(phone: String)
    case emailLogin
    case emailSignup
}

final class AuthRouter: ObservableObject {
    @Published var path: [AuthStep] = []
    func push(_ s: AuthStep) { path.append(s) }
    func pop() { _ = path.popLast() }
    func reset() { path.removeAll() }
}
