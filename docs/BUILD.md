# Build and publish HomeSource

Editable frontend source: `itsCLOUDDDDDD/aistudio`. Use its reviewed main commit. The current entry is `src/homesource/main.ts`, with the approved layout in `app.js`/`styles.css` and existing provider components connected by `LiveServices.tsx`. `release.json` identifies the source commit used for this release.

```sh
npm ci
npm test
npm run test:shared
npm run lint
npm run build
```

Configure the existing Google Maps browser key in an ignored `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`. Never commit environment files. Vite uses relative asset paths for GitHub Pages repository hosting. The browser key is necessarily included in the browser build; do not add server credentials.

The photo reels also require Places API (New) for this browser key. Verify real Places media with the published origin after deployment, including slash/corridor matches and photographer credits. Cover choices are stored in that browser origin and do not migrate from localhost automatically. Check list/selected-map thumbnail updates, modal hero persistence across refresh, reset, unavailable selections and blocked-storage handling. Do not persist expiring media URLs or photo resource names.

The reviewed public snapshot is `src/data/housing-export.json`, and saved event joins are in `src/data/saved-events.json`. Keep stable property and destination IDs, unresolved facts, unit ownership and the independent nearest/priority summaries. Updating the Sheet does not automatically update these snapshots. Do not run the former site's builder over the current frontend.

For an authorized release, copy the complete `dist/` contents into a clean checkout of this repository, preserve `.nojekyll`, and serialize the identical reviewed housing JSON to `map-data.js` as `window.KCMO_MAP_DATA`. Record source/snapshot and file hashes in `release.json`. The current interface uses the bundled JSON; `map-data.js` remains an equivalent public export for compatibility.

Review intended paths and privacy, check desktop/mobile behavior, then commit and push only the release to main. GitHub Pages serves the root of main. Verify the Pages build commit/status, live file hashes, Google map, property selection, independent walking tiles and mobile layout. A build or source push alone does not establish successful website publication.

## Current full-list publication scope

The October 8 presentation release preserves the already published September 25 snapshot byte-for-byte: 261 properties, 250 mapped/11 list-only, 47 units, 64 places and 2,808 saved walks. No Sheet export, vacancy refresh or new candidate decision is included. Preserve all IDs, unverified supplied locations and dated sources. The earlier full-list authorization continues to include prior holds and exclusions; do not restore the old Yes-only/four-ZIP gate. Source-kit files, private notes, environment files and original evidence stay outside the deployment. Page previews show the production UI using public data. See DATA-FLOW.md and CURRENT-STATUS.md for recorded behavior.
