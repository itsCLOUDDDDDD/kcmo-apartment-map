import * as MapLibreGL from 'maplibre-gl'
import type * as GeoJSON from 'geojson'
import type { Apartment, MapCommand, MapIntent, MapProvider, MapSnapshot, MapStatus, MountOptions, SavedPlace } from './apartment-map-types'
import { appendLink, appendText, categoryLabel, collection, copySnapshot, CREAM as DEFAULT_CREAM, currentRoute, foodMarkerImage, GREEN as DEFAULT_GREEN, icon, lngLat, nearbySamePlace, PLACE_COLORS, placeKind, point, polygonCoordinates, proximityPolygon, validCoordinate } from './apartment-map-helpers'
import { createLandmark } from './apartment-landmark'

const ZIP_LAYERS = ['zip-context-fill', 'zip-context-lines', 'zip-fill', 'zip-halo', 'zip-lines', 'zip-labels']
const STREETCAR_LAYERS = ['streetcar-line', 'streetcar-stops', 'stop-labels']
const CAMERA_COMMANDS = new Set(['focus-apartment', 'focus-route', 'fit-all', 'fit-zips', 'zoom', 'show-place', 'set-pitch', 'explore-3d'])
const DOWNTOWN_OVERVIEW: [number, number] = [-94.5799, 39.0942]

type ControllerCallbacks = { ready: () => void; failed: () => void }

class MapTilerLogo implements MapLibreGL.IControl {
  element = document.createElement('div')
  onAdd() {
    this.element.className = 'maplibregl-ctrl kcmo-provider-logo'
    const link = document.createElement('a')
    link.href = 'https://www.maptiler.com/'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.setAttribute('aria-label', 'MapTiler maps')
    const image = document.createElement('img')
    image.src = 'https://api.maptiler.com/resources/logo.svg'
    image.alt = 'MapTiler'
    image.width = 100
    image.height = 25
    link.append(image)
    this.element.append(link)
    return this.element
  }
  onRemove() { this.element.remove() }
}

/** Owns every MapLibre mutation. App state arrives as snapshots, never as a second data store. */
export class ApartmentMapController {
  private map: MapLibreGL.Map
  private container: HTMLElement
  private options: MountOptions
  private callbacks: ControllerCallbacks
  private state: MapSnapshot
  private provider: MapProvider
  private ready = false
  private destroyed = false
  private styleGeneration = 0
  private everReady = false
  private pendingCamera: MapCommand | null = null
  private propertyMarkers: MapLibreGL.Marker[] = []
  private placeMarkers: MapLibreGL.Marker[] = []
  private popup: MapLibreGL.Popup | null = null
  private styleTimer: ReturnType<typeof setTimeout> | undefined
  private resizeObserver: ResizeObserver
  private frame = 0
  private logo = new MapTilerLogo()
  private scale = new MapLibreGL.ScaleControl({ maxWidth: 90, unit: 'imperial' })
  private buildingLayers: string[] = []
  private foodLayers: string[] = []
  private hoveredZip: string | null = null
  private resourceErrors = 0
  private transientFailures: number[] = []
  private landmark: ReturnType<typeof createLandmark>
  private foodSource: { source: string; sourceLayer: string } | null = null
  private foodBaseFilters = new Map<string, MapLibreGL.FilterSpecification | undefined>()
  private foodDedupSignature = ''
  private fitCheck: { coordinates: [number, number][]; attempts: number; maxZoom: number } | null = null

  constructor(map: MapLibreGL.Map, container: HTMLElement, options: MountOptions, state: MapSnapshot, callbacks: ControllerCallbacks) {
    this.map = map
    this.container = container
    this.options = options
    this.state = copySnapshot(state)
    this.callbacks = callbacks
    this.provider = this.isMapTiler(options.style) ? 'maptiler' : 'openfreemap'
    map.addControl(this.scale, 'bottom-left')
    map.addControl(this.logo, 'bottom-left')
    map.on('style.load', this.onStyleLoad)
    map.on('error', this.onError)
    map.on('moveend', this.onMoveEnd)
    map.on('zoom', this.onZoom)
    map.on('click', this.onClick)
    map.on('mousemove', this.onMouseMove)
    map.on('mouseout', this.onMouseOut)
    map.on('idle', this.onIdle)
    map.on('movestart', this.onMoving)
    map.on('dragstart', this.onUserMove)
    document.addEventListener('visibilitychange', this.updateMotion)
    this.landmark = createLandmark(map, { url: new URL('assets/landmarks/in-good-co.glb', document.baseURI).href, coordinates: [-94.580302, 39.0950749], minZoom: 14.5, onVisibilityChange: (visible: boolean) => { this.container.dataset.mapLandmarkVisible = String(visible) } })
    this.resizeObserver = new ResizeObserver(() => { if (!this.destroyed) this.map.resize() })
    this.resizeObserver.observe(container)
    this.container.dataset.mapEngine = 'mapcn'
    this.container.dataset.mapReady = 'false'
    this.updateMotion()
    this.publishStatus({ status: 'loading', message: 'Loading the map. Apartment photos and details remain available.' })
    this.armStyleTimeout()
    if (map.isStyleLoaded()) this.onStyleLoad()
  }

  private isMapTiler(style: string) { try { return new URL(style).hostname.endsWith('maptiler.com') } catch { return false } }
  private get green() { return this.options.colors?.green || DEFAULT_GREEN }
  private get cream() { return this.options.colors?.cream || DEFAULT_CREAM }
  private duration() { return this.state.reducedMotion ? 0 : 500 }
  private emit(name: string, detail: unknown) { window.dispatchEvent(new CustomEvent(name, { detail })) }
  private publishStatus(detail: MapStatus) { if (!this.destroyed) this.emit('kcmo:map-status', detail) }
  private intent(detail: MapIntent) { if (!this.destroyed) this.emit('kcmo:map-intent', detail) }
  private apartment(id = this.state.selectedId) { return this.options.data.properties.find(property => property.id === id) }
  private visibleApartments() { const ids = new Set(this.state.visibleIds); return this.options.data.properties.filter(property => ids.has(property.id) && validCoordinate(property.coordinates)) }
  private activeDestination() { return this.state.destinationId === 'nearest' ? currentRoute(this.apartment(), this.state)?.destinationId : this.state.destinationId }
  private visiblePlaces() {
    const active = this.activeDestination()
    return this.options.data.places.filter(place => validCoordinate(place.coordinates) && (place.category === 'Core scene' ? this.state.layers.core || !!this.state.selectedId && (place.id === active || this.state.destinationId === 'nearest') : ['Library', 'Coffee'].includes(place.category) ? this.state.layers.daytime : this.state.layers.scenes))
  }
  private setVisibility(id: string, visible: boolean) { if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none') }
  private sourceData(id: string, data: GeoJSON.FeatureCollection) { const source = this.map.getSource(id) as MapLibreGL.GeoJSONSource | undefined; source?.setData(data) }
  private addSource(id: string, data: GeoJSON.FeatureCollection, promoteId?: string) { if (!this.map.getSource(id)) this.map.addSource(id, { type: 'geojson', data, ...(promoteId ? { promoteId } : {}) }) }
  private addLayer(layer: MapLibreGL.LayerSpecification, before?: string) { if (!this.map.getLayer(layer.id)) this.map.addLayer(layer, before && this.map.getLayer(before) ? before : undefined) }

  private armStyleTimeout() {
    clearTimeout(this.styleTimer)
    this.styleTimer = setTimeout(() => {
      if (this.destroyed || this.ready) return
      if (this.provider === 'maptiler') this.useFallback()
      else this.fail()
    }, 18000)
  }

  private fail() {
    this.ready = false
    this.container.dataset.mapReady = 'false'
    this.container.setAttribute('aria-busy', 'false')
    this.publishStatus({ status: 'error', message: 'The map could not load. All apartment photos, comparisons and source links still work.' })
    if (!this.everReady) this.callbacks.failed()
  }

  private loadStyle(style: string, provider: MapProvider) {
    if (this.destroyed) return
    this.ready = false
    this.provider = provider
    this.container.dataset.mapReady = 'false'
    this.container.setAttribute('aria-busy', 'true')
    this.hoveredZip = null
    this.transientFailures = []
    this.dismissPopup()
    this.logo.element.hidden = provider !== 'maptiler'
    this.armStyleTimeout()
    try { this.map.setStyle(style, { diff: false }) } catch { if (provider === 'maptiler') this.useFallback(); else this.fail() }
  }

  private useFallback() {
    if (this.destroyed || this.provider === 'openfreemap') return
    this.publishStatus({ status: 'fallback', message: 'MapTiler is unavailable. Showing the backup street map with your apartments and saved routes.' })
    this.loadStyle(this.options.fallbackStyle, 'openfreemap')
  }

  private onError = (event: MapLibreGL.ErrorEvent) => {
    this.container.dataset.mapResourceErrors = String(++this.resourceErrors)
    // Provider errors can contain credential-bearing URLs; never forward their text.
    const error = event.error as Error & { status?: number }
    const denied = [401, 403, 429].includes(error.status ?? 0) || /\b(401|403|429)\b/.test(error.message || '')
    const transient = (error.status ?? 0) >= 500 || error.status === 0 || /\b5\d\d\b|failed to fetch|networkerror|network request|load failed/i.test(error.message || '')
    if (transient) { const now = Date.now(); this.transientFailures = [...this.transientFailures.filter(time => now - time < 15000), now] }
    if (this.provider === 'maptiler' && (denied || this.transientFailures.length >= 3)) this.useFallback()
  }

  private onStyleLoad = () => {
    if (this.destroyed) return
    clearTimeout(this.styleTimer)
    try {
      this.installLayers()
      this.styleGeneration++
      this.ready = true
      this.logo.element.hidden = this.provider !== 'maptiler'
      this.container.dataset.mapProvider = this.provider
      this.container.dataset.mapStyleGeneration = String(this.styleGeneration)
      this.container.dataset.mapReady = 'true'
      this.map.resize()
      this.applySnapshot()
      const command = this.pendingCamera
      this.pendingCamera = null
      if (command) this.command(command)
      else if (!this.everReady) this.showDowntownOverview()
      this.everReady = true
      this.publishStatus({ status: this.provider === 'maptiler' ? 'ready' : 'fallback', message: this.provider === 'maptiler' ? 'Map ready.' : 'Backup street map active. Apartment pins and saved routes remain available.' })
      this.emit('kcmo:map-ready', { provider: this.provider, styleGeneration: this.styleGeneration })
      this.callbacks.ready()
    } catch {
      if (this.provider === 'maptiler') this.useFallback()
      else this.fail()
    }
  }

  private installLayers() {
    const style = this.map.getStyle()
    const layers = style.layers || []
    const firstLabel = layers.find(layer => layer.type === 'symbol')?.id
    const firstRoad = layers.find(layer => layer.type === 'line' && /road|transport|highway/i.test(layer.id))?.id || firstLabel
    const symbol = layers.find(layer => layer.type === 'symbol' && /road.*label/i.test(layer.id) && Array.isArray(layer.layout?.['text-font'])) || layers.find(layer => layer.type === 'symbol' && Array.isArray(layer.layout?.['text-font']) && layer.layout['text-font'].every(font => typeof font === 'string'))
    const fonts = symbol?.type === 'symbol' ? symbol.layout?.['text-font'] : ['Noto Sans Regular']
    const raw = this.options.data.geography.zipAreas.geometry
    const geometry = { ...raw, features: raw.features.map(feature => ({ ...feature, id: String(feature.properties?.ZCTA5) })) }
    this.addSource('zip-areas', geometry, 'ZCTA5')
    this.addLayer({ id: 'zip-context-fill', type: 'fill', source: 'zip-areas', paint: { 'fill-color': this.cream, 'fill-opacity': 0.18 } }, firstRoad)
    this.addLayer({ id: 'zip-context-lines', type: 'line', source: 'zip-areas', paint: { 'line-color': this.green, 'line-width': 1.4, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } }, firstLabel)
    this.addLayer({ id: 'zip-fill', type: 'fill', source: 'zip-areas', paint: { 'fill-color': this.green, 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.19, 0.09] } }, firstRoad)
    this.addLayer({ id: 'zip-halo', type: 'line', source: 'zip-areas', paint: { 'line-color': this.cream, 'line-width': 5, 'line-opacity': 0.85 } }, firstLabel)
    this.addLayer({ id: 'zip-lines', type: 'line', source: 'zip-areas', paint: { 'line-color': this.green, 'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 3.5, 2.4], 'line-dasharray': [3, 2] } }, firstLabel)
    this.addLayer({ id: 'zip-labels', type: 'symbol', source: 'zip-areas', layout: { 'symbol-placement': 'line', 'symbol-spacing': 340, 'text-field': ['concat', 'ZIP ', ['to-string', ['get', 'ZCTA5']]], 'text-size': 12, 'text-font': fonts, 'text-offset': [0, -0.7] }, paint: { 'text-color': this.green, 'text-halo-color': this.cream, 'text-halo-width': 2 } })
    const streetcar = this.options.data.geography.streetcar
    this.addSource('streetcar', streetcar.routes)
    this.addLayer({ id: 'streetcar-line', type: 'line', source: 'streetcar', paint: { 'line-color': PLACE_COLORS.streetcar, 'line-width': 3, 'line-opacity': 0.85 } }, firstLabel)
    this.addSource('stops', collection(streetcar.stops.filter(stop => validCoordinate(stop.coordinates)).map(stop => point(stop.coordinates, { name: stop.name, id: stop.id }))))
    this.addLayer({ id: 'streetcar-stops', type: 'circle', source: 'stops', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2, 15, 5], 'circle-color': '#fff', 'circle-stroke-color': PLACE_COLORS.streetcar, 'circle-stroke-width': 2 } })
    this.addLayer({ id: 'stop-labels', type: 'symbol', source: 'stops', minzoom: 14, layout: { 'text-field': ['get', 'name'], 'text-size': 10, 'text-font': fonts, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-max-width': 12 }, paint: { 'text-color': '#176676', 'text-halo-color': this.cream, 'text-halo-width': 2 } })
    this.addSource('walks', collection())
    this.addSource('selected-walk', collection())
    this.addLayer({ id: 'walk-context', type: 'line', source: 'walks', paint: { 'line-color': '#3c76af', 'line-width': 2, 'line-opacity': 0.35, 'line-dasharray': [2, 2] } })
    this.addLayer({ id: 'walk-halo', type: 'line', source: 'selected-walk', paint: { 'line-color': '#fff', 'line-width': 8 } })
    this.addLayer({ id: 'walk-main', type: 'line', source: 'selected-walk', paint: { 'line-color': '#2874bb', 'line-width': 4 } })
    this.installBuildings(layers, firstLabel)
    this.foodLayers = layers.filter(layer => layer.type === 'symbol' && /(^POI_food$|poi.*food|food.*poi)/i.test(layer.id)).map(layer => layer.id)
    if (!this.foodLayers.length && this.provider === 'maptiler' && this.map.getSource('maptiler_planet_v4')) {
      this.addLayer({ id: 'POI_food', type: 'symbol', source: 'maptiler_planet_v4', 'source-layer': 'poi_food', minzoom: 15, layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name'], ''], 'text-font': fonts, 'text-size': 11, 'text-max-width': 11, 'text-padding': 8, 'text-optional': true, 'text-anchor': 'top', 'text-offset': [0, 0.45] }, paint: { 'text-color': '#85472f', 'text-halo-color': this.cream, 'text-halo-width': 1.7 } })
      this.foodLayers = ['POI_food']
    }
    for (const kind of ['food', 'coffee'] as const) if (!this.map.hasImage(`kcmo-${kind}`)) this.map.addImage(`kcmo-${kind}`, foodMarkerImage(kind), { pixelRatio: 2 })
    this.foodBaseFilters.clear()
    this.foodDedupSignature = ''
    this.container.dataset.mapFoodDuplicatesRemoved = '0'
    this.foodSource = null
    for (const id of this.foodLayers) {
      const layer = this.map.getLayer(id)!
      this.map.setLayerZoomRange(id, 15, layer.maxzoom ?? 24)
      this.map.setLayoutProperty(id, 'icon-image', ['match', ['coalesce', ['get', 'class'], ['get', 'subclass'], ''], ['cafe', 'coffee', 'coffee_shop'], 'kcmo-coffee', 'kcmo-food'])
      this.map.setLayoutProperty(id, 'icon-anchor', 'bottom')
      this.map.setLayoutProperty(id, 'icon-size', 0.8)
      this.map.setLayoutProperty(id, 'icon-padding', 5)
      this.map.setLayoutProperty(id, 'icon-allow-overlap', false)
      this.map.setPaintProperty(id, 'text-color', '#85472f')
      this.foodBaseFilters.set(id, this.map.getFilter(id) || undefined)
      if (typeof layer.source === 'string' && layer.sourceLayer) this.foodSource = { source: layer.source, sourceLayer: layer.sourceLayer }
    }
    this.landmark.restoreStyle()
    this.container.dataset.mapFoodAvailable = String(this.foodLayers.length > 0)
    this.container.dataset.mapBuildingsAvailable = String(this.buildingLayers.length > 0)
    this.container.dataset.mapZipCount = String(raw.features.length)
    this.container.dataset.mapCustomLayerCount = String(this.map.getStyle().layers.filter(layer => ZIP_LAYERS.includes(layer.id) || STREETCAR_LAYERS.includes(layer.id) || /^(walk-|kcmo-buildings)/.test(layer.id)).length)
    this.cameraDiagnostics()
  }

  private installBuildings(layers: MapLibreGL.LayerSpecification[], before?: string) {
    this.buildingLayers = layers.filter(layer => layer.type === 'fill-extrusion' && /building/i.test(layer.id + ('source-layer' in layer ? layer['source-layer'] : ''))).map(layer => layer.id)
    if (this.buildingLayers.length) return
    const building = layers.find(layer => 'source-layer' in layer && layer['source-layer'] === 'building' && 'source' in layer)
    if (!building || !('source' in building) || typeof building.source !== 'string') return
    const maptiler = this.provider === 'maptiler'
    const height = maptiler ? 'height' : 'render_height'
    const base = maptiler ? 'height_min' : 'render_min_height'
    this.addLayer({ id: 'kcmo-buildings-3d', type: 'fill-extrusion', source: building.source, 'source-layer': 'building', minzoom: 15, filter: ['all', ['!=', ['get', 'hide_3d'], true], ['!', ['in', ['to-string', ['coalesce', ['get', 'underground'], false]], ['literal', ['true', '1']]]]], paint: { 'fill-extrusion-color': '#cfdbd0', 'fill-extrusion-height': ['coalesce', ['get', height], 3], 'fill-extrusion-base': ['coalesce', ['get', base], 0], 'fill-extrusion-opacity': 0.87 } }, before)
    this.buildingLayers = ['kcmo-buildings-3d']
  }

  snapshot(state: MapSnapshot) {
    this.state = copySnapshot(state)
    if (this.ready) this.applySnapshot()
  }

  private applySnapshot() {
    if (!this.ready || this.destroyed) return
    const { layers, zips } = this.state
    const filter: MapLibreGL.FilterSpecification = ['in', ['to-string', ['get', 'ZCTA5']], ['literal', zips]]
    for (const id of ['zip-fill', 'zip-halo', 'zip-lines']) if (this.map.getLayer(id)) this.map.setFilter(id, filter)
    for (const id of ZIP_LAYERS) this.setVisibility(id, layers.zip)
    for (const id of STREETCAR_LAYERS) this.setVisibility(id, layers.streetcar)
    for (const id of this.foodLayers) this.setVisibility(id, layers.food)
    for (const id of this.buildingLayers) this.setVisibility(id, this.state.threeD)
    this.landmark.setEnabled(this.state.threeD && this.visiblePlaces().some(place => place.id === 'in-good-co'))
    this.landmark.setReducedMotion(this.state.reducedMotion)
    this.updateMotion()
    const property = this.apartment()
    const route = currentRoute(property, this.state)
    const routes = property && (layers.core || this.state.destinationId === 'nearest') ? property.walks.filter(walk => walk.geometry).map(walk => ({ type: 'Feature' as const, geometry: walk.geometry!, properties: { destination: walk.destinationId } })) : []
    this.sourceData('walks', collection(routes))
    this.sourceData('selected-walk', collection(route?.geometry ? [{ type: 'Feature', geometry: route.geometry, properties: { destination: route.destinationId } }] : []))
    this.renderPropertyMarkers()
    this.renderPlaceMarkers()
    this.updateFoodDuplicates()
    Object.assign(this.container.dataset, { mapSelectedId: this.state.selectedId || '', mapDestinationId: this.state.destinationId, mapSelectedZips: JSON.stringify(zips), mapVisiblePropertyCount: String(this.state.visibleIds.length), mapRouteDestinationId: route?.geometry ? route.destinationId : '', mapRouteCount: String(routes.length + (route?.geometry ? 1 : 0)), mapLayers: JSON.stringify(layers), mapThreeD: String(this.state.threeD) })
    this.container.dataset.mapSelectedZipCount = String(zips.length)
    this.container.dataset.mapRenderedZipCount = String(layers.zip ? this.options.data.geography.zipAreas.geometry.features.length : 0)
    this.container.dataset.mapSelectedRoutePoints = String(route?.geometry?.coordinates.length || 0)
  }

  private renderPropertyMarkers() {
    if (!this.ready) return
    const activeId = (document.activeElement as HTMLElement | null)?.dataset.propertyId
    this.propertyMarkers.forEach(marker => marker.remove())
    this.propertyMarkers = []
    const groups: { xy: MapLibreGL.Point; items: Apartment[] }[] = []
    for (const property of this.visibleApartments()) {
      const xy = this.map.project(lngLat(property.coordinates!))
      const group = groups.find(item => Math.abs(item.xy.x - xy.x) < 46 && Math.abs(item.xy.y - xy.y) < 46)
      if (group) group.items.push(property)
      else groups.push({ xy, items: [property] })
    }
    for (const { items } of groups) {
      const property = items.find(item => item.id === this.state.selectedId) || items[0]
      const selected = items.some(item => item.id === this.state.selectedId)
      const button = document.createElement('button')
      button.className = `property-pin zip-${property.zip}${selected ? ' selected' : ''}`
      button.type = 'button'
      button.dataset.propertyId = property.id
      button.dataset.propertyIds = JSON.stringify(items.map(item => item.id))
      button.setAttribute('aria-label', items.length > 1 ? `Choose ${items.length} nearby properties: ${items.map(item => item.name).join(', ')}` : `Map: ${property.name}`)
      button.setAttribute('aria-pressed', String(selected))
      button.innerHTML = `<span class="pin-face${items.length > 1 ? ' group-pin' : ''}">${icon('home')}${items.length > 1 ? `<span>${items.length}</span>` : ''}</span>`
      const face = button.querySelector<HTMLElement>('.pin-face')!
      face.style.background = this.green
      button.onclick = event => {
        event.stopPropagation()
        if (items.length === 1) { this.dismissPopup(); this.intent({ type: 'select-apartment', id: property.id }); return }
        const content = document.createElement('div')
        content.className = 'place-popup'
        appendText(content, 'h3', new Set(items.map(item => item.coordinates?.join(','))).size === 1 ? 'Separate records at one address' : `${items.length} nearby properties at this zoom`)
        for (const candidate of items) {
          const choose = appendText(content, 'button', candidate.name) as HTMLButtonElement
          choose.type = 'button'
          choose.style.marginTop = '8px'
          choose.onclick = () => { this.dismissPopup(); this.intent({ type: 'select-apartment', id: candidate.id }) }
        }
        this.openPopup(lngLat(items[0].coordinates!), content)
      }
      this.propertyMarkers.push(new MapLibreGL.Marker({ element: button }).setLngLat(lngLat(property.coordinates!)).addTo(this.map))
    }
    if (activeId) this.propertyMarkers.find(marker => JSON.parse(marker.getElement().dataset.propertyIds || '[]').includes(activeId))?.getElement().focus({ preventScroll: true })
    this.container.dataset.mapPropertyMarkerCount = String(groups.length)
    this.container.dataset.mapMappedPropertyCount = String(groups.reduce((total, group) => total + group.items.length, 0))
    this.updatePlaceLabels()
  }

  private renderPlaceMarkers() {
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset.placeId
    this.placeMarkers.forEach(marker => marker.remove())
    this.placeMarkers = []
    const active = this.activeDestination()
    const visiblePlaces = this.visiblePlaces()
    const categories: Record<string, number> = {}
    for (const place of visiblePlaces) {
      const core = place.category === 'Core scene'
      const day = ['Library', 'Coffee'].includes(place.category)
      const kind = placeKind(place.category)
      const always = place.id === 'in-good-co'
      categories[kind] = (categories[kind] || 0) + 1
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `venue-pin category-${kind} ${day ? 'daytime' : !core ? 'other-scene' : ''} ${always ? 'priority' : ''} ${active === place.id ? 'active' : ''}`
      button.dataset.placeId = place.id
      button.dataset.category = kind
      button.dataset.always = String(always)
      button.dataset.priority = String(active === place.id ? 100 : always ? 90 : core ? 50 : kind === 'library' ? 30 : 10)
      button.setAttribute('aria-label', `${categoryLabel(place.category)}: ${place.name}`)
      button.setAttribute('aria-pressed', String(active === place.id))
      const dot = document.createElement('span')
      dot.className = 'place-dot'
      dot.innerHTML = place.id === 'in-good-co' ? '<img src="assets/landmarks/in-good-co.svg" alt="" aria-hidden="true" width="32" height="32">' : icon(kind)
      if (place.id === 'in-good-co') button.classList.add('landmark-pin')
      button.append(dot)
      const label = appendText(button, 'span', place.name === 'In The Lowest Ferns' ? 'Lowest Ferns · West Bottoms' : place.name, 'place-label')
      if (core) appendText(label, 'small', this.options.placeGuides?.[place.id]?.short || 'Nightlife')
      if (['in-good-co', 'recordbar', 'mod'].includes(place.id)) button.classList.add('label-left')
      button.onclick = event => {
        event.stopPropagation()
        this.intent({ type: core ? 'select-destination' : 'show-place', id: place.id })
      }
      this.placeMarkers.push(new MapLibreGL.Marker({ element: button }).setLngLat(lngLat(place.coordinates!)).addTo(this.map))
    }
    this.container.dataset.mapPlaceMarkerCount = String(this.placeMarkers.length)
    this.container.dataset.mapPlaceCategories = JSON.stringify(categories)
    this.updatePlaceLabels()
    if (focusedId) this.placeMarkers.find(marker => marker.getElement().dataset.placeId === focusedId)?.getElement().focus({ preventScroll: true })
  }

  private updatePlaceLabels = () => {
    if (!this.ready) return
    const mapRect = this.container.getBoundingClientRect()
    const padding = this.safePadding()
    const intersects = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) => a.left < b.right + 5 && a.right > b.left - 5 && a.top < b.bottom + 5 && a.bottom > b.top - 5
    const controls = [...(this.container.parentElement?.querySelectorAll<HTMLElement>('.map-view-controls, .zip-boundary-control, .maplibregl-ctrl-attrib, .kcmo-provider-logo') || [])]
      .map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height)
    const protectedRects = this.propertyMarkers.map(home => {
      const xy = this.map.project(home.getLngLat())
      const rect = { left: mapRect.left + xy.x - 24, right: mapRect.left + xy.x + 24, top: mapRect.top + xy.y - 24, bottom: mapRect.top + xy.y + 24 }
      home.getElement().classList.toggle('control-occluded', controls.some(control => intersects(rect, control)))
      return rect
    })
    const occupiedLabels = [...protectedRects, ...controls]
    const occupiedPlaces = [...protectedRects]
    const places = [...this.placeMarkers].sort((a, b) => Number(b.getElement().dataset.priority) - Number(a.getElement().dataset.priority))
    const visibleCategories: Record<string, number> = {}
    let labelCount = 0
    for (const marker of places) {
      const element = marker.getElement()
      const xy = this.map.project(marker.getLngLat())
      const pinRect = { left: mapRect.left + xy.x - 18, right: mapRect.left + xy.x + 18, top: mapRect.top + xy.y - 18, bottom: mapRect.top + xy.y + 18 }
      const occluded = controls.some(control => intersects(pinRect, control)) || occupiedPlaces.some(rect => intersects(pinRect, rect))
      element.classList.toggle('control-occluded', occluded)
      if (!occluded) occupiedPlaces.push(pinRect)
      element.classList.toggle('overview-pin', this.map.getZoom() < 13)
      const inView = !occluded && xy.x >= 0 && xy.x <= mapRect.width && xy.y >= 0 && xy.y <= mapRect.height
      if (inView) visibleCategories[element.dataset.category!] = (visibleCategories[element.dataset.category!] || 0) + 1
      element.dataset.inViewport = String(inView)
      const selected = element.classList.contains('active')
      const eligible = inView && (selected || element.dataset.always === 'true' || this.map.getZoom() >= 14)
      element.classList.toggle('labels-hidden', !eligible)
      if (!eligible) continue
      const label = element.querySelector<HTMLElement>('.place-label')!
      let labelRect = label.getBoundingClientRect()
      const fits = (rect: DOMRect) => rect.left >= mapRect.left + padding.left / 2 && rect.right <= mapRect.right - padding.right / 2 && rect.top >= mapRect.top && rect.bottom <= mapRect.bottom && !occupiedLabels.some(other => intersects(rect, other))
      if (!fits(labelRect)) { element.classList.toggle('label-left'); labelRect = label.getBoundingClientRect() }
      const show = fits(labelRect)
      element.classList.toggle('labels-hidden', !show)
      if (show) { occupiedLabels.push(labelRect); labelCount++ }
      occupiedLabels.push(pinRect)
    }
    this.container.dataset.mapVisiblePlaceCategories = JSON.stringify(visibleCategories)
    this.container.dataset.mapVisiblePlaceLabelCount = String(labelCount)
  }

  private onMoveEnd = () => {
    if (!this.ready) return
    if (this.correctFit()) return
    this.cameraDiagnostics()
    cancelAnimationFrame(this.frame)
    this.frame = requestAnimationFrame(() => { if (!this.destroyed) this.renderPropertyMarkers() })
  }
  private updateMotion = () => {
    this.container.dataset.mapMotion = !this.state.reducedMotion && document.visibilityState === 'visible' ? 'running' : 'paused'
  }
  private onUserMove = () => { this.fitCheck = null }

  private updateFoodDuplicates() {
    if (!this.ready || !this.foodSource || !this.map.getSource(this.foodSource.source)) return
    const places = this.visiblePlaces()
    const exclusions = new Map<string, MapLibreGL.ExpressionSpecification>()
    for (const feature of this.map.querySourceFeatures(this.foodSource.source, { sourceLayer: this.foodSource.sourceLayer })) {
      if (feature.geometry.type !== 'Point') continue
      const name = String(feature.properties?.['name:en'] || feature.properties?.name || '')
      const coordinates: [number, number] = [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
      const place = places.find(saved => nearbySamePlace(name, coordinates, saved))
      if (!place) continue
      const key = `${name}|${place.id}`
      exclusions.set(key, ['all', ['==', ['coalesce', ['get', 'name:en'], ['get', 'name'], ''], name], ['within', proximityPolygon(lngLat(place.coordinates!))]])
    }
    const signature = [...exclusions.keys()].sort().join('\n')
    if (signature === this.foodDedupSignature) return
    this.foodDedupSignature = signature
    for (const id of this.foodLayers) {
      const base = this.foodBaseFilters.get(id)
      const dedup: MapLibreGL.FilterSpecification = ['!', ['any', ...exclusions.values()]]
      this.map.setFilter(id, exclusions.size ? base ? ['all', base, dedup] as MapLibreGL.FilterSpecification : dedup : base || null)
    }
    this.container.dataset.mapFoodDuplicatesRemoved = String(exclusions.size)
  }

  private projectedExtent(coordinates: [number, number][]) {
    const positions = coordinates.map(coordinate => this.map.project(coordinate))
    return { left: Math.min(...positions.map(position => position.x)), right: Math.max(...positions.map(position => position.x)), top: Math.min(...positions.map(position => position.y)), bottom: Math.max(...positions.map(position => position.y)) }
  }

  private correctFit() {
    if (!this.fitCheck) return false
    const { width, height } = this.container.getBoundingClientRect()
    const padding = this.safePadding(), extent = this.projectedExtent(this.fitCheck.coordinates)
    const contained = extent.left >= padding.left - 1 && extent.right <= width - padding.right + 1 && extent.top >= padding.top - 1 && extent.bottom <= height - padding.bottom + 1
    const scale = Math.min((width - padding.left - padding.right) / (extent.right - extent.left), (height - padding.top - padding.bottom) / (extent.bottom - extent.top))
    const full = scale < 1.04 || this.map.getZoom() >= this.fitCheck.maxZoom
    if (contained && full || this.fitCheck.attempts >= 7) { this.container.dataset.mapFitContained = String(contained); this.fitCheck = null; return false }
    this.fitCheck.attempts++
    const center = { x: (padding.left + width - padding.right) / 2, y: (padding.top + height - padding.bottom) / 2 }
    const extentCenter = { x: (extent.left + extent.right) / 2, y: (extent.top + extent.bottom) / 2 }
    const nextCenter = this.map.unproject([width / 2 + extentCenter.x - center.x, height / 2 + extentCenter.y - center.y])
    const adjustment = Math.max(-0.7, Math.min(0.7, Math.log2(scale * 0.99) * 0.8))
    this.map.jumpTo({ center: nextCenter, zoom: Math.max(this.map.getMinZoom(), Math.min(this.fitCheck.maxZoom, this.map.getZoom() + adjustment)) })
    return true
  }

  private cameraDiagnostics() {
    this.container.dataset.mapZoom = this.map.getZoom().toFixed(3)
    this.container.dataset.mapPitch = this.map.getPitch().toFixed(2)
    this.container.dataset.mapBounds = JSON.stringify(this.map.getBounds().toArray().map(pair => pair.map(value => Number(value.toFixed(6)))))
    const extent = this.projectedExtent(polygonCoordinates(this.options.data.geography.zipAreas.geometry.features))
    const { width, height } = this.container.getBoundingClientRect()
    this.container.dataset.mapZipViewportExtent = JSON.stringify(Object.fromEntries(Object.entries(extent).map(([key, value]) => [key, Number(value.toFixed(1))])))
    this.container.dataset.mapZipViewportContainsAll = String(extent.left >= 0 && extent.right <= width && extent.top >= 0 && extent.bottom <= height)
  }
  private onZoom = () => {
    this.updatePlaceLabels()
    this.container.dataset.mapZoom = this.map.getZoom().toFixed(3)
    this.container.dataset.mapPitch = this.map.getPitch().toFixed(2)
  }
  private onIdle = () => {
    if (!this.ready) return
    this.container.setAttribute('aria-busy', 'false')
    this.cameraDiagnostics()
    this.updateFoodDuplicates()
    this.updatePlaceLabels()
    const food = this.foodLayers.filter(id => this.map.getLayer(id))
    const buildings = this.buildingLayers.filter(id => this.map.getLayer(id))
    this.container.dataset.mapFoodFeatureCount = String(food.length ? this.map.queryRenderedFeatures(undefined, { layers: food }).length : 0)
    this.container.dataset.mapVisibleBuildingCount = String(buildings.length ? this.map.queryRenderedFeatures(undefined, { layers: buildings }).length : 0)
  }
  private onMoving = () => { if (this.ready) this.container.setAttribute('aria-busy', 'true') }

  private onMouseMove = (event: MapLibreGL.MapMouseEvent) => {
    if (!this.ready) return
    const ids = [...(this.state.layers.zip ? ['zip-context-fill'] : []), ...(this.state.layers.food ? this.foodLayers : []), ...(this.state.layers.streetcar ? ['streetcar-stops'] : [])].filter(id => this.map.getLayer(id))
    const features = ids.length ? this.map.queryRenderedFeatures(event.point, { layers: ids }) : []
    const zip = features.find(feature => feature.source === 'zip-areas')?.properties?.ZCTA5
    const next = zip ? String(zip) : null
    if (this.hoveredZip !== next) {
      if (this.hoveredZip) this.map.setFeatureState({ source: 'zip-areas', id: this.hoveredZip }, { hover: false })
      if (next) this.map.setFeatureState({ source: 'zip-areas', id: next }, { hover: true })
      this.hoveredZip = next
    }
    this.map.getCanvas().style.cursor = features.some(feature => feature.source !== 'zip-areas') ? 'pointer' : ''
  }
  private onMouseOut = () => {
    if (this.hoveredZip && this.ready && this.map.getSource('zip-areas')) this.map.setFeatureState({ source: 'zip-areas', id: this.hoveredZip }, { hover: false })
    this.hoveredZip = null
    this.map.getCanvas().style.cursor = ''
  }

  private onClick = (event: MapLibreGL.MapMouseEvent) => {
    if (!this.ready) return
    const ids = [...(this.state.layers.streetcar ? ['streetcar-stops'] : []), ...(this.state.layers.food && this.map.getZoom() >= 15 ? this.foodLayers : [])].filter(id => this.map.getLayer(id))
    const feature = ids.length ? this.map.queryRenderedFeatures(event.point, { layers: ids })[0] : undefined
    if (!feature) return
    const content = document.createElement('div')
    content.className = 'place-popup'
    if (feature.source === 'stops') {
      appendText(content, 'h3', String(feature.properties.name || 'Streetcar platform'))
      appendText(content, 'p', `Published Streetcar platform · route feed ${this.options.data.geography.streetcar.feed.feed_version}`)
      appendLink(content, this.options.data.geography.streetcar.source, 'Agency route data')
    } else {
      const name = String(feature.properties['name:en'] || feature.properties.name || 'Food or drink place')
      appendText(content, 'h3', name)
      const categories = [...new Set(['class', 'subclass', 'category', 'cuisine'].map(key => feature.properties[key]).filter(value => typeof value === 'string' && value.trim() && !/^(unknown|none|other)$/i.test(value.trim())).map(value => String(value).replaceAll('_', ' ')))].join(' · ')
      if (categories) appendText(content, 'p', categories.slice(0, 250), 'small')
      appendText(content, 'p', 'Basemap place · hours, menu and current opening status have not been checked.')
      appendLink(content, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${event.lngLat.lat},${event.lngLat.lng}`)}`, 'Look up this place')
    }
    const coordinates: [number, number] = feature.geometry.type === 'Point' ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]] : [event.lngLat.lng, event.lngLat.lat]
    this.openPopup(coordinates, content)
  }

  private openPopup(coordinates: [number, number], content: HTMLElement) {
    this.dismissPopup()
    this.popup = new MapLibreGL.Popup({ offset: 20, maxWidth: '300px' }).setLngLat(coordinates).setDOMContent(content).addTo(this.map)
  }
  private dismissPopup() { this.popup?.remove(); this.popup = null }

  private showPlace(place: SavedPlace, immediate = false) {
    if (!validCoordinate(place.coordinates)) return
    this.map.flyTo({ center: lngLat(place.coordinates), zoom: 15, pitch: this.state.threeD ? 45 : 0, padding: this.safePadding(), duration: immediate ? 0 : this.duration() })
    if (this.options.renderPlaceContent) {
      this.dismissPopup()
      this.popup = new MapLibreGL.Popup({ offset: 16, anchor: 'center', maxWidth: 'min(740px, calc(100vw - 36px))', className: 'scene-map-popup' }).setLngLat(lngLat(place.coordinates)).setDOMContent(this.options.renderPlaceContent(place)).addTo(this.map)
      this.popup.getElement().style.setProperty('--scene-map-height', `${Math.max(180, this.container.clientHeight - 40)}px`)
      this.popup.getElement().style.setProperty('--scene-map-width', `${Math.max(220, this.container.clientWidth - 40)}px`)
      return
    }
    const guide = this.options.placeGuides?.[place.id]
    const content = document.createElement('div')
    content.className = 'place-popup'
    appendText(content, 'h3', place.name)
    appendText(content, 'p', place.address)
    appendText(content, 'p', `${categoryLabel(place.category)} · ${place.neighborhood || ''}`)
    appendText(content, 'p', guide?.description || place.note || 'Saved place; current opening status has not been checked.')
    appendText(content, 'p', `Source checked: ${guide?.checked || place.checked || 'Not recorded'}. Map position: ${place.coordinateSource || 'Unverified'}`, 'small')
    appendLink(content, guide?.source || place.source || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address} Kansas City MO`)}`, guide?.source || place.source ? 'Official / recorded source' : 'Look up this saved place')
    this.openPopup(lngLat(place.coordinates), content)
  }

  private safePadding() {
    const { width, height } = this.container.getBoundingClientRect()
    const padding = { ...this.state.padding }
    const horizontal = padding.left + padding.right
    const vertical = padding.top + padding.bottom
    const maxHorizontal = Math.max(0, width - 80)
    const maxVertical = Math.max(0, height - 80)
    if (horizontal > maxHorizontal && horizontal) { padding.left *= maxHorizontal / horizontal; padding.right *= maxHorizontal / horizontal }
    if (vertical > maxVertical && vertical) { padding.top *= maxVertical / vertical; padding.bottom *= maxVertical / vertical }
    return padding
  }

  private fitCoordinates(coordinates: [number, number][], maxZoom: number, animate: boolean, pitch = 0) {
    if (!coordinates.length) return
    const bounds = new MapLibreGL.LngLatBounds()
    coordinates.forEach(coordinate => bounds.extend(coordinate))
    // MapLibre's bounds calculation is flat. Refine using projected vertices so the
    // pitched view fills the usable frame while retaining every boundary.
    this.map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 })
    const camera = this.map.cameraForBounds(bounds, { padding: this.safePadding(), maxZoom, bearing: 0 })
    if (!camera) return
    this.fitCheck = { coordinates, attempts: 0, maxZoom }
    this.map.easeTo({ ...camera, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: animate ? this.duration() : 0, pitch, bearing: 0 })
  }

  private fitZips(all: boolean, animate = true) {
    const features = this.options.data.geography.zipAreas.geometry.features.filter(feature => all || this.state.zips.includes(String(feature.properties?.ZCTA5)))
    const coordinates = polygonCoordinates(features)
    if (!coordinates.length) return
    this.fitCoordinates(coordinates, 14, animate, this.state.threeD ? 30 : 0)
  }

  private showDowntownOverview() {
    this.fitCheck = null
    this.dismissPopup()
    this.map.jumpTo({ center: DOWNTOWN_OVERVIEW, zoom: 13.65, pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } })
    this.cameraDiagnostics()
  }

  command(command: MapCommand) {
    if (this.destroyed) return
    if (command.type === 'dismiss-popup') { this.dismissPopup(); return }
    if (command.type === 'reload-style') {
      this.publishStatus({ status: 'loading', message: 'Reloading the map style. Your selection and filters are preserved.' })
      this.loadStyle(this.options.style, this.isMapTiler(this.options.style) ? 'maptiler' : 'openfreemap')
      return
    }
    if (command.type === 'resize') { this.map.resize(); return }
    if (!this.ready) { if (CAMERA_COMMANDS.has(command.type)) this.pendingCamera = command; return }
    const duration = command.immediate ? 0 : this.duration()
    this.fitCheck = null
    if (command.type === 'fit-all' || command.type === 'fit-zips') { this.dismissPopup(); this.fitZips(command.type === 'fit-all', !command.immediate); return }
    if (command.type === 'zoom') {
      if (Number.isFinite(command.amount)) this.map.zoomTo(Math.max(this.map.getMinZoom(), Math.min(this.map.getMaxZoom(), this.map.getZoom() + Math.max(-5, Math.min(5, command.amount!)))), { duration })
      return
    }
    if (command.type === 'set-pitch') { this.map.easeTo({ pitch: this.state.threeD ? this.map.getZoom() < 14 ? 30 : 45 : 0, duration }); return }
    if (command.type === 'explore-3d') {
      const apartment = this.apartment(command.id || this.state.selectedId)
      const destination = this.options.data.places.find(place => place.id === command.id) || this.options.data.places.find(place => place.id === 'in-good-co')
      const coordinates = validCoordinate(apartment?.coordinates) ? apartment.coordinates : destination?.coordinates
      if (!validCoordinate(coordinates)) return
      this.dismissPopup()
      this.map.flyTo({ center: lngLat(coordinates), zoom: 16, pitch: this.state.threeD ? 45 : 0, bearing: 0, padding: this.safePadding(), duration })
      return
    }
    if (command.type === 'show-place') { const place = this.options.data.places.find(item => item.id === command.id); if (place) this.showPlace(place, command.immediate); return }
    const apartment = this.apartment(command.id || this.state.selectedId)
    if (!apartment || !validCoordinate(apartment.coordinates)) return
    this.dismissPopup()
    if (command.type === 'focus-apartment') this.map.flyTo({ center: lngLat(apartment.coordinates), zoom: 15, pitch: this.state.threeD ? 45 : 0, bearing: 0, padding: this.safePadding(), duration })
    if (command.type === 'focus-route') {
      const route = currentRoute(apartment, this.state)
      const coordinates: [number, number][] = [lngLat(apartment.coordinates)]
      if (route?.geometry) for (const coordinate of route.geometry.coordinates) coordinates.push([coordinate[0], coordinate[1]])
      const destination = this.options.data.places.find(place => place.id === (route?.destinationId || this.state.destinationId))
      if (destination && validCoordinate(destination.coordinates)) coordinates.push(lngLat(destination.coordinates))
      this.fitCoordinates(coordinates, 16, !command.immediate, this.state.threeD ? 45 : 0)
    }
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    clearTimeout(this.styleTimer)
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.landmark.destroy()
    document.removeEventListener('visibilitychange', this.updateMotion)
    this.dismissPopup()
    this.propertyMarkers.forEach(marker => marker.remove())
    this.placeMarkers.forEach(marker => marker.remove())
    this.map.off('style.load', this.onStyleLoad)
    this.map.off('error', this.onError)
    this.map.off('moveend', this.onMoveEnd)
    this.map.off('zoom', this.onZoom)
    this.map.off('click', this.onClick)
    this.map.off('mousemove', this.onMouseMove)
    this.map.off('mouseout', this.onMouseOut)
    this.map.off('idle', this.onIdle)
    this.map.off('movestart', this.onMoving)
    this.map.off('dragstart', this.onUserMove)
    if (this.map.hasControl(this.scale)) this.map.removeControl(this.scale)
    if (this.map.hasControl(this.logo)) this.map.removeControl(this.logo)
    this.container.dataset.mapReady = 'false'
  }
}
