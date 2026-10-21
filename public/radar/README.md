# Ropon Radar · রোপণ

**NASA sees the rain and the planting.**

Prototype for NASA Space Apps Challenge 2026 — *Field Shift: Adapting Farms with NASA Data* (challenge name as given in the brief; verify before submitting).

Focus district: **Rangpur, Bangladesh** (8 upazilas).

> **Everything you see is illustrative demo data.** All numbers are computed in the browser from seeded synthetic data (mulberry32, seed 42). The real NASA pipeline is in progress.

---

## Quick Start

```bash
python serve.py
```

`serve.py` is the standard Python file server with caching turned off, so the browser always loads the latest code. Plain `python -m http.server 8000` also works, but press **Ctrl+Shift+R** after any code changes.

### URLs

| URL | Mode |
|---|---|
| `http://localhost:8000/` | **Scene mode** — fixed 1920×1080 stage for recording |
| `http://localhost:8000/?mode=explore` | **Explore mode** — mouse-driven, editable SMS |
| `http://localhost:8000/lowband.html` | **Text-only** low-bandwidth view (no D3, no web fonts) |
| `http://localhost:8000/tests/stats.test.html` | In-browser tests (33 checks, expected values from SciPy) |

Everything runs offline: D3 v7 is vendored in `/vendor`, fonts are self-hosted in `/fonts`. Nothing is fetched from the network at runtime.

---

## The Idea

1. **Radar sees through clouds**: Monsoon clouds hide rice fields from optical satellites. Radar doesn't. When a paddy is flooded and transplanted, Sentinel-1 VH backscatter drops sharply, then rises as the rice grows.
2. **Usable-rain onset**: 25 years of rainfall give each year's onset—the first day from 1 June with ≥ 20 mm over 3 days and no dry spell longer than 7 days in the next 30.
3. **Adaptation gap**: transplant day-of-year − onset day-of-year, per upazila and season. Is planting keeping pace with the shifting rain?

For a detailed explanation of the pages, technical workflow, data provenance, and limitations, see [the project and data overview](docs/PROJECT_OVERVIEW.md).

---

## Scene Mode Guide

Use the **Back / 01–08 / Next** buttons at the bottom left, or the keyboard. Click once on the page after opening so arrow keys reach it.

### Keyboard Controls

| Key | Action |
|---|---|
| → / ← (PageDown/PageUp, Space) | next / previous scene |
| C | toggle captions |
| H | hide UI chrome (scene counter, key hints, progress bar) |
| ↑ / ↓ | change selected upazila (scenes 4, 5, 8) |
| R | replay the current scene |
| E | switch to explore mode |

### Scenes

Jump directly with `#s1` … `#s8`. For a clean recording: open at 1920×1080 (F11 fullscreen), press **H**, start from `#s1`.

| # | Scene | Duration | Timed beats |
|---|---|---|---|
| 1 | Under cloud | 15 s | clouds drift over the real district outline |
| 2 | Radar sees through | 20 s | cloud dissolves into radar grain (0–2.6 s); VH curve draws (2.4 s); annotations (≈ 6 s) |
| 3 | Where they planted | 20 s | map fills west → east; season slider auto-steps 2017 → 2025 from 3.6 s |
| 4 | The rain moved | 25 s | points, Sen line, CI band; hero number at 2.4 s |
| 5 | The adaptation gap | 20 s | click an upazila or press ↑/↓ to change the strip |
| 6 | Field replay | 20 s | switches to the NISAR tab at 12.5 s |
| 7 | The advice | 15 s | English SMS types from 1.6 s, Bangla from 6.2 s |
| 8 | Evidence | 15 s | drawer at 0.9 s; closing title at 9.8 s |

`prefers-reduced-motion` is respected: final states render without motion.

---

## What Is Synthetic (All of It) — `js/data.js`

- **Geometry is real**: upazila boundaries from geoBoundaries gbOpen BGD ADM3 (release 9469f09, BBS / OCHA ROAP, CC BY 3.0 IGO), filtered to Rangpur by point-in-polygon against the ADM2 district.
- **Daily rain** (1 Jun – 30 Sep, 2001–2025, per upazila): a latent onset with a modest built-in trend that differs by upazila (drawn in −1…+6 days/decade), a shared regional year anomaly, false low rain years.
- **Sentinel-1-like VH** (2017–2025): 36 rice-mask pixels per upazila per season; 6-day revisit (12-day in 2022–2024, when only Sentinel-1A flew). Baseline ≈ −17 dB, dip −23 to −25 dB at transplant.
- **Three test pixels**: flood without rice recovery, double dip, and heavy missing data.
- **NISAR 2026** (L-band HV, 12-day), labelled **PROVISIONAL**, with no acquisitions 27 Jul – 10 Aug 2026.

Generator inputs (trend, base onset, typical gap) are never displayed as results.

---

## What Is Computed — Every Number Traces to a Function

| Number | Function |
|---|---|
| Usable-rain onset | `detect.js · detectOnset()` |
| Transplant date (+ uncertainty, alternates, reason when not detected) | `detect.js · detectTransplant()` |
| Mann-Kendall S, Var(S) with tie correction, Z, p | `stats.js · mannKendall()` |
| Sen's slope + 95% CI (Gilbert 1987) | `stats.js · senSlope()` |
| Benjamini-Hochberg, q = 0.10 | `stats.js · benjaminiHochberg()` |
| Median / IQR | `stats.js · median(), quantile()` |
| Gap | transplant DOY − onset DOY (`data.js`) |
| SMS length (GSM-7 / UCS-2) | `i18n.js · smsInfo()` |

**Transplant rule**: Candidate minima between 15 Jun and 15 Sep are tried from deepest to shallowest. The first that is (a) ≥ 3 dB below the median of observations 60 → 12 days earlier and (b) followed by a rise ≥ 1 dB within 40 days is reported; otherwise "not detected."

---

## Design Decisions to Review

- **District**: Rangpur (8 upazilas) — chosen as an example; the prep script supports any district.
- **"On track" band**: 15–30 days from onset to transplanting (assumed seedbed age). Diverging colours: water blue (early) / neutral / brick (late).
- **Confidence levels**:
  - *Moderate*: onset trend survives Benjamini-Hochberg correction and gaps exist in ≥ 8 of 9 seasons.
  - *Low*: otherwise. *High* would need ≥ 15 radar seasons (not yet reachable).
- **SMS**: English targets one GSM-7 SMS (≤ 160 chars). Bangla needs UCS-2 (70 per single SMS, 67 per part); full Bangla advice is shown as a 2-part message.
- **Accessibility**: `--muted` darkened from #6B6B63 to #5F5F58 to pass WCAG AA on neutral fills.

---

## Planned Real Datasets (Not Used in This Demo)

| Dataset | Use |
|---|---|
| NASA GPM IMERG | daily rainfall 2001–2025 → usable-rain onset |
| NASA POWER | rainfall cross-check, agro-climate context |
| Sentinel-1 GRD (C-band VH) | transplant detection 2017–2025 |
| NISAR GCOV (L-band) | 2026 season (provisional) |
| OPERA DSWx-S1 | surface-water extent to separate flood from paddy (resolves the "double dip" case) |

---

## File Structure

```
index.html  lowband.html
css/tokens.css  css/main.css
js/prng.js  js/data.js  js/stats.js  js/detect.js  js/map.js  js/charts.js  js/scenes.js  js/i18n.js
i18n/en.json  i18n/bn.json
data/rangpur_upazilas.geojson  data/rangpur_district.geojson  data/prepare_geo.py
vendor/d3.v7.min.js   fonts/*.woff2
tests/stats.test.html
```

---

## Licences

- **Code**: Apache-2.0 (see `LICENSE`)
- **D3**: ISC
- **Fonts** (Fraunces, IBM Plex Sans/Mono, Noto Sans Bengali): SIL Open Font License 1.1, via Fontsource
- **Boundaries**: geoBoundaries, CC BY 3.0 IGO
