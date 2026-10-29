# NASA Space Apps 2026 submission kit

Challenge: **Field Shift: Adapting Farms with NASA Data**. Project: **FieldShift 360**.
Live site: https://nasa-field-shift-360.vercel.app · Code: https://github.com/razibr246/nasa-field-shift-360

Checked against the official challenge statement (rotation strategies for soil health and changing conditions) on 22 October 2026; the line-by-line table is in the README.

## Project description (for the Space Apps project page)

**FieldShift 360 helps Bangladesh's smallholder farmers choose crop rotations that rebuild their soil, save water
and hold up as the climate changes, using NASA Earth observations, a model estimate of their field's soil (ISRIC SoilGrids, 250 m; not a soil test), crop characteristics
and their own priorities.**

The crop calendar farmers inherited no longer fits the weather. On the Barind around Godagari the risk is drought,
spring heat and a falling water table; on the low land of Dhamrai it is floods and waterlogging; elsewhere salt,
flash floods and cold waves. Most advice stops at one season. FieldShift 360 looks ten years ahead, for one real
field:

- **Starting from what the satellite saw.** The field's Sentinel-2 green-cover curve names the crops it actually
  grew last Rabi and this monsoon; the ten years start from that rotation.
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
upazila of seven districts; the rain-onset rule agrees with BMD station-based onsets within a week. The full engine
covers seven upazilas, one in each division of Bangladesh; sample farms in India, Pakistan, Nepal, Bhutan and Myanmar
get ten-year rotation options on their SoilGrids soil estimate and their country's yields, with GRACE and SMAP water.

Everything is honest about its data: every number is tagged real, rule, AI or sample. Climate, rain, radar, soil,
prices and yields are real; the farmers are sample people; crop thresholds are stated starting values for an
agriculture officer to review.

## Who it is for, and how many (impact)

- **16.88 million farm households** in Bangladesh (BBS Agriculture Census 2019) choose what to plant every season;
  FieldShift 360 is built for them, their union officers (SAAO) and upazila officers (UAO).
- **4.85 million ha of Boro rice** (BBS 2022-23), the country's thirstiest crop and the biggest chance to save
  groundwater; GRACE shows the water under the Barind falling 8.9 cm a decade.
- **2.51 million people** live in the seven upazilas, one per division, where the full engine runs today (BBS
  Census 2022): Dhamrai 517,135, Godagari 376,386, Bakerganj 356,022, Sitakunda 457,396, Dacope 159,369,
  Gangachara 286,730, Gowainghat 355,979.
- **The land itself, from NASA SEDAC:** more than half of Dhamrai, Bakerganj, Sitakunda and Dacope lies below 10 m
  in the low zone joined to the sea (LECZ v3), where floods drain slowly and, near the coast, salt comes in; cropland
  covers 31% (Sitakunda's hills) to 86% (Gangachara) of each upazila.
- **It scales by re-running scripts, not rewriting code:** NASA POWER, IMERG, NEX-GDDP-CMIP6, SMAP, GRACE, SEDAC and
  SoilGrids are global, so a new upazila or country is a data run. Five neighbouring countries already run on them.

## How we know it works (validity)

- **A working prototype:** every page runs in the browser on committed data; 108 automated tests cover the engine,
  the voice assistant, the game and the rain-onset rule; every page is checked on phone and desktop with no errors.
- **Satellites checked against each other:** IMERG against POWER rain, r = 0.81 in Rabi seasons and 0.76 in the
  monsoon over 25 seasons; SMAP against POWER root-zone wetness, r = 0.89–0.96.
- **Checked against the ground:** the rain-onset rule agrees with Bangladesh Meteorological Department station-based
  onsets (Han et al. 2024) within a week at Rajshahi, Barishal and Dinajpur; POWER temperatures are corrected to the
  nearest BMD station's 1991–2020 normals.
- **Published science, named:** ICBM soil carbon (Andrén & Kätterer 1997), FAO-56 crop water, the NRCS soil-health
  principles, IPCC 2019 Tier 1 paddy methane, robust decision making over 8 CMIP6 models × 5 FAOSTAT yield years.
- **Honest about the rest:** crop thresholds are starting values awaiting an agriculture officer's review
  (THRESHOLDS.md); the farmers are sample people, labelled so on every screen.

## Team and roles

Fill in before submitting (Teamwork is scored on roles):

| Name | Role | What they did |
| --- | --- | --- |
| Razib Miah | [role] | [what they did] |

## Datasets used

### NASA

| Dataset | Used for | Link |
| --- | --- | --- |
| NASA POWER daily point API (community AG): T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN | 25-season backtest, rotation runs, scores, harvest timing, climate change "then vs now" | https://power.larc.nasa.gov |
| NASA POWER monthly GWETROOT, GWETTOP (root-zone and surface soil wetness, NASA GMAO MERRA-2) | Rabi-season soil water 2002–2025 and its trend, beside each rotation's irrigation need | https://power.larc.nasa.gov |
| NASA/JAXA GPM IMERG daily (IMERG_PRECTOT via POWER; GPM_3IMERGDF v07 at GES DISC) | Rain onset, June–July rain, drought/flood indices, rain cross-check | https://gpm.nasa.gov/data/imerg · https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary |
| NASA GRACE / GRACE-FO (JPL mascons, CRI) via NASA GIBS | Water stored on and under the land, 2003–2021, under each upazila and farm abroad | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA SMAP Level 4 root-zone soil moisture via NASA GIBS | This month's root-zone soil moisture against normal; a check on POWER's soil wetness | https://smap.jpl.nasa.gov |
| NASA NEX-GDDP-CMIP6 v2.0 | The 2040s for every rotation; each of the 8 models on its own for the robustness test | https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6 |
| NASA GIBS, HLS (Harmonized Landsat Sentinel-2) | Satellite photos of the fields through the season | https://nasa-gibs.github.io/gibs-api-docs/ |
| NASA FIRMS (neighbouring-country pages) | Fire detections | https://firms.modaps.eosdis.nasa.gov |
| NASA SEDAC via NASA GIBS: GPW v4.11 population density 2020, LECZ v3 (land below 10 m), Global Agricultural Lands croplands 2000 | Each upazila's population density, low-lying land and cropland share, measured inside its boundary (home page "Who it is for") | https://sedac.ciesin.columbia.edu |
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

## Demo video script (about 3 minutes, Bangla speech with English subtitles)

Record the "3-minute demo story" on the home page; each scene is one step. Subtitles in English throughout.

| Time | Screen | Say (subtitle) |
| --- | --- | --- |
| 0:00–0:15 | Steps 1–2, Home: the drought/flood photo and 25 seasons of NASA weather, then "Who it is for" | "The weather has moved, and the crop calendar our parents trusted no longer fits. NASA POWER shows how much in 25 seasons. Nearly 17 million farm households make this choice every season." |
| 0:15–0:40 | Step 3: Field Future, the satellite-seen rotation and the soil time machine (Rahim, Godagari) | "Sentinel-2 saw mustard then Boro on Rahim's field. From there, one field, three rotations, ten years, from its own soil: the plough pan, the roots, the carbon." |
| 0:40–1:00 | Step 4: the best rotation, then pick "less water" | "Several hundred rotations, ten years each: soil health, water, profit, weather risk and pests. The farmer's priorities change the ranking." |
| 1:00–1:15 | Step 5: the climate account, Boro to AWD; then "My field's ten years" story | "Paddy methane against soil carbon; AWD cuts it again. And the farmer gets a narrated story of their own field to share." |
| 1:15–1:35 | Step 6: the 40-future test | "Eight NASA climate models times five real yield years: forty futures. The robust choice keeps the soil in nearly all of them." |
| 1:35–1:55 | Step 7: Razib's season plan (Dhamrai) | "This year's step, tested on 25 seasons of NASA weather. Flood-prone Dhamrai gets its own answer." |
| 1:55–2:10 | Step 8: voice, then the SMS screen | "By voice, by typing, or by SMS from a basic phone, in Bangla: the same working answers." |
| 2:10–2:35 | Step 9: Ropon Radar | "When do the rains set in, and when was rice planted? NASA IMERG rain, checked against BMD, and Sentinel-1 radar, for every upazila." |
| 2:35–3:00 | Step 10: the upazila impact | "If a third of Godagari's Boro farmers switched: millions of cubic metres of water a year, while GRACE shows the water underground falling. Real data; sample farmers; open rules." |

## Slide notes (short deck)

1. **Title.** FieldShift 360: rotations that rebuild the soil and hold up in any future. NASA data for
   Bangladesh's smallholders. Team, challenge name.
2. **The problem.** Shifting heat, changing rain, water shortages, extreme weather and tired soil; advice that
   stops at one season. Photo: cracked earth beside a flooded field.
3. **Who it is for.** 16.88 million farm households (Agriculture Census 2019) and 4.85 million ha of Boro; the farmer
   (Bangla, voice, phone, SMS), union officer (SAAO), upazila officer (UAO). 2.51 million people in the seven
   upazilas today; SEDAC shows which of them lie below 10 m.
4. **How it decides.** The field's estimated soil (SoilGrids, a 250 m model, not a soil test) + 25 seasons of NASA POWER + crop characteristics + the farmer's
   priorities → every rotation run for ten years → soil carbon, NRCS soil health, water, profit, risk, pests.
5. **The soil time machine.** One field, three rotations, a living soil profile season by season.
6. **Water and climate.** Irrigation per rotation, AWD, Rabi soil wetness since 2002, methane against soil carbon.
7. **Robust to any future.** NEX-GDDP-CMIP6 2040s; the best rotations re-run in 8 models × 5 yield years = 40 futures,
   each with its chance of keeping the soil. Field Future starts from the rotation Sentinel-2 saw on the field.
8. **For every farmer and officer.** A narrated story video and a picture poster of the farmer's own rotation; SMS
   for feature phones; the upazila-wide effect of a switch for the officer.
9. **This season's step.** KEEP / ADJUST / SHIFT on 25 seasons; voice in Bangla; officers see reports and Ropon
   Radar for seven districts.
10. **Honest data.** Real vs sample tags on every number; DATA_SOURCES and THRESHOLDS documents; what still needs an
   officer's review.
11. **Next.** Officer review of thresholds, BMD onset checks for Sylhet and Chattogram, a pilot with one union and an SMS short code; the same engine for any
    country, since POWER, SoilGrids and CMIP6 are global.
