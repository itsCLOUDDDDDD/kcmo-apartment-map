# Sheet to website data flow

## Current AI Studio frontend

The reviewed export is bundled from `aistudio/src/data/housing-export.json` through its housing adapter. Root `map-data.js` exposes the same JSON for public export compatibility. `release.json` records source identity and hashes. The 59-venue browsing catalog (58 accepted coordinate pairs and one unresolved) and saved/event history join by exact Place ID or Destination ID; unmatched locations are not invented. The selected-property right tile binds `nearestSavedVenue` and `savedVenueCoverage` independently of the left destination selection. Planning costs are recorded unit rent plus the configured utility planning setting once, divided by the property’s recorded 1BR standard for every bedroom size; missing inputs remain unresolved. The website release does not install Sheet formulas or Apps Script.

The verified current live Google Sheet owns property and venue research. A fresh explicit XLSX snapshot supplies Candidates, Map Details, Map Places, Map Routes, Scene & Anchors, cost settings/standards and Route Summary. `read_xlsx.py` reads it without modification; `core.cjs` exports public allowlisted facts; `build.cjs` invokes that shared core for the data export. Only the reviewed JSON is passed to AI Studio; the legacy preview renderer is not copied over the current interface.

## Identity, visibility and research

Property facts, locations and walking records join only by stable `Property ID`. Destinations join by `Place ID`/`Destination ID`. Names never bind facts or route measurements. Duplicate required IDs stop export. Candidate `Website visibility = Yes` and the existing reviewed ZIP scope control public inclusion. Missing coordinates retain list-only properties. Original candidate addresses stay separate from geocoder-matched evidence in the master. Public inclusion does not establish availability, unit eligibility, HCV approval or currentness.

Units retain their own rent, size, bedrooms, source/date and exact-unit photos. Building and amenity media remain separate. Confirmed fees and official allowances require their own scope/source/date; unknowns stay unresolved. Private notes, screening records, raw workbook tables, credentials and source files are excluded from public data.

Research scope stays task-specific: broad income-restricted candidate capture and a LIHTC/tax-credit evidence task are not a universal narrower public filter. Public documentation preserves supported field distinctions without upgrading assistant-reported leads into property facts.

## Approved planning-cost rule

Planning gross = recorded apartment rent + the configured Utility planning standard, added once. Percentage of standard = planning gross ÷ the property's recorded 1BR payment standard, including for unknown bedroom counts. The current setting is $90, read from the live source rather than hard-coded. Separate fee/official-allowance evidence remains separate and does not gate this planning comparison. Only missing/unusable rent, utility setting or positive 1BR standard leaves the affected result unresolved. Use each selected unit's own figures; known options calculate independently of unknown options. Acceptance example: ($1,250 + $90) / $1,826 = 73.4%. This is a planning estimate, not voucher approval.

## Walking evidence

Current Google walking records require matching property/destination IDs, current address keys, saved endpoint coordinates, valid positive provider seconds/metres, walk mode and a current status. A supplied cache key must match those bindings. Missing dates remain unknown; invalid dates or stale endpoints invalidate evidence. Duplicate active Google pairs stop the build. Current Google measurements take precedence over older Outscraper/OSRM/FOSSGIS routes. Older evidence remains in the unchanged workbook.

Geometry validity is separate. Blank geometry produces `geometry: null`, `geometryAvailable: false`, and a valid walking measurement. No straight line or old-provider geometry is paired with the new Google time. The existing map renderer draws only actual geometry.

Each public property exposes accepted `coordinates`, current `walks`, `nearestSavedVenue` (ID/name/seconds/minutes/metres/date), `savedVenueCoverage` (count/total/complete), and `cluster` (IDs/closest/minimum/maximum/coverage/complete/missing IDs/geometry coverage). Legacy `nearest` remains the nearest priority-cluster venue for existing sorting, separate from the nearest result within the original routing cohort. Nearest selection uses duration seconds, with deterministic ties; displayed minutes are rounded only for readability.

Priority membership comes from Scene & Anchors IDs matched to addressed Map Places. Release acceptance requires exactly `recordbar`, `green-lady-lounge`, `mod`, `in-good-co`. Third Place is retained as a saved venue and historical priority, not a current cluster member. Workflow Settings `Saved walking cohort IDs` freezes the original 27 destination IDs. Nearest results and coverage use only that cohort, even though the browsing catalog has 59 venues. Temporarily unresolved cohort locations still count in the denominator. Incomplete coverage remains explicit; the UI labels the result “Nearest among 27 routed venues.”

## Venue catalog imports

`apps-script/VenueCatalogImport.gs` is the tested generic source of the separately installed bound importer. Its private complete installation file includes the supplied batch and persistent IDs; private master IDs/payloads are excluded from Git. Import headers are discovered by name. First-run identity matching requires name AND street/city address (Messenger has an explicit reviewed alias); later joins use Place ID. A document lock, complete native backup, protected-tab fingerprints, read-back and zero-write repeat planning guard the update. The actual second live run made no changes.

Map Places owns identity/address/category/coordinates; Scene & Anchors points to the same Place IDs. Supplied coordinate conflicts are recorded without changing accepted endpoints. Four unresolved shared-address identities remain evidence rows in the existing Scene table and are excluded from the public venue catalog. No hours, laptop suitability, amenities, logos, dates or Google Place IDs are inferred. Exact “User-supplied; not independently verified” venue pins are exported only with a matching address binding and valid saved coordinates; this does not relax property location validation.

Category and priority are independent. The public allowlist adds provenance and links derived from each venue's own saved coordinates/address, not a live directions/geocoding response. A missing location has no guessed map endpoint. Scene filters, header/card destination choices and map pins use the same catalog/category grouping. Apartment visibility/ZIP rules never restrict the venue catalog. New locations have no walking measurements; browser links can open ordinary external directions, while the app makes no routing requests.

September 20 applied import: 31 added, one Messenger match, four pending; 59 catalog venues/58 accepted coordinate pairs, original 27 routing IDs, 2,808 current Google walks, all existing property objects unchanged. Snapshot hash and detailed checks are recorded in CURRENT-STATUS.md and release.json. The exporter includes the previously approved cost implementation so a fresh venue export does not regress published rent-plus-utility costs. The live Sheet cost installer remains separate and uninstalled.

## September 20 verification

The reviewed snapshot has 231 candidates; 106 public properties; 104 mapped and two unresolved; 2,808 current Google measurements plus 537 older master route records; 104/104 complete 27-venue summaries and 104/104 complete four-priority summaries. The exporter independently matches the Sheet's saved summaries. See CURRENT-STATUS.md for release scope and remaining gaps.
