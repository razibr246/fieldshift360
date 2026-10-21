# Python helpers (optional)

The app does not need Python. These scripts write the app's data files directly.

| Script | Status | What it does |
| --- | --- | --- |
| `build_soil.py` | **Current** | Writes `src/data/soil_godagari.json` from a CSV. Use `soil_srdi_template.csv` to enter real SRDI Godagari values (`--status REAL`); without it the file stays marked as sample data. |
| `fetch_soilgrids.py` | Current | Downloads ISRIC SoilGrids values for each union into `soilgrids_check.csv` to cross-check the soil file. Does not overwrite it. |

    pip install -r scripts/python/requirements.txt
    python scripts/python/build_soil.py

The superseded climate helpers (`fetch_power.py`, `fetch_imerg.py`, `make_placeholder_climate.py`) were removed; use
`npm run fetch:power`, which also brings GPM IMERG through NASA POWER without a login.
