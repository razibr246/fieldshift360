# NASA Space Apps 2026 submission kit

Challenge: **Field Shift: Adapting Farms with NASA Data**. Project: **FieldShift 360**.
Live site: https://nasa-field-shift-360.vercel.app · Code: https://github.com/razibr246/nasa-field-shift-360

Checked against the official challenge statement (rotation strategies for soil health and changing conditions) on 22 October 2026; the line-by-line table is in the README.

## Project description (for the Space Apps project page)

**FieldShift 360 helps Bangladesh's smallholder farmers choose crop rotations that rebuild their soil, save water
and hold up as the climate changes, using NASA Earth observations, their field's own soil, crop characteristics
and their own priorities.**

The crop calendar farmers inherited no longer fits the weather. On the Barind around Godagari the risk is drought,
spring heat and a falling water table; on the low land of Dhamrai it is floods and waterlogging; elsewhere salt,
flash floods and cold waves. Most advice stops at one season. FieldShift 360 looks ten years ahead, for one real
field:

- **Every feasible rotation, ten years each.** All one- and two-year cycles of a Rabi crop, a Kharif-1 crop and
  T. Aman, with or without the straw kept (several hundred per field), run on the upazila's 25 seasons of NASA POWER
  weather. Each is scored on soil carbon (the ICBM model, started from the field's ISRIC SoilGrids carbon) and the
  four NRCS soil-health principles, irrigation water (FAO-56), profit, weather risk and pest pressure.
- **The farmer's priorities decide.** More income, less water, less risk, better soil or an early harvest
  re-weight the ranking. The best rotation is the top scorer among those that do not run the soil down.
- **Adapting to change.** The same rotations are replayed in the 2040s with NASA NEX-GDDP-CMIP6, and the best ones
  are re-run in each of the eight climate models on its own: a rotation that keeps the soil and adds no risk in
  most futures is the robust choice.
- **Water and climate.** Irrigation per bigha for each rotation, AWD for Boro, the Rabi-season root-zone soil
  wetness from NASA POWER since 2002, the water stored under the region from GRACE (falling under the Barind),
  this month's root-zone soil moisture from SMAP, and a climate account that sets paddy methane (IPCC 2019) against the carbon
  stored in the soil.
- **This season's step.** The rotation's first step (which crop, which date) is tested against 25 seasons of NASA
  weather and answered as KEEP, ADJUST or SHIFT, with today's field tasks, in Bangla, by voice or typing, on a
  phone.

Union officers receive farmers' problem reports and reply from the same numbers; upazila officers see Ropon Radar,
when the rains set in each year (GPM IMERG) and when Aman was actually transplanted (Sentinel-1 radar), for every
upazila of seven districts; the rain-onset rule agrees with BMD station-based onsets within a week. The full engine
covers seven upazilas, one in each division of Bangladesh; sample farms in India, Pakistan, Nepal, Bhutan and Myanmar
get ten-year rotation options on their own soil and their country's yields, with GRACE and SMAP water.

Everything is honest about its data: every number is tagged real, rule, AI or sample. Climate, rain, radar, soil,
prices and yields are real; the farmers are sample people; crop thresholds are stated starting values for an
agriculture officer to review.

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

Full list with dates and where each is used: [DATA_SOURCES.md](DATA_SOURCES.md).

## Demo video script (about 3 minutes, Bangla speech with English subtitles)

Record the "3-minute demo story" on the home page; each scene is one step. Subtitles in English throughout.

| Time | Screen | Say (subtitle) |
| --- | --- | --- |
| 0:00–0:20 | Home: the drought/flood photo and 25 seasons of NASA weather | "The weather has moved, and the crop calendar our parents trusted no longer fits. NASA POWER shows how much in 25 seasons." |
| 0:20–0:45 | Step 2: Field Future, the soil time machine (Rahim, Godagari) | "One real field, three rotations, ten years. It starts from this field's own soil. Boro and Aman as now hold the soil still; pulses and jute in the rotation build it." |
| 0:45–1:10 | Step 3: the best rotation, then pick "less water" | "Several hundred rotations, each run for ten years: soil health, water, profit, weather risk and pests. The farmer's own priorities change the ranking." |
| 1:10–1:30 | Step 4: the climate account, switch Boro to AWD | "Flooded paddy gives off methane. Set against the carbon stored in the soil, the best rotation cuts the field's net greenhouse gas, and AWD cuts it again." |
| 1:30–1:55 | Step 5: the eight-model test | "No one knows which climate model will be right, so each rotation is run in all eight NASA projections. The robust choice keeps the soil in every one of them." |
| 1:55–2:15 | Step 6: Razib's season plan (Dhamrai) | "This year's step of the rotation, tested on 25 seasons of NASA weather. Flood-prone Dhamrai gets its own answer from its own data." |
| 2:15–2:35 | Step 7: voice, ask "এই ধান কাটার পর কী লাগামু?" | "Farmers ask in Bangla, by voice or by typing. The answer comes from the same working." |
| 2:35–3:00 | Step 8: Ropon Radar | "When do the rains set in, and when was rice actually planted? NASA IMERG rain and Sentinel-1 radar, for every upazila. Real data; farmers are sample people; the rules are open for officers to check." |

## Slide notes (short deck)

1. **Title.** FieldShift 360: rotations that rebuild the soil and hold up in any future. NASA data for
   Bangladesh's smallholders. Team, challenge name.
2. **The problem.** Shifting heat, changing rain, water shortages, extreme weather and tired soil; advice that
   stops at one season. Photo: cracked earth beside a flooded field.
3. **Who it is for.** Farmer (Bangla, voice, phone), union officer (SAAO), upazila officer (UAO).
4. **How it decides.** Field soil (SoilGrids) + 25 seasons of NASA POWER + crop characteristics + the farmer's
   priorities → every rotation run for ten years → soil carbon, NRCS soil health, water, profit, risk, pests.
5. **The soil time machine.** One field, three rotations, a living soil profile season by season.
6. **Water and climate.** Irrigation per rotation, AWD, Rabi soil wetness since 2002, methane against soil carbon.
7. **Robust to any future.** NEX-GDDP-CMIP6 2040s; the best rotations re-run in each of the eight models.
8. **This season's step.** KEEP / ADJUST / SHIFT on 25 seasons; voice in Bangla; officers see reports and Ropon
   Radar for seven districts.
9. **Honest data.** Real vs sample tags on every number; DATA_SOURCES and THRESHOLDS documents; what still needs an
   officer's review.
10. **Next.** Officer review of thresholds, BMD onset validation, a pilot with one union; the same engine for any
    country, since POWER, SoilGrids and CMIP6 are global.
