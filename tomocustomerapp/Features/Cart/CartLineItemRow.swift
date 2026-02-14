//
//  CartLineItemRow.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CartLineItemRow: View {
    let item: CartItem
    let onPlus: () -> Void
    let onMinus: () -> Void
    let onRemove: () -> Void
    @EnvironmentObject var languageManager: LanguageManager

    private var isAr: Bool { languageManager.currentLanguage == .ar }

    var body: some View {
        HStack(spacing: 12) {

            RoundedRectangle(cornerRadius: 14)
                .fill(Color(.systemGray6))
                .frame(width: 56, height: 56)
                .overlay(
                    Group {
                        if let imageUrl = item.product.resolvedPrimaryImage,
                           let url = URL(string: imageUrl) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let img):
                                    img.resizable().scaledToFill()
                                default:
                                    Image(systemName: "photo")
                                        .foregroundColor(.gray)
                                }
                            }
                        } else {
                            Image(systemName: "photo")
                                .foregroundColor(.gray)
                        }
                    }
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 4) {
                Text(isAr ? item.product.nameAr : item.product.nameEn)
                    .font(.system(size: 15, weight: .bold))
                    .lineLimit(1)

                Text("\(item.product.currency) " + String(format: "%.2f", item.product.price))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
            }

            Spacer()

            HStack(spacing: 10) {
                Button(action: onMinus) {
                    Image(systemName: "minus")
                        .font(.system(size: 12, weight: .bold))
                        .frame(width: 28, height: 28)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                }
                .buttonStyle(.plain)

                Text("\(item.quantity)")
                    .font(.system(size: 14, weight: .bold))
                    .frame(minWidth: 20)

                Button(action: onPlus) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .frame(width: 28, height: 28)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                }
                .buttonStyle(.plain)
            }

            Button(action: onRemove) {
                Image(systemName: "trash")
                    .foregroundColor(.red.opacity(0.9))
            }
            .buttonStyle(.plain)
            .padding(.leading, 6)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
        .padding(.horizontal)
    }
}
