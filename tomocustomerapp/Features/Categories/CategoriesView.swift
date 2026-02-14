//
//  CategoriesView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct CategoriesView: View {
    let viewModel: CatalogViewModel
    let router: AppRouter
    let languageManager: LanguageManager

    private let cols = [GridItem(.adaptive(minimum:110),spacing:12)]

    var body: some View {
        LazyVGrid(columns: cols, spacing: 12) {
            ForEach(viewModel.categories){ c in
                Button{
                    router.push(.category(c))
                }label:{
                    VStack(spacing:10){
                        Image(systemName: c.icon ?? "square.grid.2x2")
                            .font(.system(size:24))
                        Text(languageManager.isArabic ? c.nameAr : c.nameEn)
                            .font(.subheadline.bold())
                    }
                    .frame(maxWidth:.infinity,minHeight:92)
                    .background(.thinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius:16))
                }
            }
        }
        .padding(.horizontal)
    }
}
