//
//  CheckoutSuccessView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CheckoutSuccessView: View {
    @EnvironmentObject var uiState: AppUIState
    @EnvironmentObject var languageManager: LanguageManager
    let draft: TomoOrderDraft?
    
    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(Color(.systemGreen).opacity(0.15))
                    .frame(width: 92, height: 92)
                
                Image(systemName: "checkmark")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Color(.systemGreen))
            }
            
            Text(isAr ? "تم إنشاء الطلب" : "Order Placed!")
                .font(.system(size: 24, weight: .bold))
            
            if let d = draft {
                Text(isAr ? "رقم الطلب: \(d.id)" : "Order #\(d.id)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.secondary)
                
                Text("\(isAr ? "الإجمالي: " : "Total: ")\(d.totalText)")
                    .font(.system(size: 16, weight: .bold))
            }
            
            Text(isAr ? "جاري تحضير طلبك. سيتم تفعيل التتبع عند ربط السيرفر." : "Your order is being prepared. Tracking will be available when backend is connected.")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Spacer()
            
            VStack(spacing: 10) {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        uiState.selectedTab = .orders
                    }
                } label: {
                    Text(isAr ? "عرض الطلبات" : "View Orders")
                        .font(.system(size: 16, weight: .bold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color(.systemGray6))
                        .cornerRadius(18)
                }
                .buttonStyle(.plain)
                
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        uiState.selectedTab = .home
                    }
                } label: {
                    Text(isAr ? "العودة للتسوق" : "Continue Shopping")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
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
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
            .padding(.bottom, 10)
        }
        .navigationBarBackButtonHidden(true)
    }
}
