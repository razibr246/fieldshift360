// The neighbouring countries: one sample farm and one national agriculture desk each for India, Pakistan, Nepal,
// Bhutan and Myanmar. The farmers are sample people (not real), each placed on a real cropland field next to a real
// village (Esri/Impact Observatory 10 m land cover, GeoNames, geoBoundaries). The heads of office are named only
// where an official page we could read on 19 October 2026 names them; otherwise only the office is shown.
// Every number on the pages comes from src/data/abroad/<country>.json (scripts/data/build_neighbours.py) or from the
// live forecast; the facts below carry their source.

export const ABROAD_ORDER = ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar'];
export const READ_ON = '2026-10-19';

const src = (label, url) => ({ label, url });

export const ABROAD = {
  india: {
    id: 'india', flag: '🇮🇳', tone: '#c76a1c', soft: '#fbeee2',
    name: { bn: 'ভারত', en: 'India', local: 'भारत' },
    unit: { bn: 'একর', en: 'acre', dec: 100 },
    farmer: {
      id: 'HARJINDER', name: { bn: 'হরজিন্দর সিং', en: 'Harjinder Singh', local: 'ਹਰਜਿੰਦਰ ਸਿੰਘ' },
      village: { bn: 'বদরুখাঁ', en: 'Badrukhan' },
      place: { bn: 'সাংরুর তহসিল, সাংরুর জেলা, পাঞ্জাব', en: 'Sangrur tehsil, Sangrur district, Punjab' },
      farmDec: 1000,
      water: { bn: 'নিজের নলকূপ (সাবমার্সিবল পাম্প)', en: 'Own tubewell (submersible pump)' },
      now: { bn: 'ধান কাটা শেষ, খড় জমিতে পড়ে আছে', en: 'Paddy cut, the straw still lies on the field' },
      next: { bn: 'গম বোনা (নভেম্বরের প্রথম পক্ষ, ১৫ নভেম্বরের মধ্যে)', en: 'Sow wheat (first half of November, by 15 November)' },
      intro: {
        bn: 'হরজিন্দর ১০ একরে ধান আর গম করেন — পাঞ্জাবের সেই ধান–গম চক্র, যা ভারতের খাদ্য গুদাম ভরায়। এখন অক্টোবর: ধান কাটা হয়েছে, আর গম বোনার আগে হাতে আছে মাত্র দুই-তিন সপ্তাহ। খড় পোড়ালে কাজ দ্রুত হয়, কিন্তু সেটা নিষিদ্ধ, আর ধোঁয়া যায় দিল্লি পর্যন্ত।',
        en: 'Harjinder farms 10 acres of rice and wheat — the Punjab rice–wheat cycle that fills India’s grain stores. It is October: the paddy is cut, and there are two or three weeks before wheat must go in. Burning the straw is fast, but it is banned, and the smoke reaches Delhi.',
      },
    },
    local: {
      role: { bn: 'ব্লক কৃষি কর্মকর্তা, সাংরুর', en: 'Block Agriculture Officer, Sangrur' },
      office: { bn: 'ব্লক কৃষি কার্যালয়, সাংরুর — কৃষি ও কৃষক কল্যাণ বিভাগ, পাঞ্জাব সরকার (জেলার মুখ্য কৃষি কর্মকর্তার অধীনে)', en: 'Block Agriculture Office, Sangrur — Department of Agriculture & Farmers Welfare, Government of Punjab (under the district’s Chief Agriculture Officer)' },
      area: { bn: 'সাংরুর তহসিল', en: 'Sangrur tehsil' }, level: { bn: 'তহসিল/ব্লক — বাংলাদেশের উপজেলার মতো', en: 'Tehsil/block — like a Bangladesh upazila' }, phone: '01672-234220', phoneOf: { bn: 'জেলা মুখ্য কৃষি কার্যালয়', en: 'district Chief Agriculture Office' },
      source: src('Sangrur district site: Department of Agriculture', 'https://sangrur.nic.in/departments/department-of-agriculture/'),
      noName: { bn: 'জেলার সরকারি পাতায় কৃষি দপ্তর আর ফোন নম্বর আছে, কিন্তু ব্লক কর্মকর্তার নাম নেই — তাই নাম দেখানো হচ্ছে না।', en: 'The district’s official page lists the agriculture office and its phone, but not the block officer’s name — so no name is shown.' },
      sms: 'hi',
    },
    officer: {
      office: { bn: 'কৃষি ও কৃষক কল্যাণ বিভাগ, কৃষি ও কৃষক কল্যাণ মন্ত্রণালয়', en: 'Department of Agriculture & Farmers Welfare, Ministry of Agriculture & Farmers Welfare' },
      city: { bn: 'কৃষি ভবন, নয়াদিল্লি', en: 'Krishi Bhawan, New Delhi' },
      head: {
        name: { bn: 'অতীশ চন্দ্র', en: 'Atish Chandra' },
        role: { bn: 'সচিব (আইএএস), দায়িত্ব নেন ২৮ ফেব্রুয়ারি ২০২৬', en: 'Secretary (IAS), took charge 28 February 2026' },
        source: src('PM-KISAN contact page (Government of India)', 'https://pmkisan.gov.in/Contacts.aspx'),
      },
    },
    zones: {
      punjab: { name: { bn: 'সাংরুর, পাঞ্জাব', en: 'Sangrur, Punjab' }, crop: { bn: 'ধান–গম', en: 'Rice–wheat' }, line: { bn: 'খড় পোড়ানো, ভূগর্ভের পানি নামছে', en: 'Straw burning, falling groundwater' } },
      vidarbha: { name: { bn: 'যবতমাল, বিদর্ভ (মহারাষ্ট্র)', en: 'Yavatmal, Vidarbha (Maharashtra)' }, crop: { bn: 'বৃষ্টিনির্ভর তুলা, সয়াবিন', en: 'Rain-fed cotton, soybean' }, line: { bn: 'অনিয়মিত বর্ষা, কৃষকের ঋণ', en: 'Erratic monsoon, farm debt' } },
      barmer: { name: { bn: 'বাড়মের, রাজস্থান', en: 'Barmer, Rajasthan' }, crop: { bn: 'বাজরা, গুয়ার', en: 'Pearl millet, guar' }, line: { bn: 'মরুভূমি, তাপ আর খরা', en: 'Desert heat and drought' } },
      dhemaji: { name: { bn: 'ধেমাজি, আসাম', en: 'Dhemaji, Assam' }, crop: { bn: 'ধান', en: 'Rice' }, line: { bn: 'ব্রহ্মপুত্রের শাখানদীর বন্যা', en: 'Brahmaputra tributary floods' } },
      puri: { name: { bn: 'পুরী, ওড়িশা উপকূল', en: 'Puri, Odisha coast' }, crop: { bn: 'খরিফ ধান', en: 'Kharif rice' }, line: { bn: 'ঘূর্ণিঝড় আর জলোচ্ছ্বাস', en: 'Cyclones and storm surge' } },
      thanjavur: { name: { bn: 'থাঞ্জাভুর, কাবেরী বদ্বীপ (তামিলনাড়ু)', en: 'Thanjavur, Cauvery delta (Tamil Nadu)' }, crop: { bn: 'সাম্বা ধান', en: 'Samba rice' }, line: { bn: 'উত্তর-পূর্ব মৌসুমি বৃষ্টি শুরু হচ্ছে (অক্টো–ডিসে)', en: 'North-east monsoon starting (Oct–Dec)' } },
    },
    facts: [
      { bn: 'পাঞ্জাবে ২০২৫ মৌসুমে খড় পোড়ানোর ঘটনা গোনা হয়েছে ৫,০৮৫টি, আগের বছর ১০,৪৪৩টি; সাংরুর জেলায় ৬৯৫টি (পাঞ্জাব দূষণ নিয়ন্ত্রণ বোর্ডের হিসাব)।', en: 'Punjab counted 5,085 farm fires in the 2025 season against 10,443 the year before; Sangrur district had 695 (Punjab Pollution Control Board figures).', src: [src('The Tribune, 2025', 'https://www.tribuneindia.com/news/punjab/farm-fires-down-to-50-as-season-nears-end/amp'), src('The Tribune', 'https://www.tribuneindia.com/news/heart-of-punjab/heart-of-punjab-state-reports-54-drop-in-stubble-burning-tarn-taran-overtakes-sangrur/amp')] },
      { bn: 'পাঞ্জাব যত ভূগর্ভের পানি ফিরে পায়, তোলে তার চেয়ে অনেক বেশি: ২০২৫ সালে উত্তোলন ১৫৬.৩৬%, ভারতের সবচেয়ে বেশি (কেন্দ্রীয় ভূগর্ভস্থ পানি বোর্ড)।', en: 'Punjab pumps far more groundwater than comes back: extraction stood at 156.36% of recharge in 2025, the highest in India (Central Ground Water Board).', src: [src('CGWB assessment, reported July 2026', 'https://www.etvbharat.com/en/bharat/nearly-11-per-cent-groundwater-assessment-units-over-exploited-govt-enn26072007475')] },
      { bn: 'নাসার GRACE উপগ্রহ মাধ্যাকর্ষণ মেপে দেখিয়েছিল: ২০০২–২০০৮ সালে উত্তর-পশ্চিম ভারত (পাঞ্জাব, হরিয়ানা, রাজস্থান, দিল্লি) বছরে প্রায় ১৭.৭ ঘন কিলোমিটার ভূগর্ভের পানি হারিয়েছে।', en: 'NASA’s GRACE satellites, weighing water by its pull, showed north-west India (Punjab, Haryana, Rajasthan, Delhi) losing about 17.7 km³ of groundwater a year in 2002–2008.', src: [src('Rodell, Velicogna & Famiglietti (2009), Nature 460, 999–1002', 'https://doi.org/10.1038/nature08238')] },
    ],
    sources: [src('PAU: sow wheat by 15 November (The Tribune)', 'https://www.tribuneindia.com/news/punjab/sow-wheat-by-nov-15-to-prevent-grain-shrivelling-pau-to-farmers-448039'), src('Punjab Agricultural University', 'https://www.pau.edu/')],
  },

  pakistan: {
    id: 'pakistan', flag: '🇵🇰', tone: '#1f7a4c', soft: '#e3f3ea',
    name: { bn: 'পাকিস্তান', en: 'Pakistan', local: 'پاکستان' },
    unit: { bn: 'একর', en: 'acre', dec: 100 },
    farmer: {
      id: 'GHULAMNABI', name: { bn: 'গোলাম নবী চান্ডিও', en: 'Ghulam Nabi Chandio', local: 'غلام نبی چانڈیو' },
      village: { bn: 'গোঠ খারানি', en: 'Goth Kharani' },
      place: { bn: 'দাদু তালুকা, দাদু জেলা, সিন্ধু', en: 'Dadu taluka, Dadu district, Sindh' },
      farmDec: 800,
      water: { bn: 'খালের পানি (সিন্ধু নদের সেচ ব্যবস্থা)', en: 'Canal water (Indus irrigation system)' },
      now: { bn: 'ধান কাটা হয়েছে, জমি শুকাচ্ছে', en: 'Rice harvested, the land is drying' },
      next: { bn: 'গম বোনা (১–২০ নভেম্বর সবচেয়ে ভালো)', en: 'Sow wheat (1–20 November is best)' },
      intro: {
        bn: 'গোলাম নবী ৮ একরে খরিফে ধান আর রবিতে গম করেন, পানি আসে সিন্ধু নদের খাল দিয়ে। ২০২২ সালের আগস্টে আকাশ ভেঙে বৃষ্টি নেমেছিল; দাদুর গ্রাম মাসের পর মাস পানির নিচে ছিল। আর মে–জুনে এখানে তাপমাত্রা ৫০ ডিগ্রি ছাড়ায়।',
        en: 'Ghulam Nabi grows rice in kharif and wheat in rabi on 8 acres, watered from the Indus canals. In August 2022 the sky broke open; villages around Dadu stayed under water for months. And in May–June the heat here passes 50 °C.',
      },
    },
    local: {
      role: { bn: 'কৃষি কর্মকর্তা (সম্প্রসারণ), দাদু তালুকা', en: 'Agriculture Officer (Extension), Dadu taluka' },
      office: { bn: 'তালুকা কৃষি সম্প্রসারণ কার্যালয়, দাদু — কৃষি, সরবরাহ ও মূল্য বিভাগ, সিন্ধু সরকার', en: 'Taluka agriculture extension office, Dadu — Agriculture, Supply & Prices Department, Government of Sindh' },
      area: { bn: 'দাদু তালুকা', en: 'Dadu taluka' }, level: { bn: 'তালুকা — বাংলাদেশের উপজেলার মতো', en: 'Taluka — like a Bangladesh upazila' },
      source: src('Sindh Agriculture Department', 'https://agri.sindh.gov.pk/'),
      noName: { bn: 'কোনো সরকারি পাতায় দাদু তালুকার এখনকার কর্মকর্তার নাম নিশ্চিত করা যায়নি — তাই নাম দেখানো হচ্ছে না।', en: 'No official page we could read confirms Dadu taluka’s current officer — so no name is shown.' },
      sms: 'ur',
    },
    officer: {
      office: { bn: 'জাতীয় খাদ্য নিরাপত্তা ও গবেষণা মন্ত্রণালয়', en: 'Ministry of National Food Security & Research' },
      city: { bn: 'ইসলামাবাদ', en: 'Islamabad' },
      head: {
        name: { bn: 'আমের আলী আহমেদ', en: 'Amer Ali Ahmed' },
        role: { bn: 'সচিব (মন্ত্রণালয়ের সংবাদে, ৯ জুন ২০২৬)', en: 'Secretary (ministry news item, 9 June 2026)' },
        source: src('mnfsr.gov.pk news, 9 June 2026', 'https://mnfsr.gov.pk/NewsDetail/ZGQ4ODRhMDgtOTVkMS00Nzc3LTk3ODUtM2I3YmI5ODM1YzEz'),
      },
    },
    zones: {
      dadu: { name: { bn: 'দাদু, সিন্ধু', en: 'Dadu, Sindh' }, crop: { bn: 'ধান–গম', en: 'Rice–wheat' }, line: { bn: '২০২২-এর মহাবন্যা, তীব্র গরম', en: '2022 super-flood, extreme heat' } },
      multan: { name: { bn: 'মুলতান, পাঞ্জাব', en: 'Multan, Punjab' }, crop: { bn: 'তুলা, আম, গম', en: 'Cotton, mango, wheat' }, line: { bn: 'তুলার বেল্টে গরম আর পোকা', en: 'Heat and pests in the cotton belt' } },
      tharparkar: { name: { bn: 'থরপারকার, সিন্ধু', en: 'Tharparkar, Sindh' }, crop: { bn: 'বৃষ্টিনির্ভর বাজরা, গবাদি পশু', en: 'Rain-fed millet, livestock' }, line: { bn: 'থর মরুভূমির খরা', en: 'Thar desert drought' } },
      swat: { name: { bn: 'সোয়াত, খাইবার পাখতুনখোয়া', en: 'Swat, Khyber Pakhtunkhwa' }, crop: { bn: 'পীচ, সবজি, ভুট্টা', en: 'Peach, vegetables, maize' }, line: { bn: 'পাহাড়ি ঢল (২০১০, ২০২২)', en: 'Flash floods (2010, 2022)' } },
      naseerabad: { name: { bn: 'নাসিরাবাদ, বেলুচিস্তান', en: 'Naseerabad, Balochistan' }, crop: { bn: 'খালের ধান', en: 'Canal-fed rice' }, line: { bn: '২০২২-এর বন্যা, প্রচণ্ড তাপ', en: '2022 flood, fierce heat' } },
      chitral: { name: { bn: 'চিত্রাল, খাইবার পাখতুনখোয়া', en: 'Chitral, Khyber Pakhtunkhwa' }, crop: { bn: 'গম, ভুট্টা', en: 'Wheat, maize' }, line: { bn: 'হিমবাহ গলা, হিমবাহ-হ্রদের বন্যা', en: 'Glacier melt, glacial-lake floods' } },
    },
    facts: [
      { bn: '২০২২ সালের বন্যায় ৩ কোটি ৩০ লাখ মানুষ ক্ষতিগ্রস্ত হন, ১,৭৩০ জনের বেশি মারা যান। সরকারি ক্ষয়ক্ষতি নিরূপণে (PDNA) ক্ষতি ১,৪৯০ কোটি ডলার আর লোকসান ১,৫২০ কোটি ডলার; কৃষি ও পশুসম্পদে ক্ষতি ৩৭০ কোটি ডলার, আর মোটের প্রায় ৭০% সিন্ধুতে।', en: 'The 2022 floods affected 33 million people and killed more than 1,730. The Post-Disaster Needs Assessment put damage at US$14.9 billion and losses at US$15.2 billion; agriculture and livestock lost US$3.7 billion in damage, and close to 70% of the total fell on Sindh.', src: [src('World Bank press release, 28 Oct 2022 (PDNA)', 'https://www.worldbank.org/en/news/press-release/2022/10/28/pakistan-flood-damages-and-economic-losses-over-usd-30-billion-and-reconstruction-needs-over-usd-16-billion-new-assessme')] },
      { bn: '৪ সেপ্টেম্বর ২০২২ উপচে পড়া মানচর হ্রদের বাঁধ কাটা হয় সেহওয়ান আর ভান সাঈদাবাদ বাঁচাতে; সিন্ধুর তথ্যমন্ত্রী বলেন, প্রায় ১ লাখ ২৫ হাজার মানুষকে সরতে হবে। পানি ছড়ায় দাদু, মেহার আর জোহির দিকে।', en: 'On 4 September 2022 the embankment of the overflowing Manchar Lake was cut to spare Sehwan and Bhan Saeedabad; Sindh’s information minister said about 125,000 people would have to move. The water spread towards Dadu, Mehar and Johi.', src: [src('Aaj News, Sep 2022', 'https://english.aaj.tv/news/30297224'), src('Neo News, 6 Sep 2022', 'https://en.neonetwork.pk/06-Sep-2022/manchar-lake-water-inundates-hundreds-of-villages-threatens-to-cut-off-dadu')] },
      { bn: 'দাদুর প্রায় ৬০ কিলোমিটার উত্তরে মহেঞ্জোদারোতে ২৬ মে ২০১০ তারিখে ৫৩.৫ °সে মাপা হয়েছিল (পাকিস্তান আবহাওয়া বিভাগের রেকর্ড)।', en: 'Mohenjo-daro, about 60 km north of Dadu, measured 53.5 °C on 26 May 2010 (Pakistan Meteorological Department records).', src: [src('List of extreme weather records in Pakistan (PMD data)', 'https://en.wikipedia.org/wiki/List_of_extreme_weather_records_in_Pakistan')] },
    ],
    sources: [src('PMD National Agromet Centre: wheat 1–20 November', 'https://namc.pmd.gov.pk/'), src('Pakistan Meteorological Department', 'https://www.pmd.gov.pk/')],
  },

  nepal: {
    id: 'nepal', flag: '🇳🇵', tone: '#b3263a', soft: '#fbe6e9',
    name: { bn: 'নেপাল', en: 'Nepal', local: 'नेपाल' },
    unit: { bn: 'বিঘা (তরাই)', en: 'bigha (Terai)', dec: 167.4 },
    farmer: {
      id: 'RAMPYARI', name: { bn: 'রামপ্যারী চৌধুরী', en: 'Rampyari Chaudhary', local: 'रामप्यारी चौधरी' },
      village: { bn: 'দুর্গাউলি', en: 'Durgauli' },
      place: { bn: 'জানকী গাউঁপালিকা, কৈলালী জেলা, সুদূরপশ্চিম প্রদেশ', en: 'Janaki rural municipality, Kailali district, Sudurpashchim Province' },
      farmDec: 250,
      water: { bn: 'বৃষ্টি, সঙ্গে সমিতির শ্যালো টিউবওয়েল', en: 'Rain, plus a group shallow tubewell' },
      now: { bn: 'ধান পেকেছে, কাটার সময়', en: 'Paddy ripe, time to cut' },
      next: { bn: 'ধান তোলার পর গম বা মসুর', en: 'Wheat or lentil once the paddy is in' },
      intro: {
        bn: 'রামপ্যারী তরাইয়ের থারু কৃষক, দেড় বিঘায় ধান করেন। ২০২১ সালের ১৭–১৯ অক্টোবর আবহাওয়া দপ্তর ভারী বৃষ্টির খবরকে “বিভ্রান্তিকর” বলেছিল; অনেকে ধান কেটে মাঠে রেখেছিলেন, তারপর তিন দিন বৃষ্টিতে সব ভিজে গজিয়ে যায়। এবারও ধান কাটার সময় — তাই আগামী তিন দিনের আকাশই আসল প্রশ্ন।',
        en: 'Rampyari is a Tharu farmer in the Terai with one and a half bigha of paddy. On 17–19 October 2021 the weather office called reports of heavy rain “misleading”; many cut their paddy and left it in the field, then three days of rain soaked and sprouted it. It is cutting time again — so the next three days of sky are the real question.',
      },
    },
    local: {
      role: { bn: 'কৃষি শাখা প্রমুখ, জানকী গাউঁপালিকা', en: 'Head of the Agriculture Section, Janaki Rural Municipality' },
      office: { bn: 'কৃষি শাখা, জানকী গাউঁপালিকা, কৈলালী — ২০১৭ সালের পর কৃষি সম্প্রসারণ স্থানীয় সরকারের হাতে; জেলায় কৃষি জ্ঞান কেন্দ্র (कृषि ज्ञान केन्द्र) সহায়তা দেয়', en: 'Agriculture Section, Janaki Rural Municipality, Kailali — since 2017 extension is run by local government, backed by the district’s Agriculture Knowledge Centre' },
      area: { bn: 'জানকী গাউঁপালিকা', en: 'Janaki Rural Municipality' }, level: { bn: 'গাউঁপালিকা — বাংলাদেশের উপজেলার মতো', en: 'Rural municipality — like a Bangladesh upazila' },
      source: src('Kantipur: the centre on Kailali’s wheat (Apr 2025)', 'https://ekantipur.com/business/2025/04/30/wheat-productivity-decreased-in-kailali-57-06.html'),
      noName: { bn: 'গাউঁপালিকার কৃষি শাখার এখনকার প্রমুখের নাম কোনো সরকারি পাতায় নিশ্চিত করা যায়নি — তাই নাম দেখানো হচ্ছে না।', en: 'No official page we could read confirms who heads the municipality’s agriculture section now — so no name is shown.' },
      sms: 'ne',
    },
    officer: {
      office: { bn: 'কৃষি, বন ও পরিবেশ মন্ত্রণালয় (১৪ মে ২০২৬ কৃষি ও পশুপাখি উন্নয়ন মন্ত্রণালয় আর বন ও পরিবেশ মন্ত্রণালয় মিলে গঠিত)', en: 'Ministry of Agriculture, Forest and Environment (formed 14 May 2026 from the Ministry of Agriculture and Livestock Development and the Ministry of Forests and Environment)' },
      city: { bn: 'সিংহদরবার, কাঠমান্ডু', en: 'Singha Durbar, Kathmandu' },
      head: null,
      noHead: { bn: 'মন্ত্রণালয়ের ওয়েবসাইট (moald.gov.np) ১৯ অক্টোবর ২০২৬ খোলা যায়নি, আর নতুন মন্ত্রণালয়ের সচিবের নাম কোনো সরকারি পাতায় নিশ্চিত করা যায়নি — তাই কারও নাম দেখানো হচ্ছে না।', en: 'The ministry’s website (moald.gov.np) could not be reached on 19 October 2026, and no official page we could read confirms the new ministry’s secretary — so no name is shown.' },
    },
    zones: {
      kailali: { name: { bn: 'কৈলালী, সুদূরপশ্চিম তরাই', en: 'Kailali, far-west Terai' }, crop: { bn: 'ধান, গম', en: 'Rice, wheat' }, line: { bn: 'অসময়ের বৃষ্টি, নদীর বন্যা', en: 'Out-of-season rain, river floods' } },
      jhapa: { name: { bn: 'ঝাপা, পূর্ব তরাই', en: 'Jhapa, east Terai' }, crop: { bn: 'ধান, চা', en: 'Rice, tea' }, line: { bn: 'বর্ষার বন্যা', en: 'Monsoon floods' } },
      chitwan: { name: { bn: 'চিতওয়ান, মধ্য তরাই', en: 'Chitwan, inner Terai' }, crop: { bn: 'ধান, ভুট্টা, সরিষা', en: 'Rice, maize, mustard' }, line: { bn: 'ফসল তোলার সময় বৃষ্টি', en: 'Rain at harvest' } },
      bhaktapur: { name: { bn: 'ভক্তপুর, কাঠমান্ডু উপত্যকা', en: 'Bhaktapur, Kathmandu valley' }, crop: { bn: 'সবজি', en: 'Vegetables' }, line: { bn: 'হঠাৎ ভারী বৃষ্টি (সেপ্টেম্বর ২০২৪)', en: 'Sudden downpours (September 2024)' } },
      jumla: { name: { bn: 'জুমলা, কর্ণালী', en: 'Jumla, Karnali' }, crop: { bn: 'মার্সি ধান, আপেল', en: 'Marshi rice, apple' }, line: { bn: 'উঁচু পাহাড়ে খরা, খাদ্য সংকট', en: 'High-hill drought, food shortages' } },
      mustang: { name: { bn: 'মুস্তাং, হিমালয়', en: 'Mustang, Himalaya' }, crop: { bn: 'আপেল, বার্লি', en: 'Apple, barley' }, line: { bn: 'বরফ কমছে, পানির টান', en: 'Less snow, less water' } },
    },
    facts: [
      { bn: '২০২১ সালের অক্টোবরের মাঝামাঝি অসময়ের বৃষ্টিতে ১,১১,৬০৯ হেক্টরের ৪,২৪,১১৩ টন ধানের ক্ষতি হয় (কৃষি ও পশুপাখি উন্নয়ন মন্ত্রণালয়); সুদূরপশ্চিম প্রদেশে ধান উৎপাদন আগের বছরের চেয়ে ৩১.৪৯% কমে যায়।', en: 'The out-of-season rain of mid-October 2021 damaged 424,113 tonnes of paddy on 111,609 hectares (Ministry of Agriculture and Livestock Development); rice output in Sudurpashchim Province fell 31.49% on the year before.', src: [src('Onlinekhabar', 'https://english.onlinekhabar.com/unseasonal-rainfall-rice-yields.html'), src('The Kathmandu Post, 19 Oct 2021', 'https://kathmandupost.com/national/2021/10/19/rains-damage-ripe-paddy-crops-in-several-districts')] },
      { bn: 'ওই বছর নেপালের মোট ধান উৎপাদন ৮.৭৪% কমে ৫১.৩ লাখ টনে নামে — পাঁচ বছরে সবচেয়ে কম।', en: 'That year Nepal’s paddy output fell 8.74% to 5.13 million tonnes — a five-year low.', src: [src('B360 Nepal', 'https://b360nepal.com/nepals-paddy-output-drops-by-8-74-per-cent-five-year-low/')] },
      { bn: 'আবহাওয়া দপ্তর ১৭ অক্টোবর থেকে তিন দিনের ভারী বৃষ্টির খবরকে “বিভ্রান্তিকর” বলেছিল; সেই ভরসায় কৃষকেরা ১৭–১৮ অক্টোবর ধান কাটেন।', en: 'The weather department called reports of three days of heavy rain from 17 October “misleading”; trusting that, farmers cut their paddy on 17–18 October.', src: [src('Ratopati', 'https://english.ratopati.com/story/82940/farmers-in-western-nepal-face-destruction-in-their-paddy-fields-after-believing-government-information')] },
    ],
    sources: [src('Department of Hydrology and Meteorology', 'https://www.dhm.gov.np/'), src('Nepal Agricultural Research Council', 'https://narc.gov.np/')],
  },

  bhutan: {
    id: 'bhutan', flag: '🇧🇹', tone: '#d08a12', soft: '#fcf1dc',
    name: { bn: 'ভুটান', en: 'Bhutan', local: 'འབྲུག་ཡུལ་' },
    unit: { bn: 'একর', en: 'acre', dec: 100 },
    farmer: {
      id: 'KINLEY', name: { bn: 'কিনলে ওয়াংমো', en: 'Kinley Wangmo', local: 'ཀུན་ལེགས་དབང་མོ།' },
      village: { bn: 'লোবেসা', en: 'Lobesa' },
      place: { bn: 'বাপিসা গেওগ, পুনাখা জোংখাগ', en: 'Bapisa gewog, Punakha Dzongkhag' },
      farmDec: 150,
      water: { bn: 'পাহাড়ি ঝরনার নালা (ইয়ু-চু)', en: 'Stream-fed channel from the hills' },
      now: { bn: 'লাল ধান পাকছে, কাটা শুরু', en: 'Red rice ripening, cutting begins' },
      next: { bn: 'শীতে সবজি বা জমি বিশ্রাম', en: 'Winter vegetables or rest' },
      intro: {
        bn: 'কিনলে দেড় একর ধাপ-জমিতে ভুটানের লাল ধান করেন; পশ্চিম ভুটানের রীতিতে জমি মায়ের কাছ থেকে মেয়ের হাতে আসে। রাতে বুনো শূকর ধান খেতে আসে, তাই পাহারা দিতে হয়। আর উপত্যকার মাথায় লুনানার হিমবাহ-হ্রদ: ১৯৯৪ সালের ৭ অক্টোবর লুগে হ্রদ ফেটে পো-চু নদী দিয়ে বন্যা নেমেছিল।',
        en: 'Kinley grows Bhutanese red rice on one and a half acres of terraces; by western Bhutan’s custom the land came to her from her mother. Wild boar raid the paddy at night, so it has to be guarded. And at the head of the valley lie the glacial lakes of Lunana: on 7 October 1994 Lugge Tsho burst and a flood ran down the Pho Chhu.',
      },
    },
    local: {
      role: { bn: 'গেওগ কৃষি সম্প্রসারণ কর্মকর্তা, বাপিসা', en: 'Gewog Agriculture Extension Officer, Bapisa' },
      office: { bn: 'গেওগ আরএনআর সম্প্রসারণ কেন্দ্র — পুনাখা জোংখাগ প্রশাসনের কৃষি শাখার অধীনে', en: 'Gewog RNR extension centre — under the Agriculture Sector, Punakha Dzongkhag Administration' },
      area: { bn: 'বাপিসা গেওগ', en: 'Bapisa gewog' }, level: { bn: 'গেওগ — বাংলাদেশের ইউনিয়ন-উপজেলার মাঝামাঝি', en: 'Gewog — between a Bangladesh union and upazila' },
      source: src('punakha.gov.bt: Agriculture sector', 'https://punakha.gov.bt/sector/agriculture/'),
      noName: { bn: 'গেওগ কর্মকর্তার নাম কোনো সরকারি পাতায় নেই; পুনাখার জোংখাগ কৃষি প্রধানের পদেও এপ্রিল ২০২৬-এ আবার আবেদন চাওয়া হয়েছিল — তাই নাম দেখানো হচ্ছে না।', en: 'No official page names the gewog officer, and Punakha’s Chief Dzongkhag Agriculture Officer post was re-advertised in April 2026 — so no name is shown.' },
      noNameSrc: src('MoAL vacancy re-announcement, Apr 2026', 'https://www.moal.gov.bt/?p=9059'),
      sms: 'dz',
    },
    officer: {
      office: { bn: 'কৃষি ও পশুসম্পদ মন্ত্রণালয়', en: 'Ministry of Agriculture and Livestock' },
      city: { bn: 'থিম্পু', en: 'Thimphu' },
      head: {
        name: { bn: 'ড. তাশি ইয়াংজোম দর্জি', en: 'Dr. Tashi Yangzome Dorji' },
        role: { bn: 'সচিব, রাজকীয় ফরমানে নিয়োগ (মন্ত্রণালয়ের সংবাদ, ১২ সেপ্টেম্বর ২০২৬)', en: 'Secretary, appointed by Royal Decree (ministry news, 12 September 2026)' },
        source: src('moal.gov.bt', 'https://www.moal.gov.bt/'),
      },
    },
    zones: {
      punakha: { name: { bn: 'পুনাখা', en: 'Punakha' }, crop: { bn: 'লাল ধান', en: 'Red rice' }, line: { bn: 'হিমবাহ-হ্রদের বন্যার ঝুঁকি', en: 'Glacial-lake flood risk' } },
      paro: { name: { bn: 'পারো', en: 'Paro' }, crop: { bn: 'ধান, আপেল', en: 'Rice, apple' }, line: { bn: 'ফসল তোলার সময় বৃষ্টি', en: 'Rain at harvest' } },
      bumthang: { name: { bn: 'বুমথাং', en: 'Bumthang' }, crop: { bn: 'আলু, বাকহুইট', en: 'Potato, buckwheat' }, line: { bn: 'তুষারপাত আর হিম', en: 'Frost and cold snaps' } },
      samtse: { name: { bn: 'সামৎসে, দক্ষিণ', en: 'Samtse, south' }, crop: { bn: 'ভুট্টা, এলাচ', en: 'Maize, cardamom' }, line: { bn: 'ভারী বর্ষা, ভূমিধস', en: 'Heavy monsoon, landslides' } },
      trashigang: { name: { bn: 'ত্রাশিগাং, পূর্ব', en: 'Trashigang, east' }, crop: { bn: 'ভুট্টা', en: 'Maize' }, line: { bn: 'বুনো প্রাণীর ফসল নষ্ট', en: 'Wildlife crop raids' } },
      sarpang: { name: { bn: 'সারপাং (গেলেফু)', en: 'Sarpang (Gelephu)' }, crop: { bn: 'ধান', en: 'Rice' }, line: { bn: 'পাহাড়ি নদীর ঢল', en: 'Flash floods from the hills' } },
    },
    facts: [
      { bn: '১৯৯৪ সালের ৭ অক্টোবর লুনানার লুগে হিমবাহ-হ্রদ ফেটে পো-চু দিয়ে বন্যা নামে পুনাখা–ওয়াংদু উপত্যকায়; ২০ জনের বেশি মারা যান (উৎসভেদে ২১–২৬), পুনাখা জং আংশিক ক্ষতিগ্রস্ত হয়। পরে পুনাখা–ওয়াংদু উপত্যকায় স্বয়ংক্রিয় সতর্ক-সাইরেন বসানো হয়।', en: 'On 7 October 1994 Lugge Tsho in Lunana burst and a flood ran down the Pho Chhu into the Punakha–Wangdue valley; more than 20 people died (21–26 by source) and Punakha Dzong was partly damaged. An automatic siren warning system was later installed along the valley.', src: [src('GAPHAZ glacier hazard database (University of Oslo)', 'https://mn.uio.no/geo/english/research/projects/gaphaz/database-old/hot/LUGGE.htm'), src('GEF: reducing GLOF risk in Bhutan', 'https://www.thegef.org/node/658641')] },
      { bn: 'বুনো শূকর, হরিণ আর বানরের ফসল নষ্ট ভুটানে জমি পতিত রাখার বড় কারণ; সরকার গ্রামে গ্রামে বিদ্যুৎ-বেড়া দিচ্ছে।', en: 'Crop raids by wild boar, deer and monkeys are a leading reason Bhutanese farmland is left fallow; the government has been putting up electric fencing village by village.', src: [src('Ministry of Agriculture and Livestock', 'https://www.moal.gov.bt/')] },
    ],
    sources: [src('National Center for Hydrology and Meteorology', 'https://www.nchm.gov.bt/')],
  },

  myanmar: {
    id: 'myanmar', flag: '🇲🇲', tone: '#a07a0b', soft: '#f8f0d8',
    name: { bn: 'মিয়ানমার', en: 'Myanmar', local: 'မြန်မာ' },
    unit: { bn: 'একর', en: 'acre', dec: 100 },
    farmer: {
      id: 'KYAWWIN', name: { bn: 'উ চ উইন', en: 'U Kyaw Win', local: 'ဦးကျော်ဝင်း' },
      village: { bn: 'সিংগু', en: 'Singu' },
      place: { bn: 'ন্যাং-উ জেলা, মান্দালয় অঞ্চল (মধ্য শুষ্ক অঞ্চল, চক শহরের ৫ কিমি উত্তরে)', en: 'Nyaung-U district, Mandalay Region (Central Dry Zone, 5 km north of Chauk)' },
      farmDec: 600,
      water: { bn: 'শুধু বৃষ্টি', en: 'Rain only' },
      now: { bn: 'বর্ষার শেষ — জমিতে জমে থাকা ভেজায় ছোলা বোনার সময়', en: 'End of the rains — time to sow chickpea on the stored moisture' },
      next: { bn: 'ছোলা (অক্টোবর–নভেম্বর), অড়হর মাঠে', en: 'Chickpea (Oct–Nov), pigeon pea in the field' },
      intro: {
        bn: 'উ চ উইন মিয়ানমারের মধ্য শুষ্ক অঞ্চলে ৬ একরে তিল, চীনাবাদাম, অড়হর আর ছোলা করেন — সেচ নেই, সব বৃষ্টির ভরসা। বর্ষা শেষ হলে মাটিতে যে ভেজা থাকে, তাতেই ছোলা বোনেন। ৫ কিলোমিটার দক্ষিণের চক শহরে ২৮ এপ্রিল ২০২৪ তারিখে ৪৮.২ °সে মাপা হয়েছিল — মিয়ানমারে এপ্রিলের সর্বোচ্চ।',
        en: 'U Kyaw Win farms 6 acres of sesame, groundnut, pigeon pea and chickpea in Myanmar’s Central Dry Zone — no irrigation, all on rain. When the rains end he sows chickpea into the moisture left in the soil. Chauk, 5 km south, measured 48.2 °C on 28 April 2024 — Myanmar’s highest April temperature on record.',
      },
    },
    local: {
      role: { bn: 'টাউনশিপ কৃষি কর্মকর্তা, ন্যাং-উ', en: 'Township Agriculture Officer, Nyaung-U' },
      office: { bn: 'টাউনশিপ কৃষি অধিদপ্তর কার্যালয়, ন্যাং-উ — কৃষি, পশুসম্পদ ও সেচ মন্ত্রণালয়', en: 'Township Department of Agriculture office, Nyaung-U — Ministry of Agriculture, Livestock and Irrigation' },
      area: { bn: 'ন্যাং-উ টাউনশিপ', en: 'Nyaung-U township' }, level: { bn: 'টাউনশিপ — বাংলাদেশের উপজেলার মতো', en: 'Township — like a Bangladesh upazila' },
      source: null,
      noName: { bn: 'মন্ত্রণালয়ের ওয়েবসাইট ১৯ অক্টোবর ২০২৬ খোলা যায়নি, আর কোনো সরকারি পাতায় এখনকার কর্মকর্তার নাম নিশ্চিত হয়নি — তাই নাম দেখানো হচ্ছে না।', en: 'The ministry’s website could not be reached on 19 October 2026 and no official page confirms the current officer — so no name is shown.' },
      sms: 'my',
    },
    officer: {
      office: { bn: 'কৃষি অধিদপ্তর, কৃষি, পশুসম্পদ ও সেচ মন্ত্রণালয়', en: 'Department of Agriculture, Ministry of Agriculture, Livestock and Irrigation' },
      city: { bn: 'নেপিডো', en: 'Nay Pyi Taw' },
      head: null,
      noHead: { bn: 'যে সরকারি পাতা আমরা পড়তে পেরেছি, তার কোনোটিতে বর্তমান প্রধানের নাম নিশ্চিত হয়নি — তাই শুধু দপ্তরের নাম দেখানো হচ্ছে।', en: 'No official page we could read confirms the current head, so only the office is shown.' },
    },
    zones: {
      magway: { name: { bn: 'চক–ন্যাং-উ, মধ্য শুষ্ক অঞ্চল', en: 'Chauk–Nyaung-U, Central Dry Zone' }, crop: { bn: 'তিল, ডাল, চীনাবাদাম', en: 'Sesame, pulses, groundnut' }, line: { bn: 'কম বৃষ্টি, প্রচণ্ড তাপ', en: 'Low rain, fierce heat' } },
      bogale: { name: { bn: 'বোগালে, আইয়ারওয়াদি বদ্বীপ', en: 'Bogale, Ayeyarwady delta' }, crop: { bn: 'ধান', en: 'Rice' }, line: { bn: 'ঘূর্ণিঝড় (নার্গিস ২০০৮), লবণ', en: 'Cyclones (Nargis 2008), salt' } },
      bago: { name: { bn: 'বাগো', en: 'Bago' }, crop: { bn: 'ধান', en: 'Rice' }, line: { bn: 'নদীর বন্যা (ইয়াগি, সেপ্টেম্বর ২০২৪)', en: 'River floods (Yagi, September 2024)' } },
      taunggyi: { name: { bn: 'টাউনজি, শান পাহাড়', en: 'Taunggyi, Shan hills' }, crop: { bn: 'সবজি, ভুট্টা', en: 'Vegetables, maize' }, line: { bn: 'পাহাড়ি ঢল, ভূমিধস', en: 'Flash floods, landslides' } },
      sittwe: { name: { bn: 'সিত্তে, রাখাইন উপকূল', en: 'Sittwe, Rakhine coast' }, crop: { bn: 'ধান', en: 'Rice' }, line: { bn: 'ঘূর্ণিঝড় (মোখা, মে ২০২৩)', en: 'Cyclones (Mocha, May 2023)' } },
      monywa: { name: { bn: 'মনিওয়া, সাগাইং শুষ্ক অঞ্চল', en: 'Monywa, Sagaing Dry Zone' }, crop: { bn: 'ডাল, তিল', en: 'Pulses, sesame' }, line: { bn: 'অনিয়মিত বৃষ্টি', en: 'Erratic rain' } },
    },
    facts: [
      { bn: 'চক শহরে ২৮ এপ্রিল ২০২৪ তারিখে ৪৮.২ °সে মাপা হয় — ৫৬ বছরের রেকর্ডে মিয়ানমারে এপ্রিলের সর্বোচ্চ; আগের রেকর্ড ছিল একই মাসের ৬ তারিখে ৪৭.৪ °সে (আবহাওয়া ও জলবিদ্যা অধিদপ্তর)।', en: 'Chauk measured 48.2 °C on 28 April 2024 — the highest April temperature in 56 years of Myanmar records; the previous record, 47.4 °C, was set on the 6th of the same month (Department of Meteorology and Hydrology).', src: [src('DMH Myanmar daily report, 29 Apr 2024', 'https://moezala.gov.mm/node/105540'), src('AFP via Inquirer', 'https://globalnation.inquirer.net/233882/myanmar-records-hottest-ever-april-temperature-of-48-2c/amp')] },
      { bn: '২০২৪ সালের সেপ্টেম্বরে টাইফুন ইয়াগির অবশেষ আর বর্ষার বৃষ্টিতে মধ্য মিয়ানমারে বন্যা হয়: প্রায় ১০ লাখ মানুষ ক্ষতিগ্রস্ত, ৩০০-র বেশি মৃত্যু; শুধু মান্দালয় অঞ্চলে প্রায় ৪০ হাজার একর ফসলি জমি ডোবে (জাতিসংঘ OCHA)।', en: 'In September 2024 the remnants of Typhoon Yagi and monsoon rain flooded central Myanmar: close to a million people affected and more than 300 deaths; about 40,000 acres of farmland went under in Mandalay Region alone (UN OCHA).', src: [src('ReliefWeb: Myanmar floods, Sep 2024', 'https://reliefweb.int/disaster/FL-2024-000104-MMR'), src('UN situation report, 20 Sep 2024', 'https://progressivevoicemyanmar.org/2024/09/16/myanmar-flood-situation-report-16-september-2024')] },
    ],
    sources: [src('Department of Meteorology and Hydrology', 'https://www.moezala.gov.mm/')],
  },
};

// Area in the country's own unit, from decimals (1 decimal = 1/100 acre).
export const areaIn = (c, dec) => dec / c.unit.dec;
