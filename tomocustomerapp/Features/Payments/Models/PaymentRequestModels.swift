//
//  PaymentRequestModels.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import PassKit

struct ApplePayChargeRequest: Codable {
    let orderId: String
    let amount: Double
    let currency: String // "SAR"

    // ⚠️ Apple Pay token يأتي كـ PKPaymentToken (data)
    // نرسله Base64 للـ Backend
    let paymentDataBase64: String

    // optional meta
    let device: String
}

struct ApplePayChargeResponse: Codable {
    let ok: Bool
    let provider: String?     // "stripe" | "adyen" | "hyperpay"
    let transactionId: String?
    let message: String?
}

// helper
func applePayTokenBase64(_ payment: PKPayment) -> String {
    payment.token.paymentData.base64EncodedString()
}
