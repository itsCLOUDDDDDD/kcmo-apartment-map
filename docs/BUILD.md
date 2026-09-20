# Build and verify the website

The live Google Sheet is the master; use an explicit fresh XLSX snapshot stored in ignored `local-input/` or `.local-input/`. Python 3 standard library and Node.js 18+ are sufficient for the workbook exporter. No spreadsheet-writing or network service is used.

```sh
node tools/workbook-export/build_shared_apartment_map.mjs --workbook local-input/fresh-master.xlsx --output .local-preview/site
python3 tools/research/read_xlsx.py local-input/fresh-master.xlsx > .local-preview/snapshot.json
node tools/research/verify_master_release.cjs .local-preview/snapshot.json .local-preview/site/map-data.js local-input/fresh-master.xlsx
node tools/research/test_google_walks.cjs
node tools/research/test_core.cjs
node tools/research/test_renderers.mjs .local-preview/site
node tools/research/test_walking_access.mjs .local-preview/site
python3 -m http.server 8765 --bind 127.0.0.1 --directory .local-preview/site
```

`verify_master_release.cjs` asserts the reviewed September 20 counts, unresolved IDs, 27-venue and four-priority coverage, complete Google evidence, Sheet summaries, and unit-photo ownership. Future intentional master changes require a reviewed update to those expectations.

Output stays local. The builder writes `.local-preview/validation-report.json`, preserves public geography, copies only allowlisted site assets, and never changes the source workbook. `--site-template <reviewed-public-files>` selects a reviewed layout when unrelated working-tree interface changes must remain unpublished. This release used the previously published layout plus only Sheet compatibility and walking-display changes; its existing compiled map renderer already omits missing geometry.

Review the public comparison, workbook hash, privacy, route coverage, exact-unit photos, and desktop/mobile browser behavior before publication. A prepared preview includes a local banner and `meta.previewOnly=true`. Promote only reviewed files, remove the local banner, set `meta.previewOnly=false` and `meta.staged=false`, and re-run acceptance checks on the promoted data. Keep all private workbooks, inputs, reports and Apps Script payloads out of Git.

When publication is authorized, stage only the intended release files on the existing `main`, review the staged diff, commit, and push to origin. A push deploys GitHub Pages from the root of `main`. Check the Pages build's commit/status, compare served public asset hashes with the release, and confirm the live page renders the new data. A successful local build alone is not a deployment.
