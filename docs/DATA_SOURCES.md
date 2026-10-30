# Data sources

Every dataset FieldShift 360 uses, whether it is real or sample, where it comes from and where the app uses it.
All files are committed, so the Vercel build needs no network access or credentials. In the app every number carries
a tag: **NASA/real data**, **rule** (our calculation or threshold), **AI**, or **sample/demo**.

"Real" means downloaded from the named source, unchanged except for the processing described in the build script.
"Sample" means made up for the demonstration and labelled so in the interface.

## Climate and rain (NASA)

| Dataset | Real/Sample | Source | URL | Date fetched | Used where |
| --- | --- | --- | --- | --- | --- |
| `src/data/climate/climate_godagari.json`: daily T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN, 1 Oct 2000 – 15 Oct 2026, at 24.4667 N, 88.3306 E | Real | NASA POWER daily point API v2.10, community AG | https://power.larc.nasa.gov/api/temporal/daily/point (exact requests in the file's `provenance.url` and `rainUrl`; rain is fetched a year at a time and checked against IMERG, because in October 2026 POWER answered PRECTOTCORR 24 times too large to some requests) | 2026-10-24 | Season planner, KEEP/ADJUST/SHIFT decision and 25-season backtest, harvest timing, voice answers, officer pages (Godagari) |
| `src/data/climate/climate_dhamrai.json`: same parameters at 23.93 N, 90.14 E | Real | NASA POWER daily point API v2.10, community AG | as above | 2026-10-24 | Same, for Dhamrai |
| IMERG rain in both climate files (`prec_imerg`) | Real | NASA/JAXA GPM IMERG daily (IMERG_PRECTOT, UTC days) served by NASA POWER | https://power.larc.nasa.gov/docs/ | 2026-10-24 | Cross-check of POWER rain; rain-onset dates |
| `src/data/climate/climate_{sitakunda,dacope,bakerganj,gangachara,gowainghat}.json` | Real | NASA POWER (T2M_MAX, T2M_MIN, PRECTOTCORR, IMERG_PRECTOT) | as above | 2026-10-17/18 | The five other division farmers in the app and the game |
| `src/data/radar/onset_<upazila>.json` (the seven app upazilas): rain-onset date per year, 2001–2026, with trend | Real data, our rule | Computed by `scripts/onset/onset.mjs` from the IMERG and POWER rain above | — | 2026-10-21 (Godagari and Dhamrai 2026-10-28) | `/officer/radar` "Rain onset" card, officer voice "radar" answer. The rule is an assumption (docs/RADAR.md) |
| `src/data/climate/cmip6_deltas.json`: future temperature and rain change per upazila | Real | NASA NEX-GDDP-CMIP6 v2.0 (Thrasher et al. 2022), NCCS THREDDS | https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6 | 2026-10-19 | Field future: climate-change panel, every rotation's 2040s, and the eight-model robustness test (each model on its own) |
| `src/data/water/soil_wetness.json`: monthly GWETROOT (root zone) and GWETTOP (surface) soil wetness, 0–1, 2001–2025, at each of the seven upazila centres | Real | NASA POWER monthly point API (community AG), from NASA GMAO MERRA-2 | https://power.larc.nasa.gov/api/temporal/monthly/point (`scripts/fetch/soil-wetness.mjs`) | 2026-10-22 | Field future "Soil water": Rabi-season (Nov–Mar) wetness per season, before against now, Mann–Kendall trend |
| `src/data/land/land_sat.json`: monthly NDVI (MODIS Terra, MOD13C2 family), daytime land surface temperature (MODIS Terra, MOD11C3 family, °C) and land evaporation (NASA GMAO MERRA-2, mm a day), Jan 2001 – Sep 2026, at the seven upazila centres and the five neighbouring farms | Real | NASA GIBS WMS colour-mapped layers turned back into values with each layer’s published colour map; median of 3×3 pixels (0.05°) | https://nasa-gibs.github.io/gibs-api-docs/ (`npm run fetch:land`) | 2026-10-28 | Field Future “From space”: the year’s green cycle and leanest months, each Rabi’s greenness against the area’s trend (stress years), March–May ground heat then and now, evaporation |
| `src/data/land/field_terrain.json`: height, relief (field minus the mean 500 m round it), slope (a least-squares plane through 25 points out to 500 m) and spread (how far the two models disagree) at each of the 19 registered fields | Real | NASA SRTM 1 arc-second (SRTMGL1) and NASA/METI ASTER GDEM v3, both about 30 m, averaged, via Open Topo Data | https://www.opentopodata.org/ (`npm run fetch:terrain`) | 2026-10-29 | Field risks and strategy briefs: waterlogging and erosion for local review. Both models see crop and tree tops with metres of error; a hollow is named only when deeper than half the models’ disagreement |
| `src/data/land/field_ndvi.json`: each registered field’s own NDVI, January–February of every year since 2001 | Real | NASA MODIS Terra MOD13Q1 v6.1 (250 m, 16-day), ORNL DAAC MODIS web service: one grid per upazila per year, each field’s pixel picked out (MODIS sinusoidal); each month keeps its highest composite | https://modis.ornl.gov/data/modis_webservice.html (`npm run fetch:fields-ndvi`) | 2026-10-29 | Field risks: this field’s own stressed Rabi seasons and its greenness against the area. A 250 m pixel is about 15 bigha: the field and its near neighbours |
| `src/data/land/field_landsat.json`: each registered field’s Rabi NDVI a generation ago, December–March of the Landsat WELD epochs 1984–86, 1988–91 and 1998–2001 | Real | NASA/USGS Web-Enabled Landsat Data (WELD) global monthly NDVI, 30 m, via NASA GIBS (`Landsat_WELD_NDVI_Global_Monthly`); colour-mapped tiles decoded to the nearest colour-map stop (0.03 NDVI apart), median of 3×3 pixels; Landsat and MODIS are different sensors and scales, so only the direction of change is compared | `scripts/fetch/landsat-fields.mjs` |
| `src/data/water/water_sat.json`: GRACE/GRACE-FO water stored on and under the land (monthly, cm against 2004–2009, 2002–2022) and SMAP L4 root-zone soil moisture (m³/m³, the 8th and 22nd of each month since April 2015), at the seven upazilas and five neighbouring-country farms | Real | NASA GIBS WMS layers GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI and SMAP_L4_Analyzed_Root_Zone_Soil_Moisture; pixel colours turned back into values with each layer's GIBS colour map | https://nasa-gibs.github.io/gibs-api-docs/ (`scripts/fetch/gibs-water.mjs`) | 2026-10-22 | Field future "Soil water" and the neighbouring-country Future pages. GRACE cells are ~300 km and the GIBS scale stops at ±30 cm |
| `src/data/soil/abroad_soil_yields.json`: SoilGrids top 30 cm at each neighbouring-country farm; FAOSTAT national yields 2020–2024 for rice, wheat, lentil, mustard (or rapeseed), sesame, chickpea | Real | ISRIC SoilGrids 2.0; FAOSTAT Production_Crops_Livestock (Asia bulk file) | https://soilgrids.org · https://www.fao.org/faostat (`scripts/build/build_abroad_soil_yields.py`) | 2026-10-22 | Neighbouring-country "Rotations and the soil" (`src/engine/rotationAbroad.js`) |
| `src/data/market/abroad_prices.json`: farm-gate producer prices (local currency a tonne) for the neighbouring-country rotation crops | Real (old series carried forward: rule) | FAOSTAT Prices (Asia bulk file): Producer Price (LCU/tonne), and the Producer Price Index (2014–2016 = 100) to bring a price last reported before 2022 to 2022–2024 | https://www.fao.org/faostat/en/#data/PP (`scripts/build/build_abroad_prices.py`) | 2026-10-29 | Harvest value of each neighbouring-country rotation (`src/engine/rotationAbroad.js`), in the game's FieldShift station; gross value, no costs |
| `src/data/radar/onset_validation.json`: this app's onset and the same-rule IMERG onset against BMD station-based mean onsets | Real data, published values | Han et al. 2024, Climatic Change 177:77 (BMD rain 1981–2017); Stiller-Reeve et al. 2015; Ahmed & Karmakar 1993 | https://doi.org/10.1007/s10584-024-03736-z (`scripts/onset/compare_bmd.mjs`) | 2026-10-22 | Ropon Radar "Checked against BMD"; docs/RADAR.md |
| IPCC 2019 Refinement, Vol. 4 Ch. 5, Tier 1 rice methane (South Asia factor 0.85 kg CH₄/ha/day; water-regime and straw scaling factors); IPCC AR6 GWP100 of 27 for non-fossil methane | Published method | IPCC | https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html | 2026-10-22 | Field future "Climate account" (`climateLedger` in `src/engine/soilfuture.js`) |
| `src/data/climate/stories_climate.json` | Real | NASA POWER + IMERG + ISRIC SoilGrids for the story upazilas | as above | 2026-10-19 | Climate stories pages |
| `src/data/climate/station_normals.json` | Real | NOAA NCEI / WMO Climate Normals 1991–2020 for the nearest BMD stations | https://www.ncei.noaa.gov/products/wmo-climate-normals | 2026-10 | Corrects POWER temperatures to the nearest station before use (`stationCorrect` in `src/engine/climate.js`) |
| Last ~80 days of weather (not stored) | Real | NASA POWER, called live from the browser; falls back to the files above | as above | live | "This season so far" |
| HLS 30 m satellite photos (not stored) | Real | NASA GIBS WMTS, `HLS_S30_Nadir_BRDF_Adjusted_Reflectance` | https://nasa-gibs.github.io/gibs-api-docs/ | live | Field map photos |

## Radar, satellites and land

| Dataset | Real/Sample | Source | URL | Date fetched | Used where |
| --- | --- | --- | --- | --- | --- |
| `src/data/radar/aman_radar.json`, `public/aman/<upazila>.json`: Aman transplanting date per season (2017–2026) on 36 sample fields per upazila; June–July rain 2001–2026 and its trend | Real | Copernicus Sentinel-1 RTC (Microsoft Planetary Computer); NASA/JAXA GPM IMERG via NASA POWER; Esri/Impact Observatory land cover | https://planetarycomputer.microsoft.com/dataset/sentinel-1-rtc | 2026-10-19 (through 2026-10-17) | `/officer/radar`, officer voice "radar" answer, Home |
| `src/data/radar/aman_hazards.json`: drought, heat, flood and cold indices per upazila (SPI, dry spells, heavy-rain days, Rx5day, sample fields under water on radar) | Real data, WMO/agronomic rules | IMERG via POWER; Sentinel-1 | as above | 2026-10-19 | `/officer/radar` hazards section |
| `src/data/fields/field_watch.json`: NDVI and water readings for each registered field | Real | Copernicus Sentinel-2 L2A, 10 m (Microsoft Planetary Computer) | https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a | 2026-10-19 | Field watch on farmer and officer pages |
| `src/data/geo/*_boundary.json`, `*_places.json` | Real | geoBoundaries gbOpen BGD ADM3/ADM4 (BBS / OCHA ROAP 2020, CC BY 3.0 IGO); GeoNames (CC BY 4.0) | https://www.geoboundaries.org, https://download.geonames.org/export/dump/ | 2026-10-18/19 | All maps, union lists, demo farm placement |
| `src/data/geo/*_landcover.json` and maps | Real | Esri / Impact Observatory / Microsoft Sentinel-2 10 m land cover (CC BY 4.0) | https://livingatlas.arcgis.com/landcover/ | 2026-10-19 | Upazila land-use panels, sample-field selection |
| `src/data/region/sedac.json`: each upazila's population density class, share of land below 10 m, cropland share | Real | NASA SEDAC GPW v4.11 population density 2020, LECZ v3 urban and rural land below 10 m, Global Agricultural Lands croplands 2000 (Ramankutty et al. 2008), read through NASA GIBS WMS inside each BBS/OCHA upazila boundary (`scripts/fetch/sedac.mjs`) | https://sedac.ciesin.columbia.edu, https://nasa-gibs.github.io/gibs-api-docs/ | 2026-10-24 | Home "Who it is for" |
| `src/data/region/census.json`: people per upazila; farm households in Bangladesh | Real | BBS Population and Housing Census 2022 (via City Population); BBS Agriculture Census 2019 final report (via The Financial Express) | https://www.citypopulation.de/en/bangladesh/admin/ | 2026-10-24 | Home "Who it is for", submission |
| `src/data/media/nasa_images.json`, `src/assets/images/nasa/`: four photographs of Bangladesh with NASA's credits | Real | NASA Image and Video Library: sts066-92-013, iss070e005997, iss063e107090 (NASA JSC), PIA26282 (NASA/METI/AIST/Japan Space Systems, U.S./Japan ASTER Science Team) (`scripts/photos/nasa_images.py`) | https://images.nasa.gov | 2026-10-24 | Home "Bangladesh through NASA's eyes" |
| `src/data/geo/bangladesh_crops.json` | Real | BBS Yearbook of Agricultural Statistics 2023 (district rice), FAOSTAT 2024, geoBoundaries ADM2 | https://bbs.gov.bd, https://www.fao.org/faostat | 2026-10-19 | National crop map |
| `public/radar/` (Ropon Radar prototype, Rangpur) | **Sample (synthetic)** | Seeded random data (mulberry32, seed 42) | — | — | Only behind the "synthetic demo" link in the radar page's method notes; not used for any number in the app |

## Soil

| Dataset | Real/Sample | Source | URL | Date fetched | Used where |
| --- | --- | --- | --- | --- | --- |
| `src/data/soil/soil_godagari.json`, `soil_dhamrai.json` (and the five other upazilas): pH, organic carbon/matter, total N, texture, CEC, bulk density, WRB soil group per union | Real (model estimate, not a soil test) | ISRIC SoilGrids 2.0, 250 m, thickness-weighted 0–30 cm (CC BY 4.0) | https://soilgrids.org | 2026-10-19 | Crop suitability (pH, drainage), soil panels, voice answers |
| `drainage` in the soil files | Rule | Derived from the dominant WRB group (`scripts/build/build_soil.py`: Gleysols/Planosols/Stagnosols/Histosols = poor; Arenosols/Regosols/Leptosols = good; else imperfect) | — | — | Well-drained crop check |
| `src/data/soil/soil_fields.json` | Real (model estimate) | ISRIC SoilGrids at each registered field | as above | 2026-10-19 | Field pages |
| `src/data/soil/srdi_frs.json`: fertilizer recommendation per union and crop | Real | Soil Resource Development Institute (SRDI) Fertilizer Recommendation System | http://frs-bd.com/ | 2026-10-19 | Fertilizer advice and cost |
| Upazila Nirdeshika (SRDI land and soil resource guide) values | **Not used yet** | SRDI | — | — | Would replace the SoilGrids estimates per union if supplied |

## Crops, prices and costs

| Dataset | Real/Sample | Source | URL | Date fetched | Used where |
| --- | --- | --- | --- | --- | --- |
| Crop thresholds, planting dates, durations (`src/engine/crops.js`) | **Rule (assumptions)** | General agronomy starting values; each listed with its status in `docs/THRESHOLDS.md` | — | — | Backtest and decision |
| Yields (`price_seasons.json`, `yield_history.json`) | Real | FAOSTAT Production_Crops_Livestock, Bangladesh, 2020–2024 national average | https://www.fao.org/faostat | 2026-10-19 | Yield and income estimates |
| `src/data/market/price_seasons.json`: monthly farm-gate prices and the usual price-dip months | Real | Department of Agricultural Marketing (DAM) price graphical report | https://market.dam.gov.bd/price_graphical_report | 2026-10-18 | Harvest-glut warning, income |
| `src/data/market/market_dhaka.json`: this week's Dhaka retail prices | Real | DAM weekly report (PDF) | https://dam.gov.bd | 2026-10 | Market page |
| `src/data/market/crop_economics.json`: price a farmer gets and full cost per kg | Real (published figures; years differ, each shown) | Government procurement prices, Ministry of Agriculture cost estimates and news reports, each with its own URL in the file | see file | 2026-10-18 | Profit per bigha |
| `src/data/abroad/*.json` (India, Pakistan, Nepal, Bhutan, Myanmar) | Real weather and fire data; sample farmers | ERA5 (Open-Meteo), IMERG via POWER, NASA FIRMS; farmers are sample people | see each file's provenance | 2026-10-19 | Neighbouring-country pages and the game |

## People and requests (sample)

| Dataset | Real/Sample | Source | Used where |
| --- | --- | --- | --- |
| `src/data/demo.js`: farmers, plans, problem reports, officer actions | **Sample** (seeded, deterministic), placed inside real union outlines | — | Every farmer and officer screen; labelled "sample/demo" |
| `src/data/fields/parcels.json`: the land registry | Positions real cropland; owners, sizes, names, registry numbers **sample** | Esri land cover and Sentinel-2 for positions | Field pages |
| `src/data/advice.js`, `story.js`, `stories.js` | Sample text (default advice, game story) | — | Advice templates, stories |
| `src/data/crop_problems.js` | Real reference text: common problems per crop, from BARI Krishi Projukti Hatboi, BRRI Adhunik Dhaner Chash and DAE crop protection guides | — | Problem reports (picking one names the request; it is not a diagnosis) |
| `src/data/crop_photos.js` | Real photos from Wikimedia Commons; author and licence fetched live from Commons and shown with each photo | https://commons.wikimedia.org | Crop pages |

## Not yet real

- **Field soil tests**: SoilGrids is a 250 m model estimate. SRDI Upazila Nirdeshika or field test values per union would
  replace it; send the values (pH, OM %, texture, drainage class per union) and they go into `scripts/build/build_soil.py`.
- **Crop thresholds** are starting values that an agriculture officer still has to review (`docs/THRESHOLDS.md`).
- **Rain-onset rule** is our own stated rule. It agrees with BMD station-based onsets (Han et al. 2024) within a week at
  Rajshahi, Barishal and Dinajpur (`scripts/onset/compare_bmd.mjs`); Sylhet and Chattogram are not yet checked.
- **Giovanni rain check** (`scripts/fetch/giovanni.mjs`) is written but needs an Earthdata token to run.
- **Farmers and requests** are sample people.
