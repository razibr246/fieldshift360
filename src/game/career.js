// The player's career in মাঠের মানুষ, across seasons and farmers: experience earned for farming well (stars, crops
// rotated, legumes, soil enriched, NASA data used), five ranks, thirteen achievements, and one piece of equipment
// unlocked at each rank that later seasons start with. Earned only by playing; nothing is bought. The equipment is
// the sim's own perks (sim.js): a bigger can, earlier storm warnings, drip lines, neem. The season's own XP and
// levels (sim.js gainXp) are separate and reset every season. Pure; FarmGame.jsx keeps it in localStorage.
const q = (bn, en) => ({ bn, en });
const BN = '০১২৩৪৫৬৭৮৯';
const bn = (n) => String(n).replace(/[0-9]/g, (d) => BN[d]);

export const CAREER_KEY = 'fs360.game.career';
export const emptyCareer = () => ({ xp: 0, seasons: 0, wins: {}, countries: {}, achievements: {} });

export const RANKS = [
  { xp: 0, title: q('নতুন কৃষক', 'New farmer') },
  { xp: 300, title: q('যত্নশীল কৃষক', 'Careful farmer') },
  { xp: 800, title: q('মাটির বন্ধু', 'Friend of the soil') },
  { xp: 1600, title: q('আকাশ-পড়া কৃষক', 'Reads the sky') },
  { xp: 3000, title: q('আদর্শ কৃষক', 'Model farmer') },
];

// one piece of equipment for each rank above the first, as the sim's perks
export const UNLOCKS = [
  { rank: 1, perk: 'pond', title: q('পুকুর থেকে বড় বালতি', 'A bigger can from the pond'), what: q('বালতিতে ২ বার বেশি পানি', '2 more waterings per can') },
  { rank: 2, perk: 'warn', title: q('FieldShift-এর SMS সতর্কতা', 'FieldShift SMS alerts'), what: q('ঝড়ের সতর্কতা ১০ সেকেন্ড আগে', 'Storm warning 10 seconds earlier') },
  { rank: 3, perk: 'drip', title: q('ড্রিপ সেচের পাইপ', 'Drip irrigation lines'), what: q('জমি ৩০% ধীরে শুকায়', 'Plots dry 30% slower') },
  { rank: 4, perk: 'neem', title: q('নিমের নির্যাস', 'Neem extract'), what: q('পোকা ধীরে ছড়ায়', 'Pests spread more slowly') },
];

const BD = ['razib', 'rahimu', 'didarul', 'prahlad', 'kader', 'mofizul', 'rahima'];
// res: { who, country, stars, count, report, whatIf }; c: the career after this season is added
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', title: q('প্রথম মৌসুম', 'First season'), what: q('একটি মৌসুম জিতুন', 'Win a season'), test: () => true },
  { id: 'stars3', icon: '⭐', title: q('নিখুঁত মৌসুম', 'A perfect season'), what: q('৩ তারা পান', 'Earn 3 stars'), test: (r) => r.stars >= 3 },
  { id: 'rotator', icon: '🔄', title: q('ফসলচক্রের মানুষ', 'Rotation farmer'), what: q('এক মৌসুমে ৩ বার ফসল বদলান', 'Rotate crops 3 times in a season'), test: (r) => r.report.rotated >= 3 },
  { id: 'norepeat', icon: '🐛', title: q('পোকার চক্র ভাঙলেন', 'Broke the pest cycle'), what: q('একবারও একই ফসল আবার না বুনে ফসল বদলান', 'Rotate without ever sowing the same crop again'), test: (r) => r.report.rotated >= 1 && r.report.repeats === 0 },
  { id: 'legume', icon: '🫘', title: q('ডালের বন্ধু', 'Friend of pulses'), what: q('এক মৌসুমে ২টি ডাল ফসল তুলুন', 'Harvest 2 legumes in a season'), test: (r) => r.report.legumes >= 2 },
  { id: 'soil', icon: '🪱', title: q('মাটি গড়লেন', 'Soil builder'), what: q('৬টি জমি উর্বর করুন', 'Enrich 6 plots'), test: (r) => r.report.enriched >= 6 },
  { id: 'covered', icon: '🌧️', title: q('ঝড়েও মাটি অটুট', 'Soil kept through the storm'), what: q('ঝড়ে কোনো খালি জমির মাটি না হারিয়ে মৌসুম জিতুন', 'Win without bare soil washing away in the storm'), test: (r) => r.report.eroded === 0 },
  { id: 'data', icon: '🛰️', title: q('উপগ্রহ পড়তে জানেন', 'Reads the satellites'), what: q('উপগ্রহ দৃশ্য, পানির চাপ স্তর আর FieldShift সবই ব্যবহার করুন', 'Use the satellite view, the water-stress layer and FieldShift'), test: (r) => (r.count.satViews ?? 0) >= 1 && (r.count.waterLayer ?? 0) >= 1 && (r.count.advised ?? 0) >= 2 },
  { id: 'harvest', icon: '🧺', title: q('বড় ফসল', 'A big harvest'), what: q('এক মৌসুমে ২,০০০ বিক্রি করুন', 'Sell 2,000 in one season'), test: (r) => (r.count.earned ?? 0) >= 2000 },
  { id: 'heat', icon: '🔥', title: q('গরম দশকের প্রস্তুতি', 'Ready for a hotter decade'), what: q('২ °সে গরম "যদি" মৌসুম জিতুন', 'Win a what-if season 2 °C hotter'), test: (r) => (r.whatIf?.dT ?? 0) >= 2 },
  { id: 'three', icon: '🧭', title: q('তিন মাঠের অভিজ্ঞতা', 'Three fields'), what: q('৩ জন আলাদা কৃষকের মৌসুম জিতুন', 'Win with 3 different farmers'), test: (r, c) => Object.keys(c.wins).length >= 3 },
  { id: 'bangladesh', icon: '🇧🇩', title: q('সাত বিভাগ', 'All seven divisions'), what: q('বাংলাদেশের ৭ জন কৃষকেরই মৌসুম জিতুন', 'Win with all 7 Bangladesh farmers'), test: (r, c) => BD.every((id) => c.wins[id]) },
  { id: 'world', icon: '🌏', title: q('ছয় দেশের মাঠ', 'Fields in six countries'), what: q('ছয় দেশেই একটি করে মৌসুম জিতুন', 'Win a season in each of the six countries'), test: (r, c) => Object.keys(c.countries).length >= 6 },
];

// What a won season is worth, part by part, so the end screen can say why.
export function seasonXp(r) {
  const parts = [
    [q('মৌসুম জয়', 'Season won'), 100],
    [q(`${bn(r.stars)} তারা`, `${r.stars} stars`), r.stars * 40],
    [q('ফসল বদল', 'Crops rotated'), Math.min(6, r.report.rotated) * 15],
    [q('ডাল তোলা', 'Legumes'), Math.min(6, r.report.legumes) * 20],
    [q('উর্বর জমি', 'Plots enriched'), Math.min(18, r.report.enriched) * 6],
    [q('নাসার তথ্য ব্যবহার', 'NASA data used'), ((r.count.satViews ?? 0) > 0 ? 15 : 0) + ((r.count.waterLayer ?? 0) > 0 ? 15 : 0) + ((r.count.advised ?? 0) > 0 ? 15 : 0)],
    [q('একই ফসল আবার', 'Same crop again'), -Math.min(6, r.report.repeats) * 10],
  ].filter(([, xp]) => xp !== 0).map(([label, xp]) => ({ label, xp }));
  return { parts, total: Math.max(50, parts.reduce((a, p) => a + p.xp, 0)) };
}

export function rankOf(xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1] ?? null;
  return { index: i, rank: RANKS[i], next, progress: next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1 };
}

// The equipment a season starts with: everything unlocked by the career's rank.
export const startPerks = (career) => UNLOCKS.filter((u) => rankOf(career?.xp ?? 0).index >= u.rank).map((u) => u.perk);

// Add a won season to the career. Returns the new career and what changed, for the end screen; never mutates.
export function recordSeason(career, r) {
  const c0 = career ?? emptyCareer();
  const c = { ...c0, wins: { ...c0.wins }, countries: { ...c0.countries }, achievements: { ...c0.achievements } };
  const xp = seasonXp(r), before = rankOf(c0.xp);
  c.xp = c0.xp + xp.total; c.seasons = c0.seasons + 1;
  c.wins[r.who] = Math.max(c.wins[r.who] ?? 0, r.stars);
  if (r.country) c.countries[r.country] = true;
  const fresh = ACHIEVEMENTS.filter((a) => !c.achievements[a.id] && a.test(r, c));
  for (const a of fresh) c.achievements[a.id] = c.seasons;
  const after = rankOf(c.xp);
  const unlocked = UNLOCKS.filter((u) => u.rank > before.index && u.rank <= after.index);
  return { career: c, xp, newAchievements: fresh, rankBefore: before, rankAfter: after, unlocked };
}
