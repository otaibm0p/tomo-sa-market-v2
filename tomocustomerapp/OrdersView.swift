//
//  OrdersView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct OrdersView: View {
    @State private var orders: [Order] = []
    
    var body: some View {
        NavigationStack {
            VStack {
                if orders.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "bag")
                            .font(.system(size: 80))
                            .foregroundColor(.gray)
                        
                        Text("No orders yet")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Text("Your order history will appear here")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(orders) { order in
                            OrderRow(order: order)
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationTitle("orders_title".localized)
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct Order: Identifiable {
    let id = UUID()
    let orderNumber: String
    let date: String
    let total: Double
    let status: OrderStatus
    let items: [String]
}

enum OrderStatus: String {
    case pending = "Pending"
    case processing = "Processing"
    case shipped = "Shipped"
    case delivered = "Delivered"
    case cancelled = "Cancelled"
    
    var color: Color {
        switch self {
        case .pending:
            return .orange
        case .processing:
            return .blue
        case .shipped:
            return .purple
        case .delivered:
            return Color(red: 0.2, green: 0.6, blue: 0.3)
        case .cancelled:
            return .red
        }
    }
}

struct OrderRow: View {
    let order: Order
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Order #\(order.orderNumber)")
                        .font(.system(size: 16, weight: .semibold))
                    
                    Text(order.date)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text("$\(order.total, specifier: "%.2f")")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
            }
            
            HStack {
                Text(order.status.rawValue)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(order.status.color)
                    .cornerRadius(8)
                
                Spacer()
            }
            
            if !order.items.isEmpty {
                Text("\(order.items.count) item(s)")
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    OrdersView()
}
