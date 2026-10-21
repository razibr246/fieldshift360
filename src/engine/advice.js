// Pure text builders shared by the officer pages and the voice assistant (no React, so Node tests can import them).
import { SYMPTOMS } from '../data/demo.js';
import { UPAZILAS } from '../data/upazilas.js';
import { cropName } from './crops.js';
import { num } from './dates.js';
import { bnOf } from './text.js';

// Questions farmers ask often, recognised from their words, with an answer the officer can send after checking.
// Conservative, standard extension advice (BRRI/BARI practice); exact doses are left to the soil test and the
// Fertiliser Recommendation Guide rather than guessed here.
const has = (r, ...words) => words.every((w) => `${r.text?.bn ?? ''} ${r.text?.en ?? ''}`.toLowerCase().includes(w));
export function topicOf(r) {
  if ((has(r, 'সরিষা') && has(r, 'বোরো')) || has(r, 'mustard', 'boro')) return 'boro_after_mustard';
  if ((has(r, 'সরিষা') && has(r, 'কাট')) || has(r, 'mustard', 'cut')) return 'mustard_harvest';
  if ((has(r, 'গম') && has(r, 'সেচ')) || has(r, 'wheat', 'water')) return 'wheat_irrigation';
  if ((has(r, 'মসুর') && has(r, 'সার')) || has(r, 'lentil', 'fertil')) return 'lentil_fertiliser';
  return null;
}
const TOPIC = {
  boro_after_mustard: [
    'সরিষা কাটার পর যত তাড়াতাড়ি পারেন, সাধারণত এক সপ্তাহের মধ্যে জমি তৈরি করে বোরো রোপণ করুন। এ জন্য সরিষা কাটার আগেই বীজতলা করে রাখুন, যাতে রোপণের দিনে চারার বয়স ৩৫–৪৫ দিন হয়। রোপণ ফেব্রুয়ারির মাঝামাঝির পরে গেলে ফুল আসার সময় গরমে চিটা বাড়তে পারে। জাত আর তারিখ ঠিক করতে আমার সঙ্গে কথা বলবেন।',
    'Transplant the Boro as soon as you can after cutting the mustard, usually within a week. Start the seedbed before the mustard is cut, so the seedlings are 35–45 days old on transplanting day. Planting after mid-February risks heat at flowering and more empty grains. Talk to me to settle the variety and the date.',
  ],
  mustard_harvest: [
    'শুঁটির ৭০–৮০ ভাগ খড়ের মতো হলদে হলে সরিষা কাটুন; বেশি পাকতে দিলে শুঁটি ফেটে দানা ঝরে যায়। সকালে শিশির থাকতে কাটলে দানা কম ঝরে। কাটার পর দেরি না করে মাড়াই করে রোদে শুকিয়ে নিন।',
    'Cut the mustard when 70–80% of the pods have turned straw-yellow; left longer, the pods split and drop the seed. Cutting in the morning dew loses less seed. Thresh soon after cutting and dry the seed in the sun.',
  ],
  wheat_irrigation: [
    'গমে সাধারণত তিনটি সেচ দিতে হয়: বোনার ১৭–২১ দিনে (মুকুট শিকড় বের হওয়ার সময়), ৫০–৫৫ দিনে (থোড় আসার সময়) আর ৭৫–৮০ দিনে (দানা পুষ্ট হওয়ার সময়)। শেষ সেচটি দানা পুষ্ট হওয়ার সময়ে দিন। জমিতে পানি জমতে দেবেন না।',
    'Wheat usually needs three waterings: 17–21 days after sowing (crown roots), 50–55 days (booting) and 75–80 days (grain filling). Give the last one at grain filling, and do not let water stand in the field.',
  ],
  lentil_fertiliser: [
    'মসুর ডাল-জাতীয় ফসল; শিকড়ের গুটি বাতাস থেকে নাইট্রোজেন নেয়, তাই ইউরিয়া খুব কম লাগে। সব সার শেষ চাষের সময় একবারে দিন: সামান্য ইউরিয়া, টিএসপি, এমওপি আর বোরন। আপনার জমির মাটি অনুযায়ী ঠিক পরিমাণ ফোনে বলে দেব।',
    'Lentil is a pulse: its root nodules take nitrogen from the air, so it needs very little urea. Give all the fertiliser at the last ploughing: a little urea, TSP, MoP and boron. I will call you with the exact amounts for your soil.',
  ],
};
export const topicAnswer = (r, T) => { const t = TOPIC[topicOf(r)]; return t ? T(t[0], t[1]) : null; };

// Starting text for a reply, by problem type. The officer edits it before sending.
export function replyTemplate(r, T) {
  const known = r.symptom === 'question' || r.symptom === 'water' ? topicAnswer(r, T) : null;
  if (known) return known;
  if (r.symptom === 'leaf_spot') return T('ছবি দেখেছি। দাগওয়ালা নিচের পাতাগুলো ছিঁড়ে মাটিতে পুঁতে ফেলুন, আর পাতা না ভিজিয়ে গোড়ায় পানি দিন। দুই দিন পর আরেকটা ছবি পাঠাবেন। কোনো ওষুধ দেওয়ার আগে আমাকে জানাবেন।', 'I have seen your photo. Pick off the spotted lower leaves and bury them, and water at the base without wetting the leaves. Send another photo in two days, and tell me before you use any chemical.');
  if (r.symptom === 'water') return T('আপনার জমি দেখতে আসছি। আপাতত সকালে বা বিকেলে অল্প করে সেচ দিন। নলকূপের অপারেটরের সঙ্গে আমি কথা বলছি।', 'I am coming to see your field. For now, water a little in the morning or evening. I am talking to the tube-well operator.');
  if (r.symptom === 'aphid' && r.crop === 'mustard') return T('হলুদ আঠালো ফাঁদ লাগান আর জাব পোকা ধরা ডগাগুলো ভেঙে মাটিতে পুঁতে ফেলুন। ফুলে মৌমাছি আসে, তাই নিজে থেকে ওষুধ দেবেন না; দুই-তিন দিনে পোকা বাড়লে আমাকে জানাবেন, দরকার হলে বিকেলে কী দেবেন বলে দেব।', 'Put up yellow sticky traps and snap off the infested tips and bury them. Bees visit the flowers, so do not spray on your own; tell me if the aphids spread in two or three days and I will say what to use, in the late afternoon, if needed.');
  if (r.symptom === 'aphid') return T('হলুদ আঠালো ফাঁদ লাগান আর জাব পোকা ধরা ডগাগুলো ভেঙে ফেলুন। দুই-তিন দিনে বাড়লে আমাকে জানাবেন।', 'Put up yellow sticky traps and snap off the infested tips. Tell me if it spreads in two or three days.');
  if (r.symptom === 'cold') return T('রাতে বীজতলা স্বচ্ছ পলিথিনে ঢেকে দিন, সকালে রোদ উঠলে সরিয়ে দিন। বীজতলায় দুই-তিন সেন্টিমিটার পানি রাখুন, আর সকালে ঠান্ডা পানি বের করে নতুন পানি দিন। চারার ওপরের শিশির ঝেড়ে দিন। কোনো সার বা ওষুধ দেওয়ার আগে আমাকে জানাবেন।', 'Cover the seedbed with clear polythene at night and lift it when the sun is up. Keep two or three centimetres of water in the bed, and in the morning drain the cold water and let in fresh. Shake the dew off the seedlings. Tell me before you use any fertiliser or chemical.');
  if (r.symptom === 'waste') return T('জমির পানি আর মাটির নমুনা নিতে আসছি। আপাতত ওই পানি সেচে দেবেন না, আর খালি পায়ে জমিতে নামবেন না। বিষয়টি উপজেলা প্রশাসন আর পরিবেশ অধিদপ্তরকে জানাচ্ছি।', 'I am coming to take samples of the water and soil. Until then do not irrigate with that water, and do not walk into the field barefoot. I am reporting this to the upazila administration and the Department of Environment.');
  if (r.symptom === 'wilt') return T('কয়েকটা নেতানো গাছ গোড়াসহ তুলে সরিয়ে ফেলুন, জমিতে পানি জমতে দেবেন না। কাল আমি জমি দেখতে আসব।', 'Pull out the wilted plants, roots and all, and do not let water stand in the field. I will come and look tomorrow.');
  return T('আপনার প্রশ্ন পেয়েছি, ধন্যবাদ। আজকের মধ্যে ফোন করে বিস্তারিত বলছি।', 'Thank you, I have your question. I will call you today with the details.');
}

export function advisoryText(cluster, unionMeta, lang) {
  const vs = [...new Set(cluster.members.map((m) => (lang === 'bn' ? m.villageBn : m.village)))].join(lang === 'bn' ? ' ও ' : ' and ');
  const n = cluster.members.length;
  const upz = UPAZILAS[unionMeta.upazila] ?? UPAZILAS.godagari;
  const sign = lang === 'bn' ? `— উপজেলা কৃষি অফিসার, ${upz.name.bn}` : `— Upazila agriculture officer, ${upz.name.en}`;
  if (cluster.crop === 'mustard' && cluster.symptom === 'aphid') {
    return lang === 'bn'
      ? `${vs} (${unionMeta.bn}) থেকে সরিষায় জাব পোকার ${num(n, 'bn')}টি খবর এসেছে।\n১. জমিতে হলুদ আঠালো ফাঁদ লাগান, পোকা ধরা ডগা ভেঙে মাটিতে পুঁতে ফেলুন।\n২. ফুলের সময় মৌমাছি আসে; ওষুধ দিতেই হলে বিকেলে দিন, তবে তার আগে আমার সঙ্গে কথা বলবেন।\n৩. দুই-তিন দিনে পোকা বাড়লে নতুন ছবি পাঠান।\n${sign}`
      : `${n} farmers in ${vs} (${unionMeta.en}) have reported aphids on their mustard.\n1. Put up yellow sticky traps, and snap off the infested tips and bury them.\n2. Bees visit the flowers; if a spray is really needed it goes on in the late afternoon, and only after you talk to me.\n3. If the aphids spread in two or three days, send a new photo.\n${sign}`;
  }
  if (cluster.crop !== 'tomato') {
    const c = cropName(cluster.crop, lang);
    return lang === 'bn'
      ? `${vs} (${unionMeta.bn}) থেকে ${bnOf(c)} একই রকম সমস্যার ${num(n, 'bn')}টি খবর এসেছে।\nআক্রান্ত গাছের নতুন ছবি পাঠান, আমি জমি দেখতে আসছি। কোনো কীটনাশক বা ছত্রাকনাশক দেওয়ার আগে আমার সঙ্গে কথা বলবেন।\n${sign}`
      : `${n} farmers in ${vs} (${unionMeta.en}) have reported the same problem with their ${c.toLowerCase()}.\nPlease send new photos of the affected plants; I will come and see. Talk to me before using any pesticide or fungicide.\n${sign}`;
  }
  return lang === 'bn'
    ? `${vs} (${unionMeta.bn}) থেকে টমেটোর পাতায় দাগের ${num(n, 'bn')}টি খবর এসেছে। আগাম ধসা (আর্লি ব্লাইট) হতে পারে।\n১. দাগওয়ালা নিচের পাতা ছিঁড়ে মাটিতে পুঁতে ফেলুন।\n২. গাছের গোড়ায় পানি দিন, পাতা ভেজাবেন না। সকালে সেচ দিন।\n৩. দুই-তিন দিনে দাগ বাড়লে নতুন ছবি পাঠান। কোনো ওষুধ দেওয়ার আগে আমার সঙ্গে কথা বলবেন।\n${sign}`
    : `${n} farmers in ${vs} (${unionMeta.en}) have reported spots on tomato leaves. It may be early blight.\n1. Pick off the spotted lower leaves and bury them.\n2. Water at the base, not on the leaves, and water in the morning.\n3. If the spots spread in two or three days, send a new photo. Talk to me before using any chemical.\n${sign}`;
}

// The three ready replies an officer picks from: a full answer, a promise to call, a field visit.
export function replyOptions(r, T, sign) {
  const end = sign ? `\n— ${sign}` : '';
  return [
    { key: 'answer', bn: 'পরামর্শসহ উত্তর', en: 'Answer with advice', text: `${replyTemplate(r, T)}${end}` },
    { key: 'call', bn: 'ফোনে বলব', en: 'Will call', text: `${T('আপনার কথা পেয়েছি, ধন্যবাদ। আজকের মধ্যে ফোন করে বিস্তারিত বলছি।', 'Thank you, I have your message. I will call you today with the details.')}${end}` },
    { key: 'visit', bn: 'জমিতে যাব', en: 'Will visit', text: `${T('কাল সকালে আপনার জমি দেখতে আসছি; সামনাসামনি দেখে বলব। ততক্ষণ কোনো ওষুধ দেবেন না।', 'I will come to see your field tomorrow morning and advise you there. Please do not use any chemical until then.')}${end}` },
  ];
}
