import SwiftUI

struct ProductCard: View {
    let product: AdminProduct
    @EnvironmentObject var languageManager: LanguageManager
    var onAdd: (() -> Void)? = nil
    
    private var displayName: String {
        product.localizedName(isArabic: languageManager.currentLanguage == .ar)
    }
    
    private var displayPrice: Double {
        product.price
    }
    
    private var displayImage: String {
        product.resolvedPrimaryImage ?? "cart"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {

            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.black.opacity(0.04))

                if let urlString = product.resolvedPrimaryImage, urlString.hasPrefix("http") {
                    AsyncImage(url: URL(string: urlString)) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable().scaledToFill()
                        default:
                            Image(systemName: "photo")
                                .font(.system(size: 34, weight: .semibold))
                                .foregroundColor(Color.green.opacity(0.9))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    Image(systemName: displayImage)
                        .font(.system(size: 34, weight: .semibold))
                        .foregroundColor(Color.green.opacity(0.9))
                }
            }
            .frame(width: 140, height: 110)

            Text(displayName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.black)
                .lineLimit(1)

            HStack {
                Text("\(product.currency) \(String(format: "%.2f", displayPrice))")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)

                Spacer()

                Button {
                    onAdd?()
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(10)
                        .background(Color.green)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .frame(width: 170)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 6)
        .drawingGroup()
    }
}
