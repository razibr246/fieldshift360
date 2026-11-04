// The village around the farm of মাঠের মানুষ: the haat (the weekly market) that moves prices, light rain showers that
// FieldShift forecasts, the choice between compost and urea, and neighbours who order a crop. Ideas from open farming
// games, rebuilt for this one: daily price changes and surge news (Farmhand), rain that waters the crops by itself
// (AgriSim), quests from the people around you (Lands). Game rules, not data: prices, rain and orders here are
// simulated for play, and the real prices and rain live in the FieldShift station. Pure; sim.js calls stepVillage
// every frame, priceOf reads marketMult, and plotAction calls wateredBeforeRain.
const q = (bn, en) => ({ bn, en });
const BN = '০১২৩৪৫৬৭৮৯';
const bn = (n) => String(n).replace(/[0-9]/g, (d) => BN[d]);
const emit = (g, e) => g.out.push(e);
const floater = (g, text, x, z, tone) => emit(g, { type: 'float', text, x, z, tone });

export const HAAT_EVERY = 150; // seconds of play between market days
export const SHOWER = { every: [110, 190], warn: 15, lasts: 14 };
export const ORDER = { every: [55, 95], lasts: 110 };
export const FERT = {
  compost: { cost: 8, feed: 1.15, fert: 0.15, soil: 2, carbon: 1, name: q('জৈব সার (কম্পোস্ট)', 'Compost'),
    why: q('কম্পোস্ট ধীরে কাজ করে কিন্তু মাটিতে জৈব পদার্থ যোগ করে: পরের ফসলও ভালো হয়।', 'Compost works slowly but adds organic matter: the next crop does better too.') },
  urea: { cost: 5, feed: 1.6, fert: -0.08, soil: -3, carbon: -2, name: q('ইউরিয়া', 'Urea'),
    why: q('ইউরিয়া এই ফসলকে দ্রুত বাড়ায়, কিন্তু বারবার দিলে মাটির জৈব পদার্থ কমে, বাড়তিটা পানিতে ধুয়ে যায়।', 'Urea makes this crop grow fast, but used again and again it runs the soil’s organic matter down, and the excess washes into the water.') },
};
// who might send an order: neighbours anyone could have, in any of the twelve villages
const BUYERS = [q('পাশের বাড়ির চাচি', 'The auntie next door'), q('চায়ের দোকানের মালিক', 'The tea-stall keeper'), q('স্কুলের রান্নার লোক', 'The school cook'), q('আড়তদার', 'The wholesaler'), q('মসজিদ-মন্দিরের উৎসব কমিটি', 'The festival committee')];

const rnd = (a, b) => a + Math.random() * (b - a);

export function initVillage(g) {
  const ks = Object.keys(g.R.crops);
  g.market = { mult: Object.fromEntries(ks.map((k) => [k, 1])), prev: Object.fromEntries(ks.map((k) => [k, 1])), next: HAAT_EVERY, surge: null, haat: 0 };
  g.fertilizer = { compost: 0, urea: 0 };
  g.order = null; g.nextOrder = rnd(...ORDER.every);
  g.nextShower = rnd(...SHOWER.every);
  Object.assign(g.count, { orders: 0, ordersMissed: 0, compost: 0, urea: 0, showers: 0, wasted: 0 });
  Object.assign(g.ev, { shower: 0, showerSoon: 0 });
}

export const marketMult = (g, k) => g.market?.mult[k] ?? 1;
export const priceTrend = (g, k) => { const m = g.market; if (!m) return 0; const d = m.mult[k] - m.prev[k]; return Math.abs(d) < 0.02 ? 0 : Math.sign(d); };

// A market day: every price drifts, pulled back towards normal; sometimes one crop is in demand (a wedding season,
// a festival) and fetches half as much again until the next haat.
function haat(g) {
  const m = g.market, ks = Object.keys(m.mult);
  m.haat++;
  for (const k of ks) { m.prev[k] = m.mult[k]; const drift = (Math.random() - 0.5) * 0.3 + (1 - m.mult[k]) * 0.35; m.mult[k] = Math.min(1.3, Math.max(0.78, m.mult[k] + drift)); }
  const pool = ks.filter((k) => !(g.ev.glut > 0 && k === g.R.glut));
  m.surge = Math.random() < 0.6 && pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (m.surge) m.mult[m.surge] = 1.5;
  const c = m.surge && g.R.crops[m.surge];
  emit(g, { type: 'alert', tone: 'ok', title: q(`হাটবার ${bn(m.haat)}: দাম বদলেছে`, `Market day ${m.haat}: prices have moved`),
    body: c ? q(`${c.bn}-এর চাহিদা বেশি: দাম ৫০% বেশি, পরের হাট পর্যন্ত। FieldShift-এ সব দাম দেখুন।`, `${c.en} is in demand: 50% more until the next market day. See every price on FieldShift.`)
      : q('কোনো ফসলের দাম আকাশছোঁয়া নয়; FieldShift-এ কোনটা বাড়ল, কোনটা কমল দেখুন।', 'No crop is soaring; see on FieldShift which prices rose and which fell.') });
}

function newOrder(g) {
  const ks = Object.keys(g.R.crops), k = ks[Math.floor(Math.random() * ks.length)], n = 2 + Math.floor(Math.random() * 2);
  const who = BUYERS[Math.floor(Math.random() * BUYERS.length)], bonus = Math.round(g.R.crops[k].price * n * 0.5);
  g.order = { crop: k, n, bonus, who, left: ORDER.lasts, total: ORDER.lasts };
  const c = g.R.crops[k];
  emit(g, { type: 'alert', tone: 'info', title: q(`${who.bn}-এর অর্ডার`, `An order from ${who.en.toLowerCase()}`), body: q(`${bn(n)}টি ${c.bn} হাটে আনলে ${g.R.cur}${bn(bonus)} বাড়তি।`, `Bring ${n} ${c.en} to the market for ${g.R.cur}${bonus} extra.`) });
}

// Called by the market sale before the basket empties: an order is met if the basket holds enough of its crop.
export function fillOrder(g) {
  const o = g.order;
  if (!o || (g.basket[o.crop] ?? 0) < o.n) return 0;
  g.money += o.bonus; g.count.earned += o.bonus; g.count.orders++; g.order = null; g.nextOrder = rnd(...ORDER.every);
  emit(g, { type: 'alert', tone: 'ok', title: q('অর্ডার পূরণ!', 'Order filled!'), body: q(`${o.who.bn} খুশি: ${g.R.cur}${bn(o.bonus)} বাড়তি পেলেন।`, `${o.who.en} is pleased: ${g.R.cur}${o.bonus} extra.`) });
  emit(g, { type: 'sound', s: 'good' });
  return o.bonus;
}

// Watering a plot while rain is forecast: allowed, but the farmer is told the water wasn't needed.
export function wateredBeforeRain(g, p) {
  if (!(g.ev.showerSoon > 0)) return;
  g.count.wasted++;
  floater(g, q('বৃষ্টি আসছে: এই পানি লাগত না', 'Rain is coming: that water wasn’t needed'), p.x, p.z, 'info');
}

export function buyFertilizer(g, kind, n) {
  const f = FERT[kind], cost = f.cost * n;
  if (g.money < cost) { emit(g, { type: 'toast', text: q('টাকা কম — আগে ফসল বিক্রি করুন।', 'Not enough money — sell some crop first.') }); return false; }
  g.money -= cost; g.fertilizer[kind] += n; emit(g, { type: 'sound', s: 'coin' }); return true;
}

// Feed the plot the farmer stands on: once per crop. Compost builds the soil; urea speeds this crop and costs soil.
export function fertilize(g, kind, plot) {
  const f = FERT[kind], p = plot;
  if (!p || !p.crop || p.dead) { emit(g, { type: 'toast', text: q('বেড়ে ওঠা ফসলের জমিতে দাঁড়িয়ে সার দিন।', 'Stand on a growing crop to feed it.') }); return false; }
  if (p.fed) { floater(g, q('এই ফসলে সার দেওয়া হয়েছে', 'This crop is already fed'), p.x, p.z, 'info'); return false; }
  if (!(g.fertilizer[kind] > 0)) { emit(g, { type: 'toast', text: q(`${f.name.bn} নেই — দোকান থেকে কিনুন।`, `No ${f.name.en.toLowerCase()} — buy some at the shop.`) }); return false; }
  g.fertilizer[kind]--; g.count[kind]++;
  p.fed = kind; p.feed = f.feed; p.fert = Math.min(0.6, Math.max(0, p.fert + f.fert));
  g.soilHealth = Math.min(100, Math.max(10, (g.soilHealth ?? 50) + f.soil)); g.carbonScore = Math.min(100, Math.max(0, (g.carbonScore ?? 25) + f.carbon));
  floater(g, kind === 'urea' ? q('ইউরিয়া: দ্রুত বাড়বে · মাটি −', 'Urea: grows fast · soil −') : q('কম্পোস্ট: মাটি উর্বর +', 'Compost: soil richer +'), p.x, p.z, kind === 'urea' ? 'bad' : 'good');
  emit(g, { type: 'toast', text: f.why }); emit(g, { type: 'sound', s: 'plant' });
  return true;
}

export function stepVillage(g, dt) {
  if (!g.market) return;
  const m = g.market;
  m.next -= dt; if (m.next <= 0) { m.next = HAAT_EVERY; haat(g); }
  // a shower: forecast first, then rain that waters every plot (never on top of the storm or the heatwave)
  const ev = g.ev;
  if (ev.shower > 0) { ev.shower -= dt; if (ev.shower <= 0) emit(g, { type: 'alert', tone: 'ok', title: q('বৃষ্টি থামল', 'The rain has stopped'), body: q('সব জমি ভিজেছে: কিছুক্ষণ পানি দেওয়ার দরকার নেই।', 'Every plot got a soaking: no need to water for a while.') }); }
  else if (ev.showerSoon > 0) { ev.showerSoon -= dt; if (ev.showerSoon <= 0) { ev.shower = SHOWER.lasts; g.count.showers++; } }
  else if ((g.nextShower -= dt) <= 0) {
    g.nextShower = rnd(...SHOWER.every);
    if (!(ev.storm > 0 || ev.zone || ev.heat > 0)) {
      ev.showerSoon = SHOWER.warn;
      emit(g, { type: 'alert', tone: 'info', title: q('FieldShift: বৃষ্টি আসছে', 'FieldShift: rain is coming'), body: q(`প্রায় ${bn(SHOWER.warn)} সেকেন্ডে হালকা বৃষ্টি। এখন পানি দেবেন না: বালতির পানি বাঁচান। (নাসার GPM বৃষ্টির মাপ দেখেই এমন পূর্বাভাস।)`, `Light rain in about ${SHOWER.warn} seconds. Don’t water now: save what’s in the can. (Forecasts like this rest on rain measured by NASA’s GPM.)`) });
    }
  }
  // the neighbours' orders
  if (g.order) { g.order.left -= dt; if (g.order.left <= 0) { const o = g.order; g.order = null; g.count.ordersMissed++; g.nextOrder = rnd(...ORDER.every); emit(g, { type: 'alert', tone: 'hot', title: q('অর্ডার ফসকে গেল', 'Order missed'), body: q(`${o.who.bn} অন্য কারও কাছ থেকে কিনলেন।`, `${o.who.en} bought from someone else.`) }); } }
  else if (!g.won && (g.nextOrder -= dt) <= 0) newOrder(g);
}
