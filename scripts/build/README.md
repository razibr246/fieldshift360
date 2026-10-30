# Data build scripts

These rebuild the geographic data files in `src/data/geo/` and the land-use images in `src/assets/maps/` from their
public sources. They use only the Python standard library; raw downloads are kept in `.cache/data/` (git-ignored)
so a second run is fast. Each script reproduces the committed file exactly (apart from the retrieval date).

    npm run data:build          # everything, Godagari then Dhamrai, in order

The three upazila scripts take the upazila as an argument (`godagari` when left out, or `dhamrai`), e.g.
`python3 scripts/build/build_godagari_places.py dhamrai`.

| Script | Writes | Sources |
| --- | --- | --- |
| `build_godagari_boundary.py [upazila]` | `<upazila>_boundary.json` | geoBoundaries BGD ADM3 (BBS / OCHA ROAP 2020) |
| `build_godagari_places.py [upazila]` | `<upazila>_places.json` | geoBoundaries BGD ADM4 (unions, municipalities); GeoNames Bangladesh (villages) |
| `build_godagari_landcover.py [upazila]` | `<upazila>_landcover.json`, `<upazila>-landcover-2017.png`, `-2025.png` | Esri / Impact Observatory / Microsoft Sentinel-2 10 m land cover (queried live) |
| `build_bangladesh_crops.py` | `bangladesh_crops.json` | BBS Yearbook of Agricultural Statistics 2023 via deluair/bangladesh-rice-seasons; FAOSTAT bulk; geoBoundaries BGD ADM2 |
| `build_field_watch.py [--end YYYY-MM-DD]` | `src/data/fields/field_watch.json`, `src/assets/fields/<parcel>-{tc.jpg,ndvi.png}` | Copernicus Sentinel-2 L2A via Microsoft Planetary Computer (STAC + data API, no key), for every field in `src/data/fields/parcels.json` |
| `build_soil.py` | `src/data/soil/soil_godagari.json`, `soil_dhamrai.json`, `soil_fields.json` | ISRIC SoilGrids 2.0 (250 m, top 30 cm, with 5–95% ranges and WRB soil group) at every union centre and registered field; ~15 min (5 requests a minute) |
| `build_srdi_frs.mjs [upazila]` | `src/data/soil/srdi_frs.json` | SRDI Fertilizer Recommendation System (frs-bd.com): the dose per bigha for each union, land type and Rabi crop, from SRDI's union soil tests; drives the site in headless Chrome (needs Google Chrome); about 4 minutes a union |
| `build_price_seasons.py` | `src/data/market/price_seasons.json` | DAM market portal (monthly national prices, needs a session and CSRF token, cached in `.cache/data/dam/`); FAOSTAT bulk yields |
| `build_abroad_prices.py` | `src/data/market/abroad_prices.json` | FAOSTAT Prices bulk file (Asia, `curl -o .cache/data/Prices_E_Asia.zip https://bulks-faostat.fao.org/production/Prices_E_Asia.zip`): producer prices for the five neighbouring countries' rotation crops, an old price carried to 2022–2024 by the producer price index |

The boundary comes first: places and land cover read it. `_common.py` holds the shared download cache and the
geometry helpers (geodesic area, point-in-polygon, Douglas-Peucker for closed rings).

NASA climate data is separate: `npm run fetch:power` (`scripts/fetch/power.mjs`); for Dhamrai,
`npm run fetch:power -- --upazila dhamrai --lat 23.93 --lon 90.14 --end 20261015`.
