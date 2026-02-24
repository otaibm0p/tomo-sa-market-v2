//
//  LanguageSelectionView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct LanguageSelectionView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @Environment(\.dismiss) var dismiss
    
    let languages = [
        ("en", "English", "الإنجليزية"),
        ("ar", "العربية", "Arabic")
    ]
    
    var body: some View {
        List {
            ForEach(languages, id: \.0) { code, englishName, arabicName in
                Button(action: {
                    languageManager.setLanguage(code)
                    dismiss()
                }) {
                    HStack {
                        Text(code == "ar" ? arabicName : englishName)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        if languageManager.currentLanguageString == code {
                            Image(systemName: "checkmark")
                                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                                .font(.system(size: 16, weight: .semibold))
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("language_title".localized)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        LanguageSelectionView()
            .environmentObject(LanguageManager())
    }
}
