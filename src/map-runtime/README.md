# Editable map renderer

The source was brought into the website repository from the existing local renderer on September 17, 2026. Map/controller code is preserved; the build destination now uses the ignored `.local-preview/mapcn/` folder at the repository root. The original standalone component demo is not included.

`src/apartment-runtime.tsx` mounts the React map. The controller manages markers, layers and camera behavior. `src/components/ui/map.tsx` is the mapcn component; its license is retained in `licenses/`. Root-level app.js and map-bridge.js remain the website state and bridge owners.

Use `pnpm install --frozen-lockfile`, then `pnpm run build:apartment` from this directory. This needs a compatible Node.js installation. See ../../docs/BUILD.md for limits, checking and how preview output is promoted. The dependency lockfile is retained; do not update dependencies incidentally while doing a data/layout task.
