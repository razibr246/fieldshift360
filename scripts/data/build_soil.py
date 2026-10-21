"""Soil for every union and every registered field -> src/data/soil_<upazila>.json, src/data/soil_fields.json

Source: ISRIC SoilGrids 2.0 (250 m, global soil properties predicted from ~240 000 soil profiles and covariates;
CC BY 4.0), queried at each union's interior point (BBS boundaries, src/data/geo/<upazila>_places.json) and each field
in src/data/parcels.json. For the top 30 cm (0-5, 5-15, 15-30 cm, thickness-weighted): pH (water), organic carbon,
total nitrogen, clay/silt/sand, cation exchange capacity, bulk density, each with its 5-95% range, and the three most
likely WRB soil groups. SoilGrids is a model estimate for a 250 m cell, not a soil test; it has no plant-available
phosphorus, potash, sulphur, zinc or boron (those come from SRDI's union data, build_srdi_frs.mjs).
ISRIC asks for at most 5 requests a minute, so a full run takes about 15 minutes; answers are cached in
.cache/data/soilgrids/.
    python3 scripts/data/build_soil.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, GEO, SRC_DATA, write_json

API = 'https://rest.isric.org/soilgrids/v2.0'
PROPS = ['phh2o', 'soc', 'nitrogen', 'clay', 'silt', 'sand', 'cec', 'bdod']
DEPTHS = [('0-5cm', 5), ('5-15cm', 10), ('15-30cm', 15)]
SG = CACHE / 'soilgrids'
_last = [0.0]


def get(url, name):
    path = SG / name
    if path.exists():
        return json.loads(path.read_text())
    wait = 12.5 - (time.time() - _last[0])  # 5 requests a minute
    if wait > 0:
        time.sleep(wait)
    for i in range(5):
        try:
            _last[0] = time.time()
            j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'fieldshift360-data-build'}), timeout=120))
            SG.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(j))
            return j
        except Exception as e:  # 429/502 from a busy server: back off
            print(f'    retry {i + 1}: {e}')
            time.sleep(30 * (i + 1))
    raise SystemExit(f'SoilGrids did not answer for {name}')


def texture_class(sand, silt, clay):
    """USDA soil texture triangle."""
    if silt + 1.5 * clay < 15: return 'sand'
    if silt + 1.5 * clay < 30: return 'loamy sand'
    if (7 <= clay < 20 and sand > 52 and silt + 2 * clay >= 30) or (clay < 7 and silt < 50 and silt + 2 * clay >= 30): return 'sandy loam'
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52: return 'loam'
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12): return 'silt loam'
    if silt >= 80 and clay < 12: return 'silt'
    if 20 <= clay < 35 and silt < 28 and sand > 45: return 'sandy clay loam'
    if 27 <= clay < 40 and 20 < sand <= 45: return 'clay loam'
    if 27 <= clay < 40 and sand <= 20: return 'silty clay loam'
    if clay >= 35 and sand > 45: return 'sandy clay'
    if clay >= 40 and silt >= 40: return 'silty clay'
    return 'clay'


def point(lat, lon, key):
    q = [('lon', round(lon, 5)), ('lat', round(lat, 5))] + [('property', p) for p in PROPS] + [('depth', d) for d, _ in DEPTHS] + [('value', v) for v in ('mean', 'Q0.05', 'Q0.95')]
    props = get(f'{API}/properties/query?{urllib.parse.urlencode(q)}', f'{key}-props.json')
    cls = get(f'{API}/classification/query?{urllib.parse.urlencode({"lon": round(lon, 5), "lat": round(lat, 5), "number_classes": 3})}', f'{key}-wrb.json')
    out = {}
    for layer in props['properties']['layers']:
        d = layer['unit_measure']['d_factor']
        agg = {}
        for stat in ('mean', 'Q0.05', 'Q0.95'):
            num = den = 0
            for dep in layer['depths']:
                w = dict(DEPTHS).get(dep['label'])
                v = dep['values'].get(stat)
                if w and v is not None:
                    num += v / d * w; den += w
            agg[stat] = round(num / den, 3) if den else None
        out[layer['name']] = agg
    if out['phh2o']['mean'] is None:
        return None  # water or built-up cell: no prediction
    soc = out['soc']['mean']  # g/kg
    tex = texture_class(out['sand']['mean'], out['silt']['mean'], out['clay']['mean'])
    return {
        'ph': round(out['phh2o']['mean'], 1), 'ph_range': [round(out['phh2o']['Q0.05'], 1), round(out['phh2o']['Q0.95'], 1)],
        'soc_g_kg': round(soc, 1), 'om_pct': round(soc / 10 * 1.724, 2),  # organic matter ≈ organic carbon × 1.724 (van Bemmelen)
        'om_range': [round(out['soc']['Q0.05'] / 10 * 1.724, 2), round(out['soc']['Q0.95'] / 10 * 1.724, 2)],
        'n_total_pct': round(out['nitrogen']['mean'] / 10, 3),  # g/kg -> %
        'clay': round(out['clay']['mean']), 'silt': round(out['silt']['mean']), 'sand': round(out['sand']['mean']), 'texture': tex,
        'cec': round(out['cec']['mean'], 1), 'bulk_density': round(out['bdod']['mean'], 2),
        'wrb': [{'name': n, 'p': p} for n, p in (cls.get('wrb_class_probability') or [])[:3]],
    }


# Most likely soil group -> how water drains (WRB reference-group definitions).
POOR = {'Gleysols', 'Planosols', 'Stagnosols', 'Histosols'}
FREE = {'Arenosols', 'Regosols', 'Leptosols'}


def drainage(wrb):
    if not wrb:
        return None
    top = wrb[0]['name']
    return 'poor' if top in POOR else 'good' if top in FREE else 'imperfect'


def main():
    today = date.today().isoformat()
    prov = {'status': 'REAL', 'dataset': 'ISRIC SoilGrids 2.0, 250 m, top 30 cm (thickness-weighted mean of 0-5, 5-15, 15-30 cm)',
            'license': 'CC BY 4.0', 'url': 'https://soilgrids.org', 'retrieved': today,
            'notes': 'A model estimate for each 250 m cell, not a soil test. Plant-available P, K, S, Zn and B are not in SoilGrids; see srdi_frs.json.'}
    for key in ('godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'):
        places = json.loads((GEO / f'{key}_places.json').read_text(encoding='utf-8'))
        unions = {}
        for u in places['unions']:
            lat, lon = u['label']
            uid = u['en']  # municipalities already read 'X Municipality', as the app's union ids do
            print(f'  {key} {uid}', flush=True)
            s, at = point(lat, lon, f'{key}-{uid}'), [lat, lon]
            # A centre on the river or in town has no soil prediction: step out to the nearest cell that has one.
            for r in (0.006, 0.012, 0.02):
                if s:
                    break
                for dy, dx in ((r, 0), (0, r), (-r, 0), (0, -r)):
                    at = [round(lat + dy, 5), round(lon + dx, 5)]
                    s = point(*at, f'{key}-{uid}-{at[0]}-{at[1]}')
                    if s:
                        break
            if s:
                unions[uid] = {**s, 'at': at, 'drainage': drainage(s['wrb'])}
        write_json(SRC_DATA / f'soil_{key}.json', {'provenance': prov, 'unions': unions})
    fields = {}
    for p in json.loads((SRC_DATA / 'parcels.json').read_text(encoding='utf-8'))['parcels']:
        print(f"  field {p['id']}", flush=True)
        s = point(p['lat'], p['lon'], f"field-{p['id']}-{p['lat']}-{p['lon']}")
        if s:
            fields[p['id']] = {**s, 'at': [p['lat'], p['lon']], 'drainage': drainage(s['wrb'])}
    write_json(SRC_DATA / 'soil_fields.json', {'provenance': prov, 'fields': fields})


if __name__ == '__main__':
    main()
