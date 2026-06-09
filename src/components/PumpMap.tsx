import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { PUMP_SITE_NAME } from '../lib/constants'

const pumpIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:60px;height:60px;background:white;border-radius:50%;border:3px solid #10b981;box-shadow:0 2px 10px rgba(0,0,0,0.4)">
    <img src="${import.meta.env.BASE_URL}pump-icon.png" style="width:42px;height:42px;object-fit:contain" />
  </div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
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
          <Tooltip permanent direction="top" offset={[0, -34]} className="pump-label">
            {PUMP_SITE_NAME}
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
