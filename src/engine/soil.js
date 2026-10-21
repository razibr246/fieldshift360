// Soil, from real sources only. [REAL data in, RULE logic]
//   - Properties of the top 30 cm (pH, organic matter, nitrogen, texture, CEC, soil group) from ISRIC SoilGrids 2.0,
//     at the farmer's own field when it is registered (soil_fields.json), otherwise at the union's centre.
//   - Fertilizer for each crop from SRDI's Fertilizer Recommendation System, which is built on SRDI's union-level soil
//     tests (srdi_frs.json). SoilGrids has no plant-available P, K, S, Zn or B; SRDI's dose is the real signal for those.
// Nothing here is invented: a value that has no source is left out and the screen says it is not known.

// Farmer prices fixed by the Ministry of Agriculture, April 2023 (Tk per kg), still the official schedule in 2026.
export const FERT_PRICE = { urea: 27, tsp: 27, dap: 21, mop: 20 };
export const PRICE_SRC = { label: 'Fertiliser farmer prices, Ministry of Agriculture, April 2023 (TBS)', url: 'https://www.tbsnews.net/node/614670' };
// SRDI's site writes য়/ড় as letter + nukta; compare text in that (NFD) form.
export const has = (text, word) => String(text).normalize('NFD').includes(word.normalize('NFD'));
const priceKey = (name) => (has(name, 'ইউরিয়া') ? 'urea' : has(name, 'টিএসপি') ? 'tsp' : has(name, 'ডিএপি') ? 'dap' : has(name, 'এমওপি') ? 'mop' : null);

// SRDI land types (frs-bd.com, LandtypeDetails): by how deep normal monsoon flooding gets.
export const LAND_TYPES = {
  high: { bn: 'উঁচু জমি', en: 'High land', detail: { bn: 'বর্ষায় স্বাভাবিক বন্যায় ডোবে না', en: 'Not flooded by a normal monsoon' } },
  medium_high: { bn: 'মাঝারি উঁচু জমি', en: 'Medium-high land', detail: { bn: 'স্বাভাবিক বন্যায় ৯০ সেমি (প্রায় ৩ ফুট) পর্যন্ত পানি, দুই সপ্তাহ থেকে কয়েক মাস', en: 'Up to 90 cm (about 3 ft) of water in a normal flood, for two weeks to a few months' } },
  medium_low: { bn: 'মাঝারি নিচু জমি', en: 'Medium-low land', detail: { bn: 'স্বাভাবিক বন্যায় ৯০–১৮০ সেমি (৩–৬ ফুট) পানি, কয়েক মাস', en: '90–180 cm (3–6 ft) of water for months in a normal flood' } },
};

// SRDI: nutrients are most available between pH 5.6 and 7.3 (SRDI Rajshahi seminar, June 2026).
export const PH_GOOD = [5.6, 7.3];
export function phWord(ph) {
  if (ph == null) return null;
  if (ph < 4.5) return { bn: 'খুব টক', en: 'very acidic', tone: 'warn' };
  if (ph < PH_GOOD[0]) return { bn: 'টক', en: 'acidic', tone: 'watch' };
  if (ph <= PH_GOOD[1]) return { bn: 'ফসলের জন্য ভালো', en: 'good for crops', tone: 'ok' };
  if (ph <= 8) return { bn: 'একটু ক্ষারীয়', en: 'slightly alkaline', tone: 'watch' };
  return { bn: 'ক্ষারীয়', en: 'alkaline', tone: 'warn' };
}

export const TEXTURE = {
  sand: { bn: 'বেলে', en: 'Sand' }, 'loamy sand': { bn: 'দোআঁশ বেলে', en: 'Loamy sand' }, 'sandy loam': { bn: 'বেলে দোআঁশ', en: 'Sandy loam' },
  loam: { bn: 'দোআঁশ', en: 'Loam' }, 'silt loam': { bn: 'পলি দোআঁশ', en: 'Silt loam' }, silt: { bn: 'পলি', en: 'Silt' },
  'sandy clay loam': { bn: 'বেলে এঁটেল দোআঁশ', en: 'Sandy clay loam' }, 'clay loam': { bn: 'এঁটেল দোআঁশ', en: 'Clay loam' },
  'silty clay loam': { bn: 'পলি এঁটেল দোআঁশ', en: 'Silty clay loam' }, 'sandy clay': { bn: 'বেলে এঁটেল', en: 'Sandy clay' },
  'silty clay': { bn: 'পলি এঁটেল', en: 'Silty clay' }, clay: { bn: 'এঁটেল', en: 'Clay' },
};

// WRB reference soil groups seen here, in words a farmer can use (IUSS WRB definitions).
export const WRB = {
  Gleysols: { bn: 'গ্লেসল: পানিতে ভেজা থাকা ধূসর মাটি', en: 'Gleysols: grey soils that stay waterlogged' },
  Fluvisols: { bn: 'ফ্লুভিসল: নদীর নতুন পলি মাটি', en: 'Fluvisols: young river silt' },
  Cambisols: { bn: 'ক্যাম্বিসল: অল্প বয়সের, মাঝারি উর্বর মাটি', en: 'Cambisols: young, moderately developed soils' },
  Planosols: { bn: 'প্ল্যানোসল: নিচে শক্ত স্তর, পানি আটকে থাকে', en: 'Planosols: a dense layer below holds water up' },
  Stagnosols: { bn: 'স্ট্যাগনোসল: বৃষ্টির পানি জমে থাকে', en: 'Stagnosols: rainwater stagnates' },
  Luvisols: { bn: 'লুভিসল: নিচের স্তরে এঁটেল জমা', en: 'Luvisols: clay washed into the subsoil' },
  Lixisols: { bn: 'লিক্সিসল: পুরোনো, কম উর্বর মাটি', en: 'Lixisols: old, less fertile soils' },
  Acrisols: { bn: 'অ্যাক্রিসল: টক, কম উর্বর মাটি', en: 'Acrisols: acidic, low-fertility soils' },
  Arenosols: { bn: 'অ্যারেনোসল: বেলে মাটি', en: 'Arenosols: sandy soils' },
  Vertisols: { bn: 'ভার্টিসল: ভারী এঁটেল, শুকালে ফাটে', en: 'Vertisols: heavy clay that cracks when dry' },
  Calcisols: { bn: 'ক্যালসিসল: চুনযুক্ত মাটি', en: 'Calcisols: limey soils' },
  Regosols: { bn: 'রেগোসল: পাতলা, অল্প বয়সের মাটি', en: 'Regosols: thin young soils' },
  Anthrosols: { bn: 'অ্যানথ্রোসল: বহু বছরের চাষে (ধান চাষে) বদলে যাওয়া মাটি', en: 'Anthrosols: soils reshaped by long cultivation (paddy)' },
};

// One union from srdi_frs.json, written out in full (the file stores repeated sentences once, by number).
export function srdiUnionOf(frs, unionId) {
  const u = frs?.unions?.[unionId];
  if (!u) return null;
  if (!frs.words) return u; // already full
  const w = (i) => frs.words[i];
  const recs = {};
  for (const [phys, byLand] of Object.entries(u.recs)) for (const [land, byCrop] of Object.entries(byLand)) for (const [crop, r] of Object.entries(byCrop)) {
    ((recs[phys] ??= {})[land] ??= {})[crop] = {
      variety: w(r.v),
      items: r.items.map(([n, opts]) => ({ nutrient: w(n), options: opts.map(([f, kg, t, how]) => ({ fertilizer: w(f), kg, text: t >= 0 ? w(t) : '', how: w(how) })) })),
    };
  }
  return { ...u, recs };
}

// SRDI's dose for one crop, scaled to the farmer's field, with the cost of the fertilisers that have an official price.
// srdiUnion: srdi_frs.json → unions[id]. Returns null when SRDI has nothing for this union or crop.
// phys: which of SRDI's soil types for the union (default: khiyar on Barind land, otherwise the first one listed).
export function fertilizerPlan(srdiUnion, crop, { land, areaDec = 33, phys, landform } = {}) {
  if (!srdiUnion) return null;
  const types = Object.keys(srdiUnion.recs ?? {});
  const physName = (phys && types.includes(phys) && phys) || (landform === 'barind' && types.find((t) => has(t, 'খিয়ার'))) || types[0];
  const byLand = srdiUnion.recs?.[physName];
  if (!byLand) return null;
  const order = land ? [land, 'medium_high', 'high', 'medium_low'] : ['medium_high', 'high', 'medium_low'];
  const landKey = order.find((k) => byLand[k]?.[crop]);
  if (!landKey) return { physiography: physName, lands: Object.keys(byLand), none: true };
  const rec = byLand[landKey][crop];
  const k = areaDec / 33;
  const items = rec.items.map((it) => {
    const main = it.options[0];
    const none = main.kg === 0 || has(main.text, 'প্রয়োজন নেই'); // SRDI: "not needed"
    const kg = none ? 0 : main.kg == null ? null : main.kg * k;
    const p = priceKey(main.fertilizer);
    return { nutrient: it.nutrient, fertilizer: main.fertilizer, kgPerBigha: none ? 0 : main.kg, kg, how: main.how, text: main.text, notNeeded: none,
      cost: kg != null && p ? Math.round(kg * FERT_PRICE[p]) : null, alt: it.options.slice(1).filter((o) => o.kg != null).map((o) => ({ fertilizer: o.fertilizer, kg: o.kg * k })) };
  });
  return {
    physiography: physName, types, land: landKey, lands: Object.keys(byLand).filter((l) => byLand[l]?.[crop]), variety: rec.variety, items, areaDec,
    cost: items.reduce((a, i) => a + (i.cost ?? 0), 0), unpriced: items.filter((i) => i.cost == null && i.kg > 0).map((i) => i.fertilizer),
    enough: items.filter((i) => i.notNeeded).map((i) => i.nutrient),
  };
}

// Drainage from the most likely soil group.
const POOR = ['Gleysols', 'Planosols', 'Stagnosols', 'Histosols'];
export const drainageOf = (wrb) => (!wrb?.length ? null : POOR.includes(wrb[0].name) ? 'poor' : ['Arenosols', 'Regosols', 'Leptosols'].includes(wrb[0].name) ? 'good' : 'imperfect');
