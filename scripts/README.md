# Scripts

Every script that makes the app's data and photos. The app itself never runs them: their output is committed, so a
build needs no network. Raw downloads are kept in `.cache/` (git-ignored) so a second run is fast. Where each dataset
comes from is in [docs/DATA_SOURCES.md](../docs/DATA_SOURCES.md).

| Folder | What is in it |
| --- | --- |
| `fetch/` | Downloads from NASA and others, written straight into `src/data/` (Node, no login unless noted) |
| `build/` | Rebuilds boundaries, places, land use, soil, prices, field watch and the radar from public sources (Python and Node; [build/README.md](build/README.md)) |
| `onset/` | The rain-onset rule (`onset.mjs`, also used by the app's tests) and its check against BMD station onsets |
| `photos/` | Photo tools in Python: the upscaler, the neighbouring-country photos, NASA images ([photos/README.md](photos/README.md)) |
| `lib/` | Shared helpers: NASA GIBS image decoding (`gibs.mjs`) |
| `sync-voice.mjs` | Copies the voice brain into `services/voice-agent` |

| npm | Script | Writes |
| --- | --- | --- |
| `fetch:power` | `fetch/power.mjs` | NASA POWER + GPM IMERG daily weather, `src/data/climate/climate_<upazila>.json` |
| `fetch:land` | `fetch/gibs-land.mjs` | NASA MODIS NDVI and land surface temperature and MERRA-2 evaporation, monthly since 2001, via GIBS: `src/data/land/land_sat.json` |
| `fetch:terrain` | `fetch/srtm.mjs` | NASA SRTM 30 m height, hollows and slope at every registered field: `src/data/land/field_terrain.json` |
| `fetch:cmip6` | `fetch/cmip6.mjs` | NASA NEX-GDDP-CMIP6 change per month, 8 models, `src/data/climate/cmip6_deltas.json` |
| `fetch:stories` | `fetch/stories.mjs` | Climate for the story upazilas, `src/data/climate/stories_climate.json` |
| `fetch:wetness` | `fetch/soil-wetness.mjs` | NASA POWER root-zone soil wetness, `src/data/water/soil_wetness.json` |
| `fetch:water` | `fetch/gibs-water.mjs` | GRACE and SMAP through NASA GIBS, `src/data/water/water_sat.json` |
| `fetch:sedac` | `fetch/sedac.mjs` | NASA SEDAC density, low coast, cropland per upazila, `src/data/region/sedac.json` |
| `fetch:giovanni` | `fetch/giovanni.mjs` | NASA Giovanni IMERG monthly rain check, `src/data/climate/giovanni.json` (needs `EARTHDATA_TOKEN` in `.env.local`) |
| `fetch:neighbours` | `build/build_neighbours.py` | The five neighbouring-country farms, `src/data/abroad/` |
| `data:build` | `build/build_godagari_*.py`, `build/build_bangladesh_crops.py` | Boundaries, places, land use, national crop map, `src/data/geo/` |
| `data:soil` | `build/build_soil.py` | ISRIC SoilGrids per union and field, `src/data/soil/` |
| `data:srdi` | `build/build_srdi_frs.mjs` | SRDI fertilizer doses per union, `src/data/soil/srdi_frs.json` |
| `data:fields` | `build/build_field_watch.py` | Sentinel-2 field watch, `src/data/fields/field_watch.json` |
| `data:prices` | `build/build_market_prices.py` | DAM weekly prices, `src/data/market/market_dhaka.json` |
| `data:seasons` | `build/build_price_seasons.py` | Price-dip months and FAOSTAT yields, `src/data/market/` |
| `data:aman` | `build/build_aman_radar.mjs`, `build/build_aman_hazards.mjs` | Sentinel-1 Aman radar and hazards, `src/data/radar/`, `public/aman/` |
| `data:onset` | `onset/onset.mjs` | Rain onset per year for the seven upazilas, `src/data/radar/onset_<upazila>.json` |
| `data:onset-bmd` | `onset/compare_bmd.mjs` | The onset rule against BMD station onsets, `src/data/radar/onset_validation.json` |
| `photos:abroad` | `photos/abroad_photos.py` | Neighbouring-country photos, `src/assets/images/abroad/` |
| `photos:nasa` | `photos/nasa_images.py` | NASA Image and Video Library photos, `src/assets/images/nasa/`, `src/data/media/nasa_images.json` |
| `sync:voice` | `sync-voice.mjs` | The voice brain, into `services/voice-agent/` |
