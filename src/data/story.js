// "মাঠের লড়াই" — a learn-by-playing story. One Rabi season with Rahim Uddin in Deopara: six real problems a
// Barind farmer meets, and at each one the player picks either the old habit or one of FieldShift 360's tools
// (হাতিয়ার). Effects move three meters: crop health (0–100), profit in taka, and water left (0–100).
// The numbers are illustrative, not measured; they only show the direction and rough size of each outcome.

export const START = { crop: 70, money: 0, water: 80 };
export const WRONG_TOOL = { crop: -2, money: -200 };

// Each tool is a real feature of the app; `to` opens it.
export const TOOLS = {
  plan: { bn: 'মৌসুমের পরিকল্পনা', en: 'Season planner', note: { bn: '২৫ বছরের নাসা আবহাওয়া আর মাটি মিলিয়ে ফসল ও তারিখ', en: '25 years of NASA weather plus your soil: crop and date' }, to: '/farmer/plan' },
  glut: { bn: 'দাম পড়ার সতর্কতা', en: 'Price-drop warning', note: { bn: 'পাশের সবাই কী, কবে লাগাচ্ছে', en: 'What neighbours plant, and when' }, to: '/farmer/plan' },
  doctor: { bn: 'ফসলের ডাক্তার', en: 'Crop doctor', note: { bn: 'পাতার ছবি তুলে রোগের প্রাথমিক ধারণা', en: 'A leaf photo gives a first idea of the disease' }, to: '/farmer/doctor' },
  today: { bn: 'আজকের সেচ', en: "Today's irrigation", note: { bn: 'আজ সেচ লাগবে কিনা, মাটি আর বৃষ্টি দেখে', en: 'Whether to water today, from soil and rain' }, to: '/farmer/today' },
  weather: { bn: 'লাইভ আবহাওয়া', en: 'Live weather', note: { bn: 'আজ থেকে ৮ দিনের পূর্বাভাস', en: 'The forecast for the next 8 days' }, to: '/' },
  help: { bn: 'কর্মকর্তাকে জানান', en: 'Tell the officer', note: { bn: 'ছবি আর জায়গাসহ সরাসরি কৃষি কর্মকর্তার কাছে', en: 'Straight to your agriculture officer, with photo and place' }, to: '/farmer/help' },
};

export const SCENES = [
  {
    id: 'choose', fx: 'dry', photo: 'landParcels', focus: '50% 55%',
    month: { bn: 'কার্তিক', en: 'Kartik' },
    title: { bn: 'এবার কী লাগাবেন?', en: 'What to plant this time?' },
    story: {
      bn: 'রহিম ভাই প্রতি বছর বোরো ধান লাগান। কিন্তু এবার গভীর নলকূপে পানি উঠছে দেরিতে, আর সেচের খরচ বেড়েছে দ্বিগুণ।',
      en: 'Rahim plants Boro rice every year. But this year the deep tube well is slow to draw water, and irrigation costs have doubled.',
    },
    habit: {
      label: { bn: 'গত বছরের মতো আবার বোরো লাগাই', en: 'Plant Boro again, like last year' },
      result: { bn: 'সেচেই চলে গেল ৳৬,০০০। পানির টানে ফলনও কম হলো।', en: 'Irrigation alone cost ৳6,000, and the crop came up short of water.' },
      fx: { crop: -10, money: -6000, water: -30 },
    },
    tool: 'plan',
    win: {
      text: { bn: 'FieldShift ২৫ মৌসুমের নাসা আবহাওয়া আর দেওপাড়ার মাটি মিলিয়ে বলল: সরিষা, ১৬ কার্তিক। পানি লাগবে বোরোর চার ভাগের এক ভাগ।', en: 'FieldShift weighed 25 seasons of NASA weather against Deopara\'s soil: mustard, sown on 16 Kartik. A quarter of the water Boro needs.' },
      fx: { crop: 10, money: 4000, water: 15 },
    },
    hint: { bn: 'এটা পরে কাজে লাগবে। এখন দরকার পুরো মৌসুমের হিসাব — কোন ফসল, কবে।', en: 'Useful later. Right now you need the whole season worked out: which crop, and when.' },
  },
  {
    id: 'glut', fx: 'crash', photo: 'satellite', focus: '50% 50%',
    month: { bn: 'অগ্রহায়ণ', en: 'Agrahayan' },
    title: { bn: 'পাশের সবাই একই ফসল!', en: 'Everyone is planting the same crop!' },
    story: {
      bn: 'গ্রামে খবর: এবার নাকি টমেটোতে খুব লাভ। চাচা, মামা, পাশের জমির সবাই টমেটো লাগাচ্ছেন — একই সপ্তাহে।',
      en: 'Word in the village: tomatoes pay well this year. Uncle, cousin, every neighbour is planting tomatoes — in the same week.',
    },
    habit: {
      label: { bn: 'আমিও সবার সঙ্গে টমেটো লাগাই', en: 'Plant tomatoes too, with everyone' },
      result: { bn: 'ফসল উঠল সবার একসঙ্গে। বাজারে টমেটো ৳৫ কেজি — খরচও উঠল না।', en: 'Everyone harvested at once. Tomatoes sold for ৳5 a kilo — not even the costs came back.' },
      fx: { crop: 0, money: -5000, water: -10 },
    },
    tool: 'glut',
    win: {
      text: { bn: 'দাম পড়ার সতর্কতা দেখাল: ওই সপ্তাহে ইউনিয়নে স্বাভাবিকের চার গুণ টমেটো উঠবে। রহিম ভাই নিজের পরিকল্পনাতেই থাকলেন — বাজারে ভিড় নেই, দাম ভালো।', en: 'The price-drop warning showed four times the usual tomatoes reaching the market that week. Rahim kept to his own plan — no crowd at the market, a good price.' },
      fx: { crop: 0, money: 5000, water: 0 },
    },
    hint: { bn: 'ভালো হাতিয়ার, কিন্তু প্রশ্নটা দাম নিয়ে — পাশের সবাই কী লাগাচ্ছে।', en: 'A good tool, but the question is price — what everyone else is planting.' },
  },
  {
    id: 'blight', fx: 'fog', photo: 'heroDawn', focus: '60% 50%',
    month: { bn: 'পৌষ', en: 'Poush' },
    title: { bn: 'কুয়াশার ভোরে পাতায় দাগ', en: 'Spots on the leaves after the fog' },
    story: {
      bn: 'টানা চার দিন ঘন কুয়াশা। সকালে মাঠে গিয়ে রহিম ভাই দেখেন সরিষার পাতায় বাদামি গোল দাগ, আর তা দ্রুত ছড়াচ্ছে।',
      en: 'Four days of thick fog. In the morning Rahim finds round brown spots on the mustard leaves, and they are spreading fast.',
    },
    habit: {
      label: { bn: 'দোকান থেকে যেকোনো একটা ওষুধ এনে ছিটাই', en: 'Buy any spray from the shop and use it' },
      result: { bn: 'ভুল ওষুধে ৳২,৫০০ গেল, দাগ থামল না। জমির এক কোণ নষ্ট হলো।', en: 'The wrong spray cost ৳2,500 and the spots kept spreading. One corner of the field was lost.' },
      fx: { crop: -20, money: -2500, water: 0 },
    },
    tool: 'doctor',
    win: {
      text: { bn: 'ফসলের ডাক্তারে পাতার ছবি তুললেন — প্রাথমিক ধারণা: অল্টারনারিয়া ব্লাইট। ছবিটা সঙ্গে সঙ্গে কৃষি কর্মকর্তার কাছে গেল, বিকেলেই সঠিক ওষুধ আর মাত্রা জানলেন।', en: 'He photographed a leaf in the crop doctor — a first guess: Alternaria blight. The photo went straight to the officer, and by afternoon he knew the right spray and dose.' },
      fx: { crop: 15, money: -500, water: 0 },
    },
    hint: { bn: 'রোগ চিনতে আগে পাতার একটা পরিষ্কার ছবি দরকার।', en: 'To name the disease, start with a clear photo of the leaf.' },
  },
  {
    id: 'dry', fx: 'heat', photo: 'droughtFlood', focus: '18% 60%',
    month: { bn: 'মাঘ', en: 'Magh' },
    title: { bn: 'শুকনো সপ্তাহ: আজ কি সেচ লাগবে?', en: 'A dry week: water today?' },
    story: {
      bn: 'সাত দিন এক ফোঁটা বৃষ্টি নেই। সরিষায় এখন ফুল আর ফল ধরছে। পাশের জন বললেন, "রোজ পানি দাও, বেশি দিলেই ভালো।"',
      en: 'Not a drop of rain in seven days. The mustard is flowering and setting pods. A neighbour says, "Water every day — more is better."',
    },
    habit: {
      label: { bn: 'রোজ জমি ভাসিয়ে সেচ দিই', en: 'Flood the field every day' },
      result: { bn: 'বাড়তি পানিতে শিকড় পচল, সেচের বিল দাঁড়াল ৳৩,০০০।', en: 'Too much water rotted the roots, and the irrigation bill came to ৳3,000.' },
      fx: { crop: -10, money: -3000, water: -30 },
    },
    tool: 'today',
    win: {
      text: { bn: 'আজকের সেচ দেখাল: ৭ দিনে বৃষ্টি ০ মিমি, সামনে ৩ দিনেও নেই, আর এখন ফসল পানির টান সইতে পারে না। পরামর্শ: মাটি হাতে নিয়ে দেখুন, শুকনো হলে বিকেলে একবার হালকা সেচ।', en: 'Today\'s irrigation showed 0 mm of rain in 7 days, none due in the next 3, and a crop that cannot take dry stress now. Advice: feel the soil, and if it is dry, one light watering in the evening.' },
      fx: { crop: 10, money: 0, water: 15 },
    },
    hint: { bn: 'আজকের সিদ্ধান্ত নিতে হয় আজকের মাটি আর আবহাওয়া দেখে।', en: "Today's decision depends on today's soil and weather." },
  },
  {
    id: 'storm', fx: 'rain', photo: 'droughtFlood', focus: '85% 55%',
    month: { bn: 'ফাল্গুন', en: 'Falgun' },
    title: { bn: 'ফসল পাকছে, আকাশে মেঘ', en: 'The crop is ripening, the sky is darkening' },
    story: {
      bn: 'সরিষা প্রায় পাকা, তোলার কথা আগামী সপ্তাহে। হঠাৎ এক বিকেলে পশ্চিম আকাশ কালো হয়ে আসছে।',
      en: 'The mustard is nearly ripe, due for harvest next week. Then one afternoon the western sky turns dark.',
    },
    habit: {
      label: { bn: 'যেমন ঠিক ছিল, আগামী সপ্তাহেই তুলব', en: 'Stick to the plan, harvest next week' },
      result: { bn: 'দুই দিনের ঝড়বৃষ্টিতে পাকা শুঁটি ফেটে দানা ঝরে গেল, ভেজা ফসলে ছত্রাক ধরল।', en: 'Two days of stormy rain split the ripe pods and shed the seed, and mould set into the wet crop.' },
      fx: { crop: -25, money: -4000, water: 0 },
    },
    tool: 'weather',
    win: {
      text: { bn: 'লাইভ আবহাওয়ার ৮ দিনের পূর্বাভাস: পরশু থেকে দুই দিন ঝড়বৃষ্টি। রহিম ভাই দুই দিন আগেই ফসল তুলে শুকিয়ে ঘরে নিলেন।', en: 'The live 8-day forecast: two days of stormy rain from the day after tomorrow. Rahim harvested two days early and got the crop dry and indoors.' },
      fx: { crop: 10, money: 3000, water: 0 },
    },
    hint: { bn: 'এখন জানা দরকার সামনের কয়েক দিনের আবহাওয়া।', en: 'What you need now is the weather for the next few days.' },
  },
  {
    id: 'pests', fx: 'bugs', photo: 'farmer', focus: '30% 45%',
    month: { bn: 'চৈত্র', en: 'Chaitra' },
    title: { bn: 'পুরো পাড়ায় একই পোকা', en: 'The same pest across the neighbourhood' },
    story: {
      bn: 'পরের ফসল মুগ ডালে পোকা লেগেছে। রহিম ভাই শুনলেন, পাশের তিন-চারজনের জমিতেও একই অবস্থা — কিন্তু কেউ কাউকে কিছু জানাননি।',
      en: 'Pests have hit the next crop, mung bean. Rahim hears that three or four neighbours have the same problem — but nobody has told anyone.',
    },
    habit: {
      label: { bn: 'নিজের জমি নিজেই সামলাই, কাউকে না বলি', en: 'Handle my own field, tell no one' },
      result: { bn: 'পোকা পাশের জমি থেকে বারবার ফিরে এল। তিনবার ওষুধ, খরচ ৳৩,৫০০।', en: 'The pests kept coming back from the next field. Three rounds of spray, ৳3,500 spent.' },
      fx: { crop: -15, money: -3500, water: 0 },
    },
    tool: 'help',
    win: {
      text: { bn: 'ছবি আর জায়গাসহ কর্মকর্তাকে জানালেন। কাছাকাছি কয়েকজনের একই খবর দেখে কর্মকর্তা এলাকার সতর্কতা পেলেন, আর পুরো পাড়াকে একসঙ্গে পরামর্শ পাঠালেন — সবাই একই দিনে ব্যবস্থা নিলেন।', en: 'He told the officer, with a photo and his location. Seeing the same report from several nearby farms, the officer got an area alert and advised the whole neighbourhood at once — everyone acted on the same day.' },
      fx: { crop: 15, money: 1000, water: 0 },
    },
    hint: { bn: 'একা নয় — এখানে দরকার কর্মকর্তা আর পাশের সবাই একসঙ্গে।', en: 'Not alone — this needs the officer and the neighbours together.' },
  },
];
