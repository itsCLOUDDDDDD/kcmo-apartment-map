# Kansas City apartment map

[Open the housing map](https://itscloudddddd.github.io/kcmo-apartment-map/).

The current interface is the reviewed React/Tailwind design from [AI Studio](https://github.com/itsCLOUDDDDDD/aistudio), including the approved property previews, compact card, destination picker, venue symbols, independent walking tiles and planning-cost correction. Editable frontend source is maintained in that private repository. This repository hosts the generated website and the public housing export.

The current snapshot contains **231 properties: 104 mapped and 127 list-only**, 59 saved venues, 26 structured units and 2,808 saved Google walking measurements. The live Google Sheet remains the data master; publication does not fetch or edit it. Missing facts remain unresolved. Walking measurements without geometry display without fabricated routes.

Read [current status](docs/CURRENT-STATUS.md), [build and publication instructions](docs/BUILD.md), [data mapping](docs/DATA-FLOW.md), and [agent instructions](AGENTS.md). [release.json](release.json) identifies the frontend commit, source snapshot and deployed file hashes.

The root index loads only the generated AI Studio assets. Earlier renderer files remain for historical tooling compatibility and are not loaded by the current interface. Git history preserves the previous website for rollback.
