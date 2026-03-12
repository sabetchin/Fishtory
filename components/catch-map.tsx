"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

// Fix for default marker icons in Leaflet with React
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const LOCATION_COORDS: Record<string, [number, number]> = {
    "Banicain": [14.8315, 120.2835],
    "Barretto": [14.8518, 120.2625],
    "Kalaklan": [14.8412, 120.2745],
}

const JUMP_COORDS = {
    "Banicain": { lat: 14.8289035, lng: 120.2740998, zoom: 19 },
    "Barretto": { lat: 14.8485351, lng: 120.2630462, zoom: 17 },
    "Kalaklan": { lat: 14.8324373, lng: 120.2664607, zoom: 19 },
}

interface Report {
    id: string
    fisherman_id: string
    species: string
    weight_kg: number
    location: string
    status: string
    created_at: string
}

// Helper component to control map center/zoom
function MapController({ target }: { target: { lat: number, lng: number, zoom: number } | null }) {
    const map = useMap()
    useEffect(() => {
        if (target) {
            map.setView([target.lat, target.lng], target.zoom, { animate: true })
        }
    }, [target, map])
    return null
}

export default function CatchMap({ reports }: { reports: Report[] }) {
    const [mounted, setMounted] = useState(false)
    const [mapTarget, setMapTarget] = useState<{ lat: number, lng: number, zoom: number } | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return <div className="h-[500px] w-full bg-slate-100 flex items-center justify-center">Loading Map...</div>

    return (
        <div className="space-y-4">
            <div className="h-[500px] w-full rounded-lg overflow-hidden border border-slate-200">
                <MapContainer 
                    center={[14.84, 120.27]} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController target={mapTarget} />
                    {reports.map((report) => {
                        const coords = LOCATION_COORDS[report.location]
                        if (!coords) return null

                        // Add a tiny random offset to distinguish multiple reports at the same location
                        const jitter = () => (Math.random() - 0.5) * 0.001
                        const position: [number, number] = [coords[0] + jitter(), coords[1] + jitter()]

                        return (
                            <Marker key={report.id} position={position} icon={icon}>
                                <Popup>
                                    <div className="p-1">
                                        <h3 className="font-bold text-blue-900 border-b pb-1 mb-1">{report.fisherman_id}</h3>
                                        <p className="text-sm m-0"><b>Species:</b> <span className="capitalize">{report.species}</span></p>
                                        <p className="text-sm m-0"><b>Weight:</b> {report.weight_kg} kg</p>
                                        <p className="text-sm m-0"><b>Status:</b> <span className={`capitalize ${report.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>{report.status}</span></p>
                                        <p className="text-xs text-slate-500 mt-2">{new Date(report.created_at).toLocaleDateString()}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>
            </div>

            <div className="flex flex-wrap gap-3">
                <span className="text-sm font-medium self-center text-slate-500">Quick Jump:</span>
                {Object.entries(JUMP_COORDS).map(([name, coords]) => (
                    <Button 
                        key={name} 
                        variant="outline" 
                        size="sm"
                        className="flex gap-2"
                        onClick={() => setMapTarget(coords)}
                    >
                        <MapPin className="h-4 w-4" />
                        {name}
                    </Button>
                ))}
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setMapTarget({ lat: 14.84, lng: 120.27, zoom: 13 })}
                >
                    Reset View
                </Button>
            </div>
        </div>
    )
}
