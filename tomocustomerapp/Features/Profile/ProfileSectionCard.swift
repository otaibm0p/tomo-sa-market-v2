//
//  ProfileSectionCard.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI

struct ProfileSectionCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        VStack(spacing: 10) {
            content
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(18)
    }
}
