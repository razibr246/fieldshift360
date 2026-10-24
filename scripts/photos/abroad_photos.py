"""Neighbouring-country photos for the home page -> src/assets/images/abroad/<country>-{900,1600,2400,3200}.webp

Drop a photo into src/assets/images/abroad/ named after the country (india, pakistan, nepal, bhutan, myanmar,
afghanistan; .jpg, .jpeg, .png or .webp) and run this. A name with '-view' (nepal-view.jpg) is a landscape for the
home page's hero slideshow and becomes nepal-view-<width>.webp; the plain name is the farm photo on the country card. Each photo is enlarged 4x with the same Real-ESRGAN model as
the rest of the site (scripts/photos/upscale_photos.py: realesr-general-x4v3 blended 50/50 with its denoising twin),
then scaled with Lanczos to the four widths the site serves, so large and high-density screens get a sharp picture
instead of a stretched one. The original is moved to .cache/data/photos-src/ (kept, but not shipped).
The home page picks the files up by themselves; a country without a photo shows its colour card instead.
    .cache/venv-sr/bin/python scripts/photos/abroad_photos.py [--weights .cache/sr-weights]
Without PyTorch it still makes the four sizes, by Lanczos resizing alone.
"""
import argparse
import importlib.util
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'src' / 'assets' / 'images' / 'abroad'
KEEP = ROOT / '.cache' / 'data' / 'photos-src'
COUNTRIES = ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar', 'afghanistan']
WIDTHS = {900: 82, 1600: 82, 2400: 80, 3200: 78}  # width -> WebP quality, as for the other site photos


def model(weights):
    try:
        import torch
    except ImportError:
        return None, None, None
    spec = importlib.util.spec_from_file_location('up', Path(__file__).resolve().parent / 'upscale_photos.py')
    up = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(up)
    dev = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
    return up, up.load(weights, dev), dev


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--weights', type=Path, default=ROOT / '.cache' / 'sr-weights')
    args = ap.parse_args()
    up, m, dev = model(args.weights)
    print('AI upscaling on', dev if m else 'off (no PyTorch): Lanczos only')
    KEEP.mkdir(parents=True, exist_ok=True)
    for cc in [f'{c}{v}' for c in COUNTRIES for v in ('', '-view')]:
        src = next((p for ext in ('jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG') for p in [DIR / f'{cc}.{ext}'] if p.exists()), None)
        if not src:
            continue
        img = Image.open(src).convert('RGB')
        big = up.upscale(m, img, dev) if m else img
        for w, q in WIDTHS.items():
            h = round(w * img.height / img.width)
            big.resize((w, h), Image.LANCZOS).save(DIR / f'{cc}-{w}.webp', quality=q, method=6)
        shutil.move(str(src), KEEP / src.name)
        print(f'  {cc}: {img.width}x{img.height} -> {", ".join(map(str, WIDTHS))} px (original kept in {KEEP.relative_to(ROOT)})')


if __name__ == '__main__':
    main()
