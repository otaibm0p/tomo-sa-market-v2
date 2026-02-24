import SwiftUI

/// Order status timeline view (mock-ready for timestamps)
struct OrderTimelineView: View {
    let status: OrderStatus
    let isAr: Bool

    private let flow: [OrderStatus] = [.placed, .confirmed, .preparing, .readyForPickup, .outForDelivery, .delivered]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(isAr ? "حالة الطلب" : "Order Status")
                .font(.system(size: 14, weight: .bold))
                .padding(.horizontal, 4)
            
            ForEach(flow, id: \.self) { step in
                let isCurrent = isCurrentStep(step: step)
                let isDone = isCompleted(step: step)
                
                HStack(spacing: 12) {
                    // Status indicator
                    ZStack {
                        Circle()
                            .fill(isDone ? Color.green : (isCurrent ? Color.orange : Color.gray.opacity(0.3)))
                            .frame(width: 20, height: 20)
                        
                        if isDone {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                        } else if isCurrent {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 8, height: 8)
                        }
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(isAr ? step.titleAr : step.titleEn)
                            .font(.system(size: 13, weight: isCurrent ? .bold : .semibold))
                            .foregroundColor(isCurrent ? .primary : (isDone ? .primary : .secondary))
                        
                        // Optional timestamp placeholder (mock-ready)
                        if isCurrent || isDone {
                            Text(isAr ? "—" : "—")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                }
                .padding(.vertical, 4)
            }
            
            // Cancelled state
            if status == .cancelled {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 20, height: 20)
                        
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Text(isAr ? OrderStatus.cancelled.titleAr : OrderStatus.cancelled.titleEn)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.red)
                    
                    Spacer()
                }
                .padding(.vertical, 4)
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    private func isCurrentStep(step: OrderStatus) -> Bool {
        return step == status && status != .cancelled
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
        return stepIndex < curIndex
    }
}
