// The common field problems of each Rabi crop in Bangladesh, in the words a farmer would use, with what to look for
// on the plant so the right one is picked. From the BARI Krishi Projukti Hatboi, BRRI's Adhunik Dhaner Chash and the
// DAE crop protection guides. Picking one only names the request for the officer; it is not a diagnosis.
// kind: disease | pest | other. urgent: spreads fast or kills plants, so it goes to the top of the officer's list.
export const CROP_PROBLEMS = {
  tomato: [
    { key: 'early_blight', kind: 'disease', bn: 'আগাম ধসা', en: 'Early blight', look: { bn: 'নিচের পাতায় বাদামি দাগ, দাগের ভেতর গোল গোল রেখা', en: 'Brown spots with rings on the lower leaves' } },
    { key: 'late_blight', kind: 'disease', urgent: true, bn: 'নাবি ধসা (মড়ক)', en: 'Late blight', look: { bn: 'কুয়াশার পর পাতা-ডালে কালচে ভেজা দাগ, দুই-তিন দিনে পুরো গাছ পচে', en: 'Dark water-soaked patches after fog; whole plants collapse in days' } },
    { key: 'leaf_curl', kind: 'disease', bn: 'পাতা কোঁকড়ানো (ভাইরাস)', en: 'Leaf curl virus', look: { bn: 'কচি পাতা কুঁকড়ে ছোট আর হলদে, গাছ বাড়ে না; সাদা মাছি থাকে', en: 'Young leaves small, curled and yellow; plants stunted; whiteflies present' } },
    { key: 'wilt', kind: 'disease', urgent: true, bn: 'ঢলে পড়া', en: 'Wilting', look: { bn: 'সবুজ অবস্থায় গাছ হঠাৎ নেতিয়ে পড়ে, পানি দিলেও ওঠে না', en: 'Green plants suddenly wilt and do not recover after watering' } },
    { key: 'fruit_borer', kind: 'pest', bn: 'ফল ছিদ্রকারী পোকা', en: 'Fruit borer', look: { bn: 'ফলে গোল ছিদ্র, ভেতরে সবুজ লার্ভা', en: 'Round holes in the fruit with a green caterpillar inside' } },
  ],
  mustard: [
    { key: 'aphid', kind: 'pest', urgent: true, bn: 'জাব পোকা', en: 'Aphids', look: { bn: 'ফুল আর ডগায় ছোট ছোট পোকা দলবেঁধে, ফুল-ফল ঝরে', en: 'Clusters of tiny insects on flowers and tips; flowers and pods drop' } },
    { key: 'alternaria', kind: 'disease', bn: 'পাতা ঝলসানো (অল্টারনারিয়া)', en: 'Alternaria blight', look: { bn: 'পাতা আর ফলে কালো-বাদামি গোল দাগ', en: 'Dark brown round spots on leaves and pods' } },
    { key: 'white_rust', kind: 'disease', bn: 'সাদা মরিচা', en: 'White rust', look: { bn: 'পাতার নিচে সাদা ফোসকা, ডগা বেঁকে মোটা হয়', en: 'White blisters under the leaves; tips swell and twist' } },
    { key: 'orobanche', kind: 'other', bn: 'অরোবাংকি পরগাছা', en: 'Broomrape (Orobanche)', look: { bn: 'গাছের গোড়ায় পাতাহীন হালকা বেগুনি ডাঁটা গজায়', en: 'Leafless pale purple shoots come up at the base of plants' } },
  ],
  boro: [
    { key: 'cold', kind: 'other', urgent: true, bn: 'ঠান্ডায় চারা হলুদ', en: 'Cold-damaged seedlings', look: { bn: 'শৈত্যপ্রবাহে বীজতলার চারা হলুদ বা সাদাটে, কিছু মরে যায়', en: 'Seedbed seedlings turn yellow or white in a cold wave; some die' } },
    { key: 'blast', kind: 'disease', urgent: true, bn: 'ব্লাস্ট', en: 'Blast', look: { bn: 'পাতায় চোখের মতো দাগ, শিষের গোড়া কালো হয়ে শিষ ভেঙে পড়ে', en: 'Eye-shaped leaf spots; the neck of the panicle blackens and breaks' } },
    { key: 'sheath_blight', kind: 'disease', bn: 'খোল পোড়া', en: 'Sheath blight', look: { bn: 'পানির কাছে খোলে সাপের চামড়ার মতো ছোপ', en: 'Snake-skin blotches on the sheath near the water line' } },
    { key: 'stem_borer', kind: 'pest', bn: 'মাজরা পোকা', en: 'Stem borer', look: { bn: 'মাঝের পাতা মরে যায়, পরে সাদা খালি শিষ', en: 'Dead centre leaves; later white empty panicles' } },
    { key: 'bph', kind: 'pest', urgent: true, bn: 'বাদামি গাছফড়িং', en: 'Brown planthopper', look: { bn: 'গোড়ায় বাদামি ফড়িং, জমির মাঝে গোল হয়ে ধান পুড়ে যায় (হপার বার্ন)', en: 'Brown hoppers at the base; round patches of the crop dry out ("hopper burn")' } },
  ],
  wheat: [
    { key: 'wheat_blast', kind: 'disease', urgent: true, bn: 'গমের ব্লাস্ট', en: 'Wheat blast', look: { bn: 'শিষের ওপরের অংশ হঠাৎ সাদা হয়ে শুকায়, দানা চুপসে যায়', en: 'Upper part of the ear suddenly bleaches; grains shrivel' } },
    { key: 'leaf_rust', kind: 'disease', bn: 'পাতার মরিচা', en: 'Leaf rust', look: { bn: 'পাতায় কমলা-বাদামি গুঁড়ার মতো দাগ', en: 'Orange-brown powdery pustules on the leaves' } },
    { key: 'spot_blotch', kind: 'disease', bn: 'পাতা ঝলসানো', en: 'Spot blotch', look: { bn: 'পাতায় লম্বাটে গাঢ় বাদামি দাগ, পরে পাতা শুকায়', en: 'Long dark brown spots; leaves dry out' } },
    { key: 'rodent', kind: 'pest', bn: 'ইঁদুরের ক্ষতি', en: 'Rats', look: { bn: 'গাছ কাটা, জমিতে গর্ত', en: 'Cut stems and burrows in the field' } },
  ],
  lentil: [
    { key: 'stemphylium', kind: 'disease', urgent: true, bn: 'স্টেমফাইলিয়াম ব্লাইট', en: 'Stemphylium blight', look: { bn: 'ফুল আসার সময় পাতা বাদামি হয়ে ঝরে, জমি পোড়া দেখায়', en: 'At flowering leaves brown and fall; the field looks scorched' } },
    { key: 'root_rot', kind: 'disease', bn: 'গোড়া পচা', en: 'Foot and root rot', look: { bn: 'গাছ হলুদ হয়ে মরে, গোড়ায় সাদা ছত্রাক', en: 'Plants yellow and die, white fungus at the base' } },
    { key: 'lentil_rust', kind: 'disease', bn: 'মরিচা রোগ', en: 'Rust', look: { bn: 'পাতা-কাণ্ডে বাদামি গুঁড়ার দাগ', en: 'Brown powdery spots on leaves and stems' } },
    { key: 'aphid', kind: 'pest', bn: 'জাব পোকা', en: 'Aphids', look: { bn: 'ডগায় ছোট কালো পোকা দলবেঁধে', en: 'Clusters of small dark insects on the tips' } },
  ],
  // The Aman (Kharif-2) still in the field before the Rabi is sown: what farmers report in Bhadra–Kartik.
  aman: [
    { key: 'bph', kind: 'pest', urgent: true, bn: 'বাদামি গাছফড়িং (কারেন্ট পোকা)', en: 'Brown planthopper', look: { bn: 'গোড়ায় বাদামি ফড়িং, জমির মাঝে গোল হয়ে ধান পুড়ে যায় (হপার বার্ন)', en: 'Brown hoppers at the base; round patches of the crop dry out ("hopper burn")' } },
    { key: 'blast', kind: 'disease', urgent: true, bn: 'শিষ ভাঙা রোগ (ব্লাস্ট)', en: 'Neck blast', look: { bn: 'শিষের গোড়া কালো হয়ে শিষ ভেঙে ঝুলে পড়ে, দানা চিটা', en: 'The neck of the head blackens and breaks; the grains stay empty' } },
    { key: 'stem_borer', kind: 'pest', bn: 'মাজরা পোকা', en: 'Stem borer', look: { bn: 'শিষ সাদা হয়ে যায়, টান দিলে সহজে উঠে আসে', en: 'White heads that pull out easily' } },
    { key: 'rice_bug', kind: 'pest', bn: 'গান্ধি পোকা', en: 'Rice bug', look: { bn: 'দুধ আসার সময় দানার রস চুষে খায়, দানা চিটা হয়; জমিতে বাজে গন্ধ', en: 'Sucks the milky grains, leaving them empty; the field smells' } },
    { key: 'sheath_blight', kind: 'disease', bn: 'খোল পোড়া', en: 'Sheath blight', look: { bn: 'পানির কাছে খোলে সাপের চামড়ার মতো ছোপ', en: 'Snake-skin blotches on the sheath near the water line' } },
    { key: 'bacterial_blight', kind: 'disease', bn: 'পাতা পোড়া (ব্যাকটেরিয়াজনিত)', en: 'Bacterial leaf blight', look: { bn: 'পাতার কিনারা থেকে হলদে-সাদা হয়ে শুকায়, ঝড়-বৃষ্টির পর বাড়ে', en: 'Leaves dry yellow-white from the edges, worse after storms' } },
    { key: 'false_smut', kind: 'disease', bn: 'লক্ষ্মীর গু (ভুয়া ঝুল)', en: 'False smut', look: { bn: 'দানার জায়গায় হলদে-সবুজ গুটি, পরে কালচে হয়', en: 'Yellow-green balls in place of grains, later turning dark' } },
    { key: 'rodent', kind: 'pest', bn: 'ইঁদুরের ক্ষতি', en: 'Rats', look: { bn: 'রাতে শিষ আর গাছ কেটে ফেলে, আলে গর্ত', en: 'Heads and stems cut at night; burrows in the bunds' } },
  ],
};

// Every problem as a symptom name, for the officer's lists (merged into SYMPTOMS).
export const PROBLEM_NAMES = Object.fromEntries(Object.values(CROP_PROBLEMS).flat().map((p) => [p.key, { bn: p.bn, en: p.en }]));
