"""Land use inside an upazila, 2017 and 2025 -> src/data/geo/<upazila>_landcover.json + src/assets/maps/<upazila>-landcover-{year}.png

Source: Esri | Impact Observatory | Microsoft Sentinel-2 10 m Land Use/Land Cover, yearly (CC BY 4.0), queried live:
computeHistograms over the upazila boundary gives the area of each class; exportImage, clipped to the boundary and
coloured with the app's palette, gives the map image. Needs <upazila>_boundary.json first.
    python3 scripts/build/build_godagari_landcover.py            # Godagari
    python3 scripts/build/build_godagari_landcover.py dhamrai    # Dhamrai
"""
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import GEO, REPO, write_json

SERVICE = 'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer'
YEARS = [2017, 2025]
# (class value, key, Bangla, English, colour) in display order; the colours are the app's own, not Esri's.
CLASSES = [(5, 'crops', 'ফসলের জমি', 'Cropland', '#f2c94c'), (7, 'built', 'বসতি ও ঘরবাড়ি', 'Villages and built-up', '#6e6e6e'),
           (1, 'water', 'নদী, বিল ও পুকুর', 'Rivers, beels and ponds', '#3d8fd1'), (8, 'bare', 'বালুচর ও খালি জমি', 'Sand bars and bare land', '#d8c8a8'),
           (11, 'grass', 'ঘাস ও পতিত জমি', 'Grass and fallow', '#b5d99c'), (2, 'trees', 'গাছপালা ও বাগান', 'Trees and orchards', '#2f6b3a'),
           (4, 'wet', 'জলাভূমির গাছপালা', 'Flooded vegetation', '#7a87c6')]
MERC = 20037508.34


def post(path, params):
    req = urllib.request.Request(f'{SERVICE}/{path}', data=urllib.parse.urlencode(params).encode())
    out = json.load(urllib.request.urlopen(req, timeout=900))
    if 'error' in out:
        raise SystemExit(f'{path}: {out["error"]}')
    return out


def year_span(y):
    t = lambda m, d: int(datetime(y, m, d, tzinfo=timezone.utc).timestamp() * 1000)
    return f'{t(1, 1)},{t(12, 31)}'


def merc(lat, lon):
    return lon * MERC / 180, math.log(math.tan((90 + lat) * math.pi / 360)) * MERC / math.pi


def unmerc(x, y):
    return round(math.degrees(2 * math.atan(math.exp(y * math.pi / MERC)) - math.pi / 2), 6), round(x * 180 / MERC, 6)


def main(key='godagari'):
    ring = json.loads((GEO / f'{key}_boundary.json').read_text(encoding='utf-8'))['ring']
    lat0 = sum(p[0] for p in ring) / len(ring)
    # 1. Area of each class inside the boundary, per year. A large upazila (Dacope, Sitakunda) is too many 10 m pixels
    # for one request, so the count is retried at 20 m and then 30 m; each pixel then stands for that many square metres.
    geom_ll = {'rings': [[[lon, lat] for lat, lon in ring]], 'spatialReference': {'wkid': 4326}}
    counts = {}
    for y in YEARS:
        for px in (10, 20, 30):
            try:
                h = post('computeHistograms', {'f': 'json', 'geometry': json.dumps(geom_ll), 'geometryType': 'esriGeometryPolygon', 'time': year_span(y),
                                               'renderingRule': json.dumps({'rasterFunction': 'None'}),
                                               'pixelSize': json.dumps({'x': px, 'y': px, 'spatialReference': {'wkid': 3857}})})['histograms'][0]
                break
            except SystemExit as e:
                print(f'  {y}: {px} m refused ({e}); trying coarser')
        km2_per_px = (px * math.cos(math.radians(lat0))) ** 2 / 1e6  # Web Mercator pixels, measured on the ground
        width = (h['max'] - h['min']) / h['size']
        counts[y] = {round(h['min'] + (i + .5) * width): c for i, c in enumerate(h['counts']) if c}
        print(f'  {y}: {sum(counts[y].values())} pixels')

    # 2. The coloured map image, clipped to the boundary, per year.
    pts = [list(merc(lat, lon)) for lat, lon in ring]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    bbox = [min(xs) - 200, min(ys) - 200, max(xs) + 200, max(ys) + 200]
    step = max(10, (max(bbox[2] - bbox[0], bbox[3] - bbox[1]) / 4000))  # the service draws at most about 4,000 pixels a side
    size = f'{round((bbox[2] - bbox[0]) / step)},{round((bbox[3] - bbox[1]) / step)}'
    cmap = [[v] + [int(c[i:i + 2], 16) for i in (1, 3, 5)] for v, *_, c in CLASSES]
    rule = {'rasterFunction': 'Colormap', 'rasterFunctionArguments': {'Colormap': cmap, 'Raster': {
        'rasterFunction': 'Clip', 'rasterFunctionArguments': {'ClippingGeometry': {'rings': [pts], 'spatialReference': {'wkid': 3857}}, 'ClipType': 1}}}}
    bounds = None
    for y in YEARS:
        r = post('exportImage', {'f': 'json', 'bbox': ','.join(map(str, bbox)), 'bboxSR': 3857, 'imageSR': 3857, 'size': size, 'format': 'png32',
                                 'transparent': 'true', 'time': year_span(y), 'interpolation': 'RSP_NearestNeighbor', 'renderingRule': json.dumps(rule)})
        out = REPO / 'src' / 'assets' / 'maps' / f'{key}-landcover-{y}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(r['href'], out)
        e = r['extent']
        bounds = [list(unmerc(e['xmin'], e['ymin'])), list(unmerc(e['xmax'], e['ymax']))]
        print(f'  wrote {out.relative_to(REPO)} ({out.stat().st_size // 1024} KB)')

    write_json(GEO / f'{key}_landcover.json', {
        'provenance': {'dataset': 'Esri | Impact Observatory | Microsoft Sentinel-2 10 m Land Use/Land Cover (annual)', 'service': SERVICE,
                       'license': 'CC BY 4.0', 'method': 'computeHistograms over the upazila boundary at 10 m; exportImage clipped to the boundary',
                       'retrieved': date.today().isoformat()},
        'bounds': bounds, 'years': YEARS,
        'classes': [{'key': k, 'bn': bn, 'en': en, 'color': c, 'km2': {str(y): round(counts[y].get(v, 0) * km2_per_px, 1) for y in YEARS}}
                    for v, k, bn, en, c in CLASSES]})


if __name__ == '__main__':
    main(*sys.argv[1:2])
