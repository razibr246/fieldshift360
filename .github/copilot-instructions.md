# Copilot instructions for FieldShift 360

## Project snapshot

This repository is a Vite + React decision-support app for Bangladeshi farmers and agriculture officers. The app mixes a real-data climate/soil/crop engine with a demo UI that lets users explore crop rotations, field planning, officer requests, and climate risk.

The main app lives in `src/` and is organized by role + concern:

- `src/App.jsx`: route entry point and lazy-loaded page shells
- `src/pages/`: farmer, officer, public, and abroad views
- `src/store.jsx`: shared app state for the selected farmer, field, priorities, and climate caches
- `src/engine/`: pure logic for climate, rotation, crop stages, water advice, risk rules, and decision scoring
- `src/data/`: committed JSON data sets, many of which are the app's real inputs
- `public/`: static public assets, radar resources, and packaged data
- `scripts/` and `pipeline/`: data fetch/build utilities and climate/radar processing
- `services/voice-agent/`: a separate voice assistant subproject bundled into the same repo

The repo is intentionally multi-surface: FieldShift 360, the Aman radar, and the voice agent all live here. Keep that composition in mind when touching shared logic or data.

## Build, test, and validation commands

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Build the single-file static variant used for a packaged deployment:

```bash
npm run build:single
```

Run the repository test suite:

```bash
npm test
```

Run a single test file directly with Node's built-in test runner:

```bash
node --test src/engine/engine.test.js
node --test src/engine/fieldwatch.test.js
node --test src/voice/voice.test.js
```

Common data and maintenance scripts:

```bash
npm run fetch:power
npm run data:aman
npm run data:fields
npm run data:soil
npm run fetch:cmip6
npm run sync:voice
```

There is no lint script in `package.json`; treat `npm test` and `npm run build` as the main repository validation path.

## High-level architecture

### 1. App shell and route model

`src/App.jsx` lazily loads large route groups instead of loading the whole UI at startup. That means new pages should fit the existing route structure and keep page-level logic in the route-specific files rather than creating one-off global state for every screen.

The product is split by user role and mode:

- Public landing/demo screens
- Farmer flow (`/farmer/*`)
- Officer flow (`/officer/*`)
- Abroad/neighbor-country views (`/abroad/*`)

### 2. Engine-first business logic

Most decisions are not written directly in UI components. The decision rules live in `src/engine/*.js` and are fed by real or demo data from `src/data/*.json`.

Examples:

- `climate.js`: long-term climate and seasonal backtests
- `rotation.js` and `decision.js`: crop/rotation recommendation ranking
- `water.js` and `fieldwater.js`: irrigation and field-water advice
- `soilfuture.js` and `soil.js`: soil health and carbon logic
- `outlook.js`, `glut.js`, and `weatherRisk.js`: forecasting and alerting

Keep new logic in `src/engine/` if it is pure, testable, and domain-specific.

### 3. State and data flow

`src/store.jsx` is the main state hub. It loads climate/soil data lazily, caches per-upazila climate objects, and keeps the selected farmer, field, priorities, savings, and officer context in one place.

This codebase heavily relies on local JSON and static files, rather than a backend API. The app usually reads committed data files directly and computes answers client-side. When a feature needs new domain inputs, prefer updating the relevant data file or generator script rather than adding a one-off custom fetch in a component.

### 4. Data generation and product docs

The repo contains both real climate/soil inputs and synthesized demo content. The docs under `docs/` document the sources and assumptions:

- `docs/README.md`
- `docs/DATA.md`
- `docs/DATA_SOURCES.md`
- `docs/MERGE.md`
- `docs/THRESHOLDS.md`
- `docs/RADAR.md`
- `docs/VOICE.md`

Treat these as the primary source for data provenance and product boundaries. When a change touches a decision threshold, climate assumption, or voice/radar integration, check the relevant doc before making the change.

## Key conventions in this repository

- Prefer pure functions and data-driven logic in `src/engine/` over UI state mutations.
- Keep user-facing copy bilingual where relevant; Bangla-first UX is part of the product design.
- The app is a hybrid of real NASA/soil data and sample farmer/officer demo records. Do not blur those two modes without checking the corresponding docs and data labels.
- If you change crop yield, recommendation, weather warning, or climate assumptions, add or update the matching Node tests in the relevant `src/**/*.test.js` file.
- `scripts/` is for generating or refreshing data and background processing; do not treat it like app runtime code.
- `services/voice-agent` has its own guidance and scripts. If working there, follow that subproject's instructions as well as the root repo rules.
- When touching radar/voice features, keep the cross-project integration in `docs/MERGE.md` and the voice/radar docs in sync with the implementation.

## Practical editing guidance

- Prefer updating the smallest existing module that owns the behavior.
- When adding a new field or crop rule, look for how the current engine normalizes crop metadata and seasonal logic before adding a one-off branch.
- The project uses committed JSON for many domains; if a change requires fresh data, prefer the existing generator scripts instead of ad hoc file edits.
- For UI changes, keep route-level loading and page split conventions intact; avoid broad global rewrites unless the feature truly requires it.

## AI/configuration notes

This repo does not define root-level AI instruction files beyond the repo docs above. The subproject under `services/voice-agent/` includes its own `AGENTS.md` and `CLAUDE.md` guidance for the voice service, and those should be respected when editing that service.
