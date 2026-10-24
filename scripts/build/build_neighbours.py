"""Neighbouring countries -> src/data/abroad/<country>.json (+ src/assets/fields/<field>-{tc.jpg,ndvi.png})

One sample farm and six farming zones for each of India, Pakistan, Nepal, Bhutan and Myanmar, all on real data:
  * Daily weather 2001 to about six days ago from ERA5 (ECMWF reanalysis, through the Open-Meteo archive API, no key,
    models=era5). Pure ERA5 on purpose: the API's default "best match" blends in ECMWF IFS from 2017, which in the
    mountains steps the rain record down by a third (Punakha: about 3,600 mm a year before 2017, 2,000 after).
    Tmax, Tmin, rain and FAO-56 reference evapotranspiration, with temperature taken to the point's own height
    (90 m DEM). Every "against normal" comparison uses the same 25 years, 2001-2025.
  * NASA/JAXA GPM IMERG daily rain (through NASA POWER, UTC days), 2001 to its latest day (about a month behind):
    the satellite rain record and the rain of each past disaster, shown next to ERA5.
  * Why not NASA POWER's own PRECTOTCORR here: at these cells it has breaks that are not climate (Chauk, Myanmar:
    about 50 mm a year before 2008 and 500-700 mm after; IMERG and ERA5 both give 800-1,100 mm in every year).
    POWER's MERRA-2 temperature and soil wetness are driven by the same corrected rain, so they jump with it. The
    yearly POWER totals are still written out ('powerRain') so the page can show the check.
  * NASA FIRMS active fires, VIIRS on Suomi NPP, NOAA-20 and NOAA-21, last 7 days, South Asia file (no key);
    detections within 10 km and 50 km of each point, and per day.
  * Copernicus Sentinel-2 L2A over each sample field since June 2025, the same reading as build_field_watch.py
    (Microsoft Planetary Computer, no key), with the latest clear picture.
Raw answers are cached in .cache/data/neighbours/.
    python3 scripts/build/build_neighbours.py
"""
import csv
import io
import json
import math
import sys
import hashlib
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, SRC_DATA, fetch, ring_area_m2, simplify_ring, write_json
import zipfile
import build_field_watch as fw

POWER = 'https://power.larc.nasa.gov/api/temporal/daily/point'
ERA5 = 'https://archive-api.open-meteo.com/v1/archive'
START = '2001-01-01'
BASE = (2001, 2025)  # the normal
NB = CACHE / 'neighbours'
OUT = SRC_DATA / 'abroad'
FIRMS = {s: f'https://firms.modaps.eosdis.nasa.gov/data/active_fire/{p}_South_Asia_7d.csv' for s, p in [
    ('Suomi NPP', 'suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2'), ('NOAA-20', 'noaa-20-viirs-c2/csv/J1_VIIRS_C2'), ('NOAA-21', 'noaa-21-viirs-c2/csv/J2_VIIRS_C2')]}

# Country -> sample farm (a cropland point on the Esri/IO 10 m land-cover map, next to a GeoNames village) and six
# zones that together show the country's main farming problems. Story text lives in src/data/abroad.js.
COUNTRIES = {
    'india': {
        'farm': {'id': 'IN-PB-0101', 'lat': 30.26, 'lon': 75.80, 'area_dec': 500},
        'zones': {
            'punjab': (30.24, 75.84), 'vidarbha': (20.39, 78.12), 'barmer': (25.75, 71.39),
            'dhemaji': (27.48, 94.58), 'puri': (19.81, 85.83), 'thanjavur': (10.79, 79.14)},
    },
    'pakistan': {
        'farm': {'id': 'PK-SD-0101', 'lat': 26.80, 'lon': 67.72, 'area_dec': 400},
        'zones': {
            'dadu': (26.73, 67.78), 'multan': (30.20, 71.47), 'tharparkar': (24.74, 69.80),
            'swat': (34.77, 72.36), 'naseerabad': (28.55, 68.22), 'chitral': (35.85, 71.79)},
    },
    'nepal': {
        'farm': {'id': 'NP-KL-0101', 'lat': 28.56, 'lon': 81.10, 'area_dec': 150},
        'zones': {
            'kailali': (28.69, 80.93), 'jhapa': (26.55, 87.90), 'chitwan': (27.68, 84.43),
            'bhaktapur': (27.67, 85.43), 'jumla': (29.27, 82.18), 'mustang': (28.78, 83.72)},
    },
    'bhutan': {
        'farm': {'id': 'BT-PN-0101', 'lat': 27.5208, 'lon': 89.8808, 'area_dec': 80},
        'zones': {
            'punakha': (27.58, 89.86), 'paro': (27.43, 89.41), 'bumthang': (27.55, 90.75),
            'samtse': (26.90, 89.10), 'trashigang': (27.33, 91.55), 'sarpang': (26.87, 90.48)},
    },
    'myanmar': {
        'farm': {'id': 'MM-MG-0101', 'lat': 20.93, 'lon': 94.864, 'area_dec': 300},
        'zones': {
            'magway': (20.93, 94.86), 'bogale': (16.29, 95.40), 'bago': (17.34, 96.48),
            'taunggyi': (20.78, 97.04), 'sittwe': (20.15, 92.90), 'monywa': (22.11, 95.13)},
    },
}


def get(url, name, tries=6, text=False, wait=10):
    path = NB / name
    if path.exists():
        return path.read_text() if text else json.loads(path.read_text())
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'fieldshift360-data-build'}), timeout=300) as r:
                body = r.read().decode()
            NB.mkdir(parents=True, exist_ok=True)
            path.write_text(body)
            return body if text else json.loads(body)
        except Exception as e:  # POWER answers 429/5xx when busy
            print(f'    retry {i + 1} {name}: {e}')
            time.sleep(wait * (i + 1))
    raise SystemExit(f'no answer for {name}')


FULL = 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration'
LIGHT = 'temperature_2m_max,precipitation_sum'  # zones: what the national view compares, at half the API cost


ERA5_BLOCKED = [False]


def era5(key, lat, lon, end, light=False):
    """Pure ERA5 when it can be had; if the API refuses today (its daily limit), the copy cached from an earlier
    "best match" request is used instead and the point says so (source 'best_match')."""
    q = urllib.parse.urlencode({'latitude': lat, 'longitude': lon, 'start_date': START, 'end_date': end, 'timezone': 'auto', 'models': 'era5', 'daily': LIGHT if light else FULL})
    name = f"era5m{'L' if light else ''}_{key}_{lat}_{lon}_{end}.json"
    source = 'era5'
    try:
        if ERA5_BLOCKED[0] and not (NB / name).exists():
            raise SystemExit('ERA5 refused earlier in this run')
        j = get(f'{ERA5}?{q}', name, tries=3, wait=20)
    except SystemExit:
        ERA5_BLOCKED[0] = True  # the daily limit: do not ask again in this run
        old = sorted(NB.glob(f'era5m*_{key}_{lat}_{lon}_*.json')) or sorted(p for p in NB.glob(f'era5*_{key}_{lat}_{lon}_*.json') if not p.name.startswith('era5m'))
        if not old:
            raise
        j, source = json.loads(old[-1].read_text()), 'era5' if old[-1].name.startswith('era5m') else 'best_match'
        print(f'    {key}: using cached {old[-1].name}')
    d = j['daily']
    n = len(d['time'])
    col = lambda k: d.get(k) or [None] * n
    rows = [(t, tx, tn, pr, et) for t, tx, tn, pr, et in zip(d['time'], col('temperature_2m_max'), col('temperature_2m_min'), col('precipitation_sum'), col('et0_fao_evapotranspiration'))
            if tx is not None and pr is not None]
    return rows, j.get('elevation'), j.get('timezone'), source


def broken(rows, imerg):
    """True when the ERA5 rain record moves unlike the satellite's between 2001-2007 and 2016-2025 (a factor over
    1.35 apart): a change in the record, not the climate. Such points take their normal from 2017-2025 only."""
    def yearly(get_year_total):
        e = [get_year_total(y) for y in range(2001, 2008)]
        l = [get_year_total(y) for y in range(2016, 2026)]
        e, l = [x for x in e if x], [x for x in l if x]
        return (sum(l) / len(l)) / (sum(e) / len(e)) if e and l else 1
    tot_e = lambda y: sum(r[3] for r in rows if r[0].startswith(str(y))) or None
    tot_i = lambda y: sum(v for d, v in imerg.items() if d.startswith(str(y))) or None
    r1, r2 = yearly(tot_e), yearly(tot_i)
    return max(r1 / r2, r2 / r1) > 1.35


def power_series(key, lat, lon, end, param, utc=False):
    """One NASA POWER daily parameter as {date: value} (fill values dropped)."""
    q = {'parameters': param, 'community': 'AG', 'latitude': lat, 'longitude': lon, 'start': START.replace('-', ''), 'end': end.replace('-', ''), 'format': 'JSON'}
    if utc:
        q['time-standard'] = 'UTC'
    j = get(f'{POWER}?{urllib.parse.urlencode(q)}', f'power_{param}_{key}_{lat}_{lon}_{end}.json')
    fill = j['header'].get('fill_value', -999)
    v = j['properties']['parameter'][param]
    return {f'{k[:4]}-{k[4:6]}-{k[6:]}': x for k, x in v.items() if x is not None and x != fill and x > -998}


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def r1(x, dp=1):
    return None if x is None else round(x, dp)


def tot(v, i):
    """Sum of column i, or None where the column was not fetched (zones skip Tmin and ET0)."""
    return None if any(x[i] is None for x in v) else sum(x[i] for x in v)


def summarise(rows, imerg, prect, base=None):
    BASE = base or globals()['BASE']
    """ERA5 rows of (date, tmax, tmin, rain, et0) + IMERG and POWER rain {date: mm} -> normals, months, years, checks."""
    last = rows[-1][0]
    by_month = {}
    for r in rows:
        by_month.setdefault(r[0][:7], []).append(r)
    in_base = lambda y: BASE[0] <= y <= BASE[1]
    im_month = {}
    for d, x in imerg.items():
        im_month[d[:7]] = im_month.get(d[:7], 0) + x
    normals = []
    for m in range(1, 13):
        ms = [v for k, v in by_month.items() if in_base(int(k[:4])) and int(k[5:]) == m]
        ims = [im_month[k] for k in im_month if in_base(int(k[:4])) and int(k[5:]) == m]
        normals.append({'m': m, 'tmax': r1(mean([mean([x[1] for x in v]) for v in ms])), 'tmin': r1(mean([mean([x[2] for x in v]) for v in ms])),
                        'rain': r1(mean([sum(x[3] for x in v) for v in ms]), 0), 'rainImerg': r1(mean(ims), 0),
                        'et0': r1(mean([tot(v, 4) for v in ms]), 0), 'hot': r1(mean([max(x[1] for x in v) for v in ms]))})
    months = []
    for k in sorted(by_month)[-24:]:
        v = by_month[k]
        full_imerg = all(f'{k}-{i:02d}' in imerg for i in range(1, 28))
        months.append({'ym': k, 'days': len(v), 'tmax': r1(mean([x[1] for x in v])), 'tmin': r1(mean([x[2] for x in v])),
                       'rain': r1(sum(x[3] for x in v), 0), 'rainImerg': r1(im_month.get(k), 0) if full_imerg else None,
                       'et0': r1(tot(v, 4), 0), 'hot': r1(max(x[1] for x in v))})
    years = []
    for y in range(int(START[:4]), int(last[:4])):
        v = [r for r in rows if r[0].startswith(str(y))]
        if len(v) < 360:
            continue
        mon = [r for r in v if '06' <= r[0][5:7] <= '09']
        im = [x for d, x in imerg.items() if d.startswith(str(y))]
        pw = [x for d, x in prect.items() if d.startswith(str(y))]
        years.append({'y': y, 'rain': r1(sum(r[3] for r in v), 0), 'rainImerg': r1(sum(im), 0) if len(im) >= 360 else None,
                      'powerRain': r1(sum(pw), 0) if len(pw) >= 360 else None, 'monsoon': r1(sum(r[3] for r in mon), 0),
                      'tmax': r1(mean([r[1] for r in v])), 'tmin': r1(mean([r[2] for r in v])), 'hot40': sum(r[1] >= 40 for r in v),
                      'hot35': sum(r[1] >= 35 for r in v), 'wet1': r1(max(r[3] for r in v), 0), 'frost': sum(r[2] is not None and r[2] <= 0 for r in v)})
    recent = [{'d': r[0], 'tmax': r1(r[1]), 'tmin': r1(r[2]), 'rain': r1(r[3]), 'et0': r1(r[4])} for r in rows[-120:]]
    idx = {r[0]: r for r in rows}

    def window(days):
        """Rain and rain-minus-ET0 over the last `days` days against the same calendar days of 2001-2025."""
        end = date.fromisoformat(last)
        span = [(end - timedelta(days=i)).strftime('%m-%d') for i in range(days)]
        now = sum(r[3] for r in rows[-days:])
        light = rows[-1][4] is None
        bal = None if light else sum(r[3] - r[4] for r in rows[-days:])
        per, bals = [], []
        for y in range(BASE[0], BASE[1] + 1):
            v = [idx.get(f'{y}-{md}') for md in span]
            v = [x for x in v if x]
            if len(v) >= days - 2:
                per.append(sum(x[3] for x in v))
                bals.append(None if light else sum(x[3] - x[4] for x in v))
        normal = mean(per)
        return {'days': days, 'rain': r1(now, 0), 'normal': r1(normal, 0), 'pct': r1(100 * now / normal, 0) if normal else None,
                'wetterThan': sum(x < now for x in per), 'of': len(per), 'balance': r1(bal, 0), 'balanceNormal': r1(mean(bals), 0) if not light else None,
                'tmax': r1(mean([r[1] for r in rows[-days:]])),
                'tmaxNormal': r1(mean([mean([idx[f'{y}-{md}'][1] for md in span if f'{y}-{md}' in idx]) for y in range(BASE[0], BASE[1] + 1)]))}

    this_year = int(last[:4])
    mon_now = [r for r in rows if r[0].startswith(str(this_year)) and '06' <= r[0][5:7] <= '09']
    mon_norm = mean([y['monsoon'] for y in years if in_base(y['y'])])
    wet3 = max(((rows[i][0], rows[i][3] + rows[i + 1][3] + rows[i + 2][3]) for i in range(len(rows) - 2)), key=lambda x: x[1])
    hot = max(rows, key=lambda r: r[1])
    return {
        'last': last, 'imergLast': max(imerg) if imerg else None, 'normals': normals, 'months': months, 'years': years, 'recent': recent,
        'rain30': window(30), 'rain90': window(90),
        'monsoon': {'year': this_year, 'rain': r1(sum(r[3] for r in mon_now), 0), 'normal': r1(mon_norm, 0)} if mon_now else None,
        'records': {'wet3': {'d': wet3[0], 'rain': r1(wet3[1], 0)}, 'hot': {'d': hot[0], 'tmax': r1(hot[1])}},
    }


def event(rows, imerg, start, end, BASE=BASE):
    """A past window: rain from the satellite (IMERG) and from ERA5, and mean and highest Tmax, each against the
    same calendar days of 2001-2025."""
    idx = {r[0]: r for r in rows}
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    days = [s + timedelta(days=i) for i in range((e - s).days + 1)]
    got = [idx[d.isoformat()] for d in days if d.isoformat() in idx]
    same = lambda y: [d.replace(year=y).isoformat() for d in days]
    norm_rain = [sum(idx[k][3] for k in same(y) if k in idx) for y in range(BASE[0], BASE[1] + 1)]
    norm_im = [sum(imerg[k] for k in same(y) if k in imerg) for y in range(BASE[0], BASE[1] + 1)]
    norm_tx = [mean([idx[k][1] for k in same(y) if k in idx]) for y in range(BASE[0], BASE[1] + 1)]
    im = [imerg.get(d.isoformat()) for d in days]
    return {'start': start, 'end': end, 'rain': r1(sum(x[3] for x in got), 0), 'rainNormal': r1(mean(norm_rain), 0),
            'rainImerg': r1(sum(x for x in im if x is not None), 0) if all(x is not None for x in im) else None, 'rainImergNormal': r1(mean(norm_im), 0),
            'tmax': r1(mean([x[1] for x in got])), 'tmaxNormal': r1(mean(norm_tx)), 'hot': r1(max(x[1] for x in got)),
            'daily': [{'d': x[0], 'rain': r1(x[3]), 'rainImerg': r1(imerg.get(x[0])), 'tmax': r1(x[1])} for x in got]}


def climate_shift(rows):
    """The home page's four crop-season measures, defined exactly as TM_METRICS in src/engine/climate.js, for harvest
    years 2001-2025 (the season of year y runs from the winter before): cold nights (1 Dec-31 Jan, Tmin <= 10 C),
    warm late-winter days (15 Feb-31 Mar, Tmax >= 32 C), very hot days (1 Mar-30 Apr, Tmax >= 35 C), and rain
    from 1 Nov to 28 Feb. A season whose window is not fully covered by the record is left empty."""
    idx = {r[0]: r for r in rows}
    def window(a, b):
        s, e = date.fromisoformat(a), date.fromisoformat(b)
        out = [idx.get((s + timedelta(days=i)).isoformat()) for i in range((e - s).days + 1)]
        return None if any(x is None for x in out) else out
    defs = {
        'coldNights': lambda y: (f'{y - 1}-12-01', f'{y}-01-31', lambda w: sum(r[2] is not None and r[2] <= 10 for r in w)),
        'lateHeat': lambda y: (f'{y}-02-15', f'{y}-03-31', lambda w: sum(r[1] >= 32 for r in w)),
        'hotMarApr': lambda y: (f'{y}-03-01', f'{y}-04-30', lambda w: sum(r[1] >= 35 for r in w)),
        'rabiRain': lambda y: (f'{y - 1}-11-01', f'{y}-02-28', lambda w: round(sum(r[3] for r in w))),
    }
    out = {}
    for k, f in defs.items():
        series = []
        for y in range(2001, 2026):
            a, b, fn = f(y)
            w = window(a, b)
            series.append({'season': y, 'value': fn(w) if w else None})
        avg = lambda ys: mean([x['value'] for x in series if x['season'] in ys and x['value'] is not None])
        then, now = avg(range(2001, 2013)), avg(range(2013, 2026))
        out[k] = {'series': series, 'then': r1(then), 'now': r1(now), 'change': r1(now - then) if then is not None and now is not None else None}
    return out


# Event windows each country's story leans on (all read from the farm's own POWER cell).
EVENTS = {
    'india': {'heat2022': ('2022-03-01', '2022-03-31'), 'wheatSow2025': ('2025-10-25', '2025-11-20')},
    'pakistan': {'flood2022': ('2022-08-01', '2022-08-31'), 'monsoon2022': ('2022-07-01', '2022-09-30')},
    'nepal': {'rain2021': ('2021-10-17', '2021-10-20'), 'rain2024': ('2024-09-26', '2024-09-29')},
    'bhutan': {'rain2025': ('2025-10-03', '2025-10-06'), 'harvest2025': ('2025-10-15', '2025-11-15')},
    'myanmar': {'heat2024': ('2024-04-01', '2024-04-30'), 'yagi2024': ('2024-09-09', '2024-09-14')},
}


def firms():
    """All VIIRS detections in the South Asia 7-day files: (lat, lon, date, satellite, confidence, frp)."""
    out, got = [], {}
    stamp = date.today().isoformat()
    for sat, url in FIRMS.items():
        txt = get(url, f'firms_{sat.replace(" ", "")}_{stamp}.csv', text=True)
        rows = list(csv.DictReader(io.StringIO(txt)))
        got[sat] = len(rows)
        out += [(float(r['latitude']), float(r['longitude']), r['acq_date'], sat, r['confidence'], float(r['frp'])) for r in rows]
    return out, got


def km(a, b):
    r = math.pi / 180
    h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def fires_near(fires, lat, lon):
    near = [f for f in fires if abs(f[0] - lat) < 0.6 and abs(f[1] - lon) < 0.7]
    in50 = [f for f in near if km((lat, lon), f) <= 50]
    in10 = [f for f in in50 if km((lat, lon), f) <= 10]
    by_day = {}
    for f in in50:
        by_day[f[2]] = by_day.get(f[2], 0) + 1
    return {'km10': len(in10), 'km50': len(in50), 'byDay': [{'d': d, 'n': n} for d, n in sorted(by_day.items())],
            'nearest': r1(min((km((lat, lon), f) for f in in50), default=None)),
            'points': [[round(f[0], 4), round(f[1], 4), f[2]] for f in in50][:400]}


ISO = {'india': 'IND', 'pakistan': 'PAK', 'nepal': 'NPL', 'bhutan': 'BTN', 'myanmar': 'MMR'}


def gb_file(cc, lvl):
    """The simplified geoBoundaries layer, from the cache when there (the API rate-limits), else via its index."""
    path = NB / f'gb_{ISO[cc]}_{lvl}.geojson'
    if path.exists():
        return path.read_text()
    meta = get(f'https://www.geoboundaries.org/api/current/gbOpen/{ISO[cc]}/{lvl}/', f'gb_{ISO[cc]}_{lvl}_meta.json')
    return get(meta['simplifiedGeometryGeoJSON'], path.name, text=True)


def inside(x, y, ring):
    c, j = False, len(ring) - 1
    for i in range(len(ring)):
        (xi, yi), (xj, yj) = ring[i], ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def fires_by_province(fires, cc):
    """Detections per first-level unit (state, province, region), geoBoundaries gbOpen ADM1 (simplified), used only
    to count; the outlines are not drawn."""
    fc = json.loads(gb_file(cc, 'ADM1'))
    units = []
    for f in fc['features']:
        g = f['geometry']
        rings = [g['coordinates'][0]] if g['type'] == 'Polygon' else [p[0] for p in g['coordinates']]
        xs = [q[0] for r in rings for q in r]
        ys = [q[1] for r in rings for q in r]
        units.append((f['properties']['shapeName'], rings, (min(xs), min(ys), max(xs), max(ys))))
    count = {}
    for la, lo, *_ in fires:
        for name, rings, (x0, y0, x1, y1) in units:
            if x0 <= lo <= x1 and y0 <= la <= y1 and any(inside(lo, la, r) for r in rings):
                count[name] = count.get(name, 0) + 1
                break
    return [{'name': k, 'n': v} for k, v in sorted(count.items(), key=lambda kv: -kv[1])]


# The local officer's own area, the size of a Bangladesh upazila: the geoBoundaries unit that holds the farm
# (India tehsil, Pakistan taluka, Nepal palika: ADM3; Bhutan gewog and Myanmar township-level unit: ADM2).
AREA_LEVEL = {'india': 'ADM3', 'pakistan': 'ADM3', 'nepal': 'ADM3', 'bhutan': 'ADM2', 'myanmar': 'ADM2'}
GN = {'india': 'IN', 'pakistan': 'PK', 'nepal': 'NP', 'bhutan': 'BT', 'myanmar': 'MM'}


# Where UN OCHA's common operational boundaries (from the national statistics offices, on HDX) go finer or are more
# exact than geoBoundaries, they are used: Myanmar's townships (MIMU), Bhutan's gewogs (NSB).
OCHA = {'myanmar': ('mmr', 'admin3', 'adm3_name', 'cod-ab-mmr'), 'bhutan': ('btn', 'admin2', 'adm2_name', 'cod-ab-btn')}


def ocha_file(cc):
    iso, lvl, _, pkg = OCHA[cc]
    path = NB / f'cod_{iso}_{lvl}.geojson'
    if not path.exists():
        res = get(f'https://data.humdata.org/api/3/action/package_show?id={pkg}', f'{pkg}_meta.json')['result']['resources']
        url = next(r['url'] for r in res if r['name'].endswith('geojson.zip'))
        z = fetch(url, f'{pkg}.geojson.zip')
        path.write_bytes(zipfile.ZipFile(z).read(f'{iso}_{lvl}.geojson'))
    return path.read_text()


def officer_area(cc, farm, fires):
    lvl = AREA_LEVEL[cc]
    if cc in OCHA:
        fc = json.loads(ocha_file(cc))
        for f in fc['features']:
            f['properties']['shapeName'] = f['properties'][OCHA[cc][2]]
        lvl = f'OCHA {OCHA[cc][1]}'
    else:
        fc = json.loads(gb_file(cc, lvl))
    hit = None
    for f in fc['features']:
        g = f['geometry']
        if not g or g['type'] not in ('Polygon', 'MultiPolygon'):
            continue
        rings = [g['coordinates'][0]] if g['type'] == 'Polygon' else [q[0] for q in g['coordinates']]
        rings = [[pt[:2] for pt in r] for r in rings]
        for r in rings:
            if inside(farm['lon'], farm['lat'], r):
                hit = (f['properties']['shapeName'], r)
                break
        if hit:
            break
    if not hit:
        return None
    name, ring = hit
    ring = simplify_ring(ring, 0.0008)
    xs, ys = [q[0] for q in ring], [q[1] for q in ring]
    # GeoNames populated places inside the area: the villages the officer serves.
    dump = fetch(f'https://download.geonames.org/export/dump/{GN[cc]}.zip', f'geonames_{GN[cc]}.zip')
    places = []
    for line in zipfile.ZipFile(dump).read(f'{GN[cc]}.txt').decode('utf-8').splitlines():
        c = line.split('\t')
        if c[6] != 'P':
            continue
        la, lo = float(c[4]), float(c[5])
        if min(ys) <= la <= max(ys) and min(xs) <= lo <= max(xs) and inside(lo, la, ring):
            places.append({'n': c[1], 'lat': round(la, 4), 'lon': round(lo, 4), 'pop': int(c[14] or 0), 'town': c[7] in ('PPLA', 'PPLA2', 'PPLA3', 'PPLC')})
    places.sort(key=lambda p: (-p['pop'], not p['town'], p['n']))
    seen = set()
    places = [p for p in places if not (p['n'].lower() in seen or seen.add(p['n'].lower()))]  # one dot per name
    inner = [f for f in fires if min(ys) <= f[0] <= max(ys) and min(xs) <= f[1] <= max(xs) and inside(f[1], f[0], ring)]
    by_day = {}
    for f in inner:
        by_day[f[2]] = by_day.get(f[2], 0) + 1
    return {'name': name, 'level': lvl, 'areaKm2': round(ring_area_m2(ring) / 1e6), 'ring': [[round(y, 4), round(x, 4)] for x, y in ring],
            'places': places[:400], 'placeCount': len(places),
            'fires': {'n': len(inner), 'byDay': [{'d': d, 'n': n} for d, n in sorted(by_day.items())], 'points': [[round(f[0], 4), round(f[1], 4), f[2]] for f in inner][:400]}}


def field(p, end):
    """Sentinel-2 passes over the sample field, read exactly as build_field_watch.py reads the Bangladesh fields."""
    items = fw.passes(p, end)
    with ThreadPoolExecutor(6) as ex:
        stats = list(ex.map(lambda it: fw.field_stats(p, it), items))
    series = []
    for it, st in zip(items, stats):
        if 'error' in st or st['clear']['mean'] < 0.9 or fw.hazy(st):
            continue
        series.append({'d': it['date'], 'ndvi': round(st['ndvi']['mean'], 3), 'ndmi': round(st['ndmi']['mean'], 3),
                       'ndwi': round(st['ndwi']['mean'], 3), 'water': round(st['water']['mean'], 3), '_item': it})
    series.sort(key=lambda o: o['d'])
    box = fw.pictures(p, series[-1]['_item']) if series else None
    for o in series:
        o.pop('_item')
    print(f"  {p['id']}: {len(items)} passes, {len(series)} clear, latest {series[-1]['d'] if series else '-'}")
    return {'passes': len(items), 'series': series, 'box': box}


def main():
    end = (date.today() - timedelta(days=1)).isoformat()
    end_era5 = (date.today() - timedelta(days=6)).isoformat()  # ERA5 runs about five days behind
    fires, fire_counts = firms()
    print(f'FIRMS: {fire_counts}')
    OUT.mkdir(parents=True, exist_ok=True)
    for cc, c in COUNTRIES.items():
        pts = [('farm', c['farm']['lat'], c['farm']['lon'])] + [(k, *v) for k, v in c['zones'].items()]
        with ThreadPoolExecutor(1) as ex:
            got = list(ex.map(lambda p: era5(f'{cc}_{p[0]}', p[1], p[2], end_era5, light=p[0] != 'farm'), pts))
            ims = list(ex.map(lambda p: power_series(f'{cc}_{p[0]}', p[1], p[2], end, 'IMERG_PRECTOT', utc=True), pts))
            pws = list(ex.map(lambda p: power_series(f'{cc}_{p[0]}', p[1], p[2], end, 'PRECTOTCORR'), pts))
        out = {}
        tz = None
        for (key, lat, lon), (rows, h, tz0, src), im, pw in zip(pts, got, ims, pws):
            tz = tz or tz0
            base = (2017, 2025) if broken(rows, im) else BASE
            s = summarise(rows, im, pw, base)
            o = {'lat': lat, 'lon': lon, 'elev': h, 'source': src, 'base': list(base), **s, 'fires': fires_near(fires, lat, lon)}
            if key == 'farm':
                o['events'] = {k: event(rows, im, *w, BASE=base) for k, w in EVENTS[cc].items()}
                o['shift'] = climate_shift(rows)
            out[key] = o
            print(f"  {cc} {key}: ERA5 ({src}, normal {base[0]}-{base[1]}) {len(rows)} days to {s['last']}, IMERG to {s['imergLast']}, height {h} m, "
                  f"30-day rain {s['rain30']['rain']} mm vs {s['rain30']['normal']} ({s['rain30']['pct']}%), fires 50 km {o['fires']['km50']}")
        farm = {**c['farm'], **field(c['farm'], date.today().isoformat())}
        write_json(OUT / f'{cc}.json', {
            'provenance': {
                'status': 'REAL', 'built': date.today().isoformat(),
                'tz': tz, 'normal': f'{BASE[0]}-{BASE[1]}',
                'era5': 'ERA5 reanalysis (Copernicus Climate Change Service / ECMWF), daily, via archive-api.open-meteo.com (models=era5); temperature at the point height (90 m DEM)',
                'imerg': 'NASA/JAXA GPM IMERG daily rain via NASA POWER (power.larc.nasa.gov, IMERG_PRECTOT, UTC days)',
                'powerCheck': 'NASA POWER PRECTOTCORR yearly totals, kept only to show the record break (see build_neighbours.py)',
                'firms': f'NASA FIRMS VIIRS 375 m active fires, South Asia 7-day files ({", ".join(FIRMS)}), read {date.today().isoformat()}',
                'sentinel': 'Copernicus Sentinel-2 L2A via Microsoft Planetary Computer, read as in build_field_watch.py',
                'area': 'Officer area: the unit holding the farm, from UN OCHA COD-AB on HDX (Myanmar townships, Bhutan gewogs) or geoBoundaries gbOpen (simplified) elsewhere; villages: GeoNames populated places (CC BY 4.0)',
            },
            'points': out, 'field': farm, 'firesByProvince': fires_by_province(fires, cc), 'area': officer_area(cc, c['farm'], fires),
            'firesDays': sorted({f[2] for f in fires}),
        })


if __name__ == '__main__':
    main()
