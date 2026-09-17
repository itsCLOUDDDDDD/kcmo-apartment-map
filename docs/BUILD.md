# Preview, build and publish

## Boundaries

The live Google Sheet is the master. This repository holds public site files plus inspected source and technical instructions. GitHub does not read the sheet automatically. A CSV is not a replacement for the XLSX export with Map Details, Map Places and Map Routes.

The scripts below do not install a browser automation, retrieve coordinates, refresh property research or publish. Fresh-sheet compatibility remains pending in CURRENT-STATUS.md. Do not use the earlier “edit local V3 then publish” instructions unchanged.

## View the existing website locally

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/ and stop with Control+C. This previews committed and uncommitted local website files without uploading them. Remote photos and basemap tiles still need network access.

## Apartment data export — development only until parity is checked

Export a fresh XLSX snapshot of the live sheet and keep it outside this public repository, or in ignored `.local-input/`. Check that the required sheets, headers, saved values and evidence survived. Never upload the workbook to the repository.

The current exporter needs Node.js and a resolvable `@oai/artifact-tool` runtime. The runtime is separately supplied and is not vendored or promised as a public npm install. A connected environment must verify it before use. Without it, inspect the source and prepare changes; do not claim a build ran.

When that dependency is available, from the repository root:

```sh
node tools/workbook-export/build_shared_apartment_map.mjs --workbook /absolute/path/to/fresh-export.xlsx
```

The absolute workbook argument is mandatory. Default output is `.local-preview/map-data.js`. Saved geography is reused from root `map-data.js`; an explicit `--geography /absolute/path/to/geography.json` overrides it. These paths do not point at the user's old local workbook implicitly.

Before promoting that output, verify IDs and duplicates, coverage/removals, route origin/address matching, formula freshness, standard/utility/fee semantics, scoped units/photos and source dates against the live master. Compare selected-unit costs and scene calculations with the site. A successful export command alone does not establish parity. Full legacy QA and historical private evidence are not bundled; the included synthetic photo test is only a narrow regression check:

```sh
node tools/workbook-export/test_map_public_links.mjs
```

## Map renderer build

The editable React/mapcn source and frozen dependency lockfile are in `src/map-runtime/`. Use a Node.js release supported by the locked Vite/TypeScript dependencies.

```sh
cd src/map-runtime
pnpm install --frozen-lockfile
pnpm run build:apartment
```

Output goes to the source's ignored `runtime-dist/` and repository `.local-preview/mapcn/`, not the public `mapcn/`. This compiles the renderer only; it does not export apartment data. Test it in a complete local website preview before replacing the public mapcn folder as a set. The manifest and licenses belong with its workers, CSS and JS. Changes to root app.js/styles.css are separate and should also be previewed.

## GitHub Desktop: review and publish

1. Select `kcmo-apartment-map` and inspect the actual changed files.
2. Use Fetch origin and, when needed, Pull origin before preparing a commit; resolve concurrent changes rather than overwriting them.
3. For a documentation/source handoff, include only the intended README, AGENTS, docs, tools, src and ignore changes. These do not update apartment facts.
4. For a separately requested website/data release, place only the reviewed generated outputs in their public locations, then recheck the diff. Never add a private XLSX, source evidence or local folder wholesale.
5. Enter a descriptive summary, click Commit to main, then Push origin. A commit is local until pushed; pushing main can trigger the public Pages deployment.
6. Check the latest GitHub Actions deployment and the live page before claiming publication. Update CURRENT-STATUS.md with what changed, its verification and any remaining gap. Avoid an extra status-only commit just to insert its own commit hash; Git history supplies the revision.

Files under `src/` and `tools/` are public source, not private storage. Ignore rules prevent accidental inclusion of common local inputs but do not remove previously tracked files or guarantee privacy.
