"""Daily GPM IMERG Final Run rain (GPM_3IMERGDF v07) at the Godagari and Dhamrai points, straight from NASA GES DISC.

The app's onset dates already use IMERG, as served by the NASA POWER API (IMERG_PRECTOT). This script fetches the
same rain from the archive itself, so the two can be compared and the POWER route confirmed. It needs a free NASA
Earthdata login (https://urs.earthdata.nasa.gov) with the "NASA GESDISC DATA ARCHIVE" application approved.

    python3 -m pip install earthaccess xarray h5netcdf      # once
    python3 scripts/onset/fetch_imerg_gesdisc.py            # asks for the Earthdata login, or reads ~/.netrc
    node scripts/onset/onset.mjs godagari dhamrai           # adds the GES DISC series as a third source

Writes scripts/onset/imerg_gesdisc_<upazila>.json: { provenance, start, prec } with one value per day (mm/day).
About 9,500 daily files per point; only the one grid cell is read from each file (HDF5 range requests), so it
takes a few hours on a normal connection. It resumes: days already fetched are kept in .cache/imerg/.
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

POINTS = {'godagari': (24.4667, 88.3306), 'dhamrai': (23.93, 90.14)}
START, END = date(2000, 10, 1), date(2026, 6, 30)  # IMERG Final arrives about 3.5 months after the month ends
ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.cache' / 'imerg'


def main():
    import earthaccess
    import xarray as xr

    earthaccess.login(strategy='netrc' if (Path.home() / '.netrc').exists() else 'interactive')
    CACHE.mkdir(parents=True, exist_ok=True)
    have = {u: json.loads((CACHE / f'{u}.json').read_text()) if (CACHE / f'{u}.json').exists() else {} for u in POINTS}
    lats = [p[0] for p in POINTS.values()]
    lons = [p[1] for p in POINTS.values()]
    results = earthaccess.search_data(short_name='GPM_3IMERGDF', version='07', temporal=(START.isoformat(), END.isoformat()),
                                      bounding_box=(min(lons) - 0.1, min(lats) - 0.1, max(lons) + 0.1, max(lats) + 0.1))
    print(f'{len(results)} daily files')
    todo = [r for r in results if any(day_of(r) not in have[u] for u in POINTS)]
    for k, f in enumerate(earthaccess.open(todo)):
        ds = xr.open_dataset(f, engine='h5netcdf')
        d = str(ds['time'].values[0])[:10]
        for u, (lat, lon) in POINTS.items():
            have[u][d] = round(float(ds['precipitation'].sel(lat=lat, lon=lon, method='nearest').values.squeeze()), 2)
        if k % 100 == 0:
            for u in POINTS:
                (CACHE / f'{u}.json').write_text(json.dumps(have[u]))
            print(f'  {k + 1}/{len(todo)}  {d}')
    for u, (lat, lon) in POINTS.items():
        (CACHE / f'{u}.json').write_text(json.dumps(have[u]))
        days = [(START + timedelta(n)).isoformat() for n in range((END - START).days + 1)]
        out = {
            'provenance': {
                'status': 'REAL', 'dataset': 'NASA GPM IMERG Final Run daily, GPM_3IMERGDF version 07 (GES DISC)',
                'doi': '10.5067/GPM/IMERGDF/DAY/07', 'url': 'https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDF_07/summary',
                'variable': 'precipitation (mm/day), nearest 0.1° cell', 'lat': lat, 'lon': lon,
                'start': START.isoformat(), 'end': END.isoformat(), 'retrieved': date.today().isoformat(),
            },
            'start': START.isoformat(),
            'prec': [have[u].get(d) for d in days],
        }
        (Path(__file__).parent / f'imerg_gesdisc_{u}.json').write_text(json.dumps(out))
        print(f'wrote imerg_gesdisc_{u}.json ({sum(v is not None for v in out["prec"])} days)')


def day_of(granule):
    name = granule['umm']['GranuleUR']  # ...3IMERG.20240101-S000000-E235959.V07B.nc4
    s = name.split('3IMERG.')[1][:8]
    return f'{s[:4]}-{s[4:6]}-{s[6:]}'


if __name__ == '__main__':
    sys.exit(main())
