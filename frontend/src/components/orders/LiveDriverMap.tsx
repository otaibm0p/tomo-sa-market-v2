import 'leaflet/dist/leaflet.css'

import { MapContainer, Polyline, TileLayer, CircleMarker, useMap } from 'react-leaflet'

export type LivePoint = { lat: number; lng: number; ts: number }

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true })
  return null
}

export default function LiveDriverMap({
  points,
  height = 280,
}: {
  points: LivePoint[]
  height?: number
}) {
  const last = points[points.length - 1]
  const positions = points.map((p) => [p.lat, p.lng] as [number, number])

  if (!last) return null

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-100" style={{ height }}>
      <MapContainer center={[last.lat, last.lng]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={positions} pathOptions={{ color: '#10b981', weight: 5, opacity: 0.9 }} />
        <CircleMarker center={[last.lat, last.lng]} radius={8} pathOptions={{ color: '#065f46', fillColor: '#10b981', fillOpacity: 1 }} />
        <Recenter lat={last.lat} lng={last.lng} />
      </MapContainer>
    </div>
  )
}

