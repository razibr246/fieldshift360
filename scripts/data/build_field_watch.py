"""Satellite watch for every registered field -> src/data/field_watch.json + src/assets/fields/<parcel>-{tc.jpg,ndvi.png}

Source: Copernicus Sentinel-2 Level-2A (ESA, 10 m, a pass every 5 days), read through Microsoft Planetary Computer's
public STAC and data APIs (no key). For each field in src/data/parcels.json:
  1. every Sentinel-2 pass over the field since June 2025 (scene cloud under 80%), one per day;
  2. per pass, statistics over the field's own square (its registered size): the share of clear pixels from the
     scene-classification layer (SCL 4 vegetation, 5 bare soil, 6 water), the share of open water, and the mean of
     NDVI (green cover), NDMI (crop and soil moisture) and NDWI (standing water). Passes where under 90% of the field
     is clear are dropped, and so are hazy ones (blue reflectance at least 0.10 and 10% above red: thin cloud the
     classification missed). Bands are taken back to reflectance first: processing baseline 04.00 and later add 1000;
  3. a true-colour and an NDVI picture of the latest clear pass, around the field.
Raw API answers are cached in .cache/data/fieldwatch/, so a second run only fetches new passes.
    python3 scripts/data/build_field_watch.py                 # up to today
    python3 scripts/data/build_field_watch.py --end 2026-10-18
"""
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, REPO, SRC_DATA, write_json

STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
DATA = 'https://planetarycomputer.microsoft.com/api/data/v1/item'
START = '2025-06-01'
OUT_IMG = REPO / 'src' / 'assets' / 'fields'
FW_CACHE = CACHE / 'fieldwatch'
# One request per pass: clear share, water share, NDVI, NDMI, NDWI (offset-corrected reflectance).
EXPR = ';'.join([
    'where((SCL==4)|(SCL==5)|(SCL==6),1,0)', 'where(SCL==6,1,0)',
    '(B08-B04)/(B08+B04-2000)', '(B08-B11)/(B08+B11-2000)', '(B03-B08)/(B03+B08-2000)', '(B02-1000)/10000', '(B04-1000)/10000',
])
EXPR_OLD = EXPR.replace('-2000)', ')').replace('(B02-1000)', 'B02').replace('(B04-1000)', 'B04')  # passes before processing baseline 04.00 have no offset
KEYS = ['clear', 'water', 'ndvi', 'ndmi', 'ndwi', 'blue', 'red']


def http(url, body=None, tries=6):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                         headers={'Content-Type': 'application/json', 'User-Agent': 'fieldshift360-data-build'})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < tries - 1:
                time.sleep(2 + 3 * i)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if i < tries - 1:
                time.sleep(2 + 3 * i)
                continue
            raise


def square(lat, lon, area_dec):
    """Same square as plotSquare() in src/engine/world.js, as a GeoJSON [lon, lat] ring."""
    side = math.sqrt(area_dec * 40.4686)
    dlat = side / 2 / 111320
    dlon = side / 2 / (111320 * math.cos(math.radians(lat)))
    return [[lon - dlon, lat - dlat], [lon + dlon, lat - dlat], [lon + dlon, lat + dlat], [lon - dlon, lat + dlat], [lon - dlon, lat - dlat]]


def passes(p, end):
    """Sentinel-2 L2A items over the field, newest first, one per day (the two UTM tiles of a pass are the same photo)."""
    body = {'collections': ['sentinel-2-l2a'], 'intersects': {'type': 'Point', 'coordinates': [p['lon'], p['lat']]},
            'datetime': f'{START}T00:00:00Z/{end}T23:59:59Z', 'limit': 200, 'query': {'eo:cloud_cover': {'lt': 80}},
            'sortby': [{'field': 'datetime', 'direction': 'desc'}]}
    items, seen = [], set()
    while body:
        j = json.loads(http(STAC, body))
        for f in j['features']:
            d = f['properties']['datetime'][:10]
            if d in seen:
                continue
            seen.add(d)
            items.append({'id': f['id'], 'date': d, 'baseline': f['properties'].get('s2:processing_baseline', '05.00'), 'cloud': f['properties']['eo:cloud_cover']})
        nxt = next((l for l in j.get('links', []) if l.get('rel') == 'next'), None)
        body = nxt.get('body') if nxt and nxt.get('method') == 'POST' else None
    return items


def field_stats(p, item):
    path = FW_CACHE / 'v3' / f"{p['id']}_{p['lat']}_{p['lon']}_{p['area_dec']}" / f"{item['id']}.json"  # a moved or resized field is fetched again
    if path.exists():
        return json.loads(path.read_text())
    expr = EXPR if float(item['baseline']) >= 4 else EXPR_OLD
    q = urllib.parse.urlencode({'collection': 'sentinel-2-l2a', 'item': item['id'], 'expression': expr, 'asset_as_band': 'true'})
    feat = {'type': 'Feature', 'properties': {}, 'geometry': {'type': 'Polygon', 'coordinates': [square(p['lat'], p['lon'], p['area_dec'])]}}
    try:
        st = json.loads(http(f'{DATA}/statistics?{q}', feat))['properties']['statistics']
        vals = list(st.values())
        out = {k: {'mean': v['mean'], 'std': v['std'], 'count': v['count']} for k, v in zip(KEYS, vals)}
    except urllib.error.HTTPError as e:
        out = {'error': e.code}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out))
    return out


def hazy(st):
    """Thin cloud and haze that the scene classification calls clear: blue reflectance high, and above red. Bare
    soil and fresh silt are bright too, but redder than blue; turbid flood water is about equal, so it stays."""
    b, r = st['blue']['mean'], st['red']['mean']
    return b >= 0.10 and b >= 1.1 * r


def picture_box(p):
    """A square around the field, at least 480 m across (the field sits in the middle)."""
    side = max(480, 6 * math.sqrt(p['area_dec'] * 40.4686))
    dlat = side / 2 / 111320
    dlon = side / 2 / (111320 * math.cos(math.radians(p['lat'])))
    return [round(p['lon'] - dlon, 6), round(p['lat'] - dlat, 6), round(p['lon'] + dlon, 6), round(p['lat'] + dlat, 6)]


def pictures(p, item):
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    w, s, e, n = picture_box(p)
    base = f'{DATA}/bbox/{w},{s},{e},{n}/320x320'
    common = {'collection': 'sentinel-2-l2a', 'item': item['id'], 'reproject': 'cubic'}  # smooth, not 10 m squares
    off = 2000 if float(item['baseline']) >= 4 else 0
    tc = urllib.parse.urlencode({**common, 'assets': 'visual', 'color_formula': 'sigmoidal RGB 4 0.35 saturation 1.15'})
    nd = urllib.parse.urlencode({**common, 'expression': f'(B08-B04)/(B08+B04-{off})', 'asset_as_band': 'true', 'rescale': '0,0.9', 'colormap_name': 'rdylgn'})
    (OUT_IMG / f"{p['id']}-tc.jpg").write_bytes(http(f'{base}.jpg?{tc}'))
    (OUT_IMG / f"{p['id']}-ndvi.png").write_bytes(http(f'{base}.png?{nd}'))
    return [[s, w], [n, e]]


def main():
    end = sys.argv[sys.argv.index('--end') + 1] if '--end' in sys.argv else date.today().isoformat()
    parcels = json.loads((SRC_DATA / 'parcels.json').read_text(encoding='utf-8'))['parcels']
    out = {}
    for p in parcels:
        items = passes(p, end)
        print(f"  {p['id']}: {len(items)} passes", flush=True)
        with ThreadPoolExecutor(6) as ex:
            stats = list(ex.map(lambda it: field_stats(p, it), items))
        series, hazy_n = [], 0
        for it, st in zip(items, stats):
            if 'error' in st or st['clear']['count'] < 4 or st['clear']['mean'] < 0.9:
                continue
            if hazy(st):
                hazy_n += 1
                continue
            series.append({'d': it['date'], 'ndvi': round(st['ndvi']['mean'], 3), 'sd': round(st['ndvi']['std'], 3),
                           'ndmi': round(st['ndmi']['mean'], 3), 'ndwi': round(st['ndwi']['mean'], 3), 'water': round(st['water']['mean'], 2),
                           'px': int(st['clear']['count']), 'item': it['id']})
        series.sort(key=lambda r: r['d'])
        latest = series[-1]
        scene = latest['item']
        bounds = pictures(p, {'id': scene, 'baseline': next(i['baseline'] for i in items if i['id'] == scene)})
        for r in series:
            del r['item']
        out[p['id']] = {'latest': latest['d'], 'scene': scene, 'passes': len(items), 'clear': len(series), 'hazy': hazy_n, 'picture': bounds, 'series': series}
        print(f"    {len(series)} clear ({hazy_n} hazy dropped), latest {latest['d']} NDVI {latest['ndvi']}", flush=True)
    write_json(SRC_DATA / 'field_watch.json', {
        'provenance': {'status': 'REAL', 'dataset': 'Copernicus Sentinel-2 Level-2A (ESA), 10 m', 'via': 'Microsoft Planetary Computer STAC and data API',
                       'license': 'Copernicus Sentinel data, free and open', 'window': [START, end], 'clear_min': 0.9,
                       'retrieved': date.today().isoformat(), 'script': 'scripts/data/build_field_watch.py'},
        'parcels': out,
    })


if __name__ == '__main__':
    main()
