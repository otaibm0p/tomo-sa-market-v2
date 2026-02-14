import SwiftUI
import Combine

enum AppTab: Hashable {
    case home, orders, cart, search, profile
}

@MainActor
final class AppUIState: ObservableObject {
    @Published var selectedTab: AppTab = .home
    init() {}
}
