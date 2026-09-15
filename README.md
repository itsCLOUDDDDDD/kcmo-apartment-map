# Kansas City apartment map

## Status

This is the privacy-checked public build generated from the local `V3.xlsx` master. Map Details, Map Places and Map Routes are approved support tabs in that workbook; units remain on their building rows and there is no separate Units tab. The preference control is session-only and does not create another master or assign a permanent winner. Publish only when `meta.staged` is `false` and `meta.workbookSha256` matches the current `V3.xlsx` file.

The map reads every candidate row in the two ZIPs, including pipeline and incomplete records:

| ZIP | Candidates | Mapped records | Awaiting coordinates |
|---|---:|---:|---:|
| 64108 | 21 | 19 | 2 |
| 64109 | 10 | 8 | 2 |
| Both | 31 | 27 | 4 |

Parade Park Family, Mayfair Apartments, The Grand on Beacon Hill and Armour Boulevard Apartments need exact building addresses. They remain selectable and comparable. Justin Place and Linwood Boulevard have the same recorded address/coordinates but remain separate records. Numbered pins group nearby properties at the current zoom; the chooser preserves each record. No winner or permanent preference rank has been assigned.

## Important current findings

[Star's building-specific unit page](https://oldtownloftskc.securecafe.com/onlineleasing/star-lofts/availableunits.aspx?contactOnly=1&myOlePropertyId=448631&floorPlans=3349418) was checked September 14, 2026:

| Apartment | 1BR area | Base rent | Listed date |
|---|---:|---:|---|
| Star #411 | 690 sq ft | $875 | October 1, 2026 |
| Star #308 | 890 sq ft | $1,000 | November 1, 2026 |
| Star #210 | 950 sq ft | $1,000 | December 1, 2026 |

The older V3 pair of $875 and 950 sq ft is not one current listing. It is retained in the historical worksheet inputs pending reconciliation; the visible listing summary uses the newly checked options. The unit rows contain a conflicting 64100 placeholder while the building footer gives 64108; exact unit ZIP must be confirmed. Star's $1,200 / 1,700 sq ft two-bedroom remains unconfirmed portfolio information, not a verified Star unit. Washer/dryer hookups are not installed machines.

[Carriage #207](https://oldtownloftskc.securecafe.com/onlineleasing/carriage-lofts/availableunits.aspx?contactOnly=1&myOlePropertyId=448620&floorPlans=3349416) is listed at 720 sq ft / $900 for November 1. [Columbia #204](https://oldtownloftskc.securecafe.com/onlineleasing/columbia-lofts/availableunits.aspx?contactOnly=1&myOlePropertyId=448623&floorPlans=3349413) is listed at 745 sq ft / $860, with no calendar date beyond “available.” All listed deposits are $300. These are source snapshots, not guaranteed vacancies. Exact-unit images are not verified.

Old Town's [Crossroads gallery](https://oldtownloftskc.com/crossroads) is shared but labels its building photos. Each building has its own floor-plan and unit link. Longfellow's pages are shared community pages, not phase-specific evidence. The former Georgian Court domain was not verified to the Kansas City building and is excluded; its leasing/photos remain unresolved. Other missing sources and amenities are explicitly marked.

## Routes, map layers and daytime places

All 27 mapped candidates have four pedestrian routes: In Good Co (1518 McGee), recordBar (1520 Grand), MOD (1809 McGee), and Third Place Lounge (1744 Broadway). Choosing a destination changes the headline, route and destination-distance sort together. Nearest-core rank is a separate within-ZIP calculation; overall ZIP rank is the user's preference.

For [Star → In Good Co](https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=39.0932269%2C-94.5797916%3B39.0950749%2C-94.580302), the pedestrian router returned about 232 metres / 185 seconds. Adding approximately 22 metres of straight entrance offsets and rounding up gives the displayed **four-minute estimate**. This verifies plausibility, not a timed field walk. The external router may round differently; the map's own time and rankings use the same stored calculation. Walks to MOD, recordBar and Third Place are 4, 5 and 15 minutes respectively. Crossings, closures, accessibility, entrances and personal pace require on-the-ground confirmation. [Routing method/service](https://routing.openstreetmap.de/about.html).

Longer walks have an illustrative Streetcar alternative: a measured walk to a routable platform, the shortest published scheduled ride to Kauffman Center, then a measured walk to the named venue. The displayed range adds 0–18 minutes of waiting; traffic and disruptions can add more. This is not a fastest-route or live-arrival guarantee, and a bus may be better. Direct live transit-planner links remain available. Short walks lead the panel rather than receiving an equally prominent transit suggestion.

The Streetcar layer uses **all 18 published shapes and 34 served platform stops**, including Riverfront and UMKC, from the [RideKC agency feed](https://ridekc.org/open-data/), version `July 2026_20260827`, valid July 12–October 3, 2026. Paired platforms are not 34 distinct station names. This replaces the old seven-stop hand-drawn approximation. [Official hours](https://kcstreetcar.org/route/hours-of-operation/): Sun–Thu 5am–midnight; Fri–Sat 5am–1am. Check final departures before relying on a late-night return.

ZIP outlines are [2020 Census ZCTAs](https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html), approximations rather than USPS delivery boundaries. Highway/streets come from the basemap; neighborhood labels are orientation aids, not official boundaries. HUD points and Census address interpolation are labelled by source, not represented as surveyed entrances. Priority scene labels remain visible at overview zoom; Lowest Ferns is separately labelled West Bottoms. Saved venues are restored, but UL retains no invented pin and the saved 1428 St Louis event address is not represented as a permanent venue.

Daytime landmarks have a separate layer:

- [Central Library](https://kclibrary.org/locations/central), 14 W 10th; [study-room rules](https://spaces.kclibrary.org/).
- [Irene H. Ruiz Branch](https://kclibrary.org/locations/ruiz), 2017 W Pennway St; official page confirms Wi-Fi and public computers. Its named-place coordinate replaces an incorrect Pennway Terrace interpolation.
- [Bluford Branch](https://kclibrary.org/locations/bluford), 3050 Prospect.
- [Messenger Coffee + Ibis](https://messengercoffee.co/pages/1624-grand), 1624 Grand.
- [Rochester Brewing & Roasting](https://rochesterkc.com/contact/), 2129 Washington.
- [Thou Mayest River Quay](https://thoumayest.com/pages/location), 412 Delaware—not the closed Crossroads location.

Coffee-shop Wi-Fi, outlets, seating and laptop policies are not confirmed. Check current hours before a work session.

## Design and provider choice

Connected AppLlama research used LandGlide “Parcel Details Overview” (`560902465 / oth_l87y7`) for map-plus-detail hierarchy, and Skan “Comparison Summary” (`6449196562 / oth_4tnop`) for aligned side-by-side criteria. These informed the photo-first panel, clear source labels and comparison table; they are interface references, not map providers. The previously mentioned Apple screenshot was not attached in this turn, so the visual direction follows the described calmer streets and prominent destination labels rather than claiming an exact screenshot match.

The preview uses [MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/) with [OpenFreeMap Positron](https://openfreemap.org/quick_start/). OpenFreeMap's public instance requires no account or API key and is free, with required attribution and no service-level guarantee. The 3D button uses real geometric building extrusions from OpenStreetMap heights/footprints, not photorealistic Apple Flyover, Look Around, measured unit views or a sunlight simulation. Coverage and height accuracy vary.

Apple MapKit JS is a separate alternative: Apple rendering requires Apple developer credentials/domain-token setup. Native Apple 3D capabilities must not be assumed to exist identically on an embedded website. No Apple token was configured or account created. The property panel includes an Apple Maps link. [Apple's MapKit JS 6 overview](https://webkit.org/blog/18027/discover-mapkit-js-6-rebuilt-for-todays-web-developer/).

## One master and one family link

| Approach | Master | What must happen after an edit |
|---|---|---|
| Recommended: local V3 → generated shared map | V3.xlsx only | Codex edits V3, rebuilds, verifies, then publishes the scrubbed output at the existing stable URL. |
| Shared Google Sheet → Google My Maps | A single migrated Google Sheet, if chosen | Sheet changes require an explicit My Maps reimport/merge; they do not live-sync automatically. |

No Google spreadsheet connection or migration was established. [Google documents the reimport/update process](https://support.google.com/mymaps/answer/3024836?co=GENIE.Platform%3DDesktop&hl=en). Retaining V3 avoids moving formulas and creating competing copies.

The family opens the same read-only GitHub Pages URL without needing an editing account. A push updates the live page after the Pages deployment succeeds; allow time for deployment and reload an already-open page. There is no automatic workbook-to-GitHub sync. [GitHub Pages publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

Shortest future routine: tell Codex the change → Codex edits and verifies `V3.xlsx` → rebuilds and privacy-checks these six public files → publishes to the same repository. The family URL stays unchanged.

The production builder refuses to proceed without the approved V3 map tabs. Its `--staged` mode is for local review only and refuses a changed workbook hash.

Never publish V3, the proposal folder, project memory, application screening, income, identity, lease, portability or recertification paperwork. Only these six reviewed public files are eligible for publication. Images, tiles and directions use external services; no private housing documents are sent to them.
