// চক্র লক্ষ্য (Chakra Goal): the farmer says what they want this season ("বেশি লাভ চাই", "পানি কম লাগুক") and the agent
// works towards it on its own: it understands the goal, plans the checks, runs them one by one on the season's options
// (engine/decision.js), checks its own answer against the goal and the risks, and ends with a plan. Pure functions.
//
//   runGoal(text, { options, chosen, priorities }, { budget }) -> { goal, steps, say, proposal, best } | null
//
// Every check only reads. The one thing it may propose, weighting the season plan towards the goal, is a `setPriority`
// effect that চক্র এজেন্ট always asks the farmer about (POLICY.confirm in engine/chakra.js). Goal-driven agents that
// plan, act within a budget and judge their own results were popularised by projects such as AutoGPT; this is its own
// design, bounded to the app's numbers.

import { bnOf } from './text.js';

const both = (bn, en) => ({ bn, en });
const bnN = (n) => String(Math.round(n)).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const tk = (n) => Math.round(n / 100) * 100; // money said to the nearest hundred taka

// The goals the plan can be weighted towards (the same ids as the plan's priorities).
export const GOALS = [
  { id: 'income', words: /লাভ|আয়|টাকা|রোজগার|বেশি দাম|profit|income|money|earn/i, name: both('বেশি লাভ', 'more profit'), better: 'max',
    metric: (o) => o.money?.net ?? null, show: (v) => both(`বিঘাপ্রতি প্রায় ${bnN(tk(v))} টাকা লাভ`, `about Tk ${tk(v)} profit a bigha`) },
  { id: 'water', words: /পানি কম|সেচ কম|কম পানি|কম সেচ|পানির খরচ|less water|save water|irrigation/i, name: both('কম পানি', 'less water'), better: 'min',
    metric: (o) => o.water?.mm ?? null, show: (v) => both(`প্রায় ${bnN(v)} মিলিমিটার সেচ`, `about ${Math.round(v)} mm of irrigation`) },
  { id: 'risk', words: /ঝুঁকি|নিরাপদ|ক্ষতি না|নিশ্চিন্ত|safe|risk|sure/i, name: both('কম ঝুঁকি', 'less risk'), better: 'max',
    metric: (o) => (o.bt?.now?.n ? o.bt.now.safe / o.bt.now.n : null), show: (v) => both(`১০০ মৌসুমে প্রায় ${bnN(v * 100)}টিতে আবহাওয়া ঠিক`, `the weather suited it in about ${Math.round(v * 100)} of 100 seasons`) },
  { id: 'early', words: /তাড়াতাড়ি|আগে তোলা|জলদি|early|sooner|quick/i, name: both('তাড়াতাড়ি তোলা', 'an early harvest'), better: 'min',
    metric: (o) => o.hw?.end ?? null, show: () => both('আগে ঘরে উঠবে', 'comes in sooner') },
];
export const GOAL_BUDGET = 6; // at most this many steps before the agent stops and reports

export function understand(text) {
  const t = String(text ?? '');
  return GOALS.find((g) => g.words.test(t)) ?? null;
}

export function runGoal(text, { options = [], chosen = null, priorities = [] } = {}, { budget = GOAL_BUDGET } = {}) {
  const goal = understand(text);
  if (!goal) return null;
  const steps = [];
  const step = (name, result, ok = true) => { if (steps.length < budget) steps.push({ name, result, ok }); return steps.length < budget; };
  const nm = (o) => o.crop?.name ?? both(o.crop?.id ?? '?', o.crop?.id ?? '?');
  const val = (o) => goal.metric(o);
  const better = (a, b) => (goal.better === 'max' ? a > b : a < b);

  // 1. Understand.
  step(both('লক্ষ্য বোঝা', 'Understand the goal'), both(`আপনি চান: ${goal.name.bn}`, `You want ${goal.name.en}`));
  // 2. Plan the checks.
  step(both('কাজের পরিকল্পনা', 'Plan the checks'), both('সব বিকল্প ফসল মেলাব, সবচেয়ে ভালোটা খুঁজব, তারপর তার ঝুঁকি আর বাজার দেখব।', 'Compare every option, find the best, then check its risk and market.'));
  // 3. Compare.
  const scored = options.filter((o) => Number.isFinite(val(o)));
  if (!scored.length) {
    step(both('বিকল্প মেলানো', 'Compare the options'), both('এই লক্ষ্যের হিসাব এই মৌসুমের বিকল্পগুলোয় নেই।', 'This season’s options carry no figures for this goal.'), false);
    return { goal, steps, best: null, proposal: null, say: both(`দুঃখিত, ${bnOf(goal.name.bn)} হিসাব এখন আমার কাছে নেই। কৃষি কর্মকর্তার সঙ্গে কথা বলুন।`, `Sorry, I have no figures for ${goal.name.en} right now. Talk to your agriculture officer.`) };
  }
  const best = scored.reduce((a, b) => (better(val(b), val(a)) ? b : a));
  const mine = chosen && scored.find((o) => o.crop?.id === chosen.crop?.id && o.shift === chosen.shift) || chosen;
  step(both('বিকল্প মেলানো', 'Compare the options'), both(`${bnN(scored.length)}টি বিকল্পের মধ্যে ${bnOf(goal.name.bn)} জন্য সবচেয়ে ভালো ${nm(best).bn}: ${goal.show(val(best)).bn}।`, `Of ${scored.length} options the best for ${goal.name.en} is ${nm(best).en}: ${goal.show(val(best)).en}.`));

  // 4. Judge its own answer: is the best also safe enough, and is the market crowded?
  const safe = best.bt?.now?.n ? best.bt.now.safe / best.bt.now.n : null;
  const risky = goal.id !== 'risk' && safe != null && safe < 0.6;
  const crowded = best.glut?.level === 'High';
  step(both('নিজের উত্তর যাচাই', 'Check my own answer'),
    risky || crowded
      ? both(`সাবধান: ${risky ? `${nm(best).bn}য় ১০০ মৌসুমে মাত্র ${bnN(safe * 100)}টিতে আবহাওয়া ঠিক ছিল` : ''}${risky && crowded ? ', আর ' : ''}${crowded ? 'ফসল তোলার সময় এলাকায় অনেকের একই ফসল উঠবে' : ''}।`, `Careful: ${risky ? `the weather suited ${nm(best).en.toLowerCase()} in only ${Math.round(safe * 100)} of 100 seasons` : ''}${risky && crowded ? ', and ' : ''}${crowded ? 'many nearby harvest the same crop at the same time' : ''}.`)
      : both('ঝুঁকি আর বাজার দুটোই ঠিক আছে।', 'Both the risk and the market look fine.'), !(risky || crowded));

  // 5. Decide.
  const already = mine && mine.crop?.id === best.crop?.id;
  const weighted = priorities.includes(goal.id);
  let proposal = null;
  let say;
  if (already) {
    step(both('সিদ্ধান্ত', 'Decide'), both('আপনার এখনকার পরিকল্পনাই এই লক্ষ্যের সঙ্গে মেলে।', 'Your current plan already fits this goal.'));
    say = both(`ভালো খবর: আপনার পরিকল্পনার ${nm(best).bn}ই ${bnOf(goal.name.bn)} জন্য সবচেয়ে ভালো, ${goal.show(val(best)).bn}।${risky || crowded ? ' তবে ঝুঁকিটা মাথায় রাখবেন।' : ''}`, `Good news: the ${nm(best).en.toLowerCase()} in your plan is already the best for ${goal.name.en}, ${goal.show(val(best)).en}.${risky || crowded ? ' Do keep the risk in mind.' : ''}`);
  } else {
    const gap = mine && Number.isFinite(val(mine)) ? Math.abs(val(best) - val(mine)) : null;
    if (!weighted) proposal = { type: 'setPriority', id: goal.id };
    step(both('সিদ্ধান্ত', 'Decide'), weighted
      ? both('পরিকল্পনায় এই লক্ষ্য আগে থেকেই ধরা আছে; বাকিটা আপনার বিবেচনা।', 'The plan already counts this goal; the rest is your call.')
      : both('পরিকল্পনাকে এই লক্ষ্যের দিকে ঝোঁকাতে আপনার অনুমতি চাইব।', 'I will ask you before weighting the plan towards this goal.'));
    const gapText = gap != null && goal.id === 'income' ? both(` এখনকার ফসলের চেয়ে বিঘাপ্রতি ${bnN(tk(gap))} টাকার মতো বেশি।`, ` That is about Tk ${tk(gap)} a bigha more than your current crop.`) : both('', '');
    say = both(`${bnOf(goal.name.bn)} জন্য ${nm(best).bn} সবচেয়ে ভালো, ${goal.show(val(best)).bn}।${gapText.bn}${risky || crowded ? ' তবে সাবধান, ঝুঁকি আছে।' : ''}${proposal ? ' পরিকল্পনাটা এই লক্ষ্যের দিকে ঝোঁকাব? "হ্যাঁ" বললে বদলে দেব।' : ''}`,
      `For ${goal.name.en}, ${nm(best).en.toLowerCase()} is best, ${goal.show(val(best)).en}.${gapText.en}${risky || crowded ? ' Careful, there is risk.' : ''}${proposal ? ' Shall I weight the plan towards this goal? Say yes and I will.' : ''}`);
  }
  return { goal, steps, best: { crop: nm(best), value: val(best), safe }, proposal, say, risky, crowded };
}
