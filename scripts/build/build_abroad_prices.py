"""Farm-gate prices for the five neighbouring-country farms' rotation crops -> src/data/market/abroad_prices.json

FAOSTAT Prices bulk file (Asia): each country's producer price in local currency a tonne (LCU/tonne). Many series
stop years ago (India's in 2008), so each crop's last reported price is carried to 2022-2024 with FAOSTAT's own
Producer Price Index for that crop and country (2014-2016 = 100), which runs to 2025:
    price now = last price x mean PPI 2022-2024 / PPI in the last price's year
A crop with prices reported in 2022-2024 uses the mean of those years as they are.
A crop with no producer price at all is left out (the app then says its income is unknown). These are national
farm-gate averages, not this farm's market, and come with no costs: the app shows the gross value of the harvest.
    curl -o .cache/data/Prices_E_Asia.zip https://bulks-faostat.fao.org/production/Prices_E_Asia.zip
    python3 scripts/build/build_abroad_prices.py
"""
import csv
import io
import sys
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, SRC_DATA, write_json
from build_abroad_soil_yields import COUNTRIES, ITEMS

FAO_ZIP = CACHE / 'Prices_E_Asia.zip'
TARGET = ['Y2022', 'Y2023', 'Y2024']
CURRENCY = {'india': 'INR', 'pakistan': 'PKR', 'nepal': 'NPR', 'bhutan': 'BTN', 'myanmar': 'MMK'}
SYMBOL = {'india': '₹', 'pakistan': 'Rs', 'nepal': 'रू', 'bhutan': 'Nu', 'myanmar': 'K'}


def series():
    z = zipfile.ZipFile(FAO_ZIP)
    rows = csv.DictReader(io.TextIOWrapper(z.open('Prices_E_Asia_NOFLAG.csv'), encoding='latin-1'))
    wanted = {n for names in ITEMS.values() for n in names}
    out = {}
    for r in rows:
        if r['Area'] not in COUNTRIES.values() or r['Item'] not in wanted or r['Months'] != 'Annual value':
            continue
        kind = 'lcu' if r['Element'] == 'Producer Price (LCU/tonne)' else 'ppi' if r['Element'].startswith('Producer Price Index') else None
        if kind:
            out[(r['Area'], r['Item'], kind)] = {k: float(v) for k, v in r.items() if k.startswith('Y') and len(k) == 5 and v not in ('', None)}
    return out


def main():
    s = series()
    data = {}
    for cid, area in COUNTRIES.items():
        data[cid] = {'currency': CURRENCY[cid], 'symbol': SYMBOL[cid], 'crops': {}}
        for crop, names in ITEMS.items():
            for nm in names:
                lcu, ppi = s.get((area, nm, 'lcu')), s.get((area, nm, 'ppi'))
                if not lcu:
                    continue
                last = max(lcu)
                recent = [lcu[y] for y in TARGET if y in lcu]
                if recent:  # reported in 2022-2024: those prices themselves
                    data[cid]['crops'][crop] = {'perTonne': round(sum(recent) / len(recent)), 'lastYear': int(last[1:]), 'indexFactor': None, 'item': nm}
                    break
                now = [ppi[y] for y in TARGET if y in (ppi or {})]
                if not ppi or last not in ppi or not now or ppi[last] <= 0:
                    continue
                factor = sum(now) / len(now) / ppi[last]
                data[cid]['crops'][crop] = {
                    'perTonne': round(lcu[last] * factor), 'lastYear': int(last[1:]), 'lastPerTonne': round(lcu[last]),
                    'indexFactor': round(factor, 3), 'item': nm,
                }
                break
    write_json(SRC_DATA / 'market' / 'abroad_prices.json', {
        'provenance': {
            'status': 'REAL', 'dataset': 'FAOSTAT Prices (Asia bulk file): Producer Price (LCU/tonne) and Producer Price Index (2014-2016 = 100)',
            'url': 'https://www.fao.org/faostat/en/#data/PP', 'licence': 'CC BY 4.0',
            'method': 'mean producer price of 2022-2024 where reported; otherwise the last reported price carried to 2022-2024 with the same crop and country\'s producer price index',
            'caveat': 'national farm-gate averages, no production costs: the gross value of a harvest, not profit',
            'retrieved': date.today().isoformat(),
        },
        'countries': data,
    })


if __name__ == '__main__':
    main()
