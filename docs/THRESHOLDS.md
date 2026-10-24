# Thresholds and rules for agronomic review

Every threshold and rule the app uses to judge a crop, a date or a risk, with its basis. Most are **starting values**
from general agronomy, chosen to be reasonable and stated openly; none has yet been reviewed by an agriculture
officer. Please check each line, correct it where local experience or a BARI/BRRI/DAE guide says otherwise, and sign
the last column. The values live in `src/engine/crops.js` (crop rules), `src/engine/decision.js` (decision),
`src/engine/glut.js` (harvest glut), `scripts/build/build_aman_radar.mjs` (radar) and `scripts/onset/onset.mjs`
(rain onset).

"Consistent with" means the value agrees with the named source's general guidance; the exact number (a day count, a
window) is still our choice.

## Weather rules per crop (the 25-season backtest)

A season counts as unsafe for a crop and planting date if its rule is broken in that season's NASA POWER weather.
Days are counted from planting or transplanting.

| Crop | Rule | Window (days after planting) | Basis | Reviewed by |
| --- | --- | --- | --- | --- |
| Boro rice | 3 or more days with Tmax ≥ 35 °C during flowering cause empty grains | 75–95 | Consistent with IRRI: spikelet sterility above 35 °C at anthesis (Yoshida 1981, *Fundamentals of Rice Crop Science*) | |
| Tomato | One day with ≥ 50 mm rain can rot the seedlings | 0–15 | Assumption | |
| Tomato | 5 or more days with Tmax ≥ 32 °C while fruit sets make flowers drop | 40–95 | Consistent with Sato, Peet & Thomas (2000), *Plant Cell Environ.* 23: fruit set fails under chronic mild heat (around 32 °C days) | |
| Wheat | 5 or more days with Tmax ≥ 32 °C while grain fills shrivel the grain | 85–115 | Consistent with Farooq et al. (2011), *Crit. Rev. Plant Sci.* 30, on terminal heat stress in wheat | |
| Lentil | One day with ≥ 40 mm rain at flowering knocks the flowers off | 55–85 | Assumption | |
| Lentil | 4 or more rainy days (≥ 5 mm) at flowering bring Stemphylium blight | 55–85 | Assumption; humid, wet weather at flowering favours Stemphylium blight (to confirm against BARI pulse guidance) | |
| Mustard | One day with ≥ 30 mm rain at flowering damages flowers and pods | 35–55 | Assumption | |
| Mung bean (rotation) | 3 or more days with Tmax ≥ 40 °C at flowering make flowers drop | 30–50 | Assumption | |
| Mung bean (rotation) | One day with ≥ 40 mm rain while pods ripen rots them | 50–65 | Assumption | |
| Sesame (rotation) | One day with ≥ 50 mm rain waterlogs the seedlings | 0–30 | Assumption | |
| Sesame (rotation) | One day with ≥ 60 mm rain while capsules ripen lodges the crop and shatters seed | 70–90 | Assumption | |
| Jute (rotation) | Less than 50 mm rain in total means it must be irrigated | 0–30 | Assumption | |
| Aus rice (rotation) | 3 or more days with Tmax ≥ 35 °C at flowering cause empty grains | 70–90 | As Boro (Yoshida 1981) | |

## Planting dates, duration and soil

The usual date is tested, and so are two weeks earlier and two weeks later (the planting band). A sowing day that
has already gone is not offered; when all three have gone for a crop, its latest stays in the list marked late and
ranks after every crop that can still be sown on time.

| Crop | Usual planting / transplanting | Days to harvest | Water need | Soil pH suited | Basis | Reviewed by |
| --- | --- | --- | --- | --- | --- | --- |
| Boro rice | 15 January (transplant) | 115 | High | 5.0–7.0 | Date consistent with BRRI's mid-January to early February transplanting; the rest assumption | |
| Tomato | 15 November (transplant) | 80 | Medium | 6.0–7.0 | Date consistent with BARI's October–November transplanting; the rest assumption | |
| Wheat | 20 November | 115 | Low–medium | 6.0–7.5 | Date consistent with the 15–30 November optimum sowing (BARI / Wheat Research Centre); the rest assumption | |
| Lentil | 5 November | 105 | Low | 6.0–8.0 | Date consistent with BARI's late October – mid November sowing; the rest assumption | |
| Mustard | 1 November | 85 | Low | 5.5–7.5 | Date consistent with BARI's late October – November sowing; the rest assumption | |
| Planting band | Usual date, −14 days, +14 days | — | — | — | Assumption (design choice) | |
| Well-drained crops (tomato, wheat, lentil, mustard) | Penalised on soil whose drainage is "poor" | — | — | — | Drainage class derived from the SoilGrids WRB soil group (`scripts/build/build_soil.py`); assumption | |

Yields are FAOSTAT 2024 national averages (real data), not thresholds.

## The keep / adjust / shift decision

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Score weights (climate, water, soil, profit, rotation, glut, earliness) | 0.30, 0.20, 0.15, 0.15, 0.10, 0.10, 0; the farmer's priorities multiply them, then they are rescaled to sum to 1 | Assumption (design choice) | |
| SHIFT | Another crop's best option scores at least 15 points above the usual crop's best | Assumption | |
| ADJUST | The usual crop at another date scores at least 10 points above its usual date | Assumption | |
| KEEP with caution | The usual crop at its usual date scores under 60 | Assumption | |

## Harvest glut (price-drop risk)

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Price-dip months | Months whose DAM farm-gate price is usually 10% or more below normal | Real data (DAM price history in `price_seasons.json`); the 10% cut-off is an assumption | |
| High-supply week | Planned harvest in a week above 1.3 × the normal weekly supply | Assumption | |
| Week risk | High: high supply in a dip month. Medium: high supply, or above-normal supply in a dip month | Assumption | |
| Plan risk | High if at least half the harvest falls in High weeks; Medium if at least 20% does, or half falls in High or Medium weeks | Assumption | |
| Normal crop shares (boro, tomato, wheat, lentil, mustard) | 0.35, 0.35, 0.10, 0.08, 0.12 | Assumption, to be replaced by DAE upazila crop statistics | |
| Tomato planting slots | 25 Oct – 7 Nov, 8–21 Nov, 22 Nov – 5 Dec, 6–19 Dec | Assumption | |

## Rain onset and Aman planting (radar)

| Rule | Value | Basis | Reviewed by |
| --- | --- | --- | --- |
| Rain onset | First day from 15 May starting a 5-day spell of at least the place's mean June–September 5-day rain (3+ rainy days), no 10-day window under 5 mm in the next 30 days, and at least half a monsoon month's rain in those 30 days | In the family of Stern et al. (1981) and Moron & Robertson (2014); start day from Han et al. (2024). Checked against BMD station-based onsets on 22 Oct 2026: within a week at Rajshahi, Barishal and Dinajpur (docs/RADAR.md) | |
| Transplanting detected | Sentinel-1 VH falls at least 3 dB, then rises at least 4 dB within 45 days | Assumption, in line with published Sentinel-1 rice-mapping methods | |
| Upazila date | Given only when at least 6 of 36 sample fields show transplanting | Assumption | |
| On time | Within ±7 days of the upazila's 2017–2025 median (about one radar revisit) | Assumption | |
| Drought: monsoon SPI | −1 or below = moderately to extremely dry | WMO SPI classes (McKee et al. 1993; WMO SPI User Guide 2012) | |
| Drought: rain before transplanting | Under half of normal in the 30 days before | Assumption | |
| Drought: dry spell while tillering | 15 or more consecutive days under 1 mm | Assumption | |
| Heat at flowering | Days at 35 °C or more | As Boro (Yoshida 1981) | |
| Heavy and very heavy rain | 44 mm or more, and 89 mm or more, in a day (June–September) | Bangladesh Meteorological Department rainfall classes | |
| Cold at flowering | Days with mean temperature below 20 °C | Consistent with BRRI's cold-injury guidance for rice at booting and flowering | |

## What a reviewer should send back

For each line: agree, or the corrected value with its source (a BARI/BRRI/DAE guide, a crop calendar, local
experience), and your name and post in "Reviewed by". Corrections go into the files named at the top; the tests
(`npm test`) show if a change breaks anything.
