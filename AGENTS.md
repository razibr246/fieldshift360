# Repository Guidelines

FieldShift 360: a NASA Space Apps 2026 crop-rotation decision tool for Bangladeshi smallholders and agriculture
officers. A Vite + React 19 single-page app (HashRouter, Tailwind v4, recharts, Leaflet/MapLibre) that computes
everything in the browser from committed data; `README.md` maps each line of the challenge statement to a page.
This is the one guide for every coding agent (`CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` point here).

## Commands

```bash
npm install
npm run dev                          # Vite dev server, with in-memory stand-ins for api/*
npm test                             # every Node test suite (list in package.json "test")
node --test src/engine/engine.test.js                                  # one suite
node --test --test-name-pattern="weights" src/engine/engine.test.js    # one test by name
npm run build && npm run preview     # production build in dist/, served locally
npm run build:single                 # one self-contained dist-single/index.html
npm run fetch:* / data:* / photos:*  # data and photo scripts, listed in scripts/README.md
```

There is no linter or formatter. `npm test` plus `npm run build` is the validation path; for UI changes also open
the affected farmer, officer or public page. Tests import engine modules and JSON (via `readFileSync`) only: Node
cannot import `.jsx`, so logic that needs a test belongs in `src/engine/` (e.g. `smsSplit` lives in `engine/text.js`).

## Layout

- `src/App.jsx`: routes, every page lazy-loaded; four groups with their own layout in `src/layouts/`: public (`/`,
  `/stories`, games), `/farmer/*`, `/officer/*`, `/abroad/:cc/*` (India, Pakistan, Nepal, Bhutan, Myanmar).
- `src/store.jsx`: one context holds the selected farmer, field, priorities, requests and officer context, and derives
  the season decision (`engine/decision.js`), rotation (`engine/rotation.js`), field water and hotspots. NASA POWER
  climate per upazila loads lazily (`loadClimate(id)`) and is corrected to BMD station normals. The exported `clim` and
  `tm` stay `null` until `bootClimate()` finishes, so code that runs at import time must not read them; use
  `useStore().clim` or `loadClimate(id)`. Bilingual text goes
  through `T(bn, en)` and `L({ bn, en })`; numbers through `num()` / `bnDigits()` (`engine/dates.js`). Bangla first.
- `src/engine/`: pure functions, no React. `soilfuture.js` is Field Future: `fieldContext` → `fieldFuture` runs every
  feasible rotation for ten years (ICBM soil carbon, FAO-56 water, NRCS soil health), `rank()` re-weights by the
  farmer's priorities, `climateLedger` does IPCC paddy methane, `modelTest` the 40-future ensemble.
- `src/data/`: grouped by kind (`climate/`, `water/`, `soil/`, `radar/`, `fields/`, `market/`, `region/`, `media/`,
  `abroad/`, `geo/`) plus the data modules (`upazilas.js`, `demo.js`, `stories.js` ...); see `src/data/README.md`.
  Seven upazilas, one per division (`UPAZILAS`); `stories.js` `LEVELS` fixes their order everywhere.
  The build keeps only the series listed in `CLIMATE_IN_APP` (`vite.config.js`) from each `climate_*.json`; a new
  series reaches the app only once it is added there too.
- `scripts/`: `fetch/`, `build/`, `onset/` (the rain-onset rule, also imported by `src/radar/onset.test.js`),
  `photos/`, `lib/`; index in `scripts/README.md`. Do not hand-edit generated data: change the script and re-run it.
  Moving a script changes its depth, so check its `ROOT` path and relative imports.
- `api/`: Vercel functions (`plans`, `messages`, `abroad`, `doctor` with `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`, `agent` with
  `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`, `tts` (natural Bangla / British English voice) with `GEMINI_API_KEY`); `vite.config.js`
  serves in-memory versions in dev, and without a store or key they answer 503 and the app says so.
- চক্র এজেন্ট (Chakra Agent), in the farmer and officer headers: rules, permission policy and hash-chained audit log in
  `src/engine/chakra.js` (pure, tested), UI and agent loop in `src/components/chakra/`, conversation through `api/agent.js`
  (Claude may only propose actions) with `src/voice/brain.js` as the offline fallback. Anything sent in the office's
  name needs an officer's approval in every mode; keep it that way.
- `src/voice/brain.js` answers voice and SMS from the same engine numbers; `services/voice-agent/` is a separate
  project with its own guide. After editing `src/voice/{bn,lexicon,brain}.js`, run `npm run sync:voice`; the copies in
  `services/voice-agent/lib/agent/field/shared/` are generated, never edit them. `public/radar/` is the original Ropon
  Radar prototype (Apache-2.0); `src/radar/` is the in-app radar and onset logic.
- `src/components/`: shared UI (`ui.jsx`, `Motion.jsx`, `SectionNav.jsx` with `LazyMount`), charts in `charts/`, maps in
  `map/`, and the guided tours in `tour/` (demo, farmer, officer; the farmer tour's steps are `src/data/farmer_tour.js`).
- `src/game/`: "মাঠের মানুষ", the 3D farm game (three.js in `game/three/`). Its simulation (`sim.js`) and story
  campaign (`saga.js`) are pure and tested like the engine; keep rendering out of them. `three/stage.js` runs the
  loop through `renderer.setAnimationLoop` (WebXR needs it), so an exception in a frame stops the game rather than
  being skipped; it also holds the AR/VR modes. People (`people.js`, shared by farmers and villagers) are built facing
  +z, so an opening for the face is centred at `phi = π/2` in a `SphereGeometry` and `theta = 0` in a
  `CylinderGeometry`. In dev, `window.__fsGame` (`{ g, buy, answerQuiz, stage() }`) lets a script or headless browser
  drive and inspect a running game. The children's version "স্বপ্নের মাঠ" (`/kids`) is separate: its story and
  rules are `game/dream.js` (pure, tested), its 3D world `game/three/dreamScene.js`, with rigged CC0 people in
  `public/models/people/` (see the LICENSE there).

## Rules of this project

- Real vs sample is a product rule: climate, rain, radar, soil, prices and yields are real; farmers, requests and the
  register's owners are sample. Every number carries a `<Tags list={[...]} />` label saying what produced it (`SAT`,
  `STATION`, `MODEL`, `RECORD`, `RULE`, `AI`, `DEMO`); NASA POWER weather and SoilGrids soil are `MODEL` (real data,
  not field measurements). Keep them truthful; the dataset register behind `/science#coverage` is
  `src/engine/provenance.js`.
- Before changing behaviour, check `docs/THRESHOLDS.md` (crop thresholds), `docs/DATA_SOURCES.md` (update it when
  data changes), `docs/RADAR.md` (onset rule), `docs/VOICE.md` and `docs/MERGE.md`.
- Style: ES modules and JSX as the surrounding code; PascalCase component files, lowercase engine and script files;
  match indentation and quotes. Keep calculations in `src/engine/`, not in pages.
- Commits: short sentence-style subjects naming the user-visible change; call out generated data or config changes.
- Secrets live in `.env.local` (see `.env.example`), never in the repo.
- Several agents edit this repo at the same time. Before editing a file, check `git status` / `git diff` for another
  agent's unfinished work, and change only the lines you need; never write a whole file back from an older copy.
