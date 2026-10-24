# How the three projects were merged

## Principle

FieldShift 360 is the product. The other two are modules that serve the same two people, a **smallholder farmer** and an **agriculture officer** (SAAO at union level, UAO at upazila level), in Bangladesh. Nothing was deleted: every original file is still present. Changes to originals are small and listed below.

## Mapping

| Legal Voice Agent idea | FieldShift equivalent |
| --- | --- |
| Citizen calls the helpline | Farmer asks the field assistant |
| Case docket / complaint intake | Problem report becomes a help request (`type: help`, `via: voice`) |
| DLAO (district legal aid officer) | SAAO (union) |
| Chief DLAO | UAO (upazila) |
| Panel lawyer replies | SAAO replies; "advise everyone" for a cluster |
| Severity classification | Priority High / Medium / Low from symptom and urgency words |
| Universal inquiries (verified answers) | The engine's own results (recommendation, water colour, harvest window, glut risk) read from a snapshot |
| IVR 1/2/3 menu, DTMF | Keys 1-6 per role, mapped to the same utterances (`lib/agent/field/field-prompt.ts`) |
| 999 emergency escalation | Danger-to-life words go to 999 before any crop logic |

| Ropon Radar idea | FieldShift equivalent |
| --- | --- |
| Rain onset vs transplant gap (Aman, Rangpur) | The monsoon half of the year. FieldShift plans Rabi, Ropon watches Aman. Same officers, same farmers, complementary seasons |
| Bangla and English strings, SMS lengths | Same bilingual approach; radar summary uses the radar's own Bangla upazila names |

## One brain, two places

`src/voice/brain.js` is pure: `respond(text, snapshot, session)` returns spoken text, suggestion chips and *effects*. It imports nothing but two small helpers, so:

* the app runs it in the browser (`useVoiceAgent`), applying effects through the same reducer actions as the buttons;
* `npm run sync:voice` copies it into `services/voice-agent/lib/agent/field/shared/` for the phone pipeline;
* Node tests run it without a browser.

## Changes to original files

FieldShift: `App.jsx` (3 routes), `OfficerLayout.jsx` and `FarmerLayout.jsx` (nav items; farmer bottom bar now shows Voice and moves Doctor into "More"), `Home.jsx` (one section), `UpazilaSupply.jsx` (default advice text moved to `data/advice.js`), `RequestDetail.jsx` and `shared.jsx` (reply-template and advisory-text builders moved to `engine/advice.js`, behaviour unchanged), `package.json` (scripts).

Ropon Radar: `js/data.js` (`loadGeo` accepts a district), `js/scenes.js` (`?embed=1`), `css/main.css` (embed and small-screen rules).

Voice agent: `app/api/llm/route.ts` (domain switch). New files only under `lib/agent/field/`, `app/api/field/`, `speech/field-prompts.json`.

## Not done, and why

* **Godagari boundaries for the radar.** The radar still shows Rangpur (real boundaries, synthetic data). Generating Rajshahi boundaries needs `geoBoundaries` from GitHub's LFS host, which was unreachable here. On a connected machine: `python public/radar/data/prepare_geo.py Rajshahi`, then open `radar/index.html?mode=explore&district=rajshahi`.
* **Pre-recorded phone greetings** for the farming domain. The legal greeting WAVs are recordings; the new texts are in `services/voice-agent/speech/field-prompts.json` for re-synthesis (it spends TTS credits, see that project's `AGENTS.md`).
* **Real NASA data.** Done since the merge: `npm run fetch:power` has been run for all seven app upazilas and the files are committed (`src/data/climate/climate_*.json`, provenance REAL), so the app needs no network at build time; re-run it to refresh a series or add another point. Soil properties come from ISRIC SoilGrids (provenance REAL — a 250 m model estimate, not a field soil test) and fertilizer doses from SRDI's union-level recommendations (`src/data/soil/srdi_frs.json`). Farmers, plans and requests remain sample data, and the voice still says so out loud.
* **Telephone number lookup.** The phone line has no farmer database; the app posts a snapshot to `/api/field/session`. Linking a caller's number to a farmer is future work.
* **Browser test.** The app builds, the 20 tests pass and the voice service type-checks for the new files, but no real browser was available here, so the microphone and speech-synthesis paths were not exercised by a person. Try them in Chrome or Edge.
