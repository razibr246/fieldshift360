"""
OPTIONAL cross-check: ISRIC SoilGrids 2.0 (250 m global MODEL estimate) for each demo union centre.
It is a modelled estimate, not a field test. Official values should come from SRDI
(see soil_srdi_template.csv). This script only prints a comparison table and writes
scripts/python/soilgrids_check.csv; it does not overwrite the app's soil file.

  pip install requests
  python scripts/python/fetch_soilgrids.py
"""
import csv
from pathlib import Path

import requests

API = "https://rest.isric.org/soilgrids/v2.0/properties/query"
# Approximate demo positions (replace with real union centroids if you have them)
UNIONS = {
    "Deopara": (24.445, 88.430),
    "Pakri": (24.545, 88.285),
    "Rishikul": (24.560, 88.380),
    "Char Ashariadaha": (24.395, 88.275),
}
OUT = Path(__file__).resolve().parent / "soilgrids_check.csv"


def main() -> None:
    rows = []
    for name, (lat, lon) in UNIONS.items():
        q = [("lon", lon), ("lat", lat), ("value", "mean"), ("depth", "0-5cm"), ("depth", "5-15cm")]
        q += [("property", p) for p in ("phh2o", "soc", "nitrogen", "clay", "sand")]
        js = requests.get(API, params=q, timeout=60).json()
        vals = {}
        for layer in js["properties"]["layers"]:
            d = layer["unit_measure"]["d_factor"]
            means = [x["values"]["mean"] for x in layer["depths"] if x["values"]["mean"] is not None]
            vals[layer["name"]] = round(sum(means) / len(means) / d, 2) if means else None
        om = round(vals["soc"] / 10 * 1.724, 2) if vals.get("soc") is not None else None  # g/kg -> %; OM ≈ SOC×1.724
        row = {"union": name, "ph": vals.get("phh2o"), "soc_g_kg": vals.get("soc"), "om_pct_est": om,
               "n_g_kg": vals.get("nitrogen"), "clay_pct": vals.get("clay"), "sand_pct": vals.get("sand")}
        rows.append(row)
        print(row)
    with OUT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
