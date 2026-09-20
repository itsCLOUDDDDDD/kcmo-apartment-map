# Kansas City apartment map

## Current master snapshot — September 20

The website uses the latest reviewed Google Sheet snapshot: **106 public properties, 104 mapped, two unresolved, and 2,808 Google walking measurements**. All 104 mapped properties have complete 27-venue and four-priority coverage. Missing path geometry does not invalidate walking times and is never invented. The priority venues are recordBar, Green Lady Lounge, MOD and In Good Co; Third Place remains an additional destination. The live Sheet remains the master. See [current status](docs/CURRENT-STATUS.md) and [build instructions](docs/BUILD.md).

The September 16 sections below describe the historical release; current counts, priorities and source ownership above supersede those older details.

## Start here: shared ChatGPT and Codex context

This repository is the shared website/source reference. The existing live Google Sheet is the property-data master; provide its access separately. Private workbooks and research are not stored here. Read these documents explicitly when starting a new chat; a project connection is not a copy of the full conversation.

- [Agent instructions](AGENTS.md): working rules and source ownership.
- [Current status and next action](docs/CURRENT-STATUS.md): current decisions, completed work and unresolved automation.
- [Sheet-to-website mapping](docs/DATA-FLOW.md): inputs, transformations, display fields and known gaps.
- [Build and publication instructions](docs/BUILD.md): prerequisites, preview and GitHub Desktop steps.
- [ChatGPT Project instructions](docs/CHATGPT-PROJECT-INSTRUCTIONS.md): text to paste into the project's settings; the same context applies to Codex through AGENTS.md.
- [Workbook exporter source](tools/workbook-export/README.md) and [editable renderer](src/map-runtime/README.md).

The September 16 sections below describe the existing published snapshot. Later sheet changes are recorded in current status and are not automatically reflected in the website. A website push does not fetch the latest sheet.

## Published snapshot — September 16

September 16, 2026 release. [Open the apartment map](https://itscloudddddd.github.io/kcmo-apartment-map/). Compact mobile controls, snap-scrolling apartment cards and contextual community feedback build on the existing amenity and ZIP/search filters. The static snapshot contains 105 properties.

## Mobile layout and community feedback

The September 16 mobile revision uses a fixed full-width map background with a compact overlaid card carousel. Swiping focuses the apartment pin; View details opens the full details. List mode has a persistent Show map control. The compact toolbar, active-filter counts and filter bottom sheet remain. Chrome verification covers 320–430px mobile widths and desktop; Safari remains unverified. The layout retains gallery, comparisons, routes, 3D and apartment-detail behavior, with safe-area spacing, keyboard navigation and reduced-motion support. Chromium checks covered 320, 375, 390 and 430px widths; Safari verification remains outstanding.

Old Town properties include an anonymous community-comment summary after Tradeoffs. The supplied screenshot names Old Town Lofts without identifying the exact building or unit. Reports are clearly marked unverified and may not describe the selected property. They do not change property facts, amenity matches, rankings or cost calculations. The original screenshot remains outside the public bundle.

## Architecture

`index.html` and `styles.css` provide photo cards, a compact ZIP selector, Map/List views, apartment previews/details, comparisons and options. `app.js` owns application state. `map-bridge.js` connects it to React/mapcn through namespaced browser events. React owns MapLibre, markers, popups, sources and layers. See [runtime and event documentation](mapcn/README.md).

The map uses MapTiler Dataviz Light (`dataviz-v4-light`), with OpenFreeMap Positron as fallback. The browser key and style are in `map-config.js`. 3D uses vector footprints and recorded heights; it does not establish apartment views or sunlight. Optional restaurant/café labels come from the basemap, separately from saved destinations.

## Apartments and boundaries

The research export contains **105 apartment records, 48 apartment pins and 28 saved places** from the current V3 candidate table within ZIPs 64105, 64106, 64108 and 64109. All 57 records without confirmed coordinates remain in the list. The source workbook SHA256 is `a9de65df13689135eeee61e671be34d061dde7221838c7b5efaf2996f103b0a8`. This static snapshot updates when rebuilt. The four Second + Delaware walking routes use a separately documented street-facing origin; the Census building pin remains unchanged.

## Scene and venue evidence

Venue popups and “Meet these places” link 19 reviewed Scene event/program records to their verified venues. They display the retained flyer crop beside readable event-specific dates, billed roles, music descriptions, post-audio labels and uncertainties. **P1** means the verified September 16 upload batch; no P2/P3 order is asserted for older filename batches.

The four priority anchors remain In Good Co, recordBar, MOD and Third Place Lounge. The optional **Access to all four** sort uses each apartment’s longest recorded walk among those four. It lists incomplete records after fully routed ones without hiding them; “all four within five minutes” appears only when all four saved routes support it. New saved places do not become priority anchors.

Bundled `kc-zctas.geojson` covers exactly 64101, 64105, 64106, 64108, 64109, 64110, 64111, 64112, 64113, 64114, 64116, 64124 and 64127. These are **approximate ZIP areas** from the 2020 Census, not USPS delivery boundaries. `kc-zctas.metadata.json` records source, vintage and checksum. Boundaries start on and emphasize selected areas. Nine areas have no exported apartments and show an empty state.

Fresh loads start in 2D at the downtown overview, approximately the 1,000-foot scale. Initial card selection and carousel browsing highlight pins without changing the camera. Image completion resizes the map without focusing an apartment. Pool, Rooftop, Patio and Gym float along the mobile map edge. The ZIP picker filters apartments; separate Fit selected ZIP boundaries and Fit all 13 ZIP boundaries actions move the camera.

## Configuration and rebuilding

This is a static website hosted with GitHub Pages. For a local preview, serve this directory over HTTP. No Apple Maps SDK, Apple credentials or application backend is required. Ordinary external map links remain available.

The public browser key is restricted in MapTiler to `itscloudddddd.github.io`, `localhost` and `127.0.0.1`. Keep the linked MapTiler logo and attribution. The account was verified on the **Free** plan: [current pricing](https://www.maptiler.com/cloud/pricing/) includes 100,000 API requests/month for MapLibre; reaching the limit pauses service. No paid upgrade was made. Analytics showed zero current-period requests at inspection and may lag.

The workbook exporter and editable renderer are now included as source. Follow [the current build instructions](docs/BUILD.md), which require an explicit workbook snapshot and distinguish local previews from publication. The exporter reuses published geography; raw-feed refresh tools and private source evidence remain outside this repository. Runtime and apartment-data builds are separate. Deploy reviewed website files and the entire generated mapcn folder together when those assets change.

Fresh loads enable saved destination categories and ZIP boundaries in 2D. Optional restaurant/cafe basemap labels start off. Map controls let visitors explore a selected apartment in 3D or fit ZIP areas. Apartment details retain floor-plan and available-unit links, Street View, nearby destinations and comparisons. Temporary comparisons and preference choices remain session-only.

Keep the workbook, local research, credentials, backups and private QA evidence out of this public repository. Selected code and synthetic tests are available for shared implementation context. Git history preserves previous public versions for rollback.

## Detail and gallery features

The site includes browsable photos, unit-aware percentage-of-standard estimate badges, and the revised detail order. Star #308 photos are user-provided, distinct from its building photo; ZIP 64108 is retained with the supplied 64100 discrepancy noted. Unknown cost inputs display Unverified, and historic percentages are never substituted for a selected unit.

## Cost estimates

The superseded blanket $100 monthly fee has been removed. The $100 electricity planning estimate remains only for supported CP Lofts and Jazz Hill records; Second + Delaware has a recorded $0 electricity estimate. Official utility allowances remain Unverified. A zero added-fee input means no separately verified charge is added to this planning scenario, not a guarantee that all fees are zero. Cards and details calculate percentages from current unit rents and supported cost inputs using the recorded 1BR standard. Missing utility inputs remain Unverified, including Star Lofts; historical percentages are not reused for its selected units. These estimates are not voucher approval.
