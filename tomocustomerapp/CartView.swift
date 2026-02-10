//
//  CartView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct CartView: View {
    @State private var cartItems: [CartItem] = []
    
    var totalPrice: Double {
        cartItems.reduce(0) { $0 + ($1.price * Double($1.quantity)) }
    }
    
    var body: some View {
        NavigationStack {
            VStack {
                if cartItems.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "cart")
                            .font(.system(size: 80))
                            .foregroundColor(.gray)
                        
                        Text("Your cart is empty")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Text("Add items to your cart to see them here")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach($cartItems) { $item in
                            CartItemRow(item: $item)
                        }
                        .onDelete(perform: deleteItems)
                    }
                    .listStyle(PlainListStyle())
                    
                    // Checkout Section
                    VStack(spacing: 12) {
                        HStack {
                            Text("Total")
                                .font(.system(size: 18, weight: .semibold))
                            Spacer()
                            Text("$\(totalPrice, specifier: "%.2f")")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                        }
                        .padding(.horizontal, 16)
                        
                        Button(action: {
                            // Checkout action
                        }) {
                            Text("Checkout")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color(red: 0.2, green: 0.6, blue: 0.3))
                                .cornerRadius(12)
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.vertical, 16)
                    .background(Color.white)
                }
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationTitle("cart_title".localized)
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    func deleteItems(offsets: IndexSet) {
        cartItems.remove(atOffsets: offsets)
    }
}

struct CartItem: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    var quantity: Int
}

struct CartItemRow: View {
    @Binding var item: CartItem
    
    var body: some View {
        HStack(spacing: 12) {
            // Product Image Placeholder
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.gray.opacity(0.2))
                .frame(width: 60, height: 60)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.system(size: 16, weight: .medium))
                
                Text("$\(item.price, specifier: "%.2f")")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Quantity Controls
            HStack(spacing: 12) {
                Button(action: {
                    if item.quantity > 1 {
                        item.quantity -= 1
                    }
                }) {
                    Image(systemName: "minus.circle.fill")
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                }
                
                Text("\(item.quantity)")
                    .font(.system(size: 16, weight: .medium))
                    .frame(minWidth: 30)
                
                Button(action: {
                    item.quantity += 1
                }) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                }
            }
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    CartView()
}
