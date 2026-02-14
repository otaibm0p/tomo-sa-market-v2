//
//  CheckoutStepsViews.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct StepHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 20, weight: .bold))
            Text(subtitle).font(.system(size: 13, weight: .semibold)).foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.top, 10)
    }
}

struct AddressStepView: View {
    @Binding var address: CheckoutAddress

    var body: some View {
        VStack(spacing: 12) {
            StepHeader(title: "Delivery Address", subtitle: "Where should we deliver your order?")

            VStack(spacing: 10) {
                field("District", text: $address.district)
                field("Street", text: $address.street)
                field("Building / Apt", text: $address.building)
                field("Notes (optional)", text: $address.notes)
            }
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(18)
            .padding(.horizontal)
        }
    }

    private func field(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 12, weight: .bold)).foregroundColor(.secondary)
            TextField(title, text: text)
                .textInputAutocapitalization(.words)
                .padding(12)
                .background(Color(.systemGray6))
                .cornerRadius(14)
        }
    }
}

struct SlotStepView: View {
    @Binding var selected: DeliverySlot?

    private let slots: [DeliverySlot] = [
        .init(title: "Express (25–35 min)", etaMinutes: 30),
        .init(title: "Standard (45–60 min)", etaMinutes: 55),
        .init(title: "Scheduled (Today 8–10 PM)", etaMinutes: 120)
    ]

    var body: some View {
        VStack(spacing: 12) {
            StepHeader(title: "Delivery Time", subtitle: "Choose how fast you want it.")

            VStack(spacing: 10) {
                ForEach(slots) { s in
                    Button {
                        selected = s
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(s.title).font(.system(size: 15, weight: .bold))
                                Text("ETA ~\(s.etaMinutes) min")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: selected?.id == s.id ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(selected?.id == s.id ? Color(.systemGreen) : .secondary)
                        }
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(18)
                        .padding(.horizontal)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct PaymentStepView: View {
    @Binding var method: PaymentMethod

    var body: some View {
        VStack(spacing: 12) {
            StepHeader(title: "Payment", subtitle: "Select a payment method.")

            VStack(spacing: 10) {
                ForEach(PaymentMethod.allCases) { m in
                    Button {
                        method = m
                    } label: {
                        HStack {
                            Text(m.rawValue)
                                .font(.system(size: 15, weight: .bold))
                            Spacer()
                            Image(systemName: method == m ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(method == m ? Color(.systemGreen) : .secondary)
                        }
                        .padding(12)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(18)
                        .padding(.horizontal)
                    }
                    .buttonStyle(.plain)
                }

                Text("Apple Pay will be enabled when payment integration is added.")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
                    .padding(.top, 4)
            }
        }
    }
}

struct ReviewStepView: View {
    @EnvironmentObject var languageManager: LanguageManager
    let address: CheckoutAddress
    let slot: DeliverySlot
    let payment: PaymentMethod
    let subtotalText: String

    var body: some View {
        VStack(spacing: 12) {
            StepHeader(title: "Review", subtitle: "Confirm details before placing order.")

            VStack(spacing: 10) {

                summaryCard(title: languageManager.l(.address), lines: [
                    "\(address.city) • \(address.district)",
                    "\(address.street) • \(address.building)",
                    address.notes.isEmpty ? "—" : address.notes
                ])

                summaryCard(title: languageManager.l(.slot), lines: [
                    slot.title, "ETA ~\(slot.etaMinutes) min"
                ])

                summaryCard(title: languageManager.l(.payment), lines: [
                    payment.rawValue
                ])

                summaryCard(title: languageManager.l(.total), lines: [
                    subtotalText
                ])
            }
            .padding(.horizontal)
        }
    }

    private func summaryCard(title: String, lines: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.secondary)

            ForEach(lines, id: \.self) { line in
                Text(line)
                    .font(.system(size: 14, weight: .semibold))
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
    }
}
