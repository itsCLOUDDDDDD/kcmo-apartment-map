# mapcn apartment-map runtime

This folder contains the bundled mapcn/React map renderer, MapLibre styles and locally served worker files. The apartment page imports `apartment-runtime.js`. React owns all map sources, layers, grouped apartment pins, saved-place markers, popups and camera calls. The page owns apartment selection, filters, comparisons and session-only ranks.

All files in this folder belong together and are deployed with the website, its configuration, bridge, geometry and landmark assets. Asset paths are relative so the bundle works in the GitHub Pages project subdirectory.

The source project is `outputs/mapcn-local-20260915`. Run `pnpm run build:apartment` there to type-check, bundle and refresh these runtime assets. This does not read or rebuild the workbook data. The normal data generator remains a separate operation. The renderer reads the supplied public export; it does not edit V3 or infer new apartment records from ZIP geography.

`manifest.json` lists the runtime asset checksums. `THIRD-PARTY-LICENSES.txt` includes the dependency and mapcn licenses. MapTiler is the configured primary style; OpenFreeMap is the connection fallback. Source attribution remains visible, with a linked MapTiler logo while MapTiler is active. The browser key belongs in the page's origin-restricted public configuration, never in this bundle's source or event payloads.

## Runtime boundary

`mountApartmentMap(container, options)` resolves to `{ destroy() }`; it exposes no raw MapLibre instance. Options include `workerUrl`, `style`, `fallbackStyle`, `data`, `initialState`, optional `colors`, optional `placeGuides`, and optional `signal`. An aborted signal cancels an in-progress mount and removes listeners and resources; an already mounted map is destroyed.

- `kcmo:map-state` carries a complete snapshot: ZIPs, visible property IDs, selected ID, destination ID, 3D flag, optional-layer flags, camera padding and reduced-motion preference. The runtime subscribes before mounting and replays the newest snapshot after style loading.
- `kcmo:map-command` carries a camera/popup command. Commands that need a loaded map are coalesced to the latest request during loading. The optional `immediate:true` flag disables animation for ordered startup replay. Full ZIP overview uses polygon geometry even when the ZIP layer is hidden or a ZIP has no exported apartment.
- `kcmo:map-intent` reports apartment selection, destination selection or opening a saved place. The page validates the ID, updates its authoritative state and sends a new snapshot.
- `kcmo:map-ready` includes provider and style generation. `kcmo:map-status` reports loading, ready, fallback or failure with credential-free messages.

Every successful style load restores the ZIP, Streetcar, walk, 3D and food layers plus current filters. Style reloads preserve the camera unless a newer camera command was queued. `destroy()` removes map event subscriptions, browser event subscriptions, markers, popups, timers and resize observers.

ZIP outlines are approximate Census ZCTAs. MapTiler food labels are optional from zoom 15 and are distinct from the curated destinations. Their current hours and business status are not researched. MapTiler v4 building extrusions use its `building` height fields; the fallback uses the matching OpenFreeMap schema. Neither is a verified sunlight or exact-unit view.

## Landing and landmark presentation

The page supplies enabled destination layers and `threeD:true` on a fresh load. Full ZIP fitting uses a 30-degree pitch when 3D is enabled, with a projected-vertex containment check after fitting. The `set-pitch` command changes the pitch without forcing a closer zoom; `explore-3d` separately frames the selected apartment, or In Good Co when no mapped apartment is selected, at zoom 16. ZIP filtering and ordinary overview commands retain the supplied 2D/3D choice.

Apartment markers remain green circles. Saved nightlife uses plum diamonds, libraries blue squares, and coffee amber teardrops. Basemap restaurants use terracotta food icons. Label placement gives the selected destination first priority and hides secondary labels when they collide. Basemap food duplicates are suppressed only for a named business within 85 metres of a currently visible saved place; unrelated nearby food remains available.

In Good Co uses an original symbolic GLB landmark (`assets/landmarks/in-good-co.glb`) and a matching flat SVG. The controller's `apartment-landmark.ts` helper lazily loads the asset and Three.js once 3D is enabled and the landmark is in view at zoom 14.5 or closer. The accessible DOM marker still handles keyboard/click selection. The landmark and its selected destination return after style restoration. Asset and module failures retain the flat marker. Both DOM and model animation respect reduced motion and document visibility.

Renderer diagnostics are exposed as `data-map-*` attributes on the map container for local verification: mode/pitch, projected ZIP extent and containment, saved-place categories, visible labels, rendered food/building feature counts and food duplicates removed. The landmark helper exposes its load status and visibility. No MapLibre instance is exposed to the page.
