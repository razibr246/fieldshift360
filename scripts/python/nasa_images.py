"""Photos of Bangladesh from the NASA Image and Video Library -> src/assets/images/nasa/<nasa_id>-{900,1600}.webp
and src/data/nasa_images.json (title, date, credit, link and NASA's own caption for each).

    .cache/venv-sr/bin/python scripts/python/nasa_images.py

The library's search API (https://images-api.nasa.gov) needs no key. Each picture is taken at the library's "large"
size (or the original when that is smaller than 1600 px) and scaled with Lanczos so its longest side is one of the
two sizes the home page uses. NASA's media guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/): NASA images are generally
free to use, credited to NASA, without suggesting NASA endorses the app. Pictures whose credit names a third
party's base map (SWOT over Google Earth, for one) are left out.
"""
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src' / 'assets' / 'images' / 'nasa'
DATA = ROOT / 'src' / 'data' / 'nasa_images.json'
API = 'https://images-api.nasa.gov'
WIDTHS = {900: 80, 1600: 78}  # longest side -> WebP quality
# The pictures, in the order the home page shows them, and why each is there.
PICK = [
    ('sts066-92-013', 'delta'),      # where the soil comes from
    ('iss070e005997', 'sundarbans'),  # the salt coast (Dacope, Khulna)
    ('PIA26282', 'rupganj'),         # cropland turning into town (Dhaka division)
    ('iss063e107090', 'coast'),      # the southern coast and the Bay of Bengal
]


def get(url):
    req = urllib.request.Request(url.replace('http://', 'https://'), headers={'User-Agent': 'FieldShift360/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    out = {'provenance': {'status': 'REAL', 'source': 'NASA Image and Video Library', 'api': API,
                          'guidelines': 'https://www.nasa.gov/nasa-brand-center/images-and-media/'}, 'images': []}
    for nasa_id, role in PICK:
        meta = json.loads(get(f'{API}/search?nasa_id={nasa_id}'))['collection']['items'][0]['data'][0]
        files = json.loads(get(f'{API}/asset/{nasa_id}'))['collection']['items']
        hrefs = [f['href'] for f in files if f['href'].lower().endswith(('.jpg', '.jpeg', '.png'))]
        large = next((h for h in hrefs if '~large' in h), None)
        orig = next((h for h in hrefs if '~orig' in h), hrefs[0])
        img = Image.open(io.BytesIO(get(large or orig))).convert('RGB')
        if img.width < 1600 and large:
            img = Image.open(io.BytesIO(get(orig))).convert('RGB')
        for w, q in WIDTHS.items():
            k = min(1, w / max(img.width, img.height))  # longest side, so a tall picture is not twice the bytes
            img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS).save(OUT / f'{nasa_id}-{w}.webp', 'WEBP', quality=q, method=6)
        out['images'].append({
            'id': nasa_id, 'role': role, 'title': meta.get('title', '').strip(), 'date': meta.get('date_created', '')[:10],
            'center': meta.get('center'), 'credit': meta.get('secondary_creator') or meta.get('photographer') or f"NASA ({meta.get('center')})",
            'description': ' '.join((meta.get('description') or '').split()), 'width': img.width, 'height': img.height,
            'url': f'https://images.nasa.gov/details/{nasa_id}',
        })
        print(nasa_id, img.width, 'x', img.height, '->', ', '.join(f'{w}px' for w in WIDTHS))
    DATA.write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
