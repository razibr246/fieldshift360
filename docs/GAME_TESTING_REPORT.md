# FieldShift 360: Game Test Notes
**Status**: Node test suite and production build verified 2026-11-03

---

## 1. Automated checks

`npm test` runs the repository's Node.js test suites. The latest run passed all 249 tests. `npm run build` also completed successfully.

The game simulation tests include a headless rule-level playthrough for each of the twelve sample farmers. Each run checks that the season can be completed and that simulated gross sales reach the test's minimum. These are scripted simulations, not human-play results or estimates of real farm income. Run `SIMLOG=1 node --test src/game/sim.test.js` to print per-run details; the game uses random events, so those details can vary.

Other game checks cover:

- Crop, quiz, region, and progression rules in `src/game/sim.test.js`.
- Reachable dry-land stations and walkable village locations in `src/game/regions.test.js`.
- Renderable regional character data in `src/game/people.test.js`.
- Character movement, work poses, and camera motion in `src/game/previewMotion.test.js` and related tests.
- Story campaign and children's game rules in `src/game/saga.test.js` and `src/game/dream.test.js`.

## 2. What this does not verify

Node tests do not render the React interface or run the WebGL game in a browser. This report does not claim device performance, frame rate, GPU memory, touch target size, full accessibility compliance, or a successful human usability study. Validate those separately on browsers and devices before publishing such results.

The bot playthrough checks game rules only. Its fictional market currency and crop outcomes are for learning and must not be read as farm forecasts or income estimates.
