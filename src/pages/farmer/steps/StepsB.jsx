import { useEffect, useMemo, useRef, useState } from 'react';
import { clockText } from '../../../engine/forecast';
// Season planner steps 5–7: the recommendation, the next crop, and the price-drop (glut) check.
import { Info, Droplet, CheckCircle2, CalendarDays, Wheat, ShieldCheck, Coins, CloudSun, MapPin, Layers, FlaskConical, Pencil, Sprout, Telescope } from 'lucide-react';
import { useStore } from '../../../store';
import { StepHeader, Card, Tag, Tags, WhyButton, Note, ScoreRing, MiniBar, LABEL_STYLE, RISK_STYLE, climateTag, soilTag, climateSource, soilSource, Button, Segmented } from '../../../components/ui';
import SupplyChart from '../../../components/charts/SupplyChart';
import SeasonRibbon from '../../../components/charts/SeasonRibbon';
import CropPhoto from '../../../components/CropPhoto';
import HowMade from '../../../components/explain/HowMade';
import SeasonCompare from '../../../components/explain/SeasonCompare';
import ActCard from '../../../components/explain/ActCard';
import { W_LABEL } from './StepsA.jsx';
import { cropName, DECIMAL_HA, IRRIGATION, BORO_HEAT_SENSITIVITIES } from '../../../engine/crops.js';
import { fertilizerPlan, phWord, TEXTURE } from '../../../engine/soil.js';
import { PRIORITIES, decide } from '../../../engine/decision.js';
import BoroSensitivity from '../../../components/future/BoroSensitivity.jsx';
import { WHAT_IFS, parseWhatIf } from '../../../engine/climate.js';
import { AMAN_PREP } from '../../../engine/rotation.js';
import { bnOf } from '../../../engine/text.js';
import { num, fmtDate, fmtRange, fmtBangla, bnDigits, MONTHS_BN, MONTHS_EN } from '../../../engine/dates.js';
import { supplyCurve, normalWeekly, PRICE_DIP, slotLoad, slotOf, weekOf, weekStart, midYield, harvestPriceHistory, STORABLE } from '../../../engine/glut.js';
import MARKET from '../../../data/market/market_dhaka.json';

export const shiftLabel = (shift, T) => (shift === 0 ? T('স্বাভাবিক সময়ে', 'at the usual time') : shift < 0 ? T('দুই সপ্তাহ আগে', 'two weeks earlier') : T('দুই সপ্তাহ পরে', 'two weeks later'));
const WATER_DROPS = { High: 3, Medium: 2, 'Low-Medium': 1.5, Low: 1 };
const WATER_WORD = { High: { bn: 'বেশি', en: 'High' }, Medium: { bn: 'মাঝারি', en: 'Medium' }, 'Low-Medium': { bn: 'কম-মাঝারি', en: 'Low to medium' }, Low: { bn: 'কম', en: 'Low' } };
function WaterNeed({ level }) {
  const { L } = useStore();
  const n = WATER_DROPS[level];
  return (
    <span className="inline-flex items-center gap-1" title={L(WATER_WORD[level])}>
      {[0, 1, 2].map((i) => <Droplet key={i} size={14} className={i < Math.floor(n) ? 'fill-sky-500 text-sky-500' : i < n ? 'fill-sky-200 text-sky-400' : 'text-black/15'} />)}
      <span className="ml-0.5">{L(WATER_WORD[level])}</span>
    </span>
  );
}

export function optionWhy(o, d, ctx) {
  const { T, L, s } = ctx;
  const lang = s.lang;
  const rules = o.crop.rules.map((r) => {
    const bad = o.bt.seasons.filter((x) => x.fired.includes(r.id)).map((x) => x.season);
    return `${L(r)}। ${bad.length ? T(`এমন হয়েছিল ${bnDigits(bad.join(', '))} সালে।`, `This happened in ${bad.join(', ')}.`) : T('গত ২৫ মৌসুমে একবারও হয়নি।', 'It did not happen once in 25 seasons.')}`;
  });
  return {
    title: `${L(o.crop.name)}, ${shiftLabel(o.shift, T)} (${fmtDate(o.t0, lang)})`,
    tags: [climateTag(), soilTag(), 'RULE', 'DEMO'],
    blocks: [
      { h: T('নম্বর কীভাবে এল', 'How the score adds up'), table: {
        totalRow: true,
        head: [T('বিষয়', 'Factor'), T('নম্বর (১০০-র মধ্যে)', 'Score (of 100)'), T('ওজন', 'Weight'), T('যোগ হলো', 'Adds')],
        rows: [...Object.entries(d.weights).filter(([, w]) => w > 0).map(([k, w]) => [L(W_LABEL[k]), num(o.comp[k], lang), `${num(w * 100, lang)}%`, num(w * o.comp[k], lang, { dp: 1 })]),
          [T('মোট', 'Total'), '', '', num(o.score, lang, { dp: 1 })]],
      } },
      { h: T('গত ২৫ মৌসুমে এই ফসল এই সময়ে লাগালে কী হতো', 'What would have happened in the last 25 seasons'), lines: [
        T(`ঠিকঠাক গেছে: ২০০১–২০১২-এ ${bnDigits(o.bt.then.n)}টির মধ্যে ${bnDigits(o.bt.then.safe)}টি, ২০১৩–২০২৫-এ ${bnDigits(o.bt.now.n)}টির মধ্যে ${bnDigits(o.bt.now.safe)}টি মৌসুম।`, `Went fine: ${o.bt.then.safe} of ${o.bt.then.n} seasons in 2001–2012, ${o.bt.now.safe} of ${o.bt.now.n} in 2013–2025.`),
        ...rules] },
      { h: T('মাটি', 'Soil'), lines: o.soilNotes.map(L) },
      { h: T('আর যা ধরা হয়েছে', 'Also counted'), lines: [
        ...(o.water ? [T(`পানি লাগবে প্রায় ${num(o.water.mm, 'bn')} মিমি (বিঘায় ${num(o.water.m3PerBigha, 'bn')} ঘনমিটার), এই এলাকার ১৩ মৌসুমের আবহাওয়া আর FAO-র ফসল-সহগ ধরে; আপনার সেচের উৎস মিলিয়ে পানির নম্বর ${bnDigits(Math.round(o.comp.W))}।`, `Needs about ${o.water.mm} mm of water (${o.water.m3PerBigha} m³ per bigha), from 13 seasons of local weather and FAO crop coefficients; with your water source that scores ${Math.round(o.comp.W)}.`)] : []),
        ...(o.money ? [T(`বিঘায় লাভ প্রায় ৳${num(o.money.net, 'bn')}: ফলন ${num(o.money.kg, 'bn')} কেজি (FAOSTAT, দেশের গড়) × (দাম ৳${num(o.money.priceKg, 'bn', { dp: 2 })} − সব খরচ ৳${num(o.money.costKg, 'bn', { dp: 2 })} প্রতি কেজি)। দাম: ${o.money.price.what.bn}${o.money.price.year ? `, ${bnDigits(o.money.price.year)}` : ''}; খরচ: ${o.money.costSrc.what.bn}।`, `Profit about ৳${num(o.money.net, 'en')} a bigha: yield ${o.money.kg} kg (FAOSTAT, national average) × (price ৳${o.money.priceKg} − full cost ৳${o.money.costKg} a kg). Price: ${o.money.price.what.en}${o.money.price.year ? `, ${o.money.price.year}` : ''}; cost: ${o.money.costSrc.what.en}.`)] : []),
        T(`ইউনিয়নে দাম পড়ার ঝুঁকি: ${RISK_STYLE[o.glut.level].bn}।`, `Price-drop risk in your union: ${o.glut.level.toLowerCase()}.`),
        T(`ফসল তোলা আনুমানিক ${fmtRange(o.hw.start, o.hw.end, 'bn')}।`, `Harvest roughly ${fmtRange(o.hw.start, o.hw.end, 'en')}.`)] },
      { h: T('মনে রাখবেন', 'Keep in mind'), lines: [T('এটা সিদ্ধান্ত নিতে সাহায্যের হিসাব, কোনো নিশ্চয়তা নয়। ফসলের সীমাগুলো কৃষিবিদ দিয়ে যাচাই করে নিতে হবে।', 'This helps you decide; it is not a guarantee. The crop thresholds still need an agronomist to check them.')] },
    ],
    sources: [climateSource(lang), soilSource(lang), ...(o.money ? [T(`দাম: ${o.money.price.what.bn} (${bnDigits(o.money.price.year)}); খরচ: ${o.money.costSrc.what.bn} (${bnDigits(o.money.costSrc.year)}); ফলন: FAOSTAT ${bnDigits(o.money.faoYear)}, দেশের গড়`, `Price: ${o.money.price.what.en} (${o.money.price.year}); cost: ${o.money.costSrc.what.en} (${o.money.costSrc.year}); yield: FAOSTAT ${o.money.faoYear}, national average`)] : []),
      T('পাশের কৃষকদের পরিকল্পনা (দাম পড়ার ঝুঁকি): নমুনা তথ্য', 'Neighbours’ plans (price-drop risk): sample data')],
  };
}

// Evidence rows: the value, what it means here, where it comes from, and how sure it is.
function BasisGrid({ rows }) {
  return (
    <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.k} className="flex min-w-0 gap-3 rounded-xl border border-border/70 p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><r.icon size={16} /></span>
          <div className="min-w-0 flex-1">
            <dt className="flex flex-wrap items-center justify-between gap-1.5 text-[12.5px] font-semibold text-muted">{r.k}<Tag t={r.tag} /></dt>
            <dd className="mt-0.5 text-[14.5px] font-semibold leading-6 text-ink">{r.v}</dd>
            {r.sub && <dd className="text-[13px] leading-5 text-ink/75">{r.sub}</dd>}
            <dd className="mt-1 text-[12px] leading-5 text-muted">{r.src}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// What the advice was worked out from, for this field, each with where it comes from and how sure it is.
function FieldBasis({ rec }) {
  const { s, T, L, dispatch, farmer, soil, union, upazila, srdiUnion, activeParcel, clim } = useStore();
  const lang = s.lang;
  const bigha = farmer.area_dec / 33;
  const bad = rec.bt.seasons.filter((x) => x.safe === false).map((x) => x.season);
  const total = rec.bt.then.n + rec.bt.now.n, safe = rec.bt.then.safe + rec.bt.now.safe;
  const station = clim.prov.corrected?.station;
  const ph = phWord(soil.ph);
  const fp = fertilizerPlan(srdiUnion, rec.crop.id, { land: soil.tested?.land, areaDec: farmer.area_dec, landform: soil.landform });
  const fert = fp && !fp.none ? fp.items.filter((i) => i.kg > 0).slice(0, 3) : [];
  const m = rec.money;
  const rows = [
    { icon: MapPin, k: T('জমি', 'Field'), tag: 'DEMO',
      v: T(`${num(farmer.area_dec, 'bn')} শতক (${num(bigha, 'bn', { dp: 1 })} বিঘা), ${L(union.meta)} ইউনিয়ন`, `${farmer.area_dec} decimal (${num(bigha, 'en', { dp: 1 })} bigha), ${L(union.meta)} union`),
      sub: T(`গত রবিতে ${cropName(farmer.last_crop, 'bn')}; সেচ ${L(IRRIGATION[farmer.irrigation])}`, `Last Rabi ${cropName(farmer.last_crop, 'en').toLowerCase()}; water from ${L(IRRIGATION[farmer.irrigation]).toLowerCase()}`),
      src: activeParcel && !activeParcel.pending && activeParcel.verified
        ? T(`উপজেলা কৃষি অফিসের নিবন্ধন, যাচাই ${fmtDate(Date.parse(activeParcel.verified), 'bn')}`, `Upazila agriculture office registry, checked ${fmtDate(Date.parse(activeParcel.verified), 'en')}`)
        : T('আপনার দেওয়া তথ্য; কৃষি অফিসের যাচাই বাকি', 'From you; the agriculture office has not checked it yet') },
    soil.ph != null && { icon: Layers, k: T('মাটি', 'Soil'), tag: soil.tested ? 'RECORD' : 'MODEL',
      v: T(`pH ${num(soil.ph, 'bn', { dp: 1 })} (${ph.bn})${TEXTURE[soil.texture] ? `, ${TEXTURE[soil.texture].bn}` : ''}`, `pH ${num(soil.ph, 'en', { dp: 1 })} (${ph.en})${TEXTURE[soil.texture] ? `, ${TEXTURE[soil.texture].en.toLowerCase()}` : ''}`),
      sub: rec.soilNotes.slice(1).map(L).join('। ') || L(rec.soilNotes[0]),
      src: soil.tested ? T(`আপনার মাটি পরীক্ষা (${soil.tested.date}${soil.tested.lab ? `, ${soil.tested.lab}` : ''}): pH আর জৈব পদার্থ মাপা`, `Your soil test (${soil.tested.date}${soil.tested.lab ? `, ${soil.tested.lab}` : ''}): measured pH and organic matter`) : soil.scope === 'field'
        ? T('ISRIC SoilGrids, আপনার জমির ২৫০ মিটারের ঘর। উপগ্রহ-মডেলের হিসাব, মাটি পরীক্ষা নয়।', 'ISRIC SoilGrids, your field’s 250 m cell. A model estimate, not a soil test.')
        : T('ISRIC SoilGrids, ইউনিয়নের মাঝখান। আপনার জমির নিজের মাপ নয়।', 'ISRIC SoilGrids at the union centre, not your own field.') },
    { icon: CloudSun, k: T('আবহাওয়া', 'Weather'), tag: clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER',
      v: T(`${bnDigits(total)} মৌসুমের ${bnDigits(safe)}টিতে এই তারিখে ঠিকঠাক`, `Fine on this date in ${safe} of ${total} seasons`),
      sub: bad.length ? T(`খারাপ গেছে: ${bnDigits(bad.join(', '))}`, `Went badly: ${bad.join(', ')}`) : T(`${bnDigits(total)} মৌসুমে একবারও খারাপ যায়নি`, `Not one bad season in ${total}`),
      src: T(`নাসা POWER, ${L(upazila.name)}, প্রতিদিনের মাপ ২০০১–২০২৫${station ? `; তাপমাত্রা ${station.bn}-এর গড়ে মেলানো` : ''}`, `NASA POWER, ${L(upazila.name)}, daily 2001–2025${station ? `; temperature matched to ${station.en}` : ''}`) },
    rec.water && { icon: Droplet, k: T('সেচের পানি', 'Irrigation water'), tag: 'RULE',
      v: T(`আপনার জমিতে মোট প্রায় ${num(rec.water.m3PerBigha * bigha, 'bn')} ঘনমিটার`, `About ${num(rec.water.m3PerBigha * bigha, 'en')} m³ for your field`),
      sub: T(`ফসলে ${num(rec.water.mm, 'bn')} মিমি লাগে; আসবে ${L(IRRIGATION[farmer.irrigation])} থেকে`, `The crop needs ${rec.water.mm} mm; from your ${L(IRRIGATION[farmer.irrigation]).toLowerCase()}`),
      src: T('এই এলাকার আবহাওয়া আর FAO-র ফসল-সহগ দিয়ে হিসাব', 'Worked out from local weather and FAO crop coefficients') },
    fert.length > 0 && { icon: FlaskConical, k: T('সার, আপনার জমির মাপে', 'Fertiliser for your field'), tag: 'RECORD',
      v: fert.map((i) => `${i.fertilizer.replace(/\s*\(.*\)/, '')} ${num(i.kg, lang)} ${T('কেজি', 'kg')}`).join(', '),
      sub: fp.cost ? T(`সরকারি দামে প্রায় ৳${num(fp.cost, 'bn')}`, `About ৳${num(fp.cost, 'en')} at the official price`) : null,
      src: T(`মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI), ${L(union.meta)} ইউনিয়নের মাটি পরীক্ষা থেকে`, `SRDI, from ${L(union.meta)} union’s soil tests`) },
    m && { icon: Coins, k: T('দাম, খরচ, ফলন', 'Price, cost, yield'), tag: 'RECORD',
      v: T(`কেজি ৳${num(m.priceKg, 'bn', { dp: 2 })} দাম, ৳${num(m.costKg, 'bn', { dp: 2 })} খরচ`, `৳${m.priceKg} a kg price, ৳${m.costKg} cost`),
      sub: T(`আপনার জমিতে ফলন প্রায় ${num(m.kg * bigha, 'bn')} কেজি (দেশের গড় ফলন ধরে)`, `About ${num(m.kg * bigha, 'en')} kg from your field (at the national average yield)`),
      src: T(`${m.price.what.bn} (${bnDigits(m.price.year)}); ${m.costSrc.what.bn} (${bnDigits(m.costSrc.year)}); FAOSTAT ${bnDigits(m.faoYear)}`, `${m.price.what.en} (${m.price.year}); ${m.costSrc.what.en} (${m.costSrc.year}); FAOSTAT ${m.faoYear}`) },
  ].filter(Boolean);
  return (
    <Card className="mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold text-ink">{T('এই পরামর্শ আপনার জমির যে তথ্য ধরে', 'What this advice is built on')}</h3>
          <p className="text-[13.5px] leading-6 text-muted">{T('প্রতিটি সংখ্যার উৎস দেওয়া আছে। যেটা আপনার জমির নিজের মাপ নয়, সেটাও বলা আছে।', 'Every number has its source. Where it is not measured on your own field, it says so.')}</p>
        </div>
        <Button variant="ghost" className="!px-2.5 !py-1.5 text-[13.5px]" onClick={() => dispatch({ type: 'set', patch: { step: 0 } })}><Pencil size={14} />{T('জমির তথ্য ঠিক করুন', 'Fix field details')}</Button>
      </div>
      <BasisGrid rows={rows} />
    </Card>
  );
}

// ---------- 5. Keep / Adjust / Shift ----------
export function StepDecision() {
  const ctx = useStore();
  const { s, dispatch, T, L, decision: d, decisionArgs, decisionBase, chosen, farmer } = ctx;
  const lang = s.lang;
  const st = LABEL_STYLE[d.label];
  const rec = d.rec;
  const heatSensitivity = useMemo(() => {
    const summarize = (id, label, result, baseline = false) => ({
      id, label, baseline,
      ranks: result.options.slice(0, 3).map((item) => ({ id: item.crop.id, name: L(item.crop.name), score: item.score })),
    });
    return [
      summarize('current', T('বর্তমান সীমা: ৩৫° · ৩ দিন', 'Current rule: 35 °C · 3 days'), decisionBase, true),
      ...BORO_HEAT_SENSITIVITIES.map((variant) => summarize(variant.id, L(variant), decide({ ...decisionArgs, boroHeat: variant }))),
    ];
  }, [decisionArgs, decisionBase, L, T]);
  const when = T(`${fmtBangla(rec.t0, 'bn')} (${fmtDate(rec.t0, 'bn')})`, `${fmtDate(rec.t0, 'en')} (${fmtBangla(rec.t0, 'en')})`);
  const sentence = d.label === 'SHIFT'
    ? T(`এবার ${cropName(farmer.last_crop, 'bn')} না করে ${rec.crop.name.bn} করুন। ${rec.crop.action.bn} ${when}।`, `Grow ${rec.crop.name.en.toLowerCase()} instead of ${cropName(farmer.last_crop, 'en').toLowerCase()}. ${rec.crop.action.en} around ${when}.`)
    : d.label === 'ADJUST'
      ? T(`${rec.crop.name.bn}ই করুন, তবে ${shiftLabel(rec.shift, T)}। ${rec.crop.action.bn} ${when}।`, `Stay with ${rec.crop.name.en.toLowerCase()} but plant ${shiftLabel(rec.shift, T)}, around ${when}.`)
      : T(`${rec.crop.name.bn}ই স্বাভাবিক সময়ে করুন। ${rec.crop.action.bn} ${when}।`, `Stay with ${rec.crop.name.en.toLowerCase()} at the usual time, around ${when}.`);
  // Everything below is worked out for this farmer's own field: its size, last crop, water source and soil.
  const bigha = farmer.area_dec / 33;
  const fieldName = ctx.activeParcel ? L(ctx.activeParcel.name) : T('আপনার জমি', 'Your field');
  const village = lang === 'bn' ? farmer.villageBn : farmer.village;
  const net = rec.money ? rec.money.net * bigha : null;
  // The four things a farmer acts on, pulled out of the sentence so they can be read at a glance.
  const facts = [
    { icon: CalendarDays, k: L(rec.crop.action), v: fmtDate(rec.t0, lang), sub: fmtBangla(rec.t0, lang) },
    { icon: Wheat, k: T('ফসল তোলা', 'Harvest'), v: fmtRange(rec.hw.start, rec.hw.end, lang) },
    { icon: ShieldCheck, k: T('ঠিকঠাক মৌসুম', 'Good seasons'), v: T(`${bnDigits(rec.bt.now.n)}টির মধ্যে ${bnDigits(rec.bt.now.safe)}টি`, `${rec.bt.now.safe} of ${rec.bt.now.n}`), sub: T('২০১৩–২০২৫, এই এলাকায়', '2013–2025, in this area') },
    rec.money && { icon: Coins, k: net < 0 ? T('আপনার জমিতে লোকসান', 'Loss on your field') : T('আপনার জমিতে লাভ', 'Profit on your field'), v: `৳${num(Math.abs(net) / 1000, lang, { dp: 1 })} ${T('হাজার', 'k')}`,
      sub: T(`${num(bigha, 'bn', { dp: 1 })} বিঘায়; বিঘায় ৳${num(rec.money.net / 1000, 'bn', { dp: 1 })} হাজার`, `on ${num(bigha, 'en', { dp: 1 })} bigha; ৳${num(rec.money.net / 1000, 'en', { dp: 1 })}k a bigha`) },
  ].filter(Boolean);
  const prio = s.priorities.length ? T(`আপনার চাওয়া: ${s.priorities.map((p) => PRIORITIES[p].bn).join(' আর ')}।`, `What you want: ${s.priorities.map((p) => PRIORITIES[p].en.toLowerCase()).join(' and ')}.`) : T('কোনো চাওয়া বাছা হয়নি, তাই সব দিক সমান ধরে হিসাব।', 'No priorities picked, so every factor counts equally.');
  return (
    <div>
      <StepHeader kicker={T('ধাপ ৫, পরামর্শ', 'Step 5, recommendation')} title={T('এই রবিতে কী করবেন', 'What to do this Rabi')}
        sub={T(`শুধু আপনার জমির জন্য: ${fieldName}, ${village}, ${num(farmer.area_dec, 'bn')} শতক। ${prio}`, `For your field only: ${fieldName}, ${village}, ${farmer.area_dec} decimal. ${prio}`)}
        tags={[ctx.clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER', 'RECORD', 'RULE']} />
      {/* The farmer's own pick (from the list below, or the first year of Field Future's ten-year rotation) when it is not
          this season's recommendation: both stay visible, and one tap goes back to the recommendation. */}
      {(chosen.crop.id !== rec.crop.id || chosen.shift !== rec.shift) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50/70 px-4 py-3">
          <p className="text-[14.5px] leading-6"><CheckCircle2 size={16} className="mr-1.5 inline text-primary-700" />{T(`আপনার বাছাই: ${chosen.crop.name.bn}, ${L(chosen.crop.action)} ${fmtDate(chosen.t0, 'bn')}। নিচের পরামর্শ শুধু এই এক মৌসুমের হিসাবে; দুটোই নিচের তালিকায় পাশাপাশি আছে।`, `Your choice: ${chosen.crop.name.en.toLowerCase()}, ${L(chosen.crop.action).toLowerCase()} ${fmtDate(chosen.t0, 'en')}. The advice below weighs this one season only; both are side by side in the list.`)}</p>
          <button type="button" onClick={() => dispatch({ type: 'set', patch: { pick: null } })} className="rounded-lg px-3 py-1.5 text-[13.5px] font-semibold text-primary-800 hover:bg-primary-100">{T('পরামর্শটাই নিন', 'Take the advice')}</button>
        </div>
      )}
      <div key={s.whatIf} className={`swap-in rounded-[20px] ${st.bg} p-5 text-white shadow-[var(--shadow-card)] sm:p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[14px] text-white/80"><MapPin size={15} className="shrink-0" />{T(`আপনার জমির জন্য পরামর্শ · ${fieldName}`, `Advice for your field · ${fieldName}`)}</div>
            <div className="font-display mt-1 text-[32px] font-bold leading-[1.1] sm:text-[38px]">{L(st)}</div>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <div className="rounded-full bg-white p-1"><ScoreRing value={rec.score} size={60} /></div>
            <div className="mt-1 text-[11.5px] text-white/75">{T('১০০-এর মধ্যে', 'out of 100')}</div>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-[17px] font-medium leading-7">{sentence}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.k} className="min-w-0 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
              <dt className="flex items-center gap-1.5 text-[12.5px] text-white/75"><f.icon size={14} className="shrink-0" />{f.k}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold leading-snug tabular">{f.v}</dd>
              {f.sub && <dd className="text-[12px] text-white/65">{f.sub}</dd>}
            </div>
          ))}
        </dl>
        {d.caution && <p className="mt-3 rounded-xl bg-black/15 px-3 py-2 text-[14px] text-white/90">{T('সাবধান: কোনো ফসলের নম্বরই খুব ভালো নয়। সিদ্ধান্তের আগে কৃষি কর্মকর্তার সঙ্গে কথা বলুন।', 'Careful: no option scores well. Talk to your agriculture officer before deciding.')}</p>}
        <div className="mt-4"><WhyButton inverse payload={optionWhy(rec, d, ctx)} /></div>
      </div>
      <SeasonCompare />
      <BoroSensitivity rows={heatSensitivity} />
      <ActCard />
      <HowMade />
      <FieldBasis rec={rec} />
      <WhatIfBar />
      <h3 className="mt-6 text-[18px] font-bold">{T('সব ফসল পাশাপাশি', 'All the options side by side')}</h3>
      <p className="text-[14px] text-muted">{T('প্রতিটি ফসল তিনটি তারিখে (দুই সপ্তাহ আগে, স্বাভাবিক সময়, দুই সপ্তাহ পরে) যাচাই করা হয়েছে; এখানে প্রত্যেকটির সবচেয়ে ভালো তারিখ দেখানো হলো।', 'Each crop was checked at three dates (two weeks earlier, usual, two weeks later); its best date is shown here.')}</p>
      <div className="mt-3 space-y-2.5">
        {d.options.map((o) => {
          const isRec = o.crop.id === rec.crop.id && o.shift === rec.shift;
          const isChosen = o.crop.id === chosen.crop.id && o.shift === chosen.shift;
          const isCur = o.crop.id === farmer.last_crop;
          return (
            <Card key={o.crop.id} className={`spotlight-card lift p-4 transition-all duration-300 hover:-translate-y-0.5 ${isChosen ? 'ring-2 ring-primary-600 shadow-md' : 'hover:border-primary-300'}`}>
              <div className="flex items-start gap-3">
                <ScoreRing value={o.score} size={50} color={isRec ? '#2f6e2f' : '#8a9a8f'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display text-[19px] font-bold">{L(o.crop.name)}</span>
                    {isCur && <span className="chip bg-black/5 text-ink/70">{T('গতবারের ফসল', 'your last crop')}</span>}
                    {isRec && <span className="chip bg-primary-700 text-white">{T('পরামর্শ', 'recommended')}</span>}
                  </div>
                  <div className="text-[13.5px] text-muted">{L(o.crop.action)} {fmtDate(o.t0, lang)}, {shiftLabel(o.shift, T)}</div>
                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[13.5px] sm:grid-cols-2">
                    <div className="flex gap-1.5"><dt className="text-muted">{T('ঠিকঠাক মৌসুম', 'Good seasons')}</dt><dd className="font-semibold tabular">{T(`${bnDigits(o.bt.now.n)}টির মধ্যে ${bnDigits(o.bt.now.safe)}টি`, `${o.bt.now.safe} of ${o.bt.now.n}`)} <span className="font-normal text-muted">{T(`(আগে ${bnDigits(o.bt.then.safe)}/${bnDigits(o.bt.then.n)})`, `(was ${o.bt.then.safe}/${o.bt.then.n})`)}</span></dd></div>
                    <div className="flex gap-1.5"><dt className="text-muted">{T('সেচ', 'Water')}</dt><dd><WaterNeed level={o.crop.water} /></dd></div>
                    <div className="flex gap-1.5"><dt className="text-muted">{T('লাভ/বিঘা', 'Profit/bigha')}</dt><dd className="font-semibold tabular">{o.money ? `৳${num(o.money.net / 1000, lang, { dp: 1 })} ${T('হাজার', 'k')}` : '–'}</dd></div>
                    <div className="flex gap-1.5"><dt className="text-muted">{T('দাম পড়ার ঝুঁকি', 'Price-drop risk')}</dt><dd><span className={`chip ${RISK_STYLE[o.glut.level].cls}`}>{L(RISK_STYLE[o.glut.level])}</span></dd></div>
                  </dl>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <WhyButton small payload={optionWhy(o, d, ctx)} />
                <button type="button" onClick={() => dispatch({ type: 'set', patch: { pick: { crop: o.crop.id, shift: o.shift } } })} aria-pressed={isChosen}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[14px] font-semibold transition-all duration-200 active:scale-95 ${isChosen ? 'bg-primary-700 text-white shadow-sm' : 'bg-primary-50 text-primary-800 hover:bg-primary-100 hover:scale-[1.02]'}`}>
                  {isChosen ? <><CheckCircle2 size={15} />{T('এটা বেছে নিয়েছেন', 'Your choice')}</> : T('এটা বেছে নিন', 'Choose this')}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-muted">{T('লাভ = দেশের গড় ফলন (FAOSTAT) × (সরকারি বা বাজারের দাম − সব খরচ), প্রতিটি উৎসের বছরসহ। দাম পড়ার ঝুঁকি পাশের কৃষকদের নমুনা পরিকল্পনা থেকে।', 'Profit = national average yield (FAOSTAT) × (official or market price − full cost), each source with its year. Price-drop risk uses sample plans for the neighbours.')} <Tags list={['RECORD', 'DEMO']} /></p>
    </div>
  );
}

// ---------- 6. Next crop ----------
const DRAIN_WORD = { poor: { bn: 'পানি নামে না', en: 'drains badly' }, imperfect: { bn: 'পানি ধীরে নামে', en: 'drains slowly' }, good: { bn: 'পানি ভালো নামে', en: 'drains well' } };

// Why a crop cannot go in between this Rabi crop and the Aman, in one line.
function closedLine(o, r, T, L) {
  return o.reason === 'window'
    ? T(`${o.crop.name.bn}: বোনার শেষ সময় ${fmtDate(o.close, 'bn')}, জমি খালি হবে তার পরে`, `${o.crop.name.en}: sowing closes ${fmtDate(o.close, 'en')}, before the land is free`)
    : T(`${o.crop.name.bn}: তুলতে তুলতে ${fmtDate(o.endT, 'bn')}, আমনের জমি তৈরির (${fmtDate(r.clearBy, 'bn')}) পরে`, `${o.crop.name.en}: picked by ${fmtDate(o.endT, 'en')}, after the Aman land must be ready (${fmtDate(r.clearBy, 'en')})`);
}

function rotationWhy(o, r, ctx) {
  const { s, T, L, chosen, upazila, clim } = ctx;
  const lang = s.lang;
  const yrs = (ys) => (lang === 'bn' ? bnDigits(ys.join(', ')) : ys.join(', '));
  const comp = [['soil', T('মাটি: উপকার আর মানানসই', 'Soil: benefit and fit')], ['family', T('আলাদা গোত্রের ফসল', 'Different crop family')], ['water', T('সেচের পানি', 'Water')], ['climate', T('আবহাওয়া (২০১৩–২০২৫)', 'Weather (2013–2025)')], ['window', T('সময়ে কুলোয় কিনা', 'Fits the gap')]];
  return {
    title: T(`পরের ফসল: ${o.crop.name.bn}`, `Next crop: ${o.crop.name.en}`), tags: [clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER', soilTag(), 'RULE'],
    blocks: [
      { h: T('নম্বর কীভাবে এল', 'How the score adds up'), table: { totalRow: true, head: [T('বিষয়', 'Factor'), T('নম্বর', 'Score'), T('ওজন', 'Weight'), T('যোগ হলো', 'Adds')], rows: [
        ...comp.map(([k, label]) => [label, num(o.comp[k], lang), `${num(r.weights[k] * 100, lang)}%`, num(r.weights[k] * o.comp[k], lang, { dp: 1 })]),
        [T('মোট', 'Total'), '', '', num(o.score, lang, { dp: 1 })]] } },
      { h: T('সময়ের হিসাব', 'Timing'), lines: [
        T(`${chosen.crop.name.bn} তোলা শেষ ${fmtDate(chosen.hw.end, 'bn')}; এক সপ্তাহ জমি তৈরি করে ${fmtDate(r.readyT, 'bn')} থেকে জমি খালি।`, `${chosen.crop.name.en} is picked by ${fmtDate(chosen.hw.end, 'en')}; after a week to clear the land it is free from ${fmtDate(r.readyT, 'en')}.`),
        T(`${o.crop.name.bn} বোনার সুপারিশ করা সময় ${fmtDate(o.open, 'bn')} থেকে ${fmtDate(o.close, 'bn')}; তাই বোনা ${fmtDate(o.sowT, 'bn')}${o.wait > 0 ? `, জমি ${bnDigits(o.wait)} দিন খালি থাকবে` : ''}।`, `${o.crop.name.en} should be sown between ${fmtDate(o.open, 'en')} and ${fmtDate(o.close, 'en')}, so it goes in on ${fmtDate(o.sowT, 'en')}${o.wait > 0 ? `, leaving the land empty ${o.wait} days` : ''}.`),
        T(`${bnDigits(o.crop.days)} দিনে তোলা শেষ ${fmtDate(o.endT, 'bn')}। ${upazila.name.bnOf} স্বাভাবিক আমন রোপণ ${fmtDate(r.amanT, 'bn')}${r.amanMeasured ? ' (সেন্টিনেল-১ রাডারে মাপা, ২০১৭–২০২৫-এর মধ্যমা)' : ''}; তার ${bnDigits(AMAN_PREP)} দিন আগে জমি খালি চাই।`, `Picked after ${o.crop.days} days, by ${fmtDate(o.endT, 'en')}. Aman usually goes in on ${fmtDate(r.amanT, 'en')} in ${upazila.name.en}${r.amanMeasured ? ' (Sentinel-1 radar, 2017–2025 median)' : ''}; the land must be free ${AMAN_PREP} days before.`)] },
      ...(o.bt ? [{ h: T('গত ২৫ মৌসুমে এই দিনে বুনলে', 'Sown on this day in the last 25 seasons'), lines: [
        T(`ঠিকঠাক গেছে: ২০০১–২০১২-এ ${bnDigits(o.bt.then.n)}টির ${bnDigits(o.bt.then.safe)}টি, ২০১৩–২০২৫-এ ${bnDigits(o.bt.now.n)}টির ${bnDigits(o.bt.now.safe)}টি।`, `Went fine: ${o.bt.then.safe} of ${o.bt.then.n} in 2001–2012, ${o.bt.now.safe} of ${o.bt.now.n} in 2013–2025.`),
        ...o.fired.map((f) => `${L(f.rule)}। ${f.years.length ? T(`এমন হয়েছিল ${yrs(f.years)} সালে।`, `This happened in ${yrs(f.years)}.`) : T('২৫ মৌসুমে একবারও হয়নি।', 'Not once in 25 seasons.')}`)] }] : []),
      { h: T('মাটি', 'Soil'), lines: o.soilNotes.map(L) },
      { h: T('পানি', 'Water'), lines: [o.water
        ? T(`FAO-56 পদ্ধতিতে (ফসল-সহগ × হারগ্রিভস ET₀, কাজে লাগা বৃষ্টি বাদ) ${bnDigits(o.water.seasons)} মৌসুমের মধ্যমা: পুরো ফলনে প্রায় ${num(o.water.mm, 'bn')} মিমি।`, `FAO-56 (crop coefficient × Hargreaves ET₀, less usable rain), median of ${o.water.seasons} seasons: about ${o.water.mm} mm for a full yield.`)
        : T('FAO-56-এ এই ফসলের সহগ নেই, তাই মিলিমিটারে মাপা হয়নি; শুধু ফসলের পানির শ্রেণি ধরা হয়েছে।', 'FAO-56 has no coefficients for this crop, so only its water class is used.')] },
      { h: T('মনে রাখবেন', 'Keep in mind'), lines: [T('বোনার সময় আর ঝুঁকির সীমাগুলো বারি, বিজেআরআই আর ব্রির প্রকাশিত সুপারিশ থেকে শুরুর মান; কৃষিবিদ দিয়ে যাচাই করে নিতে হবে। এই ফসলগুলোর দাম ও ফলনের তথ্য এখনো যোগ হয়নি, তাই লাভ হিসাবে ধরা হয়নি।', 'Sowing windows and risk thresholds are starting values from BARI, BJRI and BRRI guidance and need an agronomist to check them. Prices and yields for these crops are not loaded yet, so profit is not counted.')] },
    ],
    sources: [climateSource(lang), soilSource(lang),
      T('আমন রোপণের দিন: কোপার্নিকাস সেন্টিনেল-১ রাডার (VH), প্রতি উপজেলায় ৩৬টি ফসলি জমি, ২০১৭–২০২৫', 'Aman transplanting day: Copernicus Sentinel-1 radar (VH), 36 cropland points per upazila, 2017–2025'),
      T('পানি: FAO সেচ ও নিষ্কাশন পত্র ৫৬, সারণি ১১–১২', 'Water: FAO Irrigation and Drainage Paper 56, Tables 11–12')],
  };
}

export function StepRotation() {
  const ctx = useStore();
  const { s, T, L, rotation: r, chosen, upazila, soil, clim } = ctx;
  const lang = s.lang;
  const b = r.best;
  const why = b && rotationWhy(b, r, ctx);
  const amanSrc = r.amanMeasured
    ? T(`সেন্টিনেল-১ রাডারে মাপা, ${upazila.name.bnOf} ২০১৭–২০২৫-এর মধ্যমা`, `Sentinel-1 radar, ${upazila.name.en} 2017–2025 median`)
    : T('সাধারণ হিসাব, মাপা নয়', 'A typical date, not measured');
  const facts = b && [
    { icon: CalendarDays, k: T('বোনা', 'Sow'), v: fmtDate(b.sowT, lang), sub: b.wait > 0 ? T(`জমি ${bnDigits(b.wait)} দিন খালি থাকবে`, `land empty ${b.wait} days`) : T('জমি খালি হতেই', 'as soon as the land is free') },
    { icon: Wheat, k: T('তোলা শেষ', 'Picked by'), v: fmtDate(b.endT, lang), sub: T(`${bnDigits(b.crop.days)} দিনের ফসল`, `${b.crop.days}-day crop`) },
    { icon: Sprout, k: T('আমন রোপণ', 'Aman goes in'), v: fmtDate(r.amanT, lang), sub: amanSrc },
    { icon: ShieldCheck, k: T('হাতে সময়', 'Time to spare'), v: T(`${bnDigits(b.spare)} দিন`, `${b.spare} days`), sub: T(`আমনের জমি তৈরির ${bnDigits(AMAN_PREP)} দিন বাদ দিয়ে`, `after ${AMAN_PREP} days to ready the Aman land`) },
  ];
  const all = b ? [...b.bt?.seasons ?? []] : [];
  const bad = all.filter((x) => x.safe === false).map((x) => x.season);
  const rows = b && [
    { icon: CalendarDays, k: T('বোনার সুপারিশ করা সময়', 'Recommended sowing window'), tag: 'RULE', v: `${fmtDate(b.open, lang)} – ${fmtDate(b.close, lang)}`,
      sub: T('এর আগে বা পরে বুনলে ফলন কমে', 'Sown before or after it, yield falls'), src: T('বারি, বিজেআরআই ও ব্রির কৃষি প্রযুক্তি সুপারিশ', 'BARI, BJRI and BRRI crop guidance') },
    { icon: Sprout, k: T('আমনের আগে জমি খালি', 'Off before the Aman'), tag: r.amanMeasured ? 'REAL' : 'RULE', v: T(`আমন রোপণ ${fmtDate(r.amanT, 'bn')}, জমি চাই ${fmtDate(r.clearBy, 'bn')}`, `Aman ${fmtDate(r.amanT, 'en')}, land ready by ${fmtDate(r.clearBy, 'en')}`),
      sub: T(`${L(b.crop.name)} উঠবে ${fmtDate(b.endT, 'bn')}`, `${L(b.crop.name)} is off by ${fmtDate(b.endT, 'en')}`), src: amanSrc },
    b.bt && { icon: CloudSun, k: T('আবহাওয়া, এই দিনে বুনলে', 'Weather, sown on this day'), tag: clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER',
      v: T(`${bnDigits(b.bt.then.n + b.bt.now.n)} মৌসুমের ${bnDigits(b.bt.then.safe + b.bt.now.safe)}টিতে ঠিকঠাক`, `Fine in ${b.bt.then.safe + b.bt.now.safe} of ${b.bt.then.n + b.bt.now.n} seasons`),
      sub: bad.length ? T(`খারাপ গেছে: ${bnDigits(bad.join(', '))}`, `Went badly: ${bad.join(', ')}`) : T('একবারও খারাপ যায়নি', 'Not one bad season'),
      src: T(`নাসা POWER, ${L(upazila.name)}, ২০০১–২০২৫${clim.prov.corrected ? `; তাপমাত্রা ${clim.prov.corrected.station.bn}-এর গড়ে মেলানো` : ''}`, `NASA POWER, ${upazila.name.en}, 2001–2025${clim.prov.corrected ? `; temperature matched to ${clim.prov.corrected.station.en}` : ''}`) },
    { icon: Layers, k: T('আপনার জমির মাটি', 'Your field’s soil'), tag: soilTag(),
      v: T(`pH ${num(soil.ph, 'bn', { dp: 1 })}${DRAIN_WORD[soil.drainage] ? `, ${DRAIN_WORD[soil.drainage].bn}` : ''}`, `pH ${num(soil.ph, 'en', { dp: 1 })}${DRAIN_WORD[soil.drainage] ? `, ${DRAIN_WORD[soil.drainage].en}` : ''}`),
      sub: b.soilNotes.slice(1).map(L).join('। ') || L(b.soilNotes[0]),
      src: soil.tested ? T(`আপনার মাটি পরীক্ষা (${soil.tested.date}${soil.tested.lab ? `, ${soil.tested.lab}` : ''}): pH আর জৈব পদার্থ মাপা`, `Your soil test (${soil.tested.date}${soil.tested.lab ? `, ${soil.tested.lab}` : ''}): measured pH and organic matter`) : soil.scope === 'field' ? T('ISRIC SoilGrids, আপনার জমির ২৫০ মিটারের ঘর; মডেলের হিসাব, মাটি পরীক্ষা নয়', 'ISRIC SoilGrids, your field’s 250 m cell; a model estimate, not a soil test') : T('ISRIC SoilGrids, ইউনিয়নের মাঝখান', 'ISRIC SoilGrids, union centre') },
    { icon: Droplet, k: T('পানি', 'Water'), tag: 'RULE',
      v: b.water ? T(`পুরো ফলনে প্রায় ${num(b.water.mm, 'bn')} মিমি`, `About ${b.water.mm} mm for a full yield`) : T('মিলিমিটারে মাপা হয়নি', 'Not estimated in mm'),
      sub: b.water ? T(`বিঘায় ${num(b.water.m3PerBigha, 'bn')} ঘনমিটার, বৃষ্টি বাদ দিয়ে`, `${b.water.m3PerBigha} m³ a bigha, after rain`) : T('FAO-56-এ এই ফসলের সহগ নেই', 'FAO-56 has no coefficients for this crop'),
      src: T('FAO-56: ফসল-সহগ × হারগ্রিভস ET₀, এই এলাকার আবহাওয়ায়', 'FAO-56: crop coefficient × Hargreaves ET₀ on local weather') },
  ].filter(Boolean);
  return (
    <div>
      <StepHeader kicker={T('ধাপ ৬, পরের মৌসুম', 'Step 6, next season')} title={T('এই ফসলের পর কী লাগাবেন', 'What to grow after this crop')}
        sub={T(`${chosen.crop.name.bn} তোলা আর আমন রোপণের মাঝের সময়ে আপনার জমিতে কোন ফসল ধরে, তা মাপা হয়েছে আপনার জমির মাটি, এলাকার ২৫ বছরের আবহাওয়া আর রাডারে মাপা আমনের সময় দিয়ে।`, `Which crop fits your field between the ${chosen.crop.name.en.toLowerCase()} harvest and the Aman, worked out from your soil, 25 years of local weather and the radar-measured Aman date.`)}
        tags={[clim.prov.status === 'REAL' ? 'MODEL' : 'PLACEHOLDER', soilTag(), 'RULE']} />
      <Card className="p-4">
        <div className="mb-2 text-[14px] font-semibold">{T('বাংলা মাসে পুরো বছরের পরিকল্পনা', 'The year, by Bangla month')}</div>
        <SeasonRibbon compact />
      </Card>
      <Card className="mt-4 overflow-hidden">
        <div className="grid sm:grid-cols-[1fr_1.6fr]">
          <div className="relative min-h-[220px]"><CropPhoto crop={b ? b.crop : { id: 'aman', name: { bn: 'রোপা আমন', en: 'T. Aman rice' } }} sizes="300px" /></div>
          <div className="p-5">
            {b ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[14px] text-muted">{T(`${chosen.crop.name.bn} তোলার পর`, `After the ${chosen.crop.name.en.toLowerCase()}`)}</div>
                    <div className="font-display text-[28px] font-bold text-sky-700">{L(b.crop.name)}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center"><ScoreRing value={b.score} size={52} color="#33707b" /><span className="mt-0.5 text-[11px] text-muted">{T('১০০-এর মধ্যে', 'out of 100')}</span></div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {facts.map((f) => (
                    <div key={f.k} className="min-w-0 rounded-xl bg-sky-50/70 px-3 py-2 ring-1 ring-sky-100">
                      <dt className="flex items-center gap-1.5 text-[12.5px] text-muted"><f.icon size={14} className="shrink-0 text-sky-700" />{f.k}</dt>
                      <dd className="text-[15px] font-semibold tabular">{f.v}</dd>
                      <dd className="text-[12px] leading-5 text-muted">{f.sub}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-3 space-y-1.5">{b.why.map((w, i) => <li key={i} className="flex gap-2 text-[14.5px] leading-6"><CheckCircle2 size={16} className="mt-1 shrink-0 text-primary-600" />{L(w)}</li>)}</ul>
                <div className="mt-3"><WhyButton payload={why} /></div>
              </>
            ) : (
              <>
                <div className="font-display text-[24px] font-bold">{T('সরাসরি রোপা আমন', 'Straight to transplanted Aman')}</div>
                <p className="mt-2 text-[15px] leading-7 text-muted">{T(`${chosen.crop.name.bn} তোলা শেষ ${fmtDate(chosen.hw.end, 'bn')}, আর ${upazila.name.bnOf} আমন রোপণ ${fmtDate(r.amanT, 'bn')}। মাঝের এই সময়ে কোনো ফসলের বোনার সময় মেলে না, নয়তো আমনের আগে ওঠে না। মাটির জন্য আগামী রবিতে মসুর বা সরিষা ভেবে দেখুন।`, `The ${chosen.crop.name.en.toLowerCase()} is picked by ${fmtDate(chosen.hw.end, 'en')} and Aman goes in on ${fmtDate(r.amanT, 'en')} in ${upazila.name.en}. No crop's sowing window fits that gap, or it would not be off before the Aman. For the soil, think about lentil or mustard next Rabi.`)}</p>
              </>
            )}
          </div>
        </div>
      </Card>
      {r.alternatives.length > 0 && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {r.alternatives.map((a) => (
            <Card key={a.crop.id} className="flex items-start gap-3 p-4">
              <ScoreRing value={a.score} size={40} color="#8a9a8f" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{T('অথবা', 'Or')} {L(a.crop.name)}</div>
                <div className="text-[13px] text-muted tabular">{T(`বোনা ${fmtDate(a.sowT, 'bn')}, তোলা ${fmtDate(a.endT, 'bn')}`, `Sow ${fmtDate(a.sowT, 'en')}, picked ${fmtDate(a.endT, 'en')}`)}{a.bt ? T(` · ${bnDigits(a.bt.now.n)}টির ${bnDigits(a.bt.now.safe)}টি মৌসুম ঠিকঠাক`, ` · fine in ${a.bt.now.safe} of ${a.bt.now.n} seasons`) : ''}</div>
                <div className="mt-1 text-[13.5px] leading-snug text-ink/80">{L(a.why[0])}</div>
                <div className="mt-2"><WhyButton small payload={rotationWhy(a, r, ctx)} /></div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {r.closed.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-white/70 px-4 py-3 text-[13.5px] leading-6 text-muted">
          <div className="font-semibold text-ink">{T('যে ফসল এই ফাঁকে ধরে না', 'Crops that do not fit this gap')}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{r.closed.map((c) => <li key={c.crop.id}>{closedLine(c, r, T, L)}</li>)}</ul>
        </div>
      )}
      {rows && (
        <Card className="mt-4 p-4 sm:p-5">
          <h3 className="text-[16px] font-bold text-ink">{T('এই হিসাব যে তথ্যে', 'What this is worked out from')}</h3>
          <p className="text-[13.5px] leading-6 text-muted">{T('প্রতিটি সংখ্যার উৎস আর সীমা দেওয়া আছে।', 'Every number with its source and its limits.')}</p>
          <BasisGrid rows={rows} />
        </Card>
      )}
      <Note tone="gold" className="mt-4">{L(r.nextRabiCaution)}</Note>
      <Card className="mt-4 flex flex-col gap-3 bg-gradient-to-br from-primary-50 to-sky-50 p-4 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-700 text-white"><Telescope size={21} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold">{T('এভাবে ১০ বছর চললে জমির কী হবে?', 'What happens to the field after ten years of this?')}</div>
          <p className="text-[13.5px] leading-6 text-muted">{T('মাটির জৈব পদার্থ, সেচের পানি আর আয়, আজকের আর নাসার ২০৪০-এর দশকের আবহাওয়ায়; সঙ্গে আপনার জমির জন্য সেরা ফসলচক্র।', 'Soil organic matter, irrigation and income, in today’s weather and NASA’s 2040s; and the best rotation for your field.')}</p>
        </div>
        <Button to="/farmer/future" className="shrink-0">{T('জমির ভবিষ্যৎ দেখুন', 'See the field’s future')}</Button>
      </Card>
    </div>
  );
}

// ---------- 7. Price-drop check ----------
// Dhaka retail items (DAM weekly) that match a Rabi crop, for "what it sells for in the city this week".
const RETAIL_OF = { boro: 'rice_coarse', wheat: 'atta_loose', lentil: 'lentil_coarse' };

// Whether the shared plan board is live, and how many real plans it holds for this union.
export function BoardStatus({ nReal, nSample }) {
  const { s, T, L, union, shared, refreshShared } = useStore();
  const lang = s.lang;
  const time = shared.at ? clockText(shared.at, lang) : '';
  const live = shared.status === 'live';
  return (
    <div className={`mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border px-4 py-3 text-[13.5px] leading-6 ${live ? 'border-sky-200 bg-sky-50/70 text-sky-950' : 'border-amber-200 bg-amber-50/80 text-amber-950'}`} aria-live="polite">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? 'bg-sky-600' : shared.status === 'connecting' ? 'bg-slate-400' : 'bg-amber-500'}`} />
      </span>
      <span className="min-w-0 flex-1">
        {live
          ? T(`সরাসরি: ${L(union.meta)} ইউনিয়নে এই মৌসুমে ${bnDigits(nReal)} জন কৃষক পরিকল্পনা পাকা করেছেন; সবার নতুন পরিকল্পনা ৩০ সেকেন্ডে যোগ হয়। হালনাগাদ ${time}।`, `Live: ${nReal} farmers in ${L(union.meta)} union have confirmed a plan this season; new plans from everyone are added within 30 seconds. Updated ${time}.`)
          : shared.status === 'connecting'
            ? T('সবার পরিকল্পনা আনা হচ্ছে…', 'Fetching everyone’s plans…')
            : shared.reason === 'unconfigured'
              ? T('সবার পরিকল্পনা মেলানোর সার্ভার এখনো চালু হয়নি। এখন দেখানো হচ্ছে এই ফোনের পরিকল্পনা আর নমুনা প্রতিবেশী।', 'The shared plan server is not switched on yet. Showing this phone’s plans and sample neighbours.')
              : T('সার্ভারে পৌঁছানো যাচ্ছে না (ইন্টারনেট?)। এখন দেখানো হচ্ছে এই ফোনের পরিকল্পনা আর নমুনা প্রতিবেশী।', 'Cannot reach the plan server (internet?). Showing this phone’s plans and sample neighbours.')}
        {nSample > 0 && <span className="text-ink/60">{T(` পাশে ${bnDigits(nSample)}টি নমুনা জমি, আলাদা রঙে।`, ` Plus ${nSample} sample fields, in their own colour.`)}</span>}
      </span>
      {shared.status !== 'connecting' && <button type="button" onClick={refreshShared} className="rounded-full border border-current/20 px-2.5 py-0.5 text-[12.5px] font-semibold hover:bg-white/60">{T('এখনই হালনাগাদ', 'Refresh now')}</button>}
    </div>
  );
}

// What the grower price did in this harvest's own months, every year DAM reported it.
export function PriceHistory({ crop, hw }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const h = harvestPriceHistory(crop.id, hw);
  if (!h) return null;
  const monthName = (m) => (lang === 'bn' ? MONTHS_BN[m] : MONTHS_EN[m]);
  const months = h.harvestMonths.map(monthName).join(T(' ও ', ' and '));
  const pct = (r) => Math.round((r - 1) * 100);
  const max = Math.max(20, ...h.rows.map((r) => Math.abs(pct(r.ratio))));
  const retail = RETAIL_OF[crop.id] && MARKET.items.find((i) => i.key === RETAIL_OF[crop.id]);
  const kind = h.priceType === 'wholesale' ? T('পাইকারি দাম', 'wholesale price') : T('কৃষকের পাওয়া দাম', 'price paid to growers');
  return (
    <Card className="mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold text-ink">{T(`আপনার ফসল তোলার মাসে (${months}) ${bnOf(crop.name.bn)} দাম আসলে কেমন ছিল`, `What the ${crop.name.en.toLowerCase()} price really did in your harvest months (${months})`)}</h3>
          <p className="text-[13.5px] leading-6 text-muted">{T(`প্রতি বছর ${kind}, সে বছরের সাধারণ (মাঝামাঝি) দামের তুলনায়।`, `Each year’s ${kind}, against that year’s usual (median) price.`)}</p>
        </div>
        <Tags list={['RECORD']} />
      </div>
      {h.n > 0 ? (
        <>
          {h.enough && (
            <p className="mt-3 rounded-xl bg-black/[.035] px-3 py-2.5 text-[14.5px] font-semibold leading-6 text-ink">
              {T(`${bnDigits(h.years[0])}–${bnDigits(h.years[1])}-এর ${bnDigits(h.n)} বছরের ${bnDigits(h.below)} বছরে এই মাসে দাম সাধারণের চেয়ে ১০%-এর বেশি কম ছিল। মাঝামাঝি বছরে ${pct(h.medRatio) < 0 ? `${bnDigits(-pct(h.medRatio))}% কম` : pct(h.medRatio) > 0 ? `${bnDigits(pct(h.medRatio))}% বেশি` : 'সমান'}।`,
                `In ${h.below} of ${h.n} years (${h.years[0]}–${h.years[1]}) the price in these months was over 10% below usual. In the middle year it was ${pct(h.medRatio) < 0 ? `${-pct(h.medRatio)}% lower` : pct(h.medRatio) > 0 ? `${pct(h.medRatio)}% higher` : 'level'}.`)}
            </p>
          )}
          <ul className="mt-3 space-y-1" aria-label={T('বছর অনুযায়ী দাম', 'Price by year')}>
            {h.rows.map((r) => {
              const p = pct(r.ratio), w = (Math.abs(p) / max) * 50;
              return (
                <li key={r.year} className="grid grid-cols-[40px_1fr_92px] items-center gap-2 text-[12.5px]" title={T(`${bnDigits(r.year)}: কেজি ৳${num(r.tkKg, 'bn', { dp: 1 })}, সাধারণ ৳${num(r.usualKg, 'bn', { dp: 1 })}`, `${r.year}: ৳${num(r.tkKg, 'en', { dp: 1 })} a kg, usual ৳${num(r.usualKg, 'en', { dp: 1 })}`)}>
                  <span className="tabular text-muted">{lang === 'bn' ? bnDigits(r.year) : r.year}</span>
                  <span className="relative h-3.5 rounded-sm bg-black/[.035]">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-black/25" />
                    <span className={`absolute inset-y-[2px] rounded-[3px] ${p < 0 ? 'bg-clay-500' : 'bg-primary-500'}`} style={p < 0 ? { right: '50%', width: `${w}%` } : { left: '50%', width: `${w}%` }} />
                  </span>
                  <span className="tabular text-ink/80"><b className={p <= -10 ? 'text-clay-700' : 'text-ink'}>{p > 0 ? '+' : ''}{num(p, lang)}%</b> · ৳{num(r.tkKg, lang, { dp: 1 })}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-1.5 grid grid-cols-[40px_1fr_92px] gap-2 text-[11.5px] text-muted"><span /><span className="flex justify-between"><span>← {T('কম দাম', 'lower')}</span><span>{T('সাধারণ', 'usual')}</span><span>{T('বেশি দাম', 'higher')} →</span></span><span>{T('কেজিপ্রতি', 'a kg')}</span></div>
          {!h.enough && <Note tone="gold" className="mt-3">{T(`কৃষি বিপণন অধিদপ্তর এই মাসগুলোর দাম মাত্র ${bnDigits(h.n)} বছর দিয়েছে, তাই ধরনটা নিশ্চিত নয়।`, `DAM reported these months in only ${h.n} years, so the pattern is not certain.`)}</Note>}
        </>
      ) : (
        <Note tone="gold" className="mt-3">{T('কৃষি বিপণন অধিদপ্তর আপনার ফসল তোলার মাসগুলোর দাম প্রকাশ করেনি, তাই এখানে আগের দাম দেখানো যাচ্ছে না।', 'DAM has not published prices for your harvest months, so no past prices can be shown.')}</Note>
      )}
      <div className="mt-3 space-y-2 text-[13.5px] leading-6">
        {h.hold && <p className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-primary-600" />{T(`ধরে রাখতে পারলে: দীর্ঘ মেয়াদের হিসাবে ${monthName(h.hold.month)}-এ দাম সাধারণত ${bnDigits(Math.round(h.hold.gain * 100))}% বেশি থাকে। গুদামের খরচ, ঋণের সুদ আর নষ্ট হওয়া এতে ধরা হয়নি।`, `If you can store it: over the long run the price is usually ${Math.round(h.hold.gain * 100)}% higher in ${monthName(h.hold.month)}. Storage, interest and losses are not counted.`)}</p>}
        {!STORABLE.has(crop.id) && <p className="flex gap-2"><Info size={16} className="mt-1 shrink-0 text-muted" />{T(`${crop.name.bn} বেশি দিন রাখা যায় না, তাই তোলার সপ্তাহের দামই আপনার দাম। এজন্যই ইউনিয়নে ভিড় এড়ানো দরকার।`, `${crop.name.en} does not keep, so the price in your harvest week is your price. That is why avoiding the union-wide rush matters.`)}</p>}
        {retail && <p className="flex gap-2"><Info size={16} className="mt-1 shrink-0 text-muted" />{T(`এই সপ্তাহে (${fmtDate(Date.parse(MARKET.week), 'bn')}) ঢাকার খুচরা বাজারে ${retail.bn} কেজি ৳${num(retail.price, 'bn', { dp: 1 })}, এক বছর আগে ৳${num(retail.lastYear, 'bn', { dp: 1 })}। খুচরা দাম কৃষকের পাওয়া দামের চেয়ে অনেক বেশি।`, `This week (${fmtDate(Date.parse(MARKET.week), 'en')}) ${retail.en.toLowerCase()} sells for ৳${num(retail.price, 'en', { dp: 1 })} a kg in Dhaka retail markets, ৳${num(retail.lastYear, 'en', { dp: 1 })} a year ago. Retail is well above what growers get.`)}</p>}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-muted">{T(`উৎস: কৃষি বিপণন অধিদপ্তর (DAM), মাসিক জাতীয় গড় দাম (${h.dam})${retail ? '; ঢাকার চার বাজারের সাপ্তাহিক খুচরা দাম' : ''}।`, `Source: Department of Agricultural Marketing (DAM), monthly national average prices (${h.dam})${retail ? '; weekly retail prices in four Dhaka markets' : ''}.`)}</p>
    </Card>
  );
}

export function StepGlut() {
  const ctx = useStore();
  const { s, dispatch, T, L, toast, decision: d, chosen, union, farmer, confirmedPlan, shared, confirmPlan } = ctx;
  const lang = s.lang;
  const crop = chosen.crop;
  // Other fields in the union, split by where the plan comes from: real confirmed plans versus sample neighbours.
  const others = union.plans.filter((p) => p.plot_id !== farmer.id);
  const realPlans = others.filter((p) => p.src !== 'demo'), samplePlans = others.filter((p) => p.src === 'demo');
  const bins = supplyCurve(null, samplePlans, crop.id);
  const realBins = supplyCurve(null, realPlans, crop.id);
  const mine = new Map();
  const myT = midYield(crop) * farmer.area_dec * DECIMAL_HA;
  const w0 = weekOf(chosen.hw.start);
  crop.harvestWeeks.forEach((sh, i) => mine.set(w0 + i, myT * sh));
  const normal = normalWeekly(union.area_dec, crop.id);
  const g = chosen.glut;
  const same = confirmedPlan && confirmedPlan.crop === crop.id && confirmedPlan.date === chosen.t0;
  const alts = d.all.filter((o) => o.crop.id === crop.id).sort((a, b) => a.shift - b.shift);
  const slots = crop.id === 'tomato' ? slotLoad(union) : null;
  const mySlot = slotOf(chosen.t0);
  const nReal = realPlans.length + (confirmedPlan ? 1 : 0);
  const why = {
    title: T('দাম পড়ার ঝুঁকি কীভাবে বের হয়', 'How the price-drop risk is worked out'), tags: ['REAL', 'RULE', 'DEMO'],
    blocks: [
      { h: T('হিসাব', 'The calculation'), lines: [
        T('ইউনিয়নের সব পরিকল্পনা যোগ করে দেখা হয় কোন সপ্তাহে কত টন ফসল উঠবে: জমি × দেশের গড় ফলন (FAOSTAT) × সেই সপ্তাহের ভাগ। ফসল তোলার সপ্তাহ আসে এলাকার আবহাওয়ায় ফসলের বাড়ার হিসাব থেকে।', 'Every plan in the union is added up into tonnes per harvest week: area × national average yield (FAOSTAT) × that week’s share. Harvest weeks come from crop growth on the local weather.'),
        T('নীল: অন্য কৃষকদের পাকা করা আসল পরিকল্পনা, সার্ভার থেকে সরাসরি। সবুজ: যাদের পরিকল্পনা এখনো আসেনি তাদের জায়গায় নমুনা প্রতিবেশী।', 'Blue: other farmers’ real confirmed plans, live from the server. Green: sample neighbours standing in for fields with no plan yet.'),
        T('লাল দাগ: সাধারণ সপ্তাহের ১.৩ গুণ ফসল। সাধারণ সপ্তাহ = ইউনিয়নের জমি × এই ফসলের সাধারণ ভাগ (অনুমান) × ফলন ÷ তোলার সপ্তাহ।', 'Red line: 1.3 times a normal week. A normal week = the union’s land × this crop’s usual share (an estimate) × yield ÷ harvest weeks.'),
        T('হলুদ ছায়া: যে মাসগুলোতে কৃষি বিপণন অধিদপ্তরের দামে বছরের পর বছর দাম ১০% বা বেশি পড়েছে।', 'Gold band: months when DAM prices fell 10% or more, year after year.'),
        T('কোনো সপ্তাহ "বেশি" ঝুঁকির হয় যখন ফসল লাল দাগের ওপরে আর দামও পড়ার সময়; একটা হলে "মাঝারি"। আপনার ফসলের অর্ধেক বা বেশি "বেশি" ঝুঁকির সপ্তাহে উঠলে আপনার ঝুঁকি বেশি।', 'A week is high-risk when supply is over the red line in a price-dip week; one of the two makes it medium. If half or more of your harvest lands in high-risk weeks, your risk is high.')] },
      { h: T('আপনার জমির হিসাব', 'Your field'), lines: g.detail.map((x) => T(`${fmtDate(weekStart(x.week), 'bn')}-এর সপ্তাহে ইউনিয়নে ${num(x.supply, 'bn', { dp: 1 })} টন, ঝুঁকি ${RISK_STYLE[x.level].bn}${x.inDip ? ', দাম পড়ার সময়' : ''}`, `Week of ${fmtDate(weekStart(x.week), 'en')}: ${num(x.supply, 'en', { dp: 1 })} t in the union, ${x.level.toLowerCase()} risk${x.inDip ? ', in a price-dip week' : ''}`)) },
    ],
    sources: [
      T(`পরিকল্পনা: ${shared.status === 'live' ? `সার্ভারে ${bnDigits(nReal)}টি পাকা পরিকল্পনা (আসল)` : 'এই ফোনে পাকা করা পরিকল্পনা'}, বাকিটা নমুনা প্রতিবেশী`, `Plans: ${shared.status === 'live' ? `${nReal} confirmed plans on the server (real)` : 'plans confirmed on this phone'}, the rest sample neighbours`),
      T('দাম পড়ার মাস: কৃষি বিপণন অধিদপ্তর, মাসিক জাতীয় গড় দাম ২০০৮–২০২৩ (আসল)', 'Price-dip months: DAM monthly national average prices, 2008–2023 (real)'),
      T('ফলন: FAOSTAT ২০২৪, বাংলাদেশের গড় (আসল); ফসলের সাধারণ ভাগ: অনুমান', 'Yield: FAOSTAT 2024, Bangladesh average (real); usual crop share: an estimate'),
      climateSource(lang)],
  };
  const confirm = async () => {
    const plan = { plot_id: farmer.id, crop: crop.id, date: chosen.t0, area_dec: farmer.area_dec, union: farmer.union };
    const ok = await confirmPlan(plan);
    if (ok) toast('পরিকল্পনা পাকা হয়েছে; কৃষি কর্মকর্তা আর ইউনিয়নের সবাই এখন এটা হিসাবে দেখবেন', 'Plan confirmed; your officer and everyone in the union now count it.');
    else toast('পরিকল্পনা এই ফোনে পাকা হয়েছে; সার্ভার পাওয়া গেলে সবার হিসাবে যোগ হবে', 'Plan confirmed on this phone; it joins everyone’s totals once the server is reachable.');
  };
  return (
    <div>
      <StepHeader kicker={T('ধাপ ৭, দাম পড়ার ঝুঁকি', 'Step 7, price-drop check')} title={T('সবাই একই ফসল করলে দাম পড়ে যায়', 'When everyone grows the same crop, prices fall')}
        sub={T(`${union.meta.full.bnIn} যত জমির পরিকল্পনা হয়েছে, তার ${num(g.share * 100, 'bn')}%-এ ${crop.name.bn}। আপনার ফসল উঠবে ${fmtRange(chosen.hw.start, chosen.hw.end, 'bn')}।`, `${num(g.share * 100, 'en')}% of the planned land in ${union.meta.en} is ${crop.name.en.toLowerCase()}. Your harvest: ${fmtRange(chosen.hw.start, chosen.hw.end, 'en')}.`)} tags={['REAL', 'RULE', 'DEMO']} />
      <BoardStatus nReal={nReal} nSample={samplePlans.length} />
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[15px] font-semibold">{T(`${crop.name.bn}: ইউনিয়নে কোন সপ্তাহে কত টন উঠবে`, `${crop.name.en}: tonnes ready each week in the union`)}</div>
          <span className={`chip !text-[13px] ${RISK_STYLE[g.level].cls}`}>{T('আপনার ঝুঁকি', 'Your risk')}: {L(RISK_STYLE[g.level])}</span>
        </div>
        <SupplyChart bins={bins} real={realBins.size || shared.status === 'live' ? realBins : undefined} mine={mine} normal={normal} dip={PRICE_DIP[crop.id]} highlight={g.weeks} height={210} />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
          {(realBins.size > 0 || shared.status === 'live') && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#2f6fae' }} />{T('অন্যদের পাকা পরিকল্পনা (আসল)', 'Others’ confirmed plans (real)')}</span>}
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary-500" />{T('নমুনা প্রতিবেশী', 'Sample neighbours')}</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-paddy-500" />{T('আপনার জমি', 'Your field')}</span>
          {PRICE_DIP[crop.id] && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-paddy-100" />{T('সাধারণত দাম পড়ে', 'Prices usually fall')}</span>}
          <WhyButton small payload={why} />
        </div>
      </Card>
      <PriceHistory crop={crop} hw={chosen.hw} />
      <h3 className="mt-6 text-[17px] font-bold">{T('লাগানোর তারিখ বদলে দেখুন', 'Try another planting date')}</h3>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {alts.map((o) => {
          const on = o.shift === chosen.shift;
          return (
            <button key={o.shift} type="button" onClick={() => dispatch({ type: 'set', patch: { pick: { crop: o.crop.id, shift: o.shift } } })} aria-pressed={on}
              className={`rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-95 cursor-pointer ${on ? 'border-primary-700 bg-primary-50 ring-2 ring-primary-300 shadow-md scale-[1.02]' : 'border-border/80 bg-white/95 hover:border-primary-300 hover:bg-primary-50/60 shadow-2xs'}`}>
              <div className="text-[12.5px] font-semibold text-muted">{shiftLabel(o.shift, T)}</div>
              <div className="font-display text-[17px] font-bold text-ink">{fmtDate(o.t0, lang)}</div>
              <div className="text-[12px] text-muted">{fmtBangla(o.t0, lang)}</div>
              <div className="mt-1 text-[12px] text-muted">{T(`তোলা ${fmtDate(o.hw.start, 'bn')} থেকে`, `harvest from ${fmtDate(o.hw.start, 'en')}`)}</div>
              <span className={`chip mt-2 ${RISK_STYLE[o.glut.level].cls}`}>{T('ঝুঁকি', 'Risk')} {L(RISK_STYLE[o.glut.level])}</span>
            </button>
          );
        })}
      </div>
      {slots && (
        <Card className="mt-4 p-4">
          <div className="mb-1 text-[15px] font-semibold">{T('ইউনিয়নে টমেটো লাগানোর পালা', 'Tomato planting slots in the union')}</div>
          <p className="mb-3 text-[13.5px] text-muted">{T('একটা পালা ভরে গেলে পরের জনকে অন্য সময় বা অন্য ফসল দেওয়া হয়, যাতে ভিড় শুধু এক সপ্তাহ থেকে আরেক সপ্তাহে না সরে।', 'Once a slot fills, the next farmer is offered another date or crop, so the rush does not just move to a different week.')}</p>
          <div className="space-y-2">
            {slots.map((sl) => (
              <div key={sl.id} className="grid grid-cols-[minmax(0,150px)_1fr_56px] items-center gap-2 text-[13.5px]">
                <span className={sl.id === mySlot ? 'font-bold text-primary-800' : 'text-ink/70'}>{fmtRange(sl.from, sl.to, lang)}</span>
                <MiniBar value={(sl.load / sl.cap) * 100} color={sl.full ? 'bg-red-500' : 'bg-primary-500'} />
                <span className={`text-right ${sl.full ? 'font-semibold text-red-700' : 'text-muted'}`}>{sl.full ? T('ভরা', 'full') : `${num((sl.load / sl.cap) * 100, lang)}%`}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {g.level === 'High' && <Note tone="warn" className="mt-4">{T('ঝুঁকি বেশি। অন্য তারিখ বেছে নিন, অথবা জমির অর্ধেকে মসুর বা সরিষার মতো অন্য ফসল দিন।', 'High risk. Pick another date, or put half the field under another crop such as lentil or mustard.')}</Note>}
      <div className="mt-5 rounded-2xl border border-primary-200/90 bg-gradient-to-br from-primary-50 to-primary-100/60 p-5 shadow-sm">
        <div className="text-[16px] font-bold text-primary-950">{same ? T('আপনার পরিকল্পনা পাকা করা আছে', 'Your plan is confirmed') : T('ঠিক করলে পরিকল্পনা পাকা করুন', 'Happy with it? Confirm your plan')}</div>
        <p className="mt-1 text-[14px] leading-6 text-primary-900/85">{T('পাকা করলে আপনার ইউনিয়নের কৃষি কর্মকর্তা পরিকল্পনাটা দেখতে পাবেন, আর ইউনিয়নের ফসলের হিসাবে আপনার জমিও যোগ হবে।', 'Once confirmed, your union’s officer can see it and your field is counted in the union’s harvest totals.')}</p>
        <Button onClick={confirm} disabled={same} className="mt-3.5 w-full py-3.5 shadow-md">
          {same ? <><CheckCircle2 size={18} />{T('পাকা করা হয়েছে', 'Confirmed')}</> : T(`পাকা করুন: ${crop.name.bn}, ${fmtDate(chosen.t0, 'bn')}`, `Confirm: ${crop.name.en}, ${fmtDate(chosen.t0, 'en')}`)}
        </Button>
      </div>
    </div>
  );
}

// "What if the weather changes?": replay the 25 seasons hotter or drier and show whether the advice still holds.
// Two sliders for any mix of warmer and wetter or drier: the same 25 seasons replayed with every day so many degrees
// warmer and every day's rain scaled. Applied a moment after the thumb stops, so dragging stays smooth.
function WhatIfSliders() {
  const { s, dispatch, T } = useStore();
  const cur = parseWhatIf(s.whatIf);
  const [dT, setDT] = useState(cur.dT), [rain, setRain] = useState(Math.round((cur.rain - 1) * 100));
  useEffect(() => { const c = parseWhatIf(s.whatIf); setDT(c.dT); setRain(Math.round((c.rain - 1) * 100)); }, [s.whatIf]);
  const timer = useRef(0);
  const push = (a, b) => { clearTimeout(timer.current); timer.current = setTimeout(() => dispatch({ type: 'set', patch: { whatIf: a === 0 && b === 0 ? 'normal' : `c:${a}:${(100 + b) / 100}` } }), 250); };
  useEffect(() => () => clearTimeout(timer.current), []);
  const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
  return (
    <div className="mt-3 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2">
      <label className="block text-[13.5px] font-semibold">
        <span className="flex justify-between"><span>{T('প্রতিদিন আরও গরম', 'Every day warmer by')}</span><span className="tabular text-red-700">{T(`${sign(dT)}${num(Math.abs(dT), 'bn', { dp: 1 })}°`, `${sign(dT)}${Math.abs(dT).toFixed(1)}°`)}</span></span>
        <input type="range" min="0" max="3" step="0.5" value={dT} onChange={(e) => { const v = +e.target.value; setDT(v); push(v, rain); }} className="mt-1.5 w-full accent-red-600" aria-label={T('তাপমাত্রা কত বাড়বে', 'Degrees warmer')} />
      </label>
      <label className="block text-[13.5px] font-semibold">
        <span className="flex justify-between"><span>{T('বৃষ্টি', 'Rain')}</span><span className="tabular text-sky-700">{T(`${sign(rain)}${num(Math.abs(rain), 'bn')}%`, `${sign(rain)}${Math.abs(rain)}%`)}</span></span>
        <input type="range" min="-40" max="40" step="10" value={rain} onChange={(e) => { const v = +e.target.value; setRain(v); push(dT, v); }} className="mt-1.5 w-full accent-sky-600" aria-label={T('বৃষ্টি কত শতাংশ বদলাবে', 'Rain change, per cent')} />
      </label>
    </div>
  );
}

function WhatIfBar() {
  const { s, dispatch, T, L, decision: d, decisionBase: b } = useStore();
  const changed = s.whatIf !== 'normal';
  const same = b.rec.crop.id === d.rec.crop.id && b.rec.shift === d.rec.shift;
  const delta = Math.round(d.rec.score - b.rec.score);
  return (
    <div className="mt-4 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700"><CloudSun size={18} /></span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">{T('আবহাওয়া বদলালেও কি এই পরামর্শ টিকবে?', 'Would this advice hold if the weather changes?')}</div>
          <p className="text-[13.5px] leading-6 text-muted">{T('একই ২৫ মৌসুম আবার হিসাব করি, শুধু তাপমাত্রা বা বৃষ্টি বদলে।', 'We replay the same 25 seasons with only the temperature or rain changed.')}</p>
        </div>
      </div>
      <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-0.5">
        <Segmented value={s.whatIf} onChange={(v) => dispatch({ type: 'set', patch: { whatIf: v } })}
          options={Object.entries(WHAT_IFS).map(([k, w]) => ({ value: k, label: T(w.bn, w.en) }))} className="whitespace-nowrap" />
      </div>
      <WhatIfSliders />
      {changed && (
        <Note key={s.whatIf} tone={same ? 'ok' : 'gold'} className="swap-in mt-3">
          {same
            ? <><b>{T(`পরামর্শ একই থাকে: ${L(d.rec.crop.name)}।`, `The advice holds: ${L(d.rec.crop.name)}.`)}</b>{' '}
              {T(`${delta === 0 ? 'নম্বরও বদলায় না' : delta > 0 ? `নম্বর ${num(delta, 'bn')} বাড়ে` : `নম্বর ${num(-delta, 'bn')} কমে`}, তাই এই পরিকল্পনা টেকসই।`, `${delta === 0 ? 'The score does not change' : delta > 0 ? `The score rises by ${delta}` : `The score drops by ${-delta}`}, so this plan is resilient.`)}</>
            : <><b>{T(`পরামর্শ বদলায়: ${L(b.rec.crop.name)}-এর বদলে ${L(d.rec.crop.name)}।`, `The advice changes: ${L(d.rec.crop.name)} instead of ${L(b.rec.crop.name)}.`)}</b>{' '}
              {T('আবহাওয়া এমন হলে ওপরের কার্ডে দেখানো ফসলটাই নিরাপদ।', 'If the weather goes this way, the crop in the card above is the safer one.')}</>}
        </Note>
      )}
    </div>
  );
}
