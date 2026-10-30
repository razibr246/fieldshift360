// চক্র এজেন্ট (Chakra Agent): the farmer's and the officer's autonomous assistant. Pure functions, no React, so Node
// tests run them and the UI only wires them to the store.
//
//   farmerTasks(ctx) / officerTasks(ctx)  -> the tasks the agent sees right now, each with the effects it would apply
//   gateFor(role, mode, task)             -> 'auto' (the agent does it), 'confirm' (the person taps yes) or 'verdict'
//                                            (an officer must approve: a human decides anything sent in the office's name)
//   authorize(role, effect, scope)        -> the security check every effect passes before it reaches the reducer
//   appendAudit / verifyAudit             -> an append-only, hash-chained log of what the agent did and who approved it
//
// The agent invents no agronomy: every task reads numbers the app already computed (field water balance, weather,
// harvest window, DAM price seasons, requests and hotspots) and texts from engine/advice.js and engine/cropDoctor.js.
import { CROP_PROBLEMS } from '../data/crop_problems.js';
import { localCropAssessment } from './cropDoctor.js';

export const AGENT_NAME = { bn: 'চক্র এজেন্ট', en: 'Chakra Agent' };
export const MODES = ['manual', 'agent'];
// What the agent may do on its own per role; anything outside a list is refused by authorize().
// Farmers' own agent may tell them things, report their problem to the office and chase an unanswered one.
// The officer's agent only drafts: every message to farmers, status change or escalation waits for the officer.
export const POLICY = {
  farmer: { auto: ['notify', 'addRequest', 'followUp'], verdict: [] },
  officer: { auto: ['notify'], verdict: ['addAdvisory', 'updateRequest', 'escalate'] },
};
export const DAILY_AUTO_LIMIT = 12; // a runaway rule cannot flood the office: at most this many automatic actions a day
const DAY = 86400000;

const bn = (n) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const both = (b, e) => ({ bn: b, en: e });

// ───────────────────────── input hygiene ─────────────────────────
// Anything typed or spoken: no control characters, one line of whitespace, a hard length cap.
export function sanitize(text, max = 600) {
  return String(text ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ───────────────────────── problem words ─────────────────────────
const CROP_WORDS = [
  ['tomato', ['টমেটো', 'tomato']], ['mustard', ['সরিষা', 'সর্ষে', 'mustard']], ['wheat', ['গম', 'wheat']],
  ['lentil', ['মসুর', 'ডাল', 'lentil']], ['boro', ['বোরো', 'boro']], ['aman', ['আমন', 'ধান', 'rice', 'paddy', 'aman']],
];
// Most specific first: a named pest beats the plain word "পোকা" (insect).
const PROBLEM_WORDS = [
  ['bph', ['কারেন্ট', 'ফড়িং', 'hopper']], ['stem_borer', ['মাজরা', 'borer', 'সাদা শিষ']], ['rice_bug', ['গান্ধি']],
  ['blast', ['ব্লাস্ট', 'শিষ ভাঙ', 'blast']], ['late_blight', ['মড়ক', 'নাবি ধসা', 'late blight']], ['early_blight', ['আগাম ধসা']],
  ['aphid', ['জাব', 'aphid']], ['fruit_borer', ['ফল ছিদ্র', 'ফলে ছিদ্র']], ['rodent', ['ইঁদুর', 'rat']],
  ['cold', ['ঠান্ডা', 'শীতে', 'cold']], ['wilt', ['নেতিয়ে', 'ঢলে', 'wilt']], ['water', ['সেচ', 'পানি নেই', 'শুকিয়ে', 'water']],
  ['waste', ['বর্জ্য', 'কারখানা', 'waste']], ['leaf_spot', ['দাগ', 'spot', 'পচ', 'rot']],
];
const PEST_WORDS = ['পোকা', 'insect', 'pest', 'bug'];
const URGENT_WORDS = ['জরুরি', 'দ্রুত', 'তাড়াতাড়ি', 'পুরো জমি', 'সব গাছ', 'ছড়িয়ে', 'urgent', 'spreading', 'whole field'];
const hasAny = (t, ws) => ws.some((w) => t.includes(w));

// What a farmer's words say: which crop, which problem, how urgent. Null problem = not a field problem.
export function classifyProblem(text, cropNow) {
  const t = sanitize(text).toLowerCase();
  const crop = CROP_WORDS.find(([, ws]) => hasAny(t, ws))?.[0] ?? cropNow;
  const known = CROP_PROBLEMS[crop] ?? [];
  let symptom = PROBLEM_WORDS.find(([, ws]) => hasAny(t, ws))?.[0] ?? null;
  // A generic "insect" on this crop is its first listed pest (BPH on rice, aphid on mustard, fruit borer on tomato).
  if (!symptom && hasAny(t, PEST_WORDS)) symptom = known.find((p) => p.kind === 'pest')?.key ?? 'aphid';
  const urgent = hasAny(t, URGENT_WORDS) || !!known.find((p) => p.key === symptom)?.urgent || symptom === 'wilt' || symptom === 'water';
  return { crop, symptom, urgent };
}

// ───────────────────────── farmer tasks ─────────────────────────
// ctx: { farmer: {id, union, village, villageBn, lat, lon, name}, officer: {bn,en}, today, water: {color, reasons},
//        alerts: [{bn,en}], plan: {crop:{id,bn,en}, confirmed, daysToPlant}, harvest: {daysTo, glut, hold, crop},
//        requests: [{id, status, created, symptom, priority}], unread: n }
export function farmerTasks(ctx) {
  const out = [];
  const f = ctx.farmer;
  if (ctx.water?.color === 'RED') {
    out.push({ id: `water-${ctx.today}`, kind: 'water', risk: 'medium', tags: ['MODEL', 'SAT'],
      title: both('আজ জমিতে সেচ দিন', 'Water the field today'), body: ctx.water.reasons?.[0] ?? both('মাটির পানি কমে গেছে', 'The soil is running dry'),
      why: both('জমির পানির হিসাব (FAO-56) আর আজকের আবহাওয়া থেকে', 'From the field water balance (FAO-56) and today’s weather'),
      effects: [{ type: 'notify' }] });
  }
  for (const [i, a] of (ctx.alerts ?? []).entries()) {
    out.push({ id: `wx-${ctx.today}-${i}`, kind: 'weather', risk: 'medium', tags: ['MODEL'], title: both('আবহাওয়ার সতর্কতা', 'Weather warning'), body: a,
      why: both('আজকের আবহাওয়ার পূর্বাভাস থেকে', 'From today’s weather forecast'), effects: [{ type: 'notify' }] });
  }
  if (ctx.plan && !ctx.plan.confirmed && ctx.plan.daysToPlant != null && ctx.plan.daysToPlant >= 0 && ctx.plan.daysToPlant <= 21) {
    out.push({ id: `plan-${ctx.plan.crop.id}`, kind: 'plan', risk: 'low', tags: ['RULE'],
      title: both(`${ctx.plan.crop.bn} লাগানোর ${bn(ctx.plan.daysToPlant)} দিন বাকি`, `${ctx.plan.daysToPlant} days to plant ${ctx.plan.crop.en.toLowerCase()}`),
      body: both('পরিকল্পনা এখনো নিশ্চিত করেননি। বীজ, সার আর চারা আগেভাগে জোগাড় করুন, আর পরিকল্পনা পাতায় নিশ্চিত করুন।', 'You have not confirmed the plan yet. Get seed, fertiliser and seedlings ready, and confirm it on the plan page.'),
      why: both('মৌসুমের পরিকল্পনা থেকে', 'From your season plan'), nav: '/farmer/plan', effects: [{ type: 'notify' }] });
  }
  const h = ctx.harvest;
  if (h && h.daysTo != null && h.daysTo <= 30 && h.daysTo >= -20) {
    const crowd = h.glut === 'High' || h.glut === 'Medium';
    const hold = h.hold ? both(` দাম সাধারণত ${bn(Math.round(h.hold.gain * 100))}% বেশি থাকে পরের মাসগুলোয়, তাই শুকিয়ে রাখতে পারলে কিছুটা পরে বিক্রি করুন।`, ` Prices usually run ${Math.round(h.hold.gain * 100)}% higher in the months after, so if you can dry and store it, sell some later.`) : both('', '');
    out.push({ id: `market-${h.crop.id}`, kind: 'market', risk: 'low', tags: ['RECORD', 'MODEL'],
      title: h.daysTo > 0 ? both(`${bn(h.daysTo)} দিনে ${h.crop.bn} তোলা শুরু`, `${h.crop.en} harvest starts in ${h.daysTo} days`) : both(`${h.crop.bn} তোলার সময় চলছে`, `${h.crop.en} harvest is on`),
      body: both(`${crowd ? 'আপনার ইউনিয়নে অনেকে একই সময়ে তুলবেন, তাই সব একসঙ্গে বাজারে না নিয়ে ভাগ করে বিক্রি করুন।' : 'আপনার ইউনিয়নে একসঙ্গে তোলার চাপ কম।'}${hold.bn} ব্যাপারী আর বাজারের দাম দুটোই জেনে নিন।`,
        `${crowd ? 'Many in your union harvest at the same time, so sell in parts rather than all at once.' : 'Few in your union harvest at the same time.'}${hold.en} Check both the trader’s and the market price.`),
      why: both('কৃষি বিপণন অধিদপ্তরের ২০০৮–২০২৩ মাসিক দাম আর ইউনিয়নের পরিকল্পনা থেকে', 'From DAM monthly prices 2008–2023 and the union’s plans'), nav: '/farmer/harvest', effects: [{ type: 'notify' }] });
  }
  // A problem the office has not answered in three days: the agent chases it once (the officer sees it in Alerts).
  for (const r of ctx.requests ?? []) {
    const age = Math.floor((ctx.today - r.created) / DAY);
    if (r.status !== 'open' || age < 3) continue;
    out.push({ id: `follow-${r.id}`, kind: 'followUp', risk: 'low', tags: ['RULE'],
      title: both(`${bn(age)} দিনেও উত্তর আসেনি`, `No reply after ${age} days`),
      body: both(`আপনার অনুরোধের কথা ${ctx.officer?.bn ?? 'কৃষি কর্মকর্তা'}-কে আবার মনে করিয়ে দিচ্ছি।`, `Reminding ${ctx.officer?.en ?? 'the officer'} about your request.`),
      why: both('তিন দিনের বেশি খোলা অনুরোধ', 'A request open for more than three days'),
      effects: [{ type: 'followUp', esc: { id: `FU-${r.id}`, union: f.union, kind: 'followup', request: r.id, text: both(`${f.name.bn}: ${bn(age)} দিন ধরে উত্তরের অপেক্ষা`, `${f.name.en}: waiting ${age} days for a reply`), at: ctx.today } }] });
  }
  if (ctx.unread > 0) {
    out.push({ id: `unread-${ctx.unread}`, kind: 'message', risk: 'low', tags: ['RECORD'], title: both(`কর্মকর্তার ${bn(ctx.unread)}টি নতুন বার্তা`, `${ctx.unread} new message(s) from your officer`),
      body: both('সাহায্য পাতায় পড়ে নিন।', 'Read them on the Help page.'), why: both('উপজেলা কৃষি অফিস থেকে', 'From the upazila agriculture office'), nav: '/farmer/help', effects: [{ type: 'notify' }] });
  }
  return out;
}

// The farmer described a problem: match their words to the crop reference list, then send the report to the office.
export function problemTask(text, ctx) {
  const clean = sanitize(text, 400);
  const { crop, symptom, urgent } = classifyProblem(clean, ctx.cropNow);
  if (!symptom) return null;
  const f = ctx.farmer;
  const look = localCropAssessment({ crop, symptomKey: symptom, context: { weather: ctx.weather, note: clean }, lang: ctx.lang ?? 'bn' });
  const top = look.findings?.[0];
  const priority = urgent ? 'High' : 'Medium';
  const req = {
    id: `CK-${f.id}-${ctx.now.toString(36)}`, farmerId: f.id, union: f.union, village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon,
    crop, symptom, type: 'help', text: { bn: clean, en: clean }, created: ctx.today, status: 'open', priority, mine: true, via: 'chakra', image: null,
    // This is a text classifier, not an image diagnosis or a calibrated confidence score.
    ai: null,
  };
  // Use an existing extension practice when present, otherwise give neutral photo-and-officer guidance.
  const advice = ctx.adviceFn?.(req) ?? both(look.actions_now?.slice(0, 2).join(' ') ?? '', look.actions_now?.slice(0, 2).join(' ') ?? '');
  return {
    id: req.id, kind: 'problem', risk: urgent ? 'high' : 'medium', tags: ['RULE'], look, advice,
    title: both(`সমস্যা: ${top?.name_bn ?? 'মাঠের সমস্যা'}`, `Problem: ${top?.name_en ?? 'field problem'}`),
    body: both(`${advice.bn} ${urgent ? 'জরুরি হিসেবে' : ''} উপজেলা কৃষি অফিসে পাঠানো হবে।`.replace(/\s+/g, ' ').trim(), `${advice.en} It goes to the upazila agriculture office${urgent ? ' as urgent' : ''}.`.trim()),
    why: both('আপনার লেখা ও ফসলের সমস্যা-তালিকার মিল থেকে; ছবির পরীক্ষা নয়', 'From your words and the crop reference list; no photo was analyzed'),
    effects: [{ type: 'addRequest', req }],
  };
}

// ───────────────────────── officer tasks ─────────────────────────
// ctx: { unions: Set|array of union ids in the officer's upazila, today, requests: [...], hotspots: [{id, crop, symptom,
//        members, recipients, draft:{bn,en}, sent}], replyFn(r) -> {bn,en}, farmerName(id) -> {bn,en}, upazila }
export function officerTasks(ctx) {
  const mine = new Set(ctx.unions);
  const out = [];
  const open = (ctx.requests ?? []).filter((r) => r.status === 'open' && mine.has(r.union));
  const PR = { High: 0, Medium: 1, Low: 2 };
  open.sort((a, b) => PR[a.priority] - PR[b.priority] || a.created - b.created);
  for (const r of open.slice(0, 12)) {
    const reply = ctx.replyFn(r);
    const look = r.crop && CROP_PROBLEMS[r.crop] ? localCropAssessment({ crop: r.crop, symptomKey: r.symptom, context: { note: r.text?.bn }, lang: 'bn' }) : null;
    const name = ctx.farmerName(r.farmerId) ?? both(r.farmerId, r.farmerId);
    const age = Math.floor((ctx.today - r.created) / DAY);
    out.push({ id: `reply-${r.id}`, kind: 'reply', request: r.id, risk: r.priority === 'High' ? 'high' : 'medium', tags: ['RULE'],
      title: both(`${name.bn}-কে উত্তর`, `Reply to ${name.en}`), body: reply, look,
      why: both(`${bn(age)} দিনের পুরোনো অনুরোধ, অগ্রাধিকার ${r.priority === 'High' ? 'জরুরি' : r.priority === 'Low' ? 'কম' : 'মাঝারি'}`, `Request ${age} days old, ${r.priority.toLowerCase()} priority`),
      nav: `/officer/requests/${r.id}`,
      effects: [
        { type: 'addAdvisory', adv: { id: `CK-ADV-${r.id}`, text: reply.bn, to: [r.farmerId], at: ctx.today, request: r.id, via: 'chakra' } },
        { type: 'updateRequest', ids: [r.id], patch: { status: 'answered' } },
      ] });
    if (r.priority === 'High' && age >= 2) {
      out.push({ id: `esc-${r.id}`, kind: 'escalate', request: r.id, risk: 'high', tags: ['RULE'],
        title: both(`উপজেলা অফিসারকে জানান: ${name.bn}`, `Tell the upazila officer: ${name.en}`), body: both(`জরুরি অনুরোধ ${bn(age)} দিন ধরে খোলা।`, `An urgent request open for ${age} days.`),
        why: both('জরুরি অনুরোধ দুই দিনের বেশি খোলা', 'Urgent and open for over two days'),
        effects: [{ type: 'escalate', esc: { id: `REQ-${r.id}`, union: r.union, kind: 'request', text: both(`${name.bn}: জরুরি, ${bn(age)} দিন`, `${name.en}: urgent, ${age} days`), at: ctx.today } }] });
    }
  }
  for (const h of ctx.hotspots ?? []) {
    const members = h.members.filter((m) => mine.has(m.union));
    if (h.sent || members.length < 2) continue;
    out.push({ id: `area-${h.id}`, kind: 'area', risk: 'high', tags: ['RULE', 'DEMO'],
      title: both(`এলাকায় একই সমস্যার ${bn(members.length)}টি খবর`, `${members.length} reports of the same problem nearby`), body: h.draft,
      why: both('কাছাকাছি গ্রামে একই ফসলে একই লক্ষণ', 'The same symptom on the same crop in nearby villages'),
      effects: [
        { type: 'addAdvisory', adv: { id: `CK-AREA-${h.id}`, text: h.draft.bn, to: [...new Set(members.map((m) => m.farmerId))], at: ctx.today, cluster: h.id, via: 'chakra' } },
        { type: 'updateRequest', ids: members.map((m) => m.id), patch: { status: 'answered' } },
      ] });
  }
  return out;
}

// ───────────────────────── gates and security ─────────────────────────
export function gateFor(role, mode, task) {
  const types = task.effects.map((e) => e.type);
  if (types.some((t) => POLICY[role]?.verdict.includes(t))) return 'verdict';
  if (types.every((t) => t === 'notify')) return 'auto'; // telling the person something never needs a yes
  return mode === 'agent' && types.every((t) => POLICY[role]?.auto.includes(t)) ? 'auto' : 'confirm';
}

// scope: farmer/request ownership for a farmer; assigned unions and farmer lookup for an officer.
export function authorize(role, effect = {}, scope = {}) {
  const p = POLICY[role];
  if (!p || ![...p.auto, ...p.verdict].includes(effect.type)) return { ok: false, reason: 'not allowed for this role' };
  if (role === 'farmer') {
    if (effect.type === 'addRequest' && effect.req?.farmerId !== scope.farmerId) return { ok: false, reason: 'another farmer’s request' };
    if (effect.type === 'addRequest' && effect.req?.union !== scope.union) return { ok: false, reason: 'another farmer’s union' };
    if (effect.type === 'addRequest' && (sanitize(effect.req?.text?.bn, 400) !== effect.req?.text?.bn || sanitize(effect.req?.text?.en, 400) !== effect.req?.text?.en)) return { ok: false, reason: 'unclean text' };
    if (effect.type === 'followUp') {
      const request = scope.requestOf?.(effect.esc?.request);
      if (!request || request.farmerId !== scope.farmerId || request.union !== effect.esc?.union) return { ok: false, reason: 'another farmer’s request' };
    }
  } else {
    const unions = new Set(Array.isArray(scope.unions) ? scope.unions : []);
    if (effect.type === 'escalate' && !unions.has(effect.esc?.union)) return { ok: false, reason: 'outside this upazila' };
    if (effect.type === 'updateRequest' && !(effect.ids ?? []).every((id) => unions.has(scope.unionOf?.(id)))) return { ok: false, reason: 'outside this upazila' };
    if (effect.type === 'addAdvisory') {
      const recipients = effect.adv?.to;
      if (!Array.isArray(recipients) || !recipients.length) return { ok: false, reason: 'no recipient' };
      if (!scope.farmerUnionOf || !recipients.every((id) => unions.has(scope.farmerUnionOf(id)))) return { ok: false, reason: 'recipient outside this upazila' };
      if (typeof effect.adv?.text !== 'string' || sanitize(effect.adv.text, 600) !== effect.adv.text) return { ok: false, reason: 'unclean text' };
    }
  }
  return { ok: true };
}

export function autoCountToday(log, role, today) {
  return (log ?? []).filter((e) => e.role === role && e.gate === 'auto' && e.action !== 'notify' && e.at >= today && e.at < today + DAY).length;
}

// ───────────────────────── audit log ─────────────────────────
// cyrb53: a fast 53-bit string hash. Enough to show an entry was edited or removed after the fact in the demo; a
// deployment signs entries on the server instead.
export function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const body = (e) => JSON.stringify([e.seq, e.at, e.role, e.who, e.task, e.action, e.gate, e.result, e.prev]);
export const AUDIT_KEEP = 300;

export function appendAudit(log, entry) {
  const last = log?.[log.length - 1];
  const e = { seq: (last?.seq ?? 0) + 1, prev: last?.hash ?? 'genesis', ...entry };
  e.hash = hash53(body(e));
  return [...(log ?? []), e].slice(-AUDIT_KEEP);
}

export function verifyAudit(log) {
  for (let i = 0; i < (log ?? []).length; i++) {
    const e = log[i];
    if (hash53(body(e)) !== e.hash) return { ok: false, brokenAt: e.seq };
    if (i > 0 && e.prev !== log[i - 1].hash) return { ok: false, brokenAt: e.seq };
  }
  return { ok: true, n: log?.length ?? 0 };
}
