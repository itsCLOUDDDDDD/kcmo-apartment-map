import type * as GeoJSON from 'geojson'

export type LatLng = [number, number]
export type MapRoute = { destinationId: string; destination: string; minutes: number; metres: number; geometry?: GeoJSON.LineString | null }
export type Apartment = { id: string; name: string; address: string; zip: string; coordinates: LatLng | null; walks: MapRoute[]; nearest?: MapRoute | null }
export type SavedPlace = { id: string; name: string; address: string; category: string; neighborhood?: string; coordinates: LatLng | null; source?: string | null; checked?: string | null; note?: string; coordinateSource?: string }
export type PlaceGuide = { short: string; description: string; source: string; checked: string }
export type ApartmentMapData = {
  properties: Apartment[]
  places: SavedPlace[]
  geography: {
    zipAreas: { geometry: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> }
    streetcar: { routes: GeoJSON.FeatureCollection; stops: { id: string; name: string; coordinates: LatLng }[]; source: string; feed: { feed_version: string } }
  }
}
export type MapSnapshot = {
  zips: string[]
  visibleIds: string[]
  selectedId: string | null
  destinationId: string
  threeD: boolean
  layers: { zip: boolean; streetcar: boolean; core: boolean; scenes: boolean; daytime: boolean; food: boolean }
  padding: { top: number; bottom: number; left: number; right: number }
  reducedMotion: boolean
}
export type MapCommand = {
  type: 'focus-apartment' | 'focus-route' | 'fit-all' | 'fit-zips' | 'zoom' | 'resize' | 'show-place' | 'dismiss-popup' | 'set-pitch' | 'explore-3d' | 'reload-style'
  id?: string
  lat?: number
  lng?: number
  amount?: number
  immediate?: boolean
}
export type MapIntent = { type: 'select-apartment' | 'select-destination' | 'show-place'; id: string }
export type MapProvider = 'maptiler' | 'openfreemap'
export type MapStatus = { status: 'loading' | 'ready' | 'fallback' | 'error'; message: string }
export type MountOptions = {
  workerUrl: string
  style: string
  fallbackStyle: string
  data: ApartmentMapData
  initialState: MapSnapshot
  colors?: Record<string, string>
  placeGuides?: Record<string, PlaceGuide>
  renderPlaceContent?: (place: SavedPlace) => HTMLElement
  signal?: AbortSignal
}
