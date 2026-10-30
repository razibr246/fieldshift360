export const TOMATO_HARVEST_STAGES = [
  { id: 'walk', at: 0, label: { bn: 'গাছের কাছে হাঁটা', en: 'Walking to the plant' } },
  { id: 'inspect', at: 0.16, label: { bn: 'পাকা টমেটো দেখা', en: 'Inspecting ripe tomatoes' } },
  { id: 'reach', at: 0.31, label: { bn: 'হাত বাড়িয়ে ধরা', en: 'Reaching for a tomato' } },
  { id: 'pick', at: 0.47, label: { bn: 'টমেটো আলতো করে তোলা', en: 'Gently picking the tomato' } },
  { id: 'carry', at: 0.62, label: { bn: 'ঝুড়ির দিকে নেওয়া', en: 'Carrying it to the basket' } },
  { id: 'place', at: 0.77, label: { bn: 'ঝুড়িতে রাখা', en: 'Placing it in the basket' } },
  { id: 'reset', at: 0.91, label: { bn: 'আবার গাছের দিকে ফেরা', en: 'Turning back to the plant' } },
];

export const MUNGBEAN_SOWING_STAGES = [
  { id: 'prepare', at: 0, label: { bn: 'মাটি আলগা করা', en: 'Loosening the soil' } },
  { id: 'rows', at: 0.18, label: { bn: 'সারিতে বীজ বোনা', en: 'Sowing seeds in rows' } },
  { id: 'sow', at: 0.38, label: { bn: 'বীজ ছড়িয়ে বোনা', en: 'Scattering mung-bean seeds' } },
  { id: 'cover', at: 0.61, label: { bn: 'বীজ হালকা মাটি দিয়ে ঢাকা', en: 'Covering seeds lightly' } },
  { id: 'water', at: 0.8, label: { bn: 'মাটিতে অল্প পানি দেওয়া', en: 'Moistening the soil' } },
  { id: 'sprout', at: 0.94, label: { bn: 'চারা ওঠা দেখা', en: 'Checking for sprouts' } },
];

export const AMAN_TRANSPLANT_STAGES = [
  { id: 'prepare', at: 0, label: { bn: 'জমিতে পানি ধরে রাখা', en: 'Holding water in the field' } },
  { id: 'align', at: 0.18, label: { bn: 'চারা সারিতে সাজানো', en: 'Lining up the seedlings' } },
  { id: 'plant', at: 0.38, label: { bn: 'ধানের চারা রোপণ', en: 'Transplanting rice seedlings' } },
  { id: 'press', at: 0.61, label: { bn: 'চারার গোড়া মাটিতে বসানো', en: 'Firming soil around seedlings' } },
  { id: 'check', at: 0.8, label: { bn: 'সারির ফাঁক দেখা', en: 'Checking the row spacing' } },
  { id: 'finish', at: 0.94, label: { bn: 'রোপণ শেষ করা', en: 'Finishing the transplanting' } },
];

export const WHEAT_HARVEST_STAGES = [
  { id: 'check', at: 0, label: { bn: 'পাকা শিষ ঘষে দেখা', en: 'Rubbing an ear to check the grain' } },
  { id: 'grab', at: 0.14, label: { bn: 'মুঠো করে গাছ ধরা', en: 'Gathering a handful of stalks' } },
  { id: 'cut', at: 0.25, label: { bn: 'কাস্তে দিয়ে গোড়ার কাছে কাটা', en: 'Cutting low with the sickle' } },
  { id: 'lay', at: 0.45, label: { bn: 'কাটা গাছ বিছিয়ে রাখা', en: 'Laying the cut stalks down' } },
  { id: 'bundle', at: 0.6, label: { bn: 'খড়ের দড়িতে আঁটি বাঁধা', en: 'Tying a sheaf with a straw band' } },
  { id: 'stack', at: 0.82, label: { bn: 'আঁটি সরিয়ে সামনে এগোনো', en: 'Setting the sheaf aside, moving on' } },
];

export const SESAME_SOWING_STAGES = [
  { id: 'clods', at: 0, label: { bn: 'ঢেলা ভেঙে মাটি ঝুরঝুরে করা', en: 'Breaking clods for a fine bed' } },
  { id: 'mix', at: 0.2, label: { bn: 'ছোট বীজ বালুর সাথে মেশানো', en: 'Mixing the tiny seed with dry sand' } },
  { id: 'sow', at: 0.36, label: { bn: 'ছিটিয়ে বোনা', en: 'Broadcasting the mix' } },
  { id: 'cover', at: 0.6, label: { bn: 'ডাল টেনে বীজ ঢাকা', en: 'Dragging a leafy branch to cover the seed' } },
  { id: 'sprout', at: 0.84, label: { bn: 'চারা গজানো দেখা', en: 'Checking the seedlings' } },
];

export const clampProgress = (progress) => Math.max(0, Math.min(1, Number(progress) || 0));

export function dateAtProgress(from, to, progress) {
  return Math.round(from + (to - from) * clampProgress(progress));
}

export function stageAtProgress(progress, stages = TOMATO_HARVEST_STAGES) {
  const p = clampProgress(progress);
  let index = 0;
  for (let i = 1; i < stages.length; i += 1) {
    if (stages[i].at > p) break;
    index = i;
  }
  return index;
}
