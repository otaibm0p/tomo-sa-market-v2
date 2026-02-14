import SwiftUI

struct OrderDetailsView: View {
    @EnvironmentObject var orderStore: OrderStore
    @EnvironmentObject var languageManager: LanguageManager

    let order: OrderModel

    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text(order.id.isEmpty ? "—" : order.id).font(.system(size: 18, weight: .bold))
                    Spacer()
                    Text(isAr ? order.status.titleAr : order.status.titleEn)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.secondary)
                }

                if let eta = order.etaMinutes, eta > 0, order.status != .delivered {
                    Text(isAr ? "الوقت المتوقع: \(eta) دقيقة" : "ETA: \(eta) min")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.secondary)
                }

                OrderTimelineView(status: order.status, isAr: isAr)

                // Order Summary
                VStack(alignment: .leading, spacing: 10) {
                    Text(isAr ? "ملخص الطلب" : "Order Summary")
                        .font(.system(size: 16, weight: .bold))
                        .padding(.horizontal)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(isAr ? "العنوان" : "Address")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(order.addressLabel.isEmpty ? "—" : order.addressLabel)
                                .font(.system(size: 13, weight: .semibold))
                        }
                        
                        Divider()
                        
                        HStack {
                            Text(isAr ? "عدد العناصر" : "Items")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(order.itemsCount)")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        
                        HStack {
                            Text(isAr ? "رسوم التوصيل" : "Delivery Fee")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("SAR \(String(format: "%.2f", order.deliveryFee))")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        
                        Divider()
                        
                        HStack {
                            Text(isAr ? "الإجمالي" : "Total")
                                .font(.system(size: 14, weight: .bold))
                            Spacer()
                            Text("SAR \(String(format: "%.2f", order.total))")
                                .font(.system(size: 14, weight: .bold))
                        }
                    }
                    .padding(14)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(18)
                    .padding(.horizontal)
                }
            }
            .padding(.horizontal)
            .padding(.top, 12)
        }
        .navigationTitle(isAr ? "تفاصيل الطلب" : "Order Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}
