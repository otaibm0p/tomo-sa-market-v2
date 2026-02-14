import SwiftUI

// ✅ Card يعتمد AdminCategory فقط ويستخدم Router (لا NavigationLink مباشر)
struct CategoryCard: View {
    let category: AdminCategory
    let router: AppRouter
    let languageManager: LanguageManager

    var body: some View {
        Button {
            router.push(.category(category))
        } label: {
            VStack(spacing: 8) {
                Circle()
                    .fill(Color.green.opacity(0.25))
                    .frame(width: 64, height: 64)

                Image(systemName: category.icon ?? "square.grid.2x2")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.green)

                Text(languageManager.isArabic ? category.nameAr : category.nameEn)
                    .font(.system(size: 12, weight: .medium))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .buttonStyle(.plain)
    }
}

struct HomeView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @EnvironmentObject var router: AppRouter
    @EnvironmentObject var cart: TomoCartManager

    // ✅ VM جديد للأقسام/المنتجات (جاهز للربط مع Admin لاحقاً)
    @State private var catalogVM = CatalogViewModel(repo: MockCatalogRepository())
    @StateObject private var homeVM = HomeViewModel()

    @State private var searchText: String = ""
    @State private var cartBottomBarDismissed: Bool = false
    @State private var lastCartItemCount: Int = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 1) Header
                HeaderSection()
                    .padding(.top, 8)
                
                // 2) Search Bar
                SearchSection(searchText: $searchText)
                
                // 3) Banner Slider
                if !homeVM.banners.isEmpty {
                    BannerSection(banners: homeVM.banners)
                }
                
                // 4) Categories Grid
                CategoriesGridSection(categories: catalogVM.categories)
                
                // 5) Featured Products
                FeaturedProductsSection(products: catalogVM.featured)
            }
            .padding(.vertical, 12)
        }
        .task {
            await catalogVM.loadHome()
            await homeVM.loadHome()
        }
        .onChange(of: cart.itemCount) { oldValue, newValue in
            if newValue != lastCartItemCount {
                cartBottomBarDismissed = false
                lastCartItemCount = newValue
            }
        }
        .safeAreaInset(edge: .bottom) {
            if cart.itemCount > 0 && !cartBottomBarDismissed {
                CartBottomBar(
                    itemCount: cart.itemCount,
                    totalText: cart.totalText,
                    languageManager: languageManager,
                    onDismiss: {
                        cartBottomBarDismissed = true
                    }
                )
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
        }
        .environment(\.layoutDirection, languageManager.currentLanguage.isRTL ? .rightToLeft : .leftToRight)
    }
}
