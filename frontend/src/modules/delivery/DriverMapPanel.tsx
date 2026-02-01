import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

export interface DriverMapPanelProps {
  /** Driver current position (if available) */
  driverLocation?: { lat: number; lng: number } | null
  /** Active order stops: pickup (store) and dropoff (customer) */
  stops?: Array<{
    orderId: number
    pickup?: { lat: number; lng: number; label?: string } | null
    dropoff?: { lat: number; lng: number; label?: string } | null
  }>
  height?: number
  className?: string
}

const defaultCenter: [number, number] = [24.7136, 46.6753] // Riyadh fallback
const defaultZoom = 12

function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: true })
  }, [map, center, zoom])
  return null
}

// Fix default marker icon in Leaflet with react-leaflet
const driverIcon = L.divIcon({
  className: 'driver-marker',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})
const pickupIcon = L.divIcon({
  className: 'pickup-marker',
  html: '<div style="width:14px;height:14px;border-radius:2px;background:#3b82f6;border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})
const dropoffIcon = L.divIcon({
  className: 'dropoff-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

export function DriverMapPanel({
  driverLocation,
  stops = [],
  height = 400,
  className = '',
}: DriverMapPanelProps) {
  const { t } = useLanguage()

  const allPoints: [number, number][] = []
  if (driverLocation) allPoints.push([driverLocation.lat, driverLocation.lng])
  stops.forEach((s) => {
    if (s.pickup) allPoints.push([s.pickup.lat, s.pickup.lng])
    if (s.dropoff) allPoints.push([s.dropoff.lat, s.dropoff.lng])
  })

  const center: [number, number] =
    allPoints.length > 0
      ? allPoints.reduce(
          (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
          [0, 0]
        ).map((s, i) => s / allPoints.length) as [number, number]
      : defaultCenter

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-gray-200 bg-white ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter center={center} zoom={allPoints.length > 0 ? 14 : defaultZoom} />

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>{t('driver.map.you')}</Popup>
          </Marker>
        )}

        {stops.map((s) => (
          <span key={s.orderId}>
            {s.pickup && (
              <Marker position={[s.pickup.lat, s.pickup.lng]} icon={pickupIcon}>
                <Popup>#{s.orderId} — {t('driver.map.pickup')}</Popup>
              </Marker>
            )}
            {s.dropoff && (
              <Marker position={[s.dropoff.lat, s.dropoff.lng]} icon={dropoffIcon}>
                <Popup>#{s.orderId} — {t('driver.map.dropoff')}</Popup>
              </Marker>
            )}
          </span>
        ))}
      </MapContainer>
    </div>
  )
}
