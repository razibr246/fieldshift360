// "দশ বছরের উত্তরাধিকার" (The Ten-Year Inheritance): the story campaign of মাঠের মানুষ. Razib comes home to Chauhat,
// Dhamrai, when his father falls ill, and inherits two bigha and his father's notebook of sowing dates, written for a
// weather that no longer comes. Three real Rabi seasons (2023, 2024, 2025), each played in the 3D field with that
// year's real Dhamrai heat and storms from NASA POWER, three family and village choices, then 2045 in NASA's CMIP6
// climate, when his daughter inherits whatever he leaves. The people are invented; the weather is real.
// Pure (no React, no drawing), so Node tests can run it.
import { ymd, addDays } from '../engine/dates.js';
import CMIP6 from '../data/climate/cmip6_deltas.json' with { type: 'json' };

const q = (bn, en) => ({ bn, en });
export const SAGA_KEY = 'fs360.saga.v1';
export const SEASON_YEARS = [2023, 2024, 2025]; // Rabi harvest years, all in the NASA POWER record

// ── the people ──
export const CAST = {
  razib: { name: q('রাজিব', 'Razib'), role: q('আপনি · ৩০ বছর', 'You · 30') },
  baba: { name: q('বাবা', 'Baba'), role: q('আব্দুল মিয়া · ৬৪ বছর', 'Abdul Miah · 64'),
    look: { skin: '#a8704a', hair: '#e7e3dc', beard: '#efebe4', build: 1, head: 'tupi', headA: '#f7f5ef', top: 'kurta', topA: '#eef0ea', topB: '#cfd4cb', lower: 'lungi', lowA: '#2d5a3a', lowB: '#8fb59a', feet: 'sandal', feetA: '#2f2a26' } },
  dadi: { name: q('দাদি', 'Dadi'), role: q('রাজিবের দাদি · ৮২ বছর', 'Razib’s grandmother · 82'),
    look: { skin: '#b27c55', hair: '#efece6', build: 0.9, head: 'aanchal', headA: '#f3efe6', top: 'blouse', topA: '#f3efe6', topB: '#d9d3c6', lower: 'sari', lowA: '#f3efe6', lowB: '#3f7a4a', sari: true, bangle: '#d9a83a', feet: 'sandal', feetA: '#6b3b2a' } },
  mitu: { name: q('মিতু', 'Mitu'), role: q('ছোট বোন · ১৫ বছর', 'Little sister · 15'),
    look: { skin: '#c8946a', hair: '#15100c', build: 0.84, head: 'orhni', headA: '#e0567a', top: 'kameez', topA: '#f2a65a', topB: '#e08a3a', lower: 'shalwar', lowA: '#e0567a', lowB: '#c43d62', feet: 'sandal', feetA: '#6b3b2a' } },
  nasrin: { name: q('নাসরিন আপা', 'Nasrin Apa'), role: q('উপসহকারী কৃষি কর্মকর্তা, চৌহাট ব্লক', 'Sub-assistant agriculture officer, Chauhat block'),
    look: { skin: '#c08a62', hair: '#15100c', build: 0.92, head: 'hijab', headA: '#2f6f6a', top: 'kameez', topA: '#3d8a83', topB: '#2f6f6a', lower: 'shalwar', lowA: '#e8e2d4', lowB: '#c9c0ac', feet: 'shoe', feetA: '#3a2a1e' } },
  sohel: { name: q('সোহেল', 'Sohel'), role: q('চাচাতো ভাই, ঢাকার কারখানায়', 'Cousin, works in a Dhaka factory'),
    look: { skin: '#b98258', hair: '#15100c', build: 1, head: 'short', top: 'shirt', topA: '#3a5f9a', topB: '#2c4a7a', lower: 'cargo', lowA: '#3a3a40', lowB: '#2a2a30', feet: 'shoe', feetA: '#1d1a18' } },
  nodi: { name: q('নদী', 'Nodi'), role: q('রাজিবের মেয়ে · ২০৪৫ সালে ১৮', 'Razib’s daughter · 18 in 2045'),
    look: { skin: '#c8946a', hair: '#15100c', build: 0.86, head: 'bare', top: 'kameez', topA: '#43863a', topB: '#2f6a2c', lower: 'shalwar', lowA: '#e6dcc4', lowB: '#cbbf9f', feet: 'sneaker', feetA: '#ecebe6', feetB: '#43863a' } },
  narrator: { name: q('', ''), role: q('', '') },
};

// What the family and the land hold, 0–100, and the savings in taka.
export const START = { soil: 50, water: 60, family: 60, village: 40, savings: 20000 };
export const METERS = [
  { k: 'soil', bn: 'মাটির স্বাস্থ্য', en: 'Soil health' },
  { k: 'water', bn: 'মাটির নিচের পানি', en: 'Groundwater' },
  { k: 'family', bn: 'পরিবার', en: 'Family' },
  { k: 'village', bn: 'গ্রামের আস্থা', en: 'Village trust' },
];
const clamp = (v) => Math.max(0, Math.min(100, v));
export function applyFx(st, fx = {}) {
  const out = { ...st };
  for (const [k, v] of Object.entries(fx)) out[k] = k === 'savings' ? Math.round(out[k] + v) : clamp(out[k] + v);
  return out;
}

// The father's notebook: what he wrote, and the line Razib adds once the real year has shown him.
export const NOTEBOOK = [
  { id: 'heat', baba: q('চৈত্রের গরম বোরোর ফুলে লাগে না, বৈশাখে ধান কাটা।', 'Chaitra heat never reaches the Boro flowers; cut the rice in Boishakh.') },
  { id: 'rain', baba: q('রবিতে আকাশ শুকনো থাকে, সেচই ভরসা।', 'The Rabi sky stays dry; irrigation is all you can count on.') },
  { id: 'storm', baba: q('কালবৈশাখী আসে বৈশাখে, তার আগে নয়।', 'The nor’westers come in Boishakh, never before.') },
];

// ── the story ──
// A chapter: scenes of lines (who, bn/en, an optional photo), then a choice or a season or both, in order.
export const CHAPTERS = [
  { id: 'prologue', year: 2022, title: q('প্রস্তাবনা · আশ্বিন ১৪২৯', 'Prologue · Ashwin 2022'), heading: q('বাড়ি ফেরা', 'Coming home'),
    steps: [
      { scene: { photo: 'dhamraiBridge', lines: [
        ['narrator', 'ঢাকা, রাত এগারোটা। কারখানার শিফট শেষে রাজিবের ফোন বাজে। মিতু, কাঁদতে কাঁদতে: "ভাইয়া, বাবা মাঠে পড়ে গেছে।"', 'Dhaka, eleven at night. As his factory shift ends, Razib’s phone rings. Mitu, in tears: “Bhaiya, Baba fell in the field.”'],
        ['narrator', 'ভোরের বাসে চৌহাট। নদীর ওপরের সেতু, সেই পুরোনো মাঠ, যেখান থেকে ছয় বছর আগে সে চলে গিয়েছিল।', 'The dawn bus to Chauhat. The bridge over the river, the old fields he left six years ago.'],
      ] } },
      { scene: { photo: 'villageSky', lines: [
        ['baba', 'এসেছিস? ডাক্তার বলেছে আর রোদে কাজ নয়। দুই বিঘা জমি এখন তোর।', 'You came? The doctor says no more work in the sun. The two bigha are yours now.'],
        ['baba', 'এই খাতাটা রাখ। চল্লিশ বছরের হিসাব: কবে বীজতলা, কবে রোপণ, কবে কাটা। এই খাতা কোনোদিন ভুল বলেনি।', 'Keep this notebook. Forty years of reckoning: when to sow the seedbed, when to transplant, when to cut. This notebook has never been wrong.'],
        ['dadi', 'খনা বলে গেছেন, "যদি বর্ষে মাঘের শেষ, ধন্যি রাজার পুণ্যি দেশ।" কিন্তু বাবু, আকাশ এখন আর খনার কথা শোনে না।', 'Khana said, “If it rains at the end of Magh, blessed is the king, blessed the land.” But child, the sky no longer listens to Khana.'],
        ['mitu', 'ভাইয়া, তুমি থাকবে তো? আমার এসএসসি পরীক্ষা সামনের বছর।', 'Bhaiya, you’ll stay, won’t you? My school exams are next year.'],
      ] } },
      { notebook: true },
    ] },

  { id: 'y2023', year: 2023, title: q('প্রথম অধ্যায় · রবি ২০২২–২৩', 'Chapter one · Rabi 2022–23'), heading: q('বাবার খাতা', 'Father’s notebook'),
    steps: [
      { scene: { photo: 'landParcels', lines: [
        ['narrator', 'কার্তিক। জমি শুকিয়ে এসেছে। খাতায় বাবার হাতের লেখা: "বোরো, মাঘের প্রথম সপ্তাহে রোপণ।"', 'Kartik. The land is drying out. In Baba’s hand: “Boro, transplant in the first week of Magh.”'],
        ['nasrin', 'আমি নাসরিন, এই ব্লকের কৃষি অফিসের। শুনলাম আপনি ফিরেছেন। জমিটা ফোনের অ্যাপে মানচিত্রে বসিয়ে দেখবেন? নাসার পঁচিশ বছরের আবহাওয়া আপনার জমির জন্য হিসাব করে দেয়।', 'I’m Nasrin, from the agriculture office for this block. I heard you were back. Shall we put your field on the map in the app? It works out 25 years of NASA weather for your own field.'],
        ['razib', 'বাবা বলেন খাতাই যথেষ্ট।', 'Baba says the notebook is enough.'],
        ['nasrin', 'খাতাটা দামি। শুধু দেখে নিন খাতার আবহাওয়া আর এখনকার আবহাওয়া এক কি না।', 'The notebook is precious. Just check whether the notebook’s weather is still today’s.'],
      ] } },
      { choice: { id: 'plan', ask: q('এই রবিতে কী করবেন?', 'What will you do this Rabi?'), options: [
        { id: 'notebook', label: q('বাবার খাতা মেনে পুরো জমিতে বোরো', 'Follow the notebook: Boro on the whole field'), fx: { water: -12, soil: -4, family: 6 }, after: q('বাবা খুশি। কিন্তু পাম্পের বিল আসে আগের চেয়ে বেশি।', 'Baba is pleased. But the pump bill is higher than ever.') },
        { id: 'data', label: q('অ্যাপের পরামর্শে আগে সরিষা, তারপর কম পানির বোরো', 'Take the app’s advice: mustard first, then a low-water Boro'), fx: { water: -4, soil: 4, family: -4, savings: 3000 }, after: q('বাবা মুখ ফিরিয়ে নেন: "তুই আমার খাতা মানলি না।" মিতু চুপি চুপি বলে, "ভালো করেছ।"', 'Baba turns away: “You didn’t trust my notebook.” Mitu whispers, “You did right.”') },
        { id: 'half', label: q('অর্ধেক জমিতে খাতা, অর্ধেকে অ্যাপ, তারপর মিলিয়ে দেখা', 'Half the field by the notebook, half by the app, then compare'), fx: { water: -8, soil: 1, family: 3, village: 3 }, after: q('বাবা রাজি হন: "দেখি তোর যন্ত্র কী বলে।" পাশের জমির লোকেরাও উঁকি দেয়।', 'Baba agrees: “Let’s see what your machine says.” The neighbours lean over the ridge to watch.') },
      ] } },
      { season: 2023 },
      { notebook: 'heat' },
      { scene: { photo: 'bullockCart', lines: [
        ['narrator', 'মৌসুম শেষে একটা ট্রাক আসে ইটভাটা থেকে। লোকটা বলে, "ওপরের এক হাত মাটি দেন, নগদ ত্রিশ হাজার।"', 'At the season’s end a truck comes from the brick kiln. The man says, “Give us the top foot of soil, thirty thousand cash.”'],
        ['dadi', 'ওই মাটিতে তোর দাদার ঘাম। ওপরের মাটি গেলে নিচে শুধু শক্ত তলা।', 'Your grandfather’s sweat is in that soil. Take the top away and there is only the hard pan below.'],
      ] } },
      { choice: { id: 'kiln', ask: q('ইটভাটার প্রস্তাব?', 'The brick kiln’s offer?'), options: [
        { id: 'sell', label: q('বিক্রি করি: বাবার ওষুধের টাকা দরকার', 'Sell it: Baba’s medicine costs money'), fx: { savings: 30000, soil: -22, village: -4 }, after: q('ট্রাক ভরে মাটি চলে যায়। জমিটা এক হাত নিচু হয়ে যায়, বর্ষায় পানি জমে থাকে।', 'The truck leaves full. The field sits a foot lower now, and holds water in the rains.') },
        { id: 'refuse', label: q('না: মাটিই আসল সম্পদ', 'No: the soil is the real wealth'), fx: { soil: 3, family: 4, savings: -4000 }, after: q('ওষুধের টাকার জন্য একটা গরু বিক্রি করতে হয়। দাদি রাজিবের মাথায় হাত রাখেন।', 'A cow is sold for the medicine. Dadi lays her hand on Razib’s head.') },
        { id: 'pond', label: q('শুধু পুকুর কাটার মাটি দিই, জমির মাটি নয়', 'Only the soil from digging a pond, not the field’s'), fx: { savings: 12000, water: 6, soil: -2 }, after: q('জমির কোণে একটা পুকুর হয়: শুকনো মাসে সেচের পানি, বর্ষায় মাছ।', 'A pond appears in the corner of the field: water for the dry months, fish in the rains.') },
      ] } },
    ] },

  { id: 'y2024', year: 2024, title: q('দ্বিতীয় অধ্যায় · রবি ২০২৩–২৪', 'Chapter two · Rabi 2023–24'), heading: q('মিতুর পরীক্ষা', 'Mitu’s exams'),
    steps: [
      { scene: { photo: 'seedlings', lines: [
        ['mitu', 'ভাইয়া, ফেব্রুয়ারিতে আমার পরীক্ষা, ঠিক যখন রোপণ। মা বলছে বছরটা বাদ দিতে।', 'Bhaiya, my exams are in February, right at transplanting time. Ma says skip the year.'],
        ['nasrin', 'মিতু তো অ্যাপটা তোমার চেয়েও ভালো চালায়। ও যদি পড়ে, তোমার পরিবারের হিসাব রাখতে পারবে।', 'Mitu handles the app better than you. If she keeps studying, she could keep your family’s accounts and data.'],
      ] } },
      { choice: { id: 'mitu', ask: q('মিতু কী করবে?', 'What will Mitu do?'), options: [
        { id: 'home', label: q('এ বছর মাঠে থাকুক, পরীক্ষা পরের বছর', 'She helps in the field this year; exams next year'), fx: { savings: 5000, family: -18 }, after: q('মিতু কথা বলে না। রাতে বারান্দায় বসে বইয়ের পাতা ওল্টায়।', 'Mitu says nothing. At night she sits on the veranda turning the pages of her books.') },
        { id: 'school', label: q('পরীক্ষা দিক; দুজন মজুর রাখি', 'She sits her exams; we hire two labourers'), fx: { savings: -8000, family: 14 }, after: q('মিতু জিপিএ-৫ পায়। পুরো গ্রাম মিষ্টি খায়।', 'Mitu gets top marks. The whole village eats sweets.') },
        { id: 'data', label: q('পরীক্ষা দিক, আর সন্ধ্যায় অ্যাপে জমির হিসাব রাখুক', 'She sits her exams, and keeps the field’s data in the app each evening'), fx: { savings: -3000, family: 10, village: 4, soil: 2 }, after: q('মিতু প্রতি সন্ধ্যায় আজকের সেচের পাতা দেখে বলে কাল পানি লাগবে কি না। পাশের বাড়ির চাচিরাও এসে জিজ্ঞেস করেন।', 'Each evening Mitu reads the Today page and says whether the field needs water tomorrow. The aunties next door start coming to ask.') },
      ] } },
      { season: 2024 },
      { notebook: 'rain' },
      { scene: { photo: 'riceHarvest', lines: [
        ['nasrin', 'উপগ্রহে দেখছি এই এলাকায় মাটির নিচের পানি প্রতি বছর নামছে। দশটা পরিবার মিলে পালা করে ভেজানো-শুকানো সেচ দিলে পানি আর ডিজেল দুটোই বাঁচে।', 'The satellites show the groundwater here falling every year. If ten families share the pump and take turns with alternate wetting and drying, both water and diesel are saved.'],
        ['baba', 'আমরা কোনোদিন কারো সঙ্গে পাম্প ভাগ করিনি।', 'We have never shared a pump with anyone.'],
      ] } },
      { choice: { id: 'pump', ask: q('পাম্পের দল?', 'The pump group?'), options: [
        { id: 'join', label: q('দলে যোগ দিই, পালা করে সেচ', 'Join the group and irrigate in turns'), fx: { water: 14, village: 16, savings: 4000 }, after: q('প্রথম মাসে ঝগড়া হয়, তারপর সবাই খাতা বানায়: কার পালা কবে। পানির বিল অর্ধেক।', 'The first month brings quarrels, then they make a ledger of whose turn is when. The water bill halves.') },
        { id: 'alone', label: q('নিজের পাম্প নিজের', 'My own pump, my own way'), fx: { water: -10, savings: -3000, family: 2 }, after: q('পাম্প রাতদিন চলে। মে মাসে নলকূপে পানি আসে দেরিতে।', 'The pump runs night and day. By May the tube well is slow to draw water.') },
      ] } },
    ] },

  { id: 'y2025', year: 2025, title: q('তৃতীয় অধ্যায় · রবি ২০২৪–২৫', 'Chapter three · Rabi 2024–25'), heading: q('ঢাকার ডাক', 'The call of Dhaka'),
    steps: [
      { scene: { photo: 'sunsetFields', lines: [
        ['sohel', 'ভাই, কারখানায় সুপারভাইজারের পদ খালি। মাসে পঁচিশ হাজার, প্রতি মাসে, বৃষ্টি হোক বা না হোক।', 'Brother, there’s a supervisor’s job at the factory. Twenty-five thousand a month, every month, rain or no rain.'],
        ['razib', 'আর জমি?', 'And the land?'],
        ['sohel', 'বর্গা দিয়ে দে। মাটি তো আর পালাবে না।', 'Rent it out. The soil isn’t going anywhere.'],
      ] } },
      { choice: { id: 'dhaka', ask: q('ঢাকায় যাবেন?', 'Go to Dhaka?'), options: [
        { id: 'go', label: q('যাই, জমি বর্গা দিই', 'Go, and rent out the land'), fx: { savings: 30000, family: -10, soil: -10, village: -8 }, after: q('বর্গাদার তিন ফসল টানে, কোনো বিশ্রাম নেই। রাজিব মাসে একবার বাড়ি আসে।', 'The tenant pulls three crops a year with no rest. Razib comes home once a month.') },
        { id: 'stay', label: q('থাকি, বীজের দল গড়ি', 'Stay, and start a seed group'), fx: { village: 14, family: 8, savings: -2000, soil: 3 }, after: q('পাঁচ পরিবার মিলে খরা-সহিষ্ণু ধানের বীজ রাখে। নাসরিন আপা প্রশিক্ষণ দেন।', 'Five families save seed of drought-tolerant rice together. Nasrin Apa runs the training.') },
      ] } },
      { season: 2025 },
      { notebook: 'storm' },
      { scene: { photo: 'hillClouds', lines: [
        ['narrator', 'চৈত্রের এক সন্ধ্যায় একটা খবর আসে সিলেট থেকে: উজানে পাহাড়ে ভারী বৃষ্টি, ঢল নামছে। সিলেটের রহিমা বেগম অ্যাপে সতর্কবার্তা পাঠিয়েছেন। পানি নিচে নামতে দুই দিন।', 'One evening in Chaitra news comes from Sylhet: heavy rain on the hills upstream, a flash flood coming down. Rahima Begum in Sylhet has sent a warning through the app. Two days for the water to come down.'],
        ['mitu', 'ভাইয়া, নিচু জমির সবাইকে জানাতে হবে, এখনই।', 'Bhaiya, everyone with low fields has to know, now.'],
      ] } },
      { choice: { id: 'delta', ask: q('উজানের খবর?', 'The news from upstream?'), options: [
        { id: 'share', label: q('মসজিদের মাইকে আর এসএমএসে সবাইকে জানাই', 'Tell everyone, by the mosque loudspeaker and by SMS'), fx: { village: 16, savings: 2000 }, after: q('দুই দিনে নিচু জমির পাকা ধান কেটে ঘরে ওঠে। পরের মাসে নিচের জেলার কৃষকেরা একই খবর আরও নিচে পাঠান।', 'In two days the ripe rice on the low fields is cut and brought in. Next month farmers downstream pass the same news further down.') },
        { id: 'mine', label: q('আগে নিজের ফসল তুলি', 'Bring in my own crop first'), fx: { savings: 3000, village: -12 }, after: q('রাজিবের ধান বাঁচে। পাশের তিন জমি ডোবে। হাটে কেউ চোখে চোখ রাখে না।', 'Razib’s rice is saved. Three neighbouring fields drown. At the market nobody meets his eye.') },
      ] } },
    ] },

  { id: 'epilogue', year: 2045, title: q('উপসংহার · ২০৪৫', 'Epilogue · 2045'), heading: q('নদীর উত্তরাধিকার', 'Nodi’s inheritance'),
    steps: [{ ending: true }] },
];

// ── the real weather of each season (Dhamrai, NASA POWER; station-corrected in the app) ──
const count = (clim, v, a, b, ok) => { let n = 0; for (let t = a; t <= b; t = addDays(t, 1)) { const x = clim.val(v, t); if (x != null && ok(x)) n++; } return n; };
const sum = (clim, v, a, b) => { let s = 0; for (let t = a; t <= b; t = addDays(t, 1)) s += clim.val(v, t) ?? 0; return s; };
const max3 = (clim, a, b) => { let m = 0; for (let t = addDays(a, 2); t <= b; t = addDays(t, 1)) m = Math.max(m, [0, 1, 2].reduce((s, k) => s + (clim.val('prec', addDays(t, -k)) ?? 0), 0)); return m; };
const median = (v) => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const within = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
const yearOf = (clim, y) => ({
  hot: count(clim, 'tmax', ymd(y, 3, 1), ymd(y, 4, 30), (x) => x >= 35),
  rabiRain: Math.round(sum(clim, 'prec', ymd(y - 1, 11, 1), ymd(y, 2, 28))),
  storm: Math.round(max3(clim, ymd(y, 3, 1), ymd(y, 5, 31))),
});
// That year against the usual (median of the 2001–2025 seasons), and the game's strengths from it:
// heat stretches the heatwave, storm the storm, a wet Rabi brings more pests.
export function seasonOf(clim, y) {
  const base = Array.from({ length: 25 }, (_, i) => yearOf(clim, 2001 + i));
  const usual = { hot: median(base.map((b) => b.hot)), rabiRain: median(base.map((b) => b.rabiRain)), storm: median(base.map((b) => b.storm)) };
  const now = yearOf(clim, y);
  return {
    year: y, now, usual,
    mods: {
      heat: within(0.7, 1.7, (now.hot + 4) / (usual.hot + 4)),
      storm: within(0.7, 1.7, (now.storm + 25) / (usual.storm + 25)),
      pests: within(0.8, 1.5, (now.rabiRain + 30) / (usual.rabiRain + 30)),
    },
  };
}

// The 2040s at Dhamrai in NASA NEX-GDDP-CMIP6 (middle pathway, SSP2-4.5): the mean warming of the days across the
// models, and the change in a year's rain.
export function future(upz = 'dhamrai') {
  const cell = CMIP6.cells[CMIP6.upazilas[upz]];
  const models = Object.values(cell?.scenarios?.ssp245 ?? {});
  if (!models.length) return null;
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  return {
    models: models.length,
    dTmax: mean(models.map((m) => mean(m.dTmax))),
    rainPct: mean(models.map((m) => (m.futRainMm / m.histRainMm - 1) * 100)),
  };
}

// How a played (or quickly run) season moves the meters: money made is saved, crop lost tires the soil and the family.
export function seasonFx(r) {
  const earned = r?.count?.earned ?? 0, lost = r?.count?.lost ?? 0, cleared = r?.count?.pestsCleared ?? 0;
  return { savings: Math.round(earned * 12), soil: -Math.min(10, lost), family: earned >= 1000 ? 4 : -3, village: Math.min(4, cleared) };
}
// A season run without playing it, from the year's strength and how the field was planned.
export function quickSeason(mods, choices) {
  const care = (choices.plan === 'data' ? 1.2 : choices.plan === 'half' ? 1.05 : 0.9) + (choices.mitu === 'data' ? 0.1 : 0) + (choices.pump === 'join' ? 0.05 : 0);
  const stress = (mods.heat + mods.storm + mods.pests) / 3;
  const earned = Math.round(1000 * care / stress);
  return { quick: true, count: { earned, lost: Math.max(0, Math.round((stress - care) * 8 + 2)), pestsCleared: Math.round(3 * mods.pests) } };
}

// The endings, from what Razib leaves behind.
export function ending(st, choices) {
  if (choices.dhaka === 'go') return 'city';
  if (st.soil >= 55 && st.village >= 60) return 'golden';
  if (st.soil >= 45) return 'alone';
  return 'tired';
}
export const ENDINGS = {
  golden: {
    title: q('সোনার মাটি', 'Golden soil'),
    lines: [
      ['narrator', '২০৪৫। দিনগুলো এখন আরও গরম। কিন্তু চৌহাটের মাঠে মাটি কালো, ঝুরঝুরে, কেঁচোয় ভরা।', '2045. The days are hotter now. But in the Chauhat fields the soil is dark, crumbly, full of earthworms.'],
      ['nodi', 'বাবা, তোমার খাতার শেষ পাতায় দাদার লেখার নিচে তোমার লেখা। আমি তার নিচে লিখব।', 'Baba, on the last page of your notebook your writing sits under Dada’s. I’ll write under yours.'],
      ['mitu', 'আমি এখন উপজেলা কৃষি অফিসার। আমার উপজেলার অর্ধেক কৃষক এই ফসলচক্রে চলে, তোদের মাঠ দেখে।', 'I’m the upazila agriculture officer now. Half the farmers in my upazila follow this rotation, because they saw your field.'],
    ] },
  alone: {
    title: q('একা টিকে থাকা', 'Holding on alone'),
    lines: [
      ['narrator', '২০৪৫। রাজিবের জমি টিকে আছে, মাটি ভালো। কিন্তু চারপাশের জমি একে একে ইটভাটা আর কারখানার হাতে।', '2045. Razib’s field has held, the soil is good. But one by one the fields around it have gone to brick kilns and factories.'],
      ['nodi', 'বাবা, আমাদের জমিটা যেন সমুদ্রের মাঝে একটা দ্বীপ। একা একা কতদিন?', 'Baba, our field is like an island in the sea. How long, all alone?'],
    ] },
  tired: {
    title: q('ক্লান্ত মাটি', 'Tired soil'),
    lines: [
      ['narrator', '২০৪৫। মাটি শক্ত, ফ্যাকাশে। প্রতি বছর সার বাড়ে, ফলন কমে। গরম দিনে ফাটল ধরে।', '2045. The soil is hard and pale. Every year more fertiliser, less harvest. On hot days it cracks.'],
      ['nodi', 'বাবা, দাদার খাতায় লেখা "এক মুঠো মাটিতে এক মুঠো সোনা"। আমাদের মুঠোয় এখন শুধু ধুলো।', 'Baba, Dada’s notebook says “a fistful of soil is a fistful of gold.” In our fist there is only dust now.'],
    ] },
  city: {
    title: q('শহরের পথে', 'The road to the city'),
    lines: [
      ['narrator', '২০৪৫। রাজিব ঢাকায় সুপারভাইজার থেকে ম্যানেজার। চৌহাটের জমি বর্গাদারের হাতে বিশ বছর।', '2045. In Dhaka Razib rose from supervisor to manager. The Chauhat field has been in a tenant’s hands for twenty years.'],
      ['nodi', 'বাবা, আমি গ্রামে ফিরতে চাই। খাতাটা দাও। আমি আবার প্রথম পাতা থেকে শুরু করব।', 'Baba, I want to go back to the village. Give me the notebook. I’ll start again from the first page.'],
    ] },
};

// The letter Razib leaves in the notebook for his daughter, made of the choices he made.
const LETTER = {
  plan: { notebook: q('আমি প্রথম বছর তোর দাদার খাতা মেনেছিলাম, পরে শিখেছি আকাশ বদলায়।', 'The first year I followed your grandfather’s notebook; later I learned the sky changes.'), data: q('প্রথম বছরই খাতার পাশে নাসার তথ্য রেখেছিলাম; খাতাকে অসম্মান করিনি, শুধু মিলিয়ে নিয়েছি।', 'From the first year I kept NASA’s data beside the notebook; I never disrespected it, I only checked it.'), half: q('অর্ধেক জমিতে খাতা, অর্ধেকে তথ্য: তোর দাদা আর আমি একসঙ্গে শিখেছিলাম।', 'Half the field by the notebook, half by the data: your grandfather and I learned together.') },
  kiln: { sell: q('একবার মাটি বেচেছিলাম। সেই ভুল আর করিস না।', 'Once I sold our soil. Never make that mistake.'), refuse: q('ইটভাটার টাকা ফিরিয়ে দিয়েছিলাম; ওপরের এক হাত মাটিই আমাদের সম্পদ।', 'I turned down the kiln’s money; the top foot of soil is all our wealth.'), pond: q('জমির কোণের পুকুরটা সেই বছরের; শুকনো মাসে ওটাই বাঁচায়।', 'The pond in the corner is from that year; in the dry months it saves us.') },
  mitu: { home: q('তোর ফুপুকে একবার পরীক্ষা থেকে সরিয়েছিলাম। ওর কাছে মাফ চাস আমার হয়ে।', 'Once I kept your aunt from her exams. Ask her forgiveness for me.'), school: q('তোর ফুপু পড়েছে বলেই আজ এত দূর।', 'Your aunt studied, and that is why she has come so far.'), data: q('তোর ফুপুই প্রথম আমাদের জমির হিসাব রেখেছিল, সন্ধ্যার আলোয়।', 'Your aunt was the first to keep our field’s data, by the evening lamp.') },
  pump: { join: q('পাম্প ভাগ করো, পানি ভাগ করো; একা কেউ মাটির নিচের পানি বাঁচাতে পারে না।', 'Share the pump, share the water; nobody saves the water underground alone.'), alone: q('একা পাম্প চালিয়েছিলাম; নলকূপ নামতে দেখেছি।', 'I ran my pump alone, and watched the well fall.') },
  dhaka: { go: q('শহর টাকা দেয়, কিন্তু মাটি অপেক্ষা করে না।', 'The city pays, but the soil does not wait.'), stay: q('থেকে গিয়েছিলাম; বীজের দলটা আজও আছে।', 'I stayed; the seed group is still going.') },
  delta: { share: q('উজানের খবর সবাইকে দিস; নদী সবার।', 'Pass the news from upstream to everyone; the river belongs to all.'), mine: q('একবার নিজের ফসল আগে তুলেছিলাম; পাশের তিন জমি ডুবেছিল। সেটা ভুলিস না।', 'Once I saved my own crop first and three fields beside it drowned. Don’t forget that.') },
};
export function letter(choices) {
  return Object.entries(LETTER).map(([k, opts]) => opts[choices[k]]).filter(Boolean);
}
