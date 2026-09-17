# Workbook export source

The exporter and its two local helpers were copied from the existing local housing workspace on September 17, 2026. The changes for this repository are limited to paths: require explicit --workbook, default to ignored .local-preview output, and reuse geography from the current public map-data.js unless --geography is supplied. Record parsing and joins remain the older logic; see ../../docs/CURRENT-STATUS.md for compatibility gaps.

The entry point imports `@oai/artifact-tool`. This is a separately supplied spreadsheet runtime, not included here and not claimed to be publicly installable. A ChatGPT/Codex file-processing environment may provide it; verify actual availability. Do not send the user to install an unverified similarly named package or promise the exporter works on every fresh clone.

`map_public_links.mjs` handles public URLs and exact-unit photo attribution. `map_comparison_fields.mjs` maps cost/category inputs and validates route origins. `test_map_public_links.mjs` exercises unit photo scope using synthetic URLs and needs only Node.js.

No raw workbook, live sheet URL, private research or credential is in this directory. The original staging flag is retained for source review, not a recommended new competing data source. See ../../docs/BUILD.md before execution.
