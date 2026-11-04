// Which government support fits this farmer, and why: the matcher behind /farmer/support and the India help tab.
// Each programme (data/support/*.js) says who it is for; this reads the farmer's real field size, this year's crops,
// water source and place, and answers yes / maybe / no with the reason in Bangla and English, plus what usually has
// to come first. It never promises: the union committee or the bank decides, so even a "yes" says "likely".
// Also a small offline question box over the same list (askSupport), so a farmer can type "সারের দাম" or "loan".
import { bnDigits } from './dates.js';

const nb = (x) => bnDigits(String(x));

// Farm-size classes of the Bangladesh agricultural census (BBS), in decimals (100 decimals = 1 acre).
export const HOLDING = [
  { id: 'landless', max: 4, name: { bn: 'ভূমিহীন', en: 'Landless' } },
  { id: 'marginal', max: 49, name: { bn: 'প্রান্তিক', en: 'Marginal' } },
  { id: 'small', max: 249, name: { bn: 'ক্ষুদ্র', en: 'Small' } },
  { id: 'medium', max: 749, name: { bn: 'মাঝারি', en: 'Medium' } },
  { id: 'large', max: Infinity, name: { bn: 'বড়', en: 'Large' } },
];
export const holdingClass = (dec) => HOLDING.find((h) => (dec ?? 0) <= h.max) ?? HOLDING[HOLDING.length - 1];

export const KINDS = {
  register: { bn: 'নিবন্ধন', en: 'Get registered' },
  cash: { bn: 'নগদ সহায়তা', en: 'Cash support' },
  input: { bn: 'বীজ ও সার', en: 'Seed and fertiliser' },
  credit: { bn: 'ঋণ', en: 'Credit' },
  insurance: { bn: 'বিমা', en: 'Insurance' },
  machinery: { bn: 'যন্ত্র', en: 'Machines' },
  price: { bn: 'ফসলের দাম', en: 'Crop price' },
  soil: { bn: 'মাটি', en: 'Soil' },
  irrigation: { bn: 'সেচ', en: 'Irrigation' },
  advice: { bn: 'পরামর্শ', en: 'Advice' },
};
export const STATUS = {
  running: { bn: 'চালু', en: 'Running' },
  pilot: { bn: 'পাইলট, কয়েক জেলায়', en: 'Pilot, a few districts' },
  announced: { bn: 'ঘোষিত, নিয়ম আসেনি', en: 'Announced, rules not out' },
  check: { bn: 'চালু কি না জেনে নিন', en: 'Ask if still open' },
};
export const FIT = {
  yes: { bn: 'সম্ভবত পাবেন', en: 'Likely fits you' },
  maybe: { bn: 'জেনে দেখুন', en: 'Worth asking' },
  no: { bn: 'এখন খাটে না', en: 'Does not fit now' },
};
const AREA = { coastal: { bn: 'উপকূল', en: 'coastal' }, haor: { bn: 'হাওর', en: 'haor' }, barind: { bn: 'বরেন্দ্র', en: 'Barind' } };

// What the matcher knows about the farmer. crops: [{ id, name: { bn, en } }] for this year (Rabi and the next crops).
export function supportProfile({ area_dec, crops = [], irrigation = null, area = null, district = null, state = null }) {
  const seen = new Set();
  const list = crops.filter((c) => c && !seen.has(c.id) && seen.add(c.id));
  return { dec: area_dec ?? 0, holding: holdingClass(area_dec), crops: list, irrigation, area, district, state };
}

const names = (cs) => ({ bn: cs.map((c) => c.name.bn).join(', '), en: cs.map((c) => c.name.en).join(', ') });

// One programme against one profile: { fit, why: [{bn,en}], first: [ids] }.
export function matchOne(p, prof) {
  const r = p.rule ?? {};
  const why = [];
  let fit = 'yes';
  const no = (m) => { fit = 'no'; why.push(m); };
  if (r.maxDec != null) {
    if (prof.dec > r.maxDec) no({ bn: `জমি ${nb(prof.dec)} শতক; এটি ${nb(r.maxDec)} শতক পর্যন্ত (ক্ষুদ্র ও প্রান্তিক) কৃষকের জন্য`, en: `Your land is ${prof.dec} decimals; this is for farmers with up to ${r.maxDec} (small and marginal)` });
    else why.push({ bn: `জমি ${nb(prof.dec)} শতক, তাই আপনি ${prof.holding.name.bn} কৃষক`, en: `${prof.dec} decimals makes you a ${prof.holding.name.en.toLowerCase()} farmer` });
  }
  if (r.crops) {
    const hit = prof.crops.filter((c) => r.crops.includes(c.id));
    if (!hit.length) no({ bn: 'এ বছরের ফসলের তালিকায় এর কোনো ফসল নেই', en: 'None of this year’s crops is on its list' });
    else { const n = names(hit); why.push({ bn: `এ বছর আপনার ${n.bn} এর আওতায় পড়ে`, en: `Your ${n.en} this year is covered` }); }
  }
  if (r.districts) {
    if (!r.districts.includes(prof.district)) no({ bn: 'আপনার জেলা এর পাইলটে নেই', en: 'Your district is not in its pilot' });
    else why.push({ bn: 'আপনার জেলা এর পাইলটে আছে', en: 'Your district is in its pilot' });
  }
  if (r.states && !r.states.includes(prof.state)) no({ bn: 'আপনার রাজ্যে এটি নেই', en: 'Not offered in your state' });
  if (r.notStates?.includes(prof.state)) no({ bn: 'আপনার রাজ্য এই যোজনায় যোগ দেয়নি', en: 'Your state has not joined this scheme' });
  if (r.irrigation) {
    if (!r.irrigation.includes(prof.irrigation)) { if (fit === 'yes') fit = 'maybe'; why.push({ bn: 'আপনার সেচ আছে; খরচ কমলে তবেই কাজের', en: 'You already have irrigation; useful only if it costs less' }); }
    else why.push({ bn: prof.irrigation === 'none' ? 'জমিতে সেচ নেই; এতে পানি মিলতে পারে' : 'অগভীর নলকূপের ডিজেল খরচ কমতে পারে', en: prof.irrigation === 'none' ? 'Your field has no irrigation; this could bring water' : 'It could cut a shallow tube well’s diesel cost' });
  }
  if (p.areaRate) {
    const rate = p.areaRate[prof.area] ?? p.areaRate.other;
    why.push(AREA[prof.area] && p.areaRate[prof.area]
      ? { bn: `${AREA[prof.area].bn} এলাকা, তাই ভর্তুকি ${nb(rate)}%`, en: `A ${AREA[prof.area].en} area, so the grant is ${rate}%` }
      : { bn: `আপনার এলাকায় ভর্তুকি ${nb(rate)}%`, en: `The grant in your area is ${rate}%` });
  }
  if (fit === 'yes' && p.status !== 'running') fit = 'maybe'; // a pilot, an announcement or an ended project
  if (fit === 'yes' && !why.length) why.push({ bn: 'সব কৃষকের জন্য', en: 'Open to every farmer' });
  return { fit, why, first: r.needs ?? [] };
}

const ORDER = { yes: 0, maybe: 1, no: 2 };
const KIND_ORDER = Object.keys(KINDS);
export function matchSupport(list, prof) {
  return list.map((p) => ({ p, ...matchOne(p, prof) }))
    .sort((a, b) => ORDER[a.fit] - ORDER[b.fit] || KIND_ORDER.indexOf(a.p.kind) - KIND_ORDER.indexOf(b.p.kind));
}
export const countFits = (ms) => ({ yes: ms.filter((m) => m.fit === 'yes').length, maybe: ms.filter((m) => m.fit === 'maybe').length, no: ms.filter((m) => m.fit === 'no').length });

// Offline question box: score each programme by the words of the question (Bangla or English, Bangla digits read as
// Latin), against its keywords (3 each), its name (2) and its benefit and who-for text (1). Top 3 with any match.
const BN0 = '০'.charCodeAt(0);
const norm = (t) => String(t).toLowerCase().replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - BN0)).replace(/[?.,!।:;()"'’‘“”]/g, ' ');
const tokens = (t) => norm(t).split(/\s+/).filter((w) => w.length > 1);
export function askSupport(query, list, n = 3) {
  const q = tokens(query);
  if (!q.length) return [];
  return list.map((p) => {
    const kw = (p.words ?? []).map(norm);
    const name = norm(`${p.name.bn} ${p.name.en}`);
    const body = norm(`${p.benefit.bn} ${p.benefit.en} ${p.who.bn} ${p.who.en}`);
    let score = 0;
    for (const w of q) {
      if (kw.some((k) => k === w || (w.length > 2 && (k.startsWith(w) || w.startsWith(k))))) score += 3;
      if (name.includes(w)) score += 2;
      else if (body.includes(w)) score += 1;
    }
    return { p, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}

// The order to go in: registration first, then everything that needs it.
export function firstSteps(ms) {
  const want = new Set(ms.filter((m) => m.fit !== 'no').flatMap((m) => m.first));
  return ms.filter((m) => want.has(m.p.id)).map((m) => m.p);
}
