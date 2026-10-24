"""Bangladesh, season by season -> src/data/geo/bangladesh_crops.json

District rice by season: BBS Yearbook of Agricultural Statistics 2023 ("Total" Aus / Aman / Boro tables, 2022-23),
as extracted and checked against the printed national totals in github.com/deluair/bangladesh-rice-seasons (MIT).
National crop areas: FAOSTAT Production_Crops_Livestock bulk file, Bangladesh, area harvested, latest year (CC BY 4.0).
District outlines: geoBoundaries gbOpen BGD ADM2 (BBS / OCHA ROAP 2020), projected to SVG paths for the home page map.
    python3 scripts/build/build_bangladesh_crops.py
"""
import csv
import io
import math
import sys
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import GEO, fetch, geoboundaries, ring_area_m2, simplify_ring, write_json

RICE = 'https://raw.githubusercontent.com/deluair/bangladesh-rice-seasons/main'
FAO = 'https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_Asia.zip'
BN = {'Bagerhat':'বাগেরহাট','Bandarban':'বান্দরবান','Barguna':'বরগুনা','Barishal':'বরিশাল','Bhola':'ভোলা','Bogura':'বগুড়া','Brahmanbaria':'ব্রাহ্মণবাড়িয়া','Chandpur':'চাঁদপুর','Chapai Nawabganj':'চাঁপাইনবাবগঞ্জ','Chattogram':'চট্টগ্রাম','Chuadanga':'চুয়াডাঙ্গা','Cox’s Bazar':'কক্সবাজার','Cumilla':'কুমিল্লা','Dhaka':'ঢাকা','Dinajpur':'দিনাজপুর','Faridpur':'ফরিদপুর','Feni':'ফেনী','Gaibandha':'গাইবান্ধা','Gazipur':'গাজীপুর','Gopalganj':'গোপালগঞ্জ','Habiganj':'হবিগঞ্জ','Jamalpur':'জামালপুর','Jashore':'যশোর','Jhallokati':'ঝালকাঠি','Jhenaidah':'ঝিনাইদহ','Joypurhat':'জয়পুরহাট','Khagrachari':'খাগড়াছড়ি','Khulna':'খুলনা','Kishoreganj':'কিশোরগঞ্জ','Kurigram':'কুড়িগ্রাম','Kushtia':'কুষ্টিয়া','Lakshmipur':'লক্ষ্মীপুর','Lalmonirhat':'লালমনিরহাট','Madaripur':'মাদারীপুর','Magura':'মাগুরা','Manikganj':'মানিকগঞ্জ','Meherpur':'মেহেরপুর','Moulvibazar':'মৌলভীবাজার','Munshiganj':'মুন্সিগঞ্জ','Mymensingh':'ময়মনসিংহ','Naogaon':'নওগাঁ','Narail':'নড়াইল','Narayanganj':'নারায়ণগঞ্জ','Narsingdi':'নরসিংদী','Natore':'নাটোর','Netrokona':'নেত্রকোণা','Nilphamari':'নীলফামারী','Noakhali':'নোয়াখালী','Pabna':'পাবনা','Panchagar':'পঞ্চগড়','Patuakhali':'পটুয়াখালী','Pirojpur':'পিরোজপুর','Rajbari':'রাজবাড়ী','Rajshahi':'রাজশাহী','Rangamati':'রাঙ্গামাটি','Rangpur':'রংপুর','Satkhira':'সাতক্ষীরা','Shariatpur':'শরীয়তপুর','Sherpur':'শেরপুর','Sirajganj':'সিরাজগঞ্জ','Sunamganj':'সুনামগঞ্জ','Sylhet':'সিলেট','Tangail':'টাঙ্গাইল','Thakurgaon':'ঠাকুরগাঁও'}
EN_FIX = {'Panchagar': 'Panchagarh', 'Cox\u2019s Bazar': "Cox's Bazar"}
TOTAL = {'Aus': 'TOTAL=LOCAL + HYV', 'Aman': 'Total Aman', 'Boro': 'Total Boro'}
# Season of each national crop (FAO gives whole-year totals; the season is where most of the crop is grown).
CROPS = {
    'kharif1': [('jute', 'পাট', 'Jute', 'Jute, raw or retted'), ('sesame', 'তিল', 'Sesame', 'Sesame seed')],
    'rabi': [('maize', 'ভুট্টা', 'Maize', 'Maize (corn)'), ('mustard', 'সরিষা', 'Mustard', 'Rape or colza seed'), ('potato', 'আলু', 'Potato', 'Potatoes'),
             ('wheat', 'গম', 'Wheat', 'Wheat'), ('onion', 'পেঁয়াজ', 'Onion', 'Onions and shallots, dry (excluding dehydrated)'),
             ('lentil', 'মসুর ডাল', 'Lentil', 'Lentils, dry'), ('chilli', 'মরিচ', 'Chilli', 'Chillies and peppers, dry (Capsicum spp., Pimenta spp.), raw'),
             ('garlic', 'রসুন', 'Garlic', 'Green garlic'), ('groundnut', 'চিনাবাদাম', 'Groundnut', 'Groundnuts, excluding shelled'), ('tomato', 'টমেটো', 'Tomato', 'Tomatoes')],
}
# SVG projection for the home page map: equirectangular at 23.7 N, 600 units wide.
LON0, LAT1, COS = 88.0, 26.65, math.cos(math.radians(23.7))
K = 600 / ((92.7 - LON0) * COS)
proj = lambda lon, lat: (round((lon - LON0) * COS * K, 1), round((LAT1 - lat) * K, 1))


def fao_areas():
    z = zipfile.ZipFile(fetch(FAO, 'Production_Crops_Livestock_E_Asia.zip'))
    name = next(n for n in z.namelist() if n.endswith('_Asia_NOFLAG.csv'))
    rows = list(csv.DictReader(io.TextIOWrapper(z.open(name), encoding='latin-1')))
    year = max(c for c in rows[0] if c.startswith('Y') and c[1:].isdigit())
    got = {r['Item']: float(r[year]) for r in rows if r['Area'] == 'Bangladesh' and r['Element'] == 'Area harvested' and r[year]}
    return year[1:], got


def main():
    names = {r['geoboundaries_district']: r['bbs_district'] for r in csv.DictReader(io.StringIO(fetch(f'{RICE}/results/district_name_map.csv', 'district_name_map.csv').read_text(encoding='utf-8')))}
    rice = {}
    for r in csv.DictReader(io.StringIO(fetch(f'{RICE}/data/bbs/district_rice_area.csv', 'district_rice_area.csv').read_text(encoding='utf-8'))):
        if r['year'] == '2022-23' and TOTAL[r['season']] in r['table_title']:
            rice.setdefault(r['district'], {})[r['season'].lower()] = int(float(r['area_ha']))
    assert len(rice) == 64 and all(len(v) == 3 for v in rice.values()), len(rice)
    nat = {s: sum(v[s] for v in rice.values()) for s in ('aus', 'aman', 'boro')}
    fao_year, fao = fao_areas()
    print(f'  BBS 2022-23 rice ha {nat}; FAO year {fao_year}')

    out = []
    for f in geoboundaries('ADM2', simplified=True)['features']:
        bbs = names[f['properties']['shapeName']]
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        area_ha = sum(ring_area_m2(p[0]) - sum(ring_area_m2(h) for h in p[1:]) for p in polys) / 1e4
        d = []
        for p in polys:
            if ring_area_m2(p[0]) < 1.5e6:  # drop specks under 1.5 km2 (sand bars, tiny islands)
                continue
            s = simplify_ring(p[0], 0.002)
            if len(s) < 4:
                continue
            d.append('M' + 'L'.join(f'{x:g},{y:g}' for x, y in (proj(*q) for q in s)) + 'Z')
        out.append({'id': bbs, 'en': EN_FIX.get(bbs, bbs), 'bn': BN[bbs], 'areaHa': round(area_ha), 'rice': rice[bbs], 'd': ''.join(d)})

    src = f'FAO {fao_year}'
    national = {
        'kharif2': [{'key': 'aman', 'bn': 'আমন ধান', 'en': 'Aman rice', 'ha': nat['aman'], 'src': 'BBS 2022-23'}],
        'kharif1': [{'key': 'aus', 'bn': 'আউশ ধান', 'en': 'Aus rice', 'ha': nat['aus'], 'src': 'BBS 2022-23'}]
                   + [{'key': k, 'bn': b, 'en': e, 'ha': round(fao[item]), 'src': src} for k, b, e, item in CROPS['kharif1']],
        'rabi': [{'key': 'boro', 'bn': 'বোরো ধান', 'en': 'Boro rice', 'ha': nat['boro'], 'src': 'BBS 2022-23'}]
                + [{'key': k, 'bn': b, 'en': e, 'ha': round(fao[item]), 'src': src} for k, b, e, item in CROPS['rabi']],
    }
    write_json(GEO / 'bangladesh_crops.json', {
        'provenance': {
            'districtRice': 'Bangladesh Bureau of Statistics, Yearbook of Agricultural Statistics 2023 — district Total Aus / Total Aman / Total Boro tables for 2022-23, as extracted and checked against the printed national totals in github.com/deluair/bangladesh-rice-seasons (data/bbs/district_rice_area.csv, MIT)',
            'nationalCrops': f'FAOSTAT Production_Crops_Livestock, Bangladesh, area harvested {fao_year} (bulks-faostat.fao.org, CC BY 4.0)',
            'boundaries': 'geoBoundaries gbOpen BGD ADM2 (simplified), BBS / OCHA ROAP 2020, CC BY 3.0 IGO',
            'retrieved': date.today().isoformat()},
        'viewBox': [600, round((LAT1 - 20.55) * K)], 'national': national, 'districts': sorted(out, key=lambda x: x['en'])})


if __name__ == '__main__':
    main()
