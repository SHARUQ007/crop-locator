# CropLocator

A detailed, map-first B2B crop and land intelligence frontend prototype for SBSF Agritech.

## Run locally

```sh
npm ci
npm run dev
```

Open the Local URL printed by the dev server (normally http://127.0.0.1:5173). First visit opens the three-step onboarding. “Explore the demo first” preserves a seeded team and three projects. Help lets you replay onboarding. All workspace edits persist in the current browser.

## Features

- Persona, workspace and first-project onboarding.
- Find land for a crop; find crops for sample land.
- Linked map markers and ranked cards; 1 km cell inspection; suitability / AEZ / drought layers; optional satellite basemap; rectangle selection; filters and sorting.
- Baseline and two future climate periods with SSP2-4.5 / SSP5-8.5 and rainfed / irrigated contexts.
- Progressive location details: Overview, Climate, Soil, Economics, Evidence.
- Up to three candidate comparisons, CSV export, project saving.
- Projects, mixed-crop shortlists, saved scenarios, economic assumptions, status, decision notes, activity and printable HTML decision briefs.
- Crop library and requirement profiles.
- Team evidence, manual entry, validated CSV import/template and CSV export.
- Mock team members, role descriptions, project scopes and pending invitations.
- Command search (⌘ / Ctrl K), notifications, accessible dialogs and responsive layouts.

## Data and implementation

6 crops × 864 cells × 5 period/scenario contexts × 3 season contexts × 2 water regimes = 155,520 synthetic observations. AEZ classification is separate from cell identity. The raw model data is generated deterministically; all UI location summaries come from that data. See [data model](docs/DATA_MODEL.md) and [competitive research](docs/COMPETITIVE_RESEARCH.md).

```sh
python3 scripts/generate-mock-db.py
python3 scripts/validate-data.py
npx tsc --noEmit
npm run build
```

Built with React 19, TypeScript, Vinext/Vite, Leaflet and Recharts. The supplied Sites runtime integration is retained. Basemap tiles are requested interactively from OpenStreetMap with attribution; satellite imagery is from Esri. Google Fonts supplies DM Sans, Manrope and Instrument Serif, with system fallbacks.

## Prototype boundaries

All numerical values and AEZ assignments are synthetic. Production FloraKB, real weather, live prices, a real 1 km SBSF grid, backend authentication, cross-device persistence, email delivery and enforced team permissions are not connected. The supplied SBSF leaflets describe a production 9 km grid and 1 km under development. Data is intended for interaction demonstration, not investment or agronomic decisions.

Visual/browser checks are documented in [validation notes](docs/VALIDATION.md).
