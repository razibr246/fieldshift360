// The seven Bangladesh farmers of "মাঠের মানুষ", one from each division: the same composite characters as the app's
// sample farms and the story levels (src/data/demo.js, src/data/stories.js), each farming their own upazila — Razib
// Miah in Dhamrai, Rahim Uddin in Godagari, Md. Didarul Alam in Sitakunda, Prahlad Chandra Roy in Dacope, Abdul
// Kader Howlader in Bakerganj, Md. Mofizul Islam in Gangachara and Rahima Begum in Gowainghat. The dangers and the
// answers to them are the ones their stories tell, with the advice BRRI, BARI and the DAE give.
const q = (bn, en) => ({ bn, en });
const ok = (bn, en) => ({ bn, en, ok: true });
const glutQuiz = (crop, where) => ({
  q: q(`সবাই একসঙ্গে ${crop.bn} তুলে ${where.bn} আনছে, দাম অর্ধেকে নেমেছে। কী করবেন?`, `Everyone is bringing ${crop.en} to ${where.en} at once and the price has halved. What do you do?`),
  options: [q('যত দামেই হোক আজই সব বেচে দেওয়া', 'Sell everything today at any price'), ok('FieldShift-এ দাম দেখে কয়েক দিন অপেক্ষা, অন্য ফসল আগে বেচা', 'Check prices on FieldShift, wait a few days, sell other crops first'), q(`পরের বার আরও বেশি ${crop.bn} লাগানো`, `Plant even more ${crop.en} next time`)],
  why: q('সবার ফসল একসঙ্গে বাজারে এলে দাম পড়ে। একটু অপেক্ষা বা অন্য ফসল — দুটোই লাভ বাঁচায়।', 'When everyone sells at once the price falls. Waiting a little, or selling another crop, protects the profit.'),
  perk: 'market', perkText: q('বাজারের খবর: দাম পড়া অর্ধেক সময় থাকবে', 'Market news: the price drop lasts half as long'),
});
const AWD = {
  q: q('বোরো ধানে সবচেয়ে বেশি পানি লাগে, শ্যালো পাম্পের ডিজেলের খরচও বেশি। কম পানিতে একই ফলন পেতে কী করবেন?', 'Boro rice needs the most water, and the shallow pump’s diesel costs a lot. How do you get the same yield from less water?'),
  options: [q('সব সময় জমিতে পানি দাঁড় করিয়ে রাখা', 'Keep water standing all the time'), ok('পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) — পাইপে পানি ১৫ সেমি নামলে আবার সেচ', 'Alternate wetting and drying (AWD) — irrigate again when the water in the pipe drops 15 cm'), q('সপ্তাহে একবার জমি ভাসানো', 'Flood the field once a week')],
  why: q('ব্রির AWD পদ্ধতিতে সেচের পানি প্রায় এক-চতুর্থাংশ কম লাগে, ফলন কমে না — ডিজেলের খরচও কমে।', 'BRRI’s AWD method uses about a quarter less irrigation water with no loss of yield — and less diesel.'),
  perk: 'drip', perkText: q('AWD চালু: সব জমি ৩০% ধীরে শুকাবে', 'AWD on: every plot dries 30% slower'),
};
const MULCH = (why) => ({
  q: q('চৈত্রের গরমে মাটি দ্রুত শুকাচ্ছে। মাটি ঠান্ডা আর ভেজা রাখতে কী করবেন?', 'In the April heat the soil is drying fast. How do you keep it cool and moist?'),
  options: [ok('খড় বা কচুরিপানা দিয়ে মাটি ঢেকে দেওয়া (মালচিং)', 'Cover the soil with straw or water hyacinth (mulch)'), q('ভরদুপুরে জমি ভাসিয়ে সেচ', 'Flood the field at midday'), q('কিছু না করে বৃষ্টির অপেক্ষা', 'Do nothing and wait for rain')],
  why, perk: 'mulch', perkText: q('মালচিং চালু: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Mulch on: soil dries half as fast in the heat'),
});
const FLOWER_HEAT = {
  q: q('ফুল আসার সময় ৩৫° সেলসিয়াসের বেশি গরম — ধানে চিটা হতে পারে। কী করবেন?', 'Over 35 °C just as the rice flowers — the grains may come up empty. What do you do?'),
  options: [ok('ফুল আসার সময় জমিতে ৫-৭ সেমি পানি ধরে রাখা', 'Keep 5–7 cm of water in the field while it flowers'), q('জমি শুকিয়ে ফেলা', 'Let the field dry out'), q('দুপুরে কীটনাশক ছিটানো', 'Spray pesticide at midday')],
  why: q('ফুল ফোটার সময় দাঁড়ানো পানি গাছকে ঠান্ডা রাখে, চিটা কমে — তাপপ্রবাহে এটাই ব্রির পরামর্শ।', 'Standing water at flowering keeps the plant cool and saves the grain — BRRI’s advice in a heatwave.'),
  perk: 'mulch', perkText: q('পানি ধরে রাখা: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Water held: soil dries half as fast in the heat'),
};
const LINES = (o) => ({
  hello: q('আসসালামু আলাইকুম! চলেন, মাঠে নামি।', 'Salaam! Let us get to the field.'),
  idle: q('উফ্‌, রোদটা আজ কড়া…', 'Phew, the sun is strong today…'),
  harvest: q('আলহামদুলিল্লাহ, ফসল ভালো হয়েছে!', 'Thank God, a good crop!'),
  heat: q('গরম আসছে — চারায় পানি রাখতে হবে।', 'Heat is coming — the seedlings need water.'),
  pest: q('পোকা! দেরি করা যাবে না।', 'Pests! No time to lose.'),
  dry: q('বালতি খালি — পানি আনি।', 'The can is empty — fetch water.'),
  seeds: q('বীজ শেষ — দোকানে যেতে হবে।', 'Out of seed — to the shop.'),
  hurt: q('উহ্‌… বাইরে থাকা ঠিক হয়নি।', 'Ouch… I should not have stayed out.'),
  win: q('এই মৌসুমটা মনে থাকবে!', 'A season to remember!'),
  ...o,
});
const BD = { country: 'bangladesh', flag: '🇧🇩', cur: '৳' };

export const REGIONS_BD = {
  razib: {
    ...BD, division: q('ঢাকা', 'Dhaka'), dinner: q('ভর্তা-ভাত', 'bhorta and rice'), account: '/farmer',
    farmer: {
      bn: 'রাজিব মিয়া', en: 'Razib Miah', age: 30,
      trait: q('তরুণ, প্রযুক্তিপ্রেমী', 'Young and tech-savvy'),
      skill: q('ফোনে সব জমির পানি দেখেন, সতর্কতা আগে পান', 'Sees every plot’s moisture, gets warnings early'),
      dress: [q('খয়েরি ক্যাপ', 'Rust-brown cap'), q('স্ট্রাইপ পোলো শার্ট', 'Peach striped polo shirt'), q('খাকি কার্গো প্যান্ট', 'Khaki cargo trousers'), q('হাতে ফোন', 'Phone in hand')],
      speed: 4, run: 7.4, can: 5, sellBonus: 0, scanner: true, alertLead: 5, idle: 'phone',
      // drawn from Razib's own photo: a painted face in Razib's likeness, the cap, the striped polo and the cargo trousers
      look: { face: 'razib', skin: '#cea382', hair: '#1a1411', build: 1, head: 'cap', headA: '#8a4a38', headB: '#f4f1ec', headC: '#5a2f20', top: 'polo', topA: '#dfae9c', topB: '#d9a531', topC: '#3b2f45', topD: '#a98a6a', lower: 'cargo', lowA: '#ad8d70', lowB: '#937559', feet: 'sneaker', feetA: '#ecebe6', feetB: '#7b4a2e' },
    },
    place: {
      bn: 'চৌহাট, ধামরাই, ঢাকা', en: 'Chauhat, Dhamrai, Dhaka', area: q('রাজধানীর পাশের গ্রাম', 'Farmland on the capital’s edge'),
      local: [q('দিগন্তে ইটভাটার চিমনি', 'Brick-kiln chimneys on the skyline'), q('কারখানার শেড', 'Factory sheds'), q('বালিয়া-চৌহাট সেতু আর বংশী নদী', 'The Balia–Chauhat bridge and the Bangshi'), q('টিনের চালের বাড়ি', 'Tin-roofed houses'), q('শ্যালো টিউবওয়েল', 'Shallow tubewell')],
      hazard: q('বর্ষার জলাবদ্ধতা, কারখানার পানি, সরিষার জাব পোকা', 'Monsoon waterlogging, factory runoff, mustard aphids'),
    },
    names: { shed: q('বীজ-সারের দোকান', 'Seed and fertiliser shop'), water: q('শ্যালো টিউবওয়েল', 'Shallow tubewell'), market: q('ভ্যানে কালামপুর হাট', 'Van to Kalampur market'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('চৌহাট স্কুলের পাকা ঘর', 'Chauhat school building') },
    world: 'dhamrai',
    crops: {
      mustard: { bn: 'সরিষা', en: 'Mustard', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 1, pest: 0.4 },
      boro: { bn: 'বোরো ধান', en: 'Boro rice', kind: 'rice', cost: 14, price: 60, grow: 40, thirst: 1.6, pest: 0.35 },
      brinjal: { bn: 'বেগুন', en: 'Brinjal', kind: 'brinjal', cost: 16, price: 70, grow: 34, thirst: 1.1, pest: 0.5 },
      cauli: { bn: 'ফুলকপি', en: 'Cauliflower', kind: 'cauliflower', cost: 20, price: 88, grow: 40, thirst: 1.3, pest: 0.45 },
    },
    glut: 'cauli', pestWord: q('জাব পোকা', 'aphids'),
    storm: { kind: 'flood', bn: 'ভারী বৃষ্টি আর জলাবদ্ধতা', en: 'Downpour and waterlogging' },
    quiz: {
      water: AWD,
      heat: FLOWER_HEAT,
      pests: {
        q: q('পাশের ছয় কৃষকের সরিষায়ও জাব পোকা — FieldShift এলাকাভিত্তিক সতর্কতা দিয়েছে। কী করবেন?', 'Six neighbours’ mustard has aphids too — FieldShift has raised an area alert. What do you do?'),
        options: [q('নিজের জমিতে প্রতিদিন কড়া ওষুধ', 'Strong spray on your own plot every day'), ok('কর্মকর্তার পরামর্শে পাড়ার সবাই একসঙ্গে ব্যবস্থা, হলুদ আঠালো ফাঁদ', 'Act together with the neighbours on the officer’s advice, with yellow sticky traps'), q('মৌমাছি আসবে বলে কিছু না করা', 'Do nothing for the sake of the bees')],
        why: q('জাব পোকা এক জমি থেকে আরেক জমিতে উড়ে যায় — একজন ব্যবস্থা নিলে পাশ থেকে আবার আসে। সবাই একসঙ্গে নিলে তবেই কাজ হয়।', 'Aphids fly from field to field — treat one and they return from the next. Only acting together works.'),
        perk: 'neem', perkText: q('সবাই মিলে: পোকা ধীরে ছড়াবে', 'All together: pests spread more slowly'),
      },
      storm: {
        q: q('তিন দিন ভারী বৃষ্টির পূর্বাভাস; গত বছর নালা বন্ধ থাকায় জমিতে এক সপ্তাহ পানি দাঁড়িয়ে ছিল। কী করবেন?', 'Three days of heavy rain are forecast; last year blocked drains left water standing for a week. What do you do?'),
        options: [ok('পাকা ফসল তুলে, আগেই জমির নালা পরিষ্কার করে পানি বের হওয়ার পথ রাখা', 'Bring in the ripe crop and clear the drains first so the water can run off'), q('আইল উঁচু করে পানি আটকে রাখা', 'Raise the bunds to hold the water in'), q('বৃষ্টি থামা পর্যন্ত কিছু না করা', 'Do nothing until the rain stops')],
        why: q('পরিষ্কার নালা দিয়ে বাড়তি পানি বেরিয়ে যায়, শিকড় পচে না। আইল উঁচু করলে উল্টো পানি জমে।', 'Clear drains let the extra water out so roots do not rot. Higher bunds trap the water instead.'),
        perk: 'drains', perkText: q('নালা পরিষ্কার: অর্ধেক পাকা ফসল বাঁচবে', 'Drains cleared: half the ripe crop survives'),
      },
      profit: glutQuiz(q('ফুলকপি', 'cauliflower'), q('কালামপুর হাটে', 'Kalampur market')),
    },
    intro: [
      q('আমি {name}। ধামরাইয়ের চৌহাটে চারটি জমি — উপজেলা অফিসে নিবন্ধিত, প্রতিটি উপগ্রহে দেখা যায়।', 'I am {name}. Four fields at Chauhat in Dhamrai — on the upazila register, each watched by satellite.'),
      q('ঢাকা এত কাছে যে রাতে মাঠ থেকে কারখানার আলো দেখা যায়।', 'Dhaka is so close that the factory lights show over the fields at night.'),
      q('বর্ষায় নালা বন্ধ হয়ে জমিতে পানি দাঁড়ায়, শীতে সরিষায় জাব পোকা ঝাঁক বেঁধে আসে।', 'In the monsoon blocked drains leave water standing; in winter aphids swarm the mustard.'),
      q('ফোনে FieldShift রাখি — পোকার এলাকাভিত্তিক সতর্কতা আর জমির পানি সব এক জায়গায়।', 'I keep FieldShift on my phone — area pest alerts and every plot’s water in one place.'),
      q('চলুন, এই রবিতে শহরের বাজারে নিরাপদ সবজি পাঠাই!', 'Let us send safe vegetables to the city markets this Rabi!'),
    ],
    lines: LINES({ hello: q('আসসালামু আলাইকুম! ফোনে FieldShift খোলা, চলেন!', 'Salaam! FieldShift is open — let us go!'), idle: q('দেখি তো আজকের পূর্বাভাস কী…', 'Let me check today’s forecast…'), storm: q('বৃষ্টি আসছে! ফসল তুলে স্কুলে যাই।', 'Rain is coming! Crop in, then to the school.'), pest: q('জাব পোকা! পাড়ার সবাইকে জানাই।', 'Aphids! Tell the neighbours.'), win: q('স্মার্ট চাষ, স্মার্ট লাভ!', 'Smart farming, smart profit!') }),
  },

  rahimu: {
    ...BD, division: q('রাজশাহী', 'Rajshahi'), dinner: q('কালাই রুটি আর বেগুন ভর্তা', 'kalai roti and begun bhorta'), account: '/login',
    farmer: {
      bn: 'রহিম উদ্দিন', en: 'Rahim Uddin', age: 58,
      trait: q('শান্ত, অভিজ্ঞ', 'Calm and seasoned'),
      skill: q('বড় বালতি: একবারে ৮ বার পানি', 'Big can: 8 waterings per fill'),
      dress: [q('চেক লুঙ্গি', 'Checked lungi'), q('সাদা ফতুয়া', 'White fotua'), q('মাথায় লাল গামছা', 'Red gamcha on the head'), q('পাকা দাড়ি', 'White beard')],
      speed: 3.6, run: 6.2, can: 8, sellBonus: 0, scanner: false, alertLead: 0, idle: 'wipe',
      look: { skin: '#a8704a', hair: '#5b5551', beard: '#d9d4cc', build: 1.04, head: 'gamcha', headA: '#b0302b', headB: '#f3eee4', top: 'fotua', topA: '#e4eaf0', topB: '#c9d2dc', lower: 'lungi', lowA: '#27507f', lowB: '#7aa3cf', feet: 'sandal', feetA: '#3a2a1e' },
    },
    place: {
      bn: 'দেওপাড়া, গোদাগাড়ী, রাজশাহী', en: 'Deopara, Godagari, Rajshahi', area: q('বরেন্দ্র অঞ্চল', 'The Barind tract'),
      local: [q('লাল খিয়ার মাটি', 'Red Barind soil'), q('আমবাগান', 'Mango orchards'), q('তালগাছ', 'Palmyra palms'), q('বিএমডিএর গভীর নলকূপ', 'BMDA deep tube well'), q('পদ্মা নদী', 'The Padma')],
      hazard: q('খরা, নেমে যাওয়া পানির স্তর, কালবৈশাখী', 'Drought, a falling water table, nor’westers'),
    },
    names: { shed: q('বীজ-সারের দোকান', 'Seed and fertiliser shop'), water: q('গভীর নলকূপ (বিএমডিএ)', 'Deep tube well (BMDA)'), market: q('ভ্যানে কাঁকনহাট হাট', 'Van to Kakanhat market'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('পাকা স্কুলঘর', 'Brick school building') },
    world: 'barind',
    crops: {
      tomato: { bn: 'টমেটো', en: 'Tomato', kind: 'tomato', cost: 20, price: 85, grow: 42, thirst: 1.45, pest: 0.6 },
      wheat: { bn: 'গম', en: 'Wheat', kind: 'wheat', cost: 15, price: 55, grow: 36, thirst: 0.75, pest: 0.2 },
      lentil: { bn: 'মসুর ডাল', en: 'Lentil', kind: 'lentil', cost: 8, price: 30, grow: 22, thirst: 0.5, pest: 0.15, soil: true },
      mustard: { bn: 'সরিষা', en: 'Mustard', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 1, pest: 0.35 },
    },
    glut: 'tomato', pestWord: q('পোকা', 'pests'),
    storm: { kind: 'hail', bn: 'কালবৈশাখী আর শিলাবৃষ্টি', en: 'Nor’wester and hail' },
    quiz: {
      water: {
        q: q('বরেন্দ্রে গভীর নলকূপের পানি প্রতি বছর আরও নিচে নামছে। কম পানিতে বেশি ফসল পেতে কোন সেচ?', 'In the Barind the deep-well water sinks lower every year. Which irrigation gets more crop from less water?'),
        options: [q('রোজ জমি ভাসিয়ে দেওয়া', 'Flood the field every day'), ok('ফোঁটা সেচ — গাছের গোড়ায় ধীরে ধীরে পানি', 'Drip irrigation — slow water at the roots'), q('সপ্তাহে একবার অনেক পানি', 'A lot of water once a week')],
        why: q('ফোঁটা সেচে পানি সরাসরি শিকড়ে যায়, অপচয় অনেক কম — বরেন্দ্রের মতো পানির টানের এলাকায় সবচেয়ে কাজের।', 'Drip sends water straight to the roots with far less waste — best where water is short, as in the Barind.'),
        perk: 'drip', perkText: q('ফোঁটা সেচ চালু: সব জমি ৩০% ধীরে শুকাবে', 'Drip on: every plot dries 30% slower'),
      },
      heat: MULCH(q('খড়ের ঢাকনা রোদ আটকায়, মাটির পানি উড়ে যাওয়া কমায়। দুপুরের সেচের বেশিরভাগ পানি বাষ্প হয়ে যায়।', 'A straw cover blocks the sun and slows evaporation. Most midday irrigation water just evaporates.')),
      pests: {
        q: q('টমেটোর পাতায় বাদামি দাগ ছড়াচ্ছে। প্রথমে কী করবেন?', 'Brown spots are spreading on the tomato leaves. What first?'),
        options: [q('দোকানের সবচেয়ে কড়া ওষুধ সব জমিতে', 'The strongest shop chemical on every plot'), ok('পাতার ছবি FieldShift-এর ফসলের ডাক্তারে, তারপর কর্মকর্তার পরামর্শমতো শুধু আক্রান্ত জমিতে', 'A photo to FieldShift’s crop doctor, then the officer’s treatment on the affected plots only'), q('কিছুদিন অপেক্ষা', 'Wait a few days')],
        why: q('আগে চিনে নিলে ঠিক জায়গায় ঠিক ব্যবস্থা — খরচ কম, উপকারী পোকাও বাঁচে। দেরি করলে পাশের জমিতে ছড়ায়।', 'Identify first, then treat only where needed — cheaper, and the helpful insects survive. Wait, and it spreads.'),
        perk: 'neem', perkText: q('ঠিক ব্যবস্থা: রোগ ধীরে ছড়াবে', 'Right treatment: it spreads more slowly'),
      },
      storm: {
        q: q('বিকেলে উত্তর-পশ্চিম আকাশ কালো। কালবৈশাখী, বজ্রপাত আর শিলাবৃষ্টি আসছে। কী করবেন?', 'The north-west sky is black this afternoon. A nor’wester with lightning and hail is coming. What do you do?'),
        options: [ok('পাকা ফসল তুলে, গরু ঘরে বেঁধে পাকা স্কুলঘরে আশ্রয়', 'Bring in the ripe crop, tie up the cow, shelter in the brick school'), q('বড় গাছের নিচে দাঁড়িয়ে ঝড় দেখা', 'Stand under a big tree and watch the storm'), q('খোলা মাঠে কাজ চালিয়ে যাওয়া', 'Keep working in the open field')],
        why: q('বজ্রপাতে বাংলাদেশে প্রতি বছর কয়েকশ মানুষ মারা যান, বেশিরভাগই খোলা মাঠে কাজের সময়। বড় গাছের নিচেও বিপদ — পাকা ঘরে আশ্রয় নিন।', 'Lightning kills a few hundred people in Bangladesh every year, most of them working in open fields. A big tree is dangerous too — shelter in a brick building.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: আশ্রয়ে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach shelter'),
      },
      profit: glutQuiz(q('টমেটো', 'tomatoes'), q('কাঁকনহাটে', 'Kakanhat')),
    },
    intro: [
      q('আমি {name}। দেওপাড়ার লাল খিয়ার মাটিতে আমার চারটি জমি — বাপ-দাদার আমল থেকে।', 'I am {name}. My four fields are in the red Barind soil of Deopara — they were my father’s and his father’s.'),
      q('গ্রীষ্মে মাটি ফেটে যায়। বোরোর ফুল আসে ৩৫ ডিগ্রির ওপরের গরমে।', 'In the hot season the soil cracks. The Boro flowers in heat over 35 degrees.'),
      q('গভীর নলকূপের পানি প্রতি বছর আরও নিচে নামছে। দাদার আমলের হিসাব আর মেলে না।', 'The deep-well water sinks lower every year. Grandfather’s calendar no longer adds up.'),
      q('ছেলে বলল, FieldShift নাসার ২৫ বছরের আবহাওয়া মিলিয়ে আগেই সাবধান করে।', 'My son says FieldShift checks 25 years of NASA weather and warns ahead.'),
      q('এই রবি মৌসুমে চলুন একসঙ্গে চেষ্টা করি — মাঠ বাঁচাই, লাভও করি!', 'This Rabi season, let us try together — save the field, and make a profit!'),
    ],
    lines: LINES({ storm: q('কালবৈশাখী! ফসল তুলে স্কুলঘরে যাই।', 'A nor’wester! Crop in, then to the school.'), dry: q('বালতি খালি — নলকূপে যাই।', 'The can is empty — to the well.') }),
  },

  didarul: {
    ...BD, division: q('চট্টগ্রাম', 'Chattogram'), dinner: q('মেজবানি মাংস', 'mezbani beef'), account: '/login',
    farmer: {
      bn: 'মো. দিদারুল আলম', en: 'Md. Didarul Alam', age: 48,
      trait: q('জেদি, পরিশ্রমী', 'Stubborn and hard-working'),
      skill: q('উঁচু বেড বানাতে ওস্তাদ: জমির মাটি দ্রুত উর্বর হয়', 'Master of raised beds: his soil recovers fast'),
      dress: [q('সাদা টুপি', 'White prayer cap'), q('ঘিয়ে পাঞ্জাবি', 'Cream panjabi'), q('খয়েরি চেক লুঙ্গি', 'Brown checked lungi'), q('ছোট দাড়ি', 'A short beard')],
      speed: 3.9, run: 6.6, can: 6, sellBonus: 0.05, scanner: false, alertLead: 0, idle: 'wipe', soilKeeper: true,
      look: { skin: '#a8704a', hair: '#1d1714', beard: '#231b16', build: 1.02, head: 'tupi', headA: '#f7f5ef', top: 'kurta', topA: '#f1efe8', topB: '#d7d2c4', lower: 'lungi', lowA: '#6b3f2a', lowB: '#c79a6a', feet: 'sandal', feetA: '#2f2a26' },
    },
    place: {
      bn: 'সৈয়দপুর, সীতাকুণ্ড, চট্টগ্রাম', en: 'Syedpur, Sitakunda, Chattogram', area: q('পাহাড় আর সাগরের মাঝখানে', 'Between the hills and the sea'),
      local: [q('পূর্বে সীতাকুণ্ডের পাহাড়, চূড়ায় চন্দ্রনাথ', 'The Sitakunda hills to the east, Chandranath on top'), q('পশ্চিমে সাগর আর জাহাজভাঙা কারখানা', 'The sea and the ship-breaking yards to the west'), q('বাঁশের মাচায় শিম', 'Beans on bamboo trellises'), q('নারকেল আর সুপারি গাছ', 'Coconut and betel-nut palms'), q('ঘূর্ণিঝড় আশ্রয়কেন্দ্র', 'Cyclone shelter')],
      hazard: q('পাহাড়ি ঢল, ঘূর্ণিঝড়ের বাতাস, শিমের ফল ছিদ্রকারী পোকা', 'Hill torrents, cyclone winds, bean pod borer'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('শ্যালো টিউবওয়েল', 'Shallow tubewell'), market: q('মহাসড়কের পাইকারি হাট', 'Highway wholesale market'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('ঘূর্ণিঝড় আশ্রয়কেন্দ্র', 'Cyclone shelter') },
    world: 'sitakunda',
    crops: {
      bean: { bn: 'শিম', en: 'Country bean', kind: 'bean', cost: 12, price: 62, grow: 32, thirst: 0.9, pest: 0.55, soil: true },
      gourd: { bn: 'করলা', en: 'Bitter gourd', kind: 'bittergourd', cost: 16, price: 80, grow: 38, thirst: 1.2, pest: 0.45 },
      chili: { bn: 'কাঁচা মরিচ', en: 'Green chilli', kind: 'chili', cost: 14, price: 60, grow: 32, thirst: 1.1, pest: 0.4 },
      tomato: { bn: 'টমেটো', en: 'Tomato', kind: 'tomato', cost: 20, price: 85, grow: 42, thirst: 1.4, pest: 0.55 },
    },
    glut: 'gourd', pestWord: q('পোকা', 'pests'),
    storm: { kind: 'flood', bn: 'মেঘভাঙা বৃষ্টি আর পাহাড়ি ঢল', en: 'Cloudburst and hill torrent' },
    quiz: {
      plant: {
        q: q('আগের বছর সমান বেডে বৃষ্টির পানি জমে শিমের গোড়া পচেছিল। এবার কীভাবে বুনবেন?', 'Last year rain pooled on the flat beds and rotted the bean roots. How do you sow this time?'),
        options: [q('আগের মতো সমান জমিতে', 'On the flat as before'), ok('উঁচু বেডে, খড়ের মালচ দিয়ে', 'On raised beds, mulched with straw'), q('গাছ ঘন করে, বেশি ইউরিয়া দিয়ে', 'Plant closer and add more urea')],
        why: q('উঁচু বেড থেকে পানি নেমে যায়, শিকড় দম পায়; মালচ মাটি ঠান্ডা আর ভেজা রাখে।', 'Raised beds drain, so the roots can breathe; the mulch keeps the soil cool and moist.'),
        perk: 'mulch', perkText: q('উঁচু মালচ বেড: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Raised mulched beds: soil dries half as fast in the heat'),
      },
      water: {
        q: q('শুকনো মৌসুমে টিউবওয়েলের পানি কম আসে। উঁচু বেডে সবজিতে কীভাবে সেচ দেবেন?', 'The tubewell gives less in the dry season. How do you water vegetables on raised beds?'),
        options: [q('বেড ডুবিয়ে প্লাবন সেচ', 'Flood the beds'), ok('বেডের পাশের নালায় বা গোড়ায় ফোঁটা সেচ', 'Water the furrows beside the beds, or drip at the roots'), q('দুপুরে মাথার ওপর দিয়ে ছিটানো', 'Spray overhead at midday')],
        why: q('নালা আর ফোঁটা সেচে পানি গোড়ায় যায়, পাতা ভেজে না — রোগও কম, পানিও বাঁচে।', 'Furrow and drip put the water at the roots and keep the leaves dry — less disease and less water.'),
        perk: 'drip', perkText: q('গোড়ায় সেচ: সব জমি ৩০% ধীরে শুকাবে', 'Root watering: every plot dries 30% slower'),
      },
      heat: {
        q: q('গরমে শিম আর করলার ফুল ঝরে যাচ্ছে। কী করবেন?', 'The heat is making the bean and gourd flowers drop. What do you do?'),
        options: [ok('বিকেলে হালকা সেচ, মালচ ঠিক রাখা', 'A light watering in the evening and the mulch kept in place'), q('দুপুরে সেচ', 'Water at midday'), q('বাড়তি ইউরিয়া', 'Extra urea')],
        why: q('বিকেলের হালকা সেচে রাতভর মাটি ঠান্ডা থাকে, ফুল টেকে; দুপুরের পানি উড়ে যায়।', 'An evening watering keeps the soil cool through the night and the flowers hold; midday water just evaporates.'),
        perk: 'cool', perkText: q('বিকেলের সেচ: গরমে মাটি অর্ধেক ধীরে শুকাবে', 'Evening watering: soil dries half as fast in the heat'),
      },
      pests: {
        q: q('শিমে কালো দাগ আর ভেতরে ঢোকা পোকা — ফল ছিদ্রকারী (মারুকা)। আগে প্রতি তিন দিনে কড়া ওষুধ দিতেন। এবার?', 'Black spots and boring larvae in the beans — the Maruca pod borer. You used to spray strong poison every three days. This time?'),
        options: [q('আরও ঘন ঘন কড়া ওষুধ', 'Spray strong poison even more often'), ok('ছবি তুলে কর্মকর্তাকে পাঠানো; পোকার ধাপ মিলিয়ে ফেরোমন ফাঁদ আর স্পিনোস্যাড', 'Send a photo to the officer; pheromone traps and spinosad matched to the larval stage'), q('শিম চাষ ছেড়ে দেওয়া', 'Give up beans')],
        why: q('কড়া বিষে উপকারী পোকা মরে, ভেতরের পোকা মরে না। ঠিক ধাপে ঠিক ওষুধ আর ফাঁদে খরচ কম, শিমও নিরাপদ।', 'Strong poison kills the useful insects, not the larvae inside. The right treatment at the right stage, with traps, costs less and keeps the beans safe.'),
        perk: 'neem', perkText: q('ফাঁদ আর ঠিক ওষুধ: পোকা ধীরে ছড়াবে', 'Traps and the right spray: pests spread more slowly'),
      },
      storm: {
        q: q('FieldShift-এর মেঘভাঙা বৃষ্টির সতর্কতা: ৪৮ ঘণ্টার মধ্যে নিম্নচাপ, পাহাড় থেকে ঢল নামতে পারে। কী করবেন?', 'FieldShift’s cloudburst alert: a depression within 48 hours, and the hills may send down a torrent. What do you do?'),
        options: [ok('জমির চারপাশে নালা কেটে, পাকা ফসল তুলে, নিজে আশ্রয়কেন্দ্রে', 'Dig drains round the field, bring in the ripe crop, and go to the shelter'), q('পাহাড়ের ঢালে মাচা পাহারা দেওয়া', 'Stay on the slope to guard the trellis'), q('কিছু না করে অপেক্ষা', 'Wait and do nothing')],
        why: q('চারপাশের নালা ঢলের পানি জমি থেকে সরিয়ে নেয়। দিদারুল এভাবেই নিম্নচাপের আগে জমি বাঁচিয়েছিলেন।', 'Perimeter drains carry the torrent away from the field. That is how Didarul saved his land before the depression.'),
        perk: 'drains', perkText: q('নালা কাটা হলো: অর্ধেক পাকা ফসল বাঁচবে', 'Drains dug: half the ripe crop survives'),
      },
      profit: glutQuiz(q('করলা', 'bitter gourd'), q('মহাসড়কের হাটে', 'the highway market')),
    },
    intro: [
      q('আমি {name}। কুড়ি বছর ধরে সৈয়দপুরে আমার শীতের শিম ছিল গর্বের জিনিস।', 'I am {name}. For twenty years my winter beans were the pride of Syedpur.'),
      q('তিন বছর আগে অক্টোবরের মেঘভাঙা বৃষ্টিতে পাহাড় থেকে ঢল নামল, মাচা ভেসে গেল।', 'Three years ago an October cloudburst sent a torrent down the hills and washed my trellises away.'),
      q('তারপর তোলার ঠিক আগে পোকা ৭০ ভাগ শিম ফাঁপা করে দিল। জাহাজভাঙা কারখানায় কাজের কথা ভাবছিলাম।', 'Then, just before harvest, borers hollowed out 70% of the pods. I was ready to work in the ship-breaking yards.'),
      q('সেই সপ্তাহেই উপজেলা কৃষি অফিসার এলেন FieldShift নিয়ে।', 'That week the upazila agriculture officer came with FieldShift.'),
      q('এবার উঁচু বেড, নালা আর ঠিক সময় — চলুন, শিম আবার গর্বের হোক!', 'This time raised beds, drains and the right timing — let the beans be our pride again!'),
    ],
    lines: LINES({ storm: q('ঢল নামবে! নালা কেটে আশ্রয়কেন্দ্রে যাই।', 'A torrent is coming! Drains dug, then to the shelter.'), pest: q('মারুকা পোকা! কর্মকর্তাকে ছবি পাঠাই।', 'Pod borer! A photo to the officer.') }),
  },

  prahlad: {
    ...BD, division: q('খুলনা', 'Khulna'), dinner: q('চিংড়ির মালাইকারি', 'prawn malai curry'), account: '/login',
    farmer: {
      bn: 'প্রহ্লাদ চন্দ্র রায়', en: 'Prahlad Chandra Roy', age: 52,
      trait: q('ধৈর্যশীল, মাটি ছাড়েননি', 'Patient; never gave up his land'),
      skill: q('গরম সয়ে যান: তাপে ফসল ২৫% কম শুকায়', 'Used to the heat: crops dry 25% less in a heatwave'),
      dress: [q('সাদা ধুতি', 'White dhoti'), q('সাদা ফতুয়া', 'White fotua'), q('কাঁধে লাল গামছা', 'Red gamcha on the shoulder'), q('গোঁফ', 'A moustache')],
      speed: 3.7, run: 6.2, can: 6, sellBonus: 0.05, scanner: false, alertLead: 0, idle: 'wipe', heatHardy: true,
      look: { skin: '#8d5b3c', hair: '#2a2420', moustache: '#2a2420', build: 1, head: 'bare', top: 'fotua', topA: '#f3efe2', topB: '#d8d2c4', lower: 'dhoti', lowA: '#f1ede4', lowB: '#d8d2c4', feet: 'sandal', feetA: '#3a2a1e', scarf: '#c9482e' },
    },
    place: {
      bn: 'তিলডাঙ্গা, দাকোপ, খুলনা', en: 'Tildanga, Dacope, Khulna', area: q('উপকূল, সুন্দরবনের ধারে', 'The coast, at the edge of the Sundarbans'),
      local: [q('বেড়িবাঁধ', 'The embankment'), q('পশুর নদী আর সুন্দরবন', 'The Pasur and the Sundarbans'), q('গোলপাতার ঘর', 'Golpata-thatched houses'), q('কুনি পুকুর (মিঠা পানি)', 'Kuni pond (fresh water)'), q('ঘূর্ণিঝড় আশ্রয়কেন্দ্র', 'Cyclone shelter')],
      hazard: q('মাটি-পানিতে লবণ, ঘূর্ণিঝড়, জলোচ্ছ্বাস', 'Salt in soil and water, cyclones, tidal surges'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('কুনি পুকুর', 'Kuni pond'), market: q('খালের ঘাটে নৌকা', 'Boat at the canal ghat'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('ঘূর্ণিঝড় আশ্রয়কেন্দ্র', 'Cyclone shelter') },
    world: 'coast',
    crops: {
      watermelon: { bn: 'তরমুজ', en: 'Watermelon', kind: 'watermelon', cost: 22, price: 95, grow: 44, thirst: 1.5, pest: 0.55 },
      sunflower: { bn: 'সূর্যমুখী', en: 'Sunflower', kind: 'sunflower', cost: 12, price: 50, grow: 32, thirst: 0.8, pest: 0.25 },
      sesame: { bn: 'তিল', en: 'Sesame', kind: 'sesame', cost: 12, price: 64, grow: 34, thirst: 0.6, pest: 0.3 },
      grasspea: { bn: 'খেসারি', en: 'Grass pea', kind: 'grasspea', cost: 6, price: 28, grow: 22, thirst: 0.4, pest: 0.12, soil: true },
    },
    glut: 'watermelon', pestWord: q('পোকা', 'pests'),
    storm: { kind: 'flood', bn: 'ঘূর্ণিঝড় আর জলোচ্ছ্বাস', en: 'Cyclone and surge' },
    quiz: {
      water: {
        q: q('শুকনো মৌসুমে নদী আর খালের পানি লোনা। সেচে কোন পানি দেবেন?', 'In the dry season the river and canal water is salty. What water do you irrigate with?'),
        options: [q('নদীর লোনা পানি সরাসরি', 'The salty river water, straight'), ok('বর্ষার বৃষ্টির পানি কুনি পুকুরে ধরে রেখে সেই মিঠা পানি', 'Monsoon rain kept in a kuni pond — fresh water'), q('যত খুশি নলকূপের পানি তোলা', 'Pump as much tubewell water as you like')],
        why: q('লোনা পানিতে সেচ দিলে মাটি আরও লোনা হয়, চারা পুড়ে যায়। বর্ষার মিঠা পানি কুনি পুকুরে ধরে রাখাই দাকোপের ভরসা।', 'Salty irrigation makes the soil saltier and scorches the seedlings. Fresh monsoon water kept in a kuni pond is what Dacope relies on.'),
        perk: 'pond', perkText: q('মিঠা পানি জমানো: বালতিতে ২ বার বেশি পানি', 'Fresh water stored: the can holds 2 more'),
      },
      heat: MULCH(q('মাটি ঢাকা থাকলে পানি কম উড়ে যায়, তাই নিচের লবণও কম ওপরে ওঠে — উপকূলের মাঠে মালচিংয়ে লবণ কমে।', 'Covered soil loses less water, so less salt is drawn up from below — mulch lowers soil salt in coastal fields.')),
      pests: {
        q: q('তরমুজের লতায় আঠালো কালো দাগ — গামি স্টেম ব্লাইট — আর ফলে মাছি পোকা। কী করবেন?', 'Gummy black lesions on the watermelon vines — gummy stem blight — and fruit flies. What do you do?'),
        options: [q('প্রতিদিন কড়া কীটনাশক', 'Strong pesticide every day'), ok('কর্মকর্তাকে দেখিয়ে আক্রান্ত লতা সরানো, ফেরোমন ফাঁদ পাতা', 'Show the officer, remove the diseased vines, set pheromone traps'), q('কিছু না করা', 'Do nothing')],
        why: q('আক্রান্ত লতা সরালে রোগ ছড়ায় না; ফেরোমন ফাঁদে মাছির বংশ বাড়ে না — বিষ ছাড়াই।', 'Removing diseased vines stops the spread; pheromone traps stop the flies breeding — without poison.'),
        perk: 'neem', perkText: q('ফাঁদ আর পরিষ্কার: পোকা ধীরে ছড়াবে', 'Traps and clean-up: pests spread more slowly'),
      },
      storm: {
        q: q('রেডিওতে ঘূর্ণিঝড়ের ৭ নম্বর বিপদ সংকেত। কী করবেন?', 'The radio gives cyclone danger signal 7. What do you do?'),
        options: [ok('পাকা ফসল তুলে, গবাদি পশু নিয়ে আশ্রয়কেন্দ্রে', 'Bring in the ripe crop and take the animals to the cyclone shelter'), q('ঘরে থেকে জিনিসপত্র পাহারা দেওয়া', 'Stay at home to guard your things'), q('নৌকা নিয়ে নদীতে যাওয়া', 'Take the boat out on the river')],
        why: q('সিডর-আইলার অভিজ্ঞতা: সংকেত পেলেই আশ্রয়কেন্দ্রে গেলে জীবন বাঁচে। আগাম সতর্কতা আর আশ্রয়কেন্দ্রের জন্যই ঘূর্ণিঝড়ে মৃত্যু অনেক কমেছে।', 'The lesson of Sidr and Aila: go to the shelter as soon as the signal comes. Early warnings and shelters are why cyclone deaths have fallen so far.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: আশ্রয়ে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach shelter'),
      },
      profit: glutQuiz(q('তরমুজ', 'watermelons'), q('ঘাটে', 'the ghat')),
    },
    intro: [
      q('আমি {name}। আইলা আর আম্পানে বাঁধ ভাঙার পর তিলডাঙ্গার মাটি চকের মতো সাদা হয়ে গেল।', 'I am {name}. After Aila and Amphan broke the embankment, Tildanga’s soil turned white as chalk.'),
      q('জানুয়ারি থেকে মে মাটির নিচ থেকে লবণ উঠে আসে, যা বুনি তার শিকড় পোড়ে।', 'From January to May the salt rises from below and burns the roots of whatever I sow.'),
      q('পাশের লোকেরা ঢাকার ইটভাটায় চলে গেলেন। আমি আমার দুটি জমি ছাড়িনি।', 'The neighbours left for the brick kilns near Dhaka. I did not give up my two fields.'),
      q('উপজেলা কৃষি অফিসার EC মিটার এনে বললেন — জমি মরেনি, লবণের বিরুদ্ধে বিজ্ঞানের পরিকল্পনা লাগবে।', 'The upazila agriculture officer came with an EC meter: the land is not dead, it needs a scientific plan against the salt.'),
      q('কুনি পুকুর, খড়ের মালচ আর লবণসহিষ্ণু বীজ — চলুন, শুরু করি!', 'A kuni pond, straw mulch and salt-tolerant seed — let us begin!'),
    ],
    lines: LINES({ hello: q('নমস্কার! চলুন, মাঠে নামি।', 'Namaskar! To the field.'), harvest: q('বাহ্! লবণের মাটিতেও ফসল হলো!', 'Look! A crop even in the salty soil!'), storm: q('সংকেত ৭! ফসল তুলে আশ্রয়কেন্দ্রে!', 'Signal 7! Crop in, then to the shelter!'), dry: q('বালতি খালি — কুনি পুকুরে যাই।', 'The can is empty — to the kuni pond.') }),
  },

  kader: {
    ...BD, division: q('বরিশাল', 'Barishal'), dinner: q('ইলিশ-ভাত', 'hilsa and rice'), account: '/login',
    farmer: {
      bn: 'আবদুল কাদের হাওলাদার', en: 'Abdul Kader Howlader', age: 45,
      trait: q('নদীর মানুষ, চটপটে', 'A river man, quick on his feet'),
      skill: q('নৌকা-পথ চেনেন: দ্রুত হাঁটেন, হাটে ১৫% বেশি দাম', 'Knows the waterways: walks fast, sells for 15% more'),
      dress: [q('সাদা টুপি', 'White prayer cap'), q('সাদা দাড়ি', 'White beard'), q('হালকা নীল পাঞ্জাবি', 'Pale blue panjabi'), q('নীল চেক লুঙ্গি', 'Blue checked lungi')],
      speed: 4.3, run: 7.1, can: 6, sellBonus: 0.15, scanner: false, alertLead: 0, idle: 'wipe',
      look: { skin: '#b77b52', hair: '#e7e3dc', beard: '#efebe4', build: 1, head: 'tupi', headA: '#f7f5ef', top: 'kurta', topA: '#dfe7ee', topB: '#c3cdd6', lower: 'lungi', lowA: '#1f4f8a', lowB: '#7aa3cf', feet: 'sandal', feetA: '#2f2a26' },
    },
    place: {
      bn: 'নীলগঞ্জ, বাকেরগঞ্জ, বরিশাল', en: 'Nilganj, Bakerganj, Barishal', area: q('নদী আর খালের দেশ', 'The land of rivers and canals'),
      local: [q('দিনে দুবার জোয়ার-ভাটা', 'Tides twice a day'), q('খালে পেয়ারার নৌকা', 'Guava boats on the canals'), q('ভাসমান ধাপের বেড', 'Floating dhap beds'), q('নারকেল আর গোলপাতা', 'Coconut and nipa palm'), q('বাঁশের সাঁকো', 'Bamboo footbridges')],
      hazard: q('কোটালের জোয়ারে জমি ডোবা, হলুদ মাজরা পোকা', 'Fields under at spring tide, yellow stem borer'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('খালের পাম্প', 'Canal pump'), market: q('খালের ঘাটে নৌকা', 'Boat at the canal ghat'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('বেড়িবাঁধের উঁচু রাস্তা', 'The raised embankment road') },
    world: 'tidal',
    crops: {
      aman: { bn: 'জোয়ারসহিষ্ণু ধান', en: 'Tide-tolerant rice', kind: 'rice', cost: 14, price: 60, grow: 40, thirst: 1.4, pest: 0.45 },
      mung: { bn: 'মুগ ডাল', en: 'Mungbean', kind: 'mungbean', cost: 8, price: 36, grow: 24, thirst: 0.5, pest: 0.2, soil: true },
      chili: { bn: 'মরিচ', en: 'Chilli', kind: 'chili', cost: 14, price: 62, grow: 32, thirst: 1.1, pest: 0.4 },
      groundnut: { bn: 'চীনাবাদাম', en: 'Groundnut', kind: 'groundnut', cost: 16, price: 66, grow: 34, thirst: 0.8, pest: 0.3 },
    },
    glut: 'aman', pestWord: q('মাজরা পোকা', 'stem borers'),
    storm: { kind: 'flood', bn: 'কোটালের জোয়ার', en: 'Spring tide' },
    quiz: {
      water: {
        q: q('চারপাশে খাল, কিন্তু জোয়ারের পানি আসে-যায়। কীভাবে সেচ দেবেন?', 'Canals all round, but the tide comes and goes. How do you irrigate?'),
        options: [q('ভাটার সময় পাম্প চালিয়ে কাদা পানি তোলা', 'Pump muddy water at low tide'), ok('জোয়ারে স্লুইসগেট খুলে খালের পানি ঢোকানো, ভাটায় বের করে দেওয়া', 'Open the sluice at high tide to let canal water in, and drain it at low tide'), q('বৃষ্টির অপেক্ষা', 'Wait for rain')],
        why: q('জোয়ার-ভাটার নিজের শক্তিতেই সেচ — ডিজেল লাগে না, আর ভাটায় বের করলে জমিতে পানি জমে না।', 'The tide does the work — no diesel needed, and draining at low tide keeps water from standing.'),
        perk: 'drip', perkText: q('জোয়ারের সেচ: সব জমি ৩০% ধীরে শুকাবে', 'Tidal irrigation: every plot dries 30% slower'),
      },
      heat: MULCH(q('খড়ের ঢাকনা রোদ আটকায়, মাটির পানি উড়ে যাওয়া কমায়।', 'A straw cover blocks the sun and slows evaporation.')),
      pests: {
        q: q('রাতারাতি সোনালি মাঠে সাদা শীষ — হলুদ মাজরা পোকা। কী করবেন?', 'Overnight, white empty heads in the golden field — yellow stem borer. What do you do?'),
        options: [q('সব জমিতে কড়া কীটনাশক', 'Strong pesticide on every plot'), ok('আলোর ফাঁদে মথ ধরে গোনা, খুঁটি পুঁতে পাখি বসানো, দরকার হলে তবেই ওষুধ', 'Count the moths in a light trap, put up perches for birds, and spray only if needed'), q('কিছু না করা', 'Do nothing')],
        why: q('আলোর ফাঁদে বোঝা যায় পোকা কতটা; খুঁটিতে বসা পাখি পোকা খায়। এতে খরচ আর বিষ দুটোই কম।', 'A light trap shows how many there are, and birds on the perches eat them. Less cost, less poison.'),
        perk: 'neem', perkText: q('আলোর ফাঁদ আর খুঁটি: পোকা ধীরে ছড়াবে', 'Light traps and perches: pests spread more slowly'),
      },
      storm: {
        q: q('পূর্ণিমার কোটালের জোয়ার আসছে, পানি স্বাভাবিকের চেয়ে দুই ফুট বেশি উঠবে। কী করবেন?', 'The full-moon spring tide is coming, two feet above normal. What do you do?'),
        options: [ok('পাকা ফসল কেটে, পশু নিয়ে বেড়িবাঁধের উঁচু রাস্তায়', 'Cut the ripe crop and take the animals up to the embankment road'), q('খাটো উফশী চারা লাগিয়ে রাখা', 'Leave the short high-yield seedlings in'), q('জমিতে থেকে পানি সেঁচা', 'Stay and bail the water out')],
        why: q('কোটালে খাটো চারা ডুবে মরে; পাকা ফসল আগেই কেটে উঁচুতে নিলে বাঁচে। পরের বার লম্বা জোয়ারসহিষ্ণু ধান আর ভাসমান ধাপ।', 'Short seedlings drown at spring tide; cut the ripe crop early and take it up high. Next time, tall tide-tolerant rice and floating beds.'),
        perk: 'warn', perkText: q('জোয়ারের সময় জানা: উঁচুতে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Tide times known: 10 seconds more to reach high ground'),
      },
      profit: glutQuiz(q('ধান', 'paddy'), q('হাটে', 'the market')),
    },
    intro: [
      q('আমি {name}। নদীঘেরা বাকেরগঞ্জে পানিই সব ঠিক করে।', 'I am {name}. In river-ringed Bakerganj, the water decides everything.'),
      q('নদীতে পলি জমে জোয়ারের ধরন বদলে গেছে। দিনে দুবার জোয়ার জমির ওপর দিয়ে বয়ে যায়।', 'Silt has changed the tides. Twice a day the water runs over the fields.'),
      q('এক শরতে ফসল পানি সামলে টিকল — তারপর রাতারাতি মাজরা পোকা মাঠ সাদা শীষে ভরে দিল।', 'One autumn the crop survived the water — then overnight the stem borers filled the field with white heads.'),
      q('উপজেলা কৃষি অফিসার দেখালেন FieldShift-এর জোয়ার আর পোকার আগাম সতর্কতা।', 'The upazila agriculture officer showed me FieldShift’s early warnings for the tides and the pests.'),
      q('চলুন, এবার পানি আর পোকা — দুটোকেই হারাই!', 'Let us beat both the water and the pests this time!'),
    ],
    lines: LINES({ storm: q('কোটাল আসছে! ফসল কেটে বাঁধে উঠি!', 'The spring tide! Cut the crop and up on the embankment!'), pest: q('মাজরা পোকা! আলোর ফাঁদ বসাই।', 'Stem borers! Set the light trap.'), dry: q('বালতি খালি — খালে যাই।', 'The can is empty — to the canal.') }),
  },

  mofizul: {
    ...BD, division: q('রংপুর', 'Rangpur'), dinner: q('পেলকা আর গরম ভাত', 'pelka and hot rice'), account: '/login',
    farmer: {
      bn: 'মো. মফিজুল ইসলাম', en: 'Md. Mofizul Islam', age: 41,
      trait: q('সাহসী, ঝুঁকি নেন', 'Bold; takes risks'),
      skill: q('চরের মানুষ: চরের বালুতে বালতির পানি বেশিক্ষণ থাকে', 'Char man: knows how to hold water in the sand'),
      dress: [q('নীল মাফলার', 'Blue muffler'), q('খয়েরি সোয়েটার', 'Brown sweater'), q('চেক লুঙ্গি', 'Checked lungi'), q('গোঁফ', 'A moustache')],
      speed: 3.9, run: 6.7, can: 7, sellBonus: 0, scanner: false, alertLead: 0, idle: 'wipe',
      look: { skin: '#c68a5e', hair: '#211a16', moustache: '#211a16', build: 1, head: 'bare', top: 'sweater', topA: '#7b5a3c', topB: '#5f4530', muffler: '#5b6fa8', lower: 'lungi', lowA: '#5a4a7a', lowB: '#a89ac8', feet: 'sandal', feetA: '#2f2a26' },
    },
    place: {
      bn: 'দক্ষিণ কোলকোন্দ, গঙ্গাচড়া, রংপুর', en: 'Dakshin Kolkonda, Gangachara, Rangpur', area: q('তিস্তার চর', 'The Teesta chars'),
      local: [q('তিস্তার বালুচর', 'The Teesta’s sand bars'), q('শীতের ঘন কুয়াশা', 'Thick winter fog'), q('কাশবন আর বাঁশঝাড়', 'Kash grass and bamboo'), q('হাঁড়িভাঙা আমগাছ', 'Haribhanga mango trees'), q('টিনের বাড়ি', 'Tin houses')],
      hazard: q('শৈত্যপ্রবাহ, কুয়াশা, আলুর মড়ক, চরের বালু', 'Cold waves, fog, potato late blight, char sand'),
    },
    names: { shed: q('বীজ-সারের দোকান', 'Seed and fertiliser shop'), water: q('শ্যালো টিউবওয়েল', 'Shallow tubewell'), market: q('ভ্যানে গঙ্গাচড়া হাট', 'Van to Gangachara market'), kiosk: q('ডিজিটাল কৃষক কেন্দ্র', 'Digital farmer centre'), safe: q('ইউনিয়ন পরিষদ (কম্বল বিতরণ)', 'Union Parishad (blankets handed out)') },
    world: 'char',
    crops: {
      potato: { bn: 'আলু', en: 'Potato', kind: 'potato', cost: 20, price: 85, grow: 40, thirst: 1.2, pest: 0.6 },
      maize: { bn: 'ভুট্টা', en: 'Maize', kind: 'maize', cost: 14, price: 58, grow: 36, thirst: 1, pest: 0.35 },
      mustard: { bn: 'সরিষা', en: 'Mustard', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 0.9, pest: 0.3 },
      lentil: { bn: 'মসুর ডাল', en: 'Lentil', kind: 'lentil', cost: 8, price: 30, grow: 22, thirst: 0.5, pest: 0.15, soil: true },
    },
    glut: 'potato', pestWord: q('মড়ক রোগ', 'late blight'),
    storm: { kind: 'fog', bn: 'শৈত্যপ্রবাহ আর ঘন কুয়াশা', en: 'Cold wave and dense fog' },
    quiz: {
      water: {
        q: q('তিস্তার চরের বালুতে সেচ আর সার চুইয়ে নিচে চলে যায়। কী করবেন?', 'On the Teesta char, water and fertiliser seep straight down through the sand. What do you do?'),
        options: [q('আরও বেশি করে পানি আর ইউরিয়া', 'More water and more urea'), ok('গর্ত করে তাতে জৈবসার আর মাটি ভরে চাষ (পিট চাষ)', 'Dig pits, fill them with compost and soil, and plant in them (pit cropping)'), q('চরে চাষ ছেড়ে দেওয়া', 'Give up the char')],
        why: q('জৈবসার ভরা গর্ত স্পঞ্জের মতো পানি ধরে রাখে — চরের বালুতেও কুমড়া, ভুট্টা ফলে।', 'A compost-filled pit holds water like a sponge — pumpkins and maize grow even in char sand.'),
        perk: 'drip', perkText: q('পিট চাষ: সব জমি ৩০% ধীরে শুকাবে', 'Pit cropping: every plot dries 30% slower'),
      },
      heat: MULCH(q('ফাল্গুনের শুকনো বাতাসে চরের মাটি দ্রুত শুকায়; খড়ের ঢাকনা পানি ধরে রাখে।', 'The dry spring wind dries the char fast; a straw cover holds the water in.')),
      pests: {
        q: q('FieldShift-এর সতর্কতা: ৪৮ ঘণ্টার মধ্যে কুয়াশা আর গুঁড়ি বৃষ্টি — আলুর মড়কের আবহাওয়া। কী করবেন?', 'FieldShift warns of fog and drizzle within 48 hours — late-blight weather. What do you do?'),
        options: [q('পাতা কালো হলে তখন দেখা যাবে', 'Wait until the leaves turn black'), ok('কর্মকর্তার পরামর্শে আগেভাগেই প্রতিরোধক ছত্রাকনাশক, আক্রান্ত গাছ তুলে ফেলা', 'A preventive fungicide on the officer’s advice before it strikes, and pull out any infected plants'), q('বেশি সেচ দেওয়া', 'Irrigate more')],
        why: q('মড়ক ৭২ ঘণ্টায় পুরো মাঠ কালো করে দিতে পারে। রোগ আসার আগে প্রতিরোধই একমাত্র উপায়।', 'Late blight can blacken a whole field in 72 hours. Prevention before it arrives is the only way.'),
        perk: 'neem', perkText: q('আগাম প্রতিরোধ: রোগ ধীরে ছড়াবে', 'Prevention first: blight spreads more slowly'),
      },
      storm: {
        q: q('হিমালয় থেকে শৈত্যপ্রবাহ — পাঁচ দিন ঘন কুয়াশা আর হাড়কাঁপানো ঠান্ডা। কী করবেন?', 'A cold wave from the Himalaya — five days of dense fog and bitter cold. What do you do?'),
        options: [ok('পাকা আলু তুলে শীতল ঘরে রাখা, নিজে গরম কাপড়ে ইউনিয়ন পরিষদের কম্বল নেওয়া', 'Lift the ripe potatoes into the cool chamber, and wrap up and fetch the Union Parishad’s blankets'), q('কুয়াশার মধ্যেও সারাদিন মাঠে কাজ', 'Work in the fog all day'), q('পাকা আলু মাঠেই রেখে দেওয়া', 'Leave the ripe potatoes in the ground')],
        why: q('কুয়াশা আর ভেজা ঠান্ডায় মাঠে রাখা আলু পচে, মানুষও অসুস্থ হয়। আলু তুলে শীতল ঘরে রাখলে দামও পরে ভালো পাওয়া যায়।', 'Potatoes left in fog and wet cold rot, and people fall ill. Lifted into a cool chamber, they also fetch a better price later.'),
        perk: 'warn', perkText: q('আগাম সতর্কতা: আশ্রয়ে যাওয়ার সময় ১০ সেকেন্ড বেশি', 'Early warning: 10 seconds more to reach shelter'),
      },
      profit: {
        q: q('আলু তোলার মৌসুমে হাটে দাম তলানিতে। কী করবেন?', 'At lifting time the potato price at market is at rock bottom. What do you do?'),
        options: [q('কাটার দিনই সব বেচে দেওয়া', 'Sell it all the day you lift it'), ok('শীতল ঘরে রেখে, FieldShift-এ দাম দেখে কয়েক সপ্তাহ পরে বেচা', 'Keep it in the cool chamber and sell weeks later, watching prices on FieldShift'), q('পরের বছর আলু বাদ', 'Give up potatoes next year')],
        why: q('সবাই একসঙ্গে বেচে বলে তোলার সময় দাম পড়ে। শীতল ঘরে রাখলে পরে অনেক ভালো দাম মেলে।', 'Prices fall at lifting time because everyone sells at once. Stored cool, potatoes fetch far more later.'),
        perk: 'market', perkText: q('শীতল ঘর: দাম পড়া অর্ধেক সময় থাকবে', 'Cool chamber: the price drop lasts half as long'),
      },
    },
    intro: [
      q('আমি {name}। উত্তরের রংপুরে শীত আনে আশা আর ভয় দুটোই।', 'I am {name}. In northern Rangpur, winter brings both hope and fear.'),
      q('জমানো টাকা আর গয়না বন্ধক রেখে ১.৬ একরে আলু লাগিয়েছিলাম।', 'I pawned our savings and jewellery to plant 1.6 acres of potatoes.'),
      q('জানুয়ারিতে পাঁচ দিন কুয়াশা আর গুঁড়ি বৃষ্টি — ৭২ ঘণ্টায় মড়ক সব পাতা কালো করে দিল।', 'In January came five days of fog and drizzle — in 72 hours the blight turned every leaf black.'),
      q('তিস্তার চরের বালুতে সেচ আর সার নিচে চলে যায়। তখন উপজেলা কৃষি অফিসারের দেখা পেলাম।', 'On the Teesta char the water and fertiliser drain away through the sand. That is when I met the upazila agriculture officer.'),
      q('এবার ৪৮ ঘণ্টা আগের সতর্কতা আর চরে গর্তে চাষ — চলুন!', 'This time, alerts 48 hours ahead and pit cropping on the char — come on!'),
    ],
    lines: LINES({ idle: q('উফ্‌, কী ঠান্ডা… হাত গরম করি।', 'Brr, so cold… let me warm my hands.'), storm: q('শৈত্যপ্রবাহ! আলু তুলে ইউনিয়ন পরিষদে যাই।', 'A cold wave! Lift the potatoes, then to the Union Parishad.'), pest: q('মড়কের আবহাওয়া! আগেই ব্যবস্থা নিই।', 'Blight weather! Act before it strikes.'), hurt: q('ঠান্ডায় কাবু হয়ে গেলাম…', 'The cold has got to me…') }),
  },

  rahima: {
    ...BD, division: q('সিলেট', 'Sylhet'), dinner: q('সাতকরা দিয়ে মাংস', 'meat with shatkora'), account: '/login',
    farmer: {
      bn: 'রহিমা বেগম', en: 'Rahima Begum', age: 37,
      trait: q('অদম্য, দূরদর্শী', 'Unstoppable and far-sighted'),
      skill: q('ফোনে সব জমির পানি দেখেন, সতর্কতা আগে পান', 'Sees every plot’s moisture, gets warnings early'),
      dress: [q('বেগুনি হিজাব', 'Purple hijab'), q('বেগুনি শাড়ি, সোনালি পাড়', 'Purple sari, gold border'), q('কাচের চুড়ি', 'Glass bangles'), q('হাতে ফোন', 'Phone in hand')],
      speed: 4.3, run: 7.1, can: 5, sellBonus: 0.05, scanner: true, alertLead: 6, idle: 'adjust',
      look: { skin: '#d8a47a', hair: '#15100c', build: 0.94, head: 'hijab', headA: '#6d4aa8', top: 'blouse', topA: '#5e3f94', topB: '#4e3480', lower: 'sari', lowA: '#6d4aa8', lowB: '#e2b84a', gold: '#e2b84a', sari: true, silver: '#e2b84a', bangle: '#d9a83a', feet: 'sandal', feetA: '#6b3b2a' },
    },
    place: {
      bn: 'কুড়িখোলা, গোয়াইনঘাট, সিলেট', en: 'Kurikhola, Gowainghat, Sylhet', area: q('হাওর আর পাহাড়ের দেশ', 'Haor wetland under the hills'),
      local: [q('মেঘালয়ের পাহাড়', 'The Meghalaya hills'), q('পিয়াইন নদীর পাথর', 'Stones of the Piyain river'), q('টিলায় সাতকরা-লেবুর বাগান', 'Shatkora and lemon on the hillocks'), q('হাওর আর হিজল গাছ', 'Haor water and hijal trees'), q('বাঁশের ঘর', 'Bamboo houses')],
      hazard: q('উজানের পাহাড়ি ঢল, নেক ব্লাস্ট, টক মাটি', 'Flash floods from upstream, neck blast, acid soil'),
    },
    names: { shed: q('বীজের দোকান', 'Seed shop'), water: q('খালের পাম্প (এলএলপি)', 'Canal pump (LLP)'), market: q('সালুটিকর হাটের দোকান', 'Salutikar market stall'), kiosk: q('ইউনিয়ন ডিজিটাল সেন্টার', 'Union Digital Centre'), safe: q('উঁচু টিলা', 'The high hillock') },
    world: 'haor',
    crops: {
      boro: { bn: 'বোরো ধান', en: 'Boro rice', kind: 'rice', cost: 14, price: 62, grow: 40, thirst: 1.6, pest: 0.4 },
      frenchbean: { bn: 'ফরাস শিম', en: 'French bean', kind: 'pea', cost: 10, price: 44, grow: 26, thirst: 0.7, pest: 0.2, soil: true },
      pineapple: { bn: 'আনারস', en: 'Pineapple', kind: 'pineapple', cost: 22, price: 92, grow: 44, thirst: 0.9, pest: 0.3 },
      mustard: { bn: 'সরিষা', en: 'Mustard', kind: 'mustard', cost: 10, price: 40, grow: 28, thirst: 1, pest: 0.35 },
    },
    glut: 'boro', pestWord: q('ব্লাস্ট রোগ', 'blast disease'),
    storm: { kind: 'flood', bn: 'পাহাড়ি ঢল', en: 'Flash flood' },
    quiz: {
      water: AWD,
      heat: FLOWER_HEAT,
      pests: {
        q: q('ধানের শীষের গোড়া কালো হয়ে ভেঙে পড়ছে — নেক ব্লাস্ট। কী করবেন?', 'The rice necks are blackening and snapping — neck blast. What do you do?'),
        options: [ok('ছবি তুলে কর্মকর্তাকে দেখানো, পরামর্শমতো শুধু আক্রান্ত জমিতে ছত্রাকনাশক', 'Show a photo to the officer, then fungicide only on the affected plots'), q('বেশি করে ইউরিয়া দেওয়া', 'Add more urea'), q('অপেক্ষা করা', 'Wait')],
        why: q('ব্লাস্ট দ্রুত ছড়ায়, আর বাড়তি ইউরিয়া রোগ আরও বাড়ায়। টক মাটিতে ডলোচুন দিলে গাছও শক্ত হয়।', 'Blast spreads fast, and extra urea makes it worse. Dolomite lime on the acid soil makes the plants sturdier too.'),
        perk: 'neem', perkText: q('ঠিক ওষুধ: রোগ ধীরে ছড়াবে', 'Right treatment: disease spreads more slowly'),
      },
      storm: {
        q: q('চেরাপুঞ্জিতে প্রবল বৃষ্টি — তিন দিনের মধ্যে পাহাড়ি ঢল। ধান ৮০% পেকেছে। কী করবেন?', 'Torrential rain at Cherrapunji — a flash flood within three days. The rice is 80% ripe. What do you do?'),
        options: [ok('৮০% পাকলেই কম্বাইন হারভেস্টার ডেকে ধান কেটে টিলায় তোলা', 'Call the combine harvester and cut at 80% ripe, then take it up the hill'), q('পুরো পাকা পর্যন্ত অপেক্ষা', 'Wait until it is fully ripe'), q('আইল উঁচু করে পানি আটকানো', 'Raise the bunds to hold back the water')],
        why: q('দুই বছর আগে কাটার মাত্র দশ দিন আগে ঢলে রহিমা ছয় ঘণ্টায় সারা বছরের খাবার হারিয়েছিলেন। ব্রির পরামর্শ: ৮০% পাকলেই কাটুন।', 'Two years ago, ten days before harvest, a flash flood took Rahima’s year of food in six hours. BRRI’s advice: cut at 80% ripe.'),
        perk: 'early', perkText: q('আগাম কাটা: ৮০% পাকলেই ফসল তোলা যাবে', 'Early cutting: crops can be harvested at 80% ripe'),
      },
      profit: {
        q: q('ধান কাটার মৌসুমে হাটে দাম অনেক কম। কী করবেন?', 'At harvest time the market price of paddy is very low. What do you do?'),
        options: [q('কাটার দিনই সব বেচে দেওয়া', 'Sell it all the day it is cut'), ok('ধান শুকিয়ে রেখে, সরকারি ক্রয়কেন্দ্রে বা দাম বাড়লে বেচা', 'Dry and store it, sell to the government procurement centre or when prices rise'), q('পরের বছর ধান চাষ বাদ', 'Give up rice next year')],
        why: q('কাটার মৌসুমে সবাই একসঙ্গে বেচে বলে দাম পড়ে। শুকিয়ে রাখলে বা সরকারি দামে বেচলে লাভ বাঁচে।', 'Prices fall at harvest because everyone sells at once. Storing dry paddy, or selling at the government price, protects the profit.'),
        perk: 'market', perkText: q('বাজারের খবর: দাম পড়া অর্ধেক সময় থাকবে', 'Market news: the price drop lasts half as long'),
      },
    },
    intro: [
      q('আমি {name}। চার বছর আগে স্বামী শয্যাশায়ী হলে আমি নিজেই গোয়াইনঘাটের কাদামাঠে নামলাম।', 'I am {name}. When my husband was bedridden four years ago, I went into Gowainghat’s muddy fields myself.'),
      q('লাঙল আর বাজারে মেয়েদের নিয়ে কানাকানি শুনেছি — তবু থামিনি।', 'I heard the whispers about women at the plough and in the market — I did not stop.'),
      q('দুই বছর আগে, কাটার দশ দিন আগে, মাঝরাতে পাহাড়ি ঢল বাঁধ ভেঙে নামল। ছয় ঘণ্টায় সারা বছরের খাবার গেল।', 'Two years ago, ten days before harvest, a flash flood broke the dyke at midnight. Six hours took our year of food.'),
      q('পাহাড়ের পানি যেন আর সন্তানদের ভবিষ্যৎ কেড়ে নিতে না পারে, তাই FieldShift-এ যোগ দিলাম।', 'So that the hill water never takes my children’s future again, I joined FieldShift.'),
      q('এবার ঢলের আগেই ধান ঘরে তুলব। চলুন!', 'This time the rice comes home before the flood. Let us go!'),
    ],
    lines: LINES({ hello: q('আসসালামু আলাইকুম! আজ অনেক কাজ, চলেন।', 'Salaam! Lots to do today, come on.'), idle: q('দেখি তো মেঘালয়ে আজ কত বৃষ্টি…', 'Let me check the rain in Meghalaya today…'), storm: q('ঢল আসছে! ধান কেটে টিলায় উঠি!', 'The flood is coming! Cut the rice and up the hill!'), pest: q('ব্লাস্ট! কর্মকর্তাকে ছবি পাঠাই।', 'Blast! A photo to the officer.'), dry: q('বালতি খালি, পাম্পে যাই।', 'Can is empty, to the pump.'), win: q('হিসাব মিলেছে, সন্তানদের মুখে হাসি!', 'The sums add up — and my children are smiling!') }),
  },
};
