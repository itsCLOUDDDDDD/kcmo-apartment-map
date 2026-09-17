/* eslint-disable react-refresh/only-export-components -- Static adapter exports a mount function. */
import { Component, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import * as MapLibreGL from 'maplibre-gl'
import { Map, useMap } from '@/components/ui/map'
import { ApartmentMapController } from './apartment-map-controller'
import { copySnapshot, isSnapshot } from './apartment-map-helpers'
import type { MapCommand, MountOptions } from './apartment-map-types'
import './apartment-runtime.css'

type MountedMap = { destroy: () => void }

class MapBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function MapConnection({ connect }: { connect: (map: MapLibreGL.Map) => () => void }) {
  const { map } = useMap()
  useEffect(() => map ? connect(map) : undefined, [map, connect])
  return null
}

const COMMANDS = new Set(['focus-apartment', 'focus-route', 'fit-all', 'fit-zips', 'zoom', 'resize', 'show-place', 'dismiss-popup', 'set-pitch', 'explore-3d', 'reload-style'])

// Subscribe before React mounts so loading cannot swallow filter/camera changes.
// No MapLibre object crosses this boundary.
export function mountApartmentMap(container: HTMLElement, options: MountOptions): Promise<MountedMap> {
  if (!isSnapshot(options.initialState)) return Promise.reject(new Error('The map state is incomplete.'))
  if (options.signal?.aborted) return Promise.reject(new DOMException('Map mounting was cancelled.', 'AbortError'))
  MapLibreGL.setWorkerUrl(options.workerUrl)
  const root = createRoot(container)
  let controller: ApartmentMapController | null = null
  let state = copySnapshot(options.initialState)
  let pending: MapCommand | null = null
  let destroyed = false
  let removeAbort = () => {}
  const onState = (event: Event) => {
    const detail: unknown = (event as CustomEvent).detail
    if (!isSnapshot(detail)) return
    state = copySnapshot(detail)
    controller?.snapshot(state)
  }
  const onCommand = (event: Event) => {
    const detail = (event as CustomEvent<MapCommand>).detail
    if (!detail || !COMMANDS.has(detail.type)) return
    if (controller) controller.command(detail)
    else pending = { ...detail }
  }
  window.addEventListener('kcmo:map-state', onState)
  window.addEventListener('kcmo:map-command', onCommand)
  const destroy = () => {
    if (destroyed) return
    destroyed = true
    removeAbort()
    window.removeEventListener('kcmo:map-state', onState)
    window.removeEventListener('kcmo:map-command', onCommand)
    controller?.destroy()
    controller = null
    root.unmount()
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => fail(), 45000)
    const fail = () => {
      if (settled || destroyed) return
      settled = true
      clearTimeout(timeout)
      queueMicrotask(destroy)
      reject(new Error('The map and backup map could not load.'))
    }
    const ready = () => {
      if (settled || destroyed) return
      settled = true
      clearTimeout(timeout)
      resolve({ destroy })
    }
    const abort = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new DOMException('Map mounting was cancelled.', 'AbortError'))
      }
      destroy()
    }
    options.signal?.addEventListener('abort', abort, { once: true })
    removeAbort = () => options.signal?.removeEventListener('abort', abort)
    const connect = (map: MapLibreGL.Map) => {
      const instance = new ApartmentMapController(map, container, options, state, { ready, failed: fail })
      controller = instance
      instance.snapshot(state)
      if (pending) { instance.command(pending); pending = null }
      return () => { instance.destroy(); if (controller === instance) controller = null }
    }
    if (options.signal?.aborted) { abort(); return }
    root.render(
      <MapBoundary onError={fail}>
        <Map className="kcmo-mapcn" theme="light" styles={{ light: options.style, dark: options.style }}
          center={[-94.578, 39.083]} zoom={11} attributionControl={{ compact: true }}
          canvasContextAttributes={{ antialias: true }}>
          <MapConnection connect={connect} />
        </Map>
      </MapBoundary>,
    )
  })
}
