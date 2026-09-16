# Kansas City apartment map

September 15, 2026 release. [Open the apartment map](https://itscloudddddd.github.io/kcmo-apartment-map/).

## Architecture

`index.html` and `styles.css` provide photo cards, a compact ZIP selector, Map/List views, apartment previews/details, comparisons and options. `app.js` owns application state. `map-bridge.js` connects it to React/mapcn through namespaced browser events. React owns MapLibre, markers, popups, sources and layers. See [runtime and event documentation](mapcn/README.md).

The map uses MapTiler Dataviz Light (`dataviz-v4-light`), with OpenFreeMap Positron as fallback. The browser key and style are in `map-config.js`. 3D uses vector footprints and recorded heights; it does not establish apartment views or sunlight. Optional restaurant/café labels come from the basemap, separately from saved destinations.

## Apartments and boundaries

The reviewed export contains **53 apartment records, 48 confirmed pins and 25 saved places**. This is a preserved public snapshot, not a live copy of the broader research workbook. Existing apartment/place records and walking routes are retained.

Bundled `kc-zctas.geojson` covers exactly 64101, 64105, 64106, 64108, 64109, 64110, 64111, 64112, 64113, 64114, 64116, 64124 and 64127. These are **approximate ZIP areas** from the 2020 Census, not USPS delivery boundaries. `kc-zctas.metadata.json` records source, vintage and checksum. Boundaries start off; enabling them shows all 13 and emphasizes selected areas. Nine areas have no exported apartments and show an empty state.

Initial framing includes all 13 polygons. More options has separate actions for selected areas and all areas. Card/pin selection focuses an apartment. Ordinary renders preserve camera position.

## Configuration and rebuilding

This is a static website hosted with GitHub Pages. For a local preview, serve this directory over HTTP. No Apple Maps SDK, Apple credentials or application backend is required. Ordinary external map links remain available.

The public browser key is restricted in MapTiler to `itscloudddddd.github.io`, `localhost` and `127.0.0.1`. Keep the linked MapTiler logo and attribution. The account was verified on the **Free** plan: [current pricing](https://www.maptiler.com/cloud/pricing/) includes 100,000 API requests/month for MapLibre; reaching the limit pauses service. No paid upgrade was made. Analytics showed zero current-period requests at inspection and may lag.

From the workspace root, `node 06_scripts_and_tools/fetch_kc_zctas.mjs` refreshes the saved Census source and bundled geometry. `node 06_scripts_and_tools/build_map_geography.mjs` rebuilds from saved sources. The existing `build_shared_apartment_map.mjs` workflow embeds geography into map-data.js under its workbook/export rules.

In the local source workspace, run `pnpm run build:apartment` from `outputs/mapcn-local-20260915` to compile the website runtime, manifest and worker files. Relative assets support GitHub Pages subdirectories. Deploy the reviewed site files, configuration, bridge, presentation helpers, geometry, landmark assets and entire `mapcn/` folder together. The source workspace and rebuild tools are not part of this public bundle.

Fresh loads enable all destination categories and 3D; ZIP boundaries start off. Map controls let visitors switch to 2D, explore a selected apartment in 3D or show all 13 ZIP areas. Apartment details retain floor-plan and available-unit links, Street View, nearby destinations and comparisons. Temporary comparisons and preference choices remain session-only.

Keep the workbook, local research, backups, QA tools and source dependencies private. Git history preserves previous public versions for rollback.
