# NASA Space Apps 2026 submission kit

Challenge: **Field Shift: Adapting Farms with NASA Data**. Project: **FieldShift 360**.
Live site: https://nasa-field-shift-360.vercel.app · Code: https://github.com/razibr246/nasa-field-shift-360

Checked against the official challenge statement (rotation strategies for soil health and changing conditions) on 22 October 2026; the line-by-line table is in the README.

## Project description (for the Space Apps project page)

**FieldShift 360 helps Bangladesh's smallholder farmers explore crop rotations that may improve soil health and
resilience, using NASA Earth observations, crop characteristics, a model estimate of soil (ISRIC SoilGrids,
250 m; not a soil test), and farmer priorities.** This prototype uses sample farmer accounts and demo fields.
NASA POWER weather is upazila-scale, and Sentinel-2 crop sequences are inferred from green-cover observations;
neither is a field-level ground measurement.

The crop calendar farmers inherited no longer fits the weather. On the Barind around Godagari the risk is drought,
spring heat and a falling water table; on the low land of Dhamrai it is floods and waterlogging; elsewhere salt,
flash floods and cold waves. Most advice stops at one season. FieldShift 360 lets users explore ten-year
scenarios for a selected demo field:

- **Starting from satellite observations.** Sentinel-2 green-cover observations are used to infer a likely crop
  sequence for the selected demo field. Cloud gaps and classification uncertainty mean this is an estimate, not
  verified crop history; users can choose the registry value instead.
- **Every feasible rotation, ten years each.** All one- and two-year cycles of a Rabi crop, a Kharif-1 crop and
  T. Aman, with or without the straw kept (several hundred per field), run on the upazila's 25 seasons of NASA POWER
  weather. Each is scored on soil carbon (the ICBM model, started from the field's ISRIC SoilGrids carbon) and the
  four NRCS soil-health principles, irrigation water (FAO-56), profit, weather risk and pest pressure.
- **The farmer's priorities decide.** More income, less water, less risk, better soil or an early harvest
  re-weight the ranking. The best rotation is the top scorer among those that do not run the soil down.
- **Adapting to change.** The same rotations are replayed in the 2040s with NASA NEX-GDDP-CMIP6, and the best ones
  are re-run in each of the eight climate models with each of five real FAOSTAT yield years: 40 futures, so every
  rotation has a chance of keeping the soil and of beating the farmer's current one.
- **Water and climate.** Irrigation per bigha for each rotation, AWD for Boro, the Rabi-season root-zone soil
  wetness from NASA POWER since 2002, the water stored under the region from GRACE (falling under the Barind),
  this month's root-zone soil moisture from SMAP, and a climate account that sets paddy methane (IPCC 2019) against the carbon
  stored in the soil.
- **This season's step.** The rotation's first step (which crop, which date) is tested against 25 seasons of NASA
  weather and answered as KEEP, ADJUST or SHIFT, with today's field tasks, in Bangla, by voice or typing, on a
  phone.

Farmers can watch a one-minute narrated story of their own field's ten years and save it as a video, print the
rotation as a picture poster, or ask by SMS from a feature phone. Upazila officers see what a switch by a share of
Boro farmers would save across the upazila in water, greenhouse gas and soil carbon. Union officers receive
farmers' problem reports and reply from the same numbers; upazila officers see Ropon Radar,
when the rains set in each year (GPM IMERG) and when Aman was actually transplanted (Sentinel-1 radar), for every
upazila of seven districts; the rain-onset rule agrees with BMD station-based onsets within a week at three stations. The full engine
covers seven upazilas, one in each division of Bangladesh; sample farms in India, Pakistan, Nepal, Bhutan and Myanmar
get ten-year rotation options on their SoilGrids soil estimate and their country's yields, with GRACE and SMAP water.

Every number says what produced it: observed by a satellite, reported by a station, estimated by a model, a
published record, a rule, AI, or sample. The weather (NASA POWER) and the soil (SoilGrids) are real data but model
estimates at upazila and 250 m scale, not field measurements; satellite, price and yield records are real; the farmers
and their plans are sample people; the crop thresholds are starting values that no local agronomist has reviewed
yet. Each rotation strategy is shown with why it came up, its evidence, what it may offer, what is not known, its
risks and what needs local review, and the app says plainly that the farmer and the agriculture officer decide.

## Who it is for, and how many (impact)

- **16.88 million farm households** in Bangladesh (BBS Agriculture Census 2019) choose what to plant every season;
  FieldShift 360 is built for them, their union officers (SAAO) and upazila officers (UAO).
- **4.85 million ha of Boro rice** (BBS 2022-23), the country's thirstiest crop and the biggest chance to save
  groundwater; GRACE shows the water stored in the region round Godagari falling about 8.9 cm a decade (2003–2021,
  a regional figure read from saturating colour tiles, so its size is approximate).
- **2.51 million people** live in the seven upazilas, one per division, where the full engine runs today (BBS
  Census 2022): Dhamrai 517,135, Godagari 376,386, Bakerganj 356,022, Sitakunda 457,396, Dacope 159,369,
  Gangachara 286,730, Gowainghat 355,979.
- **The land itself, from NASA SEDAC:** more than half of Dhamrai, Bakerganj, Sitakunda and Dacope lies below 10 m
  in the low zone joined to the sea (LECZ v3), where floods drain slowly and, near the coast, salt comes in; cropland
  covers 31% (Sitakunda's hills) to 86% (Gangachara) of each upazila.
- **It scales by re-running scripts, not rewriting code:** NASA POWER, IMERG, NEX-GDDP-CMIP6, SMAP, GRACE, SEDAC and
  SoilGrids are global, so a new upazila or country is a data run. Five neighbouring countries already run on them.

## How we know it works (validity)

- **A working prototype:** on 30 October 2026 a clean checkout of the committed code ran 204 automated tests
  (`npm test`: the engine, explanations and data coverage, voice and SMS, radar onset, the farmer tour and the game),
  all passing, and the production build succeeded. The team also reports completed farmer and officer validation;
  its date, participant counts, tasks and findings still need to be recorded in `docs/USER_TESTING.md`.
- **Sources checked against each other:** NASA POWER rain against GPM IMERG over 25 seasons, r = 0.67–0.82 in the
  Rabi across the seven upazilas but only 0.10–0.76 in the monsoon (weak in the wet south, so monsoon-rain rules
  there are less certain); SMAP L4 against POWER root-zone wetness, r = 0.89–0.96 over 128 months, a consistency
  check rather than independent validation since both draw on NASA's GEOS land modelling; SRTM against ASTER at the
  19 registered fields, 1.0–11.9 m apart, shown per field. Details: `docs/EVIDENCE.md`.
- **Machine learning, tested honestly:** ridge, logistic and decision-tree models trained on NASA POWER weather and
  soil wetness and tested on seasons they never saw. They find part of the crop's year in the weather only where
  Rabi crops follow the rain (Sitakunda, Gowainghat), and nothing at a single field; so the app keeps open rules and
  local review instead of a black-box forecast (`/science#ml`).
- **Checked against the ground:** the rain-onset rule agrees with Bangladesh Meteorological Department station-based
  onsets (Han et al. 2024) within a week at Rajshahi, Barishal and Dinajpur; POWER temperatures are corrected to the
  nearest BMD station's 1991–2020 normals.
- **Published science, named:** ICBM soil carbon (Andrén & Kätterer 1997), FAO-56 crop water, the NRCS soil-health
  principles, IPCC 2019 Tier 1 paddy methane, robust decision making over 8 CMIP6 models × 5 FAOSTAT yield years.
- **Honest about the rest:** crop thresholds are starting values awaiting an agriculture officer's review
  (THRESHOLDS.md, `docs/REVIEW_LOG.md`, still empty); the farmers are sample people, labelled so on every screen.

## Remaining validation gaps and follow-up

The team reports that farmer and officer validation is complete, but its supporting details are not yet in this
submission kit. The following agronomic and field-measurement gaps remain; nothing in the app or this kit claims
they have been resolved.

| Gap | Plan (about four weeks, one upazila) |
| --- | --- |
| Validation record is incomplete | Add the actual date, place, number and roles of participants, tasks completed, findings, and fixes to `docs/USER_TESTING.md`; do not report unrecorded outcomes |
| Crop thresholds not reviewed locally | Week 1: an upazila agriculture officer or BARI/BRRI agronomist goes through `docs/THRESHOLDS.md`, starting with Boro's flowering-heat limit, which is crossed in nearly every recent season in four upazilas where Boro is the main crop and so almost certainly over-warns; each change is recorded in `docs/REVIEW_LOG.md` and `src/data/reviews.js` |
| Soil is a model estimate | Week 2–3: soil tests (SRDI mobile lab) on 10 registered fields; compare pH and organic carbon with SoilGrids and publish the difference |
| Yields are national averages | Week 3–4: farmers' recorded harvests for the same fields against FAOSTAT; the season's backtest "bad years" against farmers' recall of bad seasons |

## Team and roles

Fill in before submitting (Teamwork is scored on roles):

| Name | Role | What they did |
| --- | --- | --- |
| Complete from verified team records before submission | Add each contributor's actual role | Describe only work they personally completed |

## Datasets used

### NASA

| Dataset | Used for | Link |
| --- | --- | --- |
| NASA POWER daily point API (community AG): T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN | 25-season backtest, rotation runs, scores, harvest timing, climate change "then vs now" | https://power.larc.nasa.gov |
| NASA POWER monthly GWETROOT, GWETTOP (root-zone and surface soil wetness, NASA GMAO MERRA-2) | Rabi-season soil water 2002–2025 and its trend, beside each rotation's irrigation need | https://power.larc.nasa.gov |
| NASA/JAXA GPM IMERG daily (IMERG_PRECTOT via POWER; GPM_3IMERGDF v07 at GES DISC) | Rain onset, June–July rain, drought/flood indices, rain cross-check | https://gpm.nasa.gov/data/imerg · https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary |
| NASA GRACE / GRACE-FO (JPL mascons, CRI) via NASA GIBS | Water stored on and under the land, yearly 2003–2021 (monthly Apr 2002 – Jul 2022), a regional average round each upazila and farm abroad | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA SMAP Level 4 root-zone soil moisture via NASA GIBS | This month's root-zone soil moisture against normal; a check on POWER's soil wetness | https://smap.jpl.nasa.gov |
| NASA MODIS: MOD13Q1 250 m NDVI per registered field (ORNL DAAC), monthly NDVI and land surface temperature (GIBS) | Each field’s stressed Rabi seasons and its greenness against the area; bare months; ground heat; three statistical methods compared | https://modis.ornl.gov · https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA/USGS Landsat (WELD global monthly NDVI, 30 m, via GIBS) | Each field’s Rabi greenness in 1988–91 and 1998–2001 beside MODIS today | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA SRTM and NASA/METI ASTER GDEM (30 m) | Standing water and erosion risk per field, with the two models’ disagreement | https://lpdaac.usgs.gov/products/srtmgl1v003/ |
| NASA GMAO MERRA-2 land evaporation (GIBS) | Monthly evapotranspiration beside the FAO-56 working | https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/ |
| NASA NEX-GDDP-CMIP6 v2.0 | The 2040s for every rotation; each of the 8 models on its own for the robustness test | https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6 |
| NASA GIBS, HLS (Harmonized Landsat Sentinel-2) | Satellite photos of the fields through the season | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA FIRMS (neighbouring-country pages) | Fire detections | https://firms.modaps.eosdis.nasa.gov |
| NASA SEDAC via NASA GIBS: GPW v4.11 population density 2020, LECZ v3 (land below 10 m), Global Agricultural Lands croplands 2000 | Each upazila's population density, low-lying land and cropland share, summarised from the gridded layers inside its boundary (home page "Who it is for") | https://sedac.ciesin.columbia.edu |
| NASA Image and Video Library | The delta, the Sundarbans and Rupganj photographed from the Space Shuttle, the ISS and ASTER (home page) | https://images.nasa.gov |

### Partners and others

| Dataset | Used for | Link |
| --- | --- | --- |
| Copernicus Sentinel-1 RTC (via Microsoft Planetary Computer) | Aman transplanting dates, flooded fields | https://planetarycomputer.microsoft.com/dataset/sentinel-1-rtc |
| Copernicus Sentinel-2 L2A | Field watch (greenness, water) | https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a |
| Esri / Impact Observatory 10 m land cover | Cropland for the sample fields | https://livingatlas.arcgis.com/landcover/ |
| ISRIC SoilGrids 2.0 | Soil per union and field | https://soilgrids.org |
| SRDI Fertilizer Recommendation System | Fertilizer doses per union | http://frs-bd.com |
| Department of Agricultural Marketing (DAM) | Prices and price-dip months | https://market.dam.gov.bd |
| FAOSTAT | Yields | https://www.fao.org/faostat |
| geoBoundaries (BBS / OCHA) and GeoNames | Boundaries, unions, villages | https://www.geoboundaries.org · https://www.geonames.org |
| NOAA NCEI / WMO climate normals 1991–2020 (BMD stations) | Station correction of POWER temperatures | https://www.ncei.noaa.gov/products/wmo-climate-normals |
| ERA5 (Copernicus C3S, via Open-Meteo) | Neighbouring-country weather | https://open-meteo.com |
| BBS Population and Housing Census 2022; BBS Agriculture Census 2019 | People in each upazila; farm households in Bangladesh | https://www.citypopulation.de/en/bangladesh/admin/ · https://bbs.gov.bd |

Full list with dates and where each is used: [DATA_SOURCES.md](DATA_SOURCES.md).

## Demo video script (3 minutes, Bangla narration with English subtitles)

The timed shot list, Bangla narration, English subtitle copy and recording checklist are maintained in
[the demo script](DEMO_SCRIPT.md). It starts with a sample farmer's decision, shows the rotation trade-offs and
evidence limits, and ends by making clear that local farmer and agriculture-officer review is still needed. Use
that file as the single script source so the submission kit and recording do not drift apart.

## Slide notes (short deck)

1. **Title.** FieldShift 360: comparing crop rotations for soil health and a changing climate. NASA data for
   Bangladesh's smallholders. Team, challenge name.
2. **The problem.** Shifting heat, changing rain, water shortages, extreme weather and tired soil; advice that
   stops at one season. Photo: cracked earth beside a flooded field.
3. **Who it is for.** 16.88 million farm households (Agriculture Census 2019) and 4.85 million ha of Boro; the farmer
   (Bangla, voice, phone, SMS), union officer (SAAO), upazila officer (UAO). 2.51 million people in the seven
   upazilas today; SEDAC shows which of them lie below 10 m.
4. **How it decides.** The field's estimated soil (SoilGrids, a 250 m model, not a soil test) + 25 seasons of NASA POWER + crop characteristics + the farmer's
   priorities → every rotation run for ten years → soil carbon, NRCS soil health, water, profit, risk, pests.
5. **Three strategies side by side.** Farming as now, the best rotation and the next alternative: why each, its
   evidence, what it may offer, what is unknown, its risks and what needs local review; then the soil time machine.
6. **Water and climate.** Irrigation per rotation, AWD, Rabi soil wetness since 2002, methane against soil carbon.
7. **Tested against 40 futures.** NEX-GDDP-CMIP6 2040s; the best rotations re-run in 8 models × 5 yield years = 40
   futures, each with the share in which it keeps the soil; what holds in any model is separated from what rests on
   an assumption. Field Future starts from the rotation Sentinel-2 appears to show on the field.
8. **For every farmer and officer.** A narrated story video and a picture poster of the farmer's own rotation; SMS
   for feature phones; the upazila-wide effect of a switch for the officer.
9. **This season's step.** KEEP / ADJUST / SHIFT on 25 seasons; voice in Bangla; officers see reports and Ropon
   Radar for seven districts.
10. **Honest data.** Every number labelled satellite, station, model, record, rule, AI or sample; a coverage-and-gaps
   table per field; where sources disagree; "a close call" when options are near; the evidence sheet.
11. **Next.** The four-week validation plan above (farmer and officer testing, threshold review, soil tests, recorded
    yields), BMD onset checks for Sylhet and Chattogram, a pilot with one union and an SMS short code; the same engine for any
    country, since POWER, SoilGrids and CMIP6 are global.
