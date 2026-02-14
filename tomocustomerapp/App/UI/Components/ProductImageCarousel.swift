import SwiftUI

public struct ProductImageCarousel: View {
    let images: [String]
    let height: CGFloat
    @State private var index: Int = 0

    public init(images: [String], height: CGFloat = 220) {
        self.images = images
        self.height = height
    }

    public var body: some View {
        let safe = images.isEmpty ? ["__placeholder__"] : images

        VStack(spacing: 10) {
            TabView(selection: $index) {
                ForEach(Array(safe.enumerated()), id: \.offset) { i, img in
                    ZStack {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .fill(Color(.systemGray6))

                        if img == "__placeholder__" {
                            Image(systemName: "photo")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(.secondary)
                        } else if img.hasPrefix("http") || img.hasPrefix("https") {
                            // URL image
                            AsyncImage(url: URL(string: img)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                default:
                                    Image(systemName: "photo")
                                        .font(.system(size: 22, weight: .semibold))
                                        .foregroundStyle(.secondary)
                                }
                            }
                        } else if let ui = UIImage(named: img) {
                            // Asset image
                            Image(uiImage: ui)
                                .resizable()
                                .scaledToFill()
                                .clipped()
                        } else {
                            // Fallback
                            Image(systemName: "photo")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(height: height)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: height)

            HStack(spacing: 6) {
                ForEach(0..<safe.count, id: \.self) { i in
                    Capsule()
                        .fill(i == index ? Color.green.opacity(0.9) : Color(.systemGray4))
                        .frame(width: i == index ? 18 : 7, height: 7)
                        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: index)
                }
            }
        }
    }
}
