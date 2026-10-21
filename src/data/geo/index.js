// Boundary and places for each upazila the app covers (built by scripts/data/build_godagari_*.py <upazila>).
// Savar, Keraniganj, Dohar and Nawabganj are here for Ropan Radar, which shows every Dhaka district upazila in depth.
import godagariBoundary from './godagari_boundary.json';
import godagariPlaces from './godagari_places.json';
import dhamraiBoundary from './dhamrai_boundary.json';
import dhamraiPlaces from './dhamrai_places.json';
import savarBoundary from './savar_boundary.json';
import savarPlaces from './savar_places.json';
import keraniganjBoundary from './keraniganj_boundary.json';
import keraniganjPlaces from './keraniganj_places.json';
import doharBoundary from './dohar_boundary.json';
import doharPlaces from './dohar_places.json';
import nawabganjBoundary from './nawabganj_boundary.json';
import nawabganjPlaces from './nawabganj_places.json';
// The five division story upazilas.
import sitakundaBoundary from './sitakunda_boundary.json';
import sitakundaPlaces from './sitakunda_places.json';
import dacopeBoundary from './dacope_boundary.json';
import dacopePlaces from './dacope_places.json';
import bakerganjBoundary from './bakerganj_boundary.json';
import bakerganjPlaces from './bakerganj_places.json';
import gangacharaBoundary from './gangachara_boundary.json';
import gangacharaPlaces from './gangachara_places.json';
import gowainghatBoundary from './gowainghat_boundary.json';
import gowainghatPlaces from './gowainghat_places.json';

// Ropon Radar's other upazilas (every rural upazila of the seven districts) have light maps in ./radar/, built by
// scripts/data/build_radar_geo.py and fetched only when the radar page opens one (loadGeo adds it to GEO).
const RADAR_GEO = import.meta.glob('./radar/*.json', { import: 'default' });
const RADAR_GEO_IDS = new Set(Object.keys(RADAR_GEO).map((k) => k.slice('./radar/'.length, -'.json'.length)));
export const hasGeo = (id) => !!GEO[id] || RADAR_GEO_IDS.has(id);
export function loadGeo(id) {
  if (GEO[id]) return Promise.resolve(GEO[id]);
  const f = RADAR_GEO[`./radar/${id}.json`];
  return f ? f().then((j) => (GEO[id] = { boundary: j.boundary, places: j.places, lite: true })) : Promise.reject(new Error(`no map for ${id}`));
}

export const GEO = {
  godagari: { boundary: godagariBoundary, places: godagariPlaces },
  dhamrai: { boundary: dhamraiBoundary, places: dhamraiPlaces },
  savar: { boundary: savarBoundary, places: savarPlaces },
  keraniganj: { boundary: keraniganjBoundary, places: keraniganjPlaces },
  dohar: { boundary: doharBoundary, places: doharPlaces },
  nawabganj: { boundary: nawabganjBoundary, places: nawabganjPlaces },
  sitakunda: { boundary: sitakundaBoundary, places: sitakundaPlaces },
  dacope: { boundary: dacopeBoundary, places: dacopePlaces },
  bakerganj: { boundary: bakerganjBoundary, places: bakerganjPlaces },
  gangachara: { boundary: gangacharaBoundary, places: gangacharaPlaces },
  gowainghat: { boundary: gowainghatBoundary, places: gowainghatPlaces },
};
