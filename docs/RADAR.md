# Ropan Radar: rain onset and Aman planting

`/officer/radar` runs on real satellite data. This page explains what it measures, the rules it uses and what is still
an assumption.

## What is measured

| Quantity | Source | Coverage | Status |
| --- | --- | --- | --- |
| Daily rain | NASA/JAXA GPM IMERG daily (IMERG_PRECTOT) through the NASA POWER API, at each upazila's point | 2001 – Oct 2026 | Real. Rain after 2025 is IMERG's early satellite-only estimate and is marked provisional |
| Rain onset date per year (Godagari, Dhamrai) | Computed from that rain by `pipeline/onset/onset.mjs`, rule below | 2001 – 2026 | Real data, **assumed rule** (to be validated) |
| Aman transplanting date per season | Copernicus Sentinel-1 RTC radar (VH), every pass 15 Apr – 31 Oct, 36 sample cropland fields per upazila (`scripts/data/build_aman_radar.mjs`) | 2017 – 2026, all 67 rural upazilas of the seven districts (Rajshahi, Dhaka, Chattogram, Khulna, Barishal, Rangpur, Sylhet) | Real. A date is given only when at least 6 fields show the signal |
| Drought and flood hazards | IMERG rain indices (SPI, dry spells, heavy-rain days) and Sentinel-1 water | 2001/2017 – 2026 | Real data, WMO and agronomic rules |

Transplanting is measured, not planned: Sentinel-1 radar sees a field's backscatter drop when it is flooded for
transplanting and rise as the rice grows (drop ≥ 3 dB, then rise ≥ 4 dB within 45 days). It is measured on sample
fields, not on every field, and the upazila date is the median of the fields that show it.

## Rain onset: the definition (an assumption to be validated)

For each year, the onset is the first day **D on or after 15 April** such that:

1. **Wet spell**: the five days D … D+4 bring at least **W** mm, with at least 3 days of 1 mm or more. W is the place's
   own mean 5-day rain in June–September over 2001–2025: **40.8 mm in Godagari, 55.1 mm in Dhamrai** (IMERG).
2. **No false start**: in the 30 days after the wet spell there is no 10-day window with less than 5 mm in total.
3. **The rains have set in**: those 30 days bring at least half the place's mean 30-day June–September rain. This
   separates the monsoon from a burst of pre-monsoon nor'wester storms in April and May, which otherwise pass
   conditions 1 and 2 in many years.

The rule belongs to the agronomic family of Stern, Dennett & Garbutt (1981) and Moron & Robertson (2014): a wet spell
calibrated to the local climate, with a false-start check. The thresholds (15 April, 5 days, 3 rainy days, 10-day dry
window, 5 mm, 30 days, one half) are our choices. They have **not yet been checked against Bangladesh Meteorological
Department monsoon onset records** or against farmers' own experience; that is the next step.

The earlier prototype rule (first day from 1 June with 20 mm over 3 days and no dry spell over 7 days) is not used: on
real rain it is met on 1 June itself in most years, so it says nothing.

### Results (IMERG, 2001–2025)

| | Godagari (Barind, drought-prone) | Dhamrai (low-lying, flood-prone) |
| --- | --- | --- |
| Usual onset (median) | 29 May | 12 May |
| Range | 29 April – 20 July | 16 April – 7 June |
| Trend (Sen's slope, Mann–Kendall) | +5.2 days per decade, p = 0.37: not significant | −0.5 days per decade, p = 0.93: not significant |
| Same rule on NASA POWER PRECTOTCORR | usual 18 May; −10 days per decade, p = 0.04 | usual 10 May; −9 days per decade, p = 0.11 |

What this says: the rains set in about two weeks later in Godagari than in Dhamrai, and vary a lot from year to year
(Godagari's 2022 onset, 20 July, is the 2022 monsoon failure in north-west Bangladesh). On IMERG neither region shows a
significant shift over 25 years. POWER's own rain (a reanalysis product) suggests an earlier onset in Godagari; the two
products disagree, so the app shows IMERG as the main series and POWER alongside, and makes no trend claim.

The same rule runs for all seven of the app's upazilas (one per division), and the radar build
(`scripts/data/build_aman_radar.mjs`) applies it to the IMERG rain at every other upazila it covers, so each of the 67
upazilas has its own onset card. An officer sees every upazila of their own district, in alphabetical order, and no
other district's. Their usual onset (IMERG median, 2001–2025): Gowainghat 26 April, Gangachara 10 May, Dhamrai 12 May, Dacope
17 May, Sitakunda 18 May, Bakerganj 25 May, Godagari 29 May; none shows a significant trend.

Outputs: `src/data/onset_<upazila>.json` (year, onset date, day of year, final or provisional, for each source; the
rule and thresholds in `provenance`). Rebuild with
`node pipeline/onset/onset.mjs godagari dhamrai sitakunda dacope bakerganj gangachara gowainghat`; tests in
`src/radar/onset.test.js`.

## IMERG straight from NASA GES DISC (optional cross-check)

The onset uses IMERG as served by the NASA POWER API. To confirm it against the archive itself (GPM IMERG Final Run
daily, `GPM_3IMERGDF` version 07, DOI 10.5067/GPM/IMERGDF/DAY/07):

1. Create a free NASA Earthdata login at https://urs.earthdata.nasa.gov and approve the application
   "NASA GESDISC DATA ARCHIVE" (Profile → Applications → Authorized Apps).
2. Optionally save the login in `~/.netrc`: `machine urs.earthdata.nasa.gov login <user> password <password>`.
3. `python3 -m pip install earthaccess xarray h5netcdf`
4. `python3 pipeline/onset/fetch_imerg_gesdisc.py` (a few hours; it resumes from `.cache/imerg/`).
5. `node pipeline/onset/onset.mjs godagari dhamrai` adds the GES DISC series as a third source in the onset files.

This has not been run yet (no Earthdata credentials in this environment).

## The synthetic prototype

`public/radar/` is the first Ropon Radar prototype for Rangpur district, built on seeded random data (mulberry32,
seed 42) to show the idea. None of its numbers are used in the app. It is reachable only from the "open the synthetic
demo" link in the radar page's method notes, which labels it as synthetic. Run it standalone with
`python public/radar/serve.py`.

### Where the radar has no date

An upazila gets no transplanting date in a season when fewer than 6 of its 36 sample fields show the flood-then-grow
signal. Two have no usual date at all (2017–2025): Paikgachha (Khulna), where much of the low land is in shrimp
ponds, and Agailjhara (Barishal). The page says so rather than guessing. Union names in the upazilas added for the
radar are geoBoundaries' English names (no checked Bangla spelling yet), and Hizla's map has only the two unions
geoBoundaries carries.

## Refreshing the real data

`npm run data:aman` rebuilds the radar and IMERG rain (`src/data/aman_radar.json`, `public/aman/`; resumes from
`.cache/data/aman`). `npm run fetch:power -- --upazila <id> --lat … --lon …` refreshes a climate file, then rerun the
onset pipeline. The method and its limits are at the top of `scripts/data/build_aman_radar.mjs`.
