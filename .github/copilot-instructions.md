# Copilot instructions for FieldShift 360

Read [AGENTS.md](../AGENTS.md) first. It is the repository's single source of truth for commands, repo layout, data rules, and behavior constraints.

## Build, test, and validation commands

- Install dependencies: `npm install`
- Start the app locally: `npm run dev`
- Run the full test suite: `npm test`
- Run a single file: `node --test src/engine/engine.test.js` (or any `*.test.js` file directly)
- Run one named test: `node --test --test-name-pattern="weights" src/engine/engine.test.js`
- Run the voice suite: `node --test src/voice/voice.test.js`
- Build the static production bundle: `npm run build`
- Preview the production build locally: `npm run preview`
- Build the single-file export: `npm run build:single`
- Refresh generated voice agent files after touching `src/voice/{bn,lexicon,brain}.js`: `npm run sync:voice`
- Regenerate data via the project scripts in [scripts/README.md](../scripts/README.md) when a dataset or rule changes.

There is no separate linter or formatter script. The project validation path is `npm test` plus `npm run build`. Tests use Node's built-in runner and import engine modules and JSON directly; keep logic that must be unit-tested in plain JavaScript under `src/engine/` or another non-JSX module.

## High-level architecture

- This is a Vite + React 19 single-page app with hash-based routing and route groups for public, farmer, officer, and neighbouring-country flows.
- `src/App.jsx` is the route shell; it lazy-loads page modules and keeps the landing page lightweight.
- `src/store.jsx` is the app-wide state container. It holds the selected farmer, field, priorities, requests, officer context, and derived season/rotation decisions, and it lazily loads upazila climate data while normalizing it against BMD station data.
- `src/engine/` is the calculation layer. Crop, soil, water, climate, and decision logic live here and are intentionally pure/testable without React.
- `src/data/` contains committed datasets grouped by kind (`climate`, `water`, `soil`, `radar`, `market`, `geo`, etc.) plus maintenance modules like `demo.js` and `upazilas.js`. Treat these as source data, not hand-edited UI state.
- `scripts/` is the generation pipeline. `scripts/fetch/`, `scripts/build/`, and `scripts/onset/` write to `src/data/`, `public/`, and other committed outputs; update the generator rather than editing generated JSON by hand.
- `api/` contains the Vercel serverless endpoints (`plans`, `messages`, `abroad`, `doctor`, `agent`, `tts`). In local development, Vite serves in-memory stand-ins, so the app can still render even without a live backend.
- `src/voice/` and `services/voice-agent/` share the same logic for voice and SMS flows. After modifying the voice logic, regenerate the synced copies in `services/voice-agent/` with `npm run sync:voice`.
- The Chakra agent policy and hash-chained audit log live in `src/engine/chakra.js`; its UI/loop lives in `src/components/chakra/`, with `api/agent.js` for online proposals and `src/voice/brain.js` as the offline fallback.
- This project is intentionally offline-friendly after initial fetches. Generated data is meant to be committed rather than fetched on every build.

## Key conventions

- Real vs. sample data is product-critical: climate, rain, radar, soil, price, and yield data are real; farmers, requests, and registry owners are sample. Keep provenance labels truthful (`SAT`, `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO`), and do not blur the boundary between model estimates and field measurements.
- User-facing text is Bangla-first and bilingual. Use `T(bn, en)` / `L({ bn, en })` for text and `num()` / `bnDigits()` for numbers instead of hard-coded display logic.
- Keep calculations in `src/engine/`, not in pages or UI components. If a value reaches the user interface, it usually belongs in the engine and should be covered by a test when practical.
- Prefer the repo's data workflow: regenerate the relevant dataset with the matching `npm run fetch:*` / `npm run data:*` script, then commit the generated output. Do not hand-edit generated data files or build artifacts.
- Before changing behavior, check the relevant docs: `docs/THRESHOLDS.md`, `docs/DATA_SOURCES.md`, `docs/RADAR.md`, `docs/VOICE.md`, and `docs/MERGE.md`.
- Keep UI code thin and orchestration-driven. Route-level components and layout shells should compose engine results and existing data rather than reimplementing agronomic logic.
- Anything sent in the office's name requires an officer's approval in every mode; the AI may propose actions but must not execute them.
- This repo uses ES modules and JSX patterns consistent with surrounding code. Follow the existing naming and quoting conventions already in the project.
- `README.md` is the best place to understand the challenge story and product flow. It maps the challenge statement to the app pages and feature groups.

## Project-specific guardrails

- Do not edit generated data or build output by hand; regenerate it through the scripts in `scripts/`.
- Favor computing new values in `src/engine/` and exposing them through the existing store or route data flow instead of embedding logic in components.
- For climate, soil, rainfall, and radar rule changes, verify the relevant assumptions against the docs before adjusting thresholds or behavior.
- The AI crop doctor and server endpoints depend on server-side keys like `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`; the app should degrade gracefully when the key is absent.
