import SwiftUI

public struct SkeletonBox: View {
    let height: CGFloat
    let cornerRadius: CGFloat

    public init(height: CGFloat, cornerRadius: CGFloat = 16) {
        self.height = height
        self.cornerRadius = cornerRadius
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color(.systemGray6))
            .frame(height: height)
            .shimmer(true)
    }
}

public struct SkeletonCircle: View {
    let size: CGFloat
    public init(size: CGFloat) { self.size = size }

    public var body: some View {
        Circle()
            .fill(Color(.systemGray6))
            .frame(width: size, height: size)
            .shimmer(true)
    }
}
