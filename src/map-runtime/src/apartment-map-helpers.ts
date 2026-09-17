import type * as GeoJSON from 'geojson'
import type { Apartment, LatLng, MapSnapshot, SavedPlace } from './apartment-map-types'

export const GREEN = '#285c4b'
export const CREAM = '#f6f7f3'
export const PLACE_COLORS = { food: '#b75c40', coffee: '#b17c29', library: '#326fa3', nightlife: '#805287', streetcar: '#16899b' }
export const collection = (features: GeoJSON.Feature[] = []): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features })
export const lngLat = (coordinates: LatLng): [number, number] => [coordinates[1], coordinates[0]]
export const validCoordinate = (value: unknown): value is LatLng => Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every(Number.isFinite) && Math.abs(value[0]) <= 90 && Math.abs(value[1]) <= 180
export const point = (coordinates: LatLng, properties: GeoJSON.GeoJsonProperties = {}): GeoJSON.Feature<GeoJSON.Point> => ({ type: 'Feature', geometry: { type: 'Point', coordinates: lngLat(coordinates) }, properties })
export const currentRoute = (apartment: Apartment | undefined, state: MapSnapshot) => state.destinationId === 'nearest' ? apartment?.nearest : apartment?.walks.find(route => route.destinationId === state.destinationId)
export const polygonCoordinates = (features: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[]): [number, number][] => features.flatMap(({ geometry }) => geometry.type === 'MultiPolygon' ? geometry.coordinates.flat(2) : geometry.coordinates.flat()).filter(coordinate => coordinate.length >= 2 && coordinate.slice(0, 2).every(Number.isFinite)).map(coordinate => [coordinate[0], coordinate[1]])

export function safeLink(value: unknown): string | null {
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null }
}

export function copySnapshot(value: MapSnapshot): MapSnapshot {
  return { ...value, zips: [...value.zips], visibleIds: [...value.visibleIds], layers: { ...value.layers }, padding: { ...value.padding } }
}

export function isSnapshot(value: unknown): value is MapSnapshot {
  if (!value || typeof value !== 'object') return false
  const s = value as MapSnapshot
  return Array.isArray(s.zips) && s.zips.every(zip => typeof zip === 'string' && /^\d{5}$/.test(zip)) && Array.isArray(s.visibleIds) && s.visibleIds.every(id => typeof id === 'string') && (s.selectedId === null || typeof s.selectedId === 'string') && typeof s.destinationId === 'string' && typeof s.threeD === 'boolean' && typeof s.reducedMotion === 'boolean' && !!s.layers && ['zip', 'streetcar', 'core', 'scenes', 'daytime', 'food'].every(key => typeof s.layers[key as keyof MapSnapshot['layers']] === 'boolean') && !!s.padding && ['top', 'bottom', 'left', 'right'].every(key => Number.isFinite(s.padding[key as keyof MapSnapshot['padding']]) && s.padding[key as keyof MapSnapshot['padding']] >= 0)
}

const iconPaths: Record<string, string> = {
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  nightlife: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  library: '<path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2v15"/>',
  coffee: '<path d="M3 8h14v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3"/>',
  food: '<path d="M5 3v7m4-7v7M3 3v6a4 4 0 0 0 8 0V3M7 13v8M19 3v18M19 3c-4 2-5 9 0 9"/>',
}
export const icon = (kind: string) => `<svg class="place-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[kind] || iconPaths.nightlife}</svg>`
export const placeKind = (category: string): 'library' | 'coffee' | 'food' | 'nightlife' => /library/i.test(category) ? 'library' : /coffee|café|cafe/i.test(category) ? 'coffee' : /restaurant|food/i.test(category) ? 'food' : 'nightlife'
export const categoryLabel = (category: string) => ({ library: 'Library', coffee: 'Coffee shop', food: 'Restaurant', nightlife: 'Nightlife / events' })[placeKind(category)]
export const placeCategoryColor = (category: string) => PLACE_COLORS[placeKind(category)]

export const normalizePlaceName = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

/** Match a nearby business by meaningful name tokens, never by category alone. */
export function nearbySamePlace(name: string, coordinates: [number, number], place: SavedPlace) {
  if (!validCoordinate(place.coordinates) || !validCoordinate([coordinates[1], coordinates[0]])) return false
  const dy = (coordinates[1] - place.coordinates[0]) * 111320
  const dx = (coordinates[0] - place.coordinates[1]) * 111320 * Math.cos(place.coordinates[0] * Math.PI / 180)
  if (Math.hypot(dx, dy) > 85) return false
  const a = normalizePlaceName(name), b = normalizePlaceName(place.name)
  if (a === b && a.length > 2) return true
  if (place.id === 'in-good-co' && /^in good (?:co|company)(?: (?:kc|kansas|city|membership|cocktail|lounge))*$/.test(a)) return true
  const generic = new Set(['the', 'in', 'and', 'at', 'co', 'company', 'coffee', 'cafe', 'bar', 'brewing', 'roasting', 'lounge', 'restaurant', 'library', 'branch'])
  const tokens = (value: string) => value.split(' ').filter(token => !generic.has(token) && token.length > 2)
  const namedA = tokens(a), namedB = tokens(b)
  const distinctive = (values: string[]) => values.length > 1 || values[0]?.length >= 5
  return distinctive(namedA) && distinctive(namedB) && (namedA.every(token => namedB.includes(token)) || namedB.every(token => namedA.includes(token)))
}

export function proximityPolygon(coordinates: [number, number], metres = 90): GeoJSON.Polygon {
  const ring = Array.from({ length: 17 }, (_, index) => {
    const angle = index / 16 * Math.PI * 2
    return [coordinates[0] + Math.cos(angle) * metres / (111320 * Math.cos(coordinates[1] * Math.PI / 180)), coordinates[1] + Math.sin(angle) * metres / 111320]
  })
  return { type: 'Polygon', coordinates: [ring] }
}

export function foodMarkerImage(kind: 'food' | 'coffee'): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = 56; canvas.height = 68
  const context = canvas.getContext('2d')!
  context.scale(2, 2)
  context.beginPath(); context.moveTo(14, 32); context.bezierCurveTo(10, 26, 2, 20, 2, 13); context.arc(14, 13, 12, Math.PI, 0); context.bezierCurveTo(26, 20, 18, 26, 14, 32)
  context.closePath(); context.fillStyle = PLACE_COLORS[kind]; context.fill(); context.strokeStyle = '#fff'; context.lineWidth = 1.5; context.stroke()
  context.strokeStyle = '#fff'; context.lineWidth = 1.4; context.lineCap = 'round'; context.lineJoin = 'round'
  context.beginPath()
  if (kind === 'coffee') { context.moveTo(8, 10); context.lineTo(18, 10); context.lineTo(18, 15); context.quadraticCurveTo(18, 19, 13, 19); context.quadraticCurveTo(8, 19, 8, 15); context.closePath(); context.moveTo(18, 11); context.bezierCurveTo(23, 10, 23, 17, 18, 16); context.moveTo(11, 6); context.lineTo(11, 8); context.moveTo(15, 6); context.lineTo(15, 8) }
  else { context.moveTo(9, 7); context.lineTo(9, 12); context.quadraticCurveTo(11, 15, 13, 12); context.lineTo(13, 7); context.moveTo(11, 7); context.lineTo(11, 21); context.moveTo(19, 7); context.lineTo(19, 21); context.moveTo(19, 7); context.bezierCurveTo(15, 10, 15, 15, 19, 15) }
  context.stroke()
  return context.getImageData(0, 0, canvas.width, canvas.height)
}

export function appendText(parent: HTMLElement, tag: string, text: string, className = '') {
  const element = document.createElement(tag)
  element.textContent = text
  if (className) element.className = className
  parent.append(element)
  return element
}

export function appendLink(parent: HTMLElement, value: unknown, label: string) {
  const href = safeLink(value)
  if (!href) return
  const link = appendText(parent, 'a', label) as HTMLAnchorElement
  link.href = href
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
}
