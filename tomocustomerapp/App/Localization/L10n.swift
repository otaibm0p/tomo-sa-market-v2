//
//  L10n.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import Foundation

enum L10nKey: String {

    // HOME
    case homeTitle
    case categories
    case featuredProducts
    case searchPlaceholder

    // CHECKOUT
    case payment
    case confirmOrder
    case placeOrder

    // ORDERS
    case noOrders
    case firstOrderHint

    // PROFILE
    case profile
    case logout

    // COMMON
    case total
    case address
    case slot
}

struct L10n {

    static func text(_ key: L10nKey, lang: AppLanguage) -> String {

        switch (lang, key) {

        // ---------- HOME ----------
        case (.en, .homeTitle): return "TOMO"
        case (.ar, .homeTitle): return "تومو"

        case (.en, .categories): return "Categories"
        case (.ar, .categories): return "الأقسام"

        case (.en, .featuredProducts): return "Featured Products"
        case (.ar, .featuredProducts): return "منتجات مميزة"

        case (.en, .searchPlaceholder): return "Search products..."
        case (.ar, .searchPlaceholder): return "ابحث عن المنتجات..."

        // ---------- CHECKOUT ----------
        case (.en, .payment): return "Payment"
        case (.ar, .payment): return "الدفع"

        case (.en, .confirmOrder): return "Confirm Order"
        case (.ar, .confirmOrder): return "تأكيد الطلب"

        case (.en, .placeOrder): return "Place Order"
        case (.ar, .placeOrder): return "إتمام الطلب"

        // ---------- ORDERS ----------
        case (.en, .noOrders): return "No Orders Yet"
        case (.ar, .noOrders): return "لا توجد طلبات بعد"

        case (.en, .firstOrderHint): return "Place your first order to see tracking and status updates."
        case (.ar, .firstOrderHint): return "قم بإنشاء أول طلب لمتابعة الحالة والتتبع."

        // ---------- PROFILE ----------
        case (.en, .profile): return "Profile"
        case (.ar, .profile): return "الملف الشخصي"

        case (.en, .logout): return "Logout"
        case (.ar, .logout): return "تسجيل الخروج"

        // ---------- COMMON ----------
        case (.en, .total): return "Total"
        case (.ar, .total): return "الإجمالي"

        case (.en, .address): return "Address"
        case (.ar, .address): return "العنوان"

        case (.en, .slot): return "Slot"
        case (.ar, .slot): return "موعد التوصيل"
        }
    }
}
