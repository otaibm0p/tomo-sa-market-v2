import SwiftUI

#if DEBUG
struct DebugPanel: View {
    @EnvironmentObject var cart: TomoCartManager
    @EnvironmentObject var orderStore: OrderStore
    @EnvironmentObject var session: AppSession
    @EnvironmentObject var languageManager: LanguageManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section("Cart") {
                    Button("Clear Cart") {
                        cart.clear()
                    }
                    Button("Add Mock Item") {
                        // Add a mock product if needed
                    }
                }
                
                Section("Orders") {
                    Button("Seed Mock Orders") {
                        orderStore.seedMockIfNeeded()
                    }
                    Button("Clear Orders") {
                        orderStore.orders.removeAll()
                    }
                }
                
                Section("Auth") {
                    Button("Reset Auth") {
                        session.logout()
                    }
                }
                
                Section("Language") {
                    Button("Switch to Arabic") {
                        languageManager.currentLanguage = .ar
                    }
                    Button("Switch to English") {
                        languageManager.currentLanguage = .en
                    }
                }
            }
            .navigationTitle("Debug Panel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct DebugPanelModifier: ViewModifier {
    @State private var showDebug = false
    @State private var tapCount = 0
    @State private var lastTapTime = Date()
    
    func body(content: Content) -> some View {
        content
            .onTapGesture(count: 1) {
                let now = Date()
                if now.timeIntervalSince(lastTapTime) < 1.0 {
                    tapCount += 1
                } else {
                    tapCount = 1
                }
                lastTapTime = now
                
                if tapCount >= 5 {
                    showDebug = true
                    tapCount = 0
                }
            }
            .sheet(isPresented: $showDebug) {
                DebugPanel()
            }
    }
}

extension View {
    func debugPanel() -> some View {
        #if DEBUG
        modifier(DebugPanelModifier())
        #else
        self
        #endif
    }
}
#endif
