//
//  ApplePayManager.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation
import PassKit

enum ApplePayError: Error {
    case notAvailable
    case invalidMerchant
    case cancelled
    case failed(String)
}

final class ApplePayManager: NSObject {

    // ✅ ضع Merchant ID الحقيقي هنا لاحقاً
    // مثال: "merchant.com.tomo.sa"
    let merchantIdentifier: String

    // ✅ الدولة/العملة
    let countryCode: String
    let currencyCode: String

    private var onResult: ((Result<PKPayment, ApplePayError>) -> Void)?

    init(
        merchantIdentifier: String,
        countryCode: String = "SA",
        currencyCode: String = "SAR"
    ) {
        self.merchantIdentifier = merchantIdentifier
        self.countryCode = countryCode
        self.currencyCode = currencyCode
    }

    func canMakePayments() -> Bool {
        PKPaymentAuthorizationController.canMakePayments()
    }

    func startPayment(
        total: Double,
        label: String,
        lineItems: [(String, Double)],
        completion: @escaping (Result<PKPayment, ApplePayError>) -> Void
    ) {
        guard canMakePayments() else {
            completion(.failure(.notAvailable))
            return
        }

        onResult = completion

        let request = PKPaymentRequest()
        request.merchantIdentifier = merchantIdentifier
        request.countryCode = countryCode
        request.currencyCode = currencyCode

        // ✅ networks
        request.supportedNetworks = [.visa, .masterCard, .mada, .amex]
        request.merchantCapabilities = .threeDSecure

        // ✅ summary items
        var items: [PKPaymentSummaryItem] = lineItems.map {
            PKPaymentSummaryItem(label: $0.0, amount: NSDecimalNumber(value: $0.1))
        }
        items.append(PKPaymentSummaryItem(label: label, amount: NSDecimalNumber(value: total)))
        request.paymentSummaryItems = items

        // ✅ billing/shipping optional later
        request.requiredBillingContactFields = []
        request.requiredShippingContactFields = []

        let controller = PKPaymentAuthorizationController(paymentRequest: request)
        controller.delegate = self
        controller.present(completion: { presented in
            if !presented {
                completion(.failure(.invalidMerchant))
            }
        })
    }
}

extension ApplePayManager: PKPaymentAuthorizationControllerDelegate {

    func paymentAuthorizationControllerDidFinish(_ controller: PKPaymentAuthorizationController) {
        controller.dismiss {
            // إذا المستخدم أغلق بدون تفويض، غالباً cancelled
            // (لو جتنا نتيجة من authorize سنكون أرسلناها بالفعل)
            // لا نرسل cancelled هنا لتجنب double-callback
        }
    }

    func paymentAuthorizationController(
        _ controller: PKPaymentAuthorizationController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        // ✅ نعطي iOS "Success" مبدئياً، والـ Backend يتحقق لاحقاً
        completion(PKPaymentAuthorizationResult(status: .success, errors: nil))

        onResult?(.success(payment))
        onResult = nil
    }
}
