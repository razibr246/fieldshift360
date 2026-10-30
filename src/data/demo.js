// DEMO data generator (seeded, deterministic). Every value here is synthetic and labelled "Demo" in the UI.
// Union names and outlines are real (BBS via geoBoundaries); farmers, plots, plans and requests are made up.
import { ymd, addDays, monthOf } from '../engine/dates.js';
import { UPAZILAS } from './upazilas.js';
import { PROBLEM_NAMES } from './crop_problems.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_TODAY = ymd(2027, 1, 12); // the in-season "today" used by the demo (and by the tests)
// Which farm season the seeded requests describe: September to November is the standing Aman (Kharif-2) with the
// Rabi still to sow; otherwise the Rabi problems of mid-January. The app passes the real date, so the officer's
// inbox matches what is in the fields that week.
export const requestSeason = (today) => (monthOf(today) >= 9 && monthOf(today) <= 11 ? 'aman' : 'rabi');

// Every union and municipality (pourashava) of each upazila. Centres are the most interior point of each area's
// BBS boundary (src/data/geo/<upazila>_places.json); `spread` shrinks the farm scatter for narrow areas so the demo farms
// stay inside their own boundary. Municipalities are divided into wards instead of villages.
const GODAGARI_AREAS = [
  { id: 'Deopara', en: 'Deopara', bn: 'দেওপাড়া', kind: 'union', lat: 24.4162, lon: 88.4910, n: 50,
    mix: { tomato: 0.58, boro: 0.22, wheat: 0.08, lentil: 0.05, mustard: 0.07 } },
  { id: 'Pakri', en: 'Pakri', bn: 'পাকড়ী', kind: 'union', lat: 24.5531, lon: 88.4543, n: 40,
    mix: { tomato: 0.55, boro: 0.25, wheat: 0.08, lentil: 0.04, mustard: 0.08 } },
  { id: 'Rishikul', en: 'Rishikul', bn: 'ঋষিকুল', kind: 'union', lat: 24.5227, lon: 88.5180, n: 40,
    mix: { tomato: 0.30, boro: 0.40, wheat: 0.12, lentil: 0.06, mustard: 0.12 } },
  { id: 'Char Ashariadaha', en: 'Char Ashariadaha', bn: 'চর আষাড়িয়াদহ', kind: 'union', lat: 24.4113, lon: 88.3416, n: 30,
    mix: { tomato: 0.25, boro: 0.10, wheat: 0.20, lentil: 0.30, mustard: 0.15 } },
  { id: 'Mohanpur', en: 'Mohanpur', bn: 'মোহনপুর', kind: 'union', lat: 24.5525, lon: 88.3728, n: 45,
    mix: { tomato: 0.35, boro: 0.35, wheat: 0.12, lentil: 0.06, mustard: 0.12 } },
  { id: 'Gogram', en: 'Gogram', bn: 'গোগ্রাম', kind: 'union', lat: 24.4505, lon: 88.4380, n: 40,
    mix: { tomato: 0.40, boro: 0.30, wheat: 0.12, lentil: 0.06, mustard: 0.12 } },
  { id: 'Matikata', en: 'Matikata', bn: 'মাটিকাটা', kind: 'union', lat: 24.4387, lon: 88.3877, n: 35,
    mix: { tomato: 0.45, boro: 0.28, wheat: 0.10, lentil: 0.07, mustard: 0.10 } },
  { id: 'Godagari', en: 'Godagari', bn: 'গোদাগাড়ী', kind: 'union', lat: 24.4823, lon: 88.3719, n: 35, spread: 0.85,
    mix: { tomato: 0.35, boro: 0.30, wheat: 0.15, lentil: 0.10, mustard: 0.10 } },
  { id: 'Basudebpur', en: 'Basudebpur', bn: 'বাসুদেবপুর', kind: 'union', lat: 24.5132, lon: 88.3239, n: 30, spread: 0.6,
    mix: { tomato: 0.30, boro: 0.30, wheat: 0.15, lentil: 0.15, mustard: 0.10 } },
  { id: 'Godagari Municipality', en: 'Godagari Municipality', bn: 'গোদাগাড়ী পৌরসভা', kind: 'pourashava', lat: 24.4693, lon: 88.3354, n: 15, spread: 0.8,
    mix: { tomato: 0.40, boro: 0.30, wheat: 0.10, lentil: 0.10, mustard: 0.10 } },
  { id: 'Kakanhat Municipality', en: 'Kakanhat Municipality', bn: 'কাঁকনহাট পৌরসভা', kind: 'pourashava', lat: 24.5137, lon: 88.4708, n: 15, spread: 0.6,
    mix: { tomato: 0.35, boro: 0.35, wheat: 0.10, lentil: 0.05, mustard: 0.15 } },
];

// Dhamrai (Dhaka): 16 unions and one municipality (Banglapedia; Bangla names as on dhamrai.dhaka.gov.bd). `spread` is
// the radius of the largest circle inside each union's boundary over the 0.02° farm scatter, so farms stay inside.
// Crop mix [DEMO]: Dhamrai grows mostly paddy, mustard and vegetables (Banglapedia), and the upazila agriculture office
// reports rice falling and mustard, wheat and vegetables rising as land is lost to factories (Prothom Alo, Dec 2025).
// Mustard then Boro is the usual Rabi sequence on these Bangshi-Dhaleshwari floodplain fields; the factory belt on the
// Dhaka-Aricha road in the east grows more vegetables.
const DH_WEST = { boro: 0.40, mustard: 0.34, tomato: 0.10, wheat: 0.08, lentil: 0.08 };
const DH_MID = { boro: 0.38, mustard: 0.30, tomato: 0.14, wheat: 0.10, lentil: 0.08 };
const DH_EAST = { boro: 0.34, mustard: 0.24, tomato: 0.24, wheat: 0.12, lentil: 0.06 };
// Chauhat's farms sit around its two GeoNames villages, Chauhat and Nikla (real positions).
const CHAUHAT_VILLAGES = [
  { en: 'Chauhat', bn: 'চৌহাট', lat: 24.0233, lon: 90.0760 },
  { en: 'Nikla', bn: 'নিকলা', lat: 24.0091, lon: 90.0315 },
];
const DHAMRAI_AREAS = [
  { id: 'Chauhat', en: 'Chauhat', bn: 'চৌহাট', kind: 'union', lat: 24.0170, lon: 90.0429, n: 30, villages: CHAUHAT_VILLAGES, mix: DH_WEST },
  { id: 'Amta', en: 'Amta', bn: 'আমতা', kind: 'union', lat: 23.9781, lon: 90.0537, n: 20, spread: 0.5, mix: DH_WEST },
  { id: 'Balia', en: 'Balia', bn: 'বালিয়া', kind: 'union', lat: 23.9893, lon: 90.0756, n: 22, spread: 0.64, mix: DH_WEST },
  { id: 'Gangutia', en: 'Gangutia', bn: 'গাংগুটিয়া', kind: 'union', lat: 23.9458, lon: 90.0797, n: 22, spread: 0.64, mix: DH_WEST },
  { id: 'Jadabpur', en: 'Jadabpur', bn: 'যাদবপুর', kind: 'union', lat: 24.0041, lon: 90.1110, n: 22, spread: 0.66, mix: DH_MID },
  { id: 'Baisakanda', en: 'Baisakanda', bn: 'বাইশাকান্দা', kind: 'union', lat: 24.0048, lon: 90.1520, n: 22, spread: 0.69, mix: DH_MID },
  { id: 'Kushura', en: 'Kushura', bn: 'কুশুরা', kind: 'union', lat: 23.9729, lon: 90.1239, n: 22, spread: 0.56, mix: DH_MID },
  { id: 'Sanora', en: 'Sanora', bn: 'সানোড়া', kind: 'union', lat: 23.9416, lon: 90.1143, n: 20, spread: 0.56, mix: DH_MID },
  { id: 'Suti Para', en: 'Suti Para', bn: 'সূতিপাড়া', kind: 'union', lat: 23.9172, lon: 90.1286, n: 22, spread: 0.68, mix: DH_MID },
  { id: 'Suapur', en: 'Suapur', bn: 'সূয়াপুর', kind: 'union', lat: 23.8740, lon: 90.1366, n: 20, spread: 0.54, mix: DH_MID },
  { id: 'Nannar', en: 'Nannar', bn: 'নান্নার', kind: 'union', lat: 23.8918, lon: 90.1531, n: 20, spread: 0.6, mix: DH_MID },
  { id: 'Bhararia', en: 'Bhararia', bn: 'ভাড়ারিয়া', kind: 'union', lat: 23.9666, lon: 90.1875, n: 20, spread: 0.54, mix: DH_EAST },
  { id: 'Sombhag', en: 'Sombhag', bn: 'সোমভাগ', kind: 'union', lat: 23.9391, lon: 90.1766, n: 22, spread: 0.67, mix: DH_EAST },
  { id: 'Dhamrai', en: 'Dhamrai', bn: 'ধামরাই', kind: 'union', lat: 23.9362, lon: 90.2037, n: 18, spread: 0.4, mix: DH_EAST },
  { id: 'Kulla', en: 'Kulla', bn: 'কুল্লা', kind: 'union', lat: 23.8773, lon: 90.2094, n: 24, spread: 1, mix: DH_EAST },
  { id: 'Rowail', en: 'Rowail', bn: 'রোয়াইল', kind: 'union', lat: 23.8423, lon: 90.1829, n: 22, spread: 0.9, mix: DH_MID },
  { id: 'Dhamrai Municipality', en: 'Dhamrai Municipality', bn: 'ধামরাই পৌরসভা', kind: 'pourashava', lat: 23.9163, lon: 90.2113, n: 12, spread: 0.4,
    wards: 9, mix: DH_EAST },
];
// The five division story upazilas: every union and municipality with its most interior point (geo/<id>_places.json).
// Crop mix [DEMO], within the five Rabi crops the planner covers: vegetables and Boro on Sitakunda's coastal plain,
// little Boro on Dacope's salty polders, Boro and pulses on Bakerganj's tidal land, wheat and mustard on the Teesta
// floodplain, and haor Boro in Gowainghat.
const SIT_MIX = { tomato: 0.35, boro: 0.35, mustard: 0.1, lentil: 0.1, wheat: 0.1 };
const DAC_MIX = { boro: 0.3, tomato: 0.2, mustard: 0.2, lentil: 0.15, wheat: 0.15 };
const BAK_MIX = { boro: 0.45, lentil: 0.15, mustard: 0.15, tomato: 0.15, wheat: 0.1 };
const GAN_MIX = { boro: 0.35, wheat: 0.2, mustard: 0.2, tomato: 0.15, lentil: 0.1 };
const GOW_MIX = { boro: 0.7, mustard: 0.1, tomato: 0.1, lentil: 0.05, wheat: 0.05 };
const SITAKUNDA_AREAS = [
  { id: "Banshbaria", en: "Banshbaria", bn: "বাঁশবাড়িয়া", kind: 'union', lat: 22.55142, lon: 91.69771, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Barabkunda", en: "Barabkunda", bn: "বাড়বকুণ্ড", kind: 'union', lat: 22.57392, lon: 91.67301, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Bariadyala", en: "Bariadyala", bn: "বারৈয়াঢালা", kind: 'union', lat: 22.66842, lon: 91.63632, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Bhatiari", en: "Bhatiari", bn: "ভাটিয়ারী", kind: 'union', lat: 22.42508, lon: 91.75604, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Kumira", en: "Kumira", bn: "কুমিরা", kind: 'union', lat: 22.51874, lon: 91.722, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Muradpur", en: "Muradpur", bn: "মুরাদপুর", kind: 'union', lat: 22.59973, lon: 91.63559, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Saidpur", en: "Saidpur", bn: "সৈয়দপুর", kind: 'union', lat: 22.64734, lon: 91.59495, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Salimpur", en: "Salimpur", bn: "সলিমপুর", kind: 'union', lat: 22.39202, lon: 91.76524, n: 12, spread: 0.7, mix: SIT_MIX },
  { id: "Sitakunda Municipality", en: "Sitakunda Municipality", bn: "সীতাকুণ্ড পৌরসভা", kind: 'pourashava', lat: 22.62428, lon: 91.66965, n: 6, spread: 0.7, mix: SIT_MIX },
  { id: "Sonaichhari", en: "Sonaichhari", bn: "সোনাইছড়ি", kind: 'union', lat: 22.46969, lon: 91.74503, n: 12, spread: 0.7, mix: SIT_MIX },
];
const DACOPE_AREAS = [
  { id: "Bajua", en: "Bajua", bn: "বাজুয়া", kind: 'union', lat: 22.56047, lon: 89.54259, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Banishanta", en: "Banishanta", bn: "বানিশান্তা", kind: 'union', lat: 22.46984, lon: 89.56796, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Chalna Municipality", en: "Chalna Municipality", bn: "চালনা পৌরসভা", kind: 'pourashava', lat: 22.5817, lon: 89.5027, n: 6, spread: 0.7, mix: DAC_MIX },
  { id: "Dacope", en: "Dacope", bn: "দাকোপ", kind: 'union', lat: 22.55322, lon: 89.50698, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Kailasganj", en: "Kailasganj", bn: "কৈলাশগঞ্জ", kind: 'union', lat: 22.51143, lon: 89.52018, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Kamarkhola", en: "Kamarkhola", bn: "কামারখোলা", kind: 'union', lat: 22.54056, lon: 89.47196, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Laudubi", en: "Laudubi", bn: "লাউডোব", kind: 'union', lat: 22.50678, lon: 89.56007, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Pankhali", en: "Pankhali", bn: "পানখালী", kind: 'union', lat: 22.61484, lon: 89.48759, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Sutarkhali", en: "Sutarkhali", bn: "সুতারখালী", kind: 'union', lat: 22.47492, lon: 89.44813, n: 12, spread: 0.7, mix: DAC_MIX },
  { id: "Tildanga", en: "Tildanga", bn: "তিলডাঙ্গা", kind: 'union', lat: 22.56495, lon: 89.43848, n: 12, spread: 0.7, mix: DAC_MIX },
];
const BAKERGANJ_AREAS = [
  { id: "Bhar Pasha", en: "Bhar Pasha", bn: "ভরপাশা", kind: 'union', lat: 22.50415, lon: 90.33006, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Char Amaddi", en: "Char Amaddi", bn: "চরামদ্দি", kind: 'union', lat: 22.6382, lon: 90.41715, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Charadi", en: "Charadi", bn: "চরাদি", kind: 'union', lat: 22.60966, lon: 90.39825, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Darial", en: "Darial", bn: "দাড়িয়াল", kind: 'union', lat: 22.6187, lon: 90.47358, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Dudhal", en: "Dudhal", bn: "দুধল", kind: 'union', lat: 22.58207, lon: 90.43275, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Faridpur", en: "Faridpur", bn: "ফরিদপুর", kind: 'union', lat: 22.55255, lon: 90.48423, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Garuria", en: "Garuria", bn: "গারুড়িয়া", kind: 'union', lat: 22.56554, lon: 90.37594, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Kabai", en: "Kabai", bn: "কবাই", kind: 'union', lat: 22.53239, lon: 90.43197, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Kalaskati", en: "Kalaskati", bn: "কলসকাঠী", kind: 'union', lat: 22.5224, lon: 90.3786, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Nalua", en: "Nalua", bn: "নলুয়া", kind: 'union', lat: 22.48822, lon: 90.41246, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Niamati", en: "Niamati", bn: "নিয়ামতি", kind: 'union', lat: 22.50248, lon: 90.24091, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Padri Shibpur", en: "Padri Shibpur", bn: "পাদ্রি শিবপুর", kind: 'union', lat: 22.49006, lon: 90.27516, n: 12, spread: 0.7, mix: BAK_MIX },
  { id: "Bakerganj Municipality", en: "Bakerganj Municipality", bn: "বাকেরগঞ্জ পৌরসভা", kind: 'pourashava', lat: 22.54571, lon: 90.3443, n: 6, spread: 0.7, mix: BAK_MIX },
  { id: "Rangasree", en: "Rangasree", bn: "রঙ্গশ্রী", kind: 'union', lat: 22.55142, lon: 90.31136, n: 12, spread: 0.7, mix: BAK_MIX },
];
const GANGACHARA_AREAS = [
  { id: "Alam Biditar", en: "Alam Biditar", bn: "আলমবিদিতর", kind: 'union', lat: 25.90603, lon: 89.13652, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Barabil", en: "Barabil", bn: "বড়বিল", kind: 'union', lat: 25.85427, lon: 89.17649, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Betgari", en: "Betgari", bn: "বেতগাড়ী", kind: 'union', lat: 25.8629, lon: 89.12616, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Gajaghanta", en: "Gajaghanta", bn: "গজঘণ্টা", kind: 'union', lat: 25.8434, lon: 89.27869, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Gangachara", en: "Gangachara", bn: "গংগাচড়া", kind: 'union', lat: 25.84797, lon: 89.22712, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Khaleya", en: "Khaleya", bn: "খলেয়া", kind: 'union', lat: 25.83061, lon: 89.12499, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Kolkanda", en: "Kolkanda", bn: "কোলকোন্দ", kind: 'union', lat: 25.90263, lon: 89.2009, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Lakshmitari", en: "Lakshmitari", bn: "লক্ষীটারী", kind: 'union', lat: 25.87696, lon: 89.2575, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Marania", en: "Marania", bn: "মর্নেয়া", kind: 'union', lat: 25.83593, lon: 89.31454, n: 12, spread: 0.7, mix: GAN_MIX },
  { id: "Nohali", en: "Nohali", bn: "নোহালী", kind: 'union', lat: 25.94124, lon: 89.14432, n: 12, spread: 0.7, mix: GAN_MIX },
];
const GOWAINGHAT_AREAS = [
  { id: "Alirgaon", en: "Alirgaon", bn: "আলীরগাঁও", kind: 'union', lat: 25.08156, lon: 92.04902, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Fatehpur", en: "Fatehpur", bn: "ফতেপুর", kind: 'union', lat: 24.99338, lon: 91.95954, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Lengura", en: "Lengura", bn: "লেঙ্গুড়া", kind: 'union', lat: 25.05351, lon: 91.97392, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Nandirgaon", en: "Nandirgaon", bn: "নন্দিরগাঁও", kind: 'union', lat: 25.01442, lon: 91.86914, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Paschim Jaflong", en: "Paschim Jaflong", bn: "পশ্চিম জাফলং", kind: 'union', lat: 25.14014, lon: 91.95525, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Purba Jaflong", en: "Purba Jaflong", bn: "পূর্ব জাফলং", kind: 'union', lat: 25.15353, lon: 92.01803, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Rustampur", en: "Rustampur", bn: "রুস্তমপুর", kind: 'union', lat: 25.13001, lon: 91.88808, n: 12, spread: 0.7, mix: GOW_MIX },
  { id: "Towakul", en: "Towakul", bn: "তোয়াকুল", kind: 'union', lat: 25.06067, lon: 91.89177, n: 12, spread: 0.7, mix: GOW_MIX },
];

// How each upazila waters its Rabi crop and what it grew last [DEMO]: deep tube wells in the Barind, shallow ones on
// the floodplains, ponds and canals (here "none") on the salty and tidal south and in the haor.
const FARMING = {
  godagari: { irr: [['dtw', 0.55], ['stw', 0.27], ['none', 0.18]], last: [['boro', 0.6], ['tomato', 0.2], ['wheat', 0.2]] },
  dhamrai: { irr: [['stw', 0.7], ['dtw', 0.12], ['none', 0.18]], last: [['boro', 0.55], ['mustard', 0.27], ['tomato', 0.18]] },
  sitakunda: { irr: [['stw', 0.6], ['none', 0.4]], last: [['tomato', 0.45], ['boro', 0.45], ['mustard', 0.1]] },
  dacope: { irr: [['none', 0.7], ['stw', 0.3]], last: [['boro', 0.4], ['mustard', 0.3], ['lentil', 0.3]] },
  bakerganj: { irr: [['none', 0.55], ['stw', 0.45]], last: [['boro', 0.55], ['lentil', 0.25], ['mustard', 0.2]] },
  gangachara: { irr: [['stw', 0.75], ['none', 0.25]], last: [['boro', 0.4], ['wheat', 0.3], ['mustard', 0.3]] },
  gowainghat: { irr: [['stw', 0.5], ['none', 0.5]], last: [['boro', 0.8], ['mustard', 0.2]] },
};
const AREAS = [
  ...GODAGARI_AREAS.map((a) => ({ ...a, upazila: 'godagari' })), ...DHAMRAI_AREAS.map((a) => ({ ...a, upazila: 'dhamrai' })),
  ...SITAKUNDA_AREAS.map((a) => ({ ...a, upazila: 'sitakunda' })), ...DACOPE_AREAS.map((a) => ({ ...a, upazila: 'dacope' })),
  ...BAKERGANJ_AREAS.map((a) => ({ ...a, upazila: 'bakerganj' })), ...GANGACHARA_AREAS.map((a) => ({ ...a, upazila: 'gangachara' })),
  ...GOWAINGHAT_AREAS.map((a) => ({ ...a, upazila: 'gowainghat' })),
];
// Display names in the three forms Bangla needs: plain, "in …" and "of …".
const fullName = (u) => (u.kind === 'pourashava'
  ? { bn: u.bn, bnIn: `${u.bn}য়`, bnOf: `${u.bn}র`, en: u.en.replace('Municipality', 'municipality') }
  : { bn: `${u.bn} ইউনিয়ন`, bnIn: `${u.bn} ইউনিয়নে`, bnOf: `${u.bn} ইউনিয়নের`, en: `${u.en} union` });
export const UNIONS = AREAS.map((u) => ({ ...u, full: fullName(u) }));
export const unionsOf = (upazila) => UNIONS.filter((u) => u.upazila === upazila);
// The upazila (registry entry) a union belongs to; Godagari for an unknown id.
export const upazilaOfUnion = (unionId) => UPAZILAS[UNIONS.find((u) => u.id === unionId)?.upazila] ?? UPAZILAS.godagari;

const VILLAGES = [
  { en: 'Purbapara', bn: 'পূর্বপাড়া', dx: 0.012, dy: 0.000 },
  { en: 'Madhyapara', bn: 'মধ্যপাড়া', dx: 0.000, dy: 0.000 },
  { en: 'Paschimpara', bn: 'পশ্চিমপাড়া', dx: -0.014, dy: 0.004 },
  { en: 'Uttarpara', bn: 'উত্তরপাড়া', dx: 0.003, dy: 0.014 },
  { en: 'Dakshinpara', bn: 'দক্ষিণপাড়া', dx: -0.004, dy: -0.013 },
];
const WARDS = [
  { en: 'Ward 1', bn: '১ নং ওয়ার্ড', dx: 0.012, dy: 0.000 },
  { en: 'Ward 2', bn: '২ নং ওয়ার্ড', dx: 0.000, dy: 0.000 },
  { en: 'Ward 3', bn: '৩ নং ওয়ার্ড', dx: -0.014, dy: 0.004 },
  { en: 'Ward 4', bn: '৪ নং ওয়ার্ড', dx: 0.003, dy: 0.014 },
  { en: 'Ward 5', bn: '৫ নং ওয়ার্ড', dx: -0.004, dy: -0.013 },
];
// Dhamrai municipality has nine wards (Banglapedia); positions are spread around its centre, not ward outlines.
const BN_DIGIT = (n) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const WARDS9 = Array.from({ length: 9 }, (_, i) => {
  const a = (i / 9) * 2 * Math.PI;
  return { en: `Ward ${i + 1}`, bn: `${BN_DIGIT(i + 1)} নং ওয়ার্ড`, dx: i ? Math.cos(a) * 0.011 : 0, dy: i ? Math.sin(a) * 0.011 : 0 };
});
// The places farms in an area are spread over: real villages where given, otherwise wards or the five demo paras.
const placesOf = (u) => (u.villages
  ? u.villages.map((v) => ({ en: v.en, bn: v.bn, dx: v.lon - u.lon, dy: v.lat - u.lat, real: true }))
  : u.kind === 'pourashava' ? (u.wards === 9 ? WARDS9 : WARDS) : VILLAGES);

const FIRST = [['Karim', 'করিম'], ['Jamal', 'জামাল'], ['Rafiq', 'রফিক'], ['Shafiq', 'শফিক'], ['Aminul', 'আমিনুল'], ['Monir', 'মনির'], ['Sohel', 'সোহেল'], ['Habib', 'হাবিব'], ['Nurul', 'নুরুল'], ['Kamal', 'কামাল'], ['Selina', 'সেলিনা'], ['Rokeya', 'রোকেয়া'], ['Aklima', 'আকলিমা'], ['Mizan', 'মিজান'], ['Babul', 'বাবুল'], ['Jalal', 'জালাল'], ['Shahida', 'শাহিদা'], ['Tofazzal', 'তোফাজ্জল'], ['Anwar', 'আনোয়ার'], ['Rashida', 'রাশিদা']];
const LAST = [['Islam', 'ইসলাম'], ['Hossain', 'হোসেন'], ['Uddin', 'উদ্দিন'], ['Mia', 'মিয়া'], ['Sarkar', 'সরকার'], ['Mondal', 'মণ্ডল'], ['Pramanik', 'প্রামানিক'], ['Begum', 'বেগম'], ['Ali', 'আলী'], ['Sheikh', 'শেখ']];

const NORMAL = { boro: [1, 15, false], tomato: [11, 15, true], wheat: [11, 20, true], lentil: [11, 5, true], mustard: [11, 1, true] };

function pick(r, mix) {
  let x = r();
  for (const [k, p] of Object.entries(mix)) { if ((x -= p) < 0) return k; }
  return Object.keys(mix)[0];
}

const CLUSTER_TEXTS = [
  { bn: 'টমেটোর নিচের পাতায় বাদামি দাগ, চারপাশটা হলুদ হয়ে যাচ্ছে', en: 'Brown spots with yellow edges on the lower tomato leaves' },
  { bn: 'পাতায় গোল গোল দাগ, দাগের ভেতর আংটির মতো দাগ', en: 'Round spots on the leaves with rings inside them' },
  { bn: 'নিচের দিকের পাতা শুকিয়ে ঝরে পড়ছে', en: 'The lower leaves are drying up and falling off' },
  { bn: 'দুই দিনে দাগ অনেক বেড়ে গেছে, পাশের জমিতেও দেখছি', en: 'The spots have spread fast in two days, and I see them next door too' },
];

export function buildDemo({ today = DEMO_TODAY } = {}) {
  const r = rng(360);
  const farmers = [], plans = [];
  let id = 1;
  for (const u of UNIONS) {
    const dh = u.upazila === 'dhamrai';
    for (let i = 0; i < u.n; i++) {
      const places = placesOf(u);
      const v = places[Math.floor(r() * places.length)];
      const k = u.spread ?? 1;
      const f = FIRST[Math.floor(r() * FIRST.length)], l = LAST[Math.floor(r() * LAST.length)];
      const fid = `F${String(id++).padStart(3, '0')}`;
      // Godagari's Barind fields run on BMDA deep tube wells; Dhamrai's floodplain Boro runs mostly on shallow ones.
      const old = u.upazila === 'godagari' || dh; // the first two upazilas keep their original draws
      const irr = old ? (dh ? (r() < 0.7 ? 'stw' : r() < 0.4 ? 'dtw' : 'none') : r() < 0.55 ? 'dtw' : r() < 0.6 ? 'stw' : 'none') : pick(r, Object.fromEntries(FARMING[u.upazila].irr));
      // A real village keeps its own position (a small jitter only); demo paras are offsets scaled to the area.
      const lat = v.real ? u.lat + v.dy + (r() - 0.5) * 0.008 : u.lat + (v.dy + (r() - 0.5) * 0.010) * k;
      const lon = v.real ? u.lon + v.dx + (r() - 0.5) * 0.008 : u.lon + (v.dx + (r() - 0.5) * 0.012) * k;
      const farmer = {
        id: fid, name: { en: `${f[0]} ${l[0]}`, bn: `${f[1]} ${l[1]}` }, union: u.id,
        village: v.en, villageBn: v.bn, lat, lon,
        area_dec: Math.round(10 + r() * 90),
        last_crop: old ? (dh ? (r() < 0.55 ? 'boro' : r() < 0.6 ? 'mustard' : 'tomato') : r() < 0.6 ? 'boro' : r() < 0.5 ? 'tomato' : 'wheat') : pick(r, Object.fromEntries(FARMING[u.upazila].last)), irrigation: irr,
      };
      farmers.push(farmer);
      const crop = pick(r, u.mix);
      const [m, d, prev] = NORMAL[crop];
      let date = ymd(prev ? 2026 : 2027, m, d);
      // tomato transplanting bunches around mid-November in practice
      const spread = crop === 'tomato' ? Math.round((r() + r() + r() - 1.5) * 9) : Math.round((r() - 0.5) * 14);
      date = addDays(date, spread);
      plans.push({ plot_id: fid, crop, date, area_dec: farmer.area_dec, union: u.id });
    }
  }
  // Hero farmers (fixed)
  const heroes = [
    // Rahim and Razib work on the main field of their upazila office registry (parcels.json; real cropland).
    { id: 'RAHIM', name: { en: 'Rahim Uddin', bn: 'রহিম উদ্দিন' }, union: 'Deopara', village: 'Purbapara', villageBn: 'পূর্বপাড়া',
      lat: 24.4125, lon: 88.5023, area_dec: 66, last_crop: 'boro', irrigation: 'dtw', hero: true },
    { id: 'SELINA', name: { en: 'Selina Begum', bn: 'সেলিনা বেগম' }, union: 'Char Ashariadaha', village: 'Madhyapara', villageBn: 'মধ্যপাড়া',
      lat: 24.4110, lon: 88.3420, area_dec: 50, last_crop: 'tomato', irrigation: 'none', hero: true },
    { id: 'JALAL', name: { en: 'Jalal Pramanik', bn: 'জালাল প্রামানিক' }, union: 'Rishikul', village: 'Uttarpara', villageBn: 'উত্তরপাড়া',
      lat: 24.5365, lon: 88.5208, area_dec: 66, last_crop: 'boro', irrigation: 'stw', hero: true },
    // Dhamrai: mustard then Boro on a shallow tube well, the usual Chauhat pattern.
    // His mobile is the demo phone: Chakra Agent's SMS to a button phone go to this number.
    { id: 'RAZIB', name: { en: 'Razib Miah', bn: 'রাজিব মিয়া' }, union: 'Chauhat', village: 'Chauhat', villageBn: 'চৌহাট',
      lat: 24.0233, lon: 90.079, area_dec: 50, last_crop: 'mustard', irrigation: 'stw', hero: true, mobile: '01927228826' },
    // The five division story farmers (data/stories.js), in real GeoNames villages, on fields that are cropland in
    // the 2025 Esri / Impact Observatory 10 m land cover. The people are composite characters.
    { id: 'DIDARUL', name: { en: 'Md. Didarul Alam', bn: 'মো. দিদারুল আলম' }, union: 'Saidpur', village: 'Jafarnagar', villageBn: 'জাফরনগর',
      lat: 22.63, lon: 91.605, area_dec: 140, last_crop: 'tomato', irrigation: 'stw', hero: true },
    { id: 'PRAHLAD', name: { en: 'Prahlad Chandra Roy', bn: 'প্রহ্লাদ চন্দ্র রায়' }, union: 'Tildanga', village: 'Tildanga', villageBn: 'তিলডাঙ্গা',
      lat: 22.59, lon: 89.4725, area_dec: 180, last_crop: 'boro', irrigation: 'none', hero: true },
    { id: 'KADER', name: { en: 'Abdul Kader Howlader', bn: 'আবদুল কাদের হাওলাদার' }, union: 'Garuria', village: 'Nilganj', villageBn: 'নীলগঞ্জ',
      lat: 22.5654, lon: 90.3896, area_dec: 150, last_crop: 'boro', irrigation: 'stw', hero: true },
    { id: 'MOFIZUL', name: { en: 'Md. Mofizul Islam', bn: 'মো. মফিজুল ইসলাম' }, union: 'Kolkanda', village: 'Dakshin Kolkonda', villageBn: 'দক্ষিণ কোলকোন্দ',
      lat: 25.8701, lon: 89.20271, area_dec: 160, last_crop: 'wheat', irrigation: 'stw', hero: true },
    { id: 'RAHIMA', name: { en: 'Rahima Begum', bn: 'রহিমা বেগম' }, union: 'Rustampur', village: 'Kurikhola', villageBn: 'কুড়িখোলা',
      lat: 25.09832, lon: 91.88955, area_dec: 140, last_crop: 'boro', irrigation: 'stw', hero: true },
  ];
  farmers.unshift(...heroes);

  const season = requestSeason(today);
  if (season === 'aman') return { unions: UNIONS, farmers, plans, requests: amanRequests(farmers, today) };

  // Help requests: 8 seeded leaf-spot reports in two neighbouring Deopara villages + scattered others
  const requests = [];
  const deo = farmers.filter((f) => f.union === 'Deopara' && !f.hero && (f.village === 'Purbapara' || f.village === 'Madhyapara'));
  const tomatoDeo = deo.filter((f) => plans.find((p) => p.plot_id === f.id)?.crop === 'tomato').slice(0, 8);
  tomatoDeo.forEach((f, i) => requests.push({
    id: `R${100 + i}`, farmerId: f.id, union: f.union, village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon,
    crop: 'tomato', symptom: 'leaf_spot', type: 'crop_doctor',
    text: CLUSTER_TEXTS[i % CLUSTER_TEXTS.length],
    ai: [{ k: 'early_blight', p: 0.58 + (i % 3) * 0.05 }, { k: 'septoria', p: 0.18 }, { k: 'unclear', p: 0.12 }],
    created: addDays(today, -(i % 6)), status: 'open', priority: 'Medium', demo: true, season,
  }));
  const others = farmers.filter((f) => !f.hero && !tomatoDeo.includes(f) && UNIONS.find((u) => u.id === f.union).upazila === 'godagari');
  const misc = [
    { symptom: 'aphid', crop: 'mustard', text: { bn: 'সরিষার ডগায় জাব পোকা ভরে গেছে, কী করব?', en: 'The mustard tips are covered in aphids. What should I do?' }, pr: 'Low' },
    { symptom: 'water', crop: 'boro', text: { bn: 'গভীর নলকূপের পানি পালামতো পাচ্ছি না, জমি ফেটে যাচ্ছে', en: 'I am not getting my turn on the deep tube well and the field is cracking' }, pr: 'High' },
    { symptom: 'question', crop: 'wheat', text: { bn: 'গমে শেষ সেচটা কবে দেব?', en: 'When should I give the wheat its last watering?' }, pr: 'Low' },
    { symptom: 'leaf_spot', crop: 'tomato', text: { bn: 'টমেটোর পাতায় কালচে দাগ পড়ছে', en: 'Dark spots are appearing on the tomato leaves' }, pr: 'Medium' },
    { symptom: 'wilt', crop: 'tomato', text: { bn: 'কয়েকটা টমেটো গাছ হঠাৎ নেতিয়ে পড়ছে', en: 'A few tomato plants have suddenly gone limp' }, pr: 'High' },
    { symptom: 'question', crop: 'lentil', text: { bn: 'মসুরে কোন সার কতটুকু দেব?', en: 'Which fertiliser should I give the lentil, and how much?' }, pr: 'Low' },
  ];
  misc.forEach((m, i) => {
    const f = others.filter((o) => o.union !== 'Deopara')[i * 13 % 90];
    requests.push({ id: `R${200 + i}`, farmerId: f.id, union: f.union, village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon,
      crop: m.crop, symptom: m.symptom, type: 'question', text: m.text, ai: null, created: addDays(today, -i), status: 'open', priority: m.pr, demo: true, season });
  });

  requests.push(...dhamraiRequests(farmers, plans, today));
  return { unions: UNIONS, farmers, plans, requests };
}

// ---- Dhamrai requests [DEMO], for mid-January: mustard aphids at flowering, cold waves on Boro seedbeds, fog on
// tomato, shallow-tube-well turns, and factory waste water on low fields (the Dautia problem reported in Sombhag). ----
const APHID_TEXTS = [
  { bn: 'সরিষার ডগায় আর ফুলে ছোট সবুজ পোকা গাদাগাদি করে আছে', en: 'Small green insects are packed on the mustard tips and flowers' },
  { bn: 'ফুল ঝরে যাচ্ছে, শুঁটি কম ধরছে, ডগা আঠালো হয়ে গেছে', en: 'Flowers are dropping, few pods are setting and the tips are sticky' },
  { bn: 'কুয়াশার পর থেকে জাব পোকা খুব বেড়েছে', en: 'Aphids have shot up since the fog came' },
  { bn: 'পাশের জমির সরিষাতেও একই পোকা দেখছি', en: 'I see the same insects in the next field’s mustard too' },
];
function dhamraiRequests(farmers, plans, today) {
  const out = [];
  const req = (f, id, x) => ({ id, farmerId: f.id, union: f.union, village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon, status: 'open', demo: true, season: 'rabi', ...x });
  const crop = (f) => plans.find((p) => p.plot_id === f.id)?.crop;
  // Six mustard growers around Chauhat village report aphids within a week: with Razib's report they make one area alert.
  const ch = farmers.filter((f) => f.union === 'Chauhat' && !f.hero && f.village === 'Chauhat');
  const aphid = [...ch.filter((f) => crop(f) === 'mustard'), ...ch.filter((f) => crop(f) !== 'mustard')].slice(0, 6);
  aphid.forEach((f, i) => out.push(req(f, `R${300 + i}`, {
    crop: 'mustard', symptom: 'aphid', type: 'crop_doctor', text: APHID_TEXTS[i % APHID_TEXTS.length],
    ai: [{ k: 'pest', p: 0.66 + (i % 3) * 0.05 }, { k: 'nutrient', p: 0.12 }, { k: 'unclear', p: 0.1 }],
    created: addDays(today, -(i % 5)), priority: 'Medium',
  })));
  // Razib Miah's own three problems.
  const razib = farmers.find((f) => f.id === 'RAZIB');
  out.push(
    req(razib, 'R350', { crop: 'mustard', symptom: 'aphid', type: 'crop_doctor', created: today, priority: 'Medium',
      text: { bn: 'আমার দেড় বিঘা সরিষায় জাব পোকা লেগেছে, ফুল ঝরে যাচ্ছে। পাশের জমিতেও একই অবস্থা।', en: 'Aphids have got into my one and a half bigha of mustard and the flowers are dropping. The next fields are the same.' },
      ai: [{ k: 'pest', p: 0.74 }, { k: 'nutrient', p: 0.1 }, { k: 'unclear', p: 0.08 }] }),
    req(razib, 'R351', { crop: 'boro', symptom: 'cold', type: 'question', created: addDays(today, -1), priority: 'High', ai: null,
      text: { bn: 'শৈত্যপ্রবাহে বোরোর বীজতলার চারা হলুদ হয়ে যাচ্ছে, কিছু চারা মরেও যাচ্ছে। কী করব?', en: 'In the cold wave my Boro seedbed is turning yellow and some seedlings are dying. What should I do?' } }),
    req(razib, 'R352', { crop: 'boro', symptom: 'question', type: 'question', created: addDays(today, -2), priority: 'Low', ai: null,
      text: { bn: 'সরিষা কাটার পর কত দিনের মধ্যে বোরো রোপণ করলে ভালো হয়?', en: 'After the mustard is cut, how soon should I transplant the Boro?' } }),
  );
  // One or two reports elsewhere in Dhamrai, each from the first farmer of that union.
  const first = (union, n = 0) => farmers.filter((f) => f.union === union && !f.hero)[n];
  const misc = [
    ['Sombhag', 0, { crop: 'boro', symptom: 'waste', priority: 'High', text: { bn: 'পাশের কারখানার কালো পানি বীজতলায় ঢুকছে, চারা মরে যাচ্ছে, পানিতে দুর্গন্ধ', en: 'Black water from the factory next door is running into my seedbed; the seedlings are dying and the water stinks' } }],
    ['Sombhag', 1, { crop: 'boro', symptom: 'waste', priority: 'High', text: { bn: 'নিচু জমিতে সারা বছর পানি জমে থাকে, কারখানার বর্জ্য মিশে ধানে চিটা বেড়েছে', en: 'Water stands on my low field all year; with the factory waste in it, more of the rice grains are empty' } }],
    ['Kulla', 0, { crop: 'tomato', symptom: 'leaf_spot', priority: 'Medium', text: { bn: 'কয়েক দিনের ঘন কুয়াশার পর টমেটোর পাতায় কালো ভেজা দাগ, কাণ্ডেও ছড়াচ্ছে', en: 'After a few days of thick fog there are dark wet patches on the tomato leaves, spreading to the stems' } }],
    ['Balia', 0, { crop: 'boro', symptom: 'cold', priority: 'High', text: { bn: 'বীজতলার চারা ঠান্ডায় লালচে-হলুদ হয়ে গেছে, বাড়ছে না', en: 'The seedbed has gone reddish-yellow in the cold and is not growing' } }],
    ['Jadabpur', 0, { crop: 'boro', symptom: 'water', priority: 'Medium', text: { bn: 'অগভীর নলকূপে পানি কম উঠছে, বোরোর জমি তৈরি করতে পারছি না', en: 'The shallow tube well is pumping little water and I cannot prepare my Boro field' } }],
    ['Amta', 0, { crop: 'mustard', symptom: 'question', priority: 'Low', text: { bn: 'সরিষা কবে কাটলে দানা ঝরে পড়বে না?', en: 'When should I cut the mustard so the seed does not shatter?' } }],
  ];
  misc.forEach(([union, n, x], i) => out.push(req(first(union, n), `R${360 + i}`, { type: 'question', ai: null, created: addDays(today, -(i % 4)), ...x })));
  return out;
}

// ---- Requests [DEMO] for Kartik (October–November): the Aman stands in the fields, from flowering to ripening, and
// the Rabi is still to sow. Godagari: brown planthopper ("current poka") spreading through neighbouring Deopara
// fields, with stem borer, sheath blight and rats elsewhere; Dhamrai: neck blast in the dew around Chauhat, flood
// water slow to leave the low land, and factory waste water in Sombhag. Questions are about the Rabi to come. ----
const BPH_TEXTS = [
  { bn: 'ধানের গোড়ায় বাদামি রঙের ছোট ছোট পোকা গিজগিজ করছে', en: 'Small brown insects are swarming at the base of the rice' },
  { bn: 'জমির মাঝখানে গোল হয়ে ধান শুকিয়ে পুড়ে যাওয়ার মতো হয়ে গেছে', en: 'In the middle of the field the rice has dried in a round patch, as if burnt' },
  { bn: 'কারেন্ট পোকা লেগেছে, দুই দিনে অনেকটা ছড়িয়ে গেছে', en: 'Planthoppers ("current poka") have got in and spread a lot in two days' },
  { bn: 'পাশের জমিতেও একই পোকা, ধান হলুদ হয়ে নুয়ে পড়ছে', en: 'The same insects are in the next field; the rice is yellowing and falling over' },
];
const BLAST_TEXTS = [
  { bn: 'ধানের শিষের গোড়া কালো হয়ে শিষ ভেঙে ঝুলে পড়ছে', en: 'The neck of the rice heads has turned black and the heads are breaking over' },
  { bn: 'পাতায় চোখের মতো লম্বাটে দাগ, শিষ সাদা হয়ে যাচ্ছে', en: 'Eye-shaped spots on the leaves, and the heads are turning white' },
  { bn: 'রাতে শিশির পড়া শুরুর পর থেকে রোগটা খুব বেড়েছে', en: 'The disease has shot up since the night dew started' },
  { bn: 'পাশের জমির আমনেও একই রোগ দেখছি', en: 'I see the same disease in the next field’s Aman too' },
];
function amanRequests(farmers, today) {
  const out = [];
  const req = (f, id, x) => ({ id, farmerId: f.id, union: f.union, village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon, status: 'open', demo: true, season: 'aman', ...x });
  // Godagari: eight neighbours in Purbapara and Madhyapara (Deopara) report planthoppers within a week.
  const deo = farmers.filter((f) => f.union === 'Deopara' && !f.hero && (f.village === 'Purbapara' || f.village === 'Madhyapara')).slice(0, 8);
  deo.forEach((f, i) => out.push(req(f, `R${400 + i}`, {
    crop: 'aman', symptom: 'bph', type: 'crop_doctor', text: BPH_TEXTS[i % BPH_TEXTS.length],
    ai: [{ k: 'bph', p: 0.58 + (i % 3) * 0.05 }, { k: 'stem_borer', p: 0.14 }, { k: 'unclear', p: 0.12 }],
    created: addDays(today, -(i % 6)), priority: i < 2 ? 'High' : 'Medium',
  })));
  const others = farmers.filter((f) => !f.hero && !deo.includes(f) && f.union !== 'Deopara' && UNIONS.find((u) => u.id === f.union).upazila === 'godagari');
  const misc = [
    { symptom: 'stem_borer', crop: 'aman', pr: 'Medium', text: { bn: 'ধানের শিষ সাদা হয়ে গেছে, টান দিলে সহজেই উঠে আসে', en: 'The rice heads have turned white and pull out easily' } },
    { symptom: 'sheath_blight', crop: 'aman', pr: 'Medium', text: { bn: 'ধানের খোলে পানির কাছ থেকে সাপের চামড়ার মতো ছোপ ছোপ দাগ উঠছে', en: 'Snake-skin blotches are climbing the rice sheaths from the water line' } },
    { symptom: 'question', crop: 'mustard', pr: 'Low', text: { bn: 'আমন তোলার পর সরিষা বুনব, কোন জাত ভালো হবে?', en: 'I will sow mustard after the Aman comes off. Which variety is best?' } },
    { symptom: 'rodent', crop: 'aman', pr: 'Medium', text: { bn: 'ইঁদুর রাতে ধানের শিষ কেটে নিচ্ছে, আলে অনেক গর্ত', en: 'Rats are cutting the rice heads at night, and the bunds are full of burrows' } },
    { symptom: 'question', crop: 'tomato', pr: 'Low', text: { bn: 'টমেটোর বীজতলার চারা গোড়ায় পচে মরে যাচ্ছে, কী করব?', en: 'My tomato seedlings in the nursery are rotting at the base and dying. What should I do?' } },
    { symptom: 'question', crop: 'wheat', pr: 'Low', text: { bn: 'আমন তোলার পর গম কবে বুনলে ভালো হয়?', en: 'When is the best time to sow wheat after the Aman comes off?' } },
  ];
  misc.forEach((m, i) => out.push(req(others[i * 13 % others.length], `R${420 + i}`, { crop: m.crop, symptom: m.symptom, type: 'question', text: m.text, ai: null, created: addDays(today, -i), priority: m.pr })));

  // Dhamrai: six growers around Chauhat report neck blast within a week; with Razib's report they make one area alert.
  const ch = farmers.filter((f) => f.union === 'Chauhat' && !f.hero && f.village === 'Chauhat').slice(0, 6);
  ch.forEach((f, i) => out.push(req(f, `R${500 + i}`, {
    crop: 'aman', symptom: 'blast', type: 'crop_doctor', text: BLAST_TEXTS[i % BLAST_TEXTS.length],
    ai: [{ k: 'blast', p: 0.62 + (i % 3) * 0.05 }, { k: 'sheath_blight', p: 0.12 }, { k: 'unclear', p: 0.1 }],
    created: addDays(today, -(i % 5)), priority: 'High',
  })));
  const razib = farmers.find((f) => f.id === 'RAZIB');
  out.push(
    req(razib, 'R550', { crop: 'aman', symptom: 'blast', type: 'crop_doctor', created: today, priority: 'High',
      text: { bn: 'আমার দেড় বিঘা আমনে শিষের গোড়া কালো হয়ে শিষ ভেঙে পড়ছে। পাশের জমিতেও একই অবস্থা।', en: 'In my one and a half bigha of Aman the necks of the heads are turning black and breaking. The next fields are the same.' },
      ai: [{ k: 'blast', p: 0.71 }, { k: 'sheath_blight', p: 0.1 }, { k: 'unclear', p: 0.08 }] }),
    req(razib, 'R551', { crop: 'mustard', symptom: 'question', type: 'question', created: addDays(today, -1), priority: 'Medium', ai: null,
      text: { bn: 'নিচু জমি থেকে বন্যার পানি এখনো নামেনি। সরিষা বুনতে দেরি হলে কী করব?', en: 'The flood water has still not left my low field. What should I do if the mustard goes in late?' } }),
    req(razib, 'R552', { crop: 'boro', symptom: 'question', type: 'question', created: addDays(today, -2), priority: 'Low', ai: null,
      text: { bn: 'আমন তোলার পর বোরোর বীজতলা কবে করব?', en: 'When should I make the Boro seedbed after the Aman comes off?' } }),
  );
  const first = (union, n = 0) => farmers.filter((f) => f.union === union && !f.hero)[n];
  const dmisc = [
    ['Sombhag', 0, { crop: 'aman', symptom: 'waste', priority: 'High', text: { bn: 'পাশের কারখানার কালো পানি আমনের জমিতে ঢুকছে, ধান হলুদ হয়ে মরে যাচ্ছে, পানিতে দুর্গন্ধ', en: 'Black water from the factory next door is running into my Aman field; the rice is yellowing and dying and the water stinks' } }],
    ['Sombhag', 1, { crop: 'aman', symptom: 'waste', priority: 'High', text: { bn: 'নিচু জমিতে সারা বছর পানি জমে থাকে, কারখানার বর্জ্য মিশে আমনে চিটা বেড়েছে', en: 'Water stands on my low field all year; with the factory waste in it, more of the Aman grains are empty' } }],
    ['Kulla', 0, { crop: 'tomato', symptom: 'question', priority: 'Low', text: { bn: 'টমেটোর চারা কবে লাগালে কুয়াশা আসার আগে গাছ শক্ত হবে?', en: 'When should I plant out the tomato seedlings so the plants are strong before the fog comes?' } }],
    ['Balia', 0, { crop: 'aman', symptom: 'bph', priority: 'High', text: { bn: 'ধানের গোড়ায় বাদামি পোকা দেখছি, কয়েক জায়গায় ধান শুকিয়ে যাচ্ছে', en: 'I see brown insects at the base of the rice, and in a few places it is drying out' } }],
    ['Jadabpur', 0, { crop: 'aman', symptom: 'question', priority: 'Medium', text: { bn: 'জমিতে এখনো হাঁটু পানি, পাকা আমন তুলব কীভাবে?', en: 'There is still knee-deep water in my field. How do I bring in the ripe Aman?' } }],
    ['Amta', 0, { crop: 'aman', symptom: 'rodent', priority: 'Medium', text: { bn: 'ইঁদুর আমনের শিষ কেটে নিচ্ছে, প্রতিদিন ক্ষতি বাড়ছে', en: 'Rats are taking the Aman heads, and the damage grows every day' } }],
  ];
  dmisc.forEach(([union, n, x], i) => out.push(req(first(union, n), `R${560 + i}`, { type: 'question', ai: null, created: addDays(today, -(i % 4)), ...x })));
  return out;
}

export const SYMPTOMS = {
  ...PROBLEM_NAMES, // each crop's named problems (crop_problems.js), as farmers pick them on the help page
  leaf_spot: { bn: 'পাতায় দাগ', en: 'Spots on leaves' },
  aphid: { bn: 'জাব পোকা', en: 'Aphids' },
  water: { bn: 'সেচের সমস্যা', en: 'Water problem' },
  question: { bn: 'পরামর্শ চাই', en: 'Asking for advice' },
  wilt: { bn: 'গাছ নেতিয়ে পড়া', en: 'Plants wilting' },
  cold: { bn: 'ঠান্ডায় চারা হলুদ', en: 'Cold-damaged seedlings' },
  waste: { bn: 'কারখানার বর্জ্য পানি', en: 'Factory waste water' },
  satellite: { bn: 'উপগ্রহে জমি দুর্বল দেখাচ্ছে', en: 'Field looks weak from the satellite' },
};
export const DISEASES = {
  early_blight: { bn: 'আগাম ধসা (আর্লি ব্লাইট) হতে পারে', en: 'Could be early blight' },
  septoria: { bn: 'পাতার ছোট দাগ রোগ (সেপটোরিয়া) হতে পারে', en: 'Could be Septoria leaf spot' },
  unclear: { bn: 'বোঝা যাচ্ছে না, অন্য কিছুও হতে পারে', en: 'Not clear, could be something else' },
  alternaria: { bn: 'পাতা ঝলসানো (অল্টারনারিয়া) হতে পারে', en: 'Could be Alternaria blight' },
  nutrient: { bn: 'সারের ঘাটতি হতে পারে', en: 'Could be a nutrient shortage' },
  pest: { bn: 'পোকার আক্রমণ হতে পারে', en: 'Could be pest damage' },
  bph: { bn: 'বাদামি গাছফড়িং (কারেন্ট পোকা) হতে পারে', en: 'Could be brown planthopper' },
  stem_borer: { bn: 'মাজরা পোকা হতে পারে', en: 'Could be stem borer' },
  blast: { bn: 'ব্লাস্ট (শিষ ভাঙা রোগ) হতে পারে', en: 'Could be blast (neck blast)' },
  sheath_blight: { bn: 'খোল পোড়া হতে পারে', en: 'Could be sheath blight' },
};
// The name of one AI finding on a request: the crop doctor's own words, else a known disease or crop problem.
export const aiLabel = (a) => (a?.bn ? { bn: a.bn, en: a.en } : DISEASES[a?.k] ?? PROBLEM_NAMES[a?.k] ?? DISEASES.unclear);

// Each upazila has one agriculture office; its officer (UPAZILAS[id].officer) sees every union and village in that
// upazila, and picks a union only to look at that union's farmers and requests.

// Searchable places for the land picker: upazila centres, union centres and the demo villages inside them.
export const PLACES = [
  ...Object.values(UPAZILAS).map((z) => ({ id: z.id, bn: `${z.name.bn} উপজেলা সদর`, en: `${z.name.en} upazila centre`, lat: z.center[0], lon: z.center[1], kind: 'upazila', upazila: z.id })),
  ...UNIONS.flatMap((u) => [
    { id: `u-${u.id}`, bn: `${u.full.bn}`, en: `${u.full.en}`, lat: u.lat, lon: u.lon, kind: 'union', union: u.id, upazila: u.upazila },
    ...placesOf(u).map((v) => {
      const k = v.real ? 1 : u.spread ?? 1; // same scaling as the farms, so the point stays inside its own area
      return { id: `v-${u.id}-${v.en}`, bn: `${v.bn}, ${u.bn}`, en: `${v.en}, ${u.en}`, lat: u.lat + v.dy * k, lon: u.lon + v.dx * k, kind: 'village', union: u.id, village: v.en, villageBn: v.bn, upazila: u.upazila };
    }),
  ]),
];
