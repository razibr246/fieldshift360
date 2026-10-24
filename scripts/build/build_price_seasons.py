"""When prices of each Rabi crop usually fall, and how much each crop yields -> src/data/market/price_seasons.json

Prices: Department of Agricultural Marketing (DAM) market information portal, market.dam.gov.bd, "Price graphical report":
monthly national average price of one commodity for one year and one price type (growers = farm-gate, wholesale,
retail). The portal answers a POST with a session cookie and the page's CSRF token, so the script opens the page first.
Growers' prices are used when DAM has enough of them, otherwise wholesale. Raw answers are cached in .cache/data/dam/.
Yields: FAOSTAT Production_Crops_Livestock bulk file (already cached by build_bangladesh_crops.py), Bangladesh, latest year.
    python3 scripts/build/build_price_seasons.py
"""
import csv
import http.cookiejar
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import CACHE, SRC_DATA, fetch, write_json

DAM = 'https://market.dam.gov.bd'
FAO = 'https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_Asia.zip'
YEARS = range(2008, date.today().year + 1)
PRICE_TYPES = [(3, 'growers'), (5, 'wholesale')]
MIN_YEARS = 4  # a price type needs this many full years before we trust its seasonal pattern
DIP = 0.9      # a month counts as "prices usually fall" when it sits 10% or more below that year's average

# app crop -> (DAM commodity id|name, FAO item)
CROPS = {
    'boro': ('597|Boro-Coarse', 'Rice'),
    'tomato': ('981|Tomato', 'Tomatoes'),
    'wheat': ('622|Wheat', 'Wheat'),
    'lentil': ('795|Masur-local', 'Lentils, dry'),
    'mustard': ('808|Mustard Seed', 'Rape or colza seed'),
}

try:  # python.org builds on macOS ship without a CA bundle
    import certifi, ssl
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = None

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), urllib.request.HTTPSHandler(context=CTX))
opener.addheaders = [('User-Agent', 'Mozilla/5.0 (fieldshift360-data-build)')]
_token = None


def token():
    global _token
    if _token is None:
        page = opener.open(f'{DAM}/price_graphical_report', timeout=60).read().decode('utf-8', 'replace')
        _token = re.search(r'name="csrf_webspice_tkn" value="([0-9a-f]+)"', page).group(1)
    return _token


def monthly(commodity, price_type, year):
    """12 monthly prices (None where DAM has no figure) and the unit, from cache or the portal."""
    path = CACHE / 'dam' / f'{commodity.split("|")[0]}-{price_type}-{year}.json'
    if not path.exists():
        body = urllib.parse.urlencode({'Commodity_id': commodity, 'PriceType_id': price_type, 'year': year, 'csrf_webspice_tkn': token()}).encode()
        raw = opener.open(urllib.request.Request(f'{DAM}/price_graphical_report', data=body), timeout=60).read().decode('utf-8').strip().lstrip('\ufeff').strip()  # DAM prefixes a tab and a BOM
        json.loads(raw)  # stop on an error page rather than caching it
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(raw, encoding='utf-8')
        time.sleep(0.4)  # be gentle with a government server
    pts = json.loads(path.read_text(encoding='utf-8'))
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    by = {p['label']: p['y'] for p in pts if p.get('y')}
    unit = pts[0].get(f'measurement_{"growers" if price_type == 3 else "wholesale"}') if pts else None
    return [by.get(m) for m in months], unit


def season(commodity):
    """Pick the price type with enough years; return its series and the typical monthly index (1 = that year's median).
    Growers' prices are missing in months the crop is not on sale, so each year is scaled by the median of the months
    it has, and each month's index is the median over the years that report it (at least MIN_YEARS of them)."""
    med = lambda a: sorted(a)[len(a) // 2] if len(a) % 2 else sum(sorted(a)[len(a) // 2 - 1:len(a) // 2 + 1]) / 2
    for pid, pname in PRICE_TYPES:
        years, unit = {}, None
        for y in YEARS:
            vals, u = monthly(commodity, pid, y)
            if sum(v is not None for v in vals) >= 6:
                years[y], unit = vals, u or unit
        if len(years) < MIN_YEARS:
            continue
        idx = [[] for _ in range(12)]
        for vals in years.values():
            m0 = med([v for v in vals if v])
            for m, v in enumerate(vals):
                if v:
                    idx[m].append(v / m0)
        index = [round(med(a), 3) if len(a) >= MIN_YEARS else None for a in idx]
        return {'priceType': pname, 'unit': unit, 'years': {str(y): v for y, v in years.items()}, 'index': index,
                'dipMonths': [m + 1 for m, v in enumerate(index) if v is not None and v <= DIP]}
    return None


def fao_yields():
    z = zipfile.ZipFile(fetch(FAO, 'Production_Crops_Livestock_E_Asia.zip'))
    name = next(n for n in z.namelist() if n.endswith('_Asia_NOFLAG.csv'))
    rows = [r for r in csv.DictReader(io.TextIOWrapper(z.open(name), encoding='latin-1')) if r['Area'] == 'Bangladesh' and r['Element'] == 'Yield']
    year = max(c for c in rows[0] if c.startswith('Y') and c[1:].isdigit())
    unit = {r['Item']: r['Unit'] for r in rows}
    to_t = lambda item, v: float(v) / (1000 if unit[item] == 'kg/ha' else 10000 if unit[item] == 'hg/ha' else 1)
    return year[1:], {r['Item']: round(to_t(r['Item'], r[year]), 2) for r in rows if r[year]}


# The last five years of Bangladesh yields per crop, so the app can show a real good-year / bad-year range
# instead of one number (yields rise year on year, so a longer window would mostly show the trend).
HIST_ITEMS = {'boro': 'Rice', 'tomato': 'Tomatoes', 'wheat': 'Wheat', 'lentil': 'Lentils, dry', 'mustard': 'Rape or colza seed',
              'sesame': 'Sesame seed', 'jute': 'Jute, raw or retted'}


def fao_yield_history(n=5):
    z = zipfile.ZipFile(fetch(FAO, 'Production_Crops_Livestock_E_Asia.zip'))
    name = next(n_ for n_ in z.namelist() if n_.endswith('_Asia_NOFLAG.csv'))
    rows = {r['Item']: r for r in csv.DictReader(io.TextIOWrapper(z.open(name), encoding='latin-1')) if r['Area'] == 'Bangladesh' and r['Element'] == 'Yield'}
    last = max(int(c[1:]) for c in next(iter(rows.values())) if c.startswith('Y') and c[1:].isdigit())
    years = list(range(last - n + 1, last + 1))
    out = {}
    for key, item in HIST_ITEMS.items():
        r = rows.get(item)
        if not r:
            continue
        k = 1000 if r['Unit'] == 'kg/ha' else 10000 if r['Unit'] == 'hg/ha' else 1
        out[key] = {'item': item, 'tHa': {str(y): round(float(r[f'Y{y}']) / k, 3) for y in years if r.get(f'Y{y}')}}
    write_json(SRC_DATA / 'market' / 'yield_history.json', {
        'provenance': {'status': 'REAL', 'dataset': f'FAOSTAT Production_Crops_Livestock, Bangladesh, yield {years[0]}-{years[-1]} (national average, all seasons)', 'url': FAO, 'retrieved': date.today().isoformat()},
        'years': [years[0], years[-1]], 'crops': out,
    })
    print(f'  yield history {years[0]}-{years[-1]}: {", ".join(out)}')


def main():
    fao_yield_history()
    if '--yields-only' in sys.argv:
        return
    fao_year, yields = fao_yields()
    crops = {}
    for key, (commodity, item) in CROPS.items():
        s = season(commodity)
        if not s:
            print(f'  {key}: DAM has too few full years, skipped')
            continue
        s.update({'dam': commodity.split('|')[1], 'yieldTHa': yields[item], 'faoItem': item})
        crops[key] = s
        yrs = list(s['years'])
        print(f'  {key}: {s["priceType"]} {yrs[0]}-{yrs[-1]} ({len(yrs)} yrs), dip months {s["dipMonths"]}, yield {yields[item]} t/ha')
    out = {
        'provenance': {
            'status': 'REAL',
            'prices': 'Department of Agricultural Marketing (DAM), monthly national average prices, market.dam.gov.bd price graphical report',
            'pricesUrl': f'{DAM}/price_graphical_report',
            'yields': f'FAOSTAT Production_Crops_Livestock, Bangladesh, yield {fao_year}',
            'yieldsUrl': FAO,
            'dipRule': f'each year is scaled by its median month; a month is a price-dip month when its median over the years is {DIP} or lower (10% or more below normal)',
            'retrieved': date.today().isoformat(),
        },
        'faoYear': int(fao_year),
        'crops': crops,
    }
    write_json(SRC_DATA / 'market' / 'price_seasons.json', out)


if __name__ == '__main__':
    main()
