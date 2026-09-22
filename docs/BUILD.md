# Build and publish the AI Studio housing interface

Editable frontend source: `itsCLOUDDDDDD/aistudio`. Use its reviewed main commit and existing Tailwind system. `release.json` identifies the source commit used for this release.

```sh
npm ci
npm test
npm run lint
npm run build
```

Configure the existing Google Maps browser key in an ignored `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`. Never commit environment files. Vite uses relative asset paths for GitHub Pages repository hosting. The browser key is necessarily included in the browser build; do not add server credentials.

The reviewed public snapshot is `src/data/housing-export.json`, and saved event joins are in `src/data/saved-events.json`. Keep stable property and destination IDs, unresolved facts, unit ownership and the independent nearest/priority summaries. Updating the Sheet does not automatically update these snapshots. Do not run the former site's builder over the current frontend.

For an authorized release, copy the complete `dist/` contents into a clean checkout of this repository, preserve `.nojekyll`, and serialize the identical reviewed housing JSON to `map-data.js` as `window.KCMO_MAP_DATA`. Record source/snapshot and file hashes in `release.json`. The current interface uses the bundled JSON; `map-data.js` remains an equivalent public export for compatibility.

Review intended paths and privacy, check desktop/mobile behavior, then commit and push only the release to main. GitHub Pages serves the root of main. Verify the Pages build commit/status, live file hashes, Google map, property selection, independent walking tiles and mobile layout. A build or source push alone does not establish successful website publication.

## Current full-list publication scope

The September 21 user approval includes all 231 existing candidate IDs, including prior holds and exclusions. Generate the reviewed public allowlisted payload with `tools/research/build.cjs --all` from the private read-only Sheet snapshot, retaining the current 226 mapped and five list-only records, with the 122 supplied locations explicitly labeled unverified. Do not revert to the older Yes-only/four-ZIP gate or change Sheet visibility merely to build the site. Keep private notes and provenance evidence out of the payload. See DATA-FLOW.md and CURRENT-STATUS.md for current scope and verification.
