// What farmers and officers actually say, in Bangla script (what Bangla speech recognition returns) and plain English.
// Spoken Bangladeshi Bangla varies a lot, so each intent lists several everyday ways of saying it, including the
// regional forms farmers use (দিমু, লাগামু, করুম, রোয়া, কয় মণ, দেওন), each tested in voice.test.js.
// Matching is substring-based on folded text (see bn.js), so stems like "টমেটো" also catch "টমেটোর", "টমেটোতে".
import { foldAll } from './bn.js';

export const CROP_WORDS = {
  tomato: foldAll(['টমেটো', 'টমাটো', 'tomato']),
  boro: foldAll(['বোরো', 'ধান', 'চাল', 'boro', 'rice', 'paddy']),
  wheat: foldAll(['গম', 'wheat']),
  lentil: foldAll(['মসুর', 'মশুর', 'lentil']),
  mustard: foldAll(['সরিষা', 'সরষে', 'mustard']),
  mungbean: foldAll(['মুগ', 'মুঙ্গ', 'mung']),
  sesame: foldAll(['তিল', 'sesame']),
  jute: foldAll(['পাট', 'jute']),
  aus: foldAll(['আউশ', 'aus']),
  aman: foldAll(['আমন', 'aman']),
};

export const YES = foldAll(['হ্যাঁ', 'হ্যা', 'হাঁ', 'হা', 'জি', 'জী', 'ঠিক আছে', 'ঠিক', 'পাঠান', 'পাঠাও', 'পাঠিয়ে দিন', 'করুন', 'করো', 'ওকে', 'ঠিকাছে', 'yes', 'yeah', 'ok', 'okay', 'sure', 'send', 'confirm', 'go ahead']);
export const NO = foldAll(['না', 'নাহ', 'নয়', 'থাক', 'বাদ', 'বাদ দিন', 'বাতিল', 'দরকার নেই', 'পাঠাবেন না', 'no', 'nope', 'cancel', 'stop', 'dont', "don't"]);

export const INTENTS = {
  greet: foldAll(['হ্যালো', 'হ্যাল', 'সালাম', 'আসসালামু', 'নমস্কার', 'শুভ সকাল', 'শুভ সন্ধ্যা', 'hello', 'hi', 'hey', 'good morning']),
  help: foldAll(['কী করতে পারো', 'কি করতে পারো', 'কী পারো', 'কি পারো', 'কী করতে পারেন', 'কি করতে পারেন', 'সাহায্য করো', 'সাহায্য করুন', 'মেনু', 'কী জিজ্ঞেস', 'কি জিজ্ঞেস', 'কী জানতে পারি', 'কি জানতে পারি', 'what can you do', 'menu', 'help me']),
  stop: foldAll(['থামো', 'থামুন', 'চুপ', 'বন্ধ করো', 'বন্ধ করুন', 'শেষ', 'বিদায়', 'আল্লাহ হাফেজ', 'খোদা হাফেজ', 'goodbye', 'bye', 'be quiet']),
  repeat: foldAll(['আবার বলো', 'আবার বলুন', 'আবার বল', 'আরেকবার', 'আরেক বার', 'শুনতে পাইনি', 'বুঝিনি', 'বুঝতে পারিনি', 'repeat', 'say again', 'again']),
  langEn: foldAll(['ইংরেজিতে', 'ইংলিশে', 'in english', 'english please', 'speak english']),
  langBn: foldAll(['বাংলায় বলো', 'বাংলায় বলুন', 'বাংলাতে', 'in bangla', 'in bengali', 'speak bangla']),

  // ── farmer ──
  compare: foldAll(['তুলনা', 'পাশাপাশি', 'বিকল্প কী', 'বিকল্প কি', 'বিকল্পগুলো', 'অন্য কী ফসল', 'অন্য কি ফসল', 'কোনটা ভালো', 'কোনটা বেশি ভালো', 'কোনডা ভালো', 'compare', 'comparison', 'options', 'alternatives', 'which is better', 'side by side']),
  plan: foldAll(['কি দিমু', 'কী দিমু', 'কি লাগামু', 'কী লাগামু', 'লাগামু', 'কি বুনমু', 'কী বুনমু', 'কোনটা লাগামু', 'কী লাগাব', 'কি লাগাব', 'কী লাগাবো', 'কি লাগাবো', 'কী চাষ', 'কি চাষ', 'কোন ফসল', 'কোন ফসলটা', 'কী ফসল', 'কি ফসল', 'ফসলের পরিকল্পনা', 'পরিকল্পনা', 'সুপারিশ', 'রবি মৌসুম', 'রবিতে', 'চাষ করব', 'চাষ করবো', 'বদলাব', 'পাল্টাব', 'what to plant', 'what should i plant', 'which crop', 'recommend', 'my plan', 'keep adjust shift']),
  when: foldAll(['বীজতলা কবে', 'বীজতলা কখন', 'কবে করুম', 'রোয়া কবে', 'রুয়া কবে', 'রোয়া কখন', 'চারা কবে', 'কবে লাগাব', 'কবে লাগাবো', 'কখন লাগাব', 'কখন লাগাবো', 'কবে রোপণ', 'কখন রোপণ', 'কবে বুনব', 'কবে বুনবো', 'কবে বীজ', 'কখন বীজ', 'কোন তারিখে', 'কত তারিখ', 'লাগানোর সময়', 'রোপণের সময়', 'বোনার সময়', 'planting date', 'when to plant', 'when should i plant', 'when to sow']),
  why: foldAll(['কেন', 'কারণ', 'কীভাবে হিসাব', 'কিভাবে হিসাব', 'কিসের ভিত্তিতে', 'প্রমাণ', 'why']),
  water: foldAll(['পানি দেওন', 'পানি দেওয়া লাগবে', 'পানি দেওয়া লাগবো', 'পানি দিমু', 'শ্যালো', 'মেশিন চালা', 'সেচ মেশিন', 'সেচ', 'পানি দেব', 'পানি দিব', 'পানি দিতে', 'জল দেব', 'আজ পানি', 'পানি লাগবে', 'পানি লাগবে কি', 'ভেজা', 'শুকনো', 'irrigat', 'water today', 'should i water', 'need water']),
  weather: foldAll(['আবহাওয়া', 'বৃষ্টি', 'বৃষ্টি হবে', 'গরম', 'তাপমাত্রা', 'ঝড়', 'কুয়াশা', 'শীত', 'weather', 'rain', 'temperature', 'forecast']),
  harvest: foldAll(['পাকতে', 'কয় মণ', 'কয় মন', 'কত মন', 'কাটমু', 'কবে কাটমু', 'কবে তুলব', 'কবে তুলবো', 'কবে উঠবে', 'কখন উঠবে', 'কবে কাটব', 'কবে কাটবো', 'ফসল তোলা', 'ফসল তোলার', 'ফলন', 'কত মণ', 'কত ফলন', 'কত ফসল পাব', 'কত ফসল পাবো', 'harvest', 'yield', 'how much will i get', 'when will it be ready']),
  price: foldAll(['বেচমু', 'বেচুম', 'হিমাগার', 'কোল্ড স্টোর', 'দাম', 'বিক্রি', 'বাজার', 'বাজারে', 'দাম পড়', 'দাম কমে', 'আড়ত', 'বেচব', 'বেচবো', 'sell', 'price', 'market', 'glut']),
  next: foldAll(['কাটার পর কী', 'কাটার পর কি', 'তোলার পর কী', 'তোলার পর কি', 'কাটার পরে', 'তোলার পরে', 'পরের ফসল', 'পরের মৌসুম', 'পরে কী', 'পরে কি', 'এর পর কী', 'এরপর কী', 'এরপর কি', 'ফসলচক্র', 'ফসল চক্র', 'খরিফ', 'আউশ', 'আমন', 'মুগ', 'তিল', 'পাট', 'rotation', 'next crop', 'next season', 'after this']),
  soil: foldAll(['কোন সার', 'কতটুকু সার', 'সার কতটুকু', 'সার কত', 'ইউরিয়া', 'টিএসপি', 'এমওপি', 'পটাশ সার', 'urea', 'মাটি', 'মাটির', 'কত সার', 'কী সার', 'কি সার', 'ফসফরাস', 'পটাশ', 'পিএইচ', 'soil', 'fertili']),
  problem: foldAll(['হলুদ হই', 'হলদে', 'মইরা', 'পোকা ধরছে', 'পচা ধরছে', 'রোগ', 'পোকা', 'জাব', 'দাগ', 'নেতিয়ে', 'নেতানো', 'ঢলে', 'শুকিয়ে যাচ্ছে', 'ঝরে', 'হলুদ হয়ে', 'পচে', 'মরে যাচ্ছে', 'সমস্যা', 'অভিযোগ', 'জানাতে চাই', 'জানাব', 'রিপোর্ট', 'পানি পাচ্ছি না', 'সেচ পাচ্ছি না', 'নলকূপ', 'disease', 'pest', 'spots', 'wilting', 'problem', 'report', 'blight', 'aphid']),
  officer: foldAll(['কৃষি অফিসার', 'অফিসার', 'উপসহকারী', 'কর্মকর্তা', 'কৃষি অফিস', 'কার সাথে কথা', 'কার সঙ্গে কথা', 'কাকে জানাব', 'কাকে জানাবো', 'যোগাযোগ', 'ফোন নম্বর', 'কল সেন্টার', 'saao', 'uao', 'officer', 'contact', 'call centre', 'call center']),
  myreq: foldAll(['জবাব', 'উত্তর আইছে', 'উত্তর আসছে', 'আমার অনুরোধ', 'আমার আবেদন', 'আমার প্রশ্নের উত্তর', 'উত্তর এসেছে', 'উত্তর এল', 'কী হল', 'কি হল', 'বার্তা', 'মেসেজ', 'পরামর্শ এসেছে', 'অনুরোধের অবস্থা', 'my request', 'any reply', 'any message', 'status']),
  nasa: foldAll(['নাসা', 'তথ্য কোথা', 'কোথা থেকে', 'ডেটা', 'ডাটা', 'স্যাটেলাইট', 'কতটা নির্ভরযোগ্য', 'নির্ভরযোগ্য', 'বিশ্বাস', 'nasa', 'data source', 'come from', 'comes from', 'satellite', 'reliable', 'trust']),

  // ── officer (SAAO / UAO) ──
  briefing: foldAll(['আজকের অবস্থা', 'আজকের চিত্র', 'আজকের খবর', 'সারাংশ', 'ব্রিফিং', 'কী খবর', 'কি খবর', 'কী অবস্থা', 'কি অবস্থা', 'কী চলছে', 'কি চলছে', 'শুরু করি', 'overview', 'briefing', 'summary', "what's happening", 'whats happening', 'today']),
  requests: foldAll(['অনুরোধ', 'কৃষকের অনুরোধ', 'কে সাহায্য', 'সাহায্য চেয়েছে', 'কারা জানিয়েছে', 'কারা জানিয়েছেন', 'জরুরি কী', 'জরুরি কি', 'খোলা অনুরোধ', 'ইনবক্স', 'requests', 'inbox', 'who needs help', 'urgent']),
  open_req: foldAll(['প্রথমটা', 'প্রথমটি', 'প্রথম অনুরোধ', 'দ্বিতীয়টা', 'দ্বিতীয়টি', 'তৃতীয়টা', 'তৃতীয়টি', 'পরেরটা', 'পরেরটি', 'এক নম্বর', 'দুই নম্বর', 'তিন নম্বর', 'নম্বর অনুরোধ', 'খুলুন', 'পড়ুন', 'পড়ে শোনান', 'বিস্তারিত', 'details', 'open request', 'read request', 'next one', 'first one']),
  more_photo: foldAll(['আরও ছবি', 'আরো ছবি', 'আরেকটা ছবি', 'ছবি চাই', 'ছবি চান', 'ছবি পাঠাতে বলুন', 'more photo', 'ask for photo', 'ask for more']),
  resolve: foldAll(['মিটে গেছে', 'সমাধান হয়েছে', 'সমাধান', 'বন্ধ করুন অনুরোধ', 'মিটমাট', 'resolved', 'mark resolved', 'close it', 'close request']),
  alerts: foldAll(['সতর্কতা', 'এলাকার সতর্কতা', 'আগাম সতর্কতা', 'ছড়িয়ে পড়ছে', 'গুচ্ছ', 'ক্লাস্টার', 'কাছাকাছি একই', 'alerts', 'warnings', 'cluster', 'outbreak', 'hotspot']),
  send_advice: foldAll(['সবাইকে পরামর্শ', 'সবাইকে জানান', 'সবাইকে পাঠান', 'এলাকার সবাইকে', 'পরামর্শ পাঠান', 'পরামর্শ দিন', 'কৃষকদের পাঠান', 'send advice', 'advise everyone', 'advise them all', 'broadcast']),
  escalate: foldAll(['উপজেলা অফিসারকে জানান', 'উপজেলায় জানান', 'উপজেলা অফিসারকে', 'ওপরে জানান', 'উপরে জানান', 'উপজেলায় পাঠান', 'tell the upazila', 'escalate', 'send up', 'tell uao']),
  supply: foldAll(['কবে কত ফসল', 'কত টন', 'কোন সপ্তাহে', 'সাপ্তাহিক', 'ফসল তোলার চাপ', 'বাজারে একসঙ্গে', 'দাম পড়ার ঝুঁকি', 'একসাথে উঠবে', 'একসঙ্গে উঠবে', 'harvest timing', 'tonnes', 'per week', 'glut risk', 'price drop', 'price-drop']),
  slots: foldAll(['লাগানোর পালা', 'পালা', 'স্লট', 'চারা লাগানোর পালা', 'কোন পালায়', 'planting slot', 'slots', 'slot']),
  farmers: foldAll(['কতজন কৃষক', 'কত জন কৃষক', 'কৃষকের সংখ্যা', 'কত জমি', 'কতটা জমি', 'কোন ফসল কতটা', 'ফসলের ভাগ', 'how many farmers', 'farmer count', 'land by crop', 'crop share']),
  upazila: foldAll(['ইউনিয়ন র‌্যাংকিং', 'ইউনিয়ন র‍্যাংকিং', 'কোন ইউনিয়ন', 'ইউনিয়নের ক্রম', 'কোন ইউনিয়নে ঝুঁকি', 'উপজেলার চিত্র', 'উপজেলার সার্বিক', 'সার্বিক চিত্র', 'ইউনিয়নগুলো', 'union ranking', 'which union', 'upazila overview', 'rank']),
  upazila_advice: foldAll(['পুরো উপজেলায় পরামর্শ', 'সারা উপজেলায়', 'উপজেলা জুড়ে', 'উপজেলার সব কৃষক', 'সব কৃষককে পরামর্শ', 'upazila wide', 'whole upazila', 'all farmers advice']),
  ack: foldAll(['দেখেছি', 'দেখেছি বলে জানান', 'মাঠকর্মীরা কী জানিয়েছে', 'মাঠকর্মীরা কি জানিয়েছে', 'পাঠানো বিষয়', 'ওপরে পাঠানো', 'উপরে পাঠানো', 'mark as seen', 'seen it', 'what was sent up', 'acknowledge']),
  radar: foldAll(['রোপণ রাডার', 'ropan radar', 'আমন রাডার', 'aman radar', 'আমন', 'রাডার', 'বৃষ্টির শুরু', 'বর্ষার শুরু', 'বৃষ্টি শুরু', 'রোপণ আর বৃষ্টি', 'রোপণের ব্যবধান', 'ব্যবধান', 'সেন্টিনেল', 'নিসার', 'ropon', 'radar', 'aman', 'onset', 'adaptation gap', 'sentinel', 'nisar', 'transplant']),
};

export const SYMPTOM_WORDS = {
  water: foldAll(['পানি পাচ্ছি না', 'সেচ পাচ্ছি না', 'পালা', 'নলকূপ', 'ফেটে যাচ্ছে', 'জমি ফেটে', 'পানির অভাব', 'water', 'tube well', 'tubewell', 'irrigation']),
  wilt: foldAll(['নেতিয়ে', 'নেতানো', 'ঢলে', 'হঠাৎ মরে', 'মরে যাচ্ছে', 'wilt', 'collapse', 'dying']),
  aphid: foldAll(['জাব', 'পোকা', 'ইঁদুর', 'শুঁয়োপোকা', 'মাজরা', 'পাতা মোড়ানো', 'aphid', 'insect', 'pest', 'worm']),
  leaf_spot: foldAll(['দাগ', 'বাদামি', 'কালচে', 'ধসা', 'ব্লাইট', 'পাতা পোড়া', 'পাতা পুড়ে', 'ছত্রাক', 'পচা', 'হলুদ', 'spot', 'blight', 'rot', 'yellow', 'mold', 'fungus']),
};

export const URGENT_WORDS = foldAll(['জরুরি', 'দ্রুত', 'সব গাছ', 'পুরো জমি', 'ছড়িয়ে পড়ছে', 'ছড়াচ্ছে', 'পাশের জমিতেও', 'অনেক বেড়ে', 'দুই দিনে', 'urgent', 'spreading', 'whole field', 'all plants']);
export const EMERGENCY_WORDS = foldAll(['আগুন', 'বিষ খেয়ে', 'বিষ খেয়েছে', 'বজ্রপাত', 'বিদ্যুৎস্পৃষ্ট', 'সাপে কেটেছে', 'অজ্ঞান', 'মারা যাচ্ছে', 'প্রাণ', 'fire', 'poison', 'snake bite', 'unconscious', 'electric shock', 'dying person']);

export const ORDINALS = [
  { n: 0, words: foldAll(['প্রথম', 'এক নম্বর', 'first']) },
  { n: 1, words: foldAll(['দ্বিতীয়', 'দুই নম্বর', 'second']) },
  { n: 2, words: foldAll(['তৃতীয়', 'তিন নম্বর', 'third']) },
];
