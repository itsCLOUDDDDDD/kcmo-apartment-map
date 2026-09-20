# Workbook exporter

Run `node tools/workbook-export/build_shared_apartment_map.mjs --workbook local-input/fresh-master.xlsx` from the repository root. The live Sheet remains master; the explicit XLSX is a private read-only build snapshot. Python 3 and Node.js 18+ are required.

The wrapper calls `tools/research/build_preview.py`, which uses `read_xlsx.py`, `build.cjs`, and `core.cjs`. It validates stable IDs, address-bound coordinates/routes, current Google measurements, unit/media ownership and visibility. Geometry availability is independent of walking-time validity. Output and validation reports stay under `.local-preview/`; this command never commits, publishes, edits the Sheet or rewrites the workbook.

See [build and publication checks](../../docs/BUILD.md), [data mapping](../../docs/DATA-FLOW.md), and [current release state](../../docs/CURRENT-STATUS.md).
