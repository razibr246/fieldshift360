"""Unions, municipalities and named places inside an upazila -> src/data/geo/<upazila>_places.json

Sources: union/municipality outlines from geoBoundaries gbOpen BGD ADM4 (BBS / OCHA ROAP 2020, CC BY 3.0 IGO);
villages, stations, beels and localities from the GeoNames Bangladesh gazetteer (CC BY 4.0, romanised names).
Needs <upazila>_boundary.json first.
    python3 scripts/build/build_godagari_places.py            # Godagari
    python3 scripts/build/build_godagari_places.py dhamrai    # Dhamrai (also savar, keraniganj, dohar, nawabganj)
"""
import io
import json
import re
import sys
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import GEO, fetch, geoboundaries, inside, write_json

BN = {'Basudebpur': 'বাসুদেবপুর', 'Char Ashariadaha': 'চর আষাড়িয়াদহ', 'Deopara': 'দেওপাড়া', 'Godagari': 'গোদাগাড়ী',
      'Godagari Paurashava': 'গোদাগাড়ী পৌরসভা', 'Gogram': 'গোগ্রাম', 'Kakanhat Paurashava': 'কাঁকনহাট পৌরসভা',
      'Matikata': 'মাটিকাটা', 'Mohanpur': 'মোহনপুর', 'Pakri': 'পাকড়ী', 'Rishikul': 'ঋষিকুল',
      # Dhamrai: 16 unions and one municipality (Banglapedia; Bangla spellings from dhamrai.dhaka.gov.bd)
      'Amta': 'আমতা', 'Baisakanda': 'বাইশাকান্দা', 'Balia': 'বালিয়া', 'Bhararia': 'ভাড়ারিয়া', 'Chauhat': 'চৌহাট',
      'Dhamrai': 'ধামরাই', 'Dhamrai Paurashava': 'ধামরাই পৌরসভা', 'Gangutia': 'গাংগুটিয়া', 'Jadabpur': 'যাদবপুর',
      'Kulla': 'কুল্লা', 'Kushura': 'কুশুরা', 'Nannar': 'নান্নার', 'Rowail': 'রোয়াইল', 'Sanora': 'সানোড়া',
      'Sombhag': 'সোমভাগ', 'Suapur': 'সূয়াপুর', 'Suti Para': 'সূতিপাড়া',
      # The other Dhaka district upazilas, for Ropan Radar (Banglapedia union lists; Bangla spellings as on the
      # union portals of dhaka.gov.bd). geoBoundaries' "(part)" suffix is dropped from the names.
      'Amin Bazar': 'আমিনবাজার', 'Ashulia': 'আশুলিয়া', 'Banagram': 'বনগাঁও', 'Bhakurta': 'ভাকুর্তা', 'Biralia': 'বিরুলিয়া',
      'Dhamsana': 'ধামসোনা', 'Kaundia': 'কাউন্দিয়া', 'Pathalia': 'পাথালিয়া', 'Savar': 'সাভার', 'Savar Paurashava': 'সাভার পৌরসভা',
      'Shimulia': 'শিমুলিয়া', 'Tetuljhora': 'তেঁতুলঝোড়া', 'Yearpur': 'ইয়ারপুর',
      'Aganagar': 'আগানগর', 'Basta': 'বাস্তা', 'Hazratpur': 'হযরতপুর', 'Kalatia': 'কলাতিয়া', 'Kalindi': 'কালিন্দী', 'Konda': 'কোন্ডা',
      'Ruhitpur': 'রোহিতপুর', 'Sakta': 'শাক্তা', 'Subhadya': 'শুভাড্যা', 'Taranagar': 'তারানগর', 'Tegharia': 'তেঘরিয়া', 'Zinjira': 'জিনজিরা',
      'Bilaspur': 'বিলাসপুর', 'Dohar Paurashava': 'দোহার পৌরসভা', 'Kushumhati': 'কুসুমহাটি', 'Mahmudpur': 'মাহমুদপুর',
      'Muksudpur': 'মুকসুদপুর', 'Narisha': 'নারিশা', 'Nayabari': 'নয়াবাড়ী', 'Roypara': 'রাইপাড়া', 'Sutar Para': 'সুতারপাড়া',
      'Agla': 'আগলা', 'Bakshanagar': 'বক্সনগর', 'Bandura': 'বান্দুরা', 'Barrah': 'বাহ্রা', 'Baruakhali': 'বারুয়াখালী', 'Churain': 'চুড়াইন',
      'Galimpur': 'গালিমপুর', 'Jantrail': 'যন্ত্রাইল', 'Joykrishnapur': 'জয়কৃষ্ণপুর', 'Kailail': 'কৈলাইল', 'Kalakopa': 'কলাকোপা',
      'Nayansree': 'নয়নশ্রী', 'Shikari Para': 'শিকারীপাড়া', 'Sholla': 'শোল্লা',
      # The five division story upazilas (Bangla spellings from the union articles of bn.wikipedia.org).
      'Banshbaria': 'বাঁশবাড়িয়া', 'Barabkunda': 'বাড়বকুণ্ড', 'Bariadyala': 'বারৈয়াঢালা', 'Bhatiari': 'ভাটিয়ারী', 'Kumira': 'কুমিরা',
      'Muradpur': 'মুরাদপুর', 'Saidpur': 'সৈয়দপুর', 'Salimpur': 'সলিমপুর', 'Sitakunda Paurashava': 'সীতাকুণ্ড পৌরসভা', 'Sonaichhari': 'সোনাইছড়ি',
      'Bajua': 'বাজুয়া', 'Banishanta': 'বানিশান্তা', 'Chalna Paurashava': 'চালনা পৌরসভা', 'Dacope': 'দাকোপ', 'Kailasganj': 'কৈলাশগঞ্জ',
      'Kamarkhola': 'কামারখোলা', 'Laudubi': 'লাউডোব', 'Pankhali': 'পানখালী', 'Sutarkhali': 'সুতারখালী', 'Tildanga': 'তিলডাঙ্গা',
      'Bhar Pasha': 'ভরপাশা', 'Char Amaddi': 'চরামদ্দি', 'Charadi': 'চরাদি', 'Darial': 'দাড়িয়াল', 'Dudhal': 'দুধল', 'Faridpur': 'ফরিদপুর',
      'Garuria': 'গারুড়িয়া', 'Kabai': 'কবাই', 'Kalaskati': 'কলসকাঠী', 'Nalua': 'নলুয়া', 'Niamati': 'নিয়ামতি', 'Padri Shibpur': 'পাদ্রি শিবপুর',
      'Bakerganj Paurashava': 'বাকেরগঞ্জ পৌরসভা', 'Rangasree': 'রঙ্গশ্রী',
      'Alam Biditar': 'আলমবিদিতর', 'Barabil': 'বড়বিল', 'Betgari': 'বেতগাড়ী', 'Gajaghanta': 'গজঘণ্টা', 'Gangachara': 'গংগাচড়া', 'Khaleya': 'খলেয়া',
      'Kolkanda': 'কোলকোন্দ', 'Lakshmitari': 'লক্ষীটারী', 'Marania': 'মর্নেয়া', 'Nohali': 'নোহালী',
      'Alirgaon': 'আলীরগাঁও', 'Fatehpur': 'ফতেপুর', 'Lengura': 'লেঙ্গুড়া', 'Nandirgaon': 'নন্দিরগাঁও', 'Paschim Jaflong': 'পশ্চিম জাফলং',
      'Purba Jaflong': 'পূর্ব জাফলং', 'Rustampur': 'রুস্তমপুর', 'Towakul': 'তোয়াকুল'}
# geoBoundaries leaves Bakerganj's municipality unnamed; the Sundarbans forest range inside Dacope is not a union.
UNNAMED_TOWN = {'bakerganj': 'Bakerganj Paurashava'}
NOT_UNIONS = {'Khulna Range'}
KIND = {'PPL': 'village', 'PPLX': 'village', 'RSTN': 'station', 'LCTY': 'locality', 'WTLD': 'water', 'STM': 'water', 'ISL': 'char'}


def centroid(r):
    a = cx = cy = 0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        k = x1 * y2 - x2 * y1
        a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k
    return cx / (3 * a), cy / (3 * a)


def main(key='godagari'):
    up = [(lon, lat) for lat, lon in json.loads((GEO / f'{key}_boundary.json').read_text(encoding='utf-8'))['ring']]
    lon0, lon1 = min(p[0] for p in up), max(p[0] for p in up)
    lat0, lat1 = min(p[1] for p in up), max(p[1] for p in up)
    unions = []
    for f in geoboundaries('ADM4', simplified=True)['features']:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        outer = max((p[0] for p in polys), key=len)
        cx, cy = centroid(outer)
        if not inside(cx, cy, up):
            continue
        n = re.sub(r' \((?:part|Part)\)$', '', f['properties']['shapeName'])
        if n == 'Paurashava':
            n = UNNAMED_TOWN.get(key, n)
        if n in NOT_UNIONS:
            continue
        unions.append({'en': n.replace(' Paurashava', ' Municipality'), 'bn': BN[n], 'town': 'Paurashava' in n,
                       'label': [round(cy, 5), round(cx, 5)], 'ring': [[round(y, 5), round(x, 5)] for x, y in outer]})

    rows = zipfile.ZipFile(fetch('https://download.geonames.org/export/dump/BD.zip', 'BD.zip')).read('BD.txt').decode('utf-8')
    places = []
    for line in io.StringIO(rows):
        f = line.rstrip('\n').split('\t')
        lat, lon = float(f[4]), float(f[5])
        if not (lat0 < lat < lat1 and lon0 < lon < lon1) or not inside(lon, lat, up):
            continue
        k = KIND.get(f[7])
        if not k:
            continue
        u = next((x['en'] for x in unions if inside(lon, lat, [(p[1], p[0]) for p in x['ring']])), None)
        places.append({'n': f[2], 'k': k, 'p': [round(lat, 5), round(lon, 5)], 'u': u})
    for x in unions:
        x['villages'] = sum(1 for p in places if p['u'] == x['en'] and p['k'] == 'village')

    write_json(GEO / f'{key}_places.json', {
        'provenance': {
            'unions': 'geoBoundaries gbOpen BGD ADM4 (simplified), source: Bangladesh Bureau of Statistics (BBS) / OCHA ROAP, 2020, CC BY 3.0 IGO',
            'places': 'GeoNames Bangladesh gazetteer (download.geonames.org/export/dump/BD.zip), CC BY 4.0; names are GeoNames romanisations',
            'retrieved': date.today().isoformat()},
        'unions': unions, 'places': places})
    print(f'  {len(unions)} unions/municipalities, {sum(p["k"] == "village" for p in places)} villages')


if __name__ == '__main__':
    main(*sys.argv[1:2])
