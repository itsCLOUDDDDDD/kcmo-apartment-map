# Expanded property-details release — September 21, 2026

The user approved the local expanded-card design and explicitly authorized commit and publication. Frontend source commit: `a534b04e39992594f75bc154a35e915943ac01f3` in `itsCLOUDDDDDD/aistudio`. This is a presentation-only release using the unchanged, previously published Sheet export; no fresh research or Sheet edits were performed.

- Top swipe/arrow gallery and short photo links preserve exact-unit ownership. The ZIP-adjacent 1BR-standard button reveals the calculation. Rent and percentage stay visible with one short Est. label; missing rent stays Unknown. Existing rent-plus-utility arithmetic and the 1BR denominator are unchanged.
- Amenities precede apartment and destination details. Yes/No/—/Conflict labels retain shared laundry, hookups, select-unit and building/portfolio scope. Full evidence remains in the data. Repeated cost disclaimers and geocoding/verification panels are removed from this browsing card; saved listing availability appears last, never substituting a research-check date for vacancy.
- Nearby order: one expandable four-destination priority cluster, Nightlife, Coffee, Library, Sports / gym. Existing scene categories are not mislabeled as bars. Rounded minutes expand to exact saved measurements. Nearest results use valid walks from the unchanged 27-venue cohort, with partial coverage labeled “among checked.” Coffee coverage is 3/17; the 13 sports/community venues have no saved walks and offer browsing/directions only. No route API calls or fabricated paths.
- All five frontend test suites, TypeScript, production build and isolated Chrome checks passed. Browser coverage includes 320/390/768/1280-pixel widths, short mobile height, gallery navigation/reset/local images, property switching, missing rent, laundry/conflicts, ownership, route coverage/exact values, wrapping, focus, close, compare and locate. Remote photo availability was not re-researched. Existing Vite configuration and bundle-size warnings remain nonblocking.
- The compact card, adapter, calculation/routing helpers and all property/venue data are unchanged. Housing-export SHA-256 remains `131989d8242fa0c7f77ec82c3273d097bcae5aa72752f5e9c3085c24904bd9f9`: 106 properties, 104 mapped/two list-only, 21 units, 59 venues and 2,808 saved walks. `map-data.js` and all ten local photos are byte-identical. `release.json` records the source and 14 active file hashes.

Release assets are prepared and locally verified. GitHub Pages publication and live verification are pending; they will be recorded after the authorized push.

Earlier releases below are historical.

---

# Amenity snapshot release — September 21, 2026

The live Google Sheet is the master. A fresh, read-only XLSX export of `V3_research_ready_MASTER_2026-09-20.xlsx` has SHA-256 `2cb1bb13d437a1eb7e4637f6e25ba394f8ccd150b3f3da58270c2cbea8919a2f`. Its 56 newly checked ZIP 64106/64108 candidate rows were matched by Property ID. The existing visibility rules publish 51 of them and continue to hold five; no property was added or exposed.

The reviewed public-data diff changes exactly those 51 property records, and only `amenities.laundry`, `amenities.gym`, `amenities.pool`, `amenityDetails`, `amenitySource`, and `amenitiesChecked`. Sheet wording, including Unknown and Conflict, is literal. The public source field accepts one URL, so the exporter retains the first URL from a Sheet cell containing multiple ` | `-separated links; the full evidence remains in the live Sheet. All other property facts, units, coordinates, rents, costs, routes, visibility, photos, venue data and geography are unchanged. The exported metadata changes only snapshot time and workbook hash. The Tailwind CSS file is byte-identical to the current release.

Frontend source commit `6f8f2a17e9d5c84254c226effd12da9ada5b058b` contains the updated `src/data/housing-export.json` and data tests. The fresh exporter, 33 shared-core tests, 14 Google-walking tests, venue-export test, frontend tests, TypeScript check and production build pass. `release.json` records the exact source, Sheet snapshot and active file hashes.

**Published and served-file verified:** website application commit `20502eeb5607446002d9e3ba69957feed2d7e564`; GitHub Pages run `35651424423` succeeded and its latest build names that commit. All 14 active files served from the live URL match `release.json`, including the new housing bundle, public data, unchanged Tailwind CSS and retained photos. The served bundle contains the updated Conflict/Unknown wording and primary source links. An interactive browser smoke check was not completed because browser control failed; no visual or console-check claim is made.

Earlier releases below are historical.

---

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
