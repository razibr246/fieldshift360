// "স্বপ্নের মাঠ" (The Dream Field), the children's version of মাঠের মানুষ. Each of the twelve farmers has a child (or a
// younger brother, or a grandchild). One night the child hears the grown-up worry about the coming storm and falls
// asleep; in the dream Tara, a chatty NASA satellite, takes the child up to see the family's field from space and
// back down to help: catch the rain clouds (GPM), cover the bare soil before the storm (MODIS bare months), give the
// field just enough water (SMAP), then walk through two doors, the season without the data and the season with it.
// In the morning the child runs to tell the grown-up. The facts Tara says are the place's real NASA records
// (engine/landsat.js landSummary); the people are made up. Pure: no rendering here.
const q = (bn, en) => ({ bn, en });
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const bnNum = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
const MONTHS = [q('জানুয়ারি', 'January'), q('ফেব্রুয়ারি', 'February'), q('মার্চ', 'March'), q('এপ্রিল', 'April'), q('মে', 'May'), q('জুন', 'June'),
  q('জুলাই', 'July'), q('আগস্ট', 'August'), q('সেপ্টেম্বর', 'September'), q('অক্টোবর', 'October'), q('নভেম্বর', 'November'), q('ডিসেম্বর', 'December')];

// The child of each farmer in মাঠের মানুষ (regions.js ids), what they call the grown-up, and where NASA's records are kept.
export const CHILDREN = {
  razib: { name: q('তুহিন', 'Tuhin'), age: 9, girl: false, calls: q('ভাইয়া', 'Bhaiya'), rel: q('রাজিবের ছোট ভাই', 'Razib’s little brother'), land: 'dhamrai', item: 'boat' },
  rahimu: { name: q('নাজমা', 'Nazma'), age: 9, girl: true, calls: q('আব্বা', 'Abba'), rel: q('রহিম উদ্দিনের মেয়ে', 'Rahim Uddin’s daughter'), land: 'godagari', item: 'bag' },
  didarul: { name: q('আরিফ', 'Arif'), age: 8, girl: false, calls: q('আব্বু', 'Abbu'), rel: q('দিদারুল আলমের ছেলে', 'Didarul Alam’s son'), land: 'sitakunda', item: 'pinwheel' },
  prahlad: { name: q('পূজা', 'Puja'), age: 10, girl: true, calls: q('বাবা', 'Baba'), rel: q('প্রহ্লাদ চন্দ্র রায়ের মেয়ে', 'Prahlad Chandra Roy’s daughter'), land: 'dacope', item: 'lantern' },
  kader: { name: q('রাফি', 'Rafi'), age: 7, girl: false, calls: q('আব্বা', 'Abba'), rel: q('আবদুল কাদের হাওলাদারের ছেলে', 'Abdul Kader Howlader’s son'), land: 'bakerganj', item: 'kite' },
  mofizul: { name: q('সুমি', 'Sumi'), age: 9, girl: true, calls: q('আব্বা', 'Abba'), rel: q('মফিজুল ইসলামের মেয়ে', 'Mofizul Islam’s daughter'), land: 'gangachara', item: 'basket' },
  rahima: { name: q('জুয়েল', 'Jewel'), age: 8, girl: false, calls: q('মা', 'Ma'), rel: q('রহিমা বেগমের ছেলে', 'Rahima Begum’s son'), land: 'gowainghat', item: 'flute' },
  harjinder: { name: q('সিমরন', 'Simran'), age: 9, girl: true, calls: q('পাপা', 'Papa'), rel: q('হরজিন্দর সিংয়ের মেয়ে', 'Harjinder Singh’s daughter'), land: 'india', item: 'pouch' },
  ghulam: { name: q('আলী', 'Ali'), age: 8, girl: false, calls: q('বাবা', 'Baba'), rel: q('গোলাম নবী চান্ডিওর ছেলে', 'Ghulam Nabi Chandio’s son'), land: 'pakistan', item: 'toy' },
  rampyari: { name: q('সীতা', 'Sita'), age: 9, girl: true, calls: q('আমা', 'Aama'), rel: q('রামপ্যারী চৌধুরীর মেয়ে', 'Rampyari Chaudhary’s daughter'), land: 'nepal', item: 'slate' },
  kinley: { name: q('তাশি', 'Tashi'), age: 8, girl: false, calls: q('আমা', 'Ama'), rel: q('কিনলে ওয়াংমোর ছেলে', 'Kinley Wangmo’s son'), land: 'bhutan', item: 'wheel' },
  kyawwin: { name: q('মিন থু', 'Min Thu'), age: 9, girl: false, calls: q('দাদু', 'Grandpa'), rel: q('উ চ উইনের নাতি', 'U Kyaw Win’s grandson'), land: 'myanmar', item: 'cricket' },
};
export const CHILD_IDS = Object.keys(CHILDREN);
export const WOMEN = ['rahima', 'rampyari', 'kinley'];

// Moods drive the grown-up's animation, the colour of the light and the music.
// Peaceful motion constraint: no combat or violent defeat animation.
export const MOODS = {
  worried: { anim: 'SitDown', grade: 'night', music: 'soft' },
  calm: { anim: 'Idle', grade: 'night', music: 'soft' },
  wonder: { anim: 'Idle', grade: 'space', music: 'wonder' },
  play: { anim: 'Idle', grade: 'day', music: 'play' },
  sad: { anim: 'Defeat', grade: 'grey', music: 'sad' },
  joy: { anim: 'Victory', grade: 'gold', music: 'joy' },
  morning: { anim: 'Idle', grade: 'dawn', music: 'joy' },
};

// What NASA's records say about this place, in a child's words. land: landSummary(child.land) or null.
export function tarasFacts(land) {
  const lean = land?.green?.lean ?? [];
  const stress = land?.stressYears ?? [];
  const heat = land?.heat?.change ?? null;
  const months = (lang) => lean.map((m) => MONTHS[m - 1][lang]).join(lang === 'bn' ? ', ' : ', ');
  return {
    lean, stress, heat,
    bare: lean.length
      ? q(`আমার MODIS চোখে দেখি, ${months('bn')} মাসে এখানকার মাঠ সবচেয়ে বেশি খালি পড়ে থাকে। খালি মাটি বৃষ্টিতে ধুয়ে যায়!`, `With my MODIS eyes I see the fields here lie barest in ${months('en')}. Bare soil washes away in the rain!`)
      : q('আমার MODIS চোখে দেখি, বছরের কিছু মাসে মাঠ খালি পড়ে থাকে। খালি মাটি বৃষ্টিতে ধুয়ে যায়!', 'With my MODIS eyes I see the fields lie bare for part of the year. Bare soil washes away in the rain!'),
    stressed: stress.length
      ? q(`${bnNum(stress[stress.length - 1])} সালের রবিতে এখানকার ফসল খুব কষ্টে ছিল, আমি ওপর থেকে দেখেছি।`, `In the Rabi of ${stress[stress.length - 1]} the crops here had a really hard time. I saw it from up here.`)
      : q('এখানকার ফসল বেশিরভাগ বছর ভালোই থাকে, তবু আমি রোজ নজর রাখি।', 'The crops here do well most years, but I keep watch every day.'),
    hot: heat != null && heat > 0.2
      ? q(`আগের চেয়ে এখন গরমকালে মাটি প্রায় ${bnNum(Math.round(heat * 10) / 10)} ডিগ্রি বেশি গরম হয়।`, `In the hot months the ground is now about ${Math.round(heat * 10) / 10} degrees hotter than it used to be.`)
      : q('গরমকালে মাটি খুব তেতে ওঠে, আমি তাপও মাপি।', 'The ground gets very hot in summer. I measure that too.'),
  };
}

// The whole dream for one child, scene by scene. region: REGIONS[id] (regions.js); land: landSummary(child.land).
export function dreamFor(id, region, land = null) {
  const c = CHILDREN[id];
  if (!c || !region) return null;
  const p = region.farmer, storm = region.storm ?? q('ঝড়', 'storm');
  const f = tarasFacts(land);
  const kid = c.name, call = c.calls;
  const L = (bn, en) => ({ bn, en });
  const line = (who, mood, bn, en) => ({ who, mood, ...L(bn, en) });
  return {
    id, child: c, parent: { name: q(p.bn, p.en), woman: WOMEN.includes(id), skin: p.look?.skin ?? '#b77b52' },
    place: q(region.place.bn, region.place.en), storm: q(storm.bn, storm.en), facts: f,
    scenes: [
      { id: 'night', kind: 'story', mood: 'worried', title: q('রাতের চিন্তা', 'A worried night'), lines: [
        line('parent', 'worried', `এবার যদি ${storm.bn} আসে, মাঠের ফসল কি বাঁচবে… কে জানে।`, `If the ${storm.en.toLowerCase()} comes this year, will the crop survive… who knows.`),
        line('child', 'worried', `${call.bn}, তুমি এত চুপ কেন?`, `${call.en}, why are you so quiet?`),
        line('parent', 'calm', `কিছু না রে ${kid.bn}। যা, ঘুমিয়ে পড়।`, `It’s nothing, ${kid.en}. Go to sleep now.`),
      ], action: { kind: 'hug', prompt: q(`${call.bn}কে একটা জড়িয়ে ধরো`, `Give ${call.en} a hug`), after: line('parent', 'calm', 'হা হা… তোর জন্যই তো সব। শুভরাত্রি।', 'Ha ha… you’re what it’s all for. Good night.') } },
      { id: 'tara', kind: 'story', mood: 'wonder', title: q('তারা এল', 'Tara arrives'), lines: [
        line('tara', 'wonder', `টুং-টাং! ভয় পেয়ো না ${kid.bn}, আমি তারা, নাসার একটা উপগ্রহ। দিনে ষোলোবার পৃথিবী ঘুরি, একটুও মাথা ঘোরে না… আচ্ছা, একটু ঘোরে।`, `Ting-tang! Don’t be scared, ${kid.en}. I’m Tara, a NASA satellite. I go round the Earth sixteen times a day and I never get dizzy… okay, a little.`),
        line('tara', 'wonder', `তোমার ${call.bn}র চিন্তা আমি ওপর থেকে শুনেছি। চলো, তোমাদের মাঠটা আকাশ থেকে দেখাই!`, `I heard your ${call.en} worrying, all the way up here. Come, let me show you your field from the sky!`),
        line('child', 'wonder', 'ওয়াও! পৃথিবী এত নীল!', 'Wow! The Earth is so blue!'),
        line('tara', 'wonder', f.stressed.bn, f.stressed.en),
      ], action: { kind: 'find', prompt: q('জ্বলজ্বলে বিন্দুটায় চাপো: ওটাই তোমাদের বাড়ি!', 'Tap the glowing dot: that’s your home!') } },
      { id: 'clouds', kind: 'game', game: 'clouds', mood: 'play', title: q('মেঘ ধরো', 'Catch the clouds'), lines: [
        line('tara', 'play', 'আমার বন্ধু GPM উপগ্রহ প্রতি আধ ঘণ্টায় বৃষ্টি মাপে। কালো মেঘগুলো ধরো, তাহলে জানব ঝড় কবে আসছে!', 'My friend the GPM satellite measures the rain every half hour. Catch the dark clouds and we’ll know when the storm is coming!'),
      ], win: line('tara', 'joy', `দারুণ! এখন জানি ${storm.bn} আসছে তিন দিন পরে। তিন দিন মানে প্রস্তুত হওয়ার সময়!`, `Brilliant! Now we know the ${storm.en.toLowerCase()} is coming in three days. Three days is time to get ready!`) },
      { id: 'blanket', kind: 'game', game: 'blanket', mood: 'play', title: q('মাটির কম্বল', 'A blanket for the soil'), lines: [
        line('tara', 'play', f.bare.bn, f.bare.en),
        line('tara', 'play', 'খালি জায়গায় মুগ ডাল লাগাও, ওরা মাটির সবুজ কম্বল। আর ভোলা ছাগলটাকে তাড়াও, ও সব খেয়ে ফেলবে!', 'Plant mung beans on the bare patches: they’re the soil’s green blanket. And shoo Bhola the goat, or he’ll eat everything!'),
      ], win: line('tara', 'joy', 'মুগ ডালের শিকড় বাতাস থেকে নাইট্রোজেন ধরে, মাটি নিজেই সার পায়। জাদু না, বিজ্ঞান!', 'Mung bean roots catch nitrogen from the air, so the soil feeds itself. Not magic, science!') },
      { id: 'water', kind: 'game', game: 'water', mood: 'play', title: q('কতটুকু পানি?', 'How much water?'), lines: [
        line('tara', 'play', 'SMAP উপগ্রহ মাটির নিচের পানি মাপে। পাম্প চালাও, কিন্তু সবুজ দাগে থামো: কম দিলে মাটি ফাটে, বেশি দিলে…', 'The SMAP satellite measures the water in the soil. Run the pump, but stop in the green: too little and the soil cracks, too much and…'),
        line('frog', 'play', 'ঘ্যাঙর-ঘ্যাং! বেশি দিলে আমার পুকুর হয়ে যাবে, হি হি!', 'Ribbit! Too much and it turns into my pond, hee hee!'),
      ], win: line('tara', 'joy', 'একদম ঠিক! পানি বাঁচল, পাম্পের তেলও বাঁচল। আর মাটির নিচের পানিও।', 'Just right! Water saved, pump fuel saved, and the water under the ground too.') },
      { id: 'without', kind: 'door', mood: 'sad', title: q('প্রথম দরজা: তথ্য না থাকলে', 'Door one: without the data'), lines: [
        line('tara', 'sad', 'এই দরজার ওপারে এমন একটা মৌসুম, যেখানে কেউ আগে জানতে পারেনি।', 'Behind this door is a season where nobody could know in time.'),
        line('parent', 'sad', `হঠাৎ ${storm.bn}… সব শেষ। এত পরিশ্রম…`, `The ${storm.en.toLowerCase()}, out of nowhere… it’s all gone. All that work…`),
        line('child', 'sad', `${call.bn}… কেঁদো না। তোমার তো দোষ ছিল না।`, `${call.en}… don’t cry. It wasn’t your fault.`),
        line('tara', 'sad', 'ঠিক বলেছ। আগে থেকে দেখতে না পেলে সবচেয়ে ভালো কৃষকও হেরে যান।', 'That’s right. If you can’t see it coming, even the best farmer loses.'),
      ], action: { kind: 'comfort', prompt: q(`${call.bn}র হাত ধরো`, `Hold ${call.en}’s hand`) } },
      { id: 'with', kind: 'door', mood: 'joy', title: q('দ্বিতীয় দরজা: ফিল্ডশিফট ৩৬০ আর নাসার চোখ থাকলে', 'Door two: with FieldShift 360 and NASA’s eyes'), lines: [
        line('tara', 'joy', 'এবার একই মৌসুম, কিন্তু তিন দিন আগে ফোনে সতর্কতা এল।', 'Now the same season, but a warning came on the phone three days early.'),
        line('parent', 'joy', 'নালা কেটেছি, পাকা ফসল আগে কেটে ঘরে তুলেছি, আর খালি মাটিতে ডাল দিয়েছি। কৃষি কর্মকর্তাও বলেছিলেন!', 'I dug the drains, brought the ripe crop in early, and sowed pulses on the bare soil. The agriculture officer said so too!'),
        line('child', 'joy', 'হুররে! আমরা বেঁচে গেছি!', 'Hooray! We made it!'),
        line('tara', 'joy', 'সব ঝড় থামানো যায় না। কিন্তু আগে জানলে প্রস্তুত হওয়া যায়, আর সিদ্ধান্তটা তখনও তোমার পরিবারেরই।', 'Not every storm can be stopped. But knowing early means you can get ready, and the decision is still your family’s.'),
      ], action: { kind: 'dance', prompt: q('সবাই মিলে নাচো!', 'Dance together!') } },
      { id: 'morning', kind: 'story', mood: 'morning', title: q('সকাল', 'Morning'), lines: [
        line('child', 'morning', `${call.bn}! ${call.bn}! আমি স্বপ্নে নাসার উপগ্রহ দেখেছি!`, `${call.en}! ${call.en}! I saw a NASA satellite in my dream!`),
        line('child', 'morning', 'ফোনে ফিল্ডশিফট ৩৬০ খোলো, আর কৃষি অফিসে জিজ্ঞেস করো। ঝড়ের আগে জানা যায়!', 'Open FieldShift 360 on the phone, and ask the agriculture office. You can know before the storm!'),
        line('parent', 'joy', `আমার ছোট্ট বিজ্ঞানী! চল, আজই দেখি।`, 'My little scientist! Come on, let’s look today.'),
      ], action: { kind: 'run', prompt: q(`${call.bn}র কাছে দৌড়াও`, `Run to ${call.en}`) } },
    ],
  };
}

// ---- the mini-games' rules (the scene reports what happened; these decide stars and what Tara says) ----
// Stars: 3 for a clear win, 2 for most of it, 1 for trying; nobody fails a dream.
export function cloudStars(caught, dark, totalDark) {
  if (!totalDark) return 1;
  const share = dark / totalDark;
  return share >= 0.8 ? 3 : share >= 0.5 ? 2 : 1;
}
export function blanketStars(covered, total, eaten = 0) {
  const share = total ? Math.max(0, covered - eaten) / total : 0;
  return share >= 0.9 ? 3 : share >= 0.6 ? 2 : 1;
}
// The water meter runs 0–100; the green band is where the soil is moist but not flooded.
export const WATER_BAND = [45, 70];
export function waterResult(level) {
  if (level < WATER_BAND[0]) return { kind: 'dry', stars: level >= WATER_BAND[0] - 15 ? 2 : 1, say: q('মাটি এখনো তৃষ্ণার্ত, ফাটল দেখা যাচ্ছে!', 'The soil is still thirsty: look at the cracks!') };
  if (level > WATER_BAND[1]) return { kind: 'flood', stars: level <= WATER_BAND[1] + 15 ? 2 : 1, say: q('ঘ্যাঙর-ঘ্যাং! পুকুর হয়ে গেছে! শিকড় দম নিতে পারছে না।', 'Ribbit! It’s a pond! The roots can’t breathe.') };
  return { kind: 'just', stars: 3, say: q('একদম ঠিক!', 'Just right!') };
}

// The badges a child takes back to the morning, from the stars of each game.
export const BADGES = {
  clouds: q('মেঘ-শিকারি', 'Cloud catcher'),
  blanket: q('মাটির বন্ধু', 'Friend of the soil'),
  water: q('পানির হিসাবি', 'Water wizard'),
  heart: q('সাহসী হৃদয়', 'Brave heart'),
};
export function badgesFor(stars) {
  const out = Object.entries(stars).filter(([k, s]) => BADGES[k] && s >= 2).map(([k]) => k);
  out.push('heart'); // every child who walked through both doors earns it
  return out;
}
export const totalStars = (stars) => Object.values(stars).reduce((a, s) => a + (s ?? 0), 0);
