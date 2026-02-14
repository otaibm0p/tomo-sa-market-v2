//
//  ProductGalleryView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct ProductGalleryView: View {
    let images: [String]
    @State private var index: Int = 0

    var body: some View {
        VStack(spacing: 10) {
            if images.isEmpty {
                RoundedRectangle(cornerRadius: 18)
                    .fill(Color(.secondarySystemBackground))
                    .frame(height: 220)
                    .overlay(Image(systemName: "photo").foregroundColor(.secondary))
            } else {
                TabView(selection: $index) {
                    ForEach(images.indices, id: \.self) { i in
                        ZStack {
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Color(.secondarySystemBackground))
                            // Placeholder for remote image loading (AsyncImage)
                            AsyncImage(url: URL(string: images[i])) { phase in
                                switch phase {
                                case .success(let img):
                                    img.resizable().scaledToFill()
                                default:
                                    Image(systemName: "photo").foregroundColor(.secondary)
                                }
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 18))
                        }
                        .tag(i)
                        .frame(height: 220)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic))
                .frame(height: 220)

                // Thumbnails
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(images.indices, id: \.self) { i in
                            Button {
                                withAnimation(.easeInOut(duration: 0.15)) { index = i }
                            } label: {
                                AsyncImage(url: URL(string: images[i])) { phase in
                                    switch phase {
                                    case .success(let img):
                                        img.resizable().scaledToFill()
                                    default:
                                        RoundedRectangle(cornerRadius: 10).fill(Color(.secondarySystemBackground))
                                            .overlay(Image(systemName: "photo").foregroundColor(.secondary))
                                    }
                                }
                                .frame(width: 52, height: 52)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(i == index ? Color.primary.opacity(0.35) : Color.clear, lineWidth: 2)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }
}
