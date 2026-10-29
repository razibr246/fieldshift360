# FieldShift 360

**A crop-rotation decision tool for Bangladesh's smallholders, on NASA Earth observations, the field's own soil, crop
characteristics and the farmer's priorities.** NASA Space Apps 2026. Live: https://nasa-field-shift-360.vercel.app

## Summary

- **Problem.** Farmers are choosing rotations under shifting temperatures, changing rainfall, water shortages,
  extreme weather and declining soil health: drought and a falling water table on the Barind (Godagari, Rajshahi),
  floods and waterlogging on the low land (Dhamrai, Dhaka), salt, flash floods and cold waves elsewhere. The crop
  calendar their parents trusted no longer holds.
- **What it does.** For one real field, FieldShift 360 runs every feasible one- and two-year rotation (several
  hundred) for ten years and ranks them by the farmer's own priorities: soil carbon and the four NRCS soil-health
  principles, irrigation water, profit, weather risk and pest pressure, in today's weather and in NASA's 2040s. It
  then tests the best ones in each of eight climate models on their own, and weighs paddy methane against the carbon
  stored in the soil. This season's step of the rotation (which crop, which date) is tested on 25 seasons of NASA
  weather and comes with today's field tasks.
- **Users.** Farmers (Bangla first, voice and typing), union field officers (SAAO) who answer their problem reports,
  and upazila officers (UAO) who see the whole upazila, harvest gluts and Aman planting.
- **NASA data.** NASA POWER daily weather (25 seasons per upazila) and monthly root-zone soil wetness (MERRA-2);
  GRACE/GRACE-FO water storage and SMAP root-zone soil moisture (through NASA GIBS); NASA/JAXA GPM IMERG rain for
  rain onset (checked against BMD station-based onsets) and as a cross-check; NASA NEX-GDDP-CMIP6 (8 models) for the 2040s; NASA
  GIBS HLS satellite photos; NASA FIRMS fires; NASA SEDAC population density, low coastal land and cropland
  (through GIBS); Bangladesh from space in the NASA Image and Video Library. Partner data: Copernicus Sentinel-1 radar (Aman transplanting) and
  Sentinel-2, ISRIC SoilGrids, SRDI fertilizer recommendations, DAM prices, FAOSTAT yields, BBS boundaries.
- **Real vs sample.** All climate, rain, radar, soil, price and yield data is real (sources in
  [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md)). The farmers, their requests and the land registry details are
  sample people, labelled "sample" in the app. Crop thresholds and decision rules are stated starting values awaiting
  an agriculture officer's review ([docs/THRESHOLDS.md](docs/THRESHOLDS.md)); the rain-onset rule is an assumption
  ([docs/RADAR.md](docs/RADAR.md)); it agrees with BMD station-based onsets within a week at three stations.
- **Run it.** `npm install`, then `npm run dev`; `npm test` runs the engine, voice, radar and game tests; `npm run
  build` makes the static site. Data needs no network: every file is committed. The AI crop doctor needs
  `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) on the server (see `.env.example`); without it the app says so and photos go to the officer.
- **Guided demo.** "3-minute demo story" on the home page walks through it in ten steps: the changed weather and who it is for, then rotations.

## The challenge, line by line

| The challenge statement | How FieldShift 360 answers it | Where |
| --- | --- | --- |
| A **decision-support tool** | Field Future ranks every feasible rotation for the field, starting from the rotation Sentinel-2 actually saw on it, and names the best and the most robust (with its chance over 40 futures), with its first year dated (the Rabi's best sowing day still ahead, the radar's Aman day) and planned in one tap; the season plan turns this year's step into KEEP, ADJUST or SHIFT; officers see the upazila-wide effect of a switch | `/farmer/future`, `/farmer/plan`, `/officer/upazila` |
| Uses **NASA Earth observations** | NASA POWER (weather and root-zone soil wetness), GPM IMERG rain, NEX-GDDP-CMIP6 projections, GIBS HLS imagery, FIRMS fires | Every score; table below |
| **Local soil information** | ISRIC SoilGrids 2.0 at each field and union (organic carbon, pH, texture, bulk density, drainage); the ten-year carbon run starts from the field's own carbon; SRDI fertilizer doses per union | `src/data/soil/soil_*.json`, Field Future soil column |
| **Crop characteristics** | Per crop: duration, sowing windows, water need (FAO-56 coefficients), weather failure rules, family, legume nitrogen, harvest index and root-to-shoot ratio for carbon | `src/engine/crops.js`, `src/engine/soilfuture.js` |
| **Farmer priorities and constraints** | More income, less water, less risk, better soil, an early harvest, **feeding the cattle** (straw, pulse haulm, mustard oil cake) and **keeping the soil covered**: they re-weight both the rotation ranking and the season plan at once. The farmer can also **rule out crops they cannot grow** (no market, machine, seed or labour); water availability comes from their own irrigation source | Planner step 4, Field Future |
| **Explore rotation strategies** | All one- and two-year cycles of a Rabi crop, a Kharif-1 crop and T. Aman, with or without the straw kept; side-by-side comparison; build your own; every rotation on a profit-against-soil chart | `/farmer/future` |
| **Why, evidence, benefits, gaps and risks for each strategy** | For farming as now, this season’s plan, the best rotation and the farmer’s own: why it came up, the evidence (NASA POWER backtest, ICBM on SoilGrids, FAO-56, FAOSTAT and prices, CMIP6, SRTM), what it may offer (soil, water, income, urea, fodder), what is not known yet, and the risks to review locally (more water, less income, new crops’ markets, straw kept in the soil costing fodder, waterlogging on low ground) | Field Future “Why and risks” |
| **Explain the science; satellites against the ground; combining scales** | A glossary (ET and ET₀, NDVI, soil-moisture anomaly, water balance, land surface against air temperature, cold and fog risk, GRACE, legumes and deep roots), every dataset’s own scale and how it is brought to one field and one season, how satellite and station data differ and are combined (with the live POWER–IMERG agreement), and each method’s uncertainty | `/science` |
| **Strengthen soil health** | Soil carbon by ICBM (Andrén & Kätterer 1997) from yield, harvest index and roots; the four NRCS principles (living roots, diversity, less disturbance, organic matter); a season-by-season soil profile (plough pan, roots, nodules, earthworms) | Soil time machine |
| **Shifting temperatures** | 25 seasons, 2001–2012 against 2013–2025, station-corrected; hot days at flowering; warmer decay of soil carbon in the 2040s | Home, planner step 2, Field Future |
| **Changing rainfall** | Ropon Radar opens with the officer's brief: this season, the hazard that comes most often, the next Aman's seedbed-to-harvest calendar on the radar-measured day, sent to the upazila's farmers in one tap. Rain onset each year from IMERG (every upazila of seven districts), checked against BMD station-based onsets (within a week at Rajshahi, Barishal, Dinajpur); rain change by season in the 2040s | `/officer/radar`, Field Future |
| **Water shortages** | Irrigation per bigha for every rotation (FAO-56); AWD for Boro; Rabi-season root-zone soil wetness 2002–2025 (NASA POWER); the water stored under the region 2003–2021 (GRACE: falling 8.9 cm a decade under Godagari, p < 0.01); root-zone soil moisture this month against normal (SMAP, r = 0.89–0.96 with POWER) | Field Future "Soil water", climate account |
| **Extreme weather** | Each crop's failure rules replayed over every season; drought and flood indices; live seven-day weather warnings | Planner, officer alerts |
| **Field-level vulnerabilities** | Each field’s card of what threatens it, low, some or high, with the numbers: water gathering and erosion from NASA SRTM, heat at Boro flowering, cold nights and a dry Rabi from NASA POWER, and stressed seasons from MODIS | My field; the officer’s farmer page |
| **Bare fields and vegetation stress** | MODIS NDVI since 2001: the area’s leanest months (when fields lie bare, the window for a cover or Kharif-1 crop), each Rabi’s greenness against the area’s own trend (years of crop stress), ground heat then and now, MERRA-2 evapotranspiration | Field Future “From space”, neighbouring farms |
| **Scenario sliders** | The 25 seasons replayed up to 3 °C warmer and with rain 40% up or down: does the advice hold? | Planner step 5 |
| **Adapt to changing conditions** | The 2040s from NEX-GDDP-CMIP6 (two pathways); every top rotation re-run in each of the eight models on its own, counting the futures it keeps the soil and adds no risk in (robust decision making) | Field Future "Eight-model test" |
| **Long-term resilience** | Ten-year runs; an ensemble of 8 climate models × 5 real FAOSTAT yield years giving each rotation's chance of keeping the soil; the worst model's result; a climate account (IPCC 2019 Tier 1 paddy methane against soil carbon) | Field Future |
| **Arts & Multimedia** | A season-by-season soil profile animation drawn from paddy-soil science (a flooded field turns grey under a thin brown skin, rice roots wear rust-orange iron plaque, methane bubbles at the rate the climate account uses, earthworms leave, Barind clay cracks as it dries), with a live caption of what is happening in the soil; "My field's ten years", a narrated story of the farmer's own numbers saved as a video to share; a printable picture poster of the rotation by Bangla season; Bangla voice | Field Future |
| **Who benefits, and how many** | 16.88 million farm households (Agriculture Census 2019); 4.85 million ha of Boro; 2.51 million people in the seven upazilas (Census 2022), each measured with NASA SEDAC: population density, land below 10 m (LECZ), cropland share | Home "Who it is for" |
| Reaching every farmer | Bangla voice and typing; an SMS mode for feature phones (keywords or everyday Bangla, answered by the same engine in 70-character parts) | `/farmer/voice`, `/farmer/sms` |
| Farmers **around the world** | Full engine for seven upazilas, one in each division of Bangladesh. Sample farms in India, Pakistan, Nepal, Bhutan and Myanmar with the season plan, risks, the 2040s, GRACE and SMAP water, and ten-year rotation options on the farm's own SoilGrids soil and the country's FAOSTAT yields (the same soil-carbon, nitrogen and methane model). Every input is global | `/abroad/*/future` |

## What was built before and during the event

Everything in this repository as of 21 October 2026 was built **before** the Space Apps event, as preparation:
the planner, the data pipelines, the officer views, the voice assistant, Ropon Radar and the game.

After the challenge statement was read (22 October 2026):
- Field Future: the climate account (paddy methane against soil carbon, with AWD), the eight-model robustness test,
  the Rabi soil-water record (NASA POWER GWETROOT, `scripts/fetch/soil-wetness.mjs`) and the redrawn soil profile.
- The home page leads with ten-year rotations; the demo story starts from rotations and soil health.
- NASA GRACE and SMAP water records through GIBS (`scripts/fetch/gibs-water.mjs`), in Field Future and abroad.
- Rotation options for the five neighbouring-country farms (`scripts/build/build_abroad_soil_yields.py`,
  `src/engine/rotationAbroad.js`).
- Field Future starts from the rotation Sentinel-2 saw on the field; the robustness test became a 40-future
  ensemble (8 models × 5 FAOSTAT yield years); the officers' upazila impact estimate; the narrated story video and
  the printable poster; SMS mode.
- The rain-onset rule checked against BMD station-based onsets (`scripts/onset/compare_bmd.mjs`); the search now
  opens on 15 May instead of 15 April, and every upazila's onset was re-worked.

The commit history shows each change with its date.

## Licence

MIT (`LICENSE`), except `public/radar/` (the Ropon Radar prototype), which is Apache-2.0 (`public/radar/LICENSE`).
Data keeps its own licence, listed per dataset in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Background

Season planning for smallholders, first built for Godagari, Rajshahi (Barind Tract), now seven upazilas.

Each Rabi season a farmer has one question: *keep the same crop, keep it but change the timing, or move to a
different crop?* FieldShift 360 answers it from 25 seasons of NASA climate history, union-level soil, crop
needs and the farmer's own priorities. It also checks what the neighbours are planting (so everyone's harvest
doesn't hit the market in the same week), suggests the next crop in the rotation, and connects the farmer to
the Godagari upazila agriculture office, where one upazila agriculture officer (UAO) sees every union and village.

The app is bilingual (Bangla first, English toggle). It runs entirely in the browser: real NASA data is saved in
the app and refreshed live where NASA allows it; farmers and requests are sample data. The only server part is the
shared plan board (`api/plans.js`, see below), so every farmer's confirmed plan counts in everyone's price-drop check.

## NASA data used

| NASA data | What it does here | How it is fetched |
| --- | --- | --- |
| **NASA POWER** daily (T2M_MAX, T2M_MIN, PRECTOTCORR), Oct 2000 to Oct 2026 | Every backtest, score, harvest window and the "then vs now" comparison | `npm run fetch:power` (no login), saved in the app |
| **NASA POWER** monthly GWETROOT and GWETTOP (root-zone and surface soil wetness, MERRA-2), 2001–2025 | Field Future's Rabi soil-water record: each season's wetness, before against now, and its trend | `node scripts/fetch/soil-wetness.mjs` (no login), saved as `src/data/water/soil_wetness.json` |
| **NASA POWER**, last ~80 days, live | "This season so far" card; falls back to the saved series, with its date, when NASA cannot be reached | Browser call to the POWER API |
| **NASA/JAXA GPM IMERG** daily (`IMERG_PRECTOT` through POWER, UTC days) | Independent satellite check of POWER rain: Rabi seasons r = 0.81, monsoon r = 0.76 over 25 seasons | Same script, second request |
| **NASA MODIS** monthly NDVI and daytime land surface temperature, and **NASA MERRA-2** monthly land evaporation (all via NASA GIBS), 2001–2026 | Field Future “From space”: the area’s green cycle and its leanest months (when fields lie bare), each Rabi’s greenness against the area’s trend (years of vegetation stress), March–May ground heat then and now, and evapotranspiration | `npm run fetch:land` (no login) |
| **NASA MODIS MOD13Q1** (250 m 16-day NDVI, ORNL DAAC web service), Jan–Feb since 2001 | Each registered field’s own Rabi greenness: its stressed seasons and how green it runs against its area, in the field’s risk card | `npm run fetch:fields-ndvi` (no login) |
| **NASA SRTM** and **NASA/METI ASTER GDEM** (30 m elevation, averaged, via Open Topo Data) | Every registered field’s height, whether it sits in a hollow where water gathers, and its slope from a plane fitted out to 500 m, with the two models’ disagreement as each field’s uncertainty: waterlogging and erosion risks | `npm run fetch:terrain` (no login) |
| **NASA NEX-GDDP-CMIP6 v2.0** (NCCS, 0.25°, bias-corrected, 8 models, SSP2-4.5 and SSP5-8.5) | Field Future's 2040s: each model's monthly change in Tmax, Tmin and rain at the upazila's cell, added to its own NASA POWER days | `npm run fetch:cmip6` (no login; NASA THREDDS point subsets, cached and resumable), saved as `src/data/climate/cmip6_deltas.json` |
| **NASA GIBS · HLS** (Harmonized Landsat 8/9 and Sentinel-2, 30 m) | "NASA satellite" map type with cloud-free dates from Agrahayan to Aman, chosen per upazila (each checked over the whole upazila: full coverage, nearly no cloud; Godagari's dates are blank over Dhamrai) | WMTS tiles from gibs.earthdata.nasa.gov |
| **NASA GRACE / GRACE-FO** (JPL mascons, CRI) and **NASA SMAP** L4 root-zone soil moisture, through NASA GIBS (Worldview's imagery service) | Field Future "Soil water": the water stored under each upazila since 2002 (falling 8.9 cm a decade under Godagari), this month's root-zone moisture against normal | `node scripts/fetch/gibs-water.mjs` (no login), saved as `src/data/water/water_sat.json` |
| **NASA FIRMS** (VIIRS fires) | Fires and straw burning on the neighbouring-country pages | Saved in `src/data/abroad/*.json` (`npm run fetch:neighbours`) |
| **NASA SEDAC** (through NASA GIBS): GPW v4.11 population density 2020, LECZ v3 land below 10 m, Global Agricultural Lands croplands 2000 | Home "Who it is for": each upazila's density, low-lying land and cropland share, measured inside its own boundary | `npm run fetch:sedac` (no login), saved as `src/data/region/sedac.json` |
| **NASA Image and Video Library** | Home "Bangladesh through NASA's eyes": the delta from the Space Shuttle, the Sundarbans and the coast from the ISS, Rupganj by ASTER, each credited and linked | `npm run photos:nasa` (no key), saved in `src/assets/images/nasa/` and `src/data/media/nasa_images.json` |
| **NASA Giovanni** (GES DISC), GPM IMERG V07 monthly | Ready: an independent check of the POWER rain behind every plan, at each upazila | `npm run fetch:giovanni` (needs a free Earthdata token in `.env.local`) |

Copernicus **Sentinel-2 L2A** (ESA, 10 m) through Microsoft Planetary Computer (no key) watches every registered field:
green cover (NDVI), moisture (NDMI) and standing water on each clear pass since June 2025, a true-colour and green-cover
picture of the latest pass, and the "Sentinel-2 (10 m)" map type (clearest pass of a chosen month, retina tiles). The
saved copy is `src/data/fields/field_watch.json` (`npm run data:fields`); the app adds newer passes live when online.

Other open data, each labelled in the app: BBS/OCHA union and upazila boundaries (geoBoundaries), GeoNames village
names, Esri/Impact Observatory/Microsoft Sentinel-2 land cover, BBS Yearbook of Agricultural Statistics 2023 (district
rice), FAOSTAT 2024 (national crop areas), Open-Meteo (live forecast), OpenFreeMap/OpenStreetMap (vector map).

## Use of AI

| Where | What | Notes |
| --- | --- | --- |
| In the app | Problem clusters: DBSCAN groups similar nearby farmer reports | Labelled **AI**; an officer approves every message before it is sent |
| In the app | Field watch: which crop pattern (Aman, mustard then Boro, Boro, wheat, lentil, vegetables, fallow, flooded) best fits each field's real Sentinel-2 green-cover curve, with a confidence | Labelled **AI**; the health reading next to it is open rules (`src/engine/fieldwatch.js`), and it never names a disease |
| In the app | Photo clear-up: Real-ESRGAN `realesr-general-x4v3` (BSD-3-Clause, official weights blended 50/50 with its keep-detail twin, converted to ONNX: `public/models/`) makes an enlarged satellite photo 4× sharper, on the device (ONNX Runtime Web, WebGPU or WebAssembly, loaded from jsDelivr on first use) | Labelled **AI**: edges come from the real photo, fine texture is the model's estimate; nothing is measured from it |
| In the app | Voice assistant | Answers come from the same rule-based engine as the screens; nothing is sent without a spoken "yes" |
| Building the app | AI coding assistants (including Claude Code) under the team's direction | Code was reviewed and tested by the team |

No AI-generated numbers are used as data. Every score is rule-based and can be opened with **Why?**.

---

## Run

Needs Node 18 or newer.

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # engine tests (Node's built-in runner)
npm run build          # static site in dist/ (hash routing: works on Netlify, Vercel, GitHub Pages or any folder)
npm run build:single   # everything in one file: dist-single/index.html (open it straight from disk)
npm run preview        # serve dist/ locally
```

## Shared plan board (planner step 7, officer pages)

Every confirmed season plan goes to `api/plans.js`, a Vercel function that keeps one plan per field in Upstash Redis.
Every open app reads the board on start, every 30 seconds and when it comes back on screen, so each new farmer's
plan shows up in everyone's harvest-week chart. Only plot id, union, crop, planting day and area are stored.

- **Switch it on:** in the Vercel project, Storage → add Upstash Redis (free tier is enough) and connect it. Vercel
  adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`; redeploy. Without them the function answers 503 and the app says
  "the shared plan server is not switched on yet" and works from the phone's own plans plus sample neighbours.
- **Officer → farmer messages** (`api/messages.js`) use the same store: every reply, area advice and weather warning
  an officer sends is delivered to each recipient's own phone, which checks every 30 seconds, opens with a pop-up of
  unread messages and can raise a phone notification. Before real use, sending must require an officer sign-in.
- **Local:** `npm run dev` serves an in-memory board at `/api/plans` with the same checks, so two browser tabs share
  plans until the dev server stops.

## Project name and branding: one place

The name, tagline, description, region and event line live in **`src/config/brand.js`**:

```js
export const PROJECT_NAME = 'FieldShift 360';
export const PROJECT_TAGLINE = { bn: '…', en: '…' };
export const PROJECT_DESCRIPTION = '…';
```

Everything reads from it: the logo wordmark, navbar, hero copy, login page, farmer and officer headers, footer,
the browser tab title, `<meta>` description and Open Graph tags (Vite fills `%PROJECT_NAME%` in `index.html` at
build time), and even the browser-storage key. Change it once, rebuild, and the whole app follows. If the name
has a space, the part after the last space is drawn in the accent colour in the logo.

## Images

The supplied photos are in `src/assets/images/`, AI-sharpened (Real-ESRGAN, `scripts/photos/upscale_photos.py`) and saved as WebP at 900, 1600, 2400 and 3200 px widths (original
aspect ratios kept). `src/assets/images/index.js` exports them with their size, focal point and Bangla/English
alt text, and `src/components/Photo.jsx` renders them with `srcset`, `object-fit: cover` and the focal point,
lazy-loaded except the hero. No text is placed on top of a photo except where a soft gradient keeps it readable.

| Photo | Used in |
| --- | --- |
| `village-sky`, `sunset-fields`, `mantis-paddy` (the farmer's own photos: village sky, fields at sunset, a mantis over the paddy) | First three slides of the Home hero |
| `hero-aerial-dawn` (paddy fields and river at dawn) | Home hero |
| `drought-flood-split` (dry and flooded field) | Home "the weather has changed" section; planner step 2 (weather) |
| `land-parcels-aerial` (field plots from above) | Home "show us your field" section; My field page header; planner step 1 summary card |
| `seedlings-sunrise` (seedlings at sunrise) | Home recommendation section; farmer dashboard header; planner step 6 (next crop); Today alerts card |
| `satellite-patchwork` (satellite view of fields) | Home "where the data comes from" section background |
| `farmer-rice-field` (farmer in the paddy) | Home officer/community section; login page |
| `abroad/india`, `abroad/pakistan`, `abroad/nepal`, `abroad/bhutan`, `abroad/afghanistan` (Wikimedia Commons, resized from 4,300–5,200 px originals, not upscaled) | Home hero slides for the neighbouring countries, each with its credit under the photo pill |

Neighbouring-country photo credits: Punjab wheat — Jagseer S Sidhu, CC BY-SA 4.0; rice harvest, Pakistan — Tariq
hameed sulemani, CC BY-SA 4.0; Ghandruk terraces, Nepal — Manuel Velazquez, CC BY 3.0; Paro rice fields, Bhutan —
Bernard Gagnon, CC BY-SA 4.0; Bamyan wheat, Afghanistan — Monikajoannah, CC BY-SA 4.0 (all via Wikimedia Commons).

## Every field, from the upazila office register, watched by satellite

Each upazila agriculture office keeps a register of the fields each farmer works (`src/data/fields/parcels.json`). For now it
holds Rahim Uddin (Godagari, Rajshahi) and Razib Miah (Dhamrai, Dhaka), four fields each in three or four unions, 0.5 to 5
bigha. The positions are real cropland (checked against Esri / Impact Observatory 10 m land cover 2025 and Sentinel-2);
owners, sizes, names and register numbers are sample data.

- **My fields** (`/farmer/farm`) opens on a satellite map fitted to all of a farmer's fields, numbered and coloured by how
  each looks from space, with a list beside it. Picking one shows its latest Sentinel-2 picture (true colour or green
  cover, with the field outlined), what is growing and at what stage (AI, with a confidence), a health reading (green
  cover against a typical crop and against last year, uneven patches, a sudden drop, standing water, dryness), what to
  look for at this time of year, and its green cover since June 2025. It also checks last Rabi's crop against the record.
- **Plan this field** makes it the field the season planner, dashboard and officer pages work from (also in planner step 1).
- A farmer can correct a field's position or add a field; it then waits for the office. The officer's farmer page shows
  every registered field with its satellite status and **Verify** / **Registered position** for the farmer's changes.
- Each field has four pictures: **Sharp photo** (Esri's deepest real zoom there, about 0.3 m in Godagari and 0.6 m in
  Dhamrai, date not given), **Close-up** (the field only, made 4× sharper by the AI), **Today** (Sentinel-2, 10 m, last
  week) and **Green cover**. On any satellite map zoomed past the real photo, **Clear up with AI** does the same for the view.
- A satellite cannot name a pest or a disease. Warnings point to a field visit, the crop doctor, or telling the office.

## Choosing a field on the map

`/farmer/farm` (and step 1 of the planner) has a working field picker (`src/components/map/LandPicker.jsx`):

- Search by village, union or sample farmer name, or type coordinates such as `24.47, 88.33`.
- Tap the map or drag the pin; "Pin to centre" and "My location" (browser geolocation) also work.
- Satellite or street map; the Godagari boundary is shown, and a pin outside it gets a warning.
- The nearest village and union are detected from the pin, and the union's soil is shown.
- Set field size (shortcuts for 10/33/66/100 decimal, shown in bigha too), last Rabi crop and water source.
- **This is my field** saves it. The farmer's union, soil, recommendation, price-drop check, officer lists and
  maps all update from the saved field. Undo is available.

All of this is dummy data stored in the browser (localStorage). **Restart the demo** in the footer or the
"More" menu clears it.

## Refresh the NASA data

The app ships the **real** NASA POWER series for all seven app upazilas (Godagari, Dhamrai, Sitakunda, Dacope,
Bakerganj, Gangachara, Gowainghat; Oct 2000 to mid-Oct 2026) with GPM IMERG rain alongside.
To bring it up to date:

```bash
npm run fetch:power -- --end 20261015            # Godagari upazila centre, up to the given day
npm run fetch:power -- --lat 24.47 --lon 88.40   # another point
npm run build                                    # every number recalculates
```

The script (`scripts/fetch/power.mjs`, plain Node, no login) downloads daily T2M_MAX, T2M_MIN and PRECTOTCORR, then
GPM IMERG rain (`IMERG_PRECTOT`, which POWER serves on UTC days only) in a second request, and writes
`src/data/climate/climate_godagari.json` with provenance marked REAL.

`npm run data:soil` (`scripts/build/build_soil.py`) rebuilds the SoilGrids-derived `src/data/soil/soil_*.json`
(provenance REAL — a 250 m model estimate, not a field soil test); fertilizer doses come from SRDI's union-level
recommendations in `src/data/soil/srdi_frs.json`. Every script is listed in [scripts/README.md](scripts/README.md).

The geographic layers (boundary, unions, villages, land use, the Bangladesh crop map) are rebuilt from their public
sources with `npm run data:build`; see `scripts/build/README.md` and `docs/DATA.md`.

## Neighbouring countries: one farmer and one local officer each

India, Pakistan, Nepal, Bhutan and Myanmar each get the Bangladesh pair: a sample farmer on a real cropland field
next to a real village, and the agriculture officer for that farmer's own small area (the upazila-sized unit:
Sangrur tehsil block office, Dadu taluka, Janaki rural municipality, the gewog around Lobesa, Nyaung-U township).
Open them from the login page (each country is one card: farmer on one side, officer on the other), or at
`#/abroad/<india|pakistan|nepal|bhutan|myanmar>`.

- **Farmer tabs**: Home (today's call from the live forecast; e.g. "do not cut the paddy, rain is coming" in Kailali),
  My field (every clear Sentinel-2 pass since June 2025), Season plan (the next crop's calendar from the official
  sowing windows, and its FAO-56 water need), Risks (the country's farming disaster told in its own numbers, with
  NASA FIRMS fires), Field future (NASA NEX-GDDP-CMIP6 2041–2050, and a check of three rain records), Help (requests
  to the local office; replies come back here).
- **Officer tabs**: Overview, Area alerts (each with an editable SMS in the farmers' language: Hindi, Urdu, Nepali;
  English for Bhutan and Myanmar), Farmer requests, Farmer and field, Area map (the area outline from geoBoundaries,
  its villages from GeoNames, this week's fires), Planting calendar, Whole country (six farming zones on yesterday's
  NASA VIIRS picture).
- **Shared board** (`api/abroad.js`): the farmer's requests, the officer's replies and the officer's advisories go
  through the same Upstash Redis store as the Bangladesh plan board and messages (an in-memory board under
  `npm run dev`); on a static host without it the board stays in the browser and the pages say so.
- **SMS languages**: Hindi, Urdu and Nepali templates; Burmese and Dzongkha are machine-drafted and marked "draft —
  check with a local speaker", with an English version one tap away.
- **Areas**: Myanmar's township and Bhutan's gewog come from UN OCHA's administrative boundaries (HDX; Bhutan's from
  the national statistics office: the Lobesa farm is in Bapisa gewog, Punakha); the others from geoBoundaries.
- **Home page**: "The weather is not what it used to be" has a chip for each of the six countries; the five
  neighbours read the same four measures from ERA5 at their sample farm.
- **Photos** on the home page ("The same mountains, rivers and sky"): put `<country>.jpg` (india, pakistan, nepal,
  bhutan, myanmar, afghanistan) in `src/assets/images/abroad/` and run `npm run photos:abroad`; each is sharpened
  4x with Real-ESRGAN on the Apple GPU and saved at 900/1600/2400/3200 px. Until then the card shows the country colour.
- **Names**: offices are real. A person is named only where an official page read on 19 Oct 2026 names them (the
  national secretaries of India, Pakistan and Bhutan, shown as context); no local officer's name could be confirmed,
  so none is shown, and each page says why.
- **Data**: `npm run fetch:neighbours` (`scripts/build/build_neighbours.py`) writes `src/data/abroad/<country>.json`:
  ERA5 daily weather (Open-Meteo archive, `models=era5`), NASA/JAXA GPM IMERG rain via NASA POWER, NASA FIRMS VIIRS
  fires (7 days), Sentinel-2 field readings and the officer's area. NASA POWER's PRECTOTCORR is kept only for the
  record check: at these cells it has breaks that are not climate (Chauk, Myanmar: about 50 mm a year before 2008,
  500–700 after). Where ERA5 itself moves unlike the satellite record (Himalayan cells), the normal is taken from
  2017–2025 only, and the page says so. If the Open-Meteo daily limit is reached, the build reuses its cached copy.

## Pages

| Area | Route | What it does |
| --- | --- | --- |
| Public | `/` | Hero with a live recommendation and the season ribbon in Bangla months; how it works; field picker; data sources; officer section |
| | `/stories`, `/stories/:id` | Seven divisions, seven farmers: map, story in eight pillars, the hazard on real NASA data, a live alert, and the mission played through a real past year |
| | `/login` | Pick a sample account (3 farmers, or the upazila agriculture officer). No OTP or password |
| Farmer | `/farmer` | Home: your next step, season ribbon, water today, price-drop risk, harvest countdown, tasks, alerts |
| | `/farmer/farm` | My field: map picker, plan and soil |
| | `/farmer/plan` | 7-step season plan: field, weather, soil, what matters to you, recommendation, next crop, price-drop check, confirm |
| | `/farmer/today` | Water advice in four colours, weather (live Open-Meteo or sample scenarios), field check |
| | `/farmer/doctor` | Leaf photo, top-3 guess (sample), send to the officer |
| | `/farmer/help` | Send a question or problem; officer replies and area advice |
| | `/farmer/harvest` | Harvest weeks, likely yield in maund, union harvest timing, record your harvest |
| | `/farmer/future` | Field Future: ten years of the usual rotation, the best rotation found and the farmer's own, in today's weather and NASA's 2040s; soil time machine, side-by-side table, every rotation on profit against soil, NASA climate change by season and model, method and sources |
| Officer | `/officer/upazila` | Whole upazila first: union ranking, harvest curves, upazila-wide advice |
| | `/officer` | Overview of the union or municipality picked in the sidebar (all 9 unions and 2 municipalities): counts, alerts, map, requests to look at first |
| | `/officer/requests`, `/officer/requests/:id` | Requests inbox; reply, ask for photos, plan a visit, send up, mark resolved, next request |
| | `/officer/farmers`, `/officer/farmers/:id` | Farmer list with filters; each farmer's field, recommendation and past requests |
| | `/officer/map` | Whole upazila or one union: boundaries, all 441 villages by name, land use 2017/2025, planned crops, requests, clusters |
| | `/officer/alerts` | Problem clusters with editable advice to send; price-drop and dry-field alerts; what was sent up |
| | `/officer/planting` | Harvest by week per crop, tomato planting slots, land by crop, farmers not yet decided |
| | `/officer/supply` | Harvest timing by union (no buying, payments or price forecasts) |

## What is real, rule-based, AI or sample

| Output | Label |
| --- | --- |
| Climate history, backtests, "this season so far", rain cross-check | **REAL** (NASA POWER, GPM IMERG) |
| Soil properties (SoilGrids) and fertilizer doses (SRDI) | **REAL** (a 250 m model estimate and SRDI's union data, not a field soil test) |
| Scores, Keep/Adjust/Shift, rotation, price-drop risk, water advice, harvest weeks | **Rule-based** (`src/engine/`) |
| Area problem clusters | **AI** (DBSCAN) on sample requests |
| Crop doctor | **Sample** (no trained model shipped) |
| Prices and full production costs per crop | **REAL** (government procurement prices, DAM notices, ministry and field cost studies; years differ and are shown) |
| Farmers, plans, requests, officers, normal supply | **Sample** (`src/data/demo.js`) |
| Today's weather | **REAL** from Open-Meteo when online, otherwise sample scenarios |

Crop thresholds in `src/engine/crops.js` are starting values for an agronomist or SAAO to check.

## 5-minute demo

1. **Home**: read the live recommendation and season ribbon, then **Work out my field**.
2. **My field**: search "Rishikul", drag the pin, set the size, **This is my field**. The union and soil change.
3. **Season plan**: weather then vs now, soil, choose **Earn more** (then **Use less water**, and watch the answer change).
4. **Recommendation**: try **What if the weather changes?** (drier, +1°, +2°), open **Why?** for the score table. **Next crop**: the rotation on the Bangla-month ribbon.
5. **Price-drop check**: compare dates, then **Confirm**.
6. **Crop doctor**: try the sample, then **Send to my officer**.
7. **Officer view** (one upazila officer): **Whole upazila** first, then pick a union; the new request is at the top; **Area alerts**: edit the advice (watch the SMS counter), **Send to N farmers**.
8. **Area map**: whole upazila with village names and land use; switch the map type to **NASA satellite** and step through the season.
9. Back to **Farmer, Help**: the advice has arrived (bell badge).

## Structure

```
index.html, vite.config.js, vercel.json, package.json      app entry and build setup
api/                    Vercel functions: plans (shared plan board), messages, abroad, doctor (Gemini crop doctor)
public/                 sw.js (offline), manifest, icon; aman/ (radar data per upazila), models/ (photo AI),
                        radar/ (the original Ropon Radar prototype, served as is)
src/
  main.jsx, App.jsx     start-up and routes (every page but Home loads on demand)
  store.jsx             app state (React context + reducer, saved to localStorage)
  index.css             design tokens, glass, motion
  config/brand.js       project name, tagline, description (the only place the name is written)
  layouts/              Public, Farmer, Officer and Abroad layouts
  pages/                public/ (Home, Login, stories, games), farmer/ (dashboard, plan + steps, Field Future, today,
                        doctor, help, harvest, farm, voice, SMS), officer/ (overview, requests, farmers, map, alerts,
                        planting, upazila, radar, voice), abroad/ (the five neighbouring-country farmers and officers)
  components/           ui kit, chrome, Overlays, Photo, Motion, SectionNav, NasaEyes, brand/,
                        charts/, map/, fields/ (satellite field watch), story/ (story video, rotation poster)
  engine/               climate, crops, decision, rotation, soilfuture (Field Future), water, glut, harvest,
                        abroad, cluster, forecast, dates, text (+ tests)
  data/                 the app's data, nearly all of it built by a script (see src/data/README.md):
                        climate/, water/, soil/, radar/, fields/, market/, region/, media/, abroad/, geo/,
                        and the data modules (upazilas.js, demo.js, stories.js, parcels.js, crop_problems.js ...)
  assets/               images/ (photos, WebP at four widths; nasa/), maps/ (land use), fields/ (satellite thumbnails)
  voice/, radar/, ai/   the voice assistant, the rain-onset and Aman radar model, on-device photo sharpening
  game/                 "মাঠের মানুষ", the 3D farm game (regions, places, sim + tests, three/ for the 3D world)
scripts/                every data and photo script (index in scripts/README.md):
  fetch/                downloads from NASA and others: POWER, CMIP6, soil wetness, GIBS water, SEDAC, Giovanni
  build/                rebuild boundaries, places, land use, soil, prices, field watch, radar (Python and Node)
  onset/                the rain-onset rule and its check against BMD (also used by the app's tests)
  photos/               photo tools: upscaler, neighbouring-country photos, NASA images
  lib/                  shared helpers (NASA GIBS image decoding)
  sync-voice.mjs        copies the voice brain into services/voice-agent (npm run sync:voice)
services/voice-agent/   phone and browser voice pipeline (Soniox + Groq), its own project
docs/                   DATA_SOURCES, THRESHOLDS, RADAR, VOICE, MERGE, SUBMISSION (index in docs/README.md)
```

Ready for a backend later: all reads go through `useStore()` and all changes are reducer actions
(`setField`, `confirmPlan`, `addRequest`, `updateRequest`, `addAdvisory`, `escalate`, `recordHarvest`, `reset`).
Swapping `src/data/demo.js` and the reducer's side effects for API calls does not touch the pages.

Stack: React 19, Vite 6, Tailwind CSS 4, React Router 7 (hash routing), Recharts, Leaflet / react-leaflet, lucide-react.

## Limitations

- All farmers, requests, prices and officers are dummy data; saved changes live only in this browser.
- Climate is one NASA POWER point for the whole upazila (about a 50 km cell), not a field measurement.
- Map tiles need internet; without it the map is blank but pins, boundaries and fields still work. Fonts are bundled.
- Crop doctor shows a fixed sample result; no image model is shipped.
- Not built: OTP login, actually sending SMS (messages are only counted for SMS length), payments, marketplace, native apps, drawing field boundaries as polygons, ML yield prediction.

---

## What is in this repository (merged)

FieldShift 360 is the main product. Two earlier projects are merged into it, with nothing removed.

| Part | Where | What it became |
| --- | --- | --- |
| **FieldShift 360** (NASA Space Apps "Field Shift") | repo root, `src/` | The main app: Rabi planning from 25 seasons of NASA POWER, soil, crop rules, harvest-glut model, farmer and officer views |
| **Ropon Radar** (Aman rain onset vs radar-detected transplanting) | `public/radar/` (intact, still runs on its own) + `src/pages/officer/Radar.jsx` | The Aman-season module. A native summary table and the full radar are inside the officer pages (`/officer/radar`) and the Home page |
| **Legal Voice Agent** (Soniox STT/TTS + Groq, IVR, case intake) | `services/voice-agent/` (all 378 files kept, legal flows untouched) + `src/voice/` | Re-pointed at agriculture: a Bangla voice assistant for farmers and for SAAO / UAO officers, in the browser and, through the same pipeline, on the phone |

Read `docs/MERGE.md` for how the three fit together, `docs/VOICE.md` for the voice assistant, `docs/RADAR.md` for the radar module.

### New in this merge

* **Voice assistant, farmer** (`/farmer/voice`): "what should I plant?", "do I need to water today?", "when is my harvest?", "will prices fall if everyone plants together?", "what comes next?", and "tomato leaves have spots" (a confirmed report goes to the SAAO).
* **Voice assistant, officer** (`/officer/voice`, SAAO and UAO): today's briefing, urgent requests, read a request and send a reply, advise a whole area, tell the upazila officer, harvest timing, planting slots, union ranking, whole-upazila advice. Every send waits for a spoken "yes".
* **Aman radar** (`/officer/radar`): per-upazila planting gap and rain-onset trend, plus the complete radar embedded.
* All of it is bilingual (Bangla first), and the voice answers read the same engine results as the screens, so voice and screen cannot disagree.

### Tests

`npm test` runs the original engine tests plus 13 voice tests (intent routing, confirmation-before-send, role limits, honesty about sample data, danger-to-life routing). `services/voice-agent` keeps its own suites (`npm run test:case-rules` etc.).
