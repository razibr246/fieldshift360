"""Sharper site photos: AI super-resolution, then clean resizes -> src/assets/images/<name>-{900,1600,2400,3200}.webp

Each 1600 px photo is enlarged 4x with Real-ESRGAN realesr-general-x4v3 (Xintao Wang et al., BSD-3-Clause; official
weights blended 50/50 with realesr-general-wdn-x4v3 so texture is kept), then scaled down with Lanczos to the four
widths the site serves. Downscaling from the 4x image gives crisper 900/1600 files than the old ones, and 2400/3200
let large and high-density screens show a full-resolution photo instead of a stretched one.

Needs PyTorch, Pillow and NumPy, and the two weight files from
https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0 next to this script (or pass --weights DIR).
Runs on Apple GPU (MPS), CUDA or CPU; about 2 s a photo on an M-series Mac.
    python scripts/photos/upscale_photos.py [--weights DIR] [--src DIR_OF_1600_SOURCES]
"""
import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

IMAGES = Path(__file__).resolve().parents[2] / 'src' / 'assets' / 'images'
WIDTHS = {900: 82, 1600: 82, 2400: 80, 3200: 78}  # width -> WebP quality


class SRVGGNetCompact(nn.Module):  # as in realesrgan/archs/srvgg_arch.py
    def __init__(self, num_feat=64, num_conv=32, upscale=4):
        super().__init__()
        self.upscale = upscale
        self.body = nn.ModuleList([nn.Conv2d(3, num_feat, 3, 1, 1), nn.PReLU(num_parameters=num_feat)])
        for _ in range(num_conv):
            self.body += [nn.Conv2d(num_feat, num_feat, 3, 1, 1), nn.PReLU(num_parameters=num_feat)]
        self.body.append(nn.Conv2d(num_feat, 3 * upscale * upscale, 3, 1, 1))
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for m in self.body:
            out = m(out)
        return self.upsampler(out) + F.interpolate(x, scale_factor=self.upscale, mode='nearest')


def load(weights: Path, dev):
    a = torch.load(weights / 'realesr-general-x4v3.pth', map_location='cpu', weights_only=True)
    b = torch.load(weights / 'realesr-general-wdn-x4v3.pth', map_location='cpu', weights_only=True)
    a, b = a.get('params', a), b.get('params', b)
    m = SRVGGNetCompact()
    m.load_state_dict({k: 0.5 * a[k] + 0.5 * b[k] for k in a})
    return m.eval().to(dev)


@torch.no_grad()
def upscale(m, img, dev, tile=256, pad=12):
    x = torch.from_numpy(np.asarray(img, dtype=np.float32) / 255).permute(2, 0, 1)[None].to(dev)
    H, W = x.shape[2:]
    out = torch.zeros(1, 3, H * 4, W * 4, device=dev)
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            ya, xa, yb, xb = max(0, y0 - pad), max(0, x0 - pad), min(H, y0 + tile + pad), min(W, x0 + tile + pad)
            o = m(x[:, :, ya:yb, xa:xb])
            h, w = min(tile, H - y0), min(tile, W - x0)
            out[:, :, y0 * 4:(y0 + h) * 4, x0 * 4:(x0 + w) * 4] = o[:, :, (y0 - ya) * 4:(y0 - ya + h) * 4, (x0 - xa) * 4:(x0 - xa + w) * 4]
    return Image.fromarray((out[0].clamp(0, 1).permute(1, 2, 0).cpu().numpy() * 255).round().astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--weights', type=Path, default=Path(__file__).resolve().parent)
    ap.add_argument('--src', type=Path, default=IMAGES, help='folder holding the <name>-1600.webp sources')
    args = ap.parse_args()
    dev = 'mps' if torch.backends.mps.is_available() else 'cuda' if torch.cuda.is_available() else 'cpu'
    m = load(args.weights, dev)
    for src in sorted(args.src.glob('*-1600.webp')):
        name = src.name[:-len('-1600.webp')]
        img = Image.open(src).convert('RGB')
        big = upscale(m, img, dev)
        for w, q in WIDTHS.items():
            h = round(w * img.height / img.width)
            big.resize((w, h), Image.LANCZOS).save(IMAGES / f'{name}-{w}.webp', quality=q, method=6)
        print(f'  {name}: {img.width}x{img.height} -> ' + ', '.join(f'{w}' for w in WIDTHS))


if __name__ == '__main__':
    main()
