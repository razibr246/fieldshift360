// Text-only crop-problem lookup for offline use. It never inspects a photo or produces a diagnosis.

import { CROP_PROBLEMS } from '../data/crop_problems.js';

const CROP_NAMES = {
  tomato: { bn: 'টমেটো', en: 'Tomato' },
  mustard: { bn: 'সরিষা', en: 'Mustard' },
  boro: { bn: 'বোরো ধান', en: 'Boro rice' },
  aman: { bn: 'আমন ধান', en: 'Aman rice' },
  lentil: { bn: 'মসুর ডাল', en: 'Lentil' },
  wheat: { bn: 'গম', en: 'Wheat' },
  mungbean: { bn: 'মুগ ডাল', en: 'Mung bean' },
  sesame: { bn: 'তিল', en: 'Sesame' },
};

export function localCropAssessment({ crop = 'tomato', symptomKey = null, context = {}, lang = 'bn' }) {
  const cName = CROP_NAMES[crop] ?? { bn: crop, en: crop };
  const note = String(context.note || '').toLowerCase();
  const known = CROP_PROBLEMS[crop] ?? CROP_PROBLEMS.tomato ?? [];
  let match = symptomKey === 'healthy'
    ? { key: 'healthy', bn: 'সুস্থ ফসলের নমুনা', en: 'Healthy crop sample', urgent: false }
    : known.find((p) => p.key === symptomKey);
  if (!match && note) {
    match = known.find((p) => note.includes(p.key) || (p.look && (note.includes(p.look.bn) || note.includes(p.look.en))));
  }
  const actions = lang === 'bn'
    ? ['পাতার কোন অংশে সমস্যা, কবে শুরু, আর কত গাছে আছে—লিখে রাখুন।', 'একটি পরিষ্কার কাছের ছবি তুলে কৃষি কর্মকর্তাকে পাঠান।', 'কর্মকর্তার পরামর্শের আগে কোনো বালাইনাশক ব্যবহার করবেন না।']
    : ['Note which plant part is affected, when it started, and how many plants show it.', 'Take a clear close-up photo and send it to your agriculture officer.', 'Do not apply a pesticide before getting advice from your officer.'];
  const unresolved = !match;
  return {
    // These fields are deliberately inconclusive: this function has no access to image pixels.
    is_crop_photo: null,
    crop_seen: '',
    image_quality: 'unusable',
    retake_tip: '',
    findings: match && !unresolved ? [{
      key: match.key,
      name_bn: match.bn,
      name_en: match.en,
      likelihood: null,
      evidence: lang === 'bn'
        ? 'এই নামটি আপনার বাছাই করা নমুনা বা লেখা লক্ষণের সঙ্গে মেলে; ছবিটি অফলাইনে দেখা হয়নি।'
        : 'This label matches the selected sample or written symptom; the photo was not inspected offline.',
    }] : [],
    urgency: match && !unresolved && match.urgent ? 'high' : 'low',
    summary: unresolved
      ? lang === 'bn'
        ? `অফলাইনে ${cName.bn}-এর ছবি বিশ্লেষণ করা যায় না। আপনার লেখা থেকে নির্দিষ্ট কোনো লক্ষণ মেলেনি। ইন্টারনেট পেলে আবার চেষ্টা করুন, অথবা ছবিটি কৃষি কর্মকর্তাকে পাঠান।`
        : `The ${cName.en.toLowerCase()} photo cannot be analyzed offline, and no specific symptom matched your note. Try again with internet or send the photo to your agriculture officer.`
      : symptomKey === 'healthy'
        ? lang === 'bn'
          ? `এই নমুনাটি “সুস্থ ফসল” নামে চিহ্নিত, তবে অফলাইনে ছবিটি পরীক্ষা করা হয়নি। বাস্তব জমির গাছ সুস্থ কি না নিশ্চিত হতে ছবিটি কৃষি কর্মকর্তাকে দেখান।`
          : `This sample is labelled “healthy crop”, but the image was not checked offline. Ask your agriculture officer to confirm whether a real field plant is healthy.`
      : lang === 'bn'
        ? `আপনার বাছাই করা নমুনা বা লেখা লক্ষণটি “${match.bn}”-এর সঙ্গে মেলে। এটি ছবি দেখে রোগ নির্ণয় নয়—নিশ্চিত হতে কৃষি কর্মকর্তাকে দেখান।`
        : `Your selected sample or written symptom matches “${match.en}”. This is not a photo diagnosis; ask your agriculture officer to confirm.`,
    actions_now: actions,
    treatment_note: '',
    call_officer_if: lang === 'bn' ? 'সমস্যা ছড়ালে বা বাড়লে কৃষি কর্মকর্তাকে ছবি পাঠিয়ে পরামর্শ নিন।' : 'Send a photo to your agriculture officer if the problem spreads or worsens.',
    sources: [],
    offline: true,
    image_analyzed: false,
  };
}

