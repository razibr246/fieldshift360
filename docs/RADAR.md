# Ropan Radar: rain onset and Aman planting

`/officer/radar` runs on real satellite data. This page explains what it measures, the rules it uses and what is still
an assumption.

## What is measured

| Quantity | Source | Coverage | Status |
| --- | --- | --- | --- |
| Daily rain | NASA/JAXA GPM IMERG daily (IMERG_PRECTOT) through the NASA POWER API, at each upazila's point | 2001 – Oct 2026 | Real. Rain after 2025 is IMERG's early satellite-only estimate and is marked provisional |
| Rain onset date per year (every upazila) | Computed from that rain by `scripts/onset/onset.mjs`, rule below | 2001 – 2026 | Real data, rule checked against BMD station-based onsets (within a week at three stations) |
| Aman transplanting date per season | Copernicus Sentinel-1 RTC radar (VH), every pass 15 Apr – 31 Oct, 36 sample cropland fields per upazila (`scripts/build/build_aman_radar.mjs`) | 2017 – 2026, all 67 rural upazilas of the seven districts (Rajshahi, Dhaka, Chattogram, Khulna, Barishal, Rangpur, Sylhet) | Real. A date is given only when at least 6 fields show the signal |
| Drought and flood hazards | IMERG rain indices (SPI, dry spells, heavy-rain days) and Sentinel-1 water | 2001/2017 – 2026 | Real data, WMO and agronomic rules |

Transplanting is measured, not planned: Sentinel-1 radar sees a field's backscatter drop when it is flooded for
transplanting and rise as the rice grows (drop ≥ 3 dB, then rise ≥ 4 dB within 45 days). It is measured on sample
fields, not on every field, and the upazila date is the median of the fields that show it.

## Rain onset: the definition, checked against BMD

For each year, the onset is the first day **D on or after 15 May** such that:

1. **Wet spell**: the five days D … D+4 bring at least **W** mm, with at least 3 days of 1 mm or more. W is the place's
   own mean 5-day rain in June–September over 2001–2025: **40.8 mm in Godagari, 55.1 mm in Dhamrai** (IMERG).
2. **No false start**: in the 30 days after the wet spell there is no 10-day window with less than 5 mm in total.
3. **The rains have set in**: those 30 days bring at least half the place's mean 30-day June–September rain. This
   separates the monsoon from a burst of pre-monsoon nor'wester storms, which otherwise pass conditions 1 and 2.
4. **Dynamic cyclonic filter**: distinguishes pre-monsoon tropical cyclones/depressions from the true ITCZ monsoon trough.
   If a single cloudburst day delivers ≥ 70% of the 5-day total followed by post-cyclonic subsidence (< 15 mm in 10 days),
   it is flagged as an episodic depression rather than the persistent synoptic monsoon flow, preventing premature false onsets.

A year whose onset falls on 15 May itself had the rains set in by then; the page shows it as "15 May or earlier"
(a triangle on the chart), and those years are counted, not dated. The rule belongs to the agronomic family of
Stern, Dennett & Garbutt (1981) and Moron & Robertson (2014): a wet spell calibrated to the local climate, with a
false-start check. The remaining thresholds (5 days, 3 rainy days, 10-day dry window, 5 mm, 30 days, one half) are
our choices.

### The check against Bangladesh Meteorological Department records (22 October 2026)

`scripts/onset/compare_bmd.mjs` writes `src/data/radar/onset_validation.json`. Han et al. (2024, *Climatic Change* 177:77)
worked out mean onset dates from BMD station rain, 1981–2017, with a simple rule (from 15 May, the first day that
starts three days with at least 50 mm). The same rule on IMERG at the nearest app upazila, 2001–2017, tests the
satellite record against the gauges; this page's rule is set beside both, with what farmers there call the usual
start (Stiller-Reeve et al. 2015, as quoted by Han et al.).

| BMD station (app upazila, distance) | BMD, 50 mm in 3 days | IMERG, same rule | This page's rule | Farmers' usual start |
| --- | --- | --- | --- | --- |
| Rajshahi (Godagari, ~30 km) | 4 June | 10 June (+6 days) | 31 May (−4 days) | 10 June |
| Barishal (Bakerganj, ~20 km) | 27 May | 25 May (−2 days) | 29 May (+2 days) | 31 May |
| Dinajpur (Gangachara, ~70 km) | 27 May | 22 May (−5 days) | 22 May (−5 days) | – |

All within a week, against year-to-year swings of 10–15 days. Until this check the search opened on **15 April**:
that version landed 7 days early at Rajshahi and 17 days early near Rangpur, on pre-monsoon storms, so the search
now opens on 15 May, as in Han et al. BMD's official "monsoon arrival" (about 2 June on the south-eastern coast and
15 June in the north-west, Ahmed & Karmakar 1993, 19 stations 1958–1987) tracks the monsoon winds rather than the
planting rains, and falls later, as expected. Sylhet and Chattogram, which Han et al. leave out as high-rainfall
regions, are not checked; in Sylhet the rains often set in before 15 May (4 of 25 years at Gowainghat).

### Results (IMERG, 2001–2025)

| | Usual onset (median) | Range | Years by 15 May | Trend (Sen's slope, Mann–Kendall) |
| --- | --- | --- | --- | --- |
| Godagari (Barind, drought-prone) | 30 May | 17 May – 20 July | 0 | +5.9 days a decade, p = 0.06: not significant |
| Dhamrai (low-lying, flood-prone) | 21 May | by 15 May – 7 June | 3 | −1.5 days a decade, p = 0.36 |
| Sitakunda | 26 May | by 15 May – 23 June | 3 | 0, p = 1.0 |
| Dacope | 24 May | by 15 May – 6 July | 1 | −0.9, p = 0.74 |
| Bakerganj | 26 May | 16 May – 25 June | 1 | −0.3, p = 0.93 |
| Gangachara | 22 May | by 15 May – 10 June | 7 | +0.9, p = 0.48 |
| Gowainghat | 21 May | by 15 May – 14 June | 4 | −1.8, p = 0.36 |

The rains set in about a week later in Godagari than on the low land, and vary a lot from year to year
(Godagari's 2022 onset, 20 July, is the 2022 monsoon failure in north-west Bangladesh). On IMERG no upazila shows a
significant shift over 25 years. The same rule on NASA POWER's own rain (a reanalysis product) gives earlier onsets
with several significant earlier trends; the two products disagree, so the app shows IMERG as the main series and
POWER alongside, and makes no trend claim. Years counted as "by 15 May" enter the trend at 15 May, which damps it.

The same rule runs on every Ropon Radar upazila's IMERG rain (`row.onset` in `src/data/radar/aman_radar.json`; after a rule
change, `node scripts/build/refresh_radar_onset.mjs` re-works it from the cached rain without re-running the radar).
Outputs for the app's seven upazilas: `src/data/radar/onset_<upazila>.json`. Rebuild with
`node scripts/onset/onset.mjs godagari dhamrai sitakunda dacope bakerganj gangachara gowainghat`; tests in
`src/radar/onset.test.js`.

## IMERG straight from NASA GES DISC (optional cross-check)

The onset uses IMERG as served by the NASA POWER API. To confirm it against the archive itself (GPM IMERG Final Run
daily, `GPM_3IMERGDF` version 07, DOI 10.5067/GPM/IMERGDF/DAY/07):

1. Create a free NASA Earthdata login at https://urs.earthdata.nasa.gov and approve the application
   "NASA GESDISC DATA ARCHIVE" (Profile → Applications → Authorized Apps).
2. Optionally save the login in `~/.netrc`: `machine urs.earthdata.nasa.gov login <user> password <password>`.
3. `python3 -m pip install earthaccess xarray h5netcdf`
4. `python3 scripts/onset/fetch_imerg_gesdisc.py` (a few hours; it resumes from `.cache/imerg/`).
5. `node scripts/onset/onset.mjs godagari dhamrai` adds the GES DISC series as a third source in the onset files.

This has not been run yet (no Earthdata credentials in this environment).

## The officer's brief and the next Aman calendar

The top of the radar page (`src/components/charts/RadarBrief.jsx`, logic in `src/radar/brief.js`, tested in
`src/radar/onset.test.js`) puts three things in one card: this season against the upazila's own usual transplanting
day, the weather hazard that came most often in 2001–2025 (the same hazard years as the hazard section below), and
when the rains usually set in, with their trend. It then lays out the next Aman around the usual transplanting day T
measured by radar: seedbeds T − 30 to T − 25 days (25–30-day seedlings), transplanting T ± 7 days, flowering T + 55
to T + 85, harvest T + 95 to T + 120 (by variety, as in the harvest outlook). The same dates and the first fix for the
most frequent hazard become a message of at most three Bangla SMS parts, which the officer can send to the upazila's
farmers; it reaches each farmer's app like any other officer message.

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

`npm run data:aman` rebuilds the radar and IMERG rain (`src/data/radar/aman_radar.json`, `public/aman/`; resumes from
`.cache/data/aman`). `npm run fetch:power -- --upazila <id> --lat … --lon …` refreshes a climate file, then rerun the
onset pipeline. The method and its limits are at the top of `scripts/build/build_aman_radar.mjs`.
