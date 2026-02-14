//
//  PaymentAPIClient.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

enum PaymentAPIError: Error {
    case invalidURL
    case network(String)
    case server(String)
}

final class PaymentAPIClient {

    // ✅ ضع Base URL للـ Backend لاحقاً
    // مثال: https://api.tomo-sa.com
    let baseURL: String

    init(baseURL: String) {
        self.baseURL = baseURL
    }

    // ✅ Apple Pay token to backend
    func chargeApplePay(request: ApplePayChargeRequest) async throws -> ApplePayChargeResponse {
        guard let url = URL(string: baseURL + "/payments/applepay/charge") else {
            throw PaymentAPIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(request)

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse else {
                throw PaymentAPIError.network("No HTTP response")
            }
            if (200..<300).contains(http.statusCode) {
                return try JSONDecoder().decode(ApplePayChargeResponse.self, from: data)
            } else {
                let msg = String(data: data, encoding: .utf8) ?? "Server error"
                throw PaymentAPIError.server("HTTP \(http.statusCode): \(msg)")
            }
        } catch {
            throw PaymentAPIError.network(error.localizedDescription)
        }
    }
}
