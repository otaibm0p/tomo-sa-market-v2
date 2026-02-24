//
//  ProfileView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var session: AppSession
    @EnvironmentObject var payments: PaymentStore
    @EnvironmentObject var languageManager: LanguageManager

    @State private var pushSettings = false
    @State private var pushAddresses = false
    @State private var pushPayments = false
    @State private var pushSupport = false

    var body: some View {
            ScrollView {
                VStack(spacing: 14) {
                    header

                    ProfileSectionCard {
                        ProfileRow(title: languageManager.t("addresses"), icon: "location.fill") { pushAddresses = true }
                        ProfileRow(title: languageManager.t("payment_methods"), icon: "creditcard.fill") { pushPayments = true }
                        ProfileRow(title: languageManager.t("settings"), icon: "gearshape.fill") { pushSettings = true }
                        ProfileRow(title: languageManager.t("support"), icon: "headset") { pushSupport = true }
                    }

                    Button(role: .destructive) {
                        session.logout()
                    } label: {
                        Text(languageManager.t("logout"))
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red.opacity(0.9))
                            .cornerRadius(18)
                    }
                    .padding(.top, 10)

                    Spacer(minLength: 18)
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .navigationTitle(languageManager.t("profile_title"))
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    LanguageMenuButton()
                }
            }
            .navigationDestination(isPresented: $pushSettings) { SettingsView() }
            .navigationDestination(isPresented: $pushAddresses) { AddressesView() }
            .navigationDestination(isPresented: $pushPayments) { PaymentMethodsView() }
            .navigationDestination(isPresented: $pushSupport) { SupportView() }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 54))
                .foregroundColor(.secondary)

            Text(session.user?.displayName ?? "Customer")
                .font(.system(size: 18, weight: .bold))

            Text(session.user?.email ?? "—")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.secondary)

            infoCard
        }
    }

    private var infoCard: some View {
        VStack(spacing: 10) {
            infoRow(languageManager.t("provider"), session.user?.provider.capitalized ?? "—", "key.fill")
            infoRow(languageManager.t("phone"), session.user?.phone ?? "—", "phone.fill")
            infoRow(languageManager.t("email"), session.user?.email ?? "—", "envelope.fill")
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
    }

    private func infoRow(_ title: String, _ value: String, _ icon: String) -> some View {
        HStack {
            Text(title).font(.system(size: 12, weight: .bold)).foregroundColor(.secondary)
            Spacer()
            Text(value).font(.system(size: 13, weight: .bold))
            Image(systemName: icon).foregroundColor(.secondary)
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AppSession())
        .environmentObject(PaymentStore())
        .environmentObject(LanguageManager())
}
