// Crop knowledge table [RULE]. Thresholds are STARTING VALUES from general agronomy;
// they must be checked by an agronomist / SAAO before the final demo.
// Yields are FAOSTAT 2024 national averages (price_seasons.json); prices come from DAM and fertiliser from SRDI
// (engine/economics.js). There are no made-up prices or costs in this table.
//
// Fail rule types (offsets are days after planting/transplanting):
//   count: number of days with `v` >= thr in [from,to] must be < min  (else unsafe)
//   any:   any day with `v` >= thr in [from,to] makes the season unsafe
//   total_below: total of `v` in [from,to] below thr makes the season unsafe

export const BIGHA_HA = 0.1336; // 1 bigha = 33 decimal ≈ 0.1336 ha
export const DECIMAL_HA = 0.004047;
export const MAUND_KG = 37.32;

export const WATER_CLASS = { High: 3, Medium: 2, 'Low-Medium': 1.5, Low: 1 };

export const RABI_CROPS = {
  boro: {
    id: 'boro', family: 'Poaceae', familyBn: 'ধান-গম গোত্র', familyEn: 'Grass family',
    name: { bn: 'বোরো ধান', en: 'Boro rice' }, action: { bn: 'চারা রোপণ', en: 'Transplant' },
    plant: { m: 1, d: 15, prevYear: false }, days: 115, water: 'High', ph: [5.0, 7.0],
    wellDrained: false, heavyFeeder: true, legume: false,
    gddBase: 10, harvestWeeks: [0.6, 0.4],
    yieldTHa: [5.29, 5.29], // FAOSTAT 2024, Bangladesh national average
    rules: [
      { id: 'boro_heat', type: 'count', v: 'tmax', thr: 35, from: 75, to: 95, min: 3,
        bn: 'ফুল আসার সময় (রোপণের ৭৫–৯৫ দিনে) তিন দিন বা তার বেশি ৩৫° সেলসিয়াসের ওপরে গরম পড়লে ধানে চিটা হয়',
        en: 'Three or more days at 35 °C or above during flowering (days 75–95) cause empty grains' },
    ],
  },
  tomato: {
    id: 'tomato', family: 'Solanaceae', familyBn: 'বেগুন-টমেটো গোত্র', familyEn: 'Nightshade family',
    name: { bn: 'টমেটো', en: 'Tomato' }, action: { bn: 'চারা লাগানো', en: 'Transplant' },
    plant: { m: 11, d: 15, prevYear: true }, days: 80, water: 'Medium', ph: [6.0, 7.0],
    wellDrained: true, heavyFeeder: true, legume: false,
    gddBase: 10, harvestWeeks: [0.10, 0.20, 0.25, 0.20, 0.15, 0.10],
    yieldTHa: [15.8, 15.8], // FAOSTAT 2024, Bangladesh national average
    rules: [
      { id: 'tom_rain', type: 'any', v: 'prec', thr: 50, from: 0, to: 15,
        bn: 'চারা লাগানোর প্রথম ১৫ দিনে এক দিনে ৫০ মিলিমিটারের বেশি বৃষ্টি হলে চারা পচে যেতে পারে',
        en: 'A single day of 50 mm or more rain in the first 15 days can rot the seedlings' },
      { id: 'tom_heat', type: 'count', v: 'tmax', thr: 32, from: 40, to: 95, min: 5,
        bn: 'ফল ধরার সময় (৪০–৯৫ দিনে) পাঁচ দিন বা তার বেশি ৩২° সেলসিয়াসের ওপরে গরম হলে ফুল ঝরে, ফল কম ধরে',
        en: 'Five or more days at 32 °C or above while fruit sets (days 40–95) make flowers drop' },
    ],
  },
  wheat: {
    id: 'wheat', family: 'Poaceae', familyBn: 'ধান-গম গোত্র', familyEn: 'Grass family',
    name: { bn: 'গম', en: 'Wheat' }, action: { bn: 'বীজ বোনা', en: 'Sow' },
    plant: { m: 11, d: 20, prevYear: true }, days: 115, water: 'Low-Medium', ph: [6.0, 7.5],
    wellDrained: true, heavyFeeder: false, legume: false,
    gddBase: 0, harvestWeeks: [0.6, 0.4],
    yieldTHa: [3.76, 3.76], // FAOSTAT 2024, Bangladesh national average
    rules: [
      { id: 'wht_heat', type: 'count', v: 'tmax', thr: 32, from: 85, to: 115, min: 5,
        bn: 'দানা পুষ্ট হওয়ার সময় (৮৫–১১৫ দিনে) পাঁচ দিন বা তার বেশি ৩২° সেলসিয়াসের ওপরে গরম হলে দানা চুপসে যায়',
        en: 'Five or more days at 32 °C or above while grain fills (days 85–115) shrivel the grain' },
    ],
  },
  lentil: {
    id: 'lentil', family: 'Fabaceae', familyBn: 'ডাল-শিম গোত্র', familyEn: 'Legume family',
    name: { bn: 'মসুর ডাল', en: 'Lentil' }, action: { bn: 'বীজ বোনা', en: 'Sow' },
    plant: { m: 11, d: 5, prevYear: true }, days: 105, water: 'Low', ph: [6.0, 8.0],
    wellDrained: true, heavyFeeder: false, legume: true,
    gddBase: 0, harvestWeeks: [0.6, 0.4],
    yieldTHa: [1.48, 1.48], // FAOSTAT 2024, Bangladesh national average
    rules: [
      { id: 'len_rain1', type: 'any', v: 'prec', thr: 40, from: 55, to: 85,
        bn: 'ফুল আসার সময় (৫৫–৮৫ দিনে) এক দিনে ৪০ মিলিমিটারের বেশি বৃষ্টি হলে ফুল ঝরে যায়',
        en: 'A single day of 40 mm or more rain at flowering (days 55–85) knocks the flowers off' },
      { id: 'len_rain4', type: 'count', v: 'prec', thr: 5, from: 55, to: 85, min: 4,
        bn: 'ফুল আসার সময় চার দিন বা তার বেশি বৃষ্টি হলে পাতা ঝলসানো (স্টেমফাইলিয়াম) রোগ ধরে',
        en: 'Four or more rainy days at flowering bring Stemphylium blight' },
    ],
  },
  mustard: {
    id: 'mustard', family: 'Brassicaceae', familyBn: 'সরিষা-কপি গোত্র', familyEn: 'Mustard family',
    name: { bn: 'সরিষা', en: 'Mustard' }, action: { bn: 'বীজ বোনা', en: 'Sow' },
    plant: { m: 11, d: 1, prevYear: true }, days: 85, water: 'Low', ph: [5.5, 7.5],
    wellDrained: true, heavyFeeder: false, legume: false,
    gddBase: 0, harvestWeeks: [0.6, 0.4],
    yieldTHa: [1.38, 1.38], // FAOSTAT 2024, Bangladesh national average
    rules: [
      { id: 'mus_rain', type: 'any', v: 'prec', thr: 30, from: 35, to: 55,
        bn: 'ফুল আসার সময় (৩৫–৫৫ দিনে) এক দিনে ৩০ মিলিমিটারের বেশি বৃষ্টি হলে ফুল ও ফল নষ্ট হয়',
        en: 'A single day of 30 mm or more rain at flowering (days 35–55) damages flowers and pods' },
    ],
  },
};

// Next-season (Kharif-1) options for the rotation recommendation [RULE].
// sow: the recommended sowing window (BARI Krishi Projukti Hatboi for mungbean and sesame; BJRI for tossa jute;
//   BRRI for direct-seeded Aus). Sowing before it opens is as wrong as after it closes: tossa jute sown in February
//   flowers early on the short days and gives little fibre, and Aus sown too early meets cold at establishment.
// ph: the soil pH each crop grows well in. waterlog: how badly a day or two of standing water hurts it.
// Mungbean's window runs to mid-April because in the wheat–mungbean–T. Aman pattern it is sown straight after wheat.
// days: seed to last picking for the common varieties (BARI Mung-6, BARI Til-4, BJRI Tossa Pat-8, BRRI dhan48).
// Like the Rabi table these are STARTING VALUES from the published guides; an agronomist should check them.
export const ROTATION_CROPS = {
  mungbean: {
    id: 'mungbean', family: 'Fabaceae', name: { bn: 'মুগ ডাল', en: 'Mungbean' }, days: 65, water: 'Low',
    soilBenefit: 100, sow: { from: { m: 2, d: 15 }, to: { m: 4, d: 15 } }, ph: [6.0, 7.5], waterlog: 'high', legume: true,
    benefit: { bn: 'শিকড়ের গুটি মাটিতে নাইট্রোজেন দেয়; শুঁটি তোলার পর গাছ চাষ দিয়ে মিশিয়ে দিলে মাটির জৈব পদার্থ বাড়ে', en: 'Root nodules add nitrogen; ploughing the plants back in after picking builds organic matter' },
    rules: [
      { id: 'mung_heat', type: 'count', v: 'tmax', thr: 40, from: 30, to: 50, min: 3,
        bn: 'ফুল আসার সময় (বোনার ৩০–৫০ দিনে) তিন দিন বা তার বেশি ৪০° সেলসিয়াসের ওপরে গরম হলে ফুল ঝরে যায়', en: 'Three or more days at 40 °C or above at flowering (days 30–50) make the flowers drop' },
      { id: 'mung_rain', type: 'any', v: 'prec', thr: 40, from: 50, to: 65,
        bn: 'শুঁটি পাকার সময় (৫০–৬৫ দিনে) এক দিনে ৪০ মিলিমিটারের বেশি বৃষ্টি হলে শুঁটি পচে যায়', en: 'A single day of 40 mm or more rain while pods ripen (days 50–65) rots them' },
    ],
  },
  sesame: {
    id: 'sesame', family: 'Pedaliaceae', name: { bn: 'তিল', en: 'Sesame' }, days: 90, water: 'Low',
    soilBenefit: 50, sow: { from: { m: 2, d: 15 }, to: { m: 3, d: 31 } }, ph: [5.5, 8.0], waterlog: 'high',
    benefit: { bn: 'খরা সহ্য করে, কম সেচেও কিছু ফলন দেয়; আলাদা গোত্রের ফসল বলে আগের ফসলের রোগ-পোকা টিকে থাকতে পারে না', en: 'Stands drought and gives some yield on little irrigation; a different crop family breaks the pest and disease cycle' },
    rules: [
      { id: 'ses_rain', type: 'any', v: 'prec', thr: 50, from: 0, to: 30,
        bn: 'বোনার প্রথম ৩০ দিনে এক দিনে ৫০ মিলিমিটারের বেশি বৃষ্টিতে জমিতে পানি জমে চারা মরে', en: 'A single day of 50 mm or more rain in the first 30 days waterlogs the seedlings' },
      { id: 'ses_rain_ripe', type: 'any', v: 'prec', thr: 60, from: 70, to: 90,
        bn: 'ফল পাকার সময় (৭০–৯০ দিনে) এক দিনে ৬০ মিলিমিটারের বেশি বৃষ্টিতে গাছ হেলে পড়ে, ফল ফেটে দানা ঝরে', en: 'A single day of 60 mm or more rain while capsules ripen (days 70–90) lodges the crop and shatters the seed' },
    ],
  },
  jute: {
    id: 'jute', family: 'Malvaceae', name: { bn: 'পাট', en: 'Jute' }, days: 110, water: 'Medium',
    soilBenefit: 60, sow: { from: { m: 3, d: 15 }, to: { m: 4, d: 30 } }, ph: [5.0, 7.5], waterlog: 'low',
    benefit: { bn: 'ঝরে পড়া পাতা পচে মাটিতে জৈব সার হয়', en: 'Fallen leaves rot into the soil as organic matter' },
    rules: [{ id: 'jute_dry', type: 'total_below', v: 'prec', thr: 50, from: 0, to: 30,
      bn: 'বোনার পর প্রথম ৩০ দিনে মোট বৃষ্টি ৫০ মিলিমিটারের কম হলে সেচ দিতে হয়', en: 'Less than 50 mm of rain in the first 30 days means it needs irrigating' }],
  },
  aus: {
    id: 'aus', family: 'Poaceae', name: { bn: 'আউশ ধান', en: 'Aus rice' }, days: 105, water: 'Medium',
    soilBenefit: 30, sow: { from: { m: 3, d: 15 }, to: { m: 4, d: 30 } }, ph: [5.0, 7.0], waterlog: 'none',
    benefit: { bn: 'চেনা ফসল, তবে ধানের পর আবার ধান হলে মাটির তেমন উপকার হয় না', en: 'A familiar crop, but rice after rice does little for the soil' },
    rules: [{ id: 'aus_heat', type: 'count', v: 'tmax', thr: 35, from: 70, to: 90, min: 3,
      bn: 'ফুল আসার সময় (বোনার ৭০–৯০ দিনে) তিন দিন বা তার বেশি ৩৫° সেলসিয়াসের ওপরে গরম হলে ধানে চিটা হয়', en: 'Three or more days at 35 °C or above at flowering (days 70–90) cause empty grains' }],
  },
};

export const IRRIGATION = {
  dtw: { bn: 'গভীর নলকূপ', en: 'Deep tube well', penalty: { High: 40, Medium: 15, 'Low-Medium': 8, Low: 0 } },
  stw: { bn: 'অগভীর নলকূপ', en: 'Shallow tube well', penalty: { High: 60, Medium: 25, 'Low-Medium': 15, Low: 5 } },
  none: { bn: 'পুকুর বা সেচ নেই', en: 'Pond / no irrigation', penalty: { High: 90, Medium: 50, 'Low-Medium': 30, Low: 10 } },
};

// Crops named in the app that are not planned here (the satellite field watch sees them).
const OTHER_CROPS = { aman: { name: { bn: 'আমন ধান', en: 'Aman rice' } } };
export const cropName = (id, lang) => (RABI_CROPS[id] || ROTATION_CROPS[id] || OTHER_CROPS[id])?.name[lang] ?? id;
