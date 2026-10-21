// Each farmer's home ground as they know it: the named places of their village, each with a memory told in their own
// words when they walk into it (shown like a location name in a battle-royale game), the neighbours who live and work
// around them, the shop signs in the local script, and what they say at dawn and dusk. Plain data: the simulation
// (sim.js) finds the places, three/life.js draws the neighbours and signs. Positions are metres, x east, z south, on
// each world's own layout in layout.js; sim.test.js checks every place and route stays on dry, walkable ground.
const q = (bn, en) => ({ bn, en });
// A point is [x, z], or [station, dx, dz] — a few metres from one of the world's stations (layout.js), so people and
// places stay beside the house or the ghat wherever that world puts them.
export const spot = (S, p) => (typeof p[0] === 'string' ? [S[p[0]].x + (p[1] ?? 0), S[p[0]].z + (p[2] ?? 0)] : p);

// ---- how the neighbours dress ----
const sariWoman = (lowA, lowB, o = {}) => ({ skin: '#b98260', hair: '#15100c', build: 0.92, head: 'aanchal', headA: lowA, headB: lowB, top: 'blouse', topA: lowB, topB: lowA, lower: 'sari', lowA, lowB, gold: '#e2b84a', sari: true, feet: 'sandal', feetA: '#3a2a1e', bangle: '#c9a24a', ...o });
const lungiMan = (lowA, lowB, o = {}) => ({ skin: '#9c6644', hair: '#1d1714', build: 1, head: 'bare', top: 'genji', topA: '#f1efe8', topB: '#d7d2c4', lower: 'lungi', lowA, lowB, feet: 'sandal', feetA: '#2f2a26', ...o });
const schoolKid = (o = {}) => ({ skin: '#b98260', hair: '#15100c', build: 0.66, head: 'bare', top: 'shirt', topA: '#f4f4f0', topB: '#e4e6ea', lower: 'pyjama', lowA: '#1f3560', lowB: '#1f3560', feet: 'shoe', feetA: '#1a1a1a', ...o });
const monk = (o = {}) => ({ skin: '#b98260', hair: '#4a3a30', build: 0.98, head: 'bare', top: 'kurta', topA: '#7d2424', topB: '#6a1d1d', lower: 'longyi', lowA: '#7d2424', lowB: '#7d2424', chador: '#8a2a24', feet: 'sandal', feetA: '#2f2a26', ...o });

export const PLACES = {
  // ---------------- Bangladesh ----------------
  razib: {
    places: [
      { id: 'home', at: ['house', 4, 3], r: 5, name: q('রাজিবদের উঠান', 'Razib’s courtyard'), line: q('ভোরে মা এই উঠানে ধান শুকান। আমি এখানে বসেই ফোনে দেখি কোন জমিতে পানি লাগবে।', 'At dawn Mother dries paddy in this courtyard. I sit right here and check on my phone which plot needs water.') },
      { id: 'field', at: [6, 9], r: 6, name: q('চৌহাটের মাঠ', 'The Chauhat fields'), line: q('দাদার আমলের জমি — তিন পুরুষ ধরে এই মাটিতে ধান হয়।', 'Grandfather’s land — three generations of rice from this soil.') },
      { id: 'river', at: [2, 31], r: 6, name: q('বংশী নদীর পাড়', 'The bank of the Bangshi'), line: q('ছোটবেলায় বংশীতে সাঁতার শিখেছি। এখন কারখানার রঙিন পানি নামে, মাছ কমে গেছে।', 'I learnt to swim in the Bangshi. Now coloured water comes down from the factories and there are fewer fish.') },
      { id: 'hat', at: ['market', -5, -1], r: 4.5, name: q('পাকা রাস্তার ভ্যানস্ট্যান্ড', 'The van stand on the paved road'), line: q('পাকা রাস্তা হওয়ার পর ভ্যানে কালামপুর হাট আধা ঘণ্টা, ঢাকার পাইকাররা ভোরেই আসে। কিন্তু রাস্তার ধারে এখন জমির বদলে কারখানা উঠছে।', 'Since the road was paved, Kalampur market is half an hour by van and the Dhaka buyers come at dawn. But along the road, factories are going up where fields were.') },
      { id: 'kilns', at: [-20, -29], r: 6, name: q('ইটভাটার দিক', 'Towards the brick kilns'), line: q('ভাটার জন্য লোকে জমির উপরের মাটি বেচে দেয় — সেই জমিতে আর ভালো ধান হয় না। শীতে ধোঁয়ায় আকাশ ধূসর।', 'People sell their topsoil to the kilns, and that land never grows good rice again. In winter the smoke turns the sky grey.') },
      { id: 'school', at: ['safe', 5, 6], r: 5, name: q('চৌহাট স্কুলমাঠ', 'The Chauhat school ground'), line: q('এই স্কুলেই পড়েছি। বড় বন্যায় গ্রামের সবাই এই পাকা ঘরে উঠেছিল।', 'I went to this school. In the big flood the whole village climbed into this brick building.') },
    ],
    folk: [
      { id: 'ma', name: q('মা', 'Mother'), look: sariWoman('#2e7d4f', '#e2b84a', { skin: '#c08a66', hair: '#6d6862' }), does: 'work', at: ['house', 3, 3], hello: q('বাবা, দুপুরে ভাত খেতে আসিস!', 'Come home for rice at noon, son!') },
      { id: 'van', name: q('ভ্যানচালক করিম', 'Karim, the van driver'), look: lungiMan('#7a3b2e', '#d9a066', { head: 'gamcha', headA: '#c0392b', headB: '#f3eee4' }), does: 'walk', route: [[-13, -14], [28, -14]], hello: q('রাজিব ভাই, হাটে যাবেন? ভ্যান রেডি!', 'Razib bhai, off to market? The van is ready!') },
      { id: 'jamal', name: q('প্রতিবেশী জামাল চাচা', 'Jamal chacha next door'), look: lungiMan('#2f4f7a', '#8aa8cf', { top: 'fotua', topA: '#e9e4d6', topB: '#cfc8b6', head: 'tupi', headA: '#f7f5ef', beard: '#d9d4cc', hair: '#cfc9c0' }), does: 'work', at: [8, 10], hello: q('রাজিব, জাব পোকার ওষুধ কোনটা দিলি? ফোনে দেখাস তো।', 'Razib, which spray did you use for the aphids? Show me on the phone.') },
      { id: 'kid', name: q('স্কুলের ছেলে', 'A schoolboy'), look: schoolKid(), does: 'walk', route: [[-3, -15], [-3, -28]], hello: q('স্লামালিকুম ভাইয়া!', 'Salam, bhaiya!') },
    ],
    signs: { shed: { t: 'মায়ের দোয়া বীজ ভান্ডার' }, market: { t: 'কালামপুর হাট' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'চৌহাট প্রাথমিক বিদ্যালয়' } },
    dawn: q('ফজরের আজান হয়ে গেছে — কুয়াশা কাটার আগেই মাঠে যাই।', 'The dawn azan has gone — out to the field before the mist lifts.'),
    dusk: q('মাগরিবের আগে কাজ গুছিয়ে নিই।', 'Let me finish up before the evening prayer.'),
  },
  rahimu: {
    places: [
      { id: 'home', at: ['house', -4, 4], r: 5, name: q('লাল মাটির বাড়ি', 'The red-earth house'), line: q('বরেন্দ্রের লাল মাটির দেয়াল — গরমে ঠান্ডা থাকে, শীতে গরম।', 'Walls of red Barind earth — cool in the heat, warm in the cold.') },
      { id: 'orchard', at: [-29, 10], r: 6, name: q('আমবাগান', 'The mango orchard'), line: q('ফজলি আর ল্যাংড়া — জ্যৈষ্ঠ মাসে রাজশাহীর আম ট্রাকে করে ঢাকা যায়।', 'Fazli and Langra — in Jyoishtho, Rajshahi’s mangoes go to Dhaka by the truckload.') },
      { id: 'bmda', at: ['water', 3, 3], r: 5, name: q('বিএমডিএর গভীর নলকূপ', 'The BMDA deep tube well'), line: q('কার্ডে টাকা ভরে পানি কিনি। প্রতি বছর পানির স্তর আরও নিচে নামে।', 'I top up a card and buy water by the hour. Every year the water table is lower.') },
      { id: 'palms', at: [-17, -12], r: 5, name: q('তালগাছের সারি', 'The row of palmyras'), line: q('বজ্রপাত থেকে বাঁচতে সরকার আলে আলে তালগাছ লাগাতে বলেছে। কালবৈশাখীতে খোলা মাঠ ভয়ের।', 'The government asks us to plant palmyras along the bunds against lightning. Open fields are frightening in a nor’wester.') },
      { id: 'padma', at: [0, -40], r: 6, name: q('পদ্মার চরের ধার', 'The edge of the Padma char'), line: q('ওপারে ভারত। শুকনো মৌসুমে পদ্মা এত সরে যায় যে হেঁটে চরে যাওয়া যায়।', 'India is across the water. In the dry season the Padma shrinks so far you can walk out onto the char.') },
    ],
    folk: [
      { id: 'wife', name: q('রহিমের স্ত্রী', 'Rahim’s wife'), look: sariWoman('#a0302b', '#e8c46a', { skin: '#a8704a' }), does: 'work', at: ['house', -3, 3], hello: q('রোদে বেশি ঘুরো না, পানি খেয়ে যাও।', 'Don’t stay long in this sun — drink some water.') },
      { id: 'op', name: q('নলকূপের অপারেটর', 'The tube-well operator'), look: lungiMan('#3c5a3a', '#9cbf8a', { top: 'shirt', topA: '#5a7fa8', topB: '#c9d8ea' }), does: 'stand', at: ['water', 2, 1.5], hello: q('কার্ডে টাকা আছে তো? আজ বিদ্যুৎ যাবে বিকেলে।', 'Money on your card? The power goes off this afternoon.') },
      { id: 'goatboy', name: q('ছাগল নিয়ে ছেলে', 'Boy with the goats'), look: schoolKid({ top: 'genji', topA: '#e8e2d2', lower: 'lungi', lowA: '#6a4a8a', lowB: '#b9a6d6', feet: 'sandal', feetA: '#3a2a1e' }), does: 'walk', route: [[-12, 4], [-19, 11]], hello: q('চাচা, আম পাকলে একটা দিও!', 'Uncle, save me a mango when they ripen!') },
    ],
    signs: { shed: { t: 'বরেন্দ্র বীজ ভান্ডার' }, market: { t: 'কাঁকনহাট' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'সরকারি প্রাথমিক বিদ্যালয়' } },
    dawn: q('সূর্য চড়ার আগেই সেচের কাজ সারি — দুপুরে বরেন্দ্রের রোদ আগুন।', 'Watering before the sun climbs — the Barind sun is fire by noon.'),
    dusk: q('আমবাগানে বাদুড় নামছে, দিন শেষ।', 'The bats are coming down to the orchard — that’s the day done.'),
  },
  didarul: {
    places: [
      { id: 'trellis', at: [24, -2], r: 5, name: q('শিমের মাচা', 'The bean trellises'), line: q('সীতাকুণ্ডের শিম সারা দেশে যায়। বর্ষা শেষ হতেই বাঁশ কেটে মাচা বাঁধি।', 'Sitakunda’s beans go all over the country. As soon as the rains end I cut bamboo and tie the trellises.') },
      { id: 'hills', at: [36, -4], r: 6, name: q('পাহাড়ের পাদদেশ', 'The foot of the hills'), line: q('ওই চূড়ায় চন্দ্রনাথ মন্দির। ভারী বর্ষণে পাহাড় থেকে ঢল নামে, মাটি ধসে পড়ে।', 'Chandranath temple is up on that peak. In heavy rain torrents rush down the hills and the slopes slide.') },
      { id: 'sea', at: [-40, -4], r: 6, name: q('সাগরের দিক', 'Towards the sea'), line: q('ওদিকে জাহাজভাঙা ইয়ার্ড। লোনা বাতাস এলে শিমের পাতা পুড়ে যায়।', 'The ship-breaking yards are that way. When the salty wind blows, the bean leaves scorch.') },
      { id: 'shelter', at: ['safe', 0, -5], r: 5, name: q('ঘূর্ণিঝড় আশ্রয়কেন্দ্র', 'The cyclone shelter'), line: q('আব্বা ১৯৯১-এর ঘূর্ণিঝড়ের গল্প বলেন — তখন এমন আশ্রয়কেন্দ্র ছিল না।', 'Father talks about the 1991 cyclone — there were no shelters like this then.') },
      { id: 'hat', at: ['market', 3, -3], r: 4.5, name: q('মহাসড়কের আড়ত', 'The highway depot'), line: q('পাইকাররা ট্রাকে শিম তুলে ঢাকা-চট্টগ্রাম মহাসড়ক ধরে সোজা ঢাকা নেয়।', 'The wholesalers load the beans onto trucks and run straight up the Dhaka–Chattogram highway.') },
    ],
    folk: [
      { id: 'wife', name: q('দিদারুলের স্ত্রী', 'Didarul’s wife'), look: sariWoman('#1f6f8b', '#f0d27a'), does: 'work', at: ['house', -3, 3], hello: q('শিম তোলার ঝুড়ি উঠানে রেখেছি।', 'I’ve left the bean baskets in the courtyard.') },
      { id: 'picker', name: q('শিম তোলেন রোকেয়া খালা', 'Rokeya khala, picking beans'), look: sariWoman('#8b3a62', '#e6b8cf', { hair: '#8a847c' }), does: 'work', at: [21, 6], hello: q('এবার শিমের দাম ভালো, বাবা!', 'Beans are fetching a good price this year!') },
      { id: 'paikar', name: q('পাইকার', 'The wholesaler'), look: lungiMan('#5a5a5a', '#a0a0a0', { top: 'shirt', topA: '#3a6a8a', topB: '#b8d0e0', feet: 'shoe', feetA: '#2a2420' }), does: 'stand', at: ['market', 3, -1.5], hello: q('কত মণ হবে? আজকের দাম ফোনে মিলিয়ে নেন।', 'How many maunds? Check today’s price on your phone.') },
    ],
    signs: { shed: { t: 'আল্লাহর দান বীজ ঘর' }, market: { t: 'শিমের আড়ত' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'ঘূর্ণিঝড় আশ্রয়কেন্দ্র' } },
    dawn: q('পাহাড়ের মাথায় সূর্য উঠল — শিশিরে শিম তোলা ভালো।', 'Sun over the hills — beans pick best with the dew on.'),
    dusk: q('সাগরের দিক থেকে বাতাস উঠছে, মাচাগুলো দেখে নিই।', 'The wind is coming off the sea — let me check the trellises.'),
  },
  prahlad: {
    places: [
      { id: 'home', at: ['house', 2, 4], r: 5, name: q('গোলপাতার ঘর', 'The golpata house'), line: q('সুন্দরবনের গোলপাতায় ছাওয়া চাল। সিডরে উড়ে গিয়েছিল, আবার বেঁধেছি।', 'A roof of golpata leaves from the Sundarbans. Sidr blew it away; we tied it again.') },
      { id: 'embankment', at: [12, -36], r: 6, name: q('পশুরের বেড়িবাঁধ', 'The Pasur embankment'), line: q('ওপারে সুন্দরবন। আইলায় এই বাঁধ ভেঙে নোনা পানি দুই বছর জমিতে ছিল।', 'The Sundarbans are across the river. In Aila this embankment broke and salt water sat on the fields for two years.') },
      { id: 'gher', at: [34.5, -15], r: 6, name: q('চিংড়ির ঘের', 'The shrimp ghers'), line: q('ঘেরে নোনা পানি তোলে, তাই চারপাশের মাটিতেও লবণ ঢোকে। ধান আর মাছের ঝগড়া পুরোনো।', 'The ghers are filled with salt water, so salt seeps into the land around them. Rice against shrimp is an old fight.') },
      { id: 'pond', at: ['water', 2, 4], r: 5, name: q('কুনি পুকুর', 'The kuni pond'), line: q('বর্ষার মিঠা পানি এই পুকুরে ধরে রাখি — শীতে তরমুজের সেচ এখান থেকেই।', 'We keep the monsoon’s fresh water in this pond — the winter watermelons are watered from it.') },
      { id: 'ghat', at: ['market', 0, -1.5], r: 4, name: q('পশুর নদীর ঘাট', 'The Pasur ghat'), line: q('বাঁধ পেরিয়ে এই ঘাট থেকে নৌকায় চালনা বাজারে ফসল যায়। দাকোপের তরমুজ খুলনা পর্যন্ত নাম করেছে।', 'Over the embankment, boats leave this ghat for Chalna bazar. Dacope’s watermelons are famous as far as Khulna.') },
    ],
    folk: [
      { id: 'wife', name: q('প্রহ্লাদের স্ত্রী', 'Prahlad’s wife'), look: sariWoman('#f1ede4', '#c0392b', { skin: '#8d5b3c', bangle: '#f4f1ea' }), does: 'work', at: ['house', 3, 3], hello: q('জোয়ারের আগে হাঁসগুলো তুলে আনো।', 'Bring the ducks in before the tide comes.') },
      { id: 'gherman', name: q('ঘেরের মজুর', 'A gher worker'), look: lungiMan('#4a6a3a', '#9cbf8a', { skin: '#7d4f32', head: 'gamcha', headA: '#2e7d4f', headB: '#f3eee4' }), does: 'walk', route: [[34.5, -26], [34.5, -4]], hello: q('দাদা, এবার ঘেরে ভাইরাস লেগেছে, চিংড়ি মরছে।', 'Dada, there’s a virus in the gher — the shrimp are dying.') },
      { id: 'boatman', name: q('মাঝি', 'The boatman'), look: lungiMan('#6a3a2a', '#c99a6a', { skin: '#7d4f32', top: 'fotua', topA: '#d8d2c0', topB: '#bdb6a2' }), does: 'stand', at: ['market', 1.5, -2], hello: q('চালনা যাবেন? ভাটা লাগার আগে ছাড়ব।', 'Going to Chalna? I leave before the ebb.') },
    ],
    signs: { shed: { t: 'মা কালী বীজ ভান্ডার' }, market: { t: 'খেয়াঘাট' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'বহুমুখী ঘূর্ণিঝড় আশ্রয়কেন্দ্র' } },
    dawn: q('ভোরের জোয়ার নামছে — পুকুরের পানি দিয়ে সেচ দেওয়ার সময়।', 'The morning tide is falling — time to water from the pond.'),
    dusk: q('শাঁখ বাজছে, সন্ধ্যা হলো। নদীর দিকে আর যাব না।', 'The conch is sounding, evening now. I won’t go near the river.'),
  },
  kader: {
    places: [
      { id: 'ghat', at: ['market', -1.5, 0], r: 4, name: q('খালের ঘাট', 'The canal ghat'), line: q('জোয়ারে খাল ভরে, ভাটায় নামে — দিনে দুবার। এখানে রাস্তা নেই, খালই রাস্তা; নৌকা চলে জোয়ারের হিসেবে।', 'The canal fills at high tide and drains at low — twice a day. There are no roads here; the canals are the roads, and the boats run by the tide.') },
      { id: 'guava', at: [3, 31], r: 5, name: q('পেয়ারা বাগান', 'The guava garden'), line: q('শ্রাবণে এই বাগানের পেয়ারা নৌকা ভরে ঝালকাঠির ভীমরুলির ভাসমান হাটে যায়।', 'In Srabon this garden’s guavas go heaped in boats to the floating market at Bhimruli in Jhalakathi.') },
      { id: 'canal', at: ['water', 0, -8], r: 5, name: q('পূর্বের খাল', 'The east canal'), line: q('আব্বার সময় খালের পানি মিঠা ছিল। এখন শুকনো মৌসুমে জোয়ারে লবণ উঠে আসে।', 'In Father’s day the canal was sweet. Now in the dry season the tide brings salt up.') },
      { id: 'bund', at: ['safe', 0, 3], r: 5, name: q('বেড়িবাঁধের রাস্তা', 'The embankment road'), line: q('কোটালের জোয়ারে পানি বাড়লে সবাই গরু-ছাগল নিয়ে এই উঁচু রাস্তায় ওঠে।', 'When the spring tide rises, everyone climbs up onto this raised road with their cattle and goats.') },
      { id: 'home', at: ['house', -2, -4], r: 5, name: q('হাওলাদার বাড়ি', 'The Howlader homestead'), line: q('নারকেল, সুপারি আর পুকুর — বরিশালের বাড়ি এমনই।', 'Coconut, betel nut and a pond — that’s what a Barishal homestead is.') },
    ],
    folk: [
      { id: 'wife', name: q('কাদেরের স্ত্রী', 'Kader’s wife'), look: sariWoman('#5a3a8a', '#e2b84a', { hair: '#cfc9c0', skin: '#b77b52' }), does: 'work', at: ['house', 3, 3], hello: q('জোয়ার আসছে, বীজতলা দেখে আসো।', 'The tide’s coming — go and look at the seedbed.') },
      { id: 'seller', name: q('পেয়ারা ব্যাপারী', 'The guava trader'), look: lungiMan('#2a5a4a', '#8ac0a8', { head: 'tupi', headA: '#f7f5ef', top: 'kurta', topA: '#e8e6de', topB: '#cfccc0', beard: '#231b16' }), does: 'stand', at: ['market', -1.5, 2], hello: q('পেয়ারা কত করে দেবেন এবার?', 'What are you asking for guavas this year?') },
      { id: 'kid', name: q('মাদ্রাসার ছেলে', 'A madrasa boy'), look: schoolKid({ top: 'kurta', topA: '#f4f4f0', topB: '#e4e6ea', head: 'tupi', headA: '#f7f5ef', lower: 'pyjama', lowA: '#f1efe8', lowB: '#f1efe8', feet: 'sandal', feetA: '#2f2a26' }), does: 'walk', route: [[-3, -6], [-6, -25]], hello: q('আসসালামু আলাইকুম, দাদা!', 'Assalamu alaikum, grandad!') },
    ],
    signs: { shed: { t: 'হাওলাদার বীজ ঘর' }, market: { t: 'পেয়ারার ঘাট' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'বেড়িবাঁধ' } },
    dawn: q('ভাটার সময় মাঠে নামি, জোয়ারের আগে উঠি — এই নিয়মে জীবন।', 'Into the field at low tide, out before high tide — that’s how life runs here.'),
    dusk: q('খালে জোয়ার ঢুকছে, নৌকাগুলো বাঁধা আছে তো?', 'The tide is coming into the canal — are the boats tied?'),
  },
  mofizul: {
    places: [
      { id: 'char', at: [0, 34], r: 6, name: q('তিস্তার চর', 'The Teesta char'), line: q('প্রতি বছর তিস্তা পাড় ভাঙে। আমাদের পুরোনো বাড়ির ভিটা এখন নদীর মাঝখানে।', 'Every year the Teesta eats its bank. The plot of our old house is out in the middle of the river now.') },
      { id: 'mango', at: [21, -6], r: 5, name: q('হাঁড়িভাঙা আমগাছ', 'The Haribhanga mango tree'), line: q('রংপুরের হাঁড়িভাঙা — আঁশ নেই, মিষ্টি বেশি। মিঠাপুকুরের এই আম এখন সারা দেশে যায়।', 'Rangpur’s Haribhanga — no fibre, all sweetness. Mithapukur’s mango goes all over the country now.') },
      { id: 'home', at: ['house', -3, -3], r: 5, name: q('শীতের উঠান', 'The winter courtyard'), line: q('জানুয়ারির শৈত্যপ্রবাহে খড় জ্বেলে আগুন পোহাই। কুয়াশায় দশ হাত দূরেও দেখা যায় না।', 'In January’s cold wave we burn straw and sit by the fire. In the fog you can’t see ten arm-lengths.') },
      { id: 'parishad', at: ['safe', 4, 4], r: 5, name: q('ইউনিয়ন পরিষদ', 'The Union Parishad'), line: q('শীত এলে এখানে কম্বল দেয়। বন্যার সময় চরের মানুষ এখানেই ওঠে।', 'In the cold they hand out blankets here. In a flood the char people come here.') },
      { id: 'hat', at: ['market', 3, -2], r: 4.5, name: q('গঙ্গাচড়া হাট', 'Gangachara market'), line: q('হাটে আলু আর ভুট্টার পাইকার আসে। আলুর দাম পড়লে হিমাগারে রাখার জায়গা পাই না।', 'Potato and maize buyers come to the market. When potatoes crash there’s no room left in the cold store.') },
    ],
    folk: [
      { id: 'wife', name: q('মফিজুলের স্ত্রী', 'Mofizul’s wife'), look: sariWoman('#7a2a3a', '#e8b0a0', { chador: '#5b6fa8' }), does: 'work', at: ['house', -3, 3], hello: q('কুয়াশায় আলুর পাতা ভিজে থাকলে মড়ক লাগে, দেখে এসো।', 'Wet potato leaves in fog bring blight — go and look.') },
      { id: 'elder', name: q('বুড়া দাদা', 'Old grandad'), look: lungiMan('#3a3a5a', '#8a8ab0', { top: 'sweater', topA: '#6a5a4a', topB: '#4f4336', head: 'monkeycap', headA: '#3a4a6a', headB: '#c0392b', hair: '#e7e3dc', beard: '#efebe4', chador: '#8a7a5a' }), does: 'stand', at: ['house', 4, -3], hello: q('এমন শীত আমার ছোটবেলায়ও দেখিনি রে।', 'I didn’t see cold like this even as a boy.') },
      { id: 'kid', name: q('চরের মেয়ে', 'A girl from the char'), look: schoolKid({ top: 'kameez', topA: '#c0392b', topB: '#e8b0a0', lower: 'shalwar', lowA: '#f1efe8', lowB: '#d9d3c5', head: 'orhni', headA: '#f4f1ea', headB: '#c0392b', feet: 'sandal', feetA: '#3a2a1e' }), does: 'walk', route: [[-4, -6], [-8, -17]], hello: q('চাচা, নৌকা না পেলে স্কুলে যেতে পারি না।', 'Uncle, if there’s no boat I can’t get to school.') },
    ],
    signs: { shed: { t: 'তিস্তা বীজ ভান্ডার' }, market: { t: 'গঙ্গাচড়া হাট' }, kiosk: { t: 'ডিজিটাল কৃষক কেন্দ্র' }, safe: { t: 'ইউনিয়ন পরিষদ' } },
    dawn: q('কুয়াশা এখনো কাটেনি — আলুর পাতা দেখে নিই।', 'The fog hasn’t lifted — let me look at the potato leaves.'),
    dusk: q('সন্ধ্যা নামতেই হাড়কাঁপানো শীত। আগুন জ্বালাই।', 'The bone-chilling cold comes with the dark. Time to light a fire.'),
  },
  rahima: {
    places: [
      { id: 'piyain', at: [0, -40], r: 6, name: q('পিয়াইনের পাথর', 'The stones of the Piyain'), line: q('ভোরে নৌকায় পাথর তোলে লোকে। ওপারে মেঘালয়ের পাহাড় — ঢল নামে ওখান থেকেই।', 'At dawn people lift stones from the river by boat. Meghalaya’s hills are over there — that is where the flash floods come from.') },
      { id: 'tea', at: [28, -12], r: 5, name: q('চায়ের টিলা', 'The tea hillock'), line: q('দুটি পাতা একটি কুঁড়ি — বাগানের মেয়েরা ভোর থেকে তোলে।', 'Two leaves and a bud — the women on the estates pick from first light.') },
      { id: 'haor', at: ['market', -4, 1], r: 5, name: q('হাওরের ঘাট', 'The haor ghat'), line: q('এই ঘাট থেকে নৌকায় সালুটিকর হাটে সবজি যায়। বর্ষায় হাওর সাগর হয়ে যায়, হিজল গাছ ডুবে থাকে।', 'Boats take the vegetables from this ghat to Salutikar market. In the rains the haor becomes a sea and the hijal trees stand drowned.') },
      { id: 'tila', at: ['safe', 3, 5], r: 5, name: q('আশ্রয়ের টিলা', 'The shelter hillock'), line: q('ঢল এলে গ্রামের সবাই গরু-বাছুর নিয়ে এই টিলায় ওঠে।', 'When the flash flood comes the whole village climbs this hillock with the cattle.') },
      { id: 'kanda', at: ['house', -5, -2], r: 4.5, name: q('কান্দার ভিটা', 'The homestead mound'), line: q('বর্ষায় আমাদের উঁচু ভিটা দ্বীপ হয়ে যায়, নৌকা ছাড়া কোথাও যাওয়া যায় না। ২০২২-এর বন্যায় ঘরে বুক পর্যন্ত পানি উঠেছিল।', 'In the rains our raised homestead becomes an island and nowhere can be reached without a boat. In the 2022 flood the water came up to my chest inside the house.') },
    ],
    folk: [
      { id: 'daughter', name: q('মেয়ে নাসরিন', 'Nasrin, her daughter'), look: schoolKid({ build: 0.8, top: 'kameez', topA: '#2e8b57', topB: '#bfe0c8', lower: 'shalwar', lowA: '#f1efe8', lowB: '#d9d3c5', head: 'hijab', headA: '#f4f1ea', feet: 'sandal', feetA: '#3a2a1e' }), does: 'walk', route: [[0, 7], [-4, 12], [-8, 18]], hello: q('আম্মা, আজ স্কুলে ঢলের কথা বলেছে স্যার।', 'Amma, the teacher talked about the flash floods at school today.') },
      { id: 'stone', name: q('পাথরশ্রমিক', 'A stone worker'), look: lungiMan('#3a4a5a', '#8a9ab0', { skin: '#8d5b3c', head: 'gamcha', headA: '#e2b84a', headB: '#f3eee4' }), does: 'work', at: [-10, -38], hello: q('আপা, নদীতে পানি বাড়ছে, আজ পাথর তোলা বন্ধ।', 'Apa, the river is rising — no stone lifting today.') },
      { id: 'picker', name: q('চা-শ্রমিক লক্ষ্মী', 'Lakshmi from the tea garden'), look: sariWoman('#d0572a', '#f2c94c', { skin: '#7d4f32', head: 'aanchal' }), does: 'work', at: [30, -18], hello: q('দিদি, বাগানে এবার পাতা কম, বৃষ্টি দেরিতে।', 'Didi, fewer leaves on the bushes this year — the rain came late.') },
    ],
    signs: { shed: { t: 'সুরমা বীজ ঘর' }, market: { t: 'সালুটিকর হাট' }, kiosk: { t: 'ইউনিয়ন ডিজিটাল সেন্টার' }, safe: { t: 'আশ্রয় টিলা' } },
    dawn: q('মেঘালয়ের মাথায় মেঘ জমেছে কি না, আগে দেখে নিই।', 'First let me see if clouds are gathering over Meghalaya.'),
    dusk: q('হাওরে সূর্য ডুবছে — কী সুন্দর, আবার কী ভয়ের।', 'The sun is setting over the haor — so beautiful, and so frightening.'),
  },

  // ---------------- neighbouring countries ----------------
  harjinder: {
    places: [
      { id: 'home', at: ['house', -2, 5], r: 5, name: q('হাভেলির উঠান', 'The courtyard'), line: q('বড় ছেলে কানাডায় গেছে। ট্রাক্টর এখন আমিই চালাই, নাতিরা ভিডিও কলে দেখে।', 'My elder son went to Canada. I drive the tractor myself now; the grandchildren watch on video calls.') },
      { id: 'motor', at: ['water', 0, 2], r: 5, name: q('টিউবওয়েলের কোঠা', 'The tubewell room'), line: q('দুপুরে সবাই এখানে বসে লস্যি খায়। দাদার সময় পানি পাওয়া যেত অনেক উপরে।', 'At noon everyone sits here with lassi. In my grandfather’s time the water was much nearer the top.') },
      { id: 'poplar', at: [26, 6], r: 5, name: q('পপলারের সারি', 'The poplar rows'), line: q('ক্ষেতের ধারে পপলার — পাঁচ-ছয় বছরে কাঠ বেচে বাড়তি আয়।', 'Poplars on the field edge — in five or six years the timber is extra income.') },
      { id: 'gurdwara', at: ['safe', 3, 6], r: 5, name: q('পিন্ডের গুরুদ্বারা', 'The village gurdwara'), line: q('লঙ্গরে সবাই এক সারিতে বসে খায় — বড়-ছোট, ধনী-গরিব এক।', 'At the langar everyone eats sitting in one row — young and old, rich and poor alike.') },
      { id: 'mandi', at: ['market', 3, -3], r: 4.5, name: q('মান্ডির রাস্তা', 'The road to the mandi'), line: q('সরকারি দরে (এমএসপি) গম কেনে মান্ডিতে। ট্রলি ভরে নিয়ে যাই, আড়তিয়া হিসাব রাখে।', 'At the mandi the wheat is bought at the government price (MSP). I take a full trolley; the arhtiya keeps the accounts.') },
    ],
    folk: [
      { id: 'wife', name: q('সর্বজিৎ কৌর', 'Sarabjit Kaur'), look: { skin: '#c08a66', hair: '#1d1714', build: 0.92, head: 'orhni', headA: '#c8203c', headB: '#f2c94c', top: 'kameez', topA: '#e8b33a', topB: '#c9962a', lower: 'shalwar', lowA: '#c8203c', lowB: '#a01a30', feet: 'jutti', feetA: '#5a3a22', bangle: '#e2b84a' }, does: 'work', at: ['house', 3, 3], hello: q('সত শ্রী আকাল জি! লস্যি রেখেছি মোটরের কাছে।', 'Sat Sri Akal ji! I’ve left lassi by the motor.') },
      { id: 'labour', name: q('বিহারের রামু', 'Ramu from Bihar'), look: lungiMan('#f1ede4', '#d8d2c4', { lower: 'dhoti', top: 'genji', head: 'gamcha', headA: '#e08a1e', headB: '#f3eee4', skin: '#8d5b3c' }), does: 'work', at: [14, 9], hello: q('সর্দারজি, গম কাটার মেশিন কবে আসবে?', 'Sardarji, when is the harvester coming?') },
      { id: 'neighbour', name: q('প্রতিবেশী গুরপ্রীত', 'Gurpreet next door'), look: { skin: '#b77b52', hair: '#1d1714', beard: '#1d1714', build: 1.04, head: 'turban', headA: '#2a5aa8', headB: '#1e4380', top: 'kurta', topA: '#e8e6de', topB: '#cfccc0', lower: 'pyjama', lowA: '#e8e6de', lowB: '#cfccc0', feet: 'jutti', feetA: '#4a3020', kara: true }, does: 'walk', route: [[-16.5, -6], [-16.5, 20]], hello: q('হরজিন্দর ভাই, হ্যাপি সিডার ভাড়া দেবে?', 'Harjinder bhai, will you hire me the Happy Seeder?') },
    ],
    signs: { shed: { t: 'ਬੀਜ ਭੰਡਾਰ', sub: 'Seed store' }, market: { t: 'ਸੰਗਰੂਰ ਮੰਡੀ', sub: 'Sangrur Mandi' }, kiosk: { t: 'ਕਾਮਨ ਸਰਵਿਸ ਸੈਂਟਰ', sub: 'Common Service Centre' }, safe: { t: 'ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ', sub: 'Gurdwara Sahib' } },
    dawn: q('গুরুদ্বারা থেকে ভোরের পাঠ ভেসে আসছে — চলো, কাজ শুরু।', 'The morning path is drifting over from the gurdwara — let’s begin.'),
    dusk: q('রেহরাসের সময় হলো, ট্রাক্টর ঘরে তুলি।', 'Time for the evening Rehras — the tractor goes in.'),
  },
  ghulam: {
    places: [
      { id: 'canal', at: ['water', 0, -3], r: 5, name: q('দাদু খালের মোঘা', 'The Dadu canal outlet'), line: q('পানির পালা ভাগ করা — ওয়ারাবন্দি। আমার পালা রাতে এলে লণ্ঠন নিয়ে বসে থাকি।', 'The water comes by turns — warabandi. When my turn falls at night, I sit up with a lantern.') },
      { id: 'dates', at: [-30, 20], r: 6, name: q('খেজুর বাগান', 'The date grove'), line: q('খায়েরপুরের মতো নামী নয়, তবু রমজানে নিজের বাগানের খেজুরেই ইফতার।', 'Not as famous as Khairpur’s, but in Ramadan we break the fast with dates from our own trees.') },
      { id: 'charpai', at: [-24, -6], r: 4.5, name: q('উঠানের চারপাই', 'The charpai in the yard'), line: q('সন্ধ্যায় চারপাইয়ে বসে চা আর গল্প। মাটির কলসির পানি গরমেও ঠান্ডা থাকে।', 'In the evening, tea and talk on the charpai. Water in the clay pots stays cool even in this heat.') },
      { id: 'road', at: ['safe', -6, 0], r: 5, name: q('উঁচু সড়ক', 'The raised road'), line: q('২০২২-এর বন্যায় তিন মাস এই রাস্তার উপর তাঁবুতে ছিলাম। মাঠ ছিল হ্রদ।', 'In the 2022 flood we lived three months in a tent on this road. The fields were a lake.') },
      { id: 'kirthar', at: [-38, -4], r: 6, name: q('কিরথারের দিক', 'Towards the Kirthar'), line: q('ওই পাহাড় থেকে ঢল নামে, আর মানছর হ্রদ উপচে পড়লে পানি আসে দাদু পর্যন্ত।', 'Torrents come down from those hills, and when Manchhar Lake overflows the water reaches Dadu.') },
    ],
    folk: [
      { id: 'wife', name: q('গোলাম নবীর স্ত্রী', 'Ghulam Nabi’s wife'), look: { skin: '#a8704a', hair: '#1d1714', build: 0.92, head: 'orhni', headA: '#8f1d24', headB: '#1d2a5a', top: 'kameez', topA: '#c0392b', topB: '#e8b0a0', lower: 'shalwar', lowA: '#1d2a5a', lowB: '#12204a', feet: 'sandal', feetA: '#4a3020', bangle: '#f4f1ea' }, does: 'work', at: ['house', 4, 4], hello: q('মাঠের পানি এল কিনা দেখো, পালা তো আজ।', 'See if the water has reached the field — it’s our turn today.') },
      { id: 'cart', name: q('গাধার গাড়ির চালক', 'The donkey-cart driver'), look: { skin: '#9c6644', hair: '#2a2420', moustache: '#2a2420', build: 1, head: 'sindhi', headA: '#1a6b3a', headB: '#e2b84a', top: 'kameez', topA: '#d8d2c0', topB: '#bdb6a2', lower: 'shalwar', lowA: '#d8d2c0', lowB: '#bdb6a2', feet: 'sandal', feetA: '#4a3020' }, does: 'walk', route: [[-12, 4], [-26, 11]], hello: q('চান্ডিও সাহেব, মান্ডি যাবেন? দাম আজ ভালো।', 'Chandio sahib, going to the mandi? Prices are good today.') },
      { id: 'dhaba', name: q('ঢাবার মালিক', 'The dhaba owner'), look: { skin: '#a8704a', hair: '#e7e3dc', beard: '#efebe4', build: 1.06, head: 'sindhi', headA: '#8f1d24', headB: '#e2b84a', top: 'kameez', topA: '#eef0f2', topB: '#d9d3c5', ajrak: true, lower: 'shalwar', lowA: '#eef0f2', lowB: '#d9d3c5', feet: 'sandal', feetA: '#4a3020' }, does: 'stand', at: ['safe', -8, 1], hello: q('আসুন, এক কাপ দুধ-চা খেয়ে যান।', 'Come, have a cup of milky tea.') },
    ],
    signs: { shed: { t: 'بیج کی دکان', sub: 'Seed shop' }, market: { t: 'دادو منڈی', sub: 'Dadu Mandi' }, kiosk: { t: 'محکمہ زراعت', sub: 'Agriculture Department' }, safe: { t: 'ڈھابہ ہوٹل', sub: 'Dhaba' }, rtl: true },
    dawn: q('ফজরের পর ঠান্ডা থাকতে থাকতেই কাজ — দাদুর দুপুর আগুনের মতো।', 'Work after the dawn prayer while it’s cool — noon in Dadu is like fire.'),
    dusk: q('কিরথারের পেছনে সূর্য ডুবল। মোঘা বন্ধ করে আসি।', 'The sun has gone behind the Kirthar. Let me close the outlet.'),
  },
  rampyari: {
    places: [
      { id: 'dehari', at: ['house', 4, 6], r: 4.5, name: q('ডেহরির উঠান', 'The yard of the dehari'), line: q('মাটির ডেহরিতে সারা বছরের ধান রাখি। দেয়ালে আমাদের থারু ছবি আঁকা।', 'We keep the year’s rice in the clay dehari bins. The walls are painted with our Tharu pictures.') },
      { id: 'machan', at: [12, -12], r: 4.5, name: q('পাহারার মাচা', 'The watch machan'), line: q('ধান পাকলে মাচায় রাত জাগি, টিন বাজাই — হাতি আর বুনো শূকর আসে।', 'When the paddy ripens we sit up all night on the machan banging tins — elephants and wild boar come.') },
      { id: 'sal', at: [-12, -32], r: 6, name: q('শাল বন', 'The sal forest'), line: q('আমাদের সমিতির বন। জ্বালানি কাঠ আর পাতা এখান থেকে, কিন্তু রাতে বন হাতির।', 'Our community forest. Firewood and leaves come from here — but at night the forest belongs to the elephants.') },
      { id: 'river', at: [2, 30], r: 6, name: q('নদীর বালুচর', 'The river sandbank'), line: q('বর্ষায় চুরে পাহাড় থেকে নদী বালু নিয়ে আসে, জমি বালুতে ঢেকে যায়।', 'In the monsoon the river brings sand down from the Churia hills and buries the fields.') },
      { id: 'ward', at: ['safe', -3, 3], r: 5, name: q('ওয়ার্ড অফিস', 'The ward office'), line: q('মহিলা সমিতির মিটিং এখানে। সমিতির টাকায় আমরা নিজেরাই টিউবওয়েল বসিয়েছি।', 'The women’s group meets here. We put in the tubewell ourselves with the group’s savings.') },
    ],
    folk: [
      { id: 'daughter', name: q('মেয়ে সুনিতা', 'Sunita, her daughter'), look: { skin: '#c68a5e', hair: '#1d1714', build: 0.8, head: 'bare', top: 'kameez', topA: '#2e5aa8', topB: '#bcd0ee', lower: 'shalwar', lowA: '#1f2230', lowB: '#1f2230', feet: 'shoe', feetA: '#1a1a1a' }, does: 'walk', route: [[0, 6], [-4, 18]], hello: q('আমা, আজ স্কুলে ইংরেজি পরীক্ষা!', 'Aama, English exam at school today!') },
      { id: 'neighbour', name: q('প্রতিবেশী বিমলা', 'Bimla next door'), look: { skin: '#b98260', hair: '#1d1714', build: 0.94, head: 'orhni', headA: '#2e8b57', headB: '#f2c94c', top: 'choli', topA: '#f4f1ea', topB: '#d9d3c5', lower: 'ghagra', lowA: '#1f2230', lowB: '#2e8b57', bands: ['#d6402e', '#f2c94c', '#2e8b57'], feet: 'sandal', feetA: '#5c3a26', silver: '#d8dde2', bangle: '#d8dde2' }, does: 'work', at: [-10, -16], hello: q('দিদি, আজ রাতে মাচায় আমার পালা।', 'Didi, it’s my turn on the machan tonight.') },
      { id: 'herder', name: q('মহিষ নিয়ে রাম বাহাদুর', 'Ram Bahadur with the buffalo'), look: lungiMan('#f1ede4', '#d8d2c4', { lower: 'dhoti', top: 'kurta', topA: '#e8e6de', topB: '#cfccc0', head: 'short', skin: '#9c6644' }), does: 'walk', route: [[27, -10], [27, 12]], hello: q('নমস্তে! নদীর ধারে আজ হাতির পায়ের ছাপ দেখলাম।', 'Namaste! I saw elephant tracks by the river today.') },
    ],
    signs: { shed: { t: 'कृषि सहकारी पसल', sub: 'Agri cooperative shop' }, market: { t: 'तरकारी संकलन केन्द्र', sub: 'Vegetable collection centre' }, kiosk: { t: 'कृषि ज्ञान केन्द्र', sub: 'Agriculture Knowledge Centre' }, safe: { t: 'वडा कार्यालय', sub: 'Ward office' } },
    dawn: q('ভোরে শালবনে পাখির ডাক — রাতে হাতি আসেনি, ভালো।', 'Birds calling in the sal at dawn — no elephants last night, good.'),
    dusk: q('আঁধার নামছে, মাচায় ওঠার সময়।', 'Dark is coming — time to climb the machan.'),
  },
  kinley: {
    places: [
      { id: 'chorten', at: [-12, -7], r: 4.5, name: q('গ্রামের চোর্তেন', 'The village chorten'), line: q('মাঠে যাওয়ার আগে চোর্তেন ডানদিকে রেখে ঘুরি। দাদি বলতেন, তাতে দিন ভালো যায়।', 'Before going to the field I walk round the chorten, keeping it on my right. Grandmother said it makes the day go well.') },
      { id: 'lhakhang', at: ['safe', -4, 5], r: 5, name: q('চিমি লাখাং', 'Chimi Lhakhang'), line: q('দ্রুকপা কুনলের মন্দির — দূর দেশ থেকেও মানুষ আশীর্বাদ নিতে আসে।', 'The temple of Drukpa Kunley — people come from far countries for its blessing.') },
      { id: 'river', at: [2, 26], r: 6, name: q('নদীর ধার', 'The riverside'), line: q('১৯৯৪ সালে উপরের হিমবাহ হ্রদ ফেটে বন্যা পুনাখা জং পর্যন্ত এসেছিল। এখন সাইরেন বসানো আছে।', 'In 1994 a glacial lake upstream burst and the flood reached Punakha Dzong. There are sirens now.') },
      { id: 'terraces', at: [30, -12], r: 5, name: q('ধাপের ক্ষেত', 'The terraces'), line: q('লাল চালের ধান হয় এই ধাপে — ভুটানের লাল চাল। পাহাড়ের জল নালা দিয়ে ধাপে ধাপে নামে।', 'Red rice grows on these steps — Bhutan’s red rice. Mountain water runs down from step to step in channels.') },
      { id: 'flags', at: [-18, -1], r: 4.5, name: q('প্রার্থনা পতাকা', 'The prayer flags'), line: q('বাতাস পতাকার প্রার্থনা সবদিকে ছড়িয়ে দেয় — সব প্রাণীর মঙ্গলের জন্য।', 'The wind carries the prayers on the flags in every direction — for the good of all beings.') },
    ],
    folk: [
      { id: 'mother', name: q('আমা দেচেন', 'Ama Dechen'), look: { skin: '#d0a07a', hair: '#cfc9c0', build: 0.9, head: 'short', headA: '#cfc9c0', headB: '#cfc9c0', top: 'tego', topA: '#2e5a8a', topB: '#f4e7c8', cuff: '#f4e7c8', silver: '#d8dde2', lower: 'kira', lowA: '#2e3a6a', lowB: '#e2b84a', bands: ['#b8323b', '#e2b84a', '#1e5a3c', '#f1ece0'], feet: 'shoe', feetA: '#2a2420' }, does: 'work', at: ['house', 4, 4], hello: q('কুজুজাংপো লা! এমা দাৎসি রেঁধেছি, তাড়াতাড়ি এসো।', 'Kuzuzangpo la! I’ve made ema datshi — come back soon.') },
      { id: 'monk', name: q('লাখাংয়ের লামা', 'A monk from the lhakhang'), look: monk({ skin: '#d0a07a' }), does: 'walk', route: [[11.7, -5], [22, -22]], hello: q('তাশি দেলেক। ফসল ভালো হোক।', 'Tashi delek. May the harvest be good.') },
      { id: 'farmer', name: q('প্রতিবেশী দর্জি', 'Dorji next door'), look: { skin: '#c68a5e', hair: '#1d1714', build: 1, head: 'short', headA: '#1d1714', headB: '#1d1714', top: 'kurta', topA: '#6b3a5a', topB: '#c9a24a', cuff: '#f4f1ea', lower: 'lungi', lowA: '#6b3a5a', lowB: '#c9a24a', feet: 'shoe', feetA: '#1a1a1a' }, does: 'work', at: [32, -16], hello: q('কিনলে, কাল রাতে বুনো শূকর আমার আলু খেয়ে গেছে!', 'Kinley, wild boar ate my potatoes last night!') },
    ],
    signs: { shed: { t: 'Lobesa Farm Shop' }, market: { t: 'FCB Auction Yard' }, kiosk: { t: 'Gewog RNR Centre' }, safe: { t: 'Chimi Lhakhang' } },
    dawn: q('লাখাং থেকে শঙ্খ আর ঘণ্টা — ভোর হলো উপত্যকায়।', 'Conch and bells from the lhakhang — dawn in the valley.'),
    dusk: q('পাহাড়ের ছায়া নামছে, ঠান্ডা লাগছে। বুনো শূকর তাড়ানোর আগুন জ্বালি।', 'The mountain shadow is coming down and it’s cold. Let me light the fire that keeps the boar away.'),
  },
  kyawwin: {
    places: [
      { id: 'pots', at: ['start', 8, 2], r: 4, name: q('পথের ধারের কলসি', 'The roadside water pots'), line: q('পথিকের জন্য কলসিতে খাবার পানি রেখে দিই — এ আমাদের পুণ্যের কাজ।', 'We keep drinking water in these pots for anyone passing — it’s a deed of merit for us.') },
      { id: 'zedi', at: [12, 26], r: 5, name: q('সাদা জেদি', 'The white zedi'), line: q('পূর্ণিমায় সারা গ্রাম এখানে প্রদীপ জ্বালায়।', 'At the full moon the whole village lights oil lamps here.') },
      { id: 'toddy', at: [26, 20], r: 5, name: q('তাল গাছের সারি', 'The toddy palms'), line: q('ভোরে গাছে উঠে রস নামাই, জ্বাল দিয়ে তালের গুড় বানাই।', 'At dawn I climb for the sap and boil it down into palm jaggery.') },
      { id: 'river', at: [-40, 0], r: 6, name: q('ইরাবতীর পাড়', 'The bank of the Ayeyarwady'), line: q('২০২৪-এ ইয়াগি ঝড়ের পর নদী ফুলে উঠে তিলের ক্ষেত ডুবিয়ে দিয়েছিল।', 'After Typhoon Yagi in 2024 the river swelled and drowned the sesame fields.') },
      { id: 'kyaung', at: ['safe', 3, 5], r: 5, name: q('ঢিবির বিহার', 'The monastery on the mound'), line: q('ছোটবেলায় এখানে কিছুদিন শ্রমণ ছিলাম — এখানে সব ছেলেই একবার থাকে।', 'As a boy I was a novice here for a while — every boy here is, once.') },
    ],
    folk: [
      { id: 'wife', name: q('দাও খিন', 'Daw Khin'), look: { skin: '#c68a5e', hair: '#1d1714', build: 0.92, head: 'short', headA: '#1d1714', headB: '#1d1714', top: 'blouse', topA: '#f4f1ea', topB: '#d8d2c4', lower: 'longyi', lowA: '#8a2a4a', lowB: '#e2b84a', feet: 'sandal', feetA: '#2f2a26' }, does: 'work', at: ['house', 3, -3], hello: q('মিঙ্গালাবা! তানাখা মেখে নাও, রোদ খুব।', 'Mingalaba! Put on some thanaka — the sun is strong.') },
      { id: 'monk', name: q('ভিক্ষু', 'A monk on his alms round'), look: monk(), does: 'walk', route: [[-30, 12], [20, 12]], hello: q('মঙ্গল হোক।', 'May you be well.') },
      { id: 'cart', name: q('গরুর গাড়ির চালক', 'The ox-cart driver'), look: { skin: '#9c6644', hair: '#1d1714', build: 1, head: 'gaungbaung', headA: '#f4f1ea', headB: '#e2b84a', top: 'genji', topA: '#e8e2d2', topB: '#cfc8b6', lower: 'longyi', lowA: '#2e5a3a', lowB: '#8ab08a', feet: 'sandal', feetA: '#2f2a26' }, does: 'stand', at: ['market', -3, -2], hello: q('উ চ, চক বাজারে আজ তিলের দাম উঠেছে।', 'U Kyaw, sesame is up at Chauk market today.') },
    ],
    signs: { shed: { t: 'မျိုးစေ့ဆိုင်', sub: 'Seed shop' }, market: { t: 'ဈေး', sub: 'Market' }, kiosk: { t: 'စိုက်ပျိုးရေးဦးစီးဌာန', sub: 'Department of Agriculture' }, safe: { t: 'ဘုန်းကြီးကျောင်း', sub: 'Monastery' } },
    dawn: q('ভিক্ষুরা পিণ্ড নিতে বেরিয়েছেন — চাল দিয়ে তারপর মাঠে।', 'The monks are out on their alms round — rice for them, then the field.'),
    dusk: q('বাগানের দিকে লাল সূর্য ডুবছে। গরু ঘরে তুলি।', 'A red sun is going down towards Bagan. Time to bring the oxen in.'),
  },
};
