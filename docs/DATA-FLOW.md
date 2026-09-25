## Saved property favorites — September 25, 2026

`kcmo_favorite_properties_v1` stores only stable Property IDs in browser localStorage. App startup restores the set; card and detail controls persist toggles and storage events synchronize tabs. The Favorites only filter feeds the same filtered property collection to map and list. Storage errors retain the current session choice and show a save-failure notice. Browser-local choices are not exported, written to the Sheet or synchronized between devices. Other filters still apply.

## MAC access-scope model — September 24, 2026

NeighborhoodAmenity uses hostPropertyId/hostAddress/hostName for physical context and a separate explicit accessScope (neighborhood-shared, property-only, public, unknown). Neither host matching nor nearby advertising sets access. Host coordinates resolve by stable ID; independently sourced complex/park/coworking points use standalone mode. Parent aliases were replaced by host fields.

The shared toggle count and contents derive only from neighborhood-shared records: Carriage House, Gymnasium, Pump Room, Dashery Pool/Club/Gym complex, IBM and the documented Arcade coworking space. Public Gillham Dog Park and unconfirmed Arc gaming have separate layers. 520's property-only record renders only when its exact host is selected and never enters the shared count. Existing facility IDs supply consistent access labels in the facility dialog. Saved source notes preserve host-included access and cheaper eligible packages alongside All Access; optional membership fees never alter housing calculations. This frontend release does not edit the master or housing export.


## Quoted unit metadata — September 24, 2026

Within existing building Units JSON, export quoted address, source-document label, floor, stated move-in window, touring status, features, safe 3D-tour URL/scope, source label/date and distinct received date. Unknown source dates do not become checked dates. Preserve string unit numbers and deduplicate by Property ID plus unit. Include every quoted unit regardless of size; no size warning or exclusion applies to these cards. This specific authorized scope exports structured unit facts, never full correspondence or private history. Selected unit estimates use its rent plus the existing planning utility setting over the property’s recorded 1BR standard. Available units precede a single collapsed property-level Walking access section.

## MAC community and facility relationships

The master candidate row's `MAC community JSON` contains official identity/address evidence and `facilityAccess` edges keyed to existing Map Places IDs. `Facility JSON` on category `MAC facility` rows holds the site's resources, host versus other-resident access, location scope, source/check dates and optional packages. The exporter allowlists these public fields; private research, quotations and history never enter the export. Facilities do not become housing candidates, Scene events or automatic walking-cohort destinations. The compact MAC filter and linked facility details consume these same records.

Use one verified-site identity for each facility location. Bellerive, 520 East and Dashery are distinct pool sites; all four Crosswalks communities share Dashery, without inferred off-site fees. Arc and Newbern's own gyms are distinct from optional Bellerive membership. Unknown entrances remain list-only; Arcade remains unlocated. Facility media must retain facility ownership. Existing user-supplied neighborhood POIs remain independently attributed and unverified; proximity does not automatically merge them with verified facility IDs.

Address changes clear current endpoint bindings; old coordinates/routes remain evidence, never walking times for the new address. Preserve each building's unit IDs, rent, size, dates and media; unidentified or undated private quotes are not new current vacancies. Optional memberships are informational only and do not change the configured $90 planning setting or formulas. Partial releases preserve unrelated published data, including newer Sheet-only work outside the approved scope.

## Neighborhood amenity layer — published implementation, September 24, 2026

Frontend `src/data/neighborhoodAmenities.ts` holds seven explicitly user-supplied neighborhood POIs, separate from the property and saved-venue master exports. `HousingMap.tsx` renders the optional layer inside `KansasCityApartmentMap.tsx`. No property joins, eligibility conclusions or walking measurements are derived from these records. Coordinates, tiers and features retain unverified attribution. The existing Places photo matcher loads on demand using each supplied name/address/ZIP; attributed results are place photos, not proof of specific amenity features. The location chooser provides access to overlapping pins without changing their coordinates. Published and live-verified September 24; see CURRENT-STATUS for deployment evidence.

# Sheet to website data flow

## Places photos and local cover choices

The frontend queries Places API (New) Text Search using property name, primary physical street, actual city/state and ZIP. Returned formatted/structured addresses are compared against every saved slash segment, normalized range endpoints and street direction. A unique name/same-street Armour profile within KC 64109/64111 may use a different street number under the user's explicit instruction; the modal discloses that profile's address and complex-wide image scope. Other mismatches and ambiguous profiles are not assigned. Saved property identities and addresses never change from photo matching.

Visible cards without saved custom images request Places photos; details display the returned reel beside existing saved/unit media, with Google Maps and photographer credits. The browser key requires Places API (New) and appropriate website/API restrictions and is intentionally part of the browser build; environment files and server credentials are excluded. Photo references are used only for current display and are refreshed, not persisted. Google provides no room tags, so automatic kitchen/interior classification is not claimed.

The Set as cover action stores Property ID -> a SHA-256 selection fingerprint under `user_curated_cover_photos`, derived from the photo-specific Google Maps link. The expiring media URL, resource name and API key are not stored. Fresh results resolve that choice after reload; the same-origin update/storage events synchronize active cards and tabs. Priority is starred photo, saved Sheet image, returned Places photo, then labeled placeholder. Reset restores default behavior. Choices are per browser/origin, not exported to Sheets or synchronized across devices; localhost choices do not automatically transfer to the published site's origin.

## Research-to-Sheet and planning-cost rules — September 22, 2026

The live Google Sheet is the property-data master. Research Markdown, handoffs and local exports are dated evidence. Match tax-incentive claims to an existing Property ID plus address, ZIP and project/building or phase. Retain source URL or exact filename, page/record/ordinance reference, source and check dates, stated program, project scope, proposed/applied/approved/operating/expired stage, and unresolved conflicts. Preserve original discovery reasons. District boundaries alone do not establish property participation; TIF, PIEA, Chapter 353 and historic credits do not themselves establish LIHTC, current income restrictions or HCV treatment. Duplicate occurrences remain traceable without creating duplicate properties. The private Research History/source register retains full evidence; existing KCMO Candidates history fields hold attributed summaries. Inspect current headers rather than relying on recorded column letters. The requested new tax-incentive consolidation is not yet shown as applied to the Sheet or exported to the website.

The approved planning percentage is **(recorded unit rent + configured utility planning setting once) / that property's recorded 1BR payment standard**, for every apartment size. At the recorded $90 setting, ($1,250 + $90) / $1,826 = **73.4%**. Missing or unusable rent, setting or positive 1BR standard leaves the percentage unknown. Do not gate the estimate on a monthly fee, official allowance or bedroom verification; keep those as separate attributed facts. The website/exporter uses this rule; the cost-only live-Sheet installer remains recorded as uninstalled. A newly supplied utility schedule does not automatically replace the configured $90 setting or install Sheet formulas.

Reference: [HAKC 2026 utility allowance workbook](references/kchamo_Utility_Allowance_2026.xlsx), supplied by the user. Its four worksheets identify the Housing Authority of Kansas City, Missouri and show **January 1, 2026** as the schedule date. The workbook provides utility/service amounts by housing type and bedroom count, plus blank household entry fields; it is reference evidence, not a property-specific bill or an automatically selected allowance. An original download URL was not supplied or independently verified. The exact uploaded workbook has SHA-256 `3a6ab5c8fc88e0460a78e625bad72bba25d5103e007c59532b6aebcadc1ab54a`.

## Scene address tally publication — September 22, 2026

The completed address report, reconciled with the verified applied Scene summary, supplies an explicit allowlisted derivative in frontend `src/data/scene-tallies.json`. It is separate from the unchanged housing export and prior historical event cards. The live Sheet is not edited or automatically fetched by this publication. Report batch `scene-address-tallies-20260922` and its hash identify the source; raw notes, original images, personal comments, Sheet identifiers and filesystem links are excluded.

Each location keeps a stable address-group key, existing accepted Place IDs, venue names, address, supported area, main Event IDs, calendar-only Event IDs, role-separated connections, uncertainty and concise source references. Totals count unique address-key/Event-ID pairs; repeated rows and artist counts never increase them. Main totals are 51 (29 in ten matched Scene address groups, 22 in fourteen pending groups). Calendar-only totals are 32 (SK8BAR 25; In Good Co seven). The 51 include 49 supported-area Kansas City appearances, one unresolved reported street address and one Lawrence appearance. The separate West Bottoms area-only event and fully undisclosed events do not enter address totals.

`SceneTalliesDialog` exposes all research groups with area filters and search. `SceneTallySummary` joins existing venue cards only through accepted IDs; no alias or missing ID is invented. Encore and Uptown share an address total without assigning Encore a new venue ID. Pending Scene mapping does not delete an existing independently saved venue pin. Move the Needle stays a source/presenter with unresolved booking role, separate from its host venues. Unknown locations stay unknown; no coordinates or walks are created.

Supporting records distinguish inspected flyers/captions, retained or new user observations, mixed evidence and user-attributed schedules. The existing 19 historical cards and 15 approved crop files remain unchanged and are reused by Event ID where available. Calendar-only entries, possible additional appearances and non-DJ programs are labeled separately. The public summary does not imply weekly frequency, attendance, total activity or neighborhood quality. All property, route and other venue exports remain byte-identical to the preceding Mac corridor release.

## Mac corridor import - September 22, 2026

The existing master now has 258 candidates. A private, locked and backed-up add-on appended 27 stable Property IDs after street-address duplicate checks, plus 27 coordinate records, 27 supplied walking claims, 27 derived summaries and 34 source dispositions. Three duplicates were skipped; four overlapping/conflicting address entries remain unassigned. Existing rows, IDs and research were preserved. Actual identical rerun: zero writes.

The read-only post-import snapshot hash is `735c9648a80c211e0fc5c2c008fe8db4d840d807b2482e876f894f34cde763d2`. The existing allowlisted exporter supplies the 27 new public objects. This addition-only release retains all 231 prior public objects and geography verbatim; specifically, Bellerive's published gym wording is retained rather than replaced by the shorter Sheet value. This is a scoped merge, not a claim that every older public field was refreshed from this snapshot.

The same reviewed JSON is bundled into the existing frontend and serialized into map-data.js. There are 253 mapped properties, five list-only records and 149 supplied walking claims in total. Supplied claims remain outside verified walking coverage, sorting and nearest calculations. No provider seconds, dates, paths, missing property facts or private source history are invented or published. No new Scene evidence, UI code or provider requests are included.


## Scene evidence restoration — published September 21, 2026

Scene presentation is shared by `venuePresentation`, `VenueMarker` and `VenueLegend`: Core/Saved/Regional Scene and Scene Extension labels use gold (`#facc15`) with dark music icons and outlines. Scene pins are 36px with overlap priority below selected and priority venues, above ordinary venues. Other venue categories and the fixed property ZIP palette remain separate.

The current React frontend reads the 19 reviewed records from `src/data/saved-events.json`. Their historical detail is restored from the retained `scene-data.js` export, correlated by existing Event ID and venue ID; the JSON records the historical export hash. The original minimal event fields remain unchanged. Existing source/crop manifests verify all 15 copied PNGs; no image is regenerated. `public/assets/scene/` is carried into the local production build by Vite.

`SceneEventCards` renders the same historical cards inside the existing Scene place selection and venue popup. It filters on exact venue ID, never `suggestedVenueId`. The unresolved-location disclosure exposes UL, undisclosed META and Movidas without adding pins. The existing 16 located event choices used by walking controls remain unchanged. The larger-flyer dialog uses only the retained crop. Missing E16–E19 images are explicit nulls with exact missing references.

Each event keeps its lineup/roles, music wording, post audio, caption/style context, uncertain event date and saved source reference. `sourceUrl` links to a curated local `assets/scene/research.html#EventID` excerpt; it is labeled saved research, not an original social-post permalink. Original post URLs were not retained in the historical export and are not invented. Private source screenshots/notes are not copied. Source-batch IDs, capture labels, verified supplied date (September 16 batch only), source-note date, post date and September 16 review date are distinct from event dates and the September 21 restoration date. Filenames do not establish upload order.

The Sheet/housing export, current property facts, ZIP palette, venues, coordinates, routes and costs are not regenerated or changed. The approved build now includes these Scene assets; release.json records the source commit and deployed-file hashes. The publication does not refresh the housing snapshot.

## Current AI Studio frontend

The reviewed export is bundled from `aistudio/src/data/housing-export.json` through its housing adapter. Root `map-data.js` exposes the same JSON for public export compatibility. `release.json` records source identity and hashes. Sixteen confirmed saved/event choices join by exact destination ID; unmatched locations are not invented. The selected-property right tile binds `nearestSavedVenue` and `savedVenueCoverage` independently of the left destination selection. Planning costs are recorded rent plus the utility planning setting once, divided by the property’s recorded 1BR standard; missing inputs remain unresolved. The website release does not install Sheet formulas or Apps Script.

The verified current live Google Sheet owns property and venue research. A fresh explicit XLSX snapshot supplies Candidates, Map Details, Map Places, Map Routes, Scene & Anchors, cost settings/standards and Route Summary. `read_xlsx.py` reads it without modification; `core.cjs` exports public allowlisted facts; `build.cjs` invokes that shared core for the data export. Only the reviewed JSON is passed to AI Studio; the legacy preview renderer is not copied over the current interface.

## Supplied locations and reported walks — applied September 21, 2026

Existing Property ID plus normalized street address and ZIP binds 122 supplied records. Map Details retains the coordinates, address binding and explicit user-supplied/unverified status. Map Routes retains rounded Minutes, Metres and Destination ID with Provider `User-supplied` and status `Supplied nearest-priority claim; unverified`; provider seconds, measurement date, geometry and unprovided endpoint evidence remain blank. Research History privately retains all 124 source occurrences and both unassigned cases. Route Summary exposes the supplied destination/minutes and qualified status/coverage through existing Candidate formulas. No existing verified records are replaced.

The public exporter checks the stable ID, current address binding, origin coordinates and priority destination before emitting separate `reportedPriorityWalks` objects. Their `measurementValid` and `nearestVerified` are always false. These objects never enter verified `walks`, cluster coverage, nearest-venue selection or numeric walking sort. The bound general workflow was not replaced; a future summary refresh may recompute derived fields, while appended source evidence stays in Map Details/Map Routes/Research History. Reuse these evidence records when refreshing derived summaries.

The frontend's fixed `ZIP_COLORS` mapping drives both diamond fill and ZIP-picker swatches, independent of list order or active filters. All 27 current ZIPs have distinct assignments; adding a ZIP requires adding its own fixed assignment without changing existing colors. Venue presentation uses its separate existing colors. The snapshot has 226 mappable properties (104 prior locations plus 122 supplied) and five list-only candidates; all 231 existing IDs remain public under the recorded approval. Two supplied identity/address cases remain pending, not guessed or merged. Private originals and evidence remain outside both public data and this repository.

## Private discovery history — live restoration applied September 21, 2026

The existing live master now carries property-level discovery history in **KCMO Candidates**, joined only by its existing **Property ID**. The baseline was checked against the live rows: 231 IDs, comprising 219 recovered collection histories, ten unrecovered origins, and two ambiguous identities. No source occurrence became a new candidate row. Newer rows are preserved by the updater; none were present during this run.

| Sheet field | Historical meaning |
|---|---|
| Sources / Checked — reused | Existing text/links retained, followed by a labeled recovery block with source batch, exact file/URL, record ID/page/row, source date, collection date, earliest evidenced snapshot and register reference. Recovery date is not a new website check. |
| Original inclusion reason — added | Attributed original research wording or documented collection link; distinguish recovered evidence from proof of first causal inclusion. |
| Historical program / stage — added | Source-reported program and proposed/applied/awarded/operating/unspecified stage, with dates and occurrence citations. No new eligibility classification. |
| Historical unit counts — added | Source-specific total/restricted/market counts, dates and project/building scope. Keep differing versions; do not sum overlapping sources. |
| Historical AMI / set-aside — added | Separately attributed terms and unexpanded source codes; AMI is not a restricted-unit percentage. |
| Provenance recovery status — added | Recovered collection evidence, **Original source not recovered**, or unresolved mapping. |
| Provenance conflicts — added | Recorded contradictions, count versions, scope/identity issues and missing origins. No automatic conflict resolution, exclusion reversal or merge. |

The verified positions for this run are BW and CV:DA; integrations must resolve current headers rather than rely on these letters. Only BW was unhidden; existing supporting-column visibility and row heights otherwise remain unchanged. Current Housing, Tax Credit / LIHTC, Mixed-Income, Accepts HCV, Date Added, Property evidence checked, Notes, all cost/unit/media/location/route fields and website visibility were preserved.

Full occurrences remain in the private `PROPERTY-SOURCE-REGISTER.csv`, outside this public repository. Its PSR occurrence IDs are source references, never replacement Property IDs. Backups, the complete field plan, source-citation index and original research remain private and unchanged. Concise property-level summaries stay in Candidates; the 11,180 occurrences do not become candidate rows. Original HUD collection and later AHO discovery stay distinct. Multiple sources, dates, counts and project/building scopes remain attributed rather than silently reconciled.

Appearance in the original research is sufficient for candidate retention, not confirmation of current LIHTC or HCV eligibility. Current marketing or website silence does not erase historical evidence. Keep current eligibility/HCV evidence separate; preserve explicit exclusions and website visibility. Ten unrecovered origins, including 1989 Main, retain **Original source not recovered**. The two Quinlan Row identities remain unresolved; neither receives ambiguous evidence automatically and neither is merged.

**Applied:** 1,617 provenance data cells for 231 IDs plus six headers; native backup and independent fresh-export read-back verified all 16 tabs, with unrelated data and formulas unchanged. **Actual identical repeat run:** zero writes. These private history fields have no new public export mapping. This documentation publication does not export data, rebuild the frontend, edit the Sheet or change website assets; unrelated installers and release records below retain their existing status.

## Identity, visibility and research

Property facts, locations and walking records join only by stable `Property ID`. Destinations join by `Place ID`/`Destination ID`. Names never bind facts or route measurements. Duplicate required IDs stop export. September 21 explicit approval publishes all 231 current candidate IDs, including prior holds and exclusions, using `tools/research/build.cjs --all` with the reviewed private snapshot. This release overrides the earlier Yes-only/four-ZIP publication gate without rewriting Sheet visibility or exclusion history; the approval establishes publication scope, not current eligibility. Future exports must preserve this approved full-list scope unless the user changes it. Missing coordinates retain list-only properties. Original candidate addresses stay separate from geocoder-matched evidence in the master.

Units retain their own rent, size, bedrooms, source/date and exact-unit photos. Building and amenity media remain separate. Confirmed fees and official allowances require their own scope/source/date; unknowns stay unresolved. Private notes, screening records, raw workbook tables, credentials and source files are excluded from public data.

## Full collection publication

The public snapshot contains 231 properties: 104 with accepted coordinates and 127 list-only, plus 26 recorded unit options. All existing IDs remain separate; no ambiguous identity is merged. The full list and ZIP filter use the exported collection, not a hard-coded four-ZIP shortlist. Property symbols are green diamonds; Sports & community symbols are red soccer balls, shared with the legend. Private provenance summaries/register and personal research remain outside the public export. The existing 106 public property objects, 59-venue catalog and 2,808 saved walks are unchanged.

## Walking evidence

Current Google walking records require matching property/destination IDs, current address keys, saved endpoint coordinates, valid positive provider seconds/metres, walk mode and a current status. A supplied cache key must match those bindings. Missing dates remain unknown; invalid dates or stale endpoints invalidate evidence. Duplicate active Google pairs stop the build. Current Google measurements take precedence over older Outscraper/OSRM/FOSSGIS routes. Older evidence remains in the unchanged workbook.

Geometry validity is separate. Blank geometry produces `geometry: null`, `geometryAvailable: false`, and a valid walking measurement. No straight line or old-provider geometry is paired with the new Google time. The existing map renderer draws only actual geometry.

Each public property exposes accepted `coordinates`, current `walks`, `nearestSavedVenue` (ID/name/seconds/minutes/metres/date), `savedVenueCoverage` (count/total/complete), and `cluster` (IDs/closest/minimum/maximum/coverage/complete/missing IDs/geometry coverage). Legacy `nearest` remains the nearest priority-cluster venue for existing sorting, separate from the nearest result within the original routing cohort. Nearest selection uses duration seconds, with deterministic ties; displayed minutes are rounded only for readability.

Priority membership comes from Scene & Anchors IDs matched to addressed Map Places. Release acceptance requires exactly `recordbar`, `green-lady-lounge`, `mod`, `in-good-co`. Third Place is retained as a saved venue and historical priority, not a current cluster member. Workflow Settings `Saved walking cohort IDs` freezes the original 27 destination IDs. Nearest results and coverage use only that cohort, even though the browsing catalog has 59 venues. Temporarily unresolved cohort locations still count in the denominator. Incomplete coverage remains explicit; the UI labels the result “Nearest among 27 routed venues.”

## Venue catalog imports

`apps-script/VenueCatalogImport.gs` is the tested generic source of the separately installed bound importer. Its private complete installation file includes the supplied batch and persistent IDs; private master IDs/payloads are excluded from Git. Import headers are discovered by name. First-run identity matching requires name AND street/city address (Messenger has an explicit reviewed alias); later joins use Place ID. A document lock, complete native backup, protected-tab fingerprints, read-back and zero-write repeat planning guard the update. The actual second live run made no changes.

Map Places owns identity/address/category/coordinates; Scene & Anchors points to the same Place IDs. Supplied coordinate conflicts are recorded without changing accepted endpoints. Four unresolved shared-address identities remain evidence rows in the existing Scene table and are excluded from the public venue catalog. No hours, laptop suitability, amenities, logos, dates or Google Place IDs are inferred. Exact “User-supplied; not independently verified” venue pins are exported only with a matching address binding and valid saved coordinates; this does not relax property location validation.

Category and priority are independent. The public allowlist adds provenance and links derived from each venue's own saved coordinates/address, not a live directions/geocoding response. A missing location has no guessed map endpoint. Scene filters, header/card destination choices and map pins use the same catalog/category grouping. Apartment visibility/ZIP rules never restrict the venue catalog. New locations have no walking measurements; browser links can open ordinary external directions, while the app makes no routing requests.

September 20 applied import: 31 added, one Messenger match, four pending; 59 catalog venues/58 pins, original 27 routing IDs, 2,808 current Google walks, all existing property objects unchanged. Snapshot hash and detailed checks are recorded in CURRENT-STATUS.md and release.json. The exporter includes the previously approved cost implementation so a fresh venue export does not regress published rent-plus-utility costs. The live Sheet cost installer remains separate and uninstalled.

## September 20 verification

The reviewed snapshot has 231 candidates; 106 public properties; 104 mapped and two unresolved; 2,808 current Google measurements plus 537 older master route records; 104/104 complete 27-venue summaries and 104/104 complete four-priority summaries. The exporter independently matches the Sheet's saved summaries. See CURRENT-STATUS.md for release scope and remaining gaps.

## Current management filters — September 25, 2026

The “Yarco only” control filters property pins and cards using the reviewed `management` field from the public housing export. It accepts current manager values beginning with Yarco, including `Yarco`, `Yarco Property Management` and `Yarco-Devco`; it does not match historical mentions later in another manager value. The existing “MAC only” control remains. Selecting both shows the union of the two groups. The full property list remains the default. The September 25 refresh carries 16 current Yarco-manager records; New View Place remains excluded because its current manager is Seldin. Cold Storage Lofts’ existing rooftop-pool claim and official source were rechecked, with its check date refreshed. No other property fields, identifiers, units or saved routes changed.
