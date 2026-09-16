# In Good Co landmark

An original, symbolic cocktail sign. It is not a reconstruction of the venue or an assertion about building height.

- `in-good-co.glb`: 25,088 bytes, nine meshes, four solid-color materials, no textures or external files. Exported using Blender 5.2.1's built-in GLB exporter.
- `in-good-co.svg`: matching original flat icon, used by the accessible destination marker regardless of 3D support.
- Palette: plum enamel, terracotta bowl, cream stem/rim, amber citrus. The sign's asymmetry separates it from circular apartment markers.

Reproduce from the repository root:

```sh
blender --background --factory-startup --python 06_scripts_and_tools/build_map_landmark.py
```

The generator writes the shipping assets here and keeps the editable `.blend`, transparent inspection render, and manifest in `tmp/map-landmark/`. Its preview was visually inspected for silhouette, cropping, and material readability.

## Runtime

`src/apartment-landmark.ts` follows the [official MapLibre custom-layer example](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/). It imports Three.js and loads the GLB only when the 3D layer is enabled, zoom reaches 14.5, and the landmark is near the viewport. The HTML marker keeps all selection and keyboard interactions.

The default scale is a symbolic 16 meters per Blender unit, at 8 meters above the map surface. These values deliberately emphasize a landmark and must not be presented as real venue measurements. The sign's inner object has a small vertical bob, capped at 20 repaint requests per second; motion stops when hidden or reduced motion is requested.

The helper restores its custom layer when the controller restores styles, reports `data-landmark-status` / `data-landmark-visible` for local QA, and leaves the flat marker usable if GLB or renderer loading fails. Cleanup releases GPU resources without destroying MapLibre's shared graphics context. No paid exporter or remote model service is used.
