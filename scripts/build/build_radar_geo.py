"""Light maps for the Ropon Radar upazilas that are not among the app's own: src/data/geo/radar/<id>.json

For every upazila in scripts/build/aman_upazilas.json that has no full src/data/geo/<id>_boundary.json, this writes the
upazila outline (geoBoundaries ADM3) and its union and municipality outlines (geoBoundaries ADM4), simplified to about
20 m, without the village points the app's own upazilas carry, so each file stays small and loads only when the radar
page opens that upazila. Union names are geoBoundaries' English names; a Bangla name is given only where the app
already has a checked spelling (build_godagari_places.BN), otherwise `bn` repeats the English and `bnChecked` is false.
Run before build_aman_radar.mjs (its frames and field-to-union lookup use these outlines).
    python3 scripts/build/build_radar_geo.py
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import GEO, geoboundaries, inside, ring_area_m2, simplify_ring, write_json
from build_godagari_places import BN, NOT_UNIONS, centroid

TOL = 0.0002  # degrees, about 20 m
HERE = Path(__file__).resolve().parent


def outer(g):
    return g['coordinates'][0] if g['type'] == 'Polygon' else max((p[0] for p in g['coordinates']), key=len)


def main():
    lst = json.loads((HERE / 'aman_upazilas.json').read_text(encoding='utf-8'))
    unique = set(lst.get('_unique', []))
    adm2 = geoboundaries('ADM2', simplified=True)['features']
    adm3 = geoboundaries('ADM3', simplified=False)['features']
    adm4 = geoboundaries('ADM4', simplified=True)['features']
    out_dir = GEO / 'radar'
    out_dir.mkdir(exist_ok=True)
    made = 0
    for did, d in lst.items():
        if did.startswith('_'):
            continue
        dring = outer(next(f for f in adm2 if f['properties']['shapeName'] == d['shape'])['geometry'])
        for up in d['upazilas']:
            if (GEO / f"{up['id']}_boundary.json").exists():
                continue  # one of the app's own upazilas: it has its full map already
            cands = [f for f in adm3 if f['properties']['shapeName'] == up['shape']]
            if up['shape'] not in unique:
                cands = [f for f in cands if inside(*centroid(outer(f['geometry'])), dring)]
            if not cands:
                raise SystemExit(f"{up['shape']} not found in {d['shape']}")
            ring = outer(cands[0]['geometry'])
            ring_s = simplify_ring(ring, TOL)
            unions = []
            for f in adm4:
                o = outer(f['geometry'])
                cx, cy = centroid(o)
                if not inside(cx, cy, ring):
                    continue
                n = re.sub(r' \((?:part|Part)\)$', '', f['properties']['shapeName'])
                if n in NOT_UNIONS or n == 'Paurashava' or n.startswith('Ward No'):
                    continue  # city corporation wards are not farm unions
                en = n.replace(' Paurashava', ' Municipality')
                unions.append({'en': en, 'bn': BN.get(n, en), 'bnChecked': n in BN, 'town': 'Paurashava' in n,
                               'label': [round(cy, 5), round(cx, 5)], 'ring': [[round(y, 5), round(x, 5)] for x, y in simplify_ring(o, TOL)]})
            write_json(out_dir / f"{up['id']}.json", {
                'provenance': {
                    'status': 'REAL',
                    'boundary': 'geoBoundaries gbOpen BGD ADM3 (BBS / OCHA ROAP 2020), CC BY 3.0 IGO',
                    'unions': 'geoBoundaries gbOpen BGD ADM4 (simplified), CC BY 3.0 IGO; Bangla union names only where checked (bnChecked)',
                    'simplified': f'Douglas-Peucker, {TOL} degrees (about 20 m)', 'retrieved': date.today().isoformat(),
                },
                'boundary': {'name': {'bn': up['bn'], 'en': up['en']}, 'areaDrawnKm2': round(ring_area_m2(ring_s) / 1e6, 1),
                             'ring': [[round(y, 5), round(x, 5)] for x, y in ring_s]},
                'places': {'unions': sorted(unions, key=lambda u: u['en']), 'places': []},
            })
            made += 1
            print(f"  {up['id']}: {len(unions)} unions, {len(ring_s)} outline points")
    print(f'wrote {made} radar maps to {out_dir}')


if __name__ == '__main__':
    main()
