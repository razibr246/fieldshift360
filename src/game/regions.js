// "মাঠের মানুষ" — the five farmers and their home ground: the same sample farmers who have accounts in the app's
// neighbouring-country section (src/data/abroad.js), each farming the land of their own place. Harjinder Singh in
// Sangrur, Punjab; Ghulam Nabi Chandio in Dadu, Sindh; Rampyari Chaudhary, a Tharu farmer in Kailali in the far-west
// Terai; Kinley Wangmo in Lobesa, Punakha; U Kyaw Win in Singu, Myanmar's Central Dry Zone. Their clothes, houses,
// trees, water source, market, crops and the danger that closes the season are those of the place, and the advice
// in the questions is what each country's agriculture research and extension services give farmers there.
// Everything is plain data, read by the simulation (sim.js) and the 3D world (three/*.js).

export const DAY = 60; // seconds of play per in-game day

// The field: 6 × 3 plots around the origin; x runs east, z south (metres).
export const PLOT = 3.4, GAP = 0.6, FCOLS = 6, FROWS = 3;
export const FIELD_W = FCOLS * PLOT + (FCOLS - 1) * GAP, FIELD_D = FROWS * PLOT + (FROWS - 1) * GAP;

// Where things stand. The same spots in every world, so the routes are learnt once; what stands there differs.
export const SPOTS = {
  start: [-13, -9],
  shed: { x: -20, z: -1, r: 2.6 },
  water: { x: 18, z: -5, r: 2.6 },
  market: { x: -17, z: 15, r: 3 },
  kiosk: { x: 15, z: 13, r: 2.4 },
  safe: { x: 3, z: -29, r: 6.5 },
  house: { x: -21, z: -15 },
};
export const WORLD_R = 80; // the farmer can walk this far from the middle (the farm lies within about 44)

const q = (bn, en) => ({ bn, en });
const ok = (bn, en) => ({ bn, en, ok: true });
// The market question is the same idea everywhere: when everyone sells at once, wait and sell in stages.
const glutQuiz = (crop, where) => ({
  q: q(`সবাই একসঙ্গে ${crop.bn} তুলে ${where.bn} আনছে, দাম অর্ধেকে নেমেছে। কী করবেন?`, `Everyone is bringing ${crop.en} to ${where.en} at once and the price has halved. What do you do?`),
  options: [q('যত দামেই হোক আজই সব বেচে দেওয়া', 'Sell everything today at any price'), ok('FieldShift-এ দাম দেখে কয়েক দিন অপেক্ষা, অন্য ফসল আগে বেচা', 'Check prices on FieldShift, wait a few days, sell other crops first'), q(`পরের বার আরও বেশি ${crop.bn} লাগানো`, `Plant even more ${crop.en} next time`)],
  why: q('সবার ফসল একসঙ্গে বাজারে এলে দাম পড়ে। একটু অপেক্ষা বা অন্য ফসল — দুটোই লাভ বাঁচায়।', 'When everyone sells at once the price falls. Waiting a little, or selling another crop, protects the profit.'),
  perk: 'market', perkText: q('বাজারের খবর: দাম পড়া অর্ধেক সময় থাকবে', 'Market news: the price drop lasts half as long'),
});

import { REGIONS_BD } from './regions_bd.js';

// The neighbouring countries' farmers; Bangladesh's seven are in regions_bd.js.
const ABROAD = {
  harjinder: {
    country: 'india', flag: '🇮🇳', dinner: { bn: 'মক্কি দি রোটি আর সরসোঁ দা সাগ', en: 'makki di roti and sarson da saag' }, cur: '₹',
    farmer: {
      bn: 'হরজিন্দর সিং', en: 'Harjinder Singh', local: 'ਹਰਜਿੰਦਰ ਸਿੰਘ', age: 52,
      trait: q('পরিশ্রমী, যন্ত্রে দক্ষ', 'Hard-working, good with machines'),
      skill: q('বড় নলকূপ: বালতিতে একবারে ৮ বার পানি', 'Big tubewell: 8 waterings per fill'),
      dress: [q('জাফরান পাগড়ি (দস্তার)', 'Saffron turban (dastar)'), q('সাদা কুর্তা-পায়জামা', 'White kurta-pyjama'), q('হাতে স্টিলের কড়া', 'Steel kara on the wrist'), q('কালো দাড়ি', 'Black beard')],
      speed: 3.8, run: 6.4, can: 8, sellBonus: 0, scanner: false, alertLead: 0, idle: 'wipe',
      look: {
        skin: '#b77b52', hair: '#1d1714', beard: '#1d1714', build: 1.08,
        head: 'turban', headA: '#e08a1e', headB: '#b86d10',
        top: 'kurta', topA: '#f2f2ee', topB: '#dad6cc',
        lower: 'pyjama', lowA: '#f2f2ee', lowB: '#dad6cc',
        feet: 'jutti', feetA: '#5a3a22', kara: true,
      },
    },
    place: {
      bn: 'বদরুখাঁ, সাংরুর, পাঞ্জাব', en: 'Badrukhan, Sangrur, Punjab', area: q('ভারতের খাদ্যভান্ডার', 'India’s grain bowl'),
      local: [q('ইউক্যালিপটাস আর পপলারের সারি', 'Rows of eucalyptus and poplar'), q('নলকূপের ঘর', 'The tubewell room'), q('ট্রাক্টর-ট্রলি', 'Tractor and trolley'), q('গুরুদ্বারা আর নিশান সাহিব', 'The gurdwara and its Nishan Sahib'), q('ধানের খড়', 'Rice straw on the field')],
      hazard: q('খড় পোড়ানো, নামতে থাকা ভূগর্ভের পানি, শিলাবৃষ্টি', 'Straw burning, falling groundwater, hail'),
    },
    names: { shed: q('বীজ-সারের দোকান', 'Seed and fertiliser shop'), water: q('নলকূপ (সাবমার্সিবল)', 'Tubewell (submersible)'), market: q('ট্রলিতে সাংরুর মান্ডি', 'Trolley to Sangrur mandi'), kiosk: q('কমন সার্ভিস সেন্টার', 'Common Service Centre'), safe: q('গ্রামের গুরুদ্বারা', 'The village gurdwara') },
    world: 'punjab',
    crops: {
      wheat: { bn: 'গম', en: 'Wheat', kind: 'wheat', cost: 15, price: 55, grow: 34, thirst: 0.75, pest: 0.2 },
      mustard: { bn: 'সরিষা (রায়া)', en: 'Mustard (raya)', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 0.9, pest: 0.35 },
      potato: { bn: 'আলু', en: 'Potato', kind: 'potato', cost: 20, price: 85, grow: 40, thirst: 1.4, pest: 0.55 },
      gram: { bn: 'ছোলা', en: 'Chickpea', kind: 'chickpea', cost: 8, price: 30, grow: 22, thirst: 0.45, pest: 0.15, soil: true },
    },
    glut: 'potato',
    pestWord: q('রোগ-পোকা', 'disease'),
    storm: { kind: 'hail', bn: 'শিলাবৃষ্টি আর বজ্রঝড়', en: 'Hail and thunderstorm' },
    quiz: {
      plant: {
        q: q('ধান কাটা শেষ, জমিতে খড়। গম বোনার আগে খড় নিয়ে কী করবেন?', 'The paddy is cut and the straw lies on the field. What do you do with it before sowing wheat?'),
        options: [q('আগুন দিয়ে পুড়িয়ে ফেলা — সবচেয়ে দ্রুত', 'Burn it — the quickest way'), ok('হ্যাপি সিডার দিয়ে খড়ের মধ্যেই গম বোনা', 'Sow the wheat straight into the straw with a Happy Seeder'), q('খড় তুলে রাস্তার ধারে ফেলে রাখা', 'Pile it by the road')],
        why: q('খড় পোড়ানো নিষিদ্ধ — মাটির জৈব পদার্থ পোড়ে, ধোঁয়া যায় দিল্লি পর্যন্ত। হ্যাপি সিডারে খড় জমিতে ঢাকনা হয়ে থাকে, মাটির ভেজা ধরে রাখে।', 'Burning is banned — it burns the soil’s organic matter and the smoke reaches Delhi. With a Happy Seeder the straw stays on as a cover that keeps the soil moist.'),
        perk: 'mulch', perkText: q('খড়ের ঢাকনা: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Straw cover: soil dries half as fast in the heat'),
      },
      water: {
        q: q('পাঞ্জাবে ভূগর্ভের পানি প্রতি বছর নামছে। গমে কম পানিতে একই ফলন পেতে কী করবেন?', 'Punjab’s groundwater falls every year. How do you get the same wheat from less water?'),
        options: [q('প্রতি সপ্তাহে জমি ভাসিয়ে দেওয়া', 'Flood the field every week'), ok('লেজার দিয়ে জমি সমান করা, আর গাছের দরকারি সময়ে মেপে সেচ', 'Laser-level the field and irrigate at the crop’s critical stages'), q('যত খুশি পাম্প চালানো, বিদ্যুৎ তো বিনা পয়সায়', 'Run the pump as much as you like — the power is free')],
        why: q('সমান জমিতে পানি সব জায়গায় সমানভাবে পৌঁছায়; পাঞ্জাব কৃষি বিশ্ববিদ্যালয়ের হিসাবে এতে প্রায় এক-চতুর্থাংশ পানি বাঁচে।', 'On a level field the water spreads evenly; Punjab Agricultural University finds it saves about a quarter of the water.'),
        perk: 'drip', perkText: q('লেজারে সমান জমি: সব জমি ৩০% ধীরে শুকাবে', 'Laser-levelled: every plot dries 30% slower'),
      },
      heat: {
        q: q('মার্চে দানা পুষ্ট হওয়ার সময় হঠাৎ তাপপ্রবাহ — ২০২২ সালে এতে গমের ফলন কমেছিল। কী করবেন?', 'A sudden heatwave in March as the grain fills — in 2022 it cut Punjab’s wheat yield. What do you do?'),
        options: [ok('বিকেলে হালকা সেচ দিয়ে মাটি ঠান্ডা রাখা', 'A light irrigation in the evening to keep the soil cool'), q('পানি বাঁচাতে সেচ বন্ধ', 'Stop irrigating to save water'), q('বাড়তি ইউরিয়া ছিটানো', 'Spread extra urea')],
        why: q('দানা পুষ্ট হওয়ার সময় হালকা সেচে গাছ ঠান্ডা থাকে, দানা চিটা হয় না — গরমে এটাই কৃষি বিশ্ববিদ্যালয়ের পরামর্শ।', 'A light irrigation while the grain fills keeps the plant cool and the grain full — the university’s advice in the heat.'),
        perk: 'cool', perkText: q('হালকা সেচ: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Light irrigation: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('গমের পাতায় হলুদ গুঁড়োর ডোরা — পীত মরিচা রোগ। কী করবেন?', 'Yellow powdery stripes on the wheat leaves — yellow rust. What do you do?'),
        options: [q('সব জমিতে সবচেয়ে কড়া ওষুধ', 'The strongest chemical on every plot'), ok('ছবি তুলে ব্লক কৃষি কর্মকর্তাকে দেখানো, শুধু আক্রান্ত জমিতে সুপারিশ করা ছত্রাকনাশক', 'Photo to the Block Agriculture Officer, then the recommended fungicide on the affected plots only'), q('বাতাসে নিজে থেকে চলে যাবে', 'The wind will blow it away')],
        why: q('মরিচা বাতাসে দ্রুত ছড়ায়। আগে চিনে শুধু আক্রান্ত জায়গায় ছত্রাকনাশক দিলে খরচ কম, ক্ষতিও কম।', 'Rust spreads fast on the wind. Identify it and treat only where it is — less cost and less loss.'),
        perk: 'neem', perkText: q('ঠিক ওষুধ: রোগ ধীরে ছড়াবে', 'Right treatment: disease spreads more slowly'),
      },
      storm: {
        q: q('পশ্চিমা ঝঞ্ঝা: বিকেলে শিলাবৃষ্টি আর বজ্রঝড়ের সতর্কতা। কী করবেন?', 'A western disturbance: hail and lightning are forecast this afternoon. What do you do?'),
        options: [ok('পাকা ফসল তুলে পাকা গুরুদ্বারায় আশ্রয়', 'Bring in the ripe crop and shelter in the brick gurdwara'), q('ট্রাক্টরে বসে মাঠে কাজ চালানো', 'Keep working the field on the tractor'), q('একা দাঁড়ানো গাছের নিচে দাঁড়ানো', 'Stand under a lone tree')],
        why: q('খোলা মাঠ আর একা দাঁড়ানো গাছেই বজ্রপাত বেশি পড়ে। শিলাবৃষ্টি পাকা গম ঝরিয়ে দেয় — আগে তুলে পাকা ঘরে আশ্রয়।', 'Lightning strikes open fields and lone trees most. Hail strips ripe wheat — bring it in first, then shelter in a brick building.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: আশ্রয়ে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach shelter'),
      },
      profit: glutQuiz(q('আলু', 'potatoes'), q('মান্ডিতে', 'the mandi')),
    },
    intro: [
      q('সত শ্রী আকাল! আমি {name}। সাংরুরের বদরুখাঁ গ্রামে ১০ একরে ধান আর গম করি।', 'Sat Sri Akal! I am {name}. I farm 10 acres of rice and wheat in Badrukhan, Sangrur.'),
      q('এখন অক্টোবর — ধান কাটা শেষ, জমিতে খড়। গম বুনতে হবে ১৫ নভেম্বরের মধ্যে।', 'It is October — the paddy is cut and the straw lies on the field. The wheat must go in by 15 November.'),
      q('পাড়ার অনেকে খড়ে আগুন দেয়; ধোঁয়া দিল্লি পর্যন্ত যায়। আর নলকূপের পানি প্রতি বছর আরও নিচে।', 'Plenty of neighbours set the straw alight; the smoke reaches Delhi. And the tubewell water is lower every year.'),
      q('FieldShift নাসার ২৫ বছরের আবহাওয়া মিলিয়ে বলে কখন বুনব, কখন পানি দেব।', 'FieldShift checks 25 years of NASA weather to tell me when to sow and when to water.'),
      q('চলুন, এবার খড় না পুড়িয়েই ভালো ফসল তুলি!', 'Come on — a good crop this time, without burning the straw!'),
    ],
    lines: {
      hello: q('সত শ্রী আকাল! চলুন, মাঠে নামি।', 'Sat Sri Akal! To the field.'),
      idle: q('ওয়াহেগুরু… রোদটা আজ চড়া।', 'Waheguru… the sun is fierce today.'),
      harvest: q('বাহ্! সোনার মতো গম!', 'Wah! Wheat like gold!'),
      heat: q('গরম আসছে — বিকেলে হালকা সেচ দিই।', 'Heat is coming — a light watering this evening.'),
      pest: q('মরিচা! দেরি করা যাবে না।', 'Rust! No time to lose.'),
      storm: q('শিল পড়বে! ফসল তুলে গুরুদ্বারায় যাই।', 'Hail is coming! Crop in, then to the gurdwara.'),
      dry: q('বালতি খালি — নলকূপে যাই।', 'The can is empty — to the tubewell.'),
      seeds: q('বীজ শেষ — দোকানে যেতে হবে।', 'Out of seed — to the shop.'),
      hurt: q('উফ্‌… ঝড়ে খোলা মাঠে থাকা ঠিক হয়নি।', 'Ouch… I should not have been in the open in that storm.'),
      win: q('বল্লে বল্লে! এই মৌসুম মনে থাকবে!', 'Balle balle! A season to remember!'),
    },
  },

  ghulam: {
    country: 'pakistan', flag: '🇵🇰', dinner: { bn: 'সিন্ধি বিরিয়ানি', en: 'Sindhi biryani' }, cur: 'Rs ',
    farmer: {
      bn: 'গোলাম নবী চান্ডিও', en: 'Ghulam Nabi Chandio', local: 'غلام نبی چانڈیو', age: 47,
      trait: q('ধৈর্যশীল, অভিজ্ঞ', 'Patient and seasoned'),
      skill: q('গরম সয়ে যান: তাপে ফসল ২৫% কম শুকায়', 'Used to the heat: crops dry 25% less in a heatwave'),
      dress: [q('আয়না-কাজের সিন্ধি টুপি', 'Sindhi cap with mirror work'), q('কাঁধে আজরাক', 'Ajrak over the shoulder'), q('সাদা সালোয়ার-কামিজ', 'White shalwar kameez'), q('দাড়ি-গোঁফ', 'Beard and moustache')],
      speed: 3.9, run: 6.6, can: 6, sellBonus: 0.05, scanner: false, alertLead: 0, idle: 'wipe', heatHardy: true,
      look: {
        skin: '#a8704a', hair: '#2a2420', beard: '#3a322c', build: 1.02,
        head: 'sindhi', headA: '#b8262f', headB: '#e2b84a',
        top: 'kameez', topA: '#eef0f2', topB: '#d9d3c5', ajrak: true,
        lower: 'shalwar', lowA: '#f1eee6', lowB: '#d9d3c5',
        feet: 'sandal', feetA: '#4a3020',
      },
    },
    place: {
      bn: 'গোঠ খারানি, দাদু, সিন্ধু', en: 'Goth Kharani, Dadu, Sindh', area: q('সিন্ধু নদের সমতল, কিরথার পাহাড়ের নিচে', 'The Indus plain below the Kirthar hills'),
      local: [q('সিন্ধুর সেচখাল', 'The Indus canals'), q('খেজুর আর বাবলা গাছ', 'Date palms and acacia'), q('মাটির ঘর আর চারপাই', 'Mud houses and charpai beds'), q('মহিষ', 'Buffalo'), q('কিরথার পাহাড়', 'The Kirthar hills')],
      hazard: q('৫০° সেলসিয়াসের গরম আর মহাবন্যা (২০২২)', '50 °C heat and the 2022 super-flood'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('খালের মুখ (মোঘা)', 'Canal outlet (mogha)'), market: q('গাধার গাড়িতে দাদু মান্ডি', 'Donkey cart to Dadu mandi'), kiosk: q('কৃষি সম্প্রসারণ অফিস', 'Agriculture extension office'), safe: q('উঁচু বাঁধের সড়ক', 'The raised embankment road') },
    world: 'sindh',
    crops: {
      wheat: { bn: 'গম', en: 'Wheat', kind: 'wheat', cost: 15, price: 55, grow: 34, thirst: 0.8, pest: 0.2 },
      sunflower: { bn: 'সূর্যমুখী', en: 'Sunflower', kind: 'sunflower', cost: 12, price: 50, grow: 32, thirst: 0.8, pest: 0.25 },
      onion: { bn: 'পেঁয়াজ', en: 'Onion', kind: 'onion', cost: 20, price: 88, grow: 40, thirst: 1.3, pest: 0.5 },
      gram: { bn: 'ছোলা', en: 'Chickpea', kind: 'chickpea', cost: 8, price: 30, grow: 22, thirst: 0.45, pest: 0.15, soil: true },
    },
    glut: 'onion',
    pestWord: q('পোকা', 'pests'),
    storm: { kind: 'flood', bn: 'বন্যা', en: 'Flood' },
    quiz: {
      water: {
        q: q('খালের পানি আসে পালা করে (ওয়ারাবন্দি)। এক পালার পানিতে বেশি জমি ভেজাতে কী করবেন?', 'Canal water comes by turns (warabandi). How do you water more land with one turn?'),
        options: [q('পুরো জমি ভাসিয়ে দেওয়া', 'Flood the whole field'), ok('বেড আর নালা করে বোনা — পানি শুধু নালায় যায়', 'Sow on raised beds with furrows — the water runs only in the furrows'), q('পালার বাইরে রাতে খাল কেটে পানি নেওয়া', 'Cut the canal at night outside your turn')],
        why: q('বেড-নালা পদ্ধতিতে পাকিস্তানের মাঠে ৩০-৪০% পানি বাঁচে, আর গোড়ায় পানি জমে না।', 'Bed-and-furrow planting saves 30–40% of the water in Pakistan’s fields, and the roots never stand in water.'),
        perk: 'drip', perkText: q('বেড-নালা: সব জমি ৩০% ধীরে শুকাবে', 'Beds and furrows: every plot dries 30% slower'),
      },
      heat: {
        q: q('দাদুতে আবার তাপপ্রবাহ, দুপুরে ৪৫° ছাড়াবে। কাজ আর সেচ কখন?', 'Another heatwave in Dadu — past 45 °C by midday. When do you work and irrigate?'),
        options: [ok('ভোরে আর সন্ধ্যায় কাজ ও সেচ, দুপুরে ছায়ায় বিশ্রাম আর পানি পান', 'Work and irrigate at dawn and dusk; rest in the shade at midday and drink water'), q('ভরদুপুরে সেচ, তাহলে গাছ ঠান্ডা থাকে', 'Irrigate at midday to cool the plants'), q('যা হওয়ার হবে, সারাদিন কাজ', 'Work all day regardless')],
        why: q('দুপুরের সেচের অনেকটাই বাষ্প হয়ে যায়, আর ভরদুপুরে মাঠে থাকলে হিট স্ট্রোকের ঝুঁকি। ভোর আর সন্ধ্যাই কাজের সময়।', 'Much midday irrigation just evaporates, and the open field at midday risks heatstroke. Dawn and dusk are the time to work.'),
        perk: 'cool', perkText: q('ভোর-সন্ধ্যার সেচ: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Dawn and dusk watering: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('পেঁয়াজের পাতায় রুপালি দাগ — থ্রিপস পোকা। কী করবেন?', 'Silvery streaks on the onion leaves — thrips. What do you do?'),
        options: [q('প্রতিদিন কড়া কীটনাশক', 'Strong pesticide every day'), ok('নীল আঠালো ফাঁদ পাতা, ছবি তুলে কর্মকর্তাকে দেখানো, শুধু আক্রান্ত জমিতে ব্যবস্থা', 'Set blue sticky traps, show a photo to the officer, treat only the affected plots'), q('কিছু না করা', 'Do nothing')],
        why: q('আঠালো ফাঁদে পোকার সংখ্যা বোঝা যায়, আর শুধু দরকার হলেই ওষুধ — খরচ কম, উপকারী পোকাও বাঁচে।', 'Sticky traps show how many pests there are, so you spray only when needed — cheaper, and the helpful insects survive.'),
        perk: 'neem', perkText: q('ফাঁদ পাতা হলো: পোকা ধীরে ছড়াবে', 'Traps set: pests spread more slowly'),
      },
      storm: {
        q: q('পিডিএমএ-র সতর্কতা: মানচর হ্রদ উপচে পড়ছে, দাদুর দিকে পানি আসছে। কী করবেন?', 'The PDMA warns that Manchar Lake is overflowing and the water is heading for Dadu. What do you do?'),
        options: [ok('পাকা ফসল, শস্য আর মহিষ নিয়ে এখনই উঁচু বাঁধের সড়কে', 'Take the ripe crop, the grain and the buffalo up to the raised road now'), q('পানি এলে তখন ভাবা যাবে', 'Think about it when the water comes'), q('ঘরের ছাদে শস্য তুলে বাড়িতেই থাকা', 'Put the grain on the roof and stay at home')],
        why: q('২০২২ সালে দাদুর গ্রাম মাসের পর মাস পানির নিচে ছিল। সতর্কতা পেলেই উঁচু জায়গায় গেলে মানুষ, পশু আর শস্য বাঁচে।', 'In 2022 Dadu’s villages stayed under water for months. Moving to high ground as soon as the warning comes saves people, animals and grain.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: উঁচুতে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach high ground'),
      },
      profit: glutQuiz(q('পেঁয়াজ', 'onions'), q('মান্ডিতে', 'the mandi')),
    },
    intro: [
      q('আসসালামু আলাইকুম! আমি {name}। দাদুর গোঠ খারানিতে ৮ একরে ধান আর গম করি।', 'Assalamu alaikum! I am {name}. I farm 8 acres of rice and wheat at Goth Kharani, Dadu.'),
      q('পানি আসে সিন্ধু নদের খাল দিয়ে, পালা করে। পশ্চিমে কিরথার পাহাড়।', 'The water comes down the Indus canals, by turns. The Kirthar hills stand to the west.'),
      q('২০২২-এর আগস্টে আকাশ ভেঙে বৃষ্টি নেমেছিল; আমাদের গ্রাম মাসের পর মাস পানির নিচে ছিল।', 'In August 2022 the sky broke open; our village was under water for months.'),
      q('আর মে-জুনে এখানে গরম ৫০ ডিগ্রি ছাড়ায়। FieldShift গরম আর বন্যার খবর আগেই দেয়।', 'And in May and June the heat here passes 50 degrees. FieldShift warns me of the heat and the floods ahead.'),
      q('এবার ধান তোলা হয়েছে, গম বোনার পালা। ইনশাআল্লাহ, ভালো মৌসুম হবে!', 'The rice is in; now it is time for wheat. God willing, a good season!'),
    ],
    lines: {
      hello: q('আসসালামু আলাইকুম! চলুন, মাঠে।', 'Assalamu alaikum! To the field.'),
      idle: q('আজকের গরমটা… আল্লাহ রহম করো।', 'This heat… God have mercy.'),
      harvest: q('মাশাআল্লাহ, ফসল ভালো!', 'Mashallah, a fine crop!'),
      heat: q('গরম আসছে — ভোরেই পানি দিয়ে রাখি।', 'Heat is coming — water it at dawn.'),
      pest: q('পোকা! দেরি করা যাবে না।', 'Pests! No time to lose.'),
      storm: q('পানি আসছে! ফসল তুলে বাঁধের ওপর!', 'The water is coming! Crop in, then up on the embankment!'),
      dry: q('বালতি খালি — খালের মুখে যাই।', 'The can is empty — to the canal outlet.'),
      seeds: q('বীজ লাগবে।', 'I need seed.'),
      hurt: q('পানিতে আটকে গেলাম… আগে ওঠা উচিত ছিল।', 'Caught in the water… I should have gone up sooner.'),
      win: q('আলহামদুলিল্লাহ, এবার হিসাব মিলেছে!', 'Alhamdulillah, the sums add up this time!'),
    },
  },

  rampyari: {
    country: 'nepal', flag: '🇳🇵', dinner: { bn: 'ডাল-ভাত-তরকারি', en: 'dal bhat tarkari' }, cur: 'रु ',
    farmer: {
      bn: 'রামপ্যারী চৌধুরী', en: 'Rampyari Chaudhary', local: 'रामप्यारी चौधरी', age: 41,
      trait: q('চটপটে, হিসাবি', 'Quick and shrewd'),
      skill: q('দ্রুত হাঁটেন, হাটে ১৫% বেশি দাম পান', 'Walks fast, sells for 15% more'),
      dress: [q('থারু ঘাঘরা, রঙিন পাড়', 'Tharu skirt with bright bands'), q('হলুদ চোলি', 'Yellow choli blouse'), q('মাথায় লাল ওড়না', 'Red orhni over the head'), q('রুপার গয়না', 'Silver jewellery')],
      speed: 4.4, run: 7.2, can: 5, sellBonus: 0.15, scanner: false, alertLead: 0, idle: 'adjust',
      look: {
        skin: '#c68a5e', hair: '#1d1714', build: 0.94,
        head: 'orhni', headA: '#c8203c', headB: '#f2c94c',
        top: 'choli', topA: '#e8b33a', topB: '#c9962a',
        lower: 'ghagra', lowA: '#1f2230', lowB: '#d6402e', bands: ['#f2c94c', '#2e8b57', '#d6402e'],
        feet: 'sandal', feetA: '#5c3a26', silver: '#d8dde2', bangle: '#d8dde2',
      },
    },
    place: {
      bn: 'দুর্গাউলি, কৈলালী', en: 'Durgauli, Kailali', area: q('সুদূরপশ্চিম তরাই', 'The far-west Terai'),
      local: [q('শালবন', 'Sal forest'), q('রং করা থারু ঘর', 'Painted Tharu longhouse'), q('ফসল পাহারার মাচান', 'The crop-watch machan'), q('মাটির শস্যাধার (দেহরি)', 'Clay grain bins (dehari)'), q('চুরিয়া পাহাড়', 'The Churia hills')],
      hazard: q('ফসল কাটার সময় অসময়ের বৃষ্টি, নদীর বন্যা', 'Out-of-season rain at harvest, river floods'),
    },
    names: { shed: q('কৃষি সমবায়ের দোকান', 'Farmers’ cooperative shop'), water: q('সমিতির শ্যালো টিউবওয়েল', 'Group shallow tubewell'), market: q('সবজি কালেকশন সেন্টার', 'Vegetable collection centre'), kiosk: q('কৃষি জ্ঞান কেন্দ্র', 'Agriculture Knowledge Centre'), safe: q('ওয়ার্ড অফিসের পাকা ঘর', 'The ward office building') },
    world: 'terai',
    crops: {
      wheat: { bn: 'গম', en: 'Wheat', kind: 'wheat', cost: 15, price: 55, grow: 34, thirst: 0.75, pest: 0.2 },
      lentil: { bn: 'মসুর ডাল', en: 'Lentil', kind: 'lentil', cost: 8, price: 30, grow: 22, thirst: 0.5, pest: 0.15, soil: true },
      toria: { bn: 'তোরিয়া সরিষা', en: 'Toria mustard', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 1, pest: 0.35 },
      tomato: { bn: 'টমেটো', en: 'Tomato', kind: 'tomato', cost: 20, price: 85, grow: 42, thirst: 1.45, pest: 0.6 },
    },
    glut: 'tomato',
    pestWord: q('পোকা', 'pests'),
    storm: { kind: 'rain', bn: 'অসময়ের ভারী বৃষ্টি', en: 'Out-of-season downpour' },
    quiz: {
      water: {
        q: q('সমিতির একটাই শ্যালো টিউবওয়েল, সবাই একসঙ্গে পানি চায়। কী করবেন?', 'The group has one shallow tubewell and everyone wants water at once. What do you do?'),
        options: [q('যে আগে আসে সে যত খুশি নেয়', 'First come takes all they want'), ok('সমিতিতে পালা ঠিক করা, আর গমে দরকারি সময়ে (মুকুট-শিকড়ের সময়) সেচ', 'Agree turns in the group, and irrigate the wheat at its critical stage (crown-root time)'), q('রোজ সবাই একটু একটু', 'Everyone a little every day')],
        why: q('বোনার প্রায় ২১ দিন পর মুকুট-শিকড়ের সময় এক সেচেই গমের ফলন সবচেয়ে বাড়ে। পালা করলে সবার জমি সময়মতো পানি পায়।', 'One irrigation at crown-root time, about 21 days after sowing, lifts wheat yield most. Taking turns gets everyone their water on time.'),
        perk: 'drip', perkText: q('পালা ঠিক হলো: সব জমি ৩০% ধীরে শুকাবে', 'Turns agreed: every plot dries 30% slower'),
      },
      heat: {
        q: q('ফাল্গুনেই গরম পড়ছে, মাটি ফাটছে। কী করবেন?', 'It is hot already in early spring and the soil is cracking. What do you do?'),
        options: [ok('ধানের খড় দিয়ে মাটি ঢেকে রাখা (মালচিং)', 'Cover the soil with rice straw (mulch)'), q('ভরদুপুরে জমি ভাসানো', 'Flood the field at midday'), q('জমি খালি ফেলে রাখা', 'Leave the soil bare')],
        why: q('খড়ের ঢাকনায় মাটির পানি কম উড়ে যায়, মাটি ঠান্ডা থাকে — আর খড়ও জমিতেই কাজে লাগে।', 'A straw cover keeps the water in and the soil cool — and puts the straw to use on the field.'),
        perk: 'mulch', perkText: q('মালচিং চালু: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Mulch on: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('টমেটোতে ফল ছিদ্রকারী পোকা। কী করবেন?', 'Fruit borers in the tomatoes. What do you do?'),
        options: [q('প্রতিদিন কড়া কীটনাশক', 'Strong pesticide every day'), ok('ফেরোমন ফাঁদ পাতা আর ছিদ্র করা ফল তুলে ফেলা', 'Set pheromone traps and pick off the bored fruit'), q('কিছু না করা', 'Do nothing')],
        why: q('ফেরোমন ফাঁদে মথ ধরা পড়ে, বংশ বাড়ে না — বিষ কম লাগে, বাজারে টমেটোও নিরাপদ।', 'Pheromone traps catch the moths before they breed — less poison, and safer tomatoes at the market.'),
        perk: 'neem', perkText: q('ফাঁদ পাতা হলো: পোকা ধীরে ছড়াবে', 'Traps set: pests spread more slowly'),
      },
      storm: {
        q: q('আবহাওয়া দপ্তর বলছে তিন দিন ভারী বৃষ্টি। ২০২১-এ এমন খবরকে কেউ “বিভ্রান্তিকর” বলেছিল। কী করবেন?', 'The weather office forecasts three days of heavy rain. In 2021 a report like this was called “misleading”. What do you do?'),
        options: [ok('পূর্বাভাস মেনে পাকা ফসল আগেই তুলে ঢাকা জায়গায় রাখা, নিজেও আশ্রয়ে', 'Trust the forecast: bring the ripe crop in under cover first, and shelter yourself'), q('ফসল কেটে মাঠেই বিছিয়ে রাখা', 'Cut the crop and leave it spread in the field'), q('বৃষ্টি থামা পর্যন্ত মাঠে থাকা', 'Stay in the field until it stops')],
        why: q('২০২১ সালের অক্টোবরে মাঠে রেখে দেওয়া কাটা ধান তিন দিনের বৃষ্টিতে ভিজে গজিয়ে গিয়েছিল; সুদূরপশ্চিমে ধানের উৎপাদন প্রায় এক-তৃতীয়াংশ কমে।', 'In October 2021 cut paddy left in the fields soaked and sprouted in three days of rain; rice output in the far west fell by almost a third.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: আশ্রয়ে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach shelter'),
      },
      profit: glutQuiz(q('টমেটো', 'tomatoes'), q('কালেকশন সেন্টারে', 'the collection centre')),
    },
    intro: [
      q('নমস্তে! আমি {name}, কৈলালীর দুর্গাউলি গ্রামের থারু কৃষক।', 'Namaste! I am {name}, a Tharu farmer from Durgauli in Kailali.'),
      q('দেড় বিঘা জমি, পাশে শালবন। রাতে হাতি আসে, তাই মাচানে বসে পাহারা দিতে হয়।', 'One and a half bigha, with the sal forest next door. Elephants come at night, so we keep watch from the machan.'),
      q('২০২১-এর অক্টোবরে কাটা ধান মাঠেই ছিল — তিন দিনের বৃষ্টিতে সব ভিজে গজিয়ে গেল।', 'In October 2021 our cut paddy was still in the field — three days of rain soaked and sprouted it all.'),
      q('এখন ফোনে FieldShift রাখি, আকাশের খবর আগে দেখি, তারপর কাটি।', 'Now I keep FieldShift on my phone and look at the sky ahead before I cut.'),
      q('এবার গম, মসুর আর টমেটো — চলুন, হিসাব মিলিয়ে চাষ করি!', 'This time wheat, lentil and tomato — let us farm with the sums right!'),
    ],
    lines: {
      hello: q('নমস্তে! আজ অনেক কাজ, চলো!', 'Namaste! Lots to do today, come on!'),
      idle: q('♪ সখিয়া নাচের গান… ♪', '♪ humming a Sakhiya dance song… ♪'),
      harvest: q('বাহ্! কালেকশন সেন্টারে ভালো দাম পাব।', 'Lovely! This will fetch a good price at the centre.'),
      heat: q('গরম আসছে — খড় বিছিয়ে দিই।', 'Heat is coming — spread the straw.'),
      pest: q('এই পোকাগুলো সব খেয়ে ফেলবে!', 'These pests will eat everything!'),
      storm: q('বৃষ্টি আসছে! ফসল তুলে ওয়ার্ড অফিসে!', 'Rain is coming! Crop in, then to the ward office!'),
      dry: q('পানি শেষ, টিউবওয়েলে যাই।', 'Out of water, to the tubewell.'),
      seeds: q('বীজ কিনতে হবে।', 'I need to buy seed.'),
      hurt: q('ভিজে গেলাম… আগে যাওয়া উচিত ছিল।', 'Soaked… I should have gone sooner.'),
      win: q('হিসাব মিলেছে, লাভও হয়েছে!', 'The sums add up — and a profit too!'),
    },
  },

  kinley: {
    country: 'bhutan', flag: '🇧🇹', dinner: { bn: 'লাল ভাত আর এমা দাতসি', en: 'red rice and ema datshi' }, cur: 'Nu ',
    farmer: {
      bn: 'কিনলে ওয়াংমো', en: 'Kinley Wangmo', local: 'ཀུན་ལེགས་དབང་མོ།', age: 34,
      trait: q('শান্ত, দূরদর্শী', 'Calm and far-sighted'),
      skill: q('ফোনে সব জমির পানি দেখেন, সতর্কতা আগে পান', 'Sees every plot’s moisture, gets warnings early'),
      dress: [q('হাতে বোনা কিরা', 'Hand-woven kira'), q('রেশমি তেগো জ্যাকেট', 'Silk tego jacket'), q('ওনজুর ভাঁজ করা হাতা', 'Folded wonju cuffs'), q('রুপার কোমা ব্রোচ', 'Silver koma brooches')],
      speed: 4.1, run: 7, can: 5, sellBonus: 0, scanner: true, alertLead: 6, idle: 'phone',
      look: {
        skin: '#d8a47a', hair: '#1d1714', build: 0.95,
        head: 'short', headA: '#1d1714', headB: '#1d1714',
        top: 'tego', topA: '#b5432e', topB: '#f4e7c8', cuff: '#f4e7c8', silver: '#d8dde2',
        lower: 'kira', lowA: '#b8323b', lowB: '#e2b84a', bands: ['#1e5a3c', '#e2b84a', '#20304e', '#f1ece0'],
        feet: 'shoe', feetA: '#2a2420',
      },
    },
    place: {
      bn: 'লোবেসা, পুনাখা', en: 'Lobesa, Punakha', area: q('পো ছু আর মো ছু নদীর উপত্যকা', 'The valley of the Pho Chhu and Mo Chhu'),
      local: [q('ধাপে ধাপে ধানক্ষেত', 'Terraced paddy'), q('পুনাখা জং', 'Punakha Dzong'), q('চিমি লাখাং মন্দির', 'Chimi Lhakhang temple'), q('চোর্তেন আর প্রার্থনা-পতাকা', 'Chortens and prayer flags'), q('ছাদে শুকানো লাল মরিচ', 'Red chillies drying on the roof')],
      hazard: q('হিমবাহ-হ্রদের বন্যা আর বুনো শূকর', 'Glacial-lake floods and wild boar'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('পাহাড়ি ঝরনার নালা', 'Stream-fed channel'), market: q('আলুর নিলাম কেন্দ্র (এফসিবি)', 'Potato auction yard (FCB)'), kiosk: q('গেওগ আরএনআর কেন্দ্র', 'Gewog RNR centre'), safe: q('চিমি লাখাংয়ের টিলা', 'Chimi Lhakhang hill') },
    world: 'punakha',
    crops: {
      redrice: { bn: 'লাল ধান', en: 'Red rice', kind: 'redrice', cost: 14, price: 62, grow: 38, thirst: 1.4, pest: 0.35 },
      chili: { bn: 'মরিচ (এমা)', en: 'Chilli (ema)', kind: 'chili', cost: 14, price: 60, grow: 32, thirst: 1.1, pest: 0.4 },
      potato: { bn: 'আলু', en: 'Potato', kind: 'potato', cost: 20, price: 85, grow: 40, thirst: 1.2, pest: 0.5 },
      pea: { bn: 'মটরশুঁটি', en: 'Peas', kind: 'pea', cost: 8, price: 32, grow: 22, thirst: 0.5, pest: 0.15, soil: true },
    },
    glut: 'potato',
    pestWord: q('বুনো শূকর', 'wild boar'),
    storm: { kind: 'flood', bn: 'হিমবাহ-হ্রদের বন্যা', en: 'Glacial-lake flood' },
    quiz: {
      water: {
        q: q('পাহাড়ি নালার পানি কয়েক গ্রাম ভাগ করে নেয়, শীতে পানি কমে আসে। কী করবেন?', 'Several villages share the stream channel, and the water runs low in winter. What do you do?'),
        options: [q('উজানে নিজের জমির দিকে নালা ঘুরিয়ে দেওয়া', 'Turn the channel towards your own field upstream'), ok('পানি-ব্যবহারকারী দলে পালা ঠিক করা আর নালা মেরামত', 'Agree turns in the water users’ group and repair the channel'), q('পানি না এলে চাষ বাদ', 'Give up farming if the water does not come')],
        why: q('ভাঙা নালায় অর্ধেক পানি পথেই হারায়। মেরামত আর পালা — দুটোতেই সবাই বেশি পানি পায়।', 'A broken channel loses half its water on the way. Repairs and turns both get everyone more water.'),
        perk: 'drip', perkText: q('নালা মেরামত: সব জমি ৩০% ধীরে শুকাবে', 'Channel repaired: every plot dries 30% slower'),
      },
      heat: {
        q: q('এ বছর শীতে বৃষ্টি নেই, মাটি শুকিয়ে ফাটছে। কী করবেন?', 'No winter rain this year and the soil is cracking. What do you do?'),
        options: [ok('খড় আর পাতা দিয়ে মাটি ঢেকে রাখা (মালচিং)', 'Cover the soil with straw and leaves (mulch)'), q('জমি খালি ফেলে রাখা', 'Leave the soil bare'), q('দুপুরে পানি দেওয়া', 'Water at midday')],
        why: q('ঢাকা মাটিতে পানি কম উড়ে যায়, আর পাতা পচে মাটিও উর্বর হয়।', 'Covered soil loses less water, and the leaves rot down to feed it.'),
        perk: 'mulch', perkText: q('মালচিং চালু: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Mulch on: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('রাতে বুনো শূকর এসে ধানক্ষেত তছনছ করছে। কী করবেন?', 'Wild boar come at night and tear up the paddy. What do you do?'),
        options: [q('বিষ দিয়ে মেরে ফেলা', 'Poison them'), ok('গেওগের সৌর বিদ্যুৎ-বেড়া দেওয়া, আর পাড়ার সবাই মিলে পাহারা', 'Put up the gewog’s solar electric fence and guard it together with the neighbours'), q('জমি পতিত রাখা', 'Leave the land fallow')],
        why: q('বুনো প্রাণীর ফসল নষ্টই ভুটানে জমি পতিত থাকার বড় কারণ। বিদ্যুৎ-বেড়া প্রাণীকে না মেরে দূরে রাখে — সরকার গ্রামে গ্রামে দিচ্ছে।', 'Wildlife raids are a leading reason Bhutanese land lies fallow. An electric fence keeps animals out without killing them — the government is putting them up village by village.'),
        perk: 'neem', perkText: q('বেড়া দেওয়া হলো: আক্রমণ ধীরে ছড়াবে', 'Fence up: raids spread more slowly'),
      },
      storm: {
        q: q('পো ছু-র তীরের সাইরেন বাজছে — লুনানার হিমবাহ-হ্রদ থেকে বন্যা নামছে। কী করবেন?', 'The siren on the Pho Chhu is sounding — a flood is coming down from the glacial lakes of Lunana. What do you do?'),
        options: [ok('সাইরেন শুনেই পাকা ফসল নিয়ে চিমি লাখাংয়ের টিলায়', 'Take the ripe crop and go up Chimi Lhakhang hill as soon as the siren sounds'), q('নদীর পাড়ে গিয়ে পানি দেখা', 'Go to the riverbank to look at the water'), q('ঘরে বসে অপেক্ষা', 'Wait at home')],
        why: q('১৯৯৪ সালের ৭ অক্টোবর লুগে হ্রদ ফেটে পো ছু দিয়ে বন্যা নেমেছিল। এখন উপত্যকা জুড়ে আগাম সতর্কতার সাইরেন — শুনলেই উঁচুতে।', 'On 7 October 1994 Lugge Tsho burst and a flood ran down the Pho Chhu. Now early-warning sirens line the valley — when you hear one, go high.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: উঁচুতে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach high ground'),
      },
      profit: glutQuiz(q('আলু', 'potatoes'), q('নিলাম কেন্দ্রে', 'the auction yard')),
    },
    intro: [
      q('কুজুজাংপো লা! আমি {name}। পুনাখার লোবেসায় দেড় একর ধাপ-জমিতে লাল ধান করি।', 'Kuzuzangpo la! I am {name}. I grow red rice on one and a half acres of terraces at Lobesa, Punakha.'),
      q('পশ্চিম ভুটানের রীতিতে জমি এসেছে মায়ের কাছ থেকে। নিচে দুই নদীর মিলনে পুনাখা জং।', 'By western Bhutan’s custom the land came to me from my mother. Below, where two rivers meet, stands Punakha Dzong.'),
      q('রাতে বুনো শূকর আসে ধান খেতে, তাই পাহারা দিতে হয়।', 'Wild boar come for the paddy at night, so it has to be guarded.'),
      q('আর উপত্যকার মাথায় লুনানার হিমবাহ-হ্রদ। ১৯৯৪-এ একটা হ্রদ ফেটে বন্যা নেমেছিল।', 'And at the head of the valley lie the glacial lakes of Lunana. In 1994 one burst and a flood came down.'),
      q('FieldShift আমার ফোনে নদী আর আকাশের খবর আগেই পাঠায়। চলুন, শুরু করি!', 'FieldShift sends the river and sky news to my phone ahead of time. Let us begin!'),
    ],
    lines: {
      hello: q('কুজুজাংপো লা! চলুন, মাঠে।', 'Kuzuzangpo la! To the field.'),
      idle: q('দেখি তো আজ লুনানায় কত বরফ গলছে…', 'Let me check how much snow is melting in Lunana today…'),
      harvest: q('কাদ্রিনচে লা! ধান দারুণ হয়েছে।', 'Kadrinche la! A wonderful crop.'),
      heat: q('মাটি শুকাচ্ছে — খড় বিছিয়ে দিই।', 'The soil is drying — spread the straw.'),
      pest: q('শূকর ঢুকেছে! তাড়াতে হবে।', 'The boar are in! Chase them out.'),
      storm: q('সাইরেন! ফসল নিয়ে টিলায় উঠি!', 'The siren! Crop in, and up the hill!'),
      dry: q('বালতি খালি, নালায় যাই।', 'Can is empty, to the channel.'),
      seeds: q('বীজ লাগবে।', 'Need seed.'),
      hurt: q('পানিতে আটকে গেলাম… আগে ওঠা উচিত ছিল।', 'Caught by the water… I should have gone up sooner.'),
      win: q('তাশি দেলেক! চমৎকার মৌসুম।', 'Tashi delek! A fine season.'),
    },
  },

  kyawwin: {
    country: 'myanmar', flag: '🇲🇲', dinner: { bn: 'মোহিঙ্গা', en: 'mohinga' }, cur: 'K ',
    farmer: {
      bn: 'উ চ উইন', en: 'U Kyaw Win', local: 'ဦးကျော်ဝင်း', age: 61,
      trait: q('ধীর-স্থির, মাটি চেনেন', 'Unhurried; knows his soil'),
      skill: q('বড় মাটির কলসি: বালতিতে একবারে ৭ বার পানি, মাটি উর্বর রাখেন', 'Big clay pot: 7 waterings per fill, and keeps the soil rich'),
      dress: [q('চেক লুঙ্গি (পাসো)', 'Checked longyi (paso)'), q('সাদা এইঞ্জি শার্ট', 'White eingyi shirt'), q('মাথায় গাউং বাউং', 'Gaung baung head-wrap'), q('রাবারের স্যান্ডেল', 'Rubber flip-flops')],
      speed: 3.6, run: 6, can: 7, sellBonus: 0.05, scanner: false, alertLead: 0, idle: 'wipe', soilKeeper: true,
      look: {
        skin: '#c68a5e', hair: '#1d1714', build: 1,
        head: 'gaungbaung', headA: '#e7a3b6', headB: '#f6d3dc',
        top: 'eingyi', topA: '#f4f1ea', topB: '#d8d2c4',
        lower: 'longyi', lowA: '#3b4f7a', lowB: '#8a3a3a',
        feet: 'sandal', feetA: '#2f2a26',
      },
    },
    place: {
      bn: 'সিংগু, ন্যাং-উ', en: 'Singu, Nyaung-U', area: q('মিয়ানমারের মধ্য শুষ্ক অঞ্চল', 'Myanmar’s Central Dry Zone'),
      local: [q('তাল গাছ (টডি পাম)', 'Toddy palms'), q('গরুর গাড়ি', 'The ox cart'), q('বাগানের প্যাগোডা', 'The pagodas of Bagan'), q('পথের ধারে পানির কলসি', 'Roadside water pots'), q('কাঠের বৌদ্ধ বিহার', 'The wooden monastery')],
      hazard: q('৪৮° সেলসিয়াসের গরম, খরা, আর ইয়াগির বন্যা (২০২৪)', '48 °C heat, drought, and the Yagi floods (2024)'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('গ্রামের পুকুর (কান)', 'Village pond (kan)'), market: q('গরুর গাড়িতে চক বাজার', 'Ox cart to Chauk market'), kiosk: q('টাউনশিপ কৃষি অফিস', 'Township agriculture office'), safe: q('উঁচু ঢিবির বিহার', 'The monastery on the mound') },
    world: 'dryzone',
    crops: {
      chickpea: { bn: 'ছোলা', en: 'Chickpea', kind: 'chickpea', cost: 8, price: 34, grow: 24, thirst: 0.45, pest: 0.25, soil: true },
      sesame: { bn: 'তিল', en: 'Sesame', kind: 'sesame', cost: 14, price: 72, grow: 36, thirst: 0.7, pest: 0.3 },
      groundnut: { bn: 'চীনাবাদাম', en: 'Groundnut', kind: 'groundnut', cost: 16, price: 66, grow: 34, thirst: 0.9, pest: 0.35 },
      pigeonpea: { bn: 'অড়হর', en: 'Pigeon pea', kind: 'pigeonpea', cost: 10, price: 44, grow: 30, thirst: 0.5, pest: 0.3, soil: true },
    },
    glut: 'sesame',
    pestWord: q('পোকা', 'pests'),
    storm: { kind: 'flood', bn: 'নদীর বন্যা', en: 'River flood' },
    quiz: {
      water: {
        q: q('সেচ নেই, শুধু বৃষ্টি। বর্ষার পর মাটির ভেজা ধরে রেখে ছোলা ফলাতে কী করবেন?', 'No irrigation, only rain. How do you hold the soil’s moisture after the monsoon to grow chickpea?'),
        options: [q('কয়েক সপ্তাহ অপেক্ষা করে তারপর বোনা', 'Wait a few weeks, then sow'), ok('বৃষ্টি থামতেই বোনা, আর হালকা চাষে ওপরের মাটি ঝুরঝুরে রাখা', 'Sow as soon as the rain stops, and keep the topsoil loose with a light tillage'), q('বারবার গভীর চাষ', 'Plough deep again and again')],
        why: q('বর্ষা শেষের ভেজা মাটিই ছোলার পানি। দেরি করলে ভেজা উড়ে যায়; ওপরের ঝুরঝুরে মাটি নিচের ভেজা আটকে রাখে।', 'The moisture left by the monsoon is the chickpea’s only water. Wait, and it evaporates; a loose top layer seals the moisture below.'),
        perk: 'drip', perkText: q('ভেজা ধরে রাখা: সব জমি ৩০% ধীরে শুকাবে', 'Moisture held: every plot dries 30% slower'),
      },
      heat: {
        q: q('পাঁচ কিলোমিটার দূরে চকে ৪৮.২° মাপা হয়েছিল। এবারও তাপপ্রবাহ আসছে। কী করবেন?', 'Chauk, five kilometres away, once measured 48.2 °C. Another heatwave is coming. What do you do?'),
        options: [ok('ফসলের অবশিষ্ট দিয়ে মাটি ঢাকা, আর আগাম পাকা জাত বোনা', 'Cover the soil with crop residue and sow an early-maturing variety'), q('দুপুরে মাঠে কাজ', 'Work the field at midday'), q('বেশি করে সার', 'Add more fertiliser')],
        why: q('ঢাকা মাটি ঠান্ডা থাকে, ভেজা থাকে। আগাম জাত সবচেয়ে বড় গরমের আগেই পেকে যায়।', 'Covered soil stays cool and moist. An early variety ripens before the worst of the heat.'),
        perk: 'mulch', perkText: q('মালচিং চালু: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Mulch on: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('ছোলার ফলে ছিদ্র — ফল ছিদ্রকারী পোকা। কী করবেন?', 'Holes in the chickpea pods — pod borers. What do you do?'),
        options: [q('প্রতিদিন কড়া কীটনাশক', 'Strong pesticide every day'), ok('ফেরোমন ফাঁদ আর পাখি বসার খুঁটি; গুনে দেখে দরকার হলে তবেই ওষুধ', 'Pheromone traps and perches for birds; spray only if a count shows you must'), q('কিছু না করা', 'Do nothing')],
        why: q('খুঁটিতে বসা পাখি পোকার শুঁয়োপোকা খায়, ফাঁদে মথ ধরা পড়ে — বিষ কম, খরচও কম।', 'Birds on the perches eat the caterpillars and the traps catch the moths — less poison, less cost.'),
        perk: 'neem', perkText: q('ফাঁদ আর খুঁটি: পোকা ধীরে ছড়াবে', 'Traps and perches: pests spread more slowly'),
      },
      storm: {
        q: q('টাইফুনের শেষ অংশ আসছে, আয়রাবতী আর খালে পানি বাড়ছে — ২০২৪-এর ইয়াগির মতো। কী করবেন?', 'The tail of a typhoon is coming and the Ayeyarwady and the streams are rising — as with Yagi in 2024. What do you do?'),
        options: [ok('পাকা ফসল, বীজ আর গরু নিয়ে উঁচু ঢিবির বিহারে', 'Take the ripe crop, the seed and the oxen to the monastery on the mound'), q('নিচু জমিতে থেকে ফসল পাহারা', 'Stay in the low field to guard the crop'), q('গাড়ি নিয়ে নদী পার হওয়া', 'Cross the river with the cart')],
        why: q('২০২৪-এর ইয়াগির বন্যায় মধ্য মিয়ানমারে ৩০০-র বেশি মানুষ মারা যান, শুধু মান্দালয় অঞ্চলেই প্রায় ৪০ হাজার একর ফসল ডোবে। উঁচু জায়গার বিহারই গ্রামের আশ্রয়।', 'The Yagi floods of 2024 killed more than 300 people in central Myanmar and drowned about 40,000 acres of crops in Mandalay Region alone. The monastery on high ground is the village’s refuge.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: উঁচুতে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach high ground'),
      },
      profit: glutQuiz(q('তিল', 'sesame'), q('বাজারে', 'the market')),
    },
    intro: [
      q('মিংগালাবা! আমি {name}। মধ্য শুষ্ক অঞ্চলের সিংগুতে ৬ একরে তিল, চীনাবাদাম, অড়হর আর ছোলা করি।', 'Mingalaba! I am {name}. I farm 6 acres of sesame, groundnut, pigeon pea and chickpea at Singu in the Central Dry Zone.'),
      q('সেচ নেই, সবই বৃষ্টির ভরসা। বর্ষা শেষে মাটির ভেজাতেই ছোলা বুনি।', 'There is no irrigation; it all rests on the rain. When the monsoon ends I sow chickpea into the soil’s moisture.'),
      q('পাঁচ কিলোমিটার দক্ষিণে চকে ২০২৪-এর এপ্রিলে ৪৮.২ ডিগ্রি — মিয়ানমারে এপ্রিলের সর্বোচ্চ।', 'Five kilometres south at Chauk it reached 48.2 degrees in April 2024 — Myanmar’s hottest April day on record.'),
      q('আর সেই বছরই ইয়াগির বন্যা। FieldShift এখন গরম আর পানির খবর আগেই দেয়।', 'And that same year came the Yagi floods. FieldShift now warns me of heat and water ahead.'),
      q('চলুন, মাটির ভেজা থাকতে থাকতেই বুনে ফেলি!', 'Come — let us sow while the soil is still moist!'),
    ],
    lines: {
      hello: q('মিংগালাবা! চলুন, মাঠে।', 'Mingalaba! To the field.'),
      idle: q('উফ্‌, রোদ… কলসির পানিটা খাই।', 'Phew, the sun… a drink from the water pot.'),
      harvest: q('বাহ্! তিল-বাদাম ভালো হয়েছে।', 'Good! A fine crop of sesame and nuts.'),
      heat: q('গরম আসছে — মাটি ঢেকে দিই।', 'Heat is coming — cover the soil.'),
      pest: q('পোকা! দেরি করা যাবে না।', 'Pests! No time to lose.'),
      storm: q('পানি বাড়ছে! ফসল নিয়ে বিহারে!', 'The water is rising! Crop in, to the monastery!'),
      dry: q('বালতি খালি — পুকুরে যাই।', 'The can is empty — to the pond.'),
      seeds: q('বীজ শেষ — দোকানে যাই।', 'Out of seed — to the shop.'),
      hurt: q('পানিতে আটকে গেলাম… আগে যাওয়া উচিত ছিল।', 'Caught by the water… I should have gone sooner.'),
      win: q('ভালো মৌসুম! এবার বিহারে দান দেব।', 'A good season! Time for an offering at the monastery.'),
    },
  },
};

// Bangladesh's seven division farmers first, then the five neighbours.
export const REGIONS = { ...REGIONS_BD, ...ABROAD };
export const FARMER_IDS = Object.keys(REGIONS);
export const BD_IDS = Object.keys(REGIONS_BD), ABROAD_IDS = Object.keys(ABROAD);

// The season, in order. A step with `quiz` asks that region's question first (if it has one).
export const QUESTS = [
  { id: 'buy', need: { bought: 3 }, bn: 'দোকান থেকে ৩টি বীজ কিনুন', en: 'Buy 3 seeds at the shop', go: 'shed' },
  { id: 'plant', quiz: 'plant', need: { planted: 3 }, bn: '৩টি জমিতে বীজ বুনুন', en: 'Sow 3 plots', go: 'field' },
  { id: 'water', quiz: 'water', need: { watered: 3 }, bn: '৩টি চারায় পানি দিন', en: 'Water 3 seedlings', go: 'field' },
  { id: 'harvest', need: { harvested: 3 }, bn: '৩টি পাকা ফসল তুলুন', en: 'Harvest 3 ripe crops', go: 'field' },
  { id: 'sell', need: { sold: 1 }, bn: 'হাটে ফসল বিক্রি করুন', en: 'Sell your harvest at the market', go: 'market' },
  { id: 'heat', quiz: 'heat', event: 'heat', bn: 'তাপপ্রবাহ পার করুন — চারা বাঁচিয়ে রাখুন', en: 'Get through the heatwave — keep the seedlings alive', go: 'field' },
  { id: 'pests', quiz: 'pests', event: 'pests', bn: 'আক্রান্ত সব জমি সারিয়ে তুলুন', en: 'Deal with every affected plot', go: 'field' },
  { id: 'storm', quiz: 'storm', event: 'storm', bn: 'পাকা ফসল তুলে নিরাপদ জায়গায় পৌঁছান', en: 'Bring in the ripe crop and reach safety', go: 'safe' },
  { id: 'profit', quiz: 'profit', need: { earned: 1000 }, event: 'glut', bn: 'মৌসুমে মোট {cur}১,০০০ বিক্রি করুন', en: 'Sell {cur}1,000 in total this season', go: 'market' },
];

// Satellite crop-health view (NDVI-style): what each colour means.
export const NDVI_LEGEND = [
  { c: '#2e9d3a', bn: 'সুস্থ', en: 'Healthy' },
  { c: '#c9c23a', bn: 'চাপে আছে', en: 'Stressed' },
  { c: '#d6452f', bn: 'বিপদে', en: 'In danger' },
];
