# Copilot instructions for FieldShift 360

Read [AGENTS.md](../AGENTS.md) at the repository root: it is the one guide for every coding agent. It captures the repo's commands, layout, data rules, and the docs that must be checked before changing behaviour.

## Build, test, and validation commands

- Install dependencies: `npm install`
- Run the project tests: `npm test`
- Run a single test file: `node --test src/engine/engine.test.js` (or any `*.test.js` file directly)
- Run a single test by name: `node --test --test-name-pattern="weights" src/engine/engine.test.js`
- Run the voice suite: `node --test src/voice/voice.test.js`
- Build the production bundle: `npm run build`; preview it with `npm run preview`
- Build the single-file export: `npm run build:single`
- Start the Vite dev server: `npm run dev`
- After changing `src/voice/brain.js`, sync the phone-agent copy with `npm run sync:voice`.
- Data fetch/build commands are documented in [scripts/README.md](../scripts/README.md).

There is no linter or formatter script. The validation path is `npm test` plus `npm run build`. Tests use Node's built-in runner and cannot import `.jsx`; keep logic that needs direct tests in `src/engine/` or another plain JavaScript module.

## High-level architecture

- This is a Vite + React 19 single-page app with a hash router and route groups for public, farmer, officer, and neighbouring-country views.
- `src/App.jsx` is the route shell; it lazy-loads page modules so the landing page stays light and the rest of the app loads on demand.
- `src/store.jsx` is the app-wide state container. It holds the selected farmer, field, priorities, requests, officer context, and derived season/rotation decisions. It also lazily loads upazila climate data and normalizes it against BMD station files before the rest of the app consumes it.
- `src/engine/` is the core calculation layer. This is where crop/soil/water/climate logic lives, and it is intentionally pure and testable with Node's runner. Keep numeric calculations here instead of embedding them in pages/components.
- `src/data/` contains committed datasets grouped by kind (`climate/`, `water/`, `soil/`, `radar/`, `market/`, `geo/`, etc.) alongside maintained JavaScript data modules such as `demo.js` and `upazilas.js`. Regenerate generated datasets through their scripts rather than hand-editing their outputs.
- `scripts/` owns the generation pipeline for the data and photos that feed the app. The scripts in `scripts/fetch/`, `scripts/build/`, and `scripts/onset/` write to `src/data/`, `public/`, and other committed outputs. If a dataset changes, update the script that generates it rather than editing generated JSON by hand.
- `api/` contains the Vercel serverless endpoints (`plans`, `messages`, `abroad`, `doctor`). In local dev, Vite serves in-memory stand-ins, so the app can still render without a live backend.
- `src/voice/` and `services/voice-agent/` share the same logic for voice/SMS flows; keep changes consistent across both when needed.

## Key conventions

- Real vs. sample data is an intentional product rule: climate, rain, radar, soil, prices and yields are real; farmers, requests and registry owners are sample. Keep labels truthful and do not blur that boundary.
- User-facing strings are bilingual and Bangla-first. Use `T(bn, en)` / `L({ bn, en })` for text, and `num()` / `bnDigits()` for numbers instead of hard-coded display logic.
- Calculations belong in `src/engine/`, not in pages or UI components. If it affects a value shown to the user, it should usually live in the engine layer and be covered by a test when practical.
- Preferred data workflow: regenerate the relevant data with the matching `npm run fetch:*` / `npm run data:*` script, then commit the generated output. Do not hand-edit generated data files.
- Before changing behaviour, check the relevant docs: `docs/THRESHOLDS.md`, `docs/DATA_SOURCES.md`, `docs/RADAR.md`, `docs/VOICE.md`, and `docs/MERGE.md`.
- Keep the app's UI thin and orchestration-driven. Route-level components and layout shells should compose engine outputs and existing data, rather than reimplementing agronomic logic.
- This repo uses ES modules and JSX conventions consistent with the surrounding code. Follow the existing naming and quoting patterns already in the project.
- Commit subjects should be short, user-visible, and mention generated data/config changes when relevant.

## Important repo notes

- `README.md` maps the challenge statement to the app pages and is the best place to understand the product story.
- The app is designed to work offline after the initial fetch, and the generated data is meant to be committed rather than fetched at build time.
- The rain-onset logic and other rule-heavy calculations are checked against documented assumptions and validation data, not just ad hoc heuristics.
- The AI crop doctor and server endpoints depend on a server-side `ANTHROPIC_API_KEY`, but the app should degrade gracefully when it is absent.
