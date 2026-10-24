"""Upazila outline -> src/data/geo/<upazila>_boundary.json (Godagari by default; `dhamrai` for Dhamrai)

Source: geoBoundaries gbOpen BGD ADM3 (Bangladesh Bureau of Statistics / OCHA ROAP, 2020, CC BY 3.0 IGO).
The full-detail ring (about 6,000 points) is simplified with Douglas-Peucker at 0.00008 degrees (about 8 m), which
keeps the area unchanged (493 km2 drawn, against 475.26 km2 official; the gap is mostly the Padma bank and chars).
    python3 scripts/build/build_godagari_boundary.py            # Godagari
    python3 scripts/build/build_godagari_boundary.py dhamrai    # Dhamrai (also savar, keraniganj, dohar, nawabganj)
"""
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import GEO, geoboundaries, inside, ring_area_m2, simplify_ring, write_json

TOL = 0.00008  # degrees, about 8 m

# Official areas: Godagari from the upazila portal and Wikipedia; the Dhaka upazilas from Banglapedia.
# `district` picks the right outline where an upazila name repeats across districts (Nawabganj).
UPAZILAS = {
    'godagari': {'shape': 'Godagari', 'name': {'bn': 'গোদাগাড়ী', 'en': 'Godagari'}, 'areaOfficialKm2': 475.26, 'areaWikipediaKm2': 472.13},
    'dhamrai': {'shape': 'Dhamrai', 'name': {'bn': 'ধামরাই', 'en': 'Dhamrai'}, 'areaOfficialKm2': 307.41},
    'savar': {'shape': 'Savar', 'district': 'Dhaka', 'name': {'bn': 'সাভার', 'en': 'Savar'}, 'areaOfficialKm2': 280.11},
    'keraniganj': {'shape': 'Keraniganj', 'district': 'Dhaka', 'name': {'bn': 'কেরানীগঞ্জ', 'en': 'Keraniganj'}, 'areaOfficialKm2': 166.87},
    'dohar': {'shape': 'Dohar', 'district': 'Dhaka', 'name': {'bn': 'দোহার', 'en': 'Dohar'}, 'areaOfficialKm2': 161.49},
    'nawabganj': {'shape': 'Nawabganj', 'district': 'Dhaka', 'name': {'bn': 'নবাবগঞ্জ', 'en': 'Nawabganj'}, 'areaOfficialKm2': 244.80},
    # The five division story upazilas (areas from Banglapedia).
    'sitakunda': {'shape': 'Sitakunda', 'name': {'bn': 'সীতাকুণ্ড', 'en': 'Sitakunda'}, 'areaOfficialKm2': 483.96},
    'dacope': {'shape': 'Dacope', 'name': {'bn': 'দাকোপ', 'en': 'Dacope'}, 'areaOfficialKm2': 991.56},
    'bakerganj': {'shape': 'Bakerganj', 'name': {'bn': 'বাকেরগঞ্জ', 'en': 'Bakerganj'}, 'areaOfficialKm2': 411.36},
    'gangachara': {'shape': 'Gangachara', 'name': {'bn': 'গঙ্গাচড়া', 'en': 'Gangachara'}, 'areaOfficialKm2': 269.67},
    'gowainghat': {'shape': 'Gowainghat', 'name': {'bn': 'গোয়াইনঘাট', 'en': 'Gowainghat'}, 'areaOfficialKm2': 481.12},
}


def main(key='godagari'):
    up = UPAZILAS[key]
    fc = geoboundaries('ADM3', simplified=False)
    found = [x for x in fc['features'] if x['properties']['shapeName'] == up['shape']]
    if up.get('district'):
        d = next(x for x in geoboundaries('ADM2', simplified=True)['features'] if x['properties']['shapeName'] == up['district'])['geometry']
        d = d['coordinates'][0] if d['type'] == 'Polygon' else max((p[0] for p in d['coordinates']), key=len)
        mid = lambda r: (sum(q[0] for q in r) / len(r), sum(q[1] for q in r) / len(r))
        found = [x for x in found if inside(*mid(x['geometry']['coordinates'][0]), d)]
    f = found[0]
    g = f['geometry']
    # A river upazila can come as several polygons (islands, chars); the mainland is the largest.
    ring = g['coordinates'][0] if g['type'] == 'Polygon' else max((p[0] for p in g['coordinates']), key=len)
    s = simplify_ring(ring, TOL)
    write_json(GEO / f'{key}_boundary.json', {
        'provenance': {
            'status': 'REAL', 'dataset': 'geoBoundaries gbOpen BGD ADM3 (upazila), source: Bangladesh Bureau of Statistics (BBS) / OCHA ROAP, 2020',
            'url': 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM3/geoBoundaries-BGD-ADM3.geojson',
            'license': 'CC BY 3.0 IGO', 'simplified': f'Douglas-Peucker, {TOL} degrees (about 8 m), {len(ring)} -> {len(s)} points',
            'retrieved': date.today().isoformat(),
        },
        'name': up['name'],
        **{k: v for k, v in up.items() if k.startswith('area')}, 'areaDrawnKm2': round(ring_area_m2(s) / 1e6, 1),
        'ring': [[round(y, 5), round(x, 5)] for x, y in s],  # [lat, lon] for Leaflet
    })


if __name__ == '__main__':
    main(*sys.argv[1:2])
