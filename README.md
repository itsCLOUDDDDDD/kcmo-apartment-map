# HomeSource · Kansas City homes and places

[Open the housing map](https://itscloudddddd.github.io/kcmo-apartment-map/).

The current interface is the approved HomeSource redesign, with nine responsive pages, an All pages gallery, real Google map, on-demand directions, scoped photos, shared favorites and the preserved planning-cost calculation. Explore automatically limits its list to homes in the visible map area as you pan or zoom; Properties retains the full filtered catalog. Editable frontend source is maintained in the private [frontend repository](https://github.com/itsCLOUDDDDDD/aistudio). This repository hosts the generated website and the public housing export.

The October 31, 2026 River’s Edge addition brings the collection to **262 properties: 251 mapped and 11 list-only**, 64 saved places, 54 structured unit/plan records and 2,808 saved Google walking measurements. Four River’s Edge plans are waitlisted; three numbered market advertisements remain separate. All 261 earlier public property objects retain their prior evidence dates. The live Google Sheet remains the data master; publication does not fetch or edit it. Missing facts remain unresolved. Walking measurements without geometry display without fabricated routes.

Read [current status](docs/CURRENT-STATUS.md), [build and publication instructions](docs/BUILD.md), [data mapping](docs/DATA-FLOW.md), and [agent instructions](AGENTS.md). [release.json](release.json) identifies the frontend commit, source snapshot and deployed file hashes.

The root index loads only the generated HomeSource application assets. Earlier renderer files remain for historical tooling compatibility and are not loaded by the current interface. Git history preserves the previous website for rollback.
