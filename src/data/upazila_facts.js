// Published facts about each upazila's farming, each with its source and date, for the officer's whole-upazila page.
// Only what a source states is kept here; where nothing current was found online, the entry says so (null), and
// the page shows that rather than a guess. Checked 18 October 2026.
export const UPAZILA_FACTS = {
  godagari: {
    season: {
      year: 2026,
      items: [
        { key: 'aman', bn: 'আমন ধান', en: 'Aman rice', ha: 23762 },
        { key: 'aus', bn: 'আউশ ধান', en: 'Aus rice', ha: 12810 },
      ],
      source: {
        bn: 'উপজেলা কৃষি অফিসের তথ্য, খবর ২৪ ঘণ্টা, ২৩ আগস্ট ২০২৬', en: 'Upazila agriculture office figures, Khobor 24 Ghonta, 23 August 2026',
        url: 'https://khobor24ghonta.com/%E0%A6%97%E0%A7%8B%E0%A6%A6%E0%A6%BE%E0%A6%97%E0%A6%BE%E0%A6%A1%E0%A6%BC%E0%A7%80%E0%A6%A4%E0%A7%87-%E0%A6%86%E0%A6%AE%E0%A6%A8%E0%A7%87%E0%A6%B0-%E0%A6%B8%E0%A6%AC%E0%A7%81%E0%A6%9C-%E0%A6%B8/',
        quote: { bn: 'আবহাওয়া অনুকূলে থাকলে এবং কৃষকেরা সঠিকভাবে পরিচর্যা অব্যাহত রাখলে এবার আমনে ভালো ফলন পাওয়ার আশা করছি।', by: 'মরিয়ম আহমেদ, উপজেলা কৃষি অফিসার' },
      },
    },
    profile: {
      crops: { bn: ['ধান', 'পাট', 'গম', 'মাষকলাই', 'আখ', 'ছোলা', 'মসুর', 'শাকসবজি'], en: ['Paddy', 'Jute', 'Wheat', 'Black gram', 'Sugarcane', 'Gram', 'Lentil', 'Vegetables'] },
      fruits: { bn: ['আম', 'কাঁঠাল', 'লিচু', 'বেল', 'তাল'], en: ['Mango', 'Jackfruit', 'Litchi', 'Wood-apple', 'Palm'] },
      fading: { bn: ['আউশ ধান', 'তিল', 'সরিষা', 'কাউন', 'তিসি', 'রাই', 'তরমুজ'], en: ['Aus paddy', 'Sesame', 'Mustard', 'Foxtail millet', 'Linseed', 'Rai', 'Watermelon'] },
      agriIncome: 69.98, landless: 57.61,
      source: { bn: 'বাংলাপিডিয়া, গোদাগাড়ী উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Godagari Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Godagari_Upazila' },
      note: { bn: 'বাংলাপিডিয়ায় আউশ আর সরিষা "প্রায় হারিয়ে যাওয়া" লেখা আছে, কিন্তু কৃষি অফিসের ২০২৬-এর হিসাবে গোদাগাড়ীতে ১২,৮১০ হেক্টরে আউশ হয়েছে: পুরোনো তালিকা এখন আর খাটে না।', en: 'Banglapedia lists Aus and mustard as nearly gone, but the agriculture office counted 12,810 ha of Aus in Godagari in 2026: the old list no longer holds.' },
    },
    changes: null,
  },
  dhamrai: {
    season: null, // no 2026 crop-area figure for Dhamrai was found online (searched 18 October 2026)
    profile: {
      crops: { bn: ['ধান', 'পাট', 'ভুট্টা', 'সরিষা', 'আলু', 'শাকসবজি'], en: ['Paddy', 'Jute', 'Maize', 'Mustard', 'Potato', 'Vegetables'] },
      fruits: { bn: ['আম', 'কাঁঠাল', 'নারকেল', 'পেয়ারা'], en: ['Mango', 'Jackfruit', 'Coconut', 'Guava'] },
      fading: { bn: ['খেসারি', 'কাউন', 'চিনা', 'ছোলা'], en: ['Grass pea', 'Foxtail millet', 'Proso millet', 'Gram'] },
      agriIncome: 55.47, landless: 36.92,
      source: { bn: 'বাংলাপিডিয়া, ধামরাই উপজেলা; উপজেলা তথ্য বাতায়ন (প্রধান ফসল: ধান, ভুট্টা, সরিষা, শাকসবজি)', en: 'Banglapedia, Dhamrai Upazila; upazila portal (main crops: paddy, maize, mustard, vegetables)', url: 'https://en.banglapedia.org/index.php/Dhamrai_Upazila' },
    },
    changes: {
      items: [
        { bn: '২০১৫–১৬ সালে মোট কৃষিজমি প্রায় ২৩,৮০০ হেক্টর', en: 'About 23,800 ha of farmland in 2015–16' },
        { bn: '২০২৪–২৫ পর্যন্ত আবাদযোগ্য জমি কমেছে ১,১২৭ হেক্টর', en: 'Cultivable land down by 1,127 ha by 2024–25' },
        { bn: 'ধানের উৎপাদন ১ লাখ টনের বেশি থেকে নেমে প্রায় ৭৫ হাজার টন', en: 'Rice output fell from over 100,000 t to about 75,000 t' },
        { bn: 'গম, ভুট্টা, সরিষা আর সবজির আবাদ বেড়েছে', en: 'Wheat, maize, mustard and vegetables increased' },
        { bn: 'ডাউটিয়া ও লাগোয়া জয়পুরা মৌজার প্রায় ২০০ একর জমিতে ৮–১০ বছর ধরে পানি জমছে, তাতে কারখানার বর্জ্য মিশছে', en: 'About 200 acres of Dautia and neighbouring Joypura mouza have stood under water for 8–10 years, with factory waste in it' },
      ],
      source: { bn: 'প্রথম আলো, ৪ ডিসেম্বর ২০২৫ (ধামরাই উপজেলা কৃষি অফিসের তথ্য)', en: 'Prothom Alo, 4 December 2025 (Dhamrai upazila agriculture office figures)', url: 'https://www.prothomalo.com/bangladesh/ddiuclt1hj' },
    },
  },
  sitakunda: {
    season: null, // no current crop-area figure was found online (searched 19 October 2026)
    profile: {
      crops: { bn: ['ধান', 'পান', 'আদা', 'হলুদ', 'পেঁয়াজ', 'রাবার', 'শাকসবজি'], en: ['Paddy', 'Betel leaf', 'Ginger', 'Turmeric', 'Onion', 'Rubber', 'Vegetables'] },
      fruits: { bn: ['আম', 'কাঁঠাল', 'পেঁপে', 'পেয়ারা', 'নারকেল', 'সুপারি', 'তরমুজ', 'আনারস'], en: ['Mango', 'Jackfruit', 'Papaya', 'Guava', 'Coconut', 'Betel nut', 'Watermelon', 'Pineapple'] },
      fading: { bn: [], en: [] },
      agriIncome: 24.12, landless: 64.63,
      source: { bn: 'বাংলাপিডিয়া, সীতাকুণ্ড উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Sitakunda Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Sitakunda_Upazila' },
    },
    changes: null,
  },
  dacope: {
    season: null, // no current crop-area figure was found online (searched 19 October 2026)
    profile: {
      crops: { bn: ['ধান', 'আলু', 'মিষ্টিকুমড়া', 'শাকসবজি'], en: ['Paddy', 'Potato', 'Pumpkin', 'Vegetables'] },
      fruits: { bn: ['নারকেল', 'পেয়ারা', 'বরই', 'সফেদা', 'বাঙ্গি', 'তরমুজ'], en: ['Coconut', 'Guava', 'Plum', 'Sapodilla', 'Bangi melon', 'Watermelon'] },
      fading: { bn: ['পাট', 'তিল', 'আউশ ধান', 'বোরো ধান'], en: ['Jute', 'Sesame', 'Aus paddy', 'Boro paddy'] },
      agriIncome: 66.07, landless: 44.98,
      source: { bn: 'বাংলাপিডিয়া, দাকোপ উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Dacope Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Dacope_Upazila' },
      note: { bn: 'বাংলাপিডিয়ায় বোরো আর তিল "প্রায় হারিয়ে যাওয়া" ফসল: শুকনো মৌসুমের লবণই এর বড় কারণ।', en: 'Banglapedia lists Boro and sesame among crops nearly gone: dry-season salt is the main reason.' },
    },
    changes: null,
  },
  bakerganj: {
    season: null, // no current crop-area figure was found online (searched 19 October 2026)
    profile: {
      crops: { bn: ['ধান', 'গম', 'পাট', 'সরিষা', 'আলু', 'পান'], en: ['Paddy', 'Wheat', 'Jute', 'Mustard', 'Potato', 'Betel leaf'] },
      fruits: { bn: ['আম', 'কাঁঠাল', 'কলা', 'লিচু', 'জাম', 'সুপারি', 'পেঁপে', 'নারকেল'], en: ['Mango', 'Jackfruit', 'Banana', 'Litchi', 'Black berry', 'Betel nut', 'Papaya', 'Coconut'] },
      fading: { bn: ['ডাল', 'কাউন', 'তিসি', 'অড়হর'], en: ['Pulses', 'Foxtail millet', 'Linseed', 'Pigeon pea'] },
      agriIncome: 42, landless: 30.37,
      source: { bn: 'বাংলাপিডিয়া, বাকেরগঞ্জ উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Bakerganj Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Bakerganj_Upazila' },
    },
    changes: null,
  },
  gangachara: {
    season: null, // no current crop-area figure was found online (searched 19 October 2026)
    profile: {
      crops: { bn: ['ধান', 'পাট', 'তামাক', 'গম', 'আলু', 'আদা', 'ভুট্টা', 'বেগুন', 'পেঁয়াজ', 'পটল', 'মরিচ', 'শাকসবজি'], en: ['Paddy', 'Jute', 'Tobacco', 'Wheat', 'Potato', 'Ginger', 'Maize', 'Brinjal', 'Onion', 'Pointed gourd', 'Chilli', 'Vegetables'] },
      fruits: { bn: ['আম', 'জাম', 'কাঁঠাল', 'কলা', 'পেঁপে'], en: ['Mango', 'Black berry', 'Jackfruit', 'Banana', 'Papaya'] },
      fading: { bn: ['তিল', 'তিসি', 'কাউন', 'মিষ্টি আলু'], en: ['Sesame', 'Linseed', 'Foxtail millet', 'Sweet potato'] },
      agriIncome: 76.04, landless: 41.56,
      source: { bn: 'বাংলাপিডিয়া, গঙ্গাচড়া উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Gangachara Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Gangachara_Upazila' },
    },
    changes: null,
  },
  gowainghat: {
    season: null, // no current crop-area figure was found online (searched 19 October 2026)
    profile: {
      crops: { bn: ['ধান', 'চা', 'পান', 'সরিষা', 'শাকসবজি'], en: ['Paddy', 'Tea', 'Betel leaf', 'Mustard', 'Vegetables'] },
      fruits: { bn: ['কাঁঠাল', 'আম', 'পেঁপে', 'কলা', 'সুপারি', 'কমলা', 'আনারস', 'জাম্বুরা'], en: ['Jackfruit', 'Mango', 'Papaya', 'Banana', 'Betel nut', 'Orange', 'Pineapple', 'Pomelo'] },
      fading: { bn: ['তিসি', 'তিল', 'তৈকর', 'সাতকরা'], en: ['Linseed', 'Sesame', 'Taikor', 'Shatkora'] },
      agriIncome: 59.4, landless: 43.7,
      source: { bn: 'বাংলাপিডিয়া, গোয়াইনঘাট উপজেলা (আদমশুমারি-ভিত্তিক, পুরোনো তথ্য)', en: 'Banglapedia, Gowainghat Upazila (census-based, older figures)', url: 'https://en.banglapedia.org/index.php/Gowainghat_Upazila' },
      note: { bn: 'বাংলাপিডিয়ায় সাতকরা "প্রায় হারিয়ে যাওয়া" ফসলের তালিকায়; টিলার টক মাটি আর ডাইব্যাক রোগে বাগান কমেছে।', en: 'Banglapedia lists shatkora among crops nearly gone; acid tila soil and dieback have thinned the gardens.' },
    },
    changes: null,
  },
};
