"""Shared helpers for the data build scripts: a download cache and small geometry tools (standard library only)."""
import json
import math
import os
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CACHE = REPO / '.cache' / 'data'          # raw downloads live here (git-ignored)
SRC_DATA = REPO / 'src' / 'data'
GEO = SRC_DATA / 'geo'
EARTH_R = 6371008.8


def fetch(url: str, name: str) -> Path:
    """Download url into the cache once; later runs reuse the file."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists() or path.stat().st_size == 0:
        print(f'  downloading {name} ...')
        req = urllib.request.Request(url, headers={'User-Agent': 'fieldshift360-data-build'})
        with urllib.request.urlopen(req, timeout=600) as r, open(path, 'wb') as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
    return path


def fetch_json(url: str, name: str):
    return json.loads(fetch(url, name).read_text(encoding='utf-8'))


def geoboundaries(level: str, simplified: bool) -> dict:
    """geoBoundaries gbOpen Bangladesh at ADM2/ADM3/ADM4 (source: BBS / OCHA ROAP)."""
    meta = fetch_json(f'https://www.geoboundaries.org/api/current/gbOpen/BGD/{level}/', f'geoboundaries-{level}.json')
    url = meta['simplifiedGeometryGeoJSON' if simplified else 'gjDownloadURL']
    return fetch_json(url, f'geoBoundaries-BGD-{level}{"_simplified" if simplified else ""}.geojson')


def ring_area_m2(ring) -> float:
    """Geodesic area of a [lon, lat] ring in square metres."""
    a = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        a += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1)) + math.sin(math.radians(y2)))
    return abs(a * EARTH_R * EARTH_R / 2)


def inside(x: float, y: float, ring) -> bool:
    """Point-in-polygon (ray casting) on a [lon, lat] ring."""
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def _dp(pts, tol):
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy) or 1e-12
        best, idx = 0.0, None
        for i in range(a + 1, b):
            x, y = pts[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length
            if d > best:
                best, idx = d, i
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def simplify_ring(ring, tol: float):
    """Douglas-Peucker for a closed ring: split at the point farthest from the start so both halves are open lines."""
    far = max(range(len(ring)), key=lambda i: math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]))
    return _dp(ring[:far + 1], tol)[:-1] + _dp(ring[far:], tol)


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'  wrote {path.relative_to(REPO)} ({path.stat().st_size // 1024} KB)')
