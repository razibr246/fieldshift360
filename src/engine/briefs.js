// For each rotation strategy Field Future compares, what the challenge asks a decision-support tool to say: why it
// was suggested, what evidence supports it, what it may offer, where information is missing, and which risks need a
// farmer's or an officer's local review. Built only from the strategy's own ten-year numbers against farming as now,
// the crops' published traits, and the field's NASA SRTM terrain where the field is registered. Pure. [RULE]
import { num } from './dates.js';
import { cropOf, WATER_M3_PER_MM_BIGHA, ureaSavedKgPerBigha, FODDER } from './soilfuture.js';
import TERRAIN from '../data/land/field_terrain.json' with { type: 'json' };

export const TERRAIN_SOURCE = TERRAIN.provenance;
// A registered field's NASA SRTM terrain (scripts/fetch/srtm.mjs), or null.
export const fieldTerrain = (id) => (id && TERRAIN.fields[id]) || null;

const t = (bn, en) => ({ bn, en });
const n = (v, dp = 0) => ({ bn: num(v, 'bn', { dp }), en: num(v, 'en', { dp }) });
const name = (id, lang) => cropOf(id)?.name?.[lang] ?? id;
const list = (ids, lang) => ids.map((id) => name(id, lang)).join(lang === 'bn' ? ', ' : ', ');

export { FODDER };
// Crops with a deep taproot that opens the subsoil below the paddy plough pan.
export const DEEP_ROOT = ['mustard', 'sesame', 'jute'];
const cropsOf = (rot) => [...new Set(rot.cycle.flatMap((y) => [y.rabi, y.k1]).filter((id) => id && id !== 'fallow'))];

// Waterlogging and flood exposure, and erosion, from the field's SRTM terrain (field_terrain.json). Coarse on purpose:
// SRTM has metres of error, so only clear hollows, low coastal land and clearly sloping ground are named.
export function terrainRisk(tr) {
  if (!tr) return null;
  const wet = tr.elev <= 5 ? 'coast' : tr.relief <= -1.5 ? 'hollow' : tr.relief <= -0.5 ? 'some' : 'none';
  const erosion = tr.slope >= 8 ? 'high' : tr.slope >= 5 ? 'some' : 'none';
  return { wet, erosion, ...tr };
}

// s: this strategy's summary (evaluate().sNow or .sFut); b: farming as now's; rot: the rotation; kind: 'habit' | 'best'
// | 'plan' | 'own'; world: 'now' | 'fut'; terrain: field_terrain.json row or null. Returns five lists of { bn, en }.
export function strategyBrief({ s, b, rot, kind, world = 'now', terrain = null }) {
  const why = [], evidence = [], benefits = [], gaps = [], risks = [];
  const crops = cropsOf(rot), habitCrops = kind === 'habit' ? crops : null;
  const dWater = (b.waterMm - s.waterMm) * WATER_M3_PER_MM_BIGHA; // m³ a bigha a year saved (+) or used (−)
  const dMoney = s.money - b.money, dRisk = (s.risk - b.risk) * 100, dPest = s.pest - b.pest, dSoc = s.dSoc - b.dSoc;
  const urea = ureaSavedKgPerBigha(s.nFix);

  // ── why ──
  if (kind === 'habit') why.push(t('এই জমিতে এখন যা হয় (উপগ্রহে দেখা বা অফিসের নিবন্ধন), তুলনার ভিত্তি হিসেবে।', 'What this field grows now (seen by satellite or in the office register), as the baseline to compare against.'));
  else if (kind === 'best') why.push(t('কয়েকশো ফসলচক্র দশ বছর করে চালিয়ে আপনার চাওয়া মিলিয়ে এটাই সবার আগে।', 'Of several hundred rotations run for ten years each, this one comes first for what you said matters to you.'));
  else if (kind === 'plan') why.push(t('এবারের মৌসুমের পরিকল্পনা প্রতি বছর রাখলে দশ বছরে কী হয়, তা দেখাতে।', 'To show what ten years of this season’s plan would do, kept every year.'));
  else why.push(t('আপনার নিজের বেছে নেওয়া ফসলগুলো।', 'The crops you chose yourself.'));
  if (kind !== 'habit') {
    const gains = [
      [dSoc / 2, t(`মাটির জৈব পদার্থ এখনকার চাষের চেয়ে ${num(Math.abs(dSoc), 'bn', { dp: 1 })} শতাংশ বেশি বাড়ে`, `soil organic matter rises ${Math.abs(dSoc).toFixed(1)}% more than farming as now`)],
      [dWater / 150, t(`বিঘায় বছরে প্রায় ${num(Math.round(dWater), 'bn')} ঘনমিটার কম সেচ`, `about ${Math.round(dWater)} m³ less irrigation per bigha a year`)],
      [dMoney / 3000, t(`বিঘায় বছরে প্রায় ৳${num(Math.round(dMoney), 'bn')} বেশি লাভ`, `about ৳${Math.round(dMoney)} more profit per bigha a year`)],
      [-dRisk / 5, t(`আবহাওয়ায় খারাপ মৌসুম ${num(Math.abs(dRisk), 'bn', { dp: 0 })} শতাংশ-বিন্দু কম`, `${Math.abs(dRisk).toFixed(0)} percentage points fewer seasons the weather fails`)],
      [-dPest / 20, t('একই গোত্রের ফসল পরপর কম, তাই রোগ-পোকার চক্র ভাঙে', 'fewer crops of the same family in a row, which breaks pest and disease cycles')],
    ].filter(([g]) => g > 0.15).sort((a, c) => c[0] - a[0]);
    if (gains.length) why.push(t(`সবচেয়ে বড় কারণ: ${gains.slice(0, 2).map((g) => g[1].bn).join('; ')}।`, `Mainly: ${gains.slice(0, 2).map((g) => g[1].en).join('; ')}.`));
    if (s.health.legume) why.push(t(`ডাল জাতীয় ফসল (${list(crops.filter((id) => cropOf(id)?.legume), 'bn')}) শিকড়ের গুটিতে বাতাসের নাইট্রোজেন ধরে।`, `A legume (${list(crops.filter((id) => cropOf(id)?.legume), 'en')}) fixes nitrogen from the air in its root nodules.`));
    const deep = crops.filter((id) => DEEP_ROOT.includes(id));
    if (deep.length) why.push(t(`${list(deep, 'bn')}-এর গভীর শিকড় ধানের শক্ত তলা ভেদ করে নিচের মাটি খোলে।`, `${list(deep, 'en')} send a deep taproot through the rice plough pan and open the subsoil.`));
    if (rot.cycle.some((y) => y.k1 && y.k1 !== 'fallow')) why.push(t('চৈত্র থেকে আষাঢ়, যখন জমি সাধারণত খালি থাকে, তখনও জীবন্ত শিকড় থাকে: মাটি কম ধুয়ে যায়।', 'Living roots fill Chaitra to Asharh, when the land usually lies bare: less soil washes away.'));
    if (rot.residue === 'retain') why.push(t('খড় জমিতেই মিশিয়ে দেওয়া হয়, তাই মাটিতে বেশি জৈব পদার্থ ফেরে।', 'The straw is ploughed back in, returning more organic matter to the soil.'));
  }

  // ── evidence ──
  evidence.push(t(`আবহাওয়ার ঝুঁকি: প্রতিটি ফসলের ব্যর্থতার নিয়ম নাসা POWER-এর ২৫ মৌসুমে (২০০১–২০২৫) চালানো; খারাপ মৌসুম গড়ে ${num(s.risk * 100, 'bn', { dp: 0 })}%।`, `Weather risk: each crop’s failure rules replayed over 25 seasons of NASA POWER (2001–2025); the weather failed ${(s.risk * 100).toFixed(0)}% of seasons on average.`));
  evidence.push(t('মাটির কার্বন: ICBM মডেল (Andrén ও Kätterer ১৯৯৭), শুরু আপনার জমির ISRIC SoilGrids কার্বন থেকে।', 'Soil carbon: the ICBM model (Andrén & Kätterer 1997), starting from your field’s ISRIC SoilGrids carbon.'));
  evidence.push(t(`সেচ: FAO-56 পদ্ধতিতে নাসা POWER-এর আবহাওয়া থেকে, বিঘায় বছরে প্রায় ${num(Math.round(s.waterMm * WATER_M3_PER_MM_BIGHA), 'bn')} ঘনমিটার।`, `Irrigation: the FAO-56 method on NASA POWER weather, about ${Math.round(s.waterMm * WATER_M3_PER_MM_BIGHA)} m³ per bigha a year.`));
  evidence.push(t('আয়: FAOSTAT-এর জাতীয় ফলন × প্রকাশিত দাম ও খরচ (কৃষি বিপণন অধিদপ্তর ও অন্যান্য সূত্র)।', 'Income: FAOSTAT national yields × published prices and costs (Department of Agricultural Marketing and others).'));
  if (world === 'fut') evidence.push(t('২০৪০-এর দশক: নাসার NEX-GDDP-CMIP6, আটটি জলবায়ু মডেলের মাসিক পরিবর্তন।', 'The 2040s: NASA NEX-GDDP-CMIP6, the monthly change in eight climate models.'));
  if (terrain) evidence.push(t(`জমির ঢাল আর উচ্চতা: নাসার SRTM (৩০ মিটার), জমি সমুদ্র থেকে ${num(terrain.elev, 'bn', { dp: 0 })} মিটার উঁচু, চারপাশের চেয়ে ${num(Math.abs(terrain.relief), 'bn', { dp: 1 })} মিটার ${terrain.relief < 0 ? 'নিচু' : 'উঁচু'}।`, `Lie of the land: NASA SRTM (30 m); the field stands ${terrain.elev.toFixed(0)} m above sea level, ${Math.abs(terrain.relief).toFixed(1)} m ${terrain.relief < 0 ? 'below' : 'above'} the land round it.`));

  // ── benefits ──
  if (kind === 'habit') benefits.push(t('চেনা ফসল, চেনা বাজার, যন্ত্র আর বীজ হাতের কাছে।', 'Familiar crops and markets, with machines and seed at hand.'));
  if (dSoc > 0.05) benefits.push(t(`মাটি: জৈব পদার্থ দশ বছরে ${num(s.dSoc, 'bn', { dp: 1 })}% বদলায় (এখনকার চাষে ${num(b.dSoc, 'bn', { dp: 1 })}%)।`, `Soil: organic matter changes ${s.dSoc.toFixed(1)}% in ten years (${b.dSoc.toFixed(1)}% farming as now).`));
  if (dWater > 5) benefits.push(t(`পানি: বিঘায় বছরে প্রায় ${num(Math.round(dWater), 'bn')} ঘনমিটার কম সেচ, পাম্পের বিল আর মাটির নিচের পানি দুটোই বাঁচে।`, `Water: about ${Math.round(dWater)} m³ less irrigation per bigha a year, saving pump bills and groundwater.`));
  if (dMoney > 200) benefits.push(t(`আয়: বিঘায় বছরে প্রায় ৳${num(Math.round(dMoney), 'bn')} বেশি।`, `Income: about ৳${Math.round(dMoney)} more per bigha a year.`));
  if (urea >= 0.5) benefits.push(t(`সার: ডালের নাইট্রোজেনে বিঘায় বছরে প্রায় ${num(urea, 'bn', { dp: 1 })} কেজি ইউরিয়া কম লাগে।`, `Fertiliser: the legume’s nitrogen saves about ${urea.toFixed(1)} kg of urea per bigha a year.`));
  const fodder = crops.filter((id) => FODDER[id]);
  if (fodder.length && rot.residue !== 'retain') benefits.push(t(`গোখাদ্য: ${list(fodder, 'bn')}-এর খড় বা লতা গরুর খাবার হয়।`, `Fodder: the straw or haulm of ${list(fodder, 'en')} feeds cattle.`));
  if (kind !== 'habit' && dRisk < -2) benefits.push(t('ঝুঁকি: খারাপ আবহাওয়ার বছরে কম ক্ষতি।', 'Risk: less lost in a bad-weather year.'));

  // ── information gaps ──
  if (s.unpriced?.length) gaps.push(t(`${list(s.unpriced, 'bn')}-এর নির্ভরযোগ্য দাম ও খরচের সূত্র নেই, তাই আয়ে শূন্য ধরা।`, `No reliable price and cost source for ${list(s.unpriced, 'en')}, so their income is counted as zero.`));
  gaps.push(t('ফলন দেশের গড় (FAOSTAT), আপনার জমির নয়; ফসল তুলে লিখে রাখলে পরের হিসাবে নিজের ফলন ধরা হবে।', 'Yields are national averages (FAOSTAT), not your field’s; record your harvests and later runs use your own.'));
  gaps.push(t('মাটি ২৫০ মিটারের ঘরের হিসাব (SoilGrids), মাটি পরীক্ষা নয়; একটা মাটি পরীক্ষা শুরুর কার্বন আর pH ঠিক করবে।', 'Soil is a 250 m estimate (SoilGrids), not a soil test; one soil test would pin the starting carbon and pH.'));
  gaps.push(t('রোগ-পোকার চাপ একটা নিয়ম (একই গোত্র পরপর কতবার), মাঠে দেখা পোকা নয়।', 'Pest pressure is a rule (how often one crop family follows itself), not pests seen in the field.'));
  const fresh = habitCrops ? [] : crops.filter((id) => !['boro', 'aman'].includes(id));
  if (fresh.length) gaps.push(t(`${list(fresh, 'bn')}-এর স্থানীয় বাজার, বীজ আর যন্ত্রের খবর এখানে নেই।`, `Local markets, seed and machines for ${list(fresh, 'en')} are not known here.`));

  // ── risks needing local review ──
  if (kind !== 'habit') {
    if (dWater < -5) risks.push(t(`এখনকার চাষের চেয়ে বিঘায় বছরে প্রায় ${num(Math.round(-dWater), 'bn')} ঘনমিটার বেশি সেচ লাগে।`, `About ${Math.round(-dWater)} m³ more irrigation per bigha a year than farming as now.`));
    if (dMoney < -200) risks.push(t(`এখনকার চাষের চেয়ে বিঘায় বছরে প্রায় ৳${num(Math.round(-dMoney), 'bn')} কম আয় (দাম-না-জানা ফসল বাদে)।`, `About ৳${Math.round(-dMoney)} less income per bigha a year than farming as now (leaving out unpriced crops).`));
    if (dRisk > 2) risks.push(t(`আবহাওয়ায় খারাপ মৌসুম ${num(dRisk, 'bn', { dp: 0 })} শতাংশ-বিন্দু বেশি।`, `${dRisk.toFixed(0)} percentage points more seasons the weather fails.`));
    if (rot.residue === 'retain' && fodder.length) risks.push(t('খড় জমিতে মেশালে গরুর খড় কমে: গোখাদ্য কোথা থেকে আসবে, আগে ভেবে নিন।', 'Ploughing the straw in leaves less straw for the cattle: plan where the fodder will come from.'));
    if (fresh.length) risks.push(t(`নতুন ফসল (${list(fresh, 'bn')}): জাত, বোনার সময় আর বাজার উপসহকারী কৃষি কর্মকর্তার সঙ্গে মিলিয়ে নিন।`, `New crops (${list(fresh, 'en')}): check variety, sowing time and market with the sub-assistant agriculture officer.`));
  }
  const tr = terrainRisk(terrain);
  const wetShy = crops.filter((id) => cropOf(id)?.waterlog === 'high' || cropOf(id)?.wellDrained);
  if (tr && (tr.wet === 'hollow' || tr.wet === 'coast') && wetShy.length) risks.push(t(`জমিটা ${tr.wet === 'coast' ? 'উপকূলের নিচু জমি' : 'চারপাশের চেয়ে নিচু, বৃষ্টির পানি জমে'}; ${list(wetShy, 'bn')} জলাবদ্ধতা সহ্য করে না। নালা কাটা বা উঁচু বেড দরকার কি না দেখুন।`, `The field is ${tr.wet === 'coast' ? 'low coastal land' : 'lower than the land round it, where rain gathers'}; ${list(wetShy, 'en')} cannot stand waterlogging. Check whether drains or raised beds are needed.`));
  if (tr && tr.erosion !== 'none') risks.push(t('জমিতে ঢাল আছে: খালি মাসে বৃষ্টিতে মাটি ধুয়ে যেতে পারে; ঢাল বরাবর নয়, আড়াআড়ি চাষ দিন।', 'The field slopes: rain can wash soil off in bare months; plough across the slope, not down it.'));
  risks.push(t('এটা মডেলের হিসাব, পূর্বাভাস নয়; শুরু করার আগে কৃষি কর্মকর্তা আর অভিজ্ঞ কৃষকের সঙ্গে কথা বলুন।', 'These are model estimates, not forecasts; talk to your agriculture officer and experienced farmers before you start.'));
  return { why, evidence, benefits, gaps, risks };
}
