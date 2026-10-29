# Review log: crop rules and soil assumptions

Who reviewed which rule or assumption, when, and what changed. **No review has taken place yet.** Every crop rule
in `src/engine/crops.js` is a starting value from published research (sources in `docs/THRESHOLDS.md`), and the app
says "not yet reviewed" beside each one (`/science#rules`).

When a review happens, add a row here **and** the same entry to `src/data/reviews.js`, so the app shows it. Never
fill this in on anyone's behalf.

| Date | Reviewer (name, role, office) | What was reviewed | What changed | Commit |
| --- | --- | --- | --- | --- |
| | | | | |

## What a reviewer should check

0. **First: Boro's flowering-heat limit.** It is crossed in 12–13 of 13 recent seasons at Godagari and Dacope and
   11 of 13 at Dhamrai and Gangachara, yet Boro is grown there every year (`docs/EVIDENCE.md`). Should the limit be
   higher, longer, or tied to a heat-tolerant variety (e.g. BRRI dhan 89)? This one rule moves many recommendations.

1. **Crop weather rules** (`docs/THRESHOLDS.md`): each heat, cold and rain limit and the growth-stage window it
   applies to, for local varieties (e.g. BARI Masur-8, BINA Sarisha-9, BRRI dhan 89).
2. **Sowing windows**: the usual date and the ±2-week alternatives per crop and upazila.
3. **Soil assumptions**: pH and texture preferences per crop; whether SoilGrids' values look right for the union
   (compare with SRDI's union guide and any recent soil tests).
4. **Rotation rules**: which crops can follow which, turnaround days before T. Aman, residue (straw) practice.
5. **Fertiliser**: that SRDI doses are read correctly for the union's land type.

A review that finds a rule right is worth recording too ("no change").
