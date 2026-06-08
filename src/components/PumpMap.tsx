import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { DEVICE_NAME } from '../lib/constants'

const pumpIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(16,185,129,0.6)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

interface PumpMapProps {
  position: { lat: number; lng: number } | null
}

export function PumpMap({ position }: PumpMapProps) {
  if (!position) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-900/50">
        <div className="text-center text-slate-500">
          <MapPin className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm">No GPS data for this day</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/50">
      <MapContainer
        center={[position.lat, position.lng]}
        zoom={15}
        className="h-64 w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <Marker position={[position.lat, position.lng]} icon={pumpIcon}>
          <Tooltip permanent direction="top" offset={[0, -10]} className="pump-label">
            {DEVICE_NAME}
          </Tooltip>
        </Marker>
      </MapContainer>
      <div className="border-t border-slate-700/50 bg-slate-900/80 px-4 py-2">
        <p className="font-mono text-xs text-slate-400">
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      </div>
    </div>
  )
}
