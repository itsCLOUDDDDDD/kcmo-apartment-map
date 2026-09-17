# Current work — September 17, 2026

## Current objective

Make the existing Google Sheet easier to research in, with confirmed unit/amenity/link inputs at the beginning and supporting calculations/history out of the way. Enter a fact once and deliver its correctly attributed result to the existing website. Keep one housing repository: `itsCLOUDDDDDD/kcmo-apartment-map`. The similarly named `ikcmo-apartment-map` is not part of the working flow.

## Completed before this source handoff

- The public website is the September 16 static snapshot described in the release sections of README.md. Its last recorded release is `0bdf590e9591507aab3bc3ee40c0ff0d7df1be9e`; consult GitHub for any later publication.
- September 17 work in the live sheet added stable IDs, conservative cost/standard logic, selected shared views, repaired navigation links, and topic-date fields. User edits and column reordering followed. The local workbook described by the old release instructions is no longer the master.
- Candidate rows 2–228 were the last verified body range; footer evidence follows. Inspect the live file before further edits.
- The live sheet's Scene Fit was connected to its shortest saved walk into the Crossroads group: recordBar, In Good Co, Green Lady Lounge, MOD. At verification 48 candidates had saved walks and 179 stayed blank. Green Lady had no saved property routes. The website still uses its earlier core set, including Third Place Lounge. These are not yet reconciled.
- The user added and tested address/ZIP Maps search links. Subsequent suggestions for resolved-URL and coordinate columns were guidance, not a verified completed automation.

## This repository preparation

Added a shared agent entry point, project instructions, this status, the sheet-to-site mapping, and build directions. Included the existing workbook exporter and helpers, plus the editable map renderer and its dependency lockfile. Adjusted build destinations to ignored local preview folders; no deployment command runs automatically. Original local source folders were preserved.

Only code and technical documentation are included. The live sheet, workbook snapshots, private notes, evidence originals, raw geography feeds and other local research tools are not uploaded. The included exporter reuses geography from the public map-data.js unless an explicit geography file is provided. It still requires the separately supplied `@oai/artifact-tool` runtime.

A commit/push of this preparation is the user's next GitHub Desktop step. Do not infer publication from this paragraph; inspect GitHub before claiming the files are available to ChatGPT.

## Not implemented or not verified

1. The full compact-sheet redesign and automatic extension for new rows are pending.
2. Automatic extraction from property websites, coordinate retrieval, final browser-URL capture, route refresh and automatic new-ID assignment are pending. A HYPERLINK formula does not retrieve a Maps result into another cell.
3. The exporter still joins Candidates to Map Details by property name before using the detail ID; it does not yet join on the new candidate Property ID. Duplicate names and unmatched support rows need explicit handling.
4. Compatibility with a fresh live-sheet export needs checking: cached formula results, generated hyperlinks, utility/fee status, per-topic dates, unit parsing, records/ZIP coverage and scene membership.
5. Unit-level dates may still inherit a property-level source date in the older exporter/presentation fallback. Ambiguous prose must remain evidence rather than silently becoming exact unit facts.
6. Sheet edits do not currently rebuild or publish the website. Automatic one-click updates remain future work.

## Verification of this preparation

- Renderer TypeScript check and production build passed using the already installed local dependencies. Output went only to ignored preview/build directories; compiled public mapcn files were not replaced.
- Workbook exporter syntax and the synthetic exact-unit photo tests passed. A smoke export of the existing local workbook completed (106 records, 49 with coordinates) with the supplied spreadsheet runtime. This was a packaging test, not approval to publish that workbook or proof of current live-sheet parity. It differs from the published 105-record snapshot.
- Temporary links to local dependency installations were removed after testing. Dependencies, raw workbooks and preview output remain excluded from Git.
- All previously tracked website files except README.md retained their original contents. No commit or push was performed by the preparing task.

## Next implementation task

Obtain current read/write access to the live sheet and a fresh XLSX export. Inspect its headers and formulas. First establish an explicit field map and test the exported values against the sheet, then redesign the visible entry area and repair the exporter joins/calculation parity. Test one existing building and one new-building example before wider changes. Do not overwrite current user research from an older snapshot.

## Updating this document

After each accepted change, replace the relevant current state and record what remains. A proposed ChatGPT handoff is not implementation. A local edit is not a commit; a commit is not a push; a push is not a verified deployment.
