"""Soil and national yields for the five neighbouring-country farms -> src/data/soil/abroad_soil_yields.json

Soil: ISRIC SoilGrids 2.0 at each farm (top 30 cm, as build_soil.py does for Bangladesh), stepping out to the
nearest cell with a prediction if the point itself has none. Yields: FAOSTAT Production_Crops_Livestock bulk file
(Asia), each country's national yield, mean of 2020-2024, for the crops its rotation options use. Mustard falls back
to "Rape or colza seed" where a country reports rapeseed-mustard under that item (India does).
    python3 scripts/build/build_abroad_soil_yields.py
"""
import csv
import io
import json
import sys
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, SRC_DATA, write_json
from build_soil import point, drainage

FAO_ZIP = CACHE / 'Production_Crops_Livestock_E_Asia.zip'
COUNTRIES = {'india': 'India', 'pakistan': 'Pakistan', 'nepal': 'Nepal', 'bhutan': 'Bhutan', 'myanmar': 'Myanmar'}
ITEMS = {'rice': ['Rice'], 'wheat': ['Wheat'], 'lentil': ['Lentils, dry'], 'mustard': ['Mustard seed', 'Rape or colza seed'],
         'sesame': ['Sesame seed'], 'chickpea': ['Chick peas, dry']}
YEARS = [str(y) for y in range(2020, 2025)]
WANTED = {n for names in ITEMS.values() for n in names}


def yields():
    z = zipfile.ZipFile(FAO_ZIP)
    rows = csv.DictReader(io.TextIOWrapper(z.open('Production_Crops_Livestock_E_Asia_NOFLAG.csv'), encoding='latin-1'))
    by = {}
    for r in rows:
        if r['Element'] != 'Yield' or r['Area'] not in COUNTRIES.values() or r['Item'] not in WANTED:
            continue
        vals = [float(r[f'Y{y}']) for y in YEARS if r.get(f'Y{y}') not in (None, '')]
        if not vals:
            continue
        unit = r['Unit']  # kg/ha in current files (hg/ha in older ones)
        k = 1000 if unit == 'kg/ha' else 10000 if unit == 'hg/ha' else None
        if k is None:
            raise SystemExit(f'unknown unit {unit}')
        by[(r['Area'], r['Item'])] = {'tHa': round(sum(vals) / len(vals) / k, 3), 'years': f'{YEARS[0]}-{YEARS[-1]}', 'n': len(vals)}
    out = {}
    for cid, area in COUNTRIES.items():
        out[cid] = {}
        for crop, names in ITEMS.items():
            for nm in names:
                if (area, nm) in by:
                    out[cid][crop] = {**by[(area, nm)], 'item': nm}
                    break
    return out


def main():
    ys = yields()
    data = {}
    for cid in COUNTRIES:
        farm = json.loads((SRC_DATA / 'abroad' / f'{cid}.json').read_text(encoding='utf-8'))['points']['farm']
        lat, lon = farm['lat'], farm['lon']
        print(f'  {cid}', flush=True)
        s, at = point(lat, lon, f'abroad-{cid}'), [lat, lon]
        for r in (0.006, 0.012, 0.02, 0.04):
            if s:
                break
            for dy, dx in ((r, 0), (0, r), (-r, 0), (0, -r)):
                at = [round(lat + dy, 5), round(lon + dx, 5)]
                s = point(*at, f'abroad-{cid}-{at[0]}-{at[1]}')
                if s:
                    break
        data[cid] = {'soil': {**s, 'at': at, 'drainage': drainage(s['wrb'])} if s else None, 'yields': ys[cid]}
    write_json(SRC_DATA / 'soil' / 'abroad_soil_yields.json', {
        'provenance': {
            'status': 'REAL',
            'soil': 'ISRIC SoilGrids 2.0, 250 m, top 30 cm (thickness-weighted 0-5, 5-15, 15-30 cm), CC BY 4.0, https://soilgrids.org',
            'yields': f'FAOSTAT Production_Crops_Livestock (Asia bulk file), national yield, mean of {YEARS[0]}-{YEARS[-1]}, CC BY 4.0, https://www.fao.org/faostat',
            'retrieved': date.today().isoformat(),
        },
        'countries': data,
    })
    for cid, d in data.items():
        print(cid, d['soil'] and (d['soil']['soc_g_kg'], d['soil']['bulk_density'], d['soil']['texture']), {k: v['tHa'] for k, v in d['yields'].items()})


if __name__ == '__main__':
    main()
