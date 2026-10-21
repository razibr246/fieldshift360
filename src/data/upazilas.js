// The upazilas this app covers. Each has its own agriculture officer, unions, NASA climate, soil table and map files;
// a union id belongs to exactly one upazila (see UNIONS in demo.js), so everything else follows from the union.
// Officers: Godagari as set for this demo; Dhamrai from the Dhamrai upazila agriculture office notice of 08-10-2026
// (dae.dhamrai.dhaka.gov.bd). Bounds are boxes around each BBS upazila boundary (src/data/geo/<id>_boundary.json).
export const UPAZILAS = {
  godagari: {
    id: 'godagari',
    name: { bn: 'গোদাগাড়ী', en: 'Godagari', bnIn: 'গোদাগাড়ীতে', bnOf: 'গোদাগাড়ীর' },
    district: { bn: 'রাজশাহী', en: 'Rajshahi' },
    division: { bn: 'রাজশাহী', en: 'Rajshahi' },
    officer: { bn: 'মরিয়ম আহমেদ', en: 'Mariam Ahmed' },
    center: [24.4667, 88.3306],
    bounds: [[24.36, 88.30], [24.61, 88.56]],
    defaultUnion: 'Deopara',
    region: { bn: 'বরেন্দ্র অঞ্চল ও পদ্মার পলি', en: 'Barind Tract and Padma floodplain' },
  },
  dhamrai: {
    id: 'dhamrai',
    name: { bn: 'ধামরাই', en: 'Dhamrai', bnIn: 'ধামরাইয়ে', bnOf: 'ধামরাইয়ের' },
    district: { bn: 'ঢাকা', en: 'Dhaka' },
    division: { bn: 'ঢাকা', en: 'Dhaka' },
    officer: { bn: 'মোঃ ওমর ফারুক', en: 'Md. Omar Faruk' },
    center: [23.93, 90.14],
    bounds: [[23.81, 90.0], [24.05, 90.25]],
    defaultUnion: 'Chauhat',
    region: { bn: 'বংশী ও ধলেশ্বরী নদীর পলি', en: 'Bangshi and Dhaleshwari river floodplain' },
  },
  // The five division story upazilas. Officers: the head of each upazila agriculture office as listed on its DAE
  // portal, read 19 October 2026 (dae.<upazila>.<district>.gov.bd, "কর্মকর্তাবৃন্দ" / "অফিস প্রধান").
  sitakunda: {
    id: 'sitakunda',
    name: { bn: 'সীতাকুণ্ড', en: 'Sitakunda', bnIn: 'সীতাকুণ্ডে', bnOf: 'সীতাকুণ্ডের' },
    district: { bn: 'চট্টগ্রাম', en: 'Chattogram' },
    division: { bn: 'চট্টগ্রাম', en: 'Chattogram' },
    officer: { bn: 'কল্পনা রহমান', en: 'Kalpana Rahman' },
    officerSource: 'https://dae.sitakunda.chittagong.gov.bd/pages/officers',
    center: [22.6167, 91.6667],
    bounds: [[22.36, 91.54], [22.7, 91.8]],
    defaultUnion: 'Saidpur',
    region: { bn: 'পাহাড়ের পাদদেশ আর উপকূলের সমভূমি', en: 'Hill foot and coastal plain' },
  },
  dacope: {
    id: 'dacope',
    name: { bn: 'দাকোপ', en: 'Dacope', bnIn: 'দাকোপে', bnOf: 'দাকোপের' },
    district: { bn: 'খুলনা', en: 'Khulna' },
    division: { bn: 'খুলনা', en: 'Khulna' },
    officer: { bn: 'শিউলি মজুমদার', en: 'Shiuli Majumder' },
    officerSource: 'https://dae.dacope.khulna.gov.bd/pages/officers',
    center: [22.5726, 89.5115],
    bounds: [[21.99, 89.4], [22.66, 89.63]],
    defaultUnion: 'Tildanga',
    region: { bn: 'সুন্দরবনের কিনারে উপকূলের পোল্ডার', en: 'Coastal polders at the edge of the Sundarbans' },
  },
  bakerganj: {
    id: 'bakerganj',
    name: { bn: 'বাকেরগঞ্জ', en: 'Bakerganj', bnIn: 'বাকেরগঞ্জে', bnOf: 'বাকেরগঞ্জের' },
    district: { bn: 'বরিশাল', en: 'Barishal' },
    division: { bn: 'বরিশাল', en: 'Barishal' },
    officer: { bn: 'মোঃ ইছা', en: 'Md. Isa' },
    officerSource: 'https://dae.bakerganj.barisal.gov.bd/pages/officers',
    center: [22.55, 90.3333],
    bounds: [[22.45, 90.19], [22.67, 90.54]],
    defaultUnion: 'Garuria',
    region: { bn: 'জোয়ার-ভাটার নদীর পলি', en: 'Tidal river floodplain' },
  },
  gangachara: {
    id: 'gangachara',
    name: { bn: 'গঙ্গাচড়া', en: 'Gangachara', bnIn: 'গঙ্গাচড়ায়', bnOf: 'গঙ্গাচড়ার' },
    district: { bn: 'রংপুর', en: 'Rangpur' },
    division: { bn: 'রংপুর', en: 'Rangpur' },
    officer: { bn: 'মোঃ রুবেল হুসেন', en: 'Md. Rubel Hussain' },
    officerSource: 'https://dae.gangachara.rangpur.gov.bd/pages/officers',
    center: [25.85, 89.2167],
    bounds: [[25.8, 89.08], [25.97, 89.35]],
    defaultUnion: 'Kolkanda',
    region: { bn: 'তিস্তার পলি আর চর', en: 'Teesta floodplain and chars' },
  },
  gowainghat: {
    id: 'gowainghat',
    name: { bn: 'গোয়াইনঘাট', en: 'Gowainghat', bnIn: 'গোয়াইনঘাটে', bnOf: 'গোয়াইনঘাটের' },
    district: { bn: 'সিলেট', en: 'Sylhet' },
    division: { bn: 'সিলেট', en: 'Sylhet' },
    officer: { bn: 'রায়হান পারভেজ রনি', en: 'Rayhan Parvez Rony' },
    officerSource: 'http://dae.gowainghat.sylhet.gov.bd/pages/officers',
    center: [25.105, 91.967],
    bounds: [[24.95, 91.8], [25.19, 92.13]],
    defaultUnion: 'Rustampur',
    region: { bn: 'হাওর আর পাহাড়ি টিলা', en: 'Haor basin and hill tilas' },
  },
};
export const UPAZILA_IDS = Object.keys(UPAZILAS);

// "গোদাগাড়ী উপজেলা, রাজশাহী জেলা, রাজশাহী বিভাগ" / "Godagari upazila, Rajshahi district, Rajshahi division"
export const placeLine = (u, lang) => (lang === 'bn'
  ? `${u.name.bn} উপজেলা, ${u.district.bn} জেলা, ${u.division.bn} বিভাগ`
  : `${u.name.en} upazila, ${u.district.en} district, ${u.division.en} division`);

// Which upazila's box holds this point (used by maps that only know a position); Godagari when none does.
export function upazilaAt(lat, lon) {
  const u = Object.values(UPAZILAS).find(({ bounds: [[a, b], [c, d]] }) => lat >= a && lat <= c && lon >= b && lon <= d);
  return (u ?? UPAZILAS.godagari).id;
}
