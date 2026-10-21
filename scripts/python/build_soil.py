"""
Build src/data/soil_godagari.json from a CSV.

  python scripts/python/build_soil.py                                   # DEMO values (soil_demo.csv)
  python scripts/python/build_soil.py --csv scripts/python/soil_srdi_template.csv --status REAL \
        --source "SRDI Upazila Nirdeshika, Godagari (year)"

Allowed levels for n/p/k: very low, low, medium, optimum, high.  drainage: poor, imperfect, good.
"""
import argparse, csv, json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "src" / "data" / "soil_godagari.json"
LEVELS = {"very low", "low", "medium", "optimum", "high"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(HERE / "soil_demo.csv"))
    ap.add_argument("--status", default="DEMO", choices=["DEMO", "REAL"])
    ap.add_argument("--source", default="Representative values for Barind / Ganges floodplain soils (DEMO)")
    a = ap.parse_args()
    unions = {}
    with open(a.csv, newline="") as f:
        for r in csv.DictReader(f):
            if not r["ph"]:
                raise SystemExit(f"missing pH for {r['union']} - fill the CSV first")
            for k in ("n_level", "p_level", "k_level"):
                if r[k].strip().lower() not in LEVELS:
                    raise SystemExit(f"{r['union']}: {k} must be one of {sorted(LEVELS)}")
            unions[r["union"]] = {
                "aez": r["aez"], "ph": float(r["ph"]), "om_pct": float(r["om_pct"]),
                "n_level": r["n_level"].strip().lower(), "p_level": r["p_level"].strip().lower(),
                "k_level": r["k_level"].strip().lower(), "texture": r["texture"],
                "drainage": r["drainage"].strip().lower(),
                "calcareous": r["calcareous"].strip().lower() in ("yes", "true", "1"),
                "note": r.get("source_note", ""),
            }
    out = {"provenance": {"status": a.status, "dataset": a.source,
                          "retrieved": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                          "notes": "Union-level soil context, not a field soil test."},
           "unions": unions}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"wrote {OUT} status={a.status} unions={list(unions)}")


if __name__ == "__main__":
    main()
