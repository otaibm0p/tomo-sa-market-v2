//
//  ProfileView.swift
//  tomocustomerapp
//
//  Created by user294169 on 2/9/26.
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var languageManager: LanguageManager
    @State private var userName = "John Doe"
    @State private var userEmail = "john.doe@example.com"
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    VStack(spacing: 16) {
                        // Profile Image
                        ZStack {
                            Circle()
                                .fill(Color(red: 0.2, green: 0.6, blue: 0.3).opacity(0.2))
                                .frame(width: 100, height: 100)
                            
                            Image(systemName: "person.fill")
                                .font(.system(size: 50))
                                .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                        }
                        
                        VStack(spacing: 4) {
                            Text(userName)
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.primary)
                            
                            Text(userEmail)
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.top, 20)
                    .padding(.bottom, 20)
                    
                    // Language Section
                    languageSection
                    
                    // Menu Items
                    VStack(spacing: 0) {
                        ProfileMenuItem(icon: "person.circle", title: "profile_edit".localized, color: Color(red: 0.2, green: 0.6, blue: 0.3))
                        ProfileMenuItem(icon: "location.circle", title: "profile_addresses".localized, color: .blue)
                        ProfileMenuItem(icon: "creditcard", title: "profile_payment".localized, color: .purple)
                        ProfileMenuItem(icon: "bell", title: "profile_notifications".localized, color: .orange)
                        ProfileMenuItem(icon: "questionmark.circle", title: "profile_help".localized, color: .gray)
                        ProfileMenuItem(icon: "info.circle", title: "profile_about".localized, color: .secondary)
                        ProfileMenuItem(icon: "arrow.right.square", title: "profile_logout".localized, color: .red, isLast: true)
                    }
                    .background(Color.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 20)
            }
            .background(Color(red: 0.98, green: 0.98, blue: 0.98))
            .navigationTitle("profile_title".localized)
            .navigationBarTitleDisplayMode(.large)
            .environment(\.layoutDirection, languageManager.isArabic ? .rightToLeft : .leftToRight)
        }
        .id(languageManager.currentLanguage) // Force refresh on language change
    }
    
    // MARK: - Language Section
    
    private var languageSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section Title
            Text("profile_language".localized)
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.primary)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            
            // Language Options
            VStack(spacing: 0) {
                LanguageOption(
                    title: "العربية",
                    code: "ar",
                    isSelected: languageManager.currentLanguage == "ar"
                )
                
                Divider()
                    .padding(.leading, 16)
                
                LanguageOption(
                    title: "English",
                    code: "en",
                    isSelected: languageManager.currentLanguage == "en"
                )
            }
            .background(Color.white)
            .cornerRadius(12)
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Language Option

struct LanguageOption: View {
    let title: String
    let code: String
    let isSelected: Bool
    @EnvironmentObject var languageManager: LanguageManager
    
    var body: some View {
        Button(action: {
            // Update LanguageManager immediately (it will save to UserDefaults)
            languageManager.setLanguage(code)
        }) {
            HStack(spacing: 16) {
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(.primary)
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundColor(Color(red: 0.2, green: 0.6, blue: 0.3))
                        .font(.system(size: 16, weight: .semibold))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
        }
    }
}

struct ProfileMenuItem: View {
    let icon: String
    let title: String
    let color: Color
    var action: (() -> Void)? = nil
    var showChevron: Bool = true
    var currentValue: String? = nil
    var isLast: Bool = false
    
    var body: some View {
        Button(action: {
            action?()
        }) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(color)
                    .frame(width: 30)
                
                Text(title)
                    .font(.system(size: 16))
                    .foregroundColor(.primary)
                
                Spacer()
                
                if let value = currentValue {
                    Text(value)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                
                if showChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 16)
        }
        
        if !isLast {
            Divider()
                .padding(.leading, 62)
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(LanguageManager.shared)
}
