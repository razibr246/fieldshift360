# NASA Space Apps 2026 submission kit

Challenge: **Field Shift: Adapting Farms with NASA Data**. Project: **FieldShift 360**.
Live site: https://nasa-field-shift-360.vercel.app · Code: https://github.com/razibr246/nasa-field-shift-360

Check every line against the official challenge statement when it is released (28 October 2026) before submitting.

## Project description (for the Space Apps project page)

**FieldShift 360 helps Bangladesh's smallholder farmers decide, each season, whether to keep their crop, change its
timing, or shift to another crop, using 25 years of NASA climate data.**

Farmers in Bangladesh plan by a crop calendar their grandparents trusted, but the weather has moved. On the Barind
tract around Godagari (Rajshahi) the risk is drought and spring heat; on the low land of Dhamrai (Dhaka) it is floods
and waterlogging. FieldShift 360 replays every crop and planting date through 25 seasons of NASA POWER daily weather
for the farmer's own upazila, adds local soil (ISRIC SoilGrids, SRDI fertilizer advice), crop water need and real
prices, weighs the farmer's own priorities (more income, less water, less risk, better soil, an early harvest), and
answers KEEP, ADJUST or SHIFT with the evidence, for example how many of the last 25 seasons a date was safe in.

It is built for the people who use it. Farmers get it in Bangla, by voice or typing, on a phone on rural data (the
first load is about 320 KB). Union officers receive farmers' problem reports with photos and field details and reply
from the same numbers. Upazila officers see when everyone's harvest will hit the market at once (the price-drop
risk), and Ropon Radar: when the rains set in each year (NASA/JAXA GPM IMERG) and when Aman rice was actually
transplanted (Copernicus Sentinel-1 radar). The app covers seven upazilas, one in each division.

Everything is honest about its data: every number is tagged real, rule, AI or sample. Climate, rain, radar, soil,
prices and yields are real; the farmers are sample people; crop thresholds are stated starting values for an
agriculture officer to review.

## Datasets used

### NASA

| Dataset | Used for | Link |
| --- | --- | --- |
| NASA POWER daily point API (community AG): T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, ALLSKY_SFC_SW_DWN | 25-season backtest, scores, harvest timing, climate change "then vs now" | https://power.larc.nasa.gov |
| NASA/JAXA GPM IMERG daily (IMERG_PRECTOT via POWER; GPM_3IMERGDF v07 at GES DISC) | Rain onset, June–July rain, drought/flood indices, rain cross-check | https://gpm.nasa.gov/data/imerg · https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary |
| NASA NEX-GDDP-CMIP6 v2.0 | The 2040s climate for Field Future | https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6 |
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
| 0:00–0:20 | Home hero, then the drought/flood photo and "the weather is not what it used to be" | "Grandfather's crop calendar no longer holds. 25 years of NASA weather show the change." |
| 0:20–0:50 | Step 2: Rahim's plan (Godagari) | "Rahim farms on the dry Barind. Every crop and date is tested on 25 seasons of NASA POWER weather. Keep, adjust or shift, with the evidence." |
| 0:50–1:10 | Step 3: Razib's plan (Dhamrai) | "The same question in flood-prone Dhamrai gets a different answer, from Dhamrai's own NASA data." |
| 1:10–1:40 | Step 4: voice, ask "এই রবিতে কী লাগাব?" | "Farmers ask in Bangla, by voice or by typing. The answer comes from the same working." |
| 1:40–2:10 | Step 5: union officer's requests, open one, reply | "A farmer's problem report reaches the union officer with the photo and the field's weather. The reply goes back to the farmer." |
| 2:10–2:35 | Step 6: harvest glut | "If everyone harvests the same week, prices fall. The upazila officer sees it coming and spreads the planting." |
| 2:35–3:00 | Step 7: Ropon Radar, the rain-onset chart and the Aman season | "When do the rains set in, and when was rice actually planted? NASA IMERG rain and Sentinel-1 radar, year by year. Real data; farmers are sample people; the rules are open for officers to check." |

## Slide notes (short deck)

1. **Title.** FieldShift 360: keep, adjust or shift. NASA data for Bangladesh's smallholders. Team, challenge name.
2. **The problem.** The crop calendar has moved: drought and heat on the Barind, floods on the low land. One wrong
   planting date can lose a season. Photo: cracked earth beside a flooded field.
3. **Who it is for.** Farmer (Bangla, voice, phone), union officer (SAAO), upazila officer (UAO).
4. **How it decides.** 25 seasons of NASA POWER per upazila → each crop × three dates → soil, water, price,
   priorities → KEEP / ADJUST / SHIFT with "safe in N of 25 seasons".
5. **Two places, two answers.** Godagari vs Dhamrai: same question, different NASA data, different advice.
6. **Voice in Bangla.** Everyday phrasing, regional forms, typing fallback; works on a 320 KB first load.
7. **Officers.** Problem reports with photos; harvest-glut warning from neighbours' planting dates and DAM prices.
8. **Ropon Radar.** Rain onset from GPM IMERG (2001–2026) and Aman transplanting from Sentinel-1 (2017–2026), for
   seven upazilas.
9. **Honest data.** Real vs sample tags on every number; DATA_SOURCES and THRESHOLDS documents; what still needs an
   officer's review.
10. **Next.** Officer review of thresholds, SRDI field soil values, BMD onset validation, a pilot with one union.
