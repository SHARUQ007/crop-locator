# Validation

7 November 2026.

## Automated checks

- TypeScript compilation: `npx tsc --noEmit`.
- `npm test`: database referential integrity; uniqueness and complete crop/cell/period/scenario/season/water combinations; approximate 1 km cell dimensions; 4,320 summary aggregates; thirty lazy-loaded slice files; raw/compressed consistency.
- Palette checks for representative text, buttons, statuses, metrics and map controls. Tested pairs exceed 4.5:1; this is a targeted palette check, not a full WCAG certification.
- React DOM integration checks with JSDOM: details outside the map container; two-candidate compare dialog and commercial tab; project creation and browser-local persistence; simulated team invitation; evidence entry; crop discovery; time switching; searchable location picker and explicit global discovery; complete onboarding.
- The map and detail rendering are stubbed in the React state-flow test. Native browser review covers their visible rendering separately.
- Production build through the Sites build helper.

## Browser review

Observed the onboarding screen, map workspace, real basemap tiles, ranked selection, location summary, climate tab and chart, comparison tray, expanded below-map layout, higher-contrast palette, new location picker and worldwide ranked crop results in native Chrome.

Browser controls intermittently timed out or reported that the user changed the window. Automated integration checks cover the comparison dialog and state flows that could not be reliably exercised through native input. Mobile breakpoints were implemented and source-reviewed; a complete mobile browser pass was not available.

During review, the previous CARTO public raster endpoint returned API-key-required images. It was replaced with interactive OpenStreetMap tiles, with visible attribution and normal browser caching/referrer behaviour. Leaflet control stacking was isolated so controls cannot cover the comparison tray.

## Prototype limits

All model metrics, AEZ assignments, logistics and economic values are synthetic. Practice guidance and country-level cultivation context are sourced separately. No production agronomic predictions, live prices, shared backend, authentication enforcement or email service is connected. Team edits remain in the current browser.
