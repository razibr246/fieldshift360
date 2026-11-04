// চক্র দল (Chakra Crew): a small team of specialist helpers behind চক্র এজেন্ট, each with one job, and a coordinator that
// decides who is needed, lets them work in turn on a shared notebook, and turns what they found into one short spoken
// answer. Pure functions, no React: the UI hands in the same context engine/chakra.js uses, and this file hands back
// notes, a briefing and a trace of who did what.
//
//   runCrew(role, ctx, { question, tasks })  -> { members, notes, say, trace, facts }
//
// Members never act. A note may point at one of চক্র এজেন্ট's own tasks (taskId), and only that task, through
// gateFor/authorize in engine/chakra.js, can change anything; so the crew cannot get round the officer's approval.
// The idea of role-based members with a coordinator was inspired by multi-agent frameworks such as CrewAI; this is
// its own design for a farmer on a basic phone: few members, fixed data, a three-point spoken answer.

const both = (bn, en) => ({ bn, en });
const bn = (n) => String(Math.round(n)).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const taskOf = (tasks, kind) => (tasks ?? []).filter((t) => t.kind === kind);

// ───────────────────────── farmer crew ─────────────────────────
// ctx: the farmerTasks() context plus weather { rain7, rainNext3, tmax } (numbers or null).
// Order matters: later members read the facts earlier ones wrote in the notebook.
export const FARMER_CREW = [
  {
    id: 'weather', name: both('আবহাওয়া ও পানি পাহারাদার', 'Weather and water watch'),
    goal: both('জমিতে আজ পানি লাগবে কি না, আর সামনের আবহাওয়া কী বলছে', 'Whether the field needs water today, and what the coming weather means'),
    reads: both('জমির পানির হিসাব, আবহাওয়ার পূর্বাভাস', 'field water balance, weather forecast'), topics: /সেচ|পানি|বৃষ্টি|আবহাওয়া|গরম|ঠান্ডা|water|irrigat|rain|weather|heat|hot/i,
    run(ctx, book, tasks) {
      const w = ctx.weather ?? {};
      const out = [];
      if (w.rainNext3 == null && w.tmax == null) {
        out.push({ key: 'wx-none', weight: 20, tags: ['RULE'], text: both('আজকের আবহাওয়া আনা যায়নি, তাই মাটি হাতে নিয়ে দেখে সেচ ঠিক করুন।', 'Today’s weather could not be fetched, so feel the soil before you water.') });
        return out;
      }
      book.rainSoon = w.rainNext3 >= 20;
      book.heavyRain = w.rainNext3 >= 40;
      book.hot = w.tmax >= 35;
      book.dry = ctx.water?.color === 'RED';
      const waterTask = taskOf(tasks, 'water')[0];
      // The water balance says dry but the forecast says rain: the watch says so rather than giving two orders.
      if (book.dry && book.rainSoon) out.push({ key: 'water-wait', weight: 82, tags: ['MODEL'], taskId: waterTask?.id, text: both(`মাটি শুকিয়ে আসছে, তবে পূর্বাভাসে তিন দিনে ${bn(w.rainNext3)} মিলিমিটার বৃষ্টি। খুব বেশি শুকনো না হলে বৃষ্টির জন্য একটু অপেক্ষা করুন, কাল সকালে আবার মাটি দেখুন।`, `The soil is drying, but ${Math.round(w.rainNext3)} mm of rain is forecast in three days. Unless it is very dry, wait for the rain and check the soil again tomorrow morning.`) });
      else if (book.dry) out.push({ key: 'water-now', weight: 88, tags: ['MODEL'], taskId: waterTask?.id, text: both('জমির মাটি শুকিয়ে গেছে, আর সামনে বৃষ্টি নেই। আজই সেচ দিন।', 'The soil is dry and no rain is coming. Water the field today.') });
      if (book.hot) out.push({ key: 'heat', weight: 62, tags: ['MODEL'], text: both(`আজ গরম ${bn(w.tmax)} ডিগ্রি পর্যন্ত উঠবে। সেচ দিলে সকালে বা বিকেলে দিন, ভরদুপুরে নয়।`, `It will reach ${Math.round(w.tmax)} °C today. Water in the morning or evening, not at midday.`) });
      if (book.heavyRain) out.push({ key: 'rain-heavy', weight: 76, tags: ['MODEL'], text: both('ভারী বৃষ্টি আসছে। জমির নালা পরিষ্কার রাখুন, আর এখন কোনো ওষুধ স্প্রে করবেন না, ধুয়ে যাবে।', 'Heavy rain is coming. Clear the field drains, and do not spray now: it would wash off.') });
      return out;
    },
  },
  {
    id: 'doctor', name: both('ফসলের ডাক্তার', 'Crop doctor'),
    goal: both('মাঠের সমস্যা কোন দিকে যাচ্ছে, আর আবহাওয়া তাতে কী করবে', 'Where the field’s problems are heading, and what the weather will do to them'),
    reads: both('আপনার অনুরোধ, আবহাওয়ার খবর', 'your requests, the weather notes'), topics: /পোকা|রোগ|দাগ|পচা|সমস্যা|ডাক্তার|pest|disease|insect|spot|problem|doctor/i,
    run(ctx, book) {
      const open = (ctx.requests ?? []).filter((r) => r.status === 'open' || r.status === 'need_info');
      book.openProblem = open.length > 0;
      const out = [];
      if (!open.length) return out;
      const sick = open.filter((r) => r.symptom && r.symptom !== 'water' && r.symptom !== 'question');
      if (sick.length && book.rainSoon) out.push({ key: 'disease-rain', weight: 72, tags: ['RULE'], text: both('আপনার জমির সমস্যাটা এখনো মেটেনি, আর বৃষ্টি আসছে। ভেজা আবহাওয়ায় রোগ-পোকা দ্রুত ছড়ায়, তাই আক্রান্ত গাছ আলাদা করে ফেলুন আর রোজ একবার জমি ঘুরে দেখুন।', 'Your field problem is not solved yet and rain is coming. Pests and disease spread fast in wet weather, so remove the affected plants and walk the field once a day.') });
      else if (sick.length) out.push({ key: 'disease-watch', weight: 48, tags: ['RULE'], text: both('জমির সমস্যাটার দিকে নজর রাখুন। বাড়তে দেখলে "ফসলের ডাক্তার" পাতা থেকে একটা নতুন ছবি পাঠান।', 'Keep an eye on the field problem. If it grows, send a new photo from the Crop doctor page.'), nav: '/farmer/doctor' });
      if (sick.length && book.heavyRain) out.push({ key: 'no-spray', weight: 70, tags: ['RULE'], text: both('বৃষ্টির আগে ওষুধ দেবেন না; কর্মকর্তার পরামর্শ নিয়ে বৃষ্টির পরে দিন।', 'Do not spray before the rain; ask the officer and spray after it.') });
      return out;
    },
  },
  {
    id: 'market', name: both('বাজার বন্ধু', 'Market friend'),
    goal: both('কখন তুলবেন, কখন বেচবেন, যাতে দাম ভালো পান', 'When to harvest and when to sell, for a fair price'),
    reads: both('ফসল তোলার সময়, কৃষি বিপণন অধিদপ্তরের দাম, আবহাওয়ার খবর', 'harvest window, DAM price seasons, the weather notes'), topics: /দাম|বাজার|বিক্রি|বেচ|তোলা|ফসল কবে|price|market|sell|harvest/i,
    run(ctx, book, tasks) {
      const h = ctx.harvest;
      const out = [];
      if (!h || h.daysTo == null || h.daysTo > 30 || h.daysTo < -20) return out;
      const marketTask = taskOf(tasks, 'market')[0];
      if (book.rainSoon && h.daysTo <= 7) out.push({ key: 'harvest-before-rain', weight: 84, tags: ['MODEL', 'RULE'], taskId: marketTask?.id, text: both(`${h.crop.bn} তোলার সময় এসে গেছে, আর বৃষ্টি আসছে। পাকা ফসল বৃষ্টির আগে কেটে শুকিয়ে ঘরে তুলুন।`, `The ${h.crop.en.toLowerCase()} is ready and rain is coming. Cut the ripe crop before the rain and dry it indoors.`) });
      const crowd = h.glut === 'High' || h.glut === 'Medium';
      if (crowd || h.hold) {
        const hold = h.hold ? both(` শুকিয়ে রাখতে পারলে পরের মাসগুলোয় দাম সাধারণত ${bn(h.hold.gain * 100)} শতাংশ বেশি থাকে।`, ` If you can store it, prices usually run ${Math.round(h.hold.gain * 100)}% higher in the months after.`) : both('', '');
        out.push({ key: 'sell-plan', weight: 55, tags: ['RECORD', 'MODEL'], taskId: marketTask?.id, nav: '/farmer/harvest', text: both(`${crowd ? 'আপনার ইউনিয়নে অনেকে একই সময়ে তুলবেন, তাই সব একবারে না বেচে ভাগ করে বেচুন।' : 'একবারে সব না বেচে ভেবে বেচুন।'}${hold.bn}`, `${crowd ? 'Many in your union harvest at the same time, so sell in parts, not all at once.' : 'Think before selling it all at once.'}${hold.en}`) });
      }
      return out;
    },
  },
  {
    id: 'planner', name: both('মৌসুমের পরিকল্পক', 'Season planner'),
    goal: both('পরের ফসল ঠিক সময়ে আর ঠিকভাবে লাগানো', 'Getting the next crop in at the right time'),
    reads: both('মৌসুমের পরিকল্পনা, আবহাওয়ার খবর', 'season plan, the weather notes'), topics: /লাগা|বুন|বীজ|চারা|কী লাগাব|পরিকল্পনা|plant|sow|seed|plan/i,
    run(ctx, book, tasks) {
      const p = ctx.plan;
      const out = [];
      if (!p || p.daysToPlant == null || p.daysToPlant < 0 || p.daysToPlant > 21) return out;
      const planTask = taskOf(tasks, 'plan')[0];
      if (book.rainSoon && p.daysToPlant <= 5) out.push({ key: 'sow-jo', weight: 66, tags: ['RULE'], taskId: planTask?.id, text: both(`${p.crop.bn} লাগানোর সময় কাছে, আর বৃষ্টি আসছে। বৃষ্টির পর মাটিতে জো এলে তবে বুনুন।`, `Planting ${p.crop.en.toLowerCase()} is close and rain is coming. Sow once the soil is workable after the rain.`) });
      if (!p.confirmed) out.push({ key: 'plan-confirm', weight: 40 + Math.max(0, 21 - p.daysToPlant), tags: ['RULE'], taskId: planTask?.id, nav: '/farmer/plan', text: both(`${p.crop.bn} লাগানোর আর ${bn(p.daysToPlant)} দিন। বীজ আর সার জোগাড় করে পরিকল্পনাটা নিশ্চিত করে নিন।`, `${p.daysToPlant} days to plant ${p.crop.en.toLowerCase()}. Get seed and fertiliser ready and confirm the plan.`) });
      return out;
    },
  },
  {
    id: 'liaison', name: both('অফিস সংযোগ', 'Office liaison'),
    goal: both('উপজেলা কৃষি অফিসের সঙ্গে যোগাযোগ যেন না থামে', 'Keeping the line to the upazila agriculture office open'),
    reads: both('আপনার অনুরোধ, কর্মকর্তার বার্তা', 'your requests, officer messages'), topics: /অফিস|কর্মকর্তা|উত্তর|অনুরোধ|বার্তা|officer|office|reply|request|message/i,
    run(ctx, book, tasks) {
      const out = [];
      const follow = taskOf(tasks, 'followUp');
      if (follow.length) out.push({ key: 'follow', weight: 58 + (book.openProblem ? 10 : 0), tags: ['RULE'], taskId: follow[0].id, text: both(`আপনার একটা অনুরোধের উত্তর এখনো আসেনি। আমি ${ctx.officer?.bn ?? 'কর্মকর্তা'}-কে আবার মনে করিয়ে দিতে পারি।`, `One of your requests has no reply yet. I can remind ${ctx.officer?.en ?? 'the officer'} again.`) });
      if (ctx.unread > 0) out.push({ key: 'unread', weight: 64, tags: ['RECORD'], nav: '/farmer/help', text: both(`কর্মকর্তা আপনাকে ${bn(ctx.unread)}টি বার্তা পাঠিয়েছেন, সাহায্য পাতায় পড়ে নিন।`, `The officer has sent you ${ctx.unread} message(s); read them on the Help page.`) });
      return out;
    },
  },
];

// ───────────────────────── officer crew ─────────────────────────
// ctx: { today }; the officer's work is already in চক্র এজেন্ট's tasks, so these members read and rank them.
export const OFFICER_CREW = [
  {
    id: 'outbreak', name: both('প্রাদুর্ভাব পাহারাদার', 'Outbreak watch'),
    goal: both('কাছাকাছি জমিতে একই সমস্যা ছড়াচ্ছে কি না', 'Whether the same problem is spreading across nearby fields'),
    reads: both('এলাকার একই সমস্যার খবর', 'clusters of the same problem'), topics: /এলাকা|ছড়া|প্রাদুর্ভাব|অনেক|area|outbreak|spread|cluster/i,
    run(ctx, book, tasks) {
      const areas = taskOf(tasks, 'area');
      book.outbreak = areas.length > 0;
      return areas.slice(0, 2).map((t, i) => ({ key: `area-${t.id}`, weight: 90 - i, tags: t.tags, taskId: t.id, text: both(`${t.title.bn}। এলাকার সবার জন্য পরামর্শের খসড়া তৈরি, আপনার অনুমোদনের অপেক্ষায়।`, `${t.title.en}. Advice for the whole area is drafted and waits for your approval.`) }));
    },
  },
  {
    id: 'triage', name: both('অনুরোধ বাছাইকারী', 'Request triage'),
    goal: both('কোন কৃষকের অনুরোধ আগে দেখা দরকার', 'Which farmer’s request needs you first'),
    reads: both('খোলা অনুরোধ', 'open requests'), topics: /অনুরোধ|কৃষক|জরুরি|উত্তর|request|farmer|urgent|reply/i,
    run(ctx, book, tasks) {
      const replies = taskOf(tasks, 'reply');
      if (!replies.length) return [];
      const urgent = replies.filter((t) => t.risk === 'high');
      return [{ key: 'replies', weight: urgent.length ? 80 : 50, tags: ['RULE'], taskId: (urgent[0] ?? replies[0]).id, text: both(`${bn(replies.length)}টি অনুরোধের উত্তরের খসড়া তৈরি${urgent.length ? `, তার মধ্যে ${bn(urgent.length)}টি জরুরি` : ''}। প্রথমটি: ${(urgent[0] ?? replies[0]).title.bn}।`, `${replies.length} reply draft(s) ready${urgent.length ? `, ${urgent.length} urgent` : ''}. First: ${(urgent[0] ?? replies[0]).title.en}.`) }];
    },
  },
  {
    id: 'escalation', name: both('উপজেলা সংযোগ', 'Upazila link'),
    goal: both('যা ইউনিয়নে মেটানো যাচ্ছে না, তা উপজেলায় তোলা', 'Raising to the upazila what the union cannot settle'),
    reads: both('জরুরি অনুরোধ', 'urgent requests'), topics: /উপজেলা|তোলা|জানান|upazila|escalat|raise/i,
    run(ctx, book, tasks) {
      const esc = taskOf(tasks, 'escalate');
      if (!esc.length) return [];
      return [{ key: 'escalate', weight: book.outbreak ? 70 : 60, tags: ['RULE'], taskId: esc[0].id, text: both(`${bn(esc.length)}টি জরুরি অনুরোধ দুই দিনের বেশি খোলা; উপজেলা অফিসারকে জানানো উচিত।`, `${esc.length} urgent request(s) open over two days; the upazila officer should know.`) }];
    },
  },
];

// ───────────────────────── coordinator ─────────────────────────
// Who is needed: the members whose topics the question touches, or everyone for a briefing (no question, or none matched).
export function route(crew, question) {
  const q = String(question ?? '').trim();
  const hit = q ? crew.filter((m) => m.topics.test(q)) : [];
  return hit.length ? hit : crew;
}

const ORDER_BN = ['প্রথম কথা,', 'এরপর,', 'আর শেষে,'];
const ORDER_EN = ['First,', 'Then,', 'And finally,'];
export const SPOKEN_POINTS = 3; // a farmer listening on a phone remembers about three things

export function runCrew(role, ctx, { question = '', tasks = [] } = {}) {
  const crew = role === 'officer' ? OFFICER_CREW : FARMER_CREW;
  const chosen = new Set(route(crew, question).map((m) => m.id));
  const book = {};
  const trace = [];
  const notes = [];
  // Members work in the crew's own order, so a later one reads what an earlier one found; members not chosen still
  // run first when a chosen one depends on their facts (the weather watch is everyone's input).
  for (const m of crew) {
    const needed = chosen.has(m.id) || (m.id === 'weather' && chosen.size < crew.length) || (m.id === 'outbreak' && chosen.has('escalation'));
    if (!needed) continue;
    const t0 = Date.now();
    let found = [];
    try { found = m.run(ctx, book, tasks) ?? []; } catch (e) { trace.push({ member: m.id, name: m.name, error: String(e?.message ?? e) }); continue; }
    const keep = chosen.has(m.id) ? found : []; // a helper run only for its facts adds no notes of its own
    for (const n of keep) notes.push({ ...n, member: m.id });
    trace.push({ member: m.id, name: m.name, goal: m.goal, reads: m.reads, notes: keep.length, ms: Date.now() - t0, asked: chosen.has(m.id) });
  }
  const seen = new Set();
  const ranked = notes.sort((a, b) => b.weight - a.weight).filter((n) => (seen.has(n.key) ? false : seen.add(n.key)));
  const top = ranked.slice(0, SPOKEN_POINTS);
  const say = !top.length
    ? (role === 'officer'
      ? both('এই মুহূর্তে আপনার দেখার মতো জরুরি কিছু নেই।', 'Nothing urgent needs you right now.')
      : both('আজ চিন্তার কিছু দেখছি না। জমি ভালো আছে, দরকার হলে আমাকে ডাকবেন।', 'Nothing to worry about today. The field is fine; call me if you need me.'))
    : top.length === 1
      ? { bn: top[0].text.bn, en: top[0].text.en }
      : { bn: top.map((n, i) => `${ORDER_BN[i]} ${n.text.bn}`).join(' '), en: top.map((n, i) => `${ORDER_EN[i]} ${n.text.en}`).join(' ') };
  return { members: crew.filter((m) => chosen.has(m.id)).map((m) => ({ id: m.id, name: m.name })), notes: ranked, top, say, trace, facts: book };
}
