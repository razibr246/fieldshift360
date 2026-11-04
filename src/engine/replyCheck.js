// Answer check: every Chakra Agent answer from Gemini or Claude is tested against the app's own numbers before the
// farmer or officer hears it. Pure functions, no network; api/agent.js runs them on each answer, asks the model once
// more with the problems listed, and repairs what is still wrong. [RULE]
//
// The idea comes from the Agentic Precision-Agriculture Decision System (Jasser Bkr, 2026,
// github.com/JasserBkr/Agentic-Precision-Agriculture-Decision-System): the model is a reasoning layer, never a data
// layer; a deterministic validator checks grounding and conflicts with the evidence, each problem carries a rule id,
// and confidence is capped when the evidence is thin. The rules below are this app's own, on this app's data
// (the snapshot in src/voice/snapshot.js, the FAO-56 field water balance in engine/fieldwater.js).
//
//   G1_UNGROUNDED_NUMBER  a number with a unit (mm, %, °C, taka, maund, kg) that is not in the app data or the question
//   R1_RAIN_OFFSET        tells the farmer to irrigate while ≥ 5 mm of rain is forecast in 3 days and the field is not RED
//   R1_WATER_ENOUGH       tells the farmer to irrigate while the field's water balance is GREEN
//   R2_STRESS_NOACTION    says no water is needed while the field's water balance is ORANGE or RED
//   R3_OWN_DOSE           gives a chemical dose (ml or g per litre); doses come only from DAE/BARI labels and the officer
//   P1_BAD_TARGET         a proposed action points at a request, hotspot or page that does not exist (it is dropped)
//   R4_CONFIDENCE_CEILING not a problem with the answer: the evidence itself is sample, saved or missing, so the
//                         answer's confidence is capped and the reason is shown

export const RAIN_OFFSET_MM = 5; // the same 5 mm the field water card uses for "rain may make up the shortfall"
export const MAX_ATTEMPTS = 2; // first answer plus one retry, as in the original validator loop

const BN = '০১২৩৪৫৬৭৮৯';
export const latinDigits = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

// Numbers with a unit worth checking. Dates, counts of days and request numbers are left alone: they are too
// easy to say correctly in many ways and too rarely the cause of harm.
const UNIT = String.raw`(মিমি|মিলিমিটার|mm|millimet(?:er|re)s?|%|শতাংশ|percent|°\s*C|°|ডিগ্রি|degrees?|টাকা|tk\b|taka|৳|মণ|maunds?|কেজি|kg)`;
const NUM_UNIT = new RegExp(String.raw`(\d+(?:\.\d+)?)\s*` + UNIT, 'gi');
const TAKA_FIRST = /(?:৳|tk\.?|taka)\s*(\d+(?:\.\d+)?)/gi;

// Every number in the data: numeric leaves, and numbers written inside the app's own sentences (reasons, notes).
export function dataNumbers(data) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
    else if (typeof v === 'string') for (const m of latinDigits(v).replace(/(\d),(?=\d{3})/g, '$1').matchAll(/\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(data);
  return out;
}

// The numbers with units an answer states.
export function statedNumbers(text) {
  const t = latinDigits(text).replace(/(\d),(?=\d{3})/g, '$1');
  const out = [];
  for (const m of t.matchAll(NUM_UNIT)) out.push({ v: Number(m[1]), said: m[0].trim() });
  for (const m of t.matchAll(TAKA_FIRST)) out.push({ v: Number(m[1]), said: m[0].trim() });
  return out;
}

// A stated number is grounded when the data holds it after rounding: to the nearest whole number, or to the nearest
// 5 or 10 when the number said is that round ("about 30 mm" for 28.6), and a 0.62 share said as 62%.
function grounded(v, pool) {
  const tol = v >= 20 && v % 10 === 0 ? 5 : v >= 10 && v % 5 === 0 ? 2.5 : 0.5;
  return pool.some((n) => Math.abs(n - v) <= tol || (Math.abs(n) <= 1 && Math.abs(n * 100 - v) <= 1));
}

const sentences = (text) => String(text ?? '').split(/(?<=[.।!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

// What a sentence says about watering: 'hold', 'irrigate', or null. "Don't" comes first ("সেচ দেবেন না" contains
// "সেচ দেবেন"); a condition ("if the pipe water is 15 cm down", "যদি মাটি শুকনো হয়") is not a firm instruction.
const HOLD = /(সেচ|পানি)(ের|র)?\s*(দেওয়ার|দেয়ার|দিতে|দেবার)?\s*(দরকার|প্রয়োজন)\s*(নেই|নাই|হবে না)|(সেচ|পানি)\s*(দেবেন|দিবেন|দিয়েন|দেওয়া যাবে)\s*না|(সেচ|পানি)\s*লাগবে\s*না|সেচ\s*বন্ধ|no need to (irrigate|water)|(don'?t|do not|hold off( on)?|wait (before|to)|skip|avoid) (irrigat|water)|(doesn'?t|does not|won'?t|will not) need (irrigation|water(ing)?)|no (irrigation|watering) (is )?needed/i;
const IRRIGATE = /সেচ\s*(দিন|দেন|দিয়ে দিন|দিতে হবে|দেওয়া দরকার|দেওয়ার দরকার আছে|দিবেন|দেবেন)|পানি\s*(দিন|দিতে হবে|দিয়ে দিন)|\birrigate\b|\bwater (the|your) (field|crop|plants)\b|(needs?|give it) (an? )?(irrigation|watering)/i;
const CONDITION = /যদি|তবেই|কেবল|শুধু তখন|\bif\b|\bonly when\b|\bunless\b|\bonce\b/i;
export function waterStance(text) {
  let stance = null;
  for (const s of sentences(text)) {
    if (HOLD.test(s)) return 'hold';
    if (IRRIGATE.test(s) && !CONDITION.test(s)) stance = 'irrigate';
  }
  return stance;
}

// A dose of the model's own: "২ মিলি প্রতি লিটার", "2 ml per litre", "প্রতি লিটার পানিতে ১০ গ্রাম".
const DOSE = /\d+(?:\.\d+)?\s*(মিলি|মিলিলিটার|ml|গ্রাম|gm?|grams?)(?![a-z])[^.।]{0,25}(লিটার|litre|liter|\/\s*l(?![a-z]))|(প্রতি|per)\s*(লিটার|litre|liter)[^.।]{0,25}\d+(?:\.\d+)?\s*(মিলি|ml|গ্রাম|gm?|grams?)(?![a-z])/i;
const doseSentences = (text) => sentences(latinDigits(text)).map((s, i) => (DOSE.test(s) ? i : -1)).filter((i) => i >= 0);

// Every id the data knows (requests, hotspots, tasks), for checking what a proposal points at.
function idsIn(data) {
  const ids = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if ((k === 'id' || k === 'request') && (typeof x === 'string' || typeof x === 'number')) ids.add(String(x)); walk(x); }
  };
  walk(data);
  return ids;
}

const problem = (id, level, bn, en) => ({ id, level, bn, en });

// reply: the model's words; proposals: [{action, text, target}]; data: the app sections sent to the model;
// message: the person's question (numbers they said are fair to repeat); sources: web results the model used.
// → { ok, problems, proposals (bad targets removed), ceiling, limits }
export function checkReply({ reply = '', proposals = [], data = {}, role = 'farmer', message = '', sources = [] } = {}) {
  const problems = [];
  const today = data.today ?? null;
  const water = today?.water ?? null, weather = today?.weather ?? null;

  // G1: grounding of stated numbers. With web sources a number may be a current price or warning the app cannot
  // know, so it is only flagged as unverified; without sources it has nowhere to come from.
  const pool = [...dataNumbers(data), ...dataNumbers(message)];
  const loose = statedNumbers(reply).filter((n) => !grounded(n.v, pool));
  if (loose.length) {
    const said = [...new Set(loose.map((n) => n.said))].join(', ');
    problems.push(sources.length
      ? problem('G1_UNGROUNDED_NUMBER', 'note', `এই সংখ্যা অ্যাপের হিসাবে নেই, ওয়েব থেকে এসেছে: ${said}`, `Not in the app's data, from the web: ${said}`)
      : problem('G1_UNGROUNDED_NUMBER', 'fix', `এই সংখ্যা অ্যাপের হিসাবে নেই: ${said}`, `Not in the app's data: ${said}`));
  }

  // R1/R2: the advice on water against the field's FAO-56 water balance and the 3-day rain forecast.
  if (role === 'farmer' && water?.color) {
    const stance = waterStance(reply);
    const rain3 = Number(weather?.rainNext3) || 0;
    if (stance === 'irrigate' && rain3 >= RAIN_OFFSET_MM && water.color !== 'RED') problems.push(problem('R1_RAIN_OFFSET', 'fix', `সেচ দিতে বলা হয়েছে, অথচ আগামী ৩ দিনে ${Math.round(rain3)} মিমি বৃষ্টির পূর্বাভাস`, `Says to irrigate while ${Math.round(rain3)} mm of rain is forecast in the next 3 days`));
    else if (stance === 'irrigate' && water.color === 'GREEN') problems.push(problem('R1_WATER_ENOUGH', 'fix', 'সেচ দিতে বলা হয়েছে, অথচ জমির পানির হিসাবে মাটিতে যথেষ্ট পানি আছে (সবুজ)', 'Says to irrigate while the field water balance shows enough water (GREEN)'));
    if (stance === 'hold' && (water.color === 'ORANGE' || water.color === 'RED')) problems.push(problem('R2_STRESS_NOACTION', 'fix', 'সেচ লাগবে না বলা হয়েছে, অথচ জমির পানির হিসাবে ফসলে পানির টান শুরু হয়েছে', 'Says no water is needed while the field water balance shows the crop is short of water'));
  }

  // R3: never a dose of the model's own.
  if (doseSentences(reply).length) problems.push(problem('R3_OWN_DOSE', 'fix', 'নিজে থেকে ওষুধের মাত্রা বলা হয়েছে; মাত্রা আসবে কেবল লেবেল আর কৃষি অফিসারের কাছ থেকে', 'Gives a chemical dose of its own; doses come only from the label and the agriculture officer'));

  // P1: what each proposal points at must exist. Bad ones are dropped here, before the app's policy sees them.
  const ids = idsIn(data);
  const kept = [];
  for (const p of proposals) {
    const t = String(p?.target ?? '');
    const bad = p?.action === 'navigate' ? !new RegExp(`^/${role}(/[a-z0-9-]+)*(#[a-z0-9-]+)?$`).test(t)
      : p?.action === 'follow_up' || p?.action === 'reply_farmer' || p?.action === 'area_advice' ? !ids.has(t) : false;
    if (bad) problems.push(problem('P1_BAD_TARGET', 'note', `"${t || '—'}" খুঁজে পাওয়া যায়নি, প্রস্তাবটি বাদ দেওয়া হলো`, `"${t || '—'}" was not found; the proposal was dropped`));
    else kept.push(p);
  }

  // R4: how much the evidence behind this answer can carry.
  const limits = [];
  let ceiling = 1;
  const cap = (c, bn, en) => { ceiling = Math.min(ceiling, c); limits.push({ bn, en }); };
  if (data.prov?.climate && data.prov.climate !== 'REAL') cap(0.5, 'আবহাওয়ার রেকর্ড নমুনা, আসল নয়', 'The climate record is a placeholder, not the real one');
  if (role === 'farmer' && !today) cap(0.5, 'জমির আজকের হিসাব পাওয়া যায়নি', "Today's field figures were not available");
  if (weather && weather.live === false) cap(0.7, 'আজকের আবহাওয়া আনা যায়নি, সংরক্ষিত হিসাব ধরা হয়েছে', "Today's weather could not be fetched; saved figures were used");
  if (data.soil?.sample) cap(0.7, 'মাটির তথ্য নমুনা; মাটি পরীক্ষা করলে ভালো', 'The soil figures are a sample; a soil test would be better');

  return { ok: !problems.some((p) => p.level === 'fix'), problems, proposals: kept, ceiling, limits };
}

// The note that goes back to the model for its second try (in English: it is an instruction, not for the person).
export function retryNote(problems) {
  const fix = problems.filter((p) => p.level === 'fix');
  return `Your answer failed the app's checks against its own data:\n${fix.map((p) => `[${p.id}] ${p.en}`).join('\n')}\n`
    + 'Answer again in the same language and style. Use only numbers that are in the app data, follow the field water balance and the rain forecast, and never give a chemical dose. Do not mention these checks.';
}

// After the last try: take out what is still wrong and say what the app's own numbers say instead.
export function repairReply(reply, problems, data, lang = 'bn') {
  const ids = new Set(problems.filter((p) => p.level === 'fix').map((p) => p.id));
  let out = String(reply ?? '');
  if (ids.has('R3_OWN_DOSE')) {
    const drop = new Set(doseSentences(out));
    out = sentences(out).filter((_, i) => !drop.has(i)).join(' ');
    out += lang === 'en' ? ' For the dose, follow the label and ask your agriculture officer first.' : ' ওষুধের মাত্রা লেবেল দেখে ঠিক করুন, আর আগে কৃষি অফিসারকে জিজ্ঞেস করুন।';
  }
  if (ids.has('R1_RAIN_OFFSET') || ids.has('R1_WATER_ENOUGH') || ids.has('R2_STRESS_NOACTION')) {
    const why = (data.today?.water?.reasons ?? []).find((r) => /বৃষ্টি|rain|টান|short|usable/i.test(r?.en ?? '')) ?? data.today?.water?.reasons?.[0];
    if (why) out += lang === 'en' ? ` The app's field water count says: ${why.en}.` : ` অ্যাপের পানির হিসাব বলছে: ${why.bn}।`;
  }
  return out.trim();
}
