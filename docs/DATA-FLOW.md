# Sheet to website data flow

The live Google Sheet owns property research. A fresh explicit XLSX snapshot supplies Candidates, Map Details, Map Places, Map Routes, Scene & Anchors, cost settings/standards and Route Summary. `read_xlsx.py` reads it without modification; `core.cjs` exports public allowlisted facts; `build_preview.py` creates the local preview and validation report.

## Identity, visibility and research

Property facts, locations and walking records join only by stable `Property ID`. Destinations join by `Place ID`/`Destination ID`. Names never bind facts or route measurements. Duplicate required IDs stop export. Candidate `Website visibility = Yes` and the existing reviewed ZIP scope control public inclusion. Missing coordinates retain list-only properties. Original candidate addresses stay separate from geocoder-matched evidence in the master.

Units retain their own rent, size, bedrooms, source/date and exact-unit photos. Building and amenity media remain separate. Confirmed fees and official allowances require their own scope/source/date; unknowns stay unresolved. Private notes, screening records, raw workbook tables, credentials and source files are excluded from public data.

## Walking evidence

Current Google walking records require matching property/destination IDs, current address keys, saved endpoint coordinates, valid positive provider seconds/metres, walk mode and a current status. A supplied cache key must match those bindings. Missing dates remain unknown; invalid dates or stale endpoints invalidate evidence. Duplicate active Google pairs stop the build. Current Google measurements take precedence over older Outscraper/OSRM/FOSSGIS routes. Older evidence remains in the unchanged workbook.

Geometry validity is separate. Blank geometry produces `geometry: null`, `geometryAvailable: false`, and a valid walking measurement. No straight line or old-provider geometry is paired with the new Google time. The existing map renderer draws only actual geometry.

Each public property exposes accepted `coordinates`, current `walks`, `nearestSavedVenue` (ID/name/seconds/minutes/metres/date), `savedVenueCoverage` (count/total/complete), and `cluster` (IDs/closest/minimum/maximum/coverage/complete/missing IDs/geometry coverage). Legacy `nearest` remains the nearest priority-cluster venue for existing sorting, separate from the all-saved-venue result. Nearest selection uses duration seconds, with deterministic ties; displayed minutes are rounded only for readability.

Priority membership comes from Scene & Anchors IDs matched to addressed Map Places. Release acceptance requires exactly `recordbar`, `green-lady-lounge`, `mod`, `in-good-co`. Third Place is retained as a saved venue and historical priority, not a current cluster member. The current eligible set has 27 addressed, accepted venues. Incomplete coverage remains explicit.

## September 20 verification

The reviewed snapshot has 231 candidates; 106 public properties; 104 mapped and two unresolved; 2,808 current Google measurements plus 537 older master route records; 104/104 complete 27-venue summaries and 104/104 complete four-priority summaries. The exporter independently matches the Sheet's saved summaries. See CURRENT-STATUS.md for release scope and remaining gaps.
