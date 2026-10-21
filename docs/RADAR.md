# Ropan Radar: rain and Aman planting (real data)

`/officer/radar` now runs on **real satellite data** for every rural upazila of Rajshahi (9) and Dhaka (5) districts:
Sentinel-1 radar (Microsoft Planetary Computer, every pass 2017 to now), NASA/JAXA GPM IMERG rain (NASA POWER, 2001 to
now) and Sentinel-2 land cover for the sample fields. Refresh with `npm run data:aman` (resumes from `.cache/data/aman`);
the method, its limits and why the prototype's rain-onset rule is not used are at the top of
`scripts/data/build_aman_radar.mjs`. Outputs: `src/data/aman_radar.json` and `public/aman/`.

Every Dhaka district upazila (Dhamrai, Savar, Keraniganj, Dohar, Nawabganj) and Godagari can be opened in full: radar
frames, unions, sample fields by union and the hazard section. A Dhaka officer switches between them with the upazila
buttons under the header, the district map or the district table (`?u=savar`). Their extra inputs are
`src/data/geo/<upazila>_boundary.json` and `_places.json` (`build_godagari_boundary.py` / `build_godagari_places.py
<upazila>`) and `src/data/climate_<upazila>.json` (`npm run fetch:power -- --upazila <id> --lat … --lon …`, at the
upazila's interior point in `aman_radar.json`). The other eight Rajshahi upazilas stay summary-only until the same is
built for them and they are added to `FRAMES_FOR` / `UPAZILAS` in the two build scripts and to `src/data/geo/index.js`.

The section below describes the original synthetic Ropon Radar prototype, which still lives in `public/radar/` but is
no longer shown in the app.

# Ropon Radar inside FieldShift 360

`public/radar/` is Ropon Radar exactly as supplied (scenes, explore mode, low-bandwidth page, in-browser stats tests, Rangpur boundaries, README and overview), plus three small additions: a `district` parameter for boundaries, `?embed=1`, and responsive CSS.

* Standalone: `python public/radar/serve.py`, or after `npm run dev` open `/radar/index.html`.
* Inside the app: `/officer/radar` shows a native summary (planting gap, early / on track / late, onset trend and whether it survives the multiple-testing correction) computed by running the radar's own model in the browser, and a "Full radar" tab embedding explore mode.
* The Home page and the officer voice assistant use the same summary.

Everything the radar shows is **synthetic demo data**. The NASA IMERG, Sentinel-1 and NISAR pipeline is not built; see `public/radar/docs/PROJECT_OVERVIEW.md`. The 15-30 day "on track" band is a design assumption that needs local agronomic validation.

The site opened straight from disk (`build:single`, `file://`) cannot load the radar because browsers block module and data requests from local files. Use the dev server or any static host.

## Another district

```bash
python public/radar/data/prepare_geo.py Rajshahi     # needs internet (geoBoundaries on GitHub)
# then open  /radar/index.html?mode=explore&district=rajshahi
```
To make Godagari the default for the in-app summary, change `'rangpur'` in `src/radar/radarModel.js`.
