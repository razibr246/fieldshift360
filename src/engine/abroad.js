// The neighbouring countries' pages: loading each country's data file, reading a farming zone's last 30 days against
// its 2001–2025 normal, and the sample farmer's call for today from that record plus the live forecast. All rules are
// plain thresholds written out here, so anyone can check them.


// Today's date (YYYY-MM-DD) and the hour on the country's own clock.
export function localNow(tz) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}` };
}
const md = (d) => d.slice(5); // "MM-DD"
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);

// ---- one zone's state ----
// Each flag: { key, level: 'high' | 'watch', bn, en }. A zone with no flag reads as normal for the time of year.
export function zoneFlags(p) {
  const f = [];
  const r = p.rain30, dT = r.tmax != null && r.tmaxNormal != null ? r.tmax - r.tmaxNormal : 0;
  if (r.rain >= 60 && r.pct >= 200) f.push({ key: 'wet', level: 'high' });
  else if (r.rain >= 40 && r.pct >= 150) f.push({ key: 'wet', level: 'watch' });
  if (r.normal >= 40 && r.pct <= 40) f.push({ key: 'dry', level: 'high' });
  else if (r.normal >= 25 && r.pct <= 60) f.push({ key: 'dry', level: 'watch' });
  if (dT >= 2.5) f.push({ key: 'hot', level: 'high' });
  else if (dT >= 1.5) f.push({ key: 'hot', level: 'watch' });
  else if (dT <= -2.5) f.push({ key: 'cool', level: 'watch' });
  if (p.fires.km50 >= 60) f.push({ key: 'fire', level: 'high' });
  else if (p.fires.km50 >= 15) f.push({ key: 'fire', level: 'watch' });
  return f;
}
export const zoneLevel = (flags) => (flags.some((x) => x.level === 'high') ? 'high' : flags.length ? 'watch' : 'ok');
export const FLAG_TEXT = {
  wet: { bn: 'স্বাভাবিকের চেয়ে অনেক বেশি বৃষ্টি', en: 'Far wetter than normal' },
  dry: { bn: 'স্বাভাবিকের চেয়ে অনেক কম বৃষ্টি', en: 'Far drier than normal' },
  hot: { bn: 'স্বাভাবিকের চেয়ে গরম', en: 'Hotter than normal' },
  cool: { bn: 'স্বাভাবিকের চেয়ে ঠান্ডা', en: 'Cooler than normal' },
  fire: { bn: 'আশপাশে অনেক আগুন (উপগ্রহে)', en: 'Many fires nearby (satellite)' },
};
// What the national desk tells the zone's farmers this week, from its flags and the season.
export function zoneAdvice(flags, zone) {
  const has = (k) => flags.some((x) => x.key === k);
  const out = [];
  if (has('wet')) out.push({ bn: 'পাকা ফসল কাটার আগে তিন দিনের পূর্বাভাস দেখুন; কাটা ফসল মাটি থেকে উঁচুতে ঢেকে রাখুন; নিচু জমির পানি বের করুন।', en: 'Check the three-day forecast before cutting ripe crops; keep cut crops off the ground and covered; drain low fields.' });
  if (has('dry')) out.push({ bn: 'জমির ভেজা ধরে রাখতে খড় বিছান; বোনার আগে মাটির ভেজা হাতে চেপে দেখুন; সেচ থাকলে সময় মেনে দিন।', en: 'Mulch to hold soil moisture; squeeze-test the soil before sowing; irrigate on schedule where water exists.' });
  if (has('hot')) out.push({ bn: 'দুপুরের গরমে স্প্রে বা সার নয়; গবাদি পশুকে ছায়া আর পানি দিন।', en: 'No spraying or fertiliser in the midday heat; give livestock shade and water.' });
  if (has('fire')) out.push({ bn: 'খড় না পুড়িয়ে মাটিতে মেশান বা যন্ত্রে বোনার ব্যবস্থা করুন; আগুনে মাটির জৈব পদার্থ আর বন্ধু-পোকা পোড়ে।', en: 'Work straw in or sow through it by machine instead of burning; fire burns the soil’s organic matter and its useful insects.' });
  if (!out.length) out.push({ bn: `এ সময়ের স্বাভাবিক অবস্থা — ${zone.crop.bn}-এর নিয়মিত কাজ চালিয়ে যান।`, en: `Normal for the time of year — carry on with the usual ${zone.crop.en.toLowerCase()} work.` });
  return out;
}

// ---- the sample farmer's call for today ----
const sum = (xs) => xs.reduce((a, x) => a + (x ?? 0), 0);
function outlook(fc, n = 3) {
  const d = fc?.days?.slice(0, n) ?? [];
  return { rain: sum(d.map((x) => x.rain)), pop: Math.max(0, ...d.map((x) => x.pop ?? 0)), days: d.length };
}
const mm = (x) => Math.round(x);

// Returns { tone: 'go' | 'wait' | 'warn', title, body, facts: [{bn,en}] } in both languages. `fc` may be null
// (offline): the call then rests on the saved record alone, and says so.
export function todaysCall(id, data, fc, today) {
  const farm = data.points.farm;
  const o3 = outlook(fc, 3);
  const live = !!fc;
  const wetSky = o3.rain >= 10 || o3.pop >= 60;
  const rainLine = live
    ? { bn: `আগামী ৩ দিনে বৃষ্টি ${mm(o3.rain)} মিমি, সর্বোচ্চ সম্ভাবনা ${o3.pop}%`, en: `Next 3 days: ${mm(o3.rain)} mm of rain, top chance ${o3.pop}%` }
    : { bn: 'পূর্বাভাস পাওয়া যায়নি (অফলাইন)', en: 'No forecast (offline)' };
  const r30 = farm.rain30;
  const pastLine = { bn: `গত ৩০ দিনে বৃষ্টি ${mm(r30.rain)} মিমি, এ সময়ের স্বাভাবিক ${mm(r30.normal)} মিমি`, en: `Last 30 days: ${mm(r30.rain)} mm of rain against a normal ${mm(r30.normal)} mm` };

  if (id === 'india' || id === 'pakistan') {
    const [start, best, last] = id === 'india' ? ['11-01', '11-15', '11-30'] : ['11-01', '11-20', '12-15'];
    const y = today.slice(0, 4);
    const toStart = daysBetween(today, `${y}-${start}`), toBest = daysBetween(today, `${y}-${best}`);
    const facts = [rainLine, pastLine];
    if (md(today) < start) {
      return {
        tone: 'go', facts,
        title: { bn: `গম বোনার আর ${toStart} দিন — এখনই জমি তৈরি`, en: `${toStart} days to wheat sowing — get the field ready now` },
        body: id === 'india'
          ? { bn: 'খড় পোড়াবেন না: সুপার সিডার বা হ্যাপি সিডার খড়ের মধ্যেই গম বুনে দেয়, খড় মাটিতে মিশে সার হয়। যন্ত্র না পেলে খড়ে পুসা ডিকম্পোজার ছিটিয়ে মাটিতে মেশান। ১৫ নভেম্বরের মধ্যে বোনা শেষ করুন (পাঞ্জাব কৃষি বিশ্ববিদ্যালয়)।', en: 'Do not burn the straw: a Super Seeder or Happy Seeder sows wheat straight into it, and the straw feeds the soil. Without a machine, spray PUSA decomposer and work the straw in. Finish sowing by 15 November (Punjab Agricultural University).' }
          : { bn: 'খালের পালা এলে বোনার আগের ভেজানো সেচ (রাউনি) দিন, লেজার দিয়ে জমি সমান করুন, প্রত্যয়িত বীজ রাখুন। ১–২০ নভেম্বর বোনা সবচেয়ে ভালো (পাকিস্তান আবহাওয়া বিভাগের কৃষি পরামর্শ)।', en: 'When the canal turn comes, give the pre-sowing soak (rauni), laser-level the field and keep certified seed ready. 1–20 November is the best sowing time (Pakistan Meteorological Department agromet advisory).' },
      };
    }
    if (md(today) <= best) {
      return wetSky ? {
        tone: 'wait', facts,
        title: { bn: 'বোনার সময়, কিন্তু বৃষ্টি আসছে — জমি ঝুরঝুরে হলে বুনুন', en: 'Sowing time, but rain is coming — sow when the soil crumbles' },
        body: { bn: `সেরা সময় শেষ হবে ${toBest} দিন পর। বৃষ্টির পর জমিতে পা দিলে কাদা না হলে বুনুন।`, en: `The best window closes in ${toBest} days. Sow once the soil no longer smears underfoot after the rain.` },
      } : {
        tone: 'go', facts,
        title: { bn: 'বোনার সেরা সময় চলছে — এ সপ্তাহেই বুনে ফেলুন', en: 'The best sowing window is open — sow this week' },
        body: { bn: `সেরা সময় আর ${toBest} দিন। দেরিতে বুনলে মার্চের গরম পড়ে দানা ভরার সময়, ফলন কমে।`, en: `${toBest} days of the best window left. Late wheat fills its grain in the March heat and yields less.` },
      };
    }
    return {
      tone: 'warn', facts,
      title: { bn: 'সেরা সময় পেরিয়েছে — দেরিতে বোনার জাত নিন', en: 'Past the best window — use a late-sown variety' },
      body: id === 'india'
        ? { bn: '১৫ নভেম্বরের পর প্রতি সপ্তাহ দেরিতে একরে প্রায় ১–১.৫ কুইন্টাল ফলন কমে (পাঞ্জাব কৃষি বিশ্ববিদ্যালয়)। নভেম্বরের শেষ পর্যন্ত দেরির জাত বোনা যায়।', en: 'After 15 November each week of delay costs about 1–1.5 quintals an acre (Punjab Agricultural University). Late varieties can go in until the end of November.' }
        : { bn: 'সেচের সমতলে ১৫ ডিসেম্বরের মধ্যে বোনা শেষ করুন (পাকিস্তান আবহাওয়া বিভাগ)।', en: 'On the irrigated plains finish sowing before 15 December (Pakistan Meteorological Department).' },
    };
  }

  if (id === 'nepal' || id === 'bhutan') {
    const facts = [rainLine, pastLine];
    const crop = id === 'nepal' ? { bn: 'ধান', en: 'paddy' } : { bn: 'লাল ধান', en: 'red rice' };
    if (!live) return { tone: 'wait', facts, title: { bn: 'পূর্বাভাস ছাড়া ধান কাটবেন না', en: `Do not cut ${crop.en} without a forecast` }, body: { bn: 'ইন্টারনেট এলে আগামী তিন দিনের আকাশ দেখে সিদ্ধান্ত নিন।', en: 'Decide once the next three days’ sky can be checked.' } };
    if (wetSky) {
      return {
        tone: 'wait', facts,
        title: { bn: `এখন ${crop.bn} কাটবেন না — বৃষ্টি আসছে`, en: `Hold off cutting the ${crop.en} — rain is coming` },
        body: id === 'nepal'
          ? { bn: 'দাঁড়িয়ে থাকা পাকা ধান কাটা ধানের চেয়ে বৃষ্টি ভালো সয়। ২০২১-এর অক্টোবরে ঠিক এভাবেই কাটা ধান মাঠে ভিজে গজিয়ে গিয়েছিল। যা কাটা হয়ে গেছে, তা আঁটি বেঁধে উঁচু জায়গায় পলিথিনে ঢাকুন।', en: 'Standing ripe paddy takes rain better than cut paddy. In October 2021 cut paddy soaked and sprouted in the fields exactly like this. Bundle anything already cut, stack it high and cover it.' }
          : { bn: 'কাটা ধান ভিজলে দানা কালো হয়, গজায়। যা কাটা হয়েছে তা খড়ের গাদায় ঢেকে রাখুন; রাতে বুনো শূকরের পাহারা চালু রাখুন।', en: 'Wet cut rice blackens and sprouts. Stack what is cut under cover, and keep the night watch for wild boar going.' },
      };
    }
    return {
      tone: 'go', facts,
      title: { bn: `তিন দিন শুকনো — ${crop.bn} কাটুন, শুকান, মাড়াই করুন`, en: `Three dry days — cut, dry and thresh the ${crop.en}` },
      body: id === 'nepal'
        ? { bn: 'সকালে শিশির কাটলে কাটুন, দুই-তিন দিন রোদে শুকিয়ে মাড়াই করুন। দানা দাঁতে কাটলে কট করে ভাঙলে গোলায় তোলার মতো শুকনো।', en: 'Cut once the morning dew lifts, sun-dry two or three days, then thresh. Grain that snaps cleanly between the teeth is dry enough to store.' }
        : { bn: 'কাটা ধান মাদুরে রোদে শুকান। লুনানার দিক থেকে সাইরেন বাজলে সঙ্গে সঙ্গে উঁচু জায়গায় যান — নদী নয়, রাস্তা ধরে।', en: 'Sun-dry the cut rice on mats. If the sirens sound from the Lunana side, go to high ground at once — by the road, not the river.' },
    };
  }

  // Myanmar: chickpea sown into the moisture the rains leave behind. Rain minus ET0 over 30 days is the store.
  const bal = r30.balance, balN = r30.balanceNormal;
  const facts = [rainLine, { bn: `গত ৩০ দিনে বৃষ্টি বাদ বাষ্পীভবন ${mm(bal)} মিমি (স্বাভাবিক ${mm(balN)} মিমি)`, en: `Last 30 days, rain minus evaporation: ${mm(bal)} mm (normal ${mm(balN)} mm)` }];
  if (live && o3.rain >= 15) {
    return { tone: 'wait', facts, title: { bn: 'ভারী বৃষ্টি আসছে — ছোলা পরে বুনুন', en: 'Heavy rain is coming — sow the chickpea after it' }, body: { bn: 'ভেজা জমিতে ছোলার বীজ পচে যায়। বৃষ্টি থামার দুই-তিন দিন পর, মাটি ঝুরঝুরে হলে বুনুন।', en: 'Chickpea seed rots in waterlogged soil. Sow two or three days after the rain stops, once the soil crumbles.' } };
  }
  // A store at least 50 mm, or no worse than 80% of the usual one, is enough to start chickpea on.
  if (bal != null && balN != null && (bal >= 50 || bal >= 0.8 * balN)) {
    return { tone: 'go', facts, title: { bn: 'মাটিতে ভেজা আছে — এখনই ছোলা বুনুন', en: 'The soil holds moisture — sow the chickpea now' }, body: { bn: 'বর্ষার শেষে মাটিতে এখনো পানি জমা আছে। এই ভেজা শুকিয়ে যাওয়ার আগে বুনলে ছোলা শিকড় নামিয়ে নেয়, মার্চের গরমের আগে ফসল ওঠে।', en: 'The end of the rains has left water stored in the soil. Sown before it dries, chickpea gets its roots down and is harvested before the March heat.' } };
  }
  return { tone: 'warn', facts, title: { bn: 'মাটি দ্রুত শুকাচ্ছে — বুনলে এ সপ্তাহেই', en: 'The soil is drying fast — if sowing, do it this week' }, body: { bn: 'বীজ ভেজা স্তর পর্যন্ত গভীরে দিন; বেশি দেরি হলে পরের বৃষ্টির অপেক্ষা করুন।', en: 'Place the seed down into the moist layer; much later, wait for the next rain.' } };
}

// Detections in the whole country this week (the three VIIRS satellites, so one fire can count up to three times).
export const countryFires = (data) => data.firesByProvince.reduce((a, x) => a + x.n, 0);

// ---- the season plan: the next crop's calendar and its water, FAO-56 ----
// Stage lengths (initial, development, mid, late, days) and crop coefficients (Kc ini, mid, end) are FAO-56 typical
// values (Allen et al. 1998, tables 11–12), set to the local season. The sowing date is the middle of the official
// window where there is one.
export const PLANS = {
  india: {
    crop: { bn: 'গম', en: 'Wheat' }, sow: '11-08', stages: [25, 40, 55, 35], kc: [0.4, 1.15, 0.25], irrigated: true,
    steps: [
      { from: '10-10', to: '10-31', bn: 'খড় সামলানো: সুপার সিডার/হ্যাপি সিডার, না পেলে পুসা ডিকম্পোজার — পোড়ানো নয়', en: 'Deal with the straw: Super Seeder / Happy Seeder, or PUSA decomposer — not fire' },
      { from: '11-01', to: '11-15', bn: 'গম বোনা — সেরা সময় নভেম্বরের প্রথম পক্ষ (PAU)', en: 'Sow wheat — the first half of November is best (PAU)', key: true },
      { at: 21, bn: 'প্রথম সেচ: শিকড় গজানোর সময় (বোনার ২০–২৫ দিনে)', en: 'First irrigation at crown-root initiation (20–25 days after sowing)' },
      { from: '03-01', to: '03-31', bn: 'দানা ভরার সময়: গরম এলে বিকেলে হালকা সেচ', en: 'Grain filling: a light evening irrigation if heat comes' },
      { atEnd: true, bn: 'কাটা', en: 'Harvest' },
    ],
  },
  pakistan: {
    crop: { bn: 'গম', en: 'Wheat' }, sow: '11-10', stages: [20, 35, 45, 30], kc: [0.4, 1.15, 0.25], irrigated: true,
    steps: [
      { from: '10-20', to: '10-31', bn: 'বোনার আগের ভেজানো সেচ (রাউনি), লেজারে জমি সমান', en: 'Pre-sowing soak (rauni), laser-level the field' },
      { from: '11-01', to: '11-20', bn: 'গম বোনা — সেরা সময় ১–২০ নভেম্বর (PMD)', en: 'Sow wheat — 1–20 November is best (PMD)', key: true },
      { at: 21, bn: 'প্রথম সেচ (বোনার ২০–২৫ দিনে)', en: 'First irrigation (20–25 days after sowing)' },
      { from: '02-15', to: '03-15', bn: 'দানা ভরার সময়: তাপপ্রবাহের পূর্বাভাসে হালকা সেচ', en: 'Grain filling: a light irrigation ahead of a heatwave' },
      { atEnd: true, bn: 'কাটা', en: 'Harvest' },
    ],
  },
  nepal: {
    crop: { bn: 'মসুর', en: 'Lentil' }, sow: '11-10', stages: [20, 30, 60, 40], kc: [0.4, 1.1, 0.3], irrigated: false,
    steps: [
      { from: '10-15', to: '11-05', bn: 'ধান কাটা — আগে তিন দিনের পূর্বাভাস দেখে', en: 'Cut the paddy — after checking the three-day forecast', key: true },
      { from: '11-01', to: '11-20', bn: 'মসুর বোনা, ধানের নাড়ার ভেজা মাটিতে', en: 'Sow lentil into the moist paddy stubble' },
      { at: 45, bn: 'ফুল আসার আগে আগাছা পরিষ্কার', en: 'Weed before flowering' },
      { atEnd: true, bn: 'কাটা', en: 'Harvest' },
    ],
  },
  bhutan: {
    crop: { bn: 'লাল ধান (পরের মৌসুম)', en: 'Red rice (next season)' }, sow: null, irrigated: true,
    steps: [
      { from: '10-15', to: '11-20', bn: 'ধান কাটা, মাদুরে শুকানো, মাড়াই — বৃষ্টি দেখে', en: 'Cut, dry on mats and thresh — watching the rain', key: true },
      { from: '11-20', to: '12-31', bn: 'গোলায় তোলা; ইঁদুর আর আর্দ্রতা থেকে বাঁচাতে উঁচু মাচা', en: 'Store on a raised platform, safe from rats and damp' },
      { from: '01-01', to: '03-15', bn: 'বেড়া আর নালা মেরামত; বুনো শূকরের পথ বন্ধ', en: 'Mend fences and channels; close the wild-boar paths' },
      { from: '04-01', to: '04-30', bn: 'বীজতলা (প্রচলিত সময় — জোংখাগ দপ্তরের সঙ্গে মিলিয়ে নিন)', en: 'Nursery (the usual time — confirm with the Dzongkhag office)' },
      { from: '06-01', to: '07-15', bn: 'বর্ষা নামলে রোপণ', en: 'Transplant once the monsoon sets in' },
    ],
  },
  myanmar: {
    crop: { bn: 'ছোলা', en: 'Chickpea' }, sow: '10-28', stages: [20, 30, 35, 25], kc: [0.4, 1.0, 0.35], irrigated: false,
    steps: [
      { from: '10-15', to: '11-15', bn: 'ছোলা বোনা, বর্ষার রেখে যাওয়া ভেজায় — বীজ ভেজা স্তর পর্যন্ত', en: 'Sow chickpea into the moisture the rains left — seed down to the moist layer', key: true },
      { at: 30, bn: 'হালকা নিড়ানি — মাটির ওপর শুকনো আস্তর ভেজা ধরে রাখে', en: 'Light hoeing — a dry top layer holds the moisture below' },
      { at: 55, bn: 'ফুল আর শুঁটির সময়: পোকা (শুঁটি-ছিদ্রকারী) দেখুন', en: 'Flowering and pods: watch for pod borer' },
      { atEnd: true, bn: 'কাটা — মার্চের তাপের আগে', en: 'Harvest — before the March heat' },
    ],
  },
};

// Kc on day d of the season (FAO-56: flat, rising, flat at mid-season, falling to the end value).
function kcOn(d, [li, ld, lm, ll], [ini, mid, end]) {
  if (d < li) return ini;
  if (d < li + ld) return ini + ((d - li) / ld) * (mid - ini);
  if (d < li + ld + lm) return mid;
  return mid + (Math.min(ll, d - li - ld - lm) / ll) * (end - mid);
}
const DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Water for the plan's crop over a normal season: crop need ΣKc·ET0, rain that counts (80% of each day's rain, up to
// that day's need), and what is left for irrigation or the soil store. Normals are ERA5 2001–2025 monthly sums.
export function seasonWater(plan, normals, year) {
  if (!plan.sow) return null;
  const [li, ld, lm, ll] = plan.stages;
  const total = li + ld + lm + ll;
  const start = new Date(`${year}-${plan.sow}T00:00:00Z`);
  let need = 0, eff = 0, rain = 0;
  const kcAt = (d) => kcOn(d, plan.stages, plan.kc);
  for (let d = 0; d < total; d++) {
    const t = new Date(start.getTime() + d * 864e5);
    const n = normals[t.getUTCMonth()];
    const et0 = (n.et0 ?? 0) / DIM[t.getUTCMonth()], r = (n.rain ?? 0) / DIM[t.getUTCMonth()];
    const etc = kcAt(d) * et0;
    need += etc; rain += r; eff += Math.min(0.8 * r, etc);
  }
  const end = new Date(start.getTime() + (total - 1) * 864e5).toISOString().slice(0, 10);
  return { days: total, start: start.toISOString().slice(0, 10), end, need: Math.round(need), rain: Math.round(rain), eff: Math.round(eff), gap: Math.round(need - eff) };
}
export const addDaysIso = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

// ---- the local officer's alerts for the farm's area, each with an SMS in the farmers' own language ----
const SMS = {
  hi: {
    rain: 'FieldShift: अगले 3 दिन में {mm} मिमी बारिश का अनुमान। कटी फसल ढककर ऊँची जगह रखें, खेत से पानी निकालें। – {office}',
    sow: 'FieldShift: गेहूँ बुवाई का सबसे अच्छा समय 15 नवंबर तक, अभी {days} दिन बाकी। पराली न जलाएँ — सुपर सीडर/हैप्पी सीडर से बोएँ। – {office}',
    late: 'FieldShift: बुवाई का सबसे अच्छा समय निकल गया। पछेती किस्म बोएँ; हर हफ्ते की देरी से उपज घटती है। – {office}',
    heat: 'FieldShift: आने वाले दिनों में तापमान {t}°C तक। दोपहर में छिड़काव न करें, पशुओं को छाया और पानी दें। – {office}',
    fire: 'FieldShift: उपग्रह ने आसपास 50 किमी में {n} आग दर्ज कीं। पराली जलाना मना है; मशीन के लिए कस्टम हायरिंग सेंटर से संपर्क करें। – {office}',
    dry: 'FieldShift: पिछले 30 दिन सामान्य से काफी सूखे। बुवाई से पहले नमी जाँचें, जरूरत हो तो पलेवा करें। – {office}',
  },
  ur: {
    rain: 'FieldShift: اگلے 3 دن میں {mm} ملی میٹر بارش کا امکان۔ کٹی فصل ڈھانپ کر اونچی جگہ رکھیں۔ – {office}',
    sow: 'FieldShift: گندم کی کاشت کا بہترین وقت 1 تا 20 نومبر، {days} دن باقی۔ تصدیق شدہ بیج اور رونی کی تیاری کریں۔ – {office}',
    late: 'FieldShift: کاشت کا بہترین وقت گزر گیا۔ 15 دسمبر سے پہلے پچھیتی قسم کاشت کریں۔ – {office}',
    heat: 'FieldShift: آنے والے دنوں میں درجہ حرارت {t}°C تک۔ دوپہر میں اسپرے نہ کریں، مویشیوں کو سایہ اور پانی دیں۔ – {office}',
    fire: 'FieldShift: سیٹلائٹ نے 50 کلومیٹر کے اندر {n} آگ دیکھی۔ فصل کی باقیات نہ جلائیں۔ – {office}',
    dry: 'FieldShift: پچھلے 30 دن معمول سے بہت خشک۔ کاشت سے پہلے زمین کی نمی دیکھیں۔ – {office}',
  },
  ne: {
    rain: 'FieldShift: आगामी ३ दिनमा {mm} मिमि वर्षाको सम्भावना। पाकेको धान अहिले नकाट्नुहोस्; काटिएको धान माथि राखेर छोप्नुहोस्। – {office}',
    harvest: 'FieldShift: आगामी ३ दिन सुक्खा देखिन्छ। धान काट्ने, सुकाउने र चुट्ने राम्रो समय। – {office}',
    heat: 'FieldShift: आगामी दिनमा तापक्रम {t}°C सम्म। मध्यान्हमा विषादी नछर्नुहोस्। – {office}',
    fire: 'FieldShift: भूउपग्रहले ५० किमिभित्र {n} आगलागी देख्यो। पराल नजलाउनुहोस्। – {office}',
    dry: 'FieldShift: पछिल्ला ३० दिन सामान्यभन्दा धेरै सुक्खा। छर्नुअघि माटोको चिस्यान जाँच्नुहोस्। – {office}',
  },
  en: {
    rain: 'FieldShift: About {mm} mm of rain is expected in the next 3 days. Do not cut ripe crops now; raise and cover what is cut. - {office}',
    harvest: 'FieldShift: The next 3 days look dry. A good time to cut, dry and thresh. Keep the night watch for wild animals. - {office}',
    sowpulse: 'FieldShift: The soil still holds the rains\' water. Sow chickpea this week, with the seed down in the moist layer. - {office}',
    heat: 'FieldShift: Temperatures up to {t} deg C in the coming days. No spraying at midday; give livestock shade and water. - {office}',
    fire: 'FieldShift: Satellites saw {n} fires within 50 km. Please do not burn crop residue. - {office}',
    dry: 'FieldShift: The last 30 days were far drier than normal. Check soil moisture before sowing. - {office}',
  },
};
// Burmese and Dzongkha are machine-drafted (the page says so): have a local speaker check them before sending.
SMS.my = {
  rain: 'FieldShift: နောက် ၃ ရက်အတွင်း မိုးရေ {mm} မီလီမီတာ ရွာနိုင်သည်။ ရိတ်ပြီးသီးနှံကို မြင့်သောနေရာတွင် ဖုံးထားပါ။ – {office}',
  sowpulse: 'FieldShift: မြေထဲတွင် မိုးရေစိုထိုင်းဆ ရှိနေသေးသည်။ ဤအပတ်အတွင်း ကုလားပဲ စိုက်ပါ၊ မျိုးစေ့ကို စိုသောမြေလွှာအထိ ချပါ။ – {office}',
  heat: 'FieldShift: လာမည့်ရက်များတွင် အပူချိန် {t}°C အထိ ရှိမည်။ နေ့လယ်တွင် ဆေးမဖျန်းပါနှင့်၊ တိရစ္ဆာန်များကို အရိပ်နှင့် ရေ ပေးပါ။ – {office}',
  fire: 'FieldShift: ၅၀ ကီလိုမီတာအတွင်း မီး {n} ခုကို ဂြိုဟ်တုက တွေ့ရှိသည်။ ကောက်ရိုးများကို မီးမရှို့ပါနှင့်။ – {office}',
  dry: 'FieldShift: ပြီးခဲ့သော ရက် ၃၀ သည် ပုံမှန်ထက် အလွန်ခြောက်သွေ့သည်။ မစိုက်မီ မြေစိုထိုင်းဆကို စစ်ဆေးပါ။ – {office}',
};
SMS.dz = {
  rain: 'FieldShift: ཉིན་གྲངས་གསུམ་གྱི་ནང་ན་ ཆརཔ་ མི་ལི་མི་ཊར་ {mm} དེ་ཅིག་ རྐྱབ་ནི་ཨིན། འབྲས་ད་ལྟོ་མ་བཏོག། བཏོག་ཚར་མི་ཚུ་ ཁེབས་ཏེ་བཞག། – {office}',
  harvest: 'FieldShift: ཉིན་གྲངས་གསུམ་ཆརཔ་མེད། འབྲས་བཏོག་ནི་དང་ སྐམ་ནི་ བརྡུང་ནིའི་དུས་ཚོད་ལེགས་ཤོམ་ཨིན། ནུབ་མོ་ ཕག་རྒོད་ལུ་ བལྟ་རྟོག་འབད། – {office}',
  heat: 'FieldShift: ཉིན་ཁ་ཤས་ཀྱི་ནང་ དྲོད་ཚད་ {t}°C ཚུན་ཡོདཔ་ཨིན། ཉིན་ཕྱེད་ སྨན་མ་གཏང་། – {office}',
  fire: 'FieldShift: སྐར་ཚོགས་ཀྱིས་ ཀི་ལོ་མི་ཊར་ ༥༠ ནང་ མེ་ {n} མཐོང་ཡོད། སོག་ཕྱེ་ མེ་མ་བཏང་། – {office}',
  dry: 'FieldShift: ཉིན་གྲངས་ ༣༠ ཧེ་མ་ སྤྱིར་བཏང་ལས་ སྐམ་ཏོག་ཏོ་ཨིན། ས་བོན་མ་བཏབ་པའི་ཧེ་མ་ ས་གཤེར་ བལྟ། – {office}',
};
export const SMS_DRAFT = new Set(['my', 'dz']);

// English messages keep to the basic SMS alphabet (straight quotes, plain hyphen) so they go as 160-character parts.
const OFFICE_SIGN = { india: 'ब्लॉक कृषि कार्यालय, संगरूर', pakistan: 'تعلقہ زراعت آفس، دادو', nepal: 'कृषि शाखा, जानकी गाउँपालिका', bhutan: 'Gewog Agriculture Extension, Bapisa', myanmar: 'Township Agriculture Office, Nyaung-U' };
const OFFICE_SIGN_LOCAL = { bhutan: 'སྦ་པི་ས་ རྒེད་འོག་ སོ་ནམ་ཡིག་ཚང་', myanmar: 'ညောင်ဦးမြို့နယ် စိုက်ပျိုးရေးဦးစီးဌာန' };
const DIGITS = { ne: '०१२३४५६७८९', my: '၀၁၂၃၄၅၆၇၈၉', dz: '༠༡༢༣༤༥༦༧༨༩' };
function sms(lang, key, id, vals) {
  const own = SMS[lang]?.[key];
  let t = own ?? SMS.en[key];
  if (!t) return null;
  t = t.replace('{office}', own && OFFICE_SIGN_LOCAL[id] ? OFFICE_SIGN_LOCAL[id] : OFFICE_SIGN[id]);
  for (const [k, v] of Object.entries(vals)) t = t.replace(`{${k}}`, String(v));
  return own && DIGITS[lang] ? t.replace(/[0-9]/g, (d) => DIGITS[lang][d]) : t;
}

// Alerts: { key, level: 'high' | 'watch' | 'info', title {bn,en}, body {bn,en}, sms }, most urgent first.
export function localAlerts(id, data, fc, today, lang) {
  const farm = data.points.farm;
  const out = [];
  const o3 = outlook(fc, 3);
  const days7 = fc?.days?.slice(0, 7) ?? [];
  const md0 = md(today);
  const harvestSeason = (id === 'nepal' || id === 'bhutan') && md0 >= '10-05' && md0 <= '11-30';
  if (fc && o3.rain >= 10) {
    out.push({ key: 'rain', level: o3.rain >= 25 ? 'high' : 'watch',
      title: { bn: `আগামী ৩ দিনে ${mm(o3.rain)} মিমি বৃষ্টি`, en: `${mm(o3.rain)} mm of rain in the next 3 days` },
      body: harvestSeason ? { bn: 'পাকা ধান এখন না কাটার পরামর্শ দিন; কাটা ধান উঁচুতে ঢেকে রাখতে বলুন।', en: 'Advise holding off cutting ripe paddy; cut paddy raised and covered.' } : { bn: 'কাটা ফসল ঢেকে রাখা আর নিচু জমির পানি বের করার কথা বলুন।', en: 'Advise covering cut crops and draining low fields.' },
      sms: sms(lang, 'rain', id, { mm: mm(o3.rain) }) });
  } else if (fc && harvestSeason) {
    out.push({ key: 'harvest', level: 'info', title: { bn: 'তিন দিন শুকনো — ধান কাটার সময়', en: 'Three dry days — time to cut the paddy' }, body: { bn: 'কৃষকদের এখনই কাটা, শুকানো আর মাড়াই সেরে ফেলতে বলুন।', en: 'Tell farmers to cut, dry and thresh now.' }, sms: sms(lang, 'harvest', id, {}) });
  }
  const hot = days7.length ? Math.max(...days7.map((d) => d.max)) : null;
  const normal = farm.normals[+today.slice(5, 7) - 1]?.tmax;
  if (hot != null && normal != null && hot >= normal + 4) {
    out.push({ key: 'heat', level: hot >= normal + 6 ? 'high' : 'watch', title: { bn: `সপ্তাহে তাপ ${mm(hot)}° পর্যন্ত (স্বাভাবিক ${mm(normal)}°)`, en: `Heat up to ${mm(hot)}° this week (normal ${mm(normal)}°)` }, body: { bn: 'দুপুরে স্প্রে আর সার না দেওয়া, পশুকে ছায়া-পানি।', en: 'No spraying or fertiliser at midday; shade and water for livestock.' }, sms: sms(lang, 'heat', id, { t: mm(hot) }) });
  }
  if (id === 'india' || id === 'pakistan') {
    const [start, best, last] = id === 'india' ? ['11-01', '11-15', '11-30'] : ['11-01', '11-20', '12-15'];
    const y = today.slice(0, 4);
    if (md0 >= '10-10' && md0 <= best) {
      const left = daysBetween(today, `${y}-${best}`), toStart = daysBetween(today, `${y}-${start}`);
      out.push({ key: 'sow', level: md0 >= start ? 'watch' : 'info',
        title: md0 >= start ? { bn: `গম বোনার সেরা সময় চলছে — আর ${left} দিন`, en: `Best wheat sowing window open — ${left} days left` } : { bn: `গম বোনার সেরা সময় শুরু ${toStart} দিন পর`, en: `Best wheat sowing window opens in ${toStart} days` },
        body: { bn: 'বীজ, সার আর বোনার যন্ত্রের জোগান মিলিয়ে নিন।', en: 'Line up seed, fertiliser and seed drills.' }, sms: sms(lang, 'sow', id, { days: left }) });
    } else if (md0 > best && md0 <= last) {
      out.push({ key: 'late', level: 'watch', title: { bn: 'সেরা সময় পেরিয়েছে — দেরির জাত', en: 'Past the best window — late varieties' }, body: { bn: 'যাঁরা বোনেননি, তাঁদের দেরিতে বোনার জাত দিন।', en: 'Give late-sown varieties to those still to sow.' }, sms: sms(lang, 'late', id, {}) });
    }
  }
  if (id === 'myanmar' && md0 >= '10-10' && md0 <= '11-30' && !(fc && o3.rain >= 15)) {
    out.push({ key: 'sowpulse', level: 'info', title: { bn: 'ছোলা বোনার সময় — মাটিতে ভেজা আছে কিনা দেখুন', en: 'Chickpea sowing time — check the soil still holds water' }, body: { bn: 'গত ৩০ দিনের বৃষ্টি বাদ বাষ্পীভবন দেখে কৃষকদের এ সপ্তাহে বুনতে বলুন।', en: 'Going by the last 30 days of rain minus evaporation, tell farmers to sow this week.' }, sms: sms(lang, 'sowpulse', id, {}) });
  }
  if (farm.fires.km50 >= 15) {
    out.push({ key: 'fire', level: farm.fires.km50 >= 60 ? 'high' : 'watch', title: { bn: `৫০ কিমির মধ্যে ${farm.fires.km50}টি আগুন (৭ দিন)`, en: `${farm.fires.km50} fires within 50 km (7 days)` }, body: { bn: 'খড় না পোড়ানোর কথা মনে করিয়ে দিন; যন্ত্রের ব্যবস্থা করুন।', en: 'Remind farmers not to burn residue; arrange machines.' }, sms: sms(lang, 'fire', id, { n: farm.fires.km50 }) });
  }
  if (zoneFlags(farm).some((f) => f.key === 'dry')) {
    out.push({ key: 'dry', level: 'watch', title: { bn: 'গত ৩০ দিন স্বাভাবিকের চেয়ে অনেক শুকনো', en: 'The last 30 days far drier than normal' }, body: { bn: 'বোনার আগে মাটির ভেজা পরীক্ষা করতে বলুন।', en: 'Advise checking soil moisture before sowing.' }, sms: sms(lang, 'dry', id, {}) });
  }
  const rank = { high: 0, watch: 1, info: 2 };
  // Every message also in English, for the officer to read or to send where the local draft is not checked.
  const vals = { mm: mm(o3.rain), t: hot != null ? mm(hot) : '', n: farm.fires.km50, days: '' };
  for (const a of out) {
    if (a.key === 'sow') vals.days = daysBetween(today, `${today.slice(0, 4)}-${id === 'india' ? '11-15' : '11-20'}`);
    a.smsEn = lang === 'en' ? a.sms : sms('en', a.key, id, vals);
  }
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
export const SMS_LANG_NAME = { hi: { bn: 'হিন্দি', en: 'Hindi' }, ur: { bn: 'উর্দু', en: 'Urdu' }, ne: { bn: 'নেপালি', en: 'Nepali' }, my: { bn: 'বর্মি', en: 'Burmese' }, dz: { bn: 'জংখা', en: 'Dzongkha' }, en: { bn: 'ইংরেজি', en: 'English' } };
