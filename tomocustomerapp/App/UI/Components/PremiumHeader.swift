import SwiftUI

public struct PremiumHeader: View {
    let title: String
    let subtitle: String?
    let ordersTitle: String
    let onOrders: () -> Void
    let onNotifications: () -> Void

    public init(
        title: String,
        subtitle: String? = nil,
        ordersTitle: String,
        onOrders: @escaping () -> Void,
        onNotifications: @escaping () -> Void
    ) {
        self.title = title
        self.subtitle = subtitle
        self.ordersTitle = ordersTitle
        self.onOrders = onOrders
        self.onNotifications = onNotifications
    }

    public var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            HStack(spacing: 10) {
                Button(action: onOrders) {
                    HStack(spacing: 6) {
                        Image(systemName: "clock")
                        Text(ordersTitle)
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(.ultraThinMaterial, in: Capsule())
                }

                Button(action: onNotifications) {
                    Image(systemName: "bell")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(width: 40, height: 40)
                        .background(.ultraThinMaterial, in: Circle())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background {
            ZStack {
                LinearGradient(
                    colors: [
                        Color.green.opacity(0.18),
                        Color(.systemBackground).opacity(0.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea(edges: .top)

                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.06), radius: 18, x: 0, y: 10)
                    .padding(.horizontal, 10)
                    .padding(.top, -6)
            }
        }
    }
}
