# Data in FieldShift 360

Every number in the app is marked in the interface as real data, rule-based, AI or sample. This page lists where each
real dataset comes from and how to rebuild it.

## NASA

| File | Contents | Source | Rebuild |
| --- | --- | --- | --- |
| `src/data/climate_godagari.json` | Daily max/min temperature and rain for Godagari, Oct 2000 to mid-Oct 2026; GPM IMERG rain alongside | NASA POWER daily point API (T2M_MAX, T2M_MIN, PRECTOTCORR; IMERG_PRECTOT on UTC days) | `npm run fetch:power -- --end YYYYMMDD` |
| (live, not stored) | Last ~80 days for "This season so far" | NASA POWER API, called from the browser; falls back to the file above | — |
| (live, not stored) | HLS 30 m satellite photos on six cloud-free dates | NASA GIBS WMTS (`HLS_S30_Nadir_BRDF_Adjusted_Reflectance`) | Dates in `src/components/map/MapFrame.jsx` |

## Places and land

| File | Contents | Source | License | Rebuild |
| --- | --- | --- | --- | --- |
| `src/data/geo/godagari_boundary.json` | Upazila outline (853 points) | geoBoundaries BGD ADM3, BBS / OCHA ROAP 2020 | CC BY 3.0 IGO | `scripts/data/build_godagari_boundary.py` |
| `src/data/geo/godagari_places.json` | 9 unions and 2 municipalities (outlines, Bangla names), 441 villages, stations, beels | geoBoundaries BGD ADM4; GeoNames | CC BY 3.0 IGO; CC BY 4.0 | `scripts/data/build_godagari_places.py` |
| `src/data/geo/godagari_landcover.json`, `src/assets/maps/godagari-landcover-*.png` | Land use 2017 and 2025 inside the upazila (area per class, clipped map) | Esri / Impact Observatory / Microsoft Sentinel-2 10 m land cover | CC BY 4.0 | `scripts/data/build_godagari_landcover.py` |
| `src/data/geo/bangladesh_crops.json` | 64 districts (outlines, Bangla names, rice by season 2022-23); national crop areas by season | BBS Yearbook of Agricultural Statistics 2023; FAOSTAT 2024; geoBoundaries BGD ADM2 | MIT (extraction); CC BY 4.0; CC BY 3.0 IGO | `scripts/data/build_bangladesh_crops.py` |

## Prices and yields

| File | Contents | Source | Rebuild |
| --- | --- | --- | --- |
| `src/data/market_dhaka.json` | This week's average retail prices in four Dhaka markets, with last week, last month and last year | DAM weekly report (PDF) | `npm run data:prices` |
| `src/data/price_seasons.json` | Monthly national farm-gate (growers') prices of boro paddy, tomato, wheat, lentil and mustard by year; the typical month-by-month pattern and the months prices usually fall (10% or more below normal); Bangladesh yield per crop | DAM market portal, market.dam.gov.bd "price graphical report"; FAOSTAT Production_Crops_Livestock | `npm run data:seasons` |

The price-dip months drive the gold band and the "High" risk level on every harvest chart; the yields turn planned
land into tonnes. DAM's monthly series currently stops in 2022 to 2023, so the pattern is a long-run average, not a
forecast for this season.

## Sample data (clearly labelled in the app)

| File | Contents |
| --- | --- |
| `src/data/soil_godagari.json` | Union soil profiles. Sample values until real SRDI figures are entered with `scripts/python/build_soil.py` |
| `src/data/demo.js` | Farmers, fields, plans and requests for all 9 unions and 2 municipalities, placed inside their real boundaries |
| `src/data/advice.js`, `src/data/story.js` | Default advice text and the game story |

## Live services (need internet)

Open-Meteo (weather and forecast), OpenFreeMap / OpenStreetMap (vector map), Esri World Imagery (satellite map),
BigDataCloud (place name for the viewer's location). When they cannot be reached the app says so and keeps working.
