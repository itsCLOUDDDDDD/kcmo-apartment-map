# HomeSource · Kansas City homes and places

[Open the housing map](https://itscloudddddd.github.io/kcmo-apartment-map/).

The current interface is the approved HomeSource redesign, with nine responsive pages, an All pages gallery, real Google map, on-demand directions, scoped photos, shared favorites and the preserved planning-cost calculation. Editable frontend source is maintained in the private [frontend repository](https://github.com/itsCLOUDDDDDD/aistudio). This repository hosts the generated website and the public housing export.

The preserved September 25, 2026 snapshot contains **261 properties: 250 mapped and 11 list-only**, 64 saved places, 47 structured units and 2,808 saved Google walking measurements. The live Google Sheet remains the data master; publication does not fetch or edit it. Missing facts remain unresolved. Walking measurements without geometry display without fabricated routes.

Read [current status](docs/CURRENT-STATUS.md), [build and publication instructions](docs/BUILD.md), [data mapping](docs/DATA-FLOW.md), and [agent instructions](AGENTS.md). [release.json](release.json) identifies the frontend commit, source snapshot and deployed file hashes.

The root index loads only the generated HomeSource application assets. Earlier renderer files remain for historical tooling compatibility and are not loaded by the current interface. Git history preserves the previous website for rollback.
