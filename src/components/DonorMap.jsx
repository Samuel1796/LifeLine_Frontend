import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function donorIcon(donor) {
  return L.divIcon({
    className: '',
    html: `<div class="pin ${donor.isAvailable ? '' : 'pin-off'}"><span>${donor.bloodType}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36],
  })
}

const youIcon = L.divIcon({
  className: '',
  html: '<div class="pin pin-you"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Re-centers the map smoothly when the target position changes.
function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 12, { duration: 1.2 })
  }, [map, position])
  return null
}

export default function DonorMap({ donors, myLocation, center, onAsk }) {
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo position={myLocation} />

        {myLocation && (
          <Marker position={myLocation} icon={youIcon}>
            <Popup>
              <div className="map-popup">
                <div className="name">You are here</div>
              </div>
            </Popup>
          </Marker>
        )}

        {donors.map((d) => (
          <Marker key={d.id} position={[d.latitude, d.longitude]} icon={donorIcon(d)}>
            <Popup>
              <div className="map-popup">
                <div className="name">{d.displayName}</div>
                <div>
                  {d.bloodType} · {d.city || 'Location shared'}
                </div>
                {d.phone && <div>{d.phone}</div>}
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`chip chip-${d.isAvailable ? 'available' : 'unavailable'}`}>
                    {d.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                  {d.isAnonymous && <span className="chip chip-anonymous">Anonymous</span>}
                </div>
                {onAsk && d.isAvailable && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={() => onAsk(d)}
                  >
                    Ask this donor
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
