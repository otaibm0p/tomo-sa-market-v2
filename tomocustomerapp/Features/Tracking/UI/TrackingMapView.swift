//
//  TrackingMapView.swift
//  tomocustomerapp
//
//  Created on 2/9/26.
//

import SwiftUI
import MapKit

struct TrackingMapView: View {

    let store: GeoPoint
    let customer: GeoPoint
    let driver: GeoPoint

    @State private var camera: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $camera) {
            // Store
            Annotation("Store", coordinate: CLLocationCoordinate2D(latitude: store.lat, longitude: store.lon)) {
                marker(icon: "building.2.fill", title: "Store")
            }

            // Customer
            Annotation("You", coordinate: CLLocationCoordinate2D(latitude: customer.lat, longitude: customer.lon)) {
                marker(icon: "house.fill", title: "You")
            }

            // Driver
            Annotation("Driver", coordinate: CLLocationCoordinate2D(latitude: driver.lat, longitude: driver.lon)) {
                marker(icon: "car.fill", title: "Driver")
            }

            // خط بسيط (Polyline) بين السائق والعميل
            MapPolyline(coordinates: [
                CLLocationCoordinate2D(latitude: driver.lat, longitude: driver.lon),
                CLLocationCoordinate2D(latitude: customer.lat, longitude: customer.lon)
            ])
            .stroke(.blue, lineWidth: 4)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .onAppear { fitAll() }
        .onChange(of: driver.lat) { _, _ in fitAll() }
        .onChange(of: driver.lon) { _, _ in fitAll() }
    }

    private func marker(icon: String, title: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .padding(10)
                .background(Color.black.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: 14))

            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.secondary)
        }
    }

    private func fitAll() {
        // ضبط الكاميرا لتشمل Store + Driver + Customer
        let lats = [store.lat, customer.lat, driver.lat]
        let lons = [store.lon, customer.lon, driver.lon]

        guard let minLat = lats.min(),
              let maxLat = lats.max(),
              let minLon = lons.min(),
              let maxLon = lons.max()
        else { return }

        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )

        let span = MKCoordinateSpan(
            latitudeDelta: max(0.02, (maxLat - minLat) * 2.2),
            longitudeDelta: max(0.02, (maxLon - minLon) * 2.2)
        )

        camera = .region(MKCoordinateRegion(center: center, span: span))
    }
}
