import SwiftUI

struct OrderTimelineView: View {
    let status: OrderStatus
    let isAr: Bool

    private let flow: [OrderStatus] = [.placed, .confirmed, .preparing, .readyForPickup, .outForDelivery, .delivered]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(flow, id: \.self) { s in
                let done = isCompleted(step: s)
                HStack(spacing: 10) {
                    Circle()
                        .frame(width: 10, height: 10)
                        .opacity(done ? 1 : 0.25)

                    Text(isAr ? s.titleAr : s.titleEn)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(done ? .primary : .secondary)

                    Spacer()
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    private func isCompleted(step: OrderStatus) -> Bool {
        // Safe handling: if status is not in flow, default to false
        guard let curIndex = flow.firstIndex(of: status),
              let stepIndex = flow.firstIndex(of: step) else { 
            // If status is cancelled, show all steps as incomplete
            if status == .cancelled { return false }
            // Default: show as incomplete if status unknown
            return false
        }
        return stepIndex <= curIndex
    }
}
