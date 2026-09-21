# Venue catalog release — September 20, 2026

The verified current live master was updated through its bound, backed-up venue importer: **31 added, one matched-existing, four pending review** (all 36 supplied inputs accounted for). The second actual run made zero writes. The full native backup and before/after workbooks remain private; no duplicate master was introduced.

Map Places now has 59 saved venues (58 supplied/accepted coordinate pairs, one unresolved). Corresponding Scene & Anchors rows share the accepted Place IDs. Messenger reuses `messenger-coffee-ibis`; its accepted name/address/coordinates remain unchanged and the supplied coordinate conflict is retained as review evidence. Conoco/Favtrip at 500 E 10th and Sinclair/Windstar at 1704 Grand remain four pending identity-review rows in Scene & Anchors, without new Place IDs. Hy-Vee Arena and its KC Crew tenant are distinct venues. New records retain the exact supplied names, addresses, coordinates and categories, with provenance “User-supplied; not independently verified” and no fabricated verification dates or Google Place IDs.

A fresh read-back snapshot has SHA-256 `596aca4cc7ec60b86675fd87909c3c32417e75b35301c675259fa4e9af29dcd1`. All 13 non-target tabs' cell values/formulas and all tab visibility are unchanged. Existing Map Places facts and existing Scene/Settings rows are preserved. The fresh export's 106 properties are deeply equal to the prior public properties, including costs, photos, units, visibility, all 2,808 current Google walking measurements and nearest/priority results. There are still 104 mapped properties, two list-only records, 21 units and 537 older route records retained in the master.

The expanded browsing catalog is separate from the frozen original 27-venue routing cohort in Workflow Settings. All 104 mapped properties retain 27/27 routed-venue coverage and 4/4 priority coverage. The right tile says “Nearest among 27 routed venues.” New destinations show “Walking time not recorded” and their own external directions link; no geocoding, route request, matrix expansion, geometry invention or timer was used. Four priority IDs remain `recordbar`, `green-lady-lounge`, `mod`, `in-good-co`.

Frontend source: `itsCLOUDDDDDD/aistudio` commit `ae5d50b7b1a3d102478211b4c69112d8bfb500f8`, built on the current `99f990e` payment-standard-card release. Existing Tailwind styling, property experience, Street View, independent walking tiles, landing defaults and planning costs are retained. Scene filters, destination choices and pins share one category filter. Coffee, fuel/store and community symbols use the current marker system; priority is independent of category. Kansas/outlying venues stay available when apartment ZIP filters change. Overlapping pins offer on-demand selection without moving coordinates; duplicate picker names include addresses.

Validation: 10 importer test groups, fresh-export preservation checks, 32 shared-core tests, 14 Google-walking tests, four frontend suites, TypeScript and production build pass. Desktop 1280px and mobile 320px/390px checks pass for category/pin/picker agreement, external endpoints, missing walking measurements, unchanged nearest/cluster results, property switching, overlap selection, equal square tiles and no horizontal overflow. No browser console errors in these checks. Existing Vite configuration/chunk-size warnings remain nonblocking. `release.json` records this release's exact source, snapshot and file hashes; Pages deployment is verified separately after push.

**Published and verified:** application release `8520b2b0cc5a893d3b86009c18c0f1c5fd4d6c2b`, successful Pages run `35561590583`. All 14 served hashes match `release.json`. Live desktop and 390px checks confirmed the expanded category/pin/picker catalog, KC Crew/Hy-Vee overlap selection, Kansas destinations under apartment ZIP filtering, correct independent direction endpoints, 27/27 nearest and 4/4 priority coverage, preserved 73.4% planning comparison, equal square tiles and no horizontal overflow or console errors. This documentation follow-up changes no application assets.

Only the venue importer was installed in the bound project. The previously prepared cost-only Sheet installer remains uninstalled; this task preserves the published planning-cost calculation by retaining the already-approved rent-plus-utility exporter implementation. The live venue edit did not change cost formulas or install triggers.

Earlier release entries below are historical.

---

# Current website release — September 20, 2026

## Selected-card payment standard

The right side of the selected property's cost area now always shows its recorded 1BR payment-standard dollar amount and ZIP, independently of rent/percentage availability. It binds `property.source.oneBedroom.standard` and `property.zipCode` for the same selected Property ID, using the existing comparison benchmark. Missing/nonpositive standards display Unverified. No data facts or calculations changed; existing Tailwind styling and card presentation remain. Source `99f990eaadf25693d268a2ce413e1e36d42d55fd`, `src/components/housing/HousingPropertyCard.tsx`. TypeScript/build, desktop/320px wrapping and property-switch checks passed: Star Lofts $1,804 / 64108; Cordova $1,826 / 64105 even with unknown rent/percentage. No mobile horizontal overflow.


## Fresh landing defaults

The site now opens with all ZIPs and amenities, shortlist filtering off, no selected property or walking destination, and default source order. An explicit property selection retains its existing walking/card behavior. Reset filters also clears the destination/sort preference. Source change: `aistudio/src/App.tsx`, commit `aaed6f5099c645f865d8246bbfa98643cac46ef5`. TypeScript/build and browser reload checks passed: 106 total, 104 mapped/two list-only, no open property card; selected ZIP/destination/sort choices reset on reload. No housing data or styling changes.


The user approved replacing the existing housing site with the reviewed AI Studio design and all additional changes from this work. Frontend source: `itsCLOUDDDDDD/aistudio` commit `912f28c23d9947b85ba5c997919b53927a76993b`. This release preserves its Tailwind styling and adds the approved close-zoom previews, compact property experience, recorded Street View actions, saved/event destination picker, category/priority venue markers, independent square walking tiles, and approved planning-cost rule.

The left walking tile follows the selected destination and retains priority-cluster range/coverage. The right independently uses the same Property ID's saved `nearestSavedVenue` and `savedVenueCoverage`; each link owns its destination ID. Partial coverage is labeled and missing results stay unresolved. Marker coordinates are unchanged, list-only records remain available, filters do not automatically move the camera, and absent geometry never produces a fake route.

Data: September 20 V3 snapshot, generated `2026-09-20T23:29:46.421Z`, workbook SHA-256 `c35f02ca937c1499781235378644be236bed671fc6e69fe94c9fabf581728755`. Counts: 106 properties, 104 mapped/two list-only, 21 units, 28 saved venues and 2,808 saved Google walking measurements. All 104 mapped properties have 27/27 saved-venue and 4/4 priority coverage. Current Google measurements have no drawable geometry. The approved cost correction adds the $90 utility planning setting to recorded rent once and uses the recorded 1BR standard for every apartment size; unknown inputs remain unresolved. This is a planning estimate, not voucher approval.

Source data, interaction and cost tests, TypeScript checks and production build passed. Desktop and 390px production-preview checks passed; equal walking tiles also passed at 320px, with independent destination selection/property switching and no text overflow in tested cases. Public source facts outside the approved cost/release metadata were preserved. The release manifest records exact source/export and deployable file hashes. The live Sheet and bound Apps Script were not changed; the prepared Sheet cost installer remains uninstalled.

**Published and verified:** website release `885b8e61976d9a83b3ee0cbbbdf9a5ee3164331f`, GitHub Pages run `35558237202`, successful September 20 (Chicago) / September 21 UTC. All 14 served entry/data/style/script/photo hashes match `release.json`. Live Google map loads without console errors. Desktop and 320px/390px checks verified equal square tiles, correct independent destination links, property switching with no stale tile state, close-card cleanup, both list-only records and corrected costs (Washington #206: 73.4%). No horizontal overflow occurred in the tested mobile layouts. Source/build checks passed; generated output retained harmless whitespace warnings.

Earlier entries below describe the superseded renderer and are historical.

---

# Current website release — September 20, 2026

The live Google Sheet remains the master. This release uses its supplied `V3_research_ready_MASTER_2026-09-20.xlsx` build snapshot, SHA-256 `c35f02ca937c1499781235378644be236bed671fc6e69fe94c9fabf581728755`. The workbook is private, ignored, unchanged, and excluded from Git.

## Released data and behavior

- 231 source candidates; 106 website-visible properties, 125 held by existing visibility/scope rules; 104 accepted locations and two unresolved properties.
- 56 previously accepted locations and 48 newly validated locations. Parkview II, Apartments and The Grand on Beacon Hill remain list-only.
- All 2,808 current Google walking measurements are valid and selected over older providers. The snapshot retains all 537 older route records. Geometry is absent for these Google records: times remain valid and no path lines are invented.
- All 104 mapped properties have 27/27 saved-venue coverage and 4/4 priority-cluster coverage. Nearest saved venue ID/name/minutes/metres and closest priority venue/minimum/maximum/coverage are exported separately and shown in details.
- Priority IDs are exactly `recordbar`, `green-lady-lounge`, `mod`, `in-good-co`. Third Place remains an additional destination and never replaces a priority member.
- Stable Property IDs own every property/location/route join. Compared with the previous public site: Armour Park is added, no property identities are removed, and 57 legacy website IDs migrate to existing Sheet IDs. Names are used only for change-report diagnostics, never to attach facts or route evidence.
- 21 structured units and seven exact-unit photo associations pass ownership checks. Existing fee/utility uncertainty remains explicit. The unmatched Ide #203 image is retained in the master but withheld from generic website media until it has a matching structured unit.

## Verification and scope

Fresh-workbook acceptance checks passed, including independent comparison of all 104 saved nearest and cluster summaries, duplicate-ID/pair checks, all 2,808 measures and evidence dates, coordinates, unit figures, image ownership, and unchanged workbook hash. Four scope repairs keep existing exact-unit images with their matching units rather than generic galleries.

14 Google-walking tests, 32 core tests, 12 existing local provider tests, renderer and walking-display suites, JavaScript/Python syntax, and diff checks passed. Desktop and 390px browser checks verified map load, 106/104/2 coverage, nearest/cluster summaries, priority selection and all-four sorting, absent path lines, Star #308 selection/photos, and unresolved-property List behavior with no page errors or horizontal mobile overflow.

Publication is authorized for this reviewed release on the existing `main` branch. GitHub Pages deploys from that branch. Deployment success and the served data hash are verified after push; the final task report records the deployed commit. Local validation and browser records remain in ignored `.local-preview/v3-release/`.

The release preserves the published layout/runtime. Pending local interface redesigns, the isolated Google Maps experiment, Apps Script source/payloads, private inputs, and research archives are not included. No live Sheet edit, provider retrieval, or trigger change was performed.
