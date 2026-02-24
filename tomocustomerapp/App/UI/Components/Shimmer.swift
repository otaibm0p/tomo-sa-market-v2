import SwiftUI

public struct Shimmer: ViewModifier {
    @State private var phase: CGFloat = -0.6
    let isActive: Bool
    let speed: Double

    public init(isActive: Bool = true, speed: Double = 1.25) {
        self.isActive = isActive
        self.speed = speed
    }

    public func body(content: Content) -> some View {
        content
            .overlay {
                if isActive {
                    GeometryReader { geo in
                        let w = geo.size.width
                        let h = geo.size.height
                        LinearGradient(
                            gradient: Gradient(stops: [
                                .init(color: .white.opacity(0.0), location: 0.0),
                                .init(color: .white.opacity(0.25), location: 0.45),
                                .init(color: .white.opacity(0.0), location: 0.9)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        .frame(width: w * 1.4, height: h * 1.4)
                        .rotationEffect(.degrees(18))
                        .offset(x: phase * w * 1.4, y: 0)
                        .blendMode(.plusLighter)
                        .mask(content)
                        .onAppear {
                            phase = -0.8
                            withAnimation(.linear(duration: speed).repeatForever(autoreverses: false)) {
                                phase = 0.8
                            }
                        }
                    }
                    .allowsHitTesting(false)
                }
            }
    }
}

public extension View {
    func shimmer(_ active: Bool = true, speed: Double = 1.25) -> some View {
        modifier(Shimmer(isActive: active, speed: speed))
    }
}
