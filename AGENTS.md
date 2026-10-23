# Repository Guidelines

## Project Structure & Module Organization

The main application is a Vite and React site. `src/pages/` contains farmer, officer, public, and abroad screens; `src/components/`, `src/layouts/`, and `src/config/` hold reusable UI and app setup. Agriculture and planning logic lives in `src/engine/`; related features and tests are in `src/voice/`, `src/game/`, and `src/radar/`. `src/data/` and `src/assets/` contain app data and imagery. Static files and the Ropon Radar prototype are under `public/`. Server endpoints are in `api/`, data utilities in `scripts/` and `pipeline/`, and the voice service in `services/voice-agent/`. Project notes and data references are in `docs/`.

## Build, Test, and Development Commands

- `npm install` installs the root app dependencies.
- `npm run dev` starts the local Vite development server.
- `npm run build` creates the production site in `dist/`; `npm run preview` serves that build locally.
- `npm test` runs the Node test suites for the engine, voice, game, and radar onset logic.
- `npm run build:single` builds the single-file variant.
- Data refresh and generation scripts are exposed as `npm run fetch:power`, `npm run data:build`, and other `data:*` / `fetch:*` commands. Check each script's README before changing generated datasets.

## Coding Style & Naming Conventions

Use the existing JavaScript ES module and JSX patterns. Components use PascalCase filenames (for example, `HarvestOutlook.jsx`); engine modules and scripts use lowercase names, often camelCase or descriptive kebab-case. Match the surrounding indentation and quote style when editing; there is no root formatter or linter configured. Keep UI components focused and place crop, weather, soil, and rotation calculations in `src/engine/` rather than duplicating them in pages.

## Testing Guidelines

Tests use Node's built-in test runner and are named `*.test.js` beside the code or feature they cover. Run `npm test` after changes to decision logic or shared behavior. For UI changes, run `npm run dev` and check the affected farmer, officer, or public flow in the browser; for production-facing changes, confirm `npm run build` succeeds.

## Commit & Pull Request Guidelines

Recent commits use concise, sentence-style subjects describing the user-visible change (for example, “SMS mode for feature phones…”); no fixed prefix convention is evident. Keep commits focused. Pull requests should explain the behavior and motivation, list validation commands run, link related issues when available, and include screenshots for visible UI changes. Call out generated data or configuration changes explicitly.

## Security & Configuration

Use `.env.example` as the reference for local configuration. Keep secrets in local environment files and never commit them. Treat generated data as inputs with documented sources and licensing; update the relevant documentation when its provenance or build process changes.
