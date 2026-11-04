// Government support a Bangladeshi smallholder can ask for: input aid, credit, insurance, machinery, the government
// paddy price, soil tests and advice. Each entry is a RECORD read from the source named in `src` on the date in
// `checked`; amounts and rules change by season or by notice, so the app shows the date and tells the farmer to
// confirm with the union's agriculture officer (SAAO) or the bank. `status` says whether the programme is running
// every year, a pilot in a few districts, announced but not yet in force, or one to check because its project period
// may have ended. Who it is for (`rule`) is read by engine/support.js:
//   maxDec   largest holding in decimals (BBS census: marginal 5–49, small 50–249, medium 250–749)
//   crops    one of the farmer's crops this year must be in the list (FieldShift crop ids)
//   areas    the upazila's area type must be one of these ('coastal', 'haor', 'barind')
//   districts  the field's district must be one of these (English names, as in data/upazilas.js)
//   irrigation the field's water source must be one of these (engine/crops.js IRRIGATION)
//   needs    other programmes that usually come first (by id)
// Ideas adapted from AgriAgent AI (a Flask advisory app for Indian farmers); the Bangladesh content is our own.
export const CHECKED = '2026-11-04';

export const BD_SUPPORT = [
  {
    id: 'krishi_card', kind: 'register', status: 'running',
    name: { bn: 'কৃষি উপকরণ সহায়তা কার্ড', en: 'Farmer input-support card' },
    by: { bn: 'কৃষি সম্প্রসারণ অধিদপ্তর (DAE)', en: 'Department of Agricultural Extension (DAE)' },
    benefit: { bn: 'সরকারি তালিকায় কৃষক হিসেবে নাম ওঠে। প্রণোদনা, ১০ টাকার ব্যাংক হিসাব আর অনেক সহায়তার আগে এটাই লাগে।', en: 'Puts you on the government list of farmers. Incentives, the 10-taka bank account and much other support start from it.' },
    who: { bn: 'যিনি নিজে চাষ করেন: নিজের জমি, বর্গা বা লিজ', en: 'Anyone who farms: own land, sharecropped or leased' },
    rule: {},
    docs: [{ bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'ছবি', en: 'A photo' }, { bn: 'জমির কাগজ বা বর্গার কথা ইউনিয়নের কৃষি কর্মকর্তাকে জানান', en: 'Land papers, or tell the union officer it is sharecropped' }],
    where: { bn: 'ইউনিয়নের উপসহকারী কৃষি কর্মকর্তা (SAAO) বা উপজেলা কৃষি অফিস', en: 'The union’s Sub-Assistant Agriculture Officer (SAAO) or the upazila agriculture office' },
    src: 'https://dae.gov.bd',
    words: ['card', 'কার্ড', 'নিবন্ধন', 'register', 'list', 'তালিকা'],
  },
  {
    id: 'ten_taka', kind: 'register', status: 'running',
    name: { bn: '১০ টাকার কৃষি ব্যাংক হিসাব', en: '10-taka farmer bank account' },
    by: { bn: 'বাংলাদেশ ব্যাংক ও সরকারি-বেসরকারি ব্যাংক', en: 'Bangladesh Bank and the scheduled banks' },
    benefit: { bn: 'মাত্র ১০ টাকা জমা দিয়ে ব্যাংক হিসাব। সরকারি ভর্তুকি আর কৃষিঋণ সরাসরি এখানে আসে।', en: 'A bank account opened with 10 taka. Government subsidies and farm loans are paid straight into it.' },
    who: { bn: 'কৃষি কার্ড আছে এমন কৃষক', en: 'Farmers with the input-support card' },
    rule: { needs: ['krishi_card'] },
    docs: [{ bn: 'কৃষি কার্ড', en: 'The input-support card' }, { bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'দুই কপি ছবি', en: 'Two photos' }],
    where: { bn: 'কাছের ব্যাংক শাখা বা এজেন্ট ব্যাংকিং কেন্দ্র', en: 'The nearest bank branch or agent-banking point' },
    src: 'https://www.bb.org.bd',
    words: ['bank', 'ব্যাংক', 'account', 'হিসাব', '১০ টাকা', '10 taka'],
  },
  {
    id: 'prono_rabi', kind: 'input', status: 'running',
    name: { bn: 'রবি মৌসুমের কৃষি প্রণোদনা (বিনা মূল্যে বীজ ও সার)', en: 'Rabi incentive: free seed and fertiliser' },
    by: { bn: 'কৃষি মন্ত্রণালয়, DAE-এর মাধ্যমে', en: 'Ministry of Agriculture, through DAE' },
    benefit: { bn: 'প্রতি মৌসুমে ক্ষুদ্র ও প্রান্তিক কৃষককে বিনা মূল্যে বীজ আর সার। যেমন ২০২৫–২৬ রবিতে নওগাঁয় সরিষার জন্য ১ কেজি বীজ, ১০ কেজি ডিএপি ও ১০ কেজি এমওপি; গমের জন্য ২০ কেজি বীজ ও একই সার।', en: 'Free seed and fertiliser for small and marginal farmers each season. In Rabi 2025–26 in Naogaon, for example: 1 kg mustard seed with 10 kg DAP and 10 kg MoP; for wheat, 20 kg seed with the same fertiliser.' },
    who: { bn: 'ক্ষুদ্র ও প্রান্তিক কৃষক; তালিকা ইউনিয়ন কমিটি ঠিক করে, সবাই পান না', en: 'Small and marginal farmers; the union committee picks the list, so not everyone gets it' },
    rule: { maxDec: 249, crops: ['wheat', 'mustard', 'lentil', 'mungbean', 'sesame', 'maize', 'sunflower', 'onion', 'tomato'], needs: ['krishi_card'] },
    docs: [{ bn: 'কৃষি কার্ড', en: 'The input-support card' }, { bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }],
    where: { bn: 'মৌসুমের শুরুতে (আশ্বিন–কার্তিক) ইউনিয়নের SAAO-কে নাম দিন', en: 'Give your name to the union SAAO at the start of the season (Ashwin–Kartik)' },
    src: 'https://www.tbsnews.net/bangladesh/govt-provide-free-fertilizer-seeds-1671-lakh-farmers-521246',
    words: ['free', 'বিনা মূল্যে', 'seed', 'বীজ', 'fertiliser', 'fertilizer', 'সার', 'প্রণোদনা', 'incentive'],
  },
  {
    id: 'fert_price', kind: 'input', status: 'running',
    name: { bn: 'সারের সরকারি দাম (ভর্তুকি)', en: 'The government fertiliser price (subsidy)' },
    by: { bn: 'কৃষি মন্ত্রণালয়', en: 'Ministry of Agriculture' },
    benefit: { bn: 'সরকার সারে ভর্তুকি দেয়, তাই কৃষকের দাম বাঁধা: ইউরিয়া ২৭, টিএসপি ২৭, ডিএপি ২১, এমওপি ২০ টাকা কেজি (এপ্রিল ২০২৩-এর ঘোষণা)। ডিলার বেশি চাইলে উপজেলা কৃষি অফিসে জানান।', en: 'The government subsidises fertiliser, so the farmer price is fixed: urea 27, TSP 27, DAP 21, MoP 20 taka a kg (April 2023 notice). If a dealer asks more, tell the upazila agriculture office.' },
    who: { bn: 'সব কৃষক', en: 'Every farmer' },
    rule: {},
    docs: [],
    where: { bn: 'অনুমোদিত সার ডিলার; অভিযোগ উপজেলা কৃষি অফিসে', en: 'Licensed fertiliser dealers; complaints to the upazila agriculture office' },
    src: 'https://www.tbsnews.net/node/614670',
    note: { bn: '২০২৫ সালে কয়েক জেলায় ডিলাররা কেজিতে ৩–৫ টাকা বেশি নিয়েছেন বলে খবর এসেছে।', en: 'In 2025 dealers in several districts were reported charging 3–5 taka a kg over the fixed price.' },
    words: ['price', 'দাম', 'urea', 'ইউরিয়া', 'tsp', 'টিএসপি', 'dap', 'ডিএপি', 'mop', 'এমওপি', 'সার', 'fertiliser', 'fertilizer', 'dealer', 'ডিলার', 'ভর্তুকি', 'subsidy'],
  },
  {
    id: 'credit_4pc', kind: 'credit', status: 'running',
    name: { bn: 'ডাল, তেলবীজ, মসলা ও ভুট্টায় ৪% সুদের ঋণ', en: '4% loans for pulses, oilseeds, spices and maize' },
    by: { bn: 'বাংলাদেশ ব্যাংকের পুনঃঅর্থায়ন, তফসিলি ব্যাংকের মাধ্যমে', en: 'Bangladesh Bank refinance, through the scheduled banks' },
    benefit: { bn: 'আমদানি কমাতে এই ফসলে ঋণের সুদ মাত্র ৪%; বাকি সুদ সরকার ব্যাংককে দেয়। অন্য কৃষিঋণে সুদ সাধারণত বেশি।', en: 'To cut imports, loans for these crops cost only 4% interest; the government pays the bank the rest. Other farm loans usually cost more.' },
    who: { bn: 'এই মৌসুমে ডাল, তেলবীজ, মসলা বা ভুট্টা চাষ করছেন এমন কৃষক', en: 'Farmers growing pulses, oilseeds, spices or maize this season' },
    rule: { crops: ['lentil', 'mungbean', 'mustard', 'sesame', 'maize', 'sunflower', 'onion', 'garlic', 'chilli', 'turmeric', 'ginger'], needs: ['ten_taka'] },
    docs: [{ bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'কৃষি কার্ড', en: 'The input-support card' }, { bn: 'জমির কাগজ বা বর্গার চুক্তি', en: 'Land papers or the sharecropping agreement' }],
    where: { bn: 'যে ব্যাংকে ১০ টাকার হিসাব, বা কৃষি ব্যাংক / রাকাব শাখা', en: 'The bank holding your 10-taka account, or a Krishi Bank / RAKUB branch' },
    src: 'https://www.tbsnews.net/economy/banking/banks-give-more-4-interest-loans-import-substitution-crops-424842',
    note: { bn: '২০২৬–২৭ বাজেটে এই ৪% ঋণ চালু রাখার কথা বলা হয়েছে।', en: 'The 2026–27 budget says these 4% loans will continue.' },
    words: ['loan', 'ঋণ', 'credit', 'interest', 'সুদ', '4%', '৪%', 'ডাল', 'pulse', 'তেলবীজ', 'oilseed', 'মসলা', 'spice', 'ভুট্টা', 'maize', 'bank', 'ব্যাংক'],
  },
  {
    id: 'agri_credit', kind: 'credit', status: 'running',
    name: { bn: 'কৃষি ও পল্লী ঋণ (২০২৫–২৬ নীতিমালা)', en: 'Farm and rural credit (2025–26 policy)' },
    by: { bn: 'বাংলাদেশ ব্যাংক; সব তফসিলি ব্যাংক', en: 'Bangladesh Bank; every scheduled bank' },
    benefit: { bn: 'ফসল, সেচ, যন্ত্র ও গবাদিপশুর জন্য মৌসুমি ঋণ; বর্গাচাষিরাও পান। ২.৫ লাখ টাকা পর্যন্ত ঋণে CIB ফি লাগে না। ২০২৫–২৬ সালের লক্ষ্য ৩৯,০০০ কোটি টাকা।', en: 'Seasonal loans for crops, irrigation, machines and livestock; sharecroppers qualify too. No CIB fee on loans up to 2.5 lakh taka. The 2025–26 target is 39,000 crore taka.' },
    who: { bn: 'নিজের জমি, বর্গা বা লিজে চাষ করেন এমন কৃষক', en: 'Farmers on their own, sharecropped or leased land' },
    rule: { needs: ['ten_taka'] },
    docs: [{ bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'জমির কাগজ বা বর্গার চুক্তি', en: 'Land papers or the sharecropping agreement' }, { bn: 'ছবি', en: 'A photo' }],
    where: { bn: 'কাছের ব্যাংক শাখা বা এজেন্ট ব্যাংকিং কেন্দ্র', en: 'The nearest bank branch or agent-banking point' },
    src: 'https://www.tbsnews.net/economy/bb-sets-tk39000-crore-agricultural-loan-target-fy26-1210411',
    words: ['loan', 'ঋণ', 'credit', 'bank', 'ব্যাংক', 'বর্গা', 'sharecrop', 'livestock', 'গরু'],
  },
  {
    id: 'loan_waiver', kind: 'credit', status: 'announced',
    name: { bn: 'ক্ষুদ্র কৃষকের ঋণ ও সুদ মওকুফ (২০২৬–২৭ বাজেট)', en: 'Small farmers’ loan and interest waiver (2026–27 budget)' },
    by: { bn: 'অর্থ মন্ত্রণালয়', en: 'Ministry of Finance' },
    benefit: { bn: 'বাজেটে ক্ষুদ্র কৃষকের ঋণ ও সুদ মওকুফে ১,৫৬৭.৯৬ কোটি টাকা রাখা হয়েছে। কোন ঋণ, কত টাকা পর্যন্ত—তা ব্যাংকের নির্দেশনায় আসবে।', en: 'The budget sets aside 1,567.96 crore taka to waive small farmers’ loans and interest. Which loans and up to what amount will come in the banks’ instructions.' },
    who: { bn: 'যাঁদের কৃষিঋণ বাকি আছে এমন ক্ষুদ্র কৃষক (নিয়ম এখনো জানা নেই)', en: 'Small farmers with an unpaid farm loan (the rules are not yet known)' },
    rule: { maxDec: 249 },
    docs: [{ bn: 'ঋণের কাগজ', en: 'Your loan papers' }],
    where: { bn: 'যে ব্যাংক থেকে ঋণ নিয়েছেন', en: 'The bank that gave the loan' },
    src: 'https://www.bssnews.net/js-session/375066',
    words: ['waive', 'মওকুফ', 'loan', 'ঋণ', 'debt', 'দেনা', 'সুদ', 'interest'],
  },
  {
    id: 'machinery', kind: 'machinery', status: 'check',
    name: { bn: 'কৃষিযন্ত্রে উন্নয়ন সহায়তা (৫০%, হাওর ও উপকূলে ৭০%)', en: 'Farm machinery grant (50%, 70% in haor and coastal areas)' },
    by: { bn: 'DAE, সমন্বিত ব্যবস্থাপনায় কৃষি যান্ত্রিকীকরণ প্রকল্প', en: 'DAE, the Agricultural Mechanisation Project' },
    benefit: { bn: 'কম্বাইন হারভেস্টার, রিপার, ধান রোপণযন্ত্র, সিডার ইত্যাদি কিনতে দামের ৫০% সরকার দেয়; হাওর ও উপকূলের জেলায় ৭০%।', en: 'The government pays 50% of the price of a combine harvester, reaper, transplanter, seeder and similar machines; 70% in haor and coastal districts.' },
    who: { bn: 'কৃষক, কৃষক দল বা উদ্যোক্তা; সাধারণত দলে মিলে নিলে সুবিধা', en: 'Farmers, farmer groups or entrepreneurs; usually easier as a group' },
    rule: {}, areaRate: { coastal: 70, haor: 70, other: 50 },
    docs: [{ bn: 'আবেদনপত্র', en: 'An application' }, { bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'নিজের অংশের টাকা', en: 'Your share of the price' }],
    where: { bn: 'উপজেলা কৃষি অফিস', en: 'The upazila agriculture office' },
    src: 'https://www.tbsnews.net/bangladesh/agro-machinery-use-still-negligible-despite-govt-subsidy-388810',
    note: { bn: 'প্রকল্পের মেয়াদ ২০২০–২০২৫ ছিল; এখন চালু কি না উপজেলা অফিসে জেনে নিন।', en: 'The project ran 2020–2025; ask the upazila office whether it is still open.' },
    words: ['machine', 'যন্ত্র', 'harvester', 'হারভেস্টার', 'reaper', 'রিপার', 'tractor', 'ট্রাক্টর', 'transplanter', 'seeder'],
  },
  {
    id: 'wibci', kind: 'insurance', status: 'pilot',
    name: { bn: 'আবহাওয়া-সূচক শস্যবিমা (পাইলট)', en: 'Weather-index crop insurance (pilot)' },
    by: { bn: 'সাধারণ বীমা কর্পোরেশন', en: 'Sadharan Bima Corporation' },
    benefit: { bn: 'আবহাওয়া অফিসের মাপা বৃষ্টি বা খরা একটা সীমা পেরোলে জমিতে না গিয়েই টাকা দেয়। প্রিমিয়াম ভাগ হয়েছিল কৃষক ৫০%, সরকার ২৫%, অর্থদাতা ২৫%। আকস্মিক বন্যা ধরে না।', en: 'Pays out when rain or drought measured by the weather office crosses a set level, with no field visit. The premium was split farmer 50%, government 25%, funder 25%. Flash floods are not covered.' },
    who: { bn: 'শুধু পাইলট জেলা: রাজশাহী, সিরাজগঞ্জ, নোয়াখালী', en: 'Pilot districts only: Rajshahi, Sirajganj, Noakhali' },
    rule: { districts: ['Rajshahi', 'Sirajganj', 'Noakhali'] },
    docs: [{ bn: 'জাতীয় পরিচয়পত্র', en: 'National ID card' }, { bn: 'জমির পরিমাণ', en: 'Your field size' }],
    where: { bn: 'সাধারণ বীমা কর্পোরেশনের জেলা অফিস বা উপজেলা কৃষি অফিস', en: 'The Sadharan Bima district office or the upazila agriculture office' },
    src: 'https://blogs.adb.org/node/4036',
    note: { bn: 'বাংলাদেশে সারা দেশের জন্য কোনো শস্যবিমা এখনো নেই।', en: 'Bangladesh still has no nationwide crop insurance.' },
    words: ['insurance', 'বিমা', 'বীমা', 'drought', 'খরা', 'flood', 'বন্যা', 'loss', 'ক্ষতি'],
  },
  {
    id: 'paddy_buy', kind: 'price', status: 'running',
    name: { bn: 'সরকারি ধান সংগ্রহ (বাঁধা দামে বিক্রি)', en: 'Government paddy procurement (sell at a set price)' },
    by: { bn: 'খাদ্য অধিদপ্তর', en: 'Directorate General of Food' },
    benefit: { bn: 'সরকার কৃষকের কাছ থেকে সরাসরি ধান কেনে। ২০২৫ বোরোতে দাম ছিল কেজি ৩৬ টাকা (৩ মে–৩১ আগস্ট)। বাজারদর কম হলে লাভ।', en: 'The government buys paddy straight from farmers. For Boro 2025 the price was 36 taka a kg (3 May–31 August). Worth it when the market price is lower.' },
    who: { bn: 'ধানচাষি; উপজেলায় নিবন্ধন বা লটারিতে নাম উঠলে', en: 'Rice farmers, once registered or picked by lottery in the upazila' },
    rule: { crops: ['boro', 'aman', 'aus'] },
    docs: [{ bn: 'কৃষি কার্ড', en: 'The input-support card' }, { bn: 'শুকনো, পরিষ্কার ধান (আর্দ্রতা ১৪%-এর নিচে)', en: 'Dry, clean paddy (moisture under 14%)' }],
    where: { bn: 'উপজেলা খাদ্য অফিস ও স্থানীয় খাদ্য গুদাম (এলএসডি)', en: 'The upazila food office and the local supply depot (LSD)' },
    src: 'https://thefinancialexpress.com.bd/trade/boro-procurement-nears-target-ahead-of-deadline',
    words: ['sell', 'বিক্রি', 'price', 'দাম', 'paddy', 'ধান', 'procure', 'সংগ্রহ', 'গুদাম', 'food'],
  },
  {
    id: 'soil_test', kind: 'soil', status: 'running',
    name: { bn: 'মাটি পরীক্ষা (SRDI)', en: 'Soil test (SRDI)' },
    by: { bn: 'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট', en: 'Soil Resource Development Institute' },
    benefit: { bn: 'আঞ্চলিক গবেষণাগার বা ভ্রাম্যমাণ মাটি পরীক্ষাগারে জমির মাটি পরীক্ষা করে কোন সার কতটা লাগবে তা জানায়। এই অ্যাপের মাটির তথ্য শুধু অনুমান; আসল পরীক্ষা তার চেয়ে নির্ভুল।', en: 'Tests your field’s soil at a regional lab or the mobile soil-testing lab and says which fertiliser and how much. This app’s soil figures are only estimates; a real test is better.' },
    who: { bn: 'সব কৃষক', en: 'Every farmer' },
    rule: {},
    docs: [{ bn: 'জমির ৫–৬ জায়গা থেকে ১৫ সেমি গভীরের মাটি মিশিয়ে আধা কেজি', en: 'Half a kilo of soil mixed from 5–6 spots in the field, 15 cm deep' }],
    where: { bn: 'SRDI আঞ্চলিক অফিস, বা উপজেলায় ভ্রাম্যমাণ গবেষণাগার এলে', en: 'An SRDI regional office, or the mobile lab when it visits the upazila' },
    src: 'https://srdi.gov.bd',
    words: ['soil', 'মাটি', 'test', 'পরীক্ষা', 'srdi', 'lab', 'গবেষণাগার', 'ph'],
  },
  {
    id: 'solar_pump', kind: 'irrigation', status: 'running',
    name: { bn: 'সৌর সেচ পাম্প', en: 'Solar irrigation pumps' },
    by: { bn: 'ইডকল (IDCOL) ও সহযোগী সংস্থা', en: 'IDCOL and its partner organisations' },
    benefit: { bn: 'ডিজেলের বদলে সূর্যের আলোয় চলা পাম্প; কৃষক মৌসুম বা ঘণ্টা ধরে পানির দাম দেন, পাম্প কিনতে হয় না।', en: 'Pumps that run on sunlight instead of diesel; farmers pay for water by the season or hour and do not buy the pump.' },
    who: { bn: 'যেখানে সৌর পাম্প বসানো আছে তার কমান্ড এলাকার কৃষক', en: 'Farmers inside the command area of an installed solar pump' },
    rule: { irrigation: ['none', 'stw'] },
    docs: [],
    where: { bn: 'গ্রামের পাম্প চালক, বা উপজেলা কৃষি অফিসে জিজ্ঞেস করুন কাছে কোথায় আছে', en: 'The village pump operator, or ask the upazila office where the nearest one is' },
    src: 'https://idcol.org',
    words: ['solar', 'সৌর', 'pump', 'পাম্প', 'irrigation', 'সেচ', 'water', 'পানি', 'diesel', 'ডিজেল'],
  },
  {
    id: 'call_16123', kind: 'advice', status: 'running',
    name: { bn: 'কৃষি কল সেন্টার ১৬১২৩', en: 'Krishi Call Centre 16123' },
    by: { bn: 'কৃষি তথ্য সার্ভিস (AIS)', en: 'Agriculture Information Service (AIS)' },
    benefit: { bn: 'যেকোনো মোবাইল থেকে ১৬১২৩-এ ফোন করে কৃষিবিদের কাছে ফসল, রোগ-পোকা, সার ও গবাদিপশুর পরামর্শ।', en: 'Call 16123 from any mobile for an agriculturist’s advice on crops, pests and diseases, fertiliser and livestock.' },
    who: { bn: 'সবাই', en: 'Everyone' },
    rule: {},
    docs: [],
    where: { bn: 'ফোন: ১৬১২৩', en: 'Phone: 16123' },
    src: 'https://ais.gov.bd',
    words: ['call', 'ফোন', 'phone', 'advice', 'পরামর্শ', '16123', '১৬১২৩', 'help', 'সাহায্য'],
  },
];

// Area type of each upazila, for programmes that pay more in haor or coastal districts. Coastal: Khulna, Barishal
// and Chattogram are among the government's 19 coastal districts. Haor: Sylhet is one of the seven haor districts.
// Barind: Godagari lies in the Barind Tract (Rajshahi).
export const AREA_TYPE = {
  godagari: 'barind', dhamrai: null, sitakunda: 'coastal', dacope: 'coastal', bakerganj: 'coastal', gangachara: null, gowainghat: 'haor',
};
