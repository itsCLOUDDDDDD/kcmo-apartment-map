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
