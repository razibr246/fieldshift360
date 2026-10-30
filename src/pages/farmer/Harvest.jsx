// Harvest and sale for this farmer's field, on the real date. When the crop will be ready: the heat-unit estimate from
// the planting day, tracked live once the crop is in (actual warmth at the field since planting). How much: the
// last five years of FAOSTAT national yields on this field's area. What it may earn: the planner's published price
// and cost, and what the grower price really did in these weeks (DAM). When and how to cut, with live harvest-week
// weather. The union's harvest weeks come from everyone's confirmed plans on the shared board.
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, PackageCheck, Scale, Wheat, RefreshCw, ClipboardCheck, Coins, Sprout, CloudRain, Thermometer, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, WhyButton, Tags, Note, climateSource, RISK_STYLE, CountUp } from '../../components/ui';
import SupplyChart from '../../components/charts/SupplyChart';
import { BoardStatus, PriceHistory } from './steps/StepsB';
import { liveHarvest, yieldFromHistory } from '../../engine/harvest';
import { supplyCurve, normalWeekly, PRICE_DIP, weekOf, midYield } from '../../engine/glut';
import { PLAN_SEASON } from '../../engine/climate';
import { DECIMAL_HA, MAUND_KG } from '../../engine/crops';
import { num, fmtDate, fmtRange, fmtBangla, daysBetween, bnDigits, parseISO } from '../../engine/dates';
import { bnOf } from '../../engine/text';

// When a crop is ready to cut, and how dry it must be to keep (BRRI, BARI and DAE post-harvest guidance).
const RIPE = {
  boro: { sign: { bn: 'শিষের ওপরের ৮০% ধান শক্ত আর খড়ের রঙের (সোনালি) হলে কাটুন। বেশি পাকলে ধান ঝরে, ইঁদুর-পাখিতে নষ্ট হয়।', en: 'Cut when the top 80% of grains on the panicle are hard and straw-coloured. Over-ripe paddy shatters and rats and birds take it.' }, dry: 12, how: { bn: 'মাড়াইয়ের পর রোদে শুকিয়ে আর্দ্রতা ১২%-এ আনুন: দাঁতে কাটলে "কট" শব্দে ভাঙবে।', en: 'After threshing, sun-dry to 12% moisture: a grain should crack with a snap between the teeth.' } },
  wheat: { sign: { bn: 'শিষ আর গাছ খড়ের রঙের, দানা শক্ত (নখে চাপলে দাগ পড়ে না) হলে কাটুন।', en: 'Cut when ears and stems are straw-coloured and the grain is hard (a thumbnail leaves no mark).' }, dry: 12, how: { bn: 'দানা ১২%-এর নিচে শুকিয়ে বায়ুরোধী পাত্রে রাখুন, বীজের জন্য আলাদা করে।', en: 'Dry below 12% and store airtight; keep seed grain separate.' } },
  mustard: { sign: { bn: 'গাছের ৮০% শুঁটি খড়ের রঙের হলে সকালে শিশির থাকতে কাটুন; দুপুরে কাটলে শুঁটি ফেটে দানা ঝরে।', en: 'Cut in the dewy morning when 80% of the pods are straw-coloured; cut at midday and the pods burst.' }, dry: 8, how: { bn: 'মাড়াইয়ের পর দানা ৮%-এ শুকান (দাঁতে চাপলে কট করে ভাঙে), তারপর তেলের মিলে বা বিক্রিতে।', en: 'After threshing dry the seed to 8% (it cracks between the teeth) before selling or milling.' } },
  lentil: { sign: { bn: '৮০% শুঁটি বাদামি হলে কাটুন; দেরি হলে শুঁটি ফেটে ডাল ঝরে।', en: 'Cut when 80% of the pods are brown; any later and the pods split.' }, dry: 10, how: { bn: 'ডাল ১০%-এ শুকিয়ে রাখুন; ডাল-পোকা ঠেকাতে পাত্রের মুখ ভালো করে আটকান।', en: 'Dry to 10% and seal the containers against pulse beetles.' } },
  tomato: { sign: { bn: 'দূরের বাজারে পাঠাতে ফলের নিচে হালকা গোলাপি রং ধরলেই তুলুন; কাছের বাজারে লাল হলে। সকালে বা বিকেলে তুলুন।', en: 'For distant markets pick at the first pink blush; for local sale when red. Pick in the cool of the day.' }, dry: null, how: { bn: 'ছায়ায় রাখুন, প্লাস্টিকের ক্রেটে এক-দুই স্তরে সাজান; বস্তায় চাপাচাপি করলে ফল থেঁতলে যায়।', en: 'Keep in the shade in one or two layers in plastic crates; sacks bruise the fruit.' } },
};

export default function Harvest() {
  const { s, dispatch, T, L, toast, chosen, farmer, union, today, rotation: r, clim, liveWeather, confirmedPlan, activeParcel } = useStore();
  const lang = s.lang;
  const crop = chosen.crop;
  const wx = liveWeather ? s.live : null;
  const hw = useMemo(() => liveHarvest(clim, crop, chosen.t0, PLAN_SEASON, wx, today), [clim, crop, chosen.t0, wx, today]);
  const safety = chosen.bt.now.n ? chosen.bt.now.safe / chosen.bt.now.n : 1;
  const y = yieldFromHistory(crop, farmer.area_dec, safety);
  const dPlant = daysBetween(chosen.t0, today);
  const daysTo = daysBetween(today, hw.start);
  const inHarvest = today >= hw.start && today <= hw.end;
  // Union harvest weeks: other farmers' real confirmed plans (shared board) apart from sample neighbours.
  const others = union.plans.filter((p) => p.plot_id !== farmer.id);
  const realPlans = others.filter((p) => p.src !== 'demo'), samplePlans = others.filter((p) => p.src === 'demo');
  const bins = supplyCurve(null, samplePlans, crop.id), realBins = supplyCurve(null, realPlans, crop.id);
  const mine = new Map();
  const myT = midYield(crop) * farmer.area_dec * DECIMAL_HA;
  crop.harvestWeeks.forEach((sh, i) => mine.set(weekOf(hw.start) + i, myT * sh));
  const m = chosen.money; // per bigha, from the planner: FAOSTAT yield × published price and cost
  const bigha = farmer.area_dec / 33;
  const kgMid = (y.kgLow + y.kgHigh) / 2;
  const saved = s.harvests[farmer.id] ?? null;
  const [qty, setQty] = useState(saved ? String(saved.q) : '');
  const [price, setPrice] = useState(saved?.p ? String(saved.p) : '');
  useEffect(() => { setQty(saved ? String(saved.q) : ''); setPrice(saved?.p ? String(saved.p) : ''); }, [farmer.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const est = (y.maundLow + y.maundHigh) / 2;
  const ripe = RIPE[crop.id];
  // Harvest-week weather from the live forecast, when the harvest is within the forecast's reach.
  const fc = wx ? wx.days.slice(wx.today, wx.today + 7) : [];
  const harvestNear = wx && daysTo <= 7 && today <= hw.end;
  const rainSoon = harvestNear ? fc.filter((x) => (x.rain ?? 0) >= 10) : [];

  const why = {
    title: T('ফসল তোলার সময়, ফলন আর আয় কীভাবে হিসাব হলো', 'How the harvest date, yield and income are worked out'), tags: [clim.prov.status === 'REAL' ? 'REAL' : 'PLACEHOLDER', 'REAL', 'RULE'],
    blocks: [
      { h: T('কবে উঠবে', 'When'), lines: [
        T(`ফসল পাকতে নির্দিষ্ট পরিমাণ তাপ লাগে: লাগানোর দিন থেকে প্রতিদিনের গড় তাপমাত্রা ${num(crop.gddBase, 'bn')}°-এর ওপরে যতটুকু, যোগ করে ${num(hw.gddTarget, 'bn')} "তাপ-দিন" হলে তোলা শুরু।`, `A crop needs a set amount of warmth to ripen: each day’s mean temperature above ${crop.gddBase} °C is added from planting; harvest starts at ${hw.gddTarget} degree-days.`),
        hw.live ? T(`লাগানোর পর ${bnDigits(hw.observed)} দিনের আসল তাপমাত্রা (Open-Meteo, আপনার জমির জায়গায়) আর বাকি দিনের ২০১৩–২০২৫ গড় ধরে হিসাব। এখন পর্যন্ত দরকারি তাপের ${bnDigits(Math.round(hw.progress * 100))}% জমা হয়েছে।`, `Uses the real temperature for the ${hw.observed} days since planting (Open-Meteo at your field) and the 2013–2025 average for the rest. ${Math.round(hw.progress * 100)}% of the warmth needed has built up so far.`)
          : T('এখনো লাগানো হয়নি, তাই পুরোটাই ২০১৩–২০২৫ সালের গড় তাপমাত্রায় (নাসা POWER, আবহাওয়া কেন্দ্রের সঙ্গে মেলানো)। লাগানোর পর থেকে প্রতিদিনের আসল তাপমাত্রায় তারিখ নিজে থেকে বদলাবে।', 'Not planted yet, so it uses the 2013–2025 average temperature throughout (NASA POWER, matched to the weather station). From planting on, the real daily temperature moves the date.')] },
      { h: T('কতটা পাবেন', 'How much'), lines: [
        y.years ? T(`ফলন = জমির মাপ × হেক্টরপ্রতি ফলন। পরিসর ${bnDigits(y.years[0])}–${bnDigits(y.years[1])} সালের সবচেয়ে কম আর বেশি বছরের দেশের গড় ফলন (FAOSTAT): ${Object.entries(y.tHa).map(([yr, v]) => `${bnDigits(yr)}: ${num(v, 'bn', { dp: 2 })}`).join(', ')} টন/হেক্টর।`, `Yield = field area × yield per hectare. The range is the lowest and highest national average yield of ${y.years[0]}–${y.years[1]} (FAOSTAT): ${Object.entries(y.tHa).map(([yr, v]) => `${yr}: ${v}`).join(', ')} t/ha.`) : '',
        safety < 0.6 ? T('এই তারিখে আবহাওয়ার ঝুঁকি বেশি বলে ওপরের সীমা ১৫% কমানো হয়েছে।', 'The top end is cut by 15% because weather risk on this date is high.') : '',
        T('এটা দেশের গড়; আপনার জমির ফলন জাত, সার, সেচ আর যত্নে বেশি-কম হবে। ফসল তুলে লিখে রাখলে পরের বার আপনার নিজের ফলন ধরা হবে।', 'This is the national average; your own yield depends on variety, fertiliser, water and care. Record your harvest and your own yield is used next time.')].filter(Boolean) },
      ...(m ? [{ h: T('আয়', 'Income'), lines: [T(`দাম ৳${num(m.priceKg, 'bn', { dp: 2 })}/কেজি: ${m.price.what.bn} (${bnDigits(m.price.year)})। পুরো খরচ ৳${num(m.costKg, 'bn', { dp: 2 })}/কেজি: ${m.costSrc.what.bn} (${bnDigits(m.costSrc.year)})।`, `Price ৳${m.priceKg}/kg: ${m.price.what.en} (${m.price.year}). Full cost ৳${m.costKg}/kg: ${m.costSrc.what.en} (${m.costSrc.year}).`)] }] : []),
      { h: T('মনে রাখবেন', 'Keep in mind'), lines: [T('এটা পরিকল্পনার আন্দাজ। AI দিয়ে ফলন বা দামের পূর্বাভাস দেওয়া হয় না।', 'This is a planning estimate. No AI yield or price forecast is made.')] },
    ],
    sources: [climateSource(lang), T('ফলন: FAOSTAT, বাংলাদেশ, জাতীয় গড়', 'Yield: FAOSTAT, Bangladesh, national average'), liveWeather ? T('লাগানোর পরের তাপমাত্রা ও পূর্বাভাস: Open-Meteo, আপনার জমির জায়গায়', 'Temperature since planting and forecast: Open-Meteo at your field') : '', T('পাকার লক্ষণ ও শুকানো: ব্রি, বারি ও কৃষি সম্প্রসারণ অধিদপ্তরের নির্দেশিকা', 'Ripeness and drying: BRRI, BARI and DAE guidance')].filter(Boolean),
  };
  const record = (e) => {
    e.preventDefault();
    const q = Number(qty), p = Number(price);
    if (!(q > 0)) return;
    dispatch({ type: 'recordHarvest', id: farmer.id, value: { q, p: p > 0 ? p : null, crop: crop.id, at: today, area_dec: farmer.area_dec } });
    toast('ফসলের হিসাব রাখা হলো, পরের মৌসুমে কাজে লাগবে', 'Harvest saved for next season’s plan');
  };
  const savedTHa = saved ? (saved.q * MAUND_KG) / 1000 / ((saved.area_dec ?? farmer.area_dec) * DECIMAL_HA) : null;
  const fieldName = activeParcel ? L(activeParcel.name) : T('আপনার জমি', 'your field');

  return (
    <div className="farmer-harvest-page">
      <PageHeader eyebrow={T(`ফসল তোলা ও বিক্রি · ${fmtBangla(today, 'bn')} (${fmtDate(today, 'bn')})`, `Harvest and sale · ${fmtDate(today, 'en')}`)} title={T(`${bnOf(crop.name.bn)} ফসল কবে উঠবে`, `When your ${crop.name.en.toLowerCase()} will be ready`)}
        subtitle={T(`${fieldName}, ${bnDigits(farmer.area_dec)} শতক। ${dPlant < 0 ? `${crop.action.bn} ${fmtDate(chosen.t0, 'bn')}; তারিখ এখন গড় আবহাওয়ায়, লাগানোর পর থেকে প্রতিদিনের আসল তাপে বদলাবে।` : `লাগানো হয়েছে ${fmtDate(chosen.t0, 'bn')}, ${bnDigits(dPlant)} দিন আগে; তারিখ প্রতিদিনের আসল তাপমাত্রায় হালনাগাদ হয়।`}`, `${fieldName}, ${farmer.area_dec} decimal. ${dPlant < 0 ? `${crop.action.en} on ${fmtDate(chosen.t0, 'en')}; the date uses average weather for now and follows the real daily warmth from planting on.` : `Planted ${fmtDate(chosen.t0, 'en')}, ${dPlant} days ago; the date updates with the real daily temperature.`}`)}
        tags={[clim.prov.status === 'REAL' ? 'REAL' : 'PLACEHOLDER', 'REAL', 'RULE']} action={<WhyButton payload={why} />} />
      <Card data-tour="h-top" className="overflow-hidden">
        <div className="grid lg:grid-cols-[.75fr_1.25fr]">
          <div className="bg-paddy-50 p-7 text-center sm:p-9">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white text-paddy-500 shadow-sm"><Wheat size={38} /></div>
            <p className="mt-5 text-[15px] font-semibold text-paddy-700">{inHarvest ? T('ফসল তোলার সময় চলছে', 'Harvest is under way') : today > hw.end ? T('ফসল তোলার সময় শেষ', 'Harvest time is over') : T('ফসল তুলতে বাকি আরও', 'Harvest starts in about')}</p>
            {daysTo > 0 && <div className="font-display mt-1 text-[52px] font-bold leading-none text-paddy-700"><CountUp value={daysTo} /> <span className="text-[24px]">{T('দিন', 'days')}</span></div>}
            <p className="mt-2 text-[13.5px] text-paddy-700">{T(`আজ ${fmtDate(today, 'bn')} থেকে`, `From today, ${fmtDate(today, 'en')}`)}</p>
            {dPlant >= 0 ? (
              <div className="mx-auto mt-5 max-w-[260px] text-left">
                <div className="flex justify-between text-[12.5px] text-paddy-800"><span>{T('পাকার জন্য দরকারি তাপ জমেছে', 'Warmth needed, built up')}</span><b className="tabular">{num(Math.round(hw.progress * 100), lang)}%</b></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white"><div className="bar-grow h-full rounded-full bg-paddy-500" style={{ width: `${hw.progress * 100}%` }} /></div>
                {hw.live && hw.shift !== 0 && <p className="mt-2 text-[12.5px] leading-5 text-paddy-800">{T(`এবারের আসল তাপে গড়ের চেয়ে ${bnDigits(Math.abs(hw.shift))} দিন ${hw.shift < 0 ? 'আগে' : 'পরে'}।`, `This season’s real warmth puts it ${Math.abs(hw.shift)} days ${hw.shift < 0 ? 'earlier' : 'later'} than average.`)}</p>}
              </div>
            ) : (
              <p className="mx-auto mt-4 max-w-[260px] text-[12.5px] leading-5 text-paddy-800">{T(`${crop.action.bn} ${fmtDate(chosen.t0, 'bn')}, আর ${bnDigits(-dPlant)} দিন পর। তারপর থেকে এই দিন-গোনা প্রতিদিনের আসল তাপমাত্রায় চলবে।`, `${crop.action.en} on ${fmtDate(chosen.t0, 'en')}, in ${-dPlant} days. From then on the count follows the real daily temperature.`)}</p>
            )}
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3" data-stagger>
              {[[CalendarDays, T('ফসল তোলার সময়', 'Harvest weeks'), fmtRange(hw.start, hw.end, lang), T(`${fmtBangla(hw.start, 'bn')} থেকে`, `from ${fmtBangla(hw.start, 'en')}`)],
                [PackageCheck, T('আনুমানিক ফলন', 'Likely yield'), T(`${num(y.maundLow, 'bn')}–${num(y.maundHigh, 'bn')} মণ`, `${num(y.maundLow, 'en')}–${num(y.maundHigh, 'en')} maund`), T(`${num(farmer.area_dec, 'bn')} শতকে, খারাপ থেকে ভালো বছর`, `on ${farmer.area_dec} decimal, poor to good year`)],
                [Scale, T('কেজিতে', 'In kilograms'), `${num(Math.round(y.kgLow / 10) * 10, lang)}–${num(Math.round(y.kgHigh / 10) * 10, lang)}`, y.years ? T(`দেশের গড় ফলন, ${bnDigits(y.years[0])}–${bnDigits(y.years[1])}`, `national yields, ${y.years[0]}–${y.years[1]}`) : T('মোটামুটি', 'roughly')]].map(([Icon, l, v, sub]) => (
                <div key={l} className="rounded-xl border border-border p-4"><Icon size={19} className="text-paddy-500" /><div className="mt-3 text-[13px] text-muted">{l}</div><div className="font-display mt-0.5 text-[18px] font-bold tabular">{v}</div><div className="text-[12.5px] text-muted">{sub}</div></div>
              ))}
            </div>
            {m && (
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-canvas px-4 py-3 text-[14px]">
                <span className="flex items-center gap-2"><Coins size={17} className="text-paddy-600" />{T('বিক্রি হতে পারে প্রায়', 'Could sell for about')} <b className="tabular">৳{num(Math.round((kgMid * m.priceKg) / 100) * 100, lang)}</b></span>
                <span>{T('খরচ বাদে লাভ প্রায়', 'Profit after costs about')} <b className="tabular">৳{num(Math.round((kgMid * (m.priceKg - m.costKg)) / 100) * 100, lang)}</b></span>
                <span className="w-full text-[12.5px] text-muted">{T(`দাম ৳${num(m.priceKg, 'bn', { dp: 2 })}/কেজি (${m.price.what.bn}, ${bnDigits(m.price.year)}); পুরো খরচ ৳${num(m.costKg, 'bn', { dp: 2 })}/কেজি (${bnDigits(m.costSrc.year)})। আসল দাম বাজারের দিনে বদলাবে।`, `Price ৳${m.priceKg}/kg (${m.price.what.en}, ${m.price.year}); full cost ৳${m.costKg}/kg (${m.costSrc.year}). The real price moves with the market on the day.`)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {ripe && (
        <Card data-tour="h-how" className="mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[20px] font-bold"><Sprout size={20} className="text-primary-600" />{T('কখন আর কীভাবে কাটবেন', 'When and how to harvest')}</h2><Tags list={['RULE']} /></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-canvas p-4 text-[14.5px] leading-6"><b>{T('পাকার লক্ষণ', 'Ready when')}</b><p className="mt-1">{L(ripe.sign)}</p></div>
            <div className="rounded-xl bg-canvas p-4 text-[14.5px] leading-6"><b>{ripe.dry ? T(`শুকানো: ${bnDigits(ripe.dry)}% আর্দ্রতা`, `Drying: ${ripe.dry}% moisture`) : T('রাখা আর পাঠানো', 'Handling')}</b><p className="mt-1">{L(ripe.how)}</p></div>
          </div>
          {harvestNear ? (
            rainSoon.length
              ? <Note tone="warn" className="mt-3">{T(`ফসল তোলার সময়ে বৃষ্টির পূর্বাভাস: ${rainSoon.map((x) => `${fmtDate(parseISO(x.d), 'bn')} (${num(x.rain, 'bn')} মিমি)`).join(', ')}। পাকা ফসল বৃষ্টির আগেই কেটে শুকনো জায়গায় তুলুন; ভেজা ফসল স্তূপ করে রাখবেন না।`, `Rain forecast in the harvest window: ${rainSoon.map((x) => `${fmtDate(parseISO(x.d), 'en')} (${num(x.rain, 'en')} mm)`).join(', ')}. Cut ripe crop before the rain and get it under cover; do not stack it wet.`)}</Note>
              : <Note tone="ok" className="mt-3">{T(`আগামী ৭ দিনে বড় বৃষ্টির পূর্বাভাস নেই (সর্বোচ্চ ${num(Math.max(...fc.map((x) => x.tmax ?? 0)), 'bn')}°): কাটা আর শুকানোর ভালো সময়।`, `No heavy rain in the next 7 days (highs up to ${num(Math.max(...fc.map((x) => x.tmax ?? 0)), 'en')}°): a good window to cut and dry.`)}</Note>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-muted"><CloudRain size={15} />{T('ফসল তোলার সাত দিনের মধ্যে এলে এখানে আপনার জমির বৃষ্টির পূর্বাভাস দেখাবে।', 'Within seven days of harvest, the rain forecast for your field shows here.')}</p>
          )}
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <Card data-tour="h-market" className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[20px] font-bold">{T(`${union.meta.full.bnIn} কোন সপ্তাহে কত ফসল`, `How much ${union.meta.en} harvests each week`)}</h2><span className={`chip !text-[13px] ${RISK_STYLE[chosen.glut.level].cls}`}>{T('দাম পড়ার ঝুঁকি', 'Price-drop risk')}: {L(RISK_STYLE[chosen.glut.level])}</span></div>
            <div className="mt-3"><BoardStatus nReal={realPlans.length + (confirmedPlan ? 1 : 0)} nSample={samplePlans.length} /></div>
            <SupplyChart bins={bins} real={realBins.size || s.shared.status === 'live' ? realBins : undefined} mine={mine} normal={normalWeekly(union.area_dec, crop.id)} dip={PRICE_DIP[crop.id]} highlight={[...mine.keys()]} height={230} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
              {(realBins.size > 0 || s.shared.status === 'live') && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: '#2f6fae' }} />{T('অন্যদের পাকা পরিকল্পনা (আসল)', 'Others’ confirmed plans (real)')}</span>}
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-primary-500" />{T('নমুনা প্রতিবেশী', 'Sample neighbours')}</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-paddy-500" />{T('আপনার জমি', 'Your field')}</span>
              {PRICE_DIP[crop.id] && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-paddy-100" />{T('সাধারণত দাম পড়ে (DAM)', 'Prices usually fall (DAM)')}</span>}
            </div>
            <Note className="mt-4">{T('দাম পড়ার সপ্তাহের আগে বিক্রি করতে পারলে ভালো। কৃষি কর্মকর্তা কয়েকজনের ফসল একসঙ্গে করে পাইকারের সঙ্গে কথা বলিয়ে দিতে পারেন। এখানে কেনাবেচা বা টাকা লেনদেন হয় না।', 'Selling before the price dip helps. Your officer can group several farmers’ produce and put you in touch with traders. No buying, selling or payment happens here.')}</Note>
          </Card>
          <PriceHistory crop={crop} hw={hw} />
        </div>
        <Card data-tour="h-record" className="h-fit p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><ClipboardCheck size={20} className="text-primary-600" />{T('ফসল তোলার পর লিখে রাখুন', 'After harvest, write it down')}</h2>
          <p className="mt-1 text-[14px] text-muted">{T('কত পেলেন আর কত দামে বেচলেন: পরের মৌসুমে দেশের গড়ের বদলে আপনার জমির নিজের ফলন ধরা হবে।', 'How much you got and the price you sold at: next season your own field’s yield is used instead of the national average.')}</p>
          <form onSubmit={record} className="mt-4 space-y-3">
            <label className="block" htmlFor="h-qty"><span className="text-[14.5px] font-semibold">{T('মোট ফসল (মণ)', 'Total harvest (maund)')}</span>
              <input id="h-qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-[15px] outline-none focus:border-primary-400" placeholder={T(`যেমন ${num(Math.round(est), 'bn')}`, `e.g. ${num(Math.round(est), 'en')}`)} />
            </label>
            <label className="block" htmlFor="h-price"><span className="text-[14.5px] font-semibold">{T('গড় বিক্রির দাম (টাকা/কেজি)', 'Average price (taka per kg)')} <span className="font-normal text-muted">{T('(না দিলেও চলবে)', '(optional)')}</span></span>
              <input id="h-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-[15px] outline-none focus:border-primary-400" placeholder={m ? T(`সরকারি দাম ছিল ৳${num(m.priceKg, 'bn')}`, `official price was ৳${m.priceKg}`) : ''} />
            </label>
            <Button type="submit" className="w-full" disabled={!(Number(qty) > 0)}>{saved ? T('হিসাব বদলে রাখুন', 'Update') : T('হিসাব রাখুন', 'Save')}</Button>
          </form>
          {saved && (
            <div className="mt-4 space-y-2">
              <Note tone="ok">{T(`আন্দাজ ছিল প্রায় ${num(Math.round(est), 'bn')} মণ, পেয়েছেন ${num(saved.q, 'bn')} মণ: হেক্টরে ${num(savedTHa, 'bn', { dp: 2 })} টন${y.latest ? `, দেশের গড় ${num(y.latest.tHa, 'bn', { dp: 2 })} (${bnDigits(y.latest.year)})` : ''}।${saved.p ? ` বিক্রি প্রায় ৳${num(Math.round(saved.q * MAUND_KG * saved.p), 'bn')}।` : ''}`, `We estimated about ${num(Math.round(est), 'en')} maund; you got ${num(saved.q, 'en')}: ${num(savedTHa, 'en', { dp: 2 })} t/ha${y.latest ? ` against the national ${y.latest.tHa} (${y.latest.year})` : ''}.${saved.p ? ` Sold for about ৳${num(Math.round(saved.q * MAUND_KG * saved.p), 'en')}.` : ''}`)}</Note>
              <div className="rounded-xl border border-primary-100 bg-primary-50 p-3.5 text-[14.5px]">
                <div className="flex items-center gap-1.5 font-bold text-primary-800"><RefreshCw size={15} />{T('পরের মৌসুম', 'Next season')}</div>
                <div className="mt-1 text-primary-900">{r.best ? T(`${crop.name.bn}, তারপর ${r.best.crop.name.bn} (বোনা ${fmtDate(r.best.sowT, 'bn')}), তারপর বর্ষায় রোপা আমন`, `${crop.name.en}, then ${r.best.crop.name.en.toLowerCase()} (sow ${fmtDate(r.best.sowT, 'en')}), then transplanted Aman`) : T('সরাসরি রোপা আমন', 'Straight to transplanted Aman')}</div>
                <Button to="/farmer/plan" onClick={() => dispatch({ type: 'set', patch: { step: 5 } })} variant="ghost" className="mt-1 !px-0 text-primary-700">{T('পরিকল্পনায় দেখুন', 'Open in the planner')}</Button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">{wx && <span className="inline-flex items-center gap-1"><Thermometer size={13} />{T('তাপমাত্রা লাইভ', 'Live temperature')}</span>}<CheckCircle2 size={13} className="text-primary-600" />{T('এই ফোনে রাখা হয়', 'Kept on this phone')}</div>
        </Card>
      </div>
    </div>
  );
}
