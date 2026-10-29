# Evidence sheet

One page for a judge or reviewer: every dataset, what kind of evidence it is, its dates and scale, how it is used,
the model assumptions, and the validation results that exist today. The same register drives the app's
**Data coverage and gaps** table (`/science#coverage`, `src/engine/provenance.js`).

Kinds: **SAT** observed by satellite · **STATION** reported by a weather station · **MODEL** estimated by a model ·
**RECORD** an official or published record · **RULE** assumed by a rule · **SAMPLE** made up for the demo.
"Calc" means the dataset goes into a number the farmer acts on; "context" means it is shown beside it only.

## Datasets

| Dataset | Kind | Use | Years | Scale | Limit |
| --- | --- | --- | --- | --- | --- |
| NASA POWER daily (T2M_MAX/MIN, PRECTOTCORR, RH2M) | MODEL (MERRA-2 + satellites) | calc | 2001–2026 | ~50 × 60 km cell | The upazila's weather, not the field's; temperatures matched to BMD normals |
| BMD station normals | STATION | calc (temperature correction, onset check) | 1991–2020 | one station, 20–70 km away | Nearest station only |
| GPM IMERG daily rain | SAT | calc (monsoon onset), check on POWER rain | 2001–2026 | ~11 km | Small storms missed or overstated |
| ISRIC SoilGrids 2.0, top 30 cm | MODEL (machine learning on soil samples) | calc | map of 2020 | 250 m cell | **A model estimate, not a soil test of the field** |
| SRDI union fertiliser guides | RECORD | calc (fertiliser doses) | varies | union soil groups | The union's typical soil |
| Sentinel-2 L2A field green curve | SAT | calc (Field Future's starting rotation) | Jun 2025 – Oct 2026 | 10 m, pixels inside the field | Cloud gaps; crop name is inferred |
| Sentinel-1 RTC radar | SAT | calc (Aman transplanting date) | 2017 – 17 Oct 2026 | ~40 m | Upazila median date |
| NASA NEX-GDDP-CMIP6, 8 models, SSP2-4.5 / SSP5-8.5 | MODEL | calc (Field Future 2040s) | 2041–2050 | ~25 km | Models disagree; each is run separately |
| FAOSTAT yields | RECORD | calc | 2020–2024 | national average | Not the field's yield |
| Prices and full production costs | RECORD | calc | each with its year (2020–2025) | national / Dhaka markets | Local markets differ; some cost years are old |
| MODIS MOD13Q1 NDVI per field | SAT | context (stressed Rabi seasons) | 2001–2026 | 250 m pixel (~15 bigha) | The field and its neighbours |
| MODIS monthly NDVI and LST | SAT | context | 2001–2026 | ~5 km | Area average |
| MERRA-2 land evaporation | MODEL | context | 2001–2026 | ~50 km | Area average |
| SRTM + ASTER GDEM terrain | SAT | context (water standing, erosion) | 2000–2013 | 30 m | Sees crop and tree tops; per-field disagreement shown |
| GRACE / GRACE-FO mascons | SAT | context | Apr 2002 – Jul 2022 | hundreds of km (five of the seven upazilas read the same values) | **A regional average, not a measurement of the field or a well**; read from colour-mapped GIBS tiles whose scale saturates in most years, so sizes are approximate |
| SMAP L4 root-zone soil moisture | MODEL (satellite assimilated) | context | 2015–2026 | 9 km | Cell average |
| NASA SEDAC population and elevation | RECORD | context | 2020 | ~1 km | Upazila summary |
| Open-Meteo forecast | MODEL | calc (today's watering advice) | today + 3 days | ~11 km | A forecast |
| Crop heat and rain thresholds | RULE | calc | — | per crop | **Not yet reviewed by local agronomists** (`docs/REVIEW_LOG.md`) |
| Neighbours' plans | SAMPLE | calc (price-drop risk) | — | union | Sample farmers |

## Model assumptions

- **Season decision** (`src/engine/decision.js`): each crop at three sowing dates is replayed over 25 seasons of
  NASA POWER weather against its rules; score = weighted sum of weather safety, water, soil match, harvest value,
  rotation fit, price-drop risk (and early harvest and fodder when chosen). Weights move with the farmer's priorities.
- **Seasons over a limit**: the share of the 13 seasons 2013–2025 in which one of a crop's heat or rain limits was
  crossed. It warns of damage; it is not a count of lost crops.
- **Close calls** (`src/engine/explain.js`): a lead under 5 points of 100 is reported as a tie. Every answer is
  re-ranked with each weight halved and raised by half, and re-run in drier, +1 °C and +2 °C weather; the panel
  reports "clear", "fairly clear" or "a close call".
- **Field Future** (`src/engine/soilfuture.js`): every feasible one- and two-year rotation for ten years; soil carbon
  by ICBM from the SoilGrids estimate; water by FAO-56; profit at national yields and published prices; best = top
  scorer that does not run the soil carbon down. A rotation that improves carbon by less than 1 percentage point over
  as now is reported as **no clear soil improvement**.
- **Robustness**: the best rotations are re-run in each of 8 CMIP6 models × 5 FAOSTAT yield years (40 futures);
  "robust" ≥ 80% of futures better than as now, "sensitive" < 50%.

## Validation results today

| Check | Result |
| --- | --- |
| NASA POWER rain against GPM IMERG, Rabi totals, 25 seasons | r = 0.67–0.82 across the seven upazilas; POWER's mean Rabi total is −2% to +23% of IMERG's, except Bakerganj (POWER 273 mm, IMERG 186 mm, +47%) |
| Same, monsoon totals | r = 0.10–0.76: weak in the wet south (Bakerganj 0.10, Dacope 0.27), so monsoon-rain rules are less certain there |
| Rain-onset rule against BMD station-based onsets (Han et al. 2024) | within a week at Rajshahi (−4 days), Barishal (+2), Dinajpur (−5), 17 years each |
| SRTM against ASTER at the 19 registered fields | the two disagree by 1.0–11.9 m; a hollow is reported only when deeper than half that disagreement |
| CMIP6 model spread, 2040s | yearly rain −30% to +27% depending on model and upazila; Rabi daytime heat −0.3 to +1.8 °C |
| SMAP L4 against NASA POWER (MERRA-2) root-zone wetness, monthly | r = 0.89–0.96 over 128 months at the seven upazilas; both draw on NASA's GEOS land modelling, so this is a consistency check, not independent validation |
| GRACE trend, Godagari region | −8.9 cm a decade (2003–2021, p = 0.008); Dhamrai region +2.2 cm (not significant). Regional, and from saturating colour tiles: the direction is more reliable than the size |
| Crop thresholds by local agronomists | **not done yet** |
| Plausibility of the crop limits | **A known problem.** Boro's flowering-heat limit (3+ days ≥ 35 °C, 75–95 days after transplanting) is crossed in 12–13 of 13 seasons 2013–2025 at Godagari and Dacope (depending on the sowing date), 11 of 13 at Dhamrai and Gangachara, 5 of 13 at Bakerganj, 2 at Sitakunda and 1 at Gowainghat, although Boro is the main crop in all of them. The limit almost certainly over-warns for local varieties and pulls Boro's weather score down; the app flags this beside the comparison and in “How this recommendation was made”. First item for local review |
| Farmer and officer usability test | **not done yet** (protocol: `docs/USER_TESTING.md`) |

The rain and model-spread figures are recomputed live from the committed data on the Science page (`/science#disagree`, `src/engine/provenance.js`); the onset check is `scripts/onset/compare_bmd.mjs`.
