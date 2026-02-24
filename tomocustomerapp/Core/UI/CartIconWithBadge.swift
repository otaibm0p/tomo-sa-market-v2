//
//  CartIconWithBadge.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

/// Cart icon with badge that is ALWAYS visible and readable (no clipping)
public struct CartIconWithBadge: View {
    let count: Int
    let action: () -> Void

    public init(count: Int, action: @escaping () -> Void) {
        self.count = count
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: "cart")
                .font(.system(size: 18, weight: .bold))
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
                .overlay(alignment: .topTrailing) {
                    if count > 0 {
                        Text("\(min(count, 99))")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .frame(minWidth: 18, minHeight: 18)
                            .padding(.horizontal, count >= 10 ? 5 : 4)
                            .background(Color.red, in: Capsule())
                            .overlay(Capsule().stroke(Color.white.opacity(0.9), lineWidth: 1))
                            .offset(x: 8, y: -8)
                            .zIndex(10)
                            .accessibilityLabel("Cart \(count) items")
                    }
                }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HStack(spacing: 20) {
        CartIconWithBadge(count: 0) { }
        CartIconWithBadge(count: 5) { }
        CartIconWithBadge(count: 99) { }
        CartIconWithBadge(count: 150) { }
    }
    .padding()
}
