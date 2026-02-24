//
//  CategoryProductsView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CategoryProductsView: View {
    let category: AdminCategory
    let viewModel: CatalogViewModel
    let router: AppRouter
    let languageManager: LanguageManager

    private let cols = [GridItem(.adaptive(minimum:160),spacing:12)]

    var body: some View {
        ScrollView{
            LazyVGrid(columns: cols, spacing:12){
                ForEach(viewModel.categoryProducts){ p in
                    Button{
                        router.push(.product(p))
                    }label:{
                        VStack(alignment:.leading,spacing:8){
                            Rectangle().opacity(0.06).frame(height:110)
                                .clipShape(RoundedRectangle(cornerRadius:14))
                            Text(languageManager.isArabic ? p.nameAr : p.nameEn)
                                .font(.subheadline.bold())
                            Text("\(p.price, specifier:"%.2f") \(p.currency)")
                                .font(.footnote)
                        }
                        .padding()
                        .background(.thinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius:16))
                    }
                }
            }
            .padding(.horizontal)
        }
        .task{
            await viewModel.loadCategory(id: category.id)
        }
    }
}
