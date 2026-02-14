import SwiftUI

struct RootShellView: View {
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var uiState: AppUIState
    @EnvironmentObject var cart: TomoCartManager
    @EnvironmentObject var orderStore: OrderStore
    @EnvironmentObject var languageManager: LanguageManager

    var body: some View {
        NavigationStack(path: $router.path) {
            RootTabView()
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .category(let category):
                        CategoryProductsView(
                            category: category,
                            viewModel: CatalogViewModel(repo: MockCatalogRepository()),
                            router: router,
                            languageManager: languageManager
                        )

                    case .product(let product):
                        ProductDetailsView(product: product)

                    case .checkout:
                        CheckoutView()
                        
                    case .orderDetails(let order):
                        OrderDetailsView(order: order)
                    }
                }
        }
    }
}
