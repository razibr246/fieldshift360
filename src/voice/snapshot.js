// Builds the plain-JSON snapshot the voice brain reads from. Nothing here is computed from scratch: every number comes
// from the same engine results the screens already show (NASA POWER backtest, soil, harvest-glut model, officer data).
import { RABI_CROPS, ROTATION_CROPS, IRRIGATION, cropName } from '../engine/crops.js';
import { yieldRange } from '../engine/harvest.js';
import { weatherAlerts } from '../engine/water.js';
import { supplyCurve, normalWeekly, riskForWeeks, slotLoad, weekStart } from '../engine/glut.js';
import { fmtDate, fmtDateBoth, daysBetween } from '../engine/dates.js';
import { SYMPTOMS, DISEASES, aiLabel, upazilaOfUnion } from '../data/demo.js';
import { UPAZILA_DEFAULT_ADVICE } from '../data/advice.js';

const both = (f) => ({ bn: f('bn'), en: f('en') });
const ACT = {
  boro: { bn: 'চারা রোপণ করুন', en: 'transplant' },
  tomato: { bn: 'চারা লাগান', en: 'transplant' },
  wheat: { bn: 'বীজ বুনুন', en: 'sow' },
  lentil: { bn: 'বীজ বুনুন', en: 'sow' },
  mustard: { bn: 'বীজ বুনুন', en: 'sow' },
};
const WATER_WORD = { High: { bn: 'বেশি', en: 'a lot of' }, Medium: { bn: 'মাঝারি', en: 'a moderate amount of' }, 'Low-Medium': { bn: 'কম থেকে মাঝারি', en: 'little to moderate' }, Low: { bn: 'খুব কম', en: 'very little' } };

const crops = () => ({
  ...Object.fromEntries(Object.values(RABI_CROPS).map((c) => [c.id, c.name])),
  ...Object.fromEntries(Object.values(ROTATION_CROPS).map((c) => [c.id, c.name])),
});

function reasons(ctx) {
  const { chosen, farmer, soil } = ctx;
  const c = chosen.crop;
  const out = [];
  const bt = chosen.bt.now;
  if (bt.n) out.push({ bn: `২০১৩ থেকে ২০২৫-এর ${bt.n}টি মৌসুমের ${bt.safe}টিতে এই সময়ে ${c.name.bn} লাগালে আবহাওয়া ঠিক ছিল`.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]), en: `In ${bt.safe} of the ${bt.n} seasons from 2013 to 2025 the weather suited ${c.name.en.toLowerCase()} planted at this time` });
  if (chosen.soilNotes[0]) out.push(chosen.soilNotes[0]);
  const irr = IRRIGATION[farmer.irrigation];
  out.push({ bn: `${c.name.bn}য় সেচ লাগে ${WATER_WORD[c.water].bn}, আর আপনার সেচের উৎস ${irr.bn}`, en: `${c.name.en} needs ${WATER_WORD[c.water].en} irrigation and your source is a ${irr.en.toLowerCase()}` });
  if (chosen.glut.level !== 'Low') out.push({ bn: 'কাছাকাছি অনেকে একই সময়ে লাগাচ্ছেন, তাই ফসল তোলার সময় দাম পড়তে পারে', en: 'Many neighbours plan to plant at the same time, so prices may fall at harvest' });
  else out.push({ bn: 'আপনার ইউনিয়নে এই সময়ে লাগানো আর তোলার চাপ কম, দাম পড়ার ঝুঁকি কম', en: 'Planting and harvest are not crowded in your union at this time, so the price-drop risk is low' });
  if (ctx.s.priorities.length) out.push({ bn: `আপনার পছন্দ ধরা হয়েছে: ${ctx.s.priorities.map((p) => ({ water: 'সেচ কম', income: 'আয় বেশি', risk: 'ঝুঁকি কম', soil: 'মাটি ভালো', early: 'তাড়াতাড়ি তোলা' }[p])).join(', ')}`, en: `Your priorities were counted: ${ctx.s.priorities.join(', ')}` });
  return out;
}

// ───────────────────────── farmer snapshot ─────────────────────────
export function farmerSnapshot(ctx, { clim, soilData, unions }) {
  const { s, farmer: f, chosen, decision, rotation, soil, water, weather, stage, myAdvisories, today } = ctx;
  const union = unions.find((u) => u.id === f.union);
  const upz = upazilaOfUnion(f.union);
  const label = s.pick ? (chosen.crop.id === f.last_crop ? (chosen.shift === 0 ? 'KEEP' : 'ADJUST') : 'SHIFT') : decision.label;
  const safeShare = chosen.bt.now.n ? chosen.bt.now.safe / chosen.bt.now.n : 1;
  const yr = yieldRange(chosen.crop, f.area_dec, safeShare);
  const alts = {};
  for (const o of decision.options) {
    alts[o.crop.id] = { crop: o.crop.name, score: Math.round(o.score), plantDate: both((l) => fmtDateBoth(o.t0, l)), act: ACT[o.crop.id], better: o.score > chosen.score };
  }
  const rot = rotation;
  return {
    v: 1,
    prov: { climate: clim.prov.status === 'REAL' ? 'REAL' : 'PLACEHOLDER', soil: soilData.provenance.status === 'REAL' ? 'REAL' : 'DEMO' },
    todayMs: today,
    farmer: {
      id: f.id, name: f.name, union: { id: union.id, bn: union.bn, en: union.en }, village: { bn: f.villageBn, en: f.village },
      areaDec: f.area_dec, areaBigha: Math.round((f.area_dec / 33) * 10) / 10, lastCrop: RABI_CROPS[f.last_crop].name, irrigation: { bn: IRRIGATION[f.irrigation].bn, en: IRRIGATION[f.irrigation].en },
      uao: upz.officer, upazila: upz.name, geo: { village: f.village, villageBn: f.villageBn, lat: f.lat, lon: f.lon },
    },
    plan: {
      label, caution: !!decision.caution && label === 'KEEP', crop: { id: chosen.crop.id, ...chosen.crop.name }, act: ACT[chosen.crop.id], shiftDays: chosen.shift,
      plantDate: both((l) => fmtDateBoth(chosen.t0, l)),
      harvest: { start: both((l) => fmtDate(chosen.hw.start, l)), end: both((l) => fmtDate(chosen.hw.end, l)), days: chosen.hw.days },
      yield: { maundLow: Math.round(yr.maundLow), maundHigh: Math.round(yr.maundHigh) },
      safe: chosen.bt.now, glut: { level: chosen.glut.level, hiPct: Math.round(chosen.glut.hiShare * 100), share: Math.round(chosen.glut.share * 100) },
      reasons: reasons(ctx), confirmed: !!ctx.confirmedPlan, score: Math.round(chosen.score),
    },
    alts,
    crops: crops(),
    symptoms: Object.fromEntries(Object.entries(SYMPTOMS).map(([k, v]) => [k, { bn: v.bn, en: v.en }])),
    rotation: rot && (rot.best || rot.directAman) ? {
      directAman: rot.directAman, sowDate: both((l) => fmtDate(rot.sowT, l)), caution: rot.nextRabiCaution,
      best: rot.best ? { crop: rot.best.crop.name, why: rot.best.why } : null,
      alternatives: rot.alternatives.map((a) => ({ crop: a.crop.name })),
    } : null,
    soil: { ph: soil.ph, om: soil.om_pct, notes: chosen.soilNotes, sample: soilData.provenance.status !== 'REAL' },
    today: {
      water: { color: water.color, reasons: water.reasons },
      weather: { rain7: weather.rain7, rainNext3: weather.rainNext3, tmax: weather.tmax, live: !!ctx.liveWeather },
      stage, daysAfter: ctx.daysAfter, alerts: weatherAlerts({ tmax: weather.tmax, rainNext3: weather.rainNext3 }),
    },
    requests: s.requests.filter((r) => r.farmerId === f.id).sort((a, b) => b.created - a.created).map((r) => ({ id: r.id, status: r.status, symptom: SYMPTOMS[r.symptom], text: r.text, ageDays: daysBetween(r.created, today) })),
    advisories: myAdvisories.slice(0, 5).map((a) => ({ text: { bn: a.text, en: a.text }, kind: a.upazila ? 'upazila' : a.cluster ? 'area' : 'reply', ageDays: daysBetween(a.at, today) })),
  };
}

// ───────────────────────── officer snapshot ─────────────────────────
const PR = { High: 0, Medium: 1, Low: 2 };

export function officerSnapshot(ctx, role, { clim, soilData, templateFn, advisoryFn, radar }) {
  const { s, unionsAll, hotspots, farmerOf, farmers, today } = ctx;
  const union = unionsAll[s.officerUnion];
  const meta = union.meta;
  // The officer's upazila is the one their union belongs to; rankings and broadcasts stay inside it.
  const upz = upazilaOfUnion(union.id);
  const sameUpz = (unionId) => upazilaOfUnion(unionId).id === upz.id;
  // The upazila's biggest planned crop: the one the ranking's price-drop risk is about.
  const cropArea = {};
  for (const u of Object.values(unionsAll)) if (sameUpz(u.id)) for (const p of u.plans) cropArea[p.crop] = (cropArea[p.crop] ?? 0) + p.area_dec;
  const mainCrop = Object.entries(cropArea).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'tomato';
  const uao = role === 'uao';
  const unionGlut = (u, crop) => {
    const bins = supplyCurve(null, u.plans, crop);
    const normal = normalWeekly(u.area_dec, crop);
    const risk = riskForWeeks(bins, [...bins.keys()], normal, crop);
    const peak = bins.size ? Math.max(...bins.values()) / normal : 0;
    const peakK = bins.size ? [...bins.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
    return { bins, normal, risk, peak, peakK };
  };

  const open = s.requests.filter((r) => r.union === union.id && r.status === 'open').sort((a, b) => PR[a.priority] - PR[b.priority] || b.created - a.created);
  const mapReq = (r) => {
    const fm = farmerOf(r.farmerId);
    const sy = SYMPTOMS[r.symptom];
    return {
      id: r.id, farmerId: r.farmerId, farmer: fm?.name ?? { bn: r.farmerId, en: r.farmerId }, village: { bn: r.villageBn, en: r.village }, crop: { bn: cropName(r.crop, 'bn'), en: cropName(r.crop, 'en') },
      symptom: sy, priority: r.priority, status: r.status, ageDays: daysBetween(r.created, today), text: r.text, mine: !!r.mine,
      aiGuess: r.ai ? { ...aiLabel(r.ai[0]), pct: Math.round(r.ai[0].p * 100) } : null,
      draft: { bn: templateFn(r, (bn) => bn), en: templateFn(r, (bn, en) => en) },
      escalation: { id: `REQ-${r.id}`, union: r.union, kind: 'request', text: { bn: `${fm?.name.bn} (${r.villageBn}): ${sy.bn}`, en: `${fm?.name.en} (${r.village}): ${sy.en.toLowerCase()}` }, at: today },
    };
  };

  const hs = hotspots.filter((h) => h.members.some((m) => m.union === union.id)).map((h) => {
    const villages = [...new Set(h.members.map((m) => m.village))];
    const recipients = union.plans.filter((p) => p.crop === h.crop && villages.includes(farmerOf(p.plot_id)?.village)).map((p) => p.plot_id);
    const to = [...new Set([...recipients, ...h.members.map((m) => m.farmerId)])];
    const vBn = villages.map((v) => h.members.find((m) => m.village === v).villageBn).join(' ও ');
    const sy = SYMPTOMS[h.symptom];
    return {
      id: h.id, size: h.members.length, crop: { bn: cropName(h.crop, 'bn'), en: cropName(h.crop, 'en') }, symptom: sy, villages: { bn: vBn, en: villages.join(' and ') },
      memberIds: h.members.map((m) => m.id), recipients: to, draft: { bn: advisoryFn(h, meta, 'bn'), en: advisoryFn(h, meta, 'en') },
      sent: s.advisories.some((a) => a.cluster === h.id), escalated: s.escalations.some((e) => e.id === h.id),
      escalation: { id: h.id, union: union.id, kind: 'cluster', text: { bn: `${meta.bn}: ${cropName(h.crop, 'bn')} ${sy.bn}, ${h.members.length}টি খবর`.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]), en: `${meta.en}: ${sy.en} on ${cropName(h.crop, 'en').toLowerCase()}, ${h.members.length} reports` }, at: today },
    };
  });

  const glut = Object.keys(RABI_CROPS).map((c) => ({ c, g: unionGlut(union, c) })).filter((x) => x.g.bins.size).map(({ c, g }) => ({
    crop: RABI_CROPS[c].name, level: g.risk.level, peak: Math.round(g.peak * 10) / 10, peakWeek: g.peakK === null ? { bn: '–', en: '–' } : both((l) => fmtDate(weekStart(g.peakK), l)),
  })).sort((a, b) => b.peak - a.peak);

  const totalArea = union.plans.reduce((a, p) => a + p.area_dec, 0) || 1;
  const cropShare = Object.keys(RABI_CROPS).map((c) => ({ crop: RABI_CROPS[c].name, pct: Math.round((union.plans.filter((p) => p.crop === c).reduce((a, p) => a + p.area_dec, 0) / totalArea) * 100) })).filter((x) => x.pct > 0).sort((a, b) => b.pct - a.pct);

  const allEsc = s.escalations.filter((e) => uao || e.union === union.id);

  const snap = {
    v: 1,
    prov: { climate: clim.prov.status === 'REAL' ? 'REAL' : 'PLACEHOLDER', soil: soilData.provenance.status === 'REAL' ? 'REAL' : 'DEMO' },
    todayMs: today,
    officer: { level: role, name: upz.officer, upazila: upz.name, union: { id: union.id, bn: meta.bn, en: meta.en, full: meta.full } },
    crops: crops(),
    area: {
      farmers: union.farmers.length, areaBigha: Math.round(union.area_dec / 33), crops: cropShare,
      open: open.map(mapReq), counts: { open: open.length, urgent: open.filter((r) => r.priority === 'High').length, needInfo: s.requests.filter((r) => r.union === union.id && r.status === 'need_info').length },
      hotspots: hs, glut,
      dry: s.requests.filter((r) => r.union === union.id && r.type === 'water_alert' && r.status === 'open').map((r) => ({ id: r.id, farmer: farmerOf(r.farmerId)?.name })),
      slots: slotLoad(union).map((sl) => ({ id: sl.id, label: both((l) => `${fmtDate(sl.from, l)} – ${fmtDate(sl.to, l)}`), load: Math.round(sl.load), cap: Math.round(sl.cap), full: sl.full })),
      escalations: allEsc.map((e) => ({ id: e.id, union: e.union, kind: e.kind, text: e.text, at: e.at, ack: !!e.ack })),
    },
    upazila: {
      id: upz.id,
      ranking: Object.values(unionsAll).filter((u) => sameUpz(u.id)).map((u) => {
        const g = unionGlut(u, mainCrop);
        const alerts = hotspots.filter((h) => h.members.some((m) => m.union === u.id)).length;
        const op = s.requests.filter((r) => r.union === u.id && r.status === 'open').length;
        return { union: { bn: u.meta.bn, en: u.meta.en }, level: g.risk.level, peak: g.peak, alerts, open: op, score: g.peak + alerts * 2 + op * 0.1 };
      }).sort((a, b) => b.score - a.score),
      advice: { draft: UPAZILA_DEFAULT_ADVICE[upz.id], sent: s.advisories.some((a) => a.upazila === upz.id) },
      allFarmerIds: farmers.filter((f) => sameUpz(f.union)).map((f) => f.id),
    },
    radar: radar ?? null,
  };
  return snap;
}
