import { MercatorCoordinate } from 'maplibre-gl'
import type { CustomLayerInterface, Map as LibreMap } from 'maplibre-gl'
import type { Object3D, Material, Mesh, Texture } from 'three'

export type LandmarkState = { status: 'idle' | 'loading' | 'ready' | 'error'; visible: boolean }
export type LandmarkOptions = {
  url: string
  coordinates: [number, number]
  id?: string
  minZoom?: number
  altitude?: number
  metersPerUnit?: number
  onStateChange?: (state: LandmarkState) => void
  onVisibilityChange?: (visible: boolean) => void
}

type ThreeModule = typeof import('three')

function releaseModel(model: Object3D | null) {
  if (!model) return
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  model.traverse(object => {
    const mesh = object as Mesh
    mesh.geometry?.dispose()
    if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material)
  })
  for (const material of materials) {
    for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture)
    material.dispose()
  }
  for (const texture of textures) texture.dispose()
}

/** A symbolic landmark; DOM markers retain hit targets, labels and keyboard access. */
export function createLandmark(map: LibreMap, options: LandmarkOptions) {
  const id = options.id ?? 'in-good-co-landmark'
  const minimumZoom = options.minZoom ?? 14.5
  const container = map.getContainer()
  const abort = new AbortController()
  let enabled = false
  let reducedMotion = false
  let destroyed = false
  let pending: Promise<void> | null = null
  let three: ThreeModule | null = null
  let model: Object3D | null = null
  let state: LandmarkState = { status: 'idle', visible: false }
  let frame = 0
  let previousFrame = 0
  let phase = 0
  let layer: CustomLayerInterface | null = null

  function publish(status = state.status, visible = state.visible) {
    if (state.status === status && state.visible === visible) return
    const visibilityChanged = state.visible !== visible
    state = { status, visible }
    container.dataset.landmarkStatus = status
    container.dataset.landmarkVisible = String(visible)
    options.onStateChange?.({ ...state })
    if (visibilityChanged) options.onVisibilityChange?.(visible)
  }

  function inView() {
    if (destroyed || !enabled || document.hidden || map.getZoom() < minimumZoom) return false
    const point = map.project(options.coordinates)
    return point.x >= -80 && point.x <= container.clientWidth + 80 && point.y >= -80 && point.y <= container.clientHeight + 80
  }

  function stopAnimation() {
    cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
  }

  function tick(time: number) {
    frame = 0
    if (!state.visible || reducedMotion || document.hidden || destroyed) return
    if (!previousFrame || time - previousFrame >= 50) {
      if (previousFrame) phase += Math.min(time - previousFrame, 100) / 1000
      previousFrame = time
      map.triggerRepaint()
    }
    frame = requestAnimationFrame(tick)
  }

  function updateAnimation() {
    if (!state.visible || reducedMotion || document.hidden || destroyed) stopAnimation()
    else if (!frame) frame = requestAnimationFrame(tick)
  }

  function install() {
    if (destroyed || !model || !three || map.getLayer(id) || !map.isStyleLoaded()) return
    const THREE = three
    const object = model
    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const ambient = new THREE.HemisphereLight(0xfff5df, 0x736073, 2.8)
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(-3, 6, 5)
    scene.add(ambient, key, object)
    const origin = MercatorCoordinate.fromLngLat(options.coordinates, options.altitude ?? 8)
    const unit = origin.meterInMercatorCoordinateUnits() * (options.metersPerUnit ?? 16)
    const matrix = new THREE.Matrix4()
    const modelMatrix = new THREE.Matrix4()
      .makeTranslation(origin.x, origin.y, origin.z)
      .scale(new THREE.Vector3(unit, -unit, unit))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    let renderer: InstanceType<ThreeModule['WebGLRenderer']> | null = null
    let failed = false
    layer = {
      id,
      type: 'custom',
      renderingMode: '3d',
      onAdd(_map, gl) {
        try {
          renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true })
          renderer.autoClear = false
          renderer.outputColorSpace = THREE.SRGBColorSpace
        } catch {
          failed = true
          publish('error', false)
        }
      },
      render(_gl, args) {
        if (failed || !renderer || !inView()) return
        try {
          // Only the sign gently moves; the geographic coordinate stays fixed.
          object.position.y = reducedMotion ? 0 : Math.sin(phase * Math.PI / 3.5) * .035
          camera.projectionMatrix.copy(matrix.fromArray(args.defaultProjectionData.mainMatrix)).multiply(modelMatrix)
          renderer.resetState()
          renderer.render(scene, camera)
          renderer.resetState()
        } catch {
          failed = true
          publish('error', false)
          stopAnimation()
        }
      },
      onRemove() {
        // Dispose this renderer's GPU resources without losing MapLibre's shared context.
        releaseModel(object)
        renderer?.dispose()
        renderer = null
        scene.clear()
        publish(state.status, false)
        stopAnimation()
      },
    }
    try {
      map.addLayer(layer)
    } catch {
      ;(renderer as InstanceType<ThreeModule['WebGLRenderer']> | null)?.dispose()
      scene.clear()
      layer = null
      publish('error', false)
    }
  }

  async function load() {
    if (pending || model || state.status === 'error' || destroyed) return
    publish('loading', false)
    pending = (async () => {
      try {
        const [THREE, { GLTFLoader }, response] = await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
          fetch(options.url, { signal: abort.signal }),
        ])
        if (!response.ok) throw new Error('Landmark asset unavailable')
        const bytes = await response.arrayBuffer()
        if (destroyed) return
        const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', options.url).href)
        if (destroyed) { releaseModel(gltf.scene); return }
        model = gltf.scene
        model.traverse(object => {
          const mesh = object as Mesh
          if (mesh.isMesh) mesh.frustumCulled = false
        })
        three = THREE
        publish('ready', false)
        refresh()
      } catch {
        if (!destroyed) publish('error', false)
      } finally { pending = null }
    })()
    await pending
  }

  function refresh() {
    if (destroyed) return
    const wanted = inView()
    if (wanted && state.status === 'idle') void load()
    if (wanted && model && state.status !== 'error') install()
    const visible = wanted && state.status === 'ready' && !!map.getLayer(id)
    const visibilityChanged = state.visible !== visible
    publish(state.status, visible)
    updateAnimation()
    if (visibilityChanged) map.triggerRepaint()
  }

  container.dataset.landmarkStatus = 'idle'
  container.dataset.landmarkVisible = 'false'
  map.on('moveend', refresh)
  map.on('zoom', refresh)
  map.on('idle', refresh)
  document.addEventListener('visibilitychange', refresh, { signal: abort.signal })
  return {
    setEnabled(value: boolean) { enabled = value; refresh() },
    setReducedMotion(value: boolean) { reducedMotion = value; refresh(); map.triggerRepaint() },
    restoreStyle() { refresh() },
    destroy() {
      if (destroyed) return
      destroyed = true
      abort.abort()
      stopAnimation()
      map.off('moveend', refresh)
      map.off('zoom', refresh)
      map.off('idle', refresh)
      if (map.getLayer(id)) map.removeLayer(id)
      else releaseModel(model)
      model = null
      three = null
      layer = null
      container.dataset.landmarkVisible = 'false'
    },
  }
}
