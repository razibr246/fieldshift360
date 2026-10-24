"""Official Dhaka retail prices of farm products -> src/data/market/market_dhaka.json

Source: Department of Agricultural Marketing (DAM, dam.gov.bd), the weekly report "ঢাকা মহানগরীর ০৪টি বাজারের কতিপয়
কৃষিপণ্যের ... তুলনামূলক বিবরণী": average retail price in four Dhaka markets for this week, last week, the same week last
month and the same week last year. The newest PDF linked from the DAM monthly-reports page is used.
The PDFs are typed in a legacy Bangla font, so names extract garbled; rows are therefore taken by their fixed serial
number in DAM's table and each is checked against a fragment that survives the font mangling (the build stops if DAM
changes the table). Needs pypdf (and certifi on macOS):  pip install pypdf certifi
    python3 scripts/build/build_market_prices.py
"""
import io
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[2]
LIST = 'https://dam.gov.bd/pages/monthly-reports/retail-market-prices-in-dhaka-city-ol414e-6a6ade32c202d618dd59d411'
BN = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')

# serial in DAM's table -> (key, Bangla, English, unit, fragment that must appear in the extracted row)
ROWS = {
    1: ('rice_fine', 'চাল (সরু)', 'Rice, fine', 'kg', 'চা'),
    2: ('rice_medium', 'চাল (মাঝারি)', 'Rice, medium', 'kg', 'মাঝারী'),
    3: ('rice_coarse', 'চাল (মোটা)', 'Rice, coarse', 'kg', 'মাটা'),
    5: ('atta_loose', 'আটা (খোলা)', 'Wheat flour, loose', 'kg', 'আটা'),
    6: ('lentil_fine', 'মসুর ডাল (উন্নত)', 'Lentil, fine', 'kg', 'মসুর'),
    7: ('lentil_coarse', 'মসুর ডাল (মোটা)', 'Lentil, coarse', 'kg', 'মসুর'),
    9: ('mung', 'মুগ ডাল', 'Mung dal', 'kg', 'মুগ'),
    13: ('onion', 'পেঁয়াজ (দেশি)', 'Onion, local', 'kg', 'াজ'),
    14: ('garlic', 'রসুন (দেশি)', 'Garlic, local', 'kg', 'রসুন'),
    17: ('chilli_dry', 'শুকনা মরিচ (দেশি)', 'Dry chilli, local', 'kg', 'শুকনা'),
    18: ('chilli_green', 'কাঁচা মরিচ', 'Green chilli', 'kg', 'কাঁচা'),
    29: ('potato', 'আলু', 'Potato', 'kg', 'আলু'),
    30: ('brinjal', 'বেগুন', 'Brinjal', 'kg', 'গুন'),
    31: ('papaya', 'কাঁচা পেঁপে', 'Green papaya', 'kg', 'কাঁচা'),
    32: ('pumpkin', 'মিষ্টি কুমড়া', 'Sweet pumpkin', 'kg', 'কুম'),
}


try:  # use certifi's CA bundle when installed (python.org builds on macOS ship without one)
    import certifi, ssl
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = None


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (fieldshift360-data-build)'})
    try:
        with urllib.request.urlopen(req, timeout=120, context=CTX) as r:
            return r.read()
    except urllib.error.URLError as e:
        if 'CERTIFICATE_VERIFY_FAILED' not in str(e):
            raise
        # The government servers chain to an authority the system store trusts but Python's bundle lacks:
        # fetch with curl, which verifies against the system store.
        return subprocess.run(['curl', '-sfL', '--max-time', '120', '-A', 'Mozilla/5.0', url], check=True, capture_output=True).stdout


def dmy(s):
    d, m, y = (int(x) for x in s.translate(BN).split('/'))
    return date(y, m, d)


def parse(pdf):
    text = '\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(pdf)).pages)
    dates = [dmy(x) for x in re.findall(r'([০-৯]{2}/[০-৯]{2}/[০-৯]{4})', text)]
    week, last_week, last_month, last_year = dates[0], dates[1], dates[2], dates[3]
    rows = {}
    for line in text.split('\n'):
        m = re.match(r'^\s*([০-৯]{1,2})\s+(.*)$', line)
        nums = re.findall(r'-?[০-৯]+\.[০-৯]{2}|(?<=\s)-(?=\s|$)', line)
        if not m or len(nums) < 7:
            continue
        n = int(m.group(1).translate(BN))
        if n in ROWS and n not in rows:
            rows[n] = (line, [None if v == '-' else float(v.translate(BN)) for v in nums[-7:]])
    return {'week': week, 'lastWeek': last_week, 'lastMonth': last_month, 'lastYear': last_year}, rows


def main():
    html = get(LIST).decode('utf-8', 'replace')
    pdfs = sorted(set(re.findall(r'href="(https://[^"]+/office-dam/\d{4}/\d{1,2}/[^"]+\.pdf)"', html)))
    best = None
    for url in pdfs:
        try:
            dates, rows = parse(get(url))
        except Exception as e:  # a PDF that is not this weekly table
            print(f'  skip {url.rsplit("/", 1)[-1]}: {e}')
            continue
        bad = [n for n, r in ROWS.items() if n not in rows or r[4] not in rows[n][0]]
        if bad:
            print(f'  skip {url.rsplit("/", 1)[-1]} ({dates["week"]}): rows {bad} missing or not recognised')
            continue
        if best is None or dates['week'] > best[1]['week']:
            best = (url, dates, rows)
    if not best:
        sys.exit('no weekly Dhaka retail price table found')
    url, dates, rows = best
    items = []
    for n, (key, bn, en, unit, frag) in ROWS.items():
        line, (now, wk, wk_pct, mo, mo_pct, yr, yr_pct) = rows[n]
        items.append({'key': key, 'bn': bn, 'en': en, 'unit': unit, 'price': now, 'lastWeek': wk, 'lastMonth': mo, 'lastYear': yr,
                      'pctWeek': wk_pct, 'pctMonth': mo_pct, 'pctYear': yr_pct})
    out = {
        'provenance': {'status': 'REAL', 'dataset': 'Department of Agricultural Marketing (DAM), weekly average retail prices in four Dhaka city markets',
                       'url': url, 'list': LIST, 'retrieved': date.today().isoformat()},
        **{k: v.isoformat() for k, v in dates.items()},
        'items': items,
    }
    dst = REPO / 'src' / 'data' / 'market' / 'market_dhaka.json'
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'  wrote {dst.relative_to(REPO)}: week of {out["week"]}, {len(items)} items from {url.rsplit("/", 1)[-1]}')


if __name__ == '__main__':
    main()
