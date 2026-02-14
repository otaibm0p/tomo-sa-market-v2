//
//  CategoriesSection.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct HomeCategory: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let systemIcon: String
}

struct CategoriesSection: View {
    let categories: [HomeCategory]
    var onTap: (HomeCategory) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Categories")
                .font(.title2)
                .bold()
                .padding(.horizontal)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12),
                ],
                spacing: 12
            ) {
                ForEach(categories) { c in
                    Button {
                        onTap(c)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: c.systemIcon)
                                .font(.system(size: 20, weight: .semibold))
                                .frame(width: 42, height: 42)
                                .background(Color(.systemGray6))
                                .cornerRadius(14)

                            Text(c.title)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.primary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.8)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(16)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }
}
