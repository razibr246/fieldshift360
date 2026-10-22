import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, Legend } from 'recharts';
import { Building2, Send, CheckCircle2, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Badge, Button, Tags, Note, RISK_STYLE, SmsMeter } from '../../components/ui';
import SupplyChart from '../../components/charts/SupplyChart';
import { UPAZILA_DEFAULT_ADVICE } from '../../data/advice';
import { RABI_CROPS, cropName } from '../../engine/crops';
import { supplyCurve, PRICE_DIP, weekStart } from '../../engine/glut';
import { num, fmtDate, todayDhaka } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { unionGlut, cropsByArea } from './shared';
import UpazilaNow from './UpazilaNow';
import RotationImpact from './RotationImpact';
import { SectionNav, LazyMount } from '../../components/SectionNav';
import { AMAN, districtOf } from '../../radar/aman';
import { districtOutlook, cropSwitch } from '../../engine/outlook';
import { UpazilaPicker, DistrictAman, CropSwitch } from './HarvestOutlook';


export function Upazila() {
  const { s, dispatch, T, L, toast, unionsAll, hotspots, upazilaFarmers, officerUpazila: upz } = useStore();
  const lang = s.lang;
  const [msg, setMsg] = useState(null);
  // The crops this upazila actually plans, largest first; the ranking starts on the biggest one.
  const crops = cropsByArea(Object.values(unionsAll));
  const [pick, setPick] = useState(null);
  const crop = pick && crops.some((c) => c.k === pick) ? pick : crops[0]?.k ?? 'tomato';
  const stats = Object.values(unionsAll).map((u) => {
    const g = unionGlut(u, crop);
    const open = s.requests.filter((r) => r.union === u.id && r.status === 'open').length;
    const hs = hotspots.filter((h) => h.members.some((m) => m.union === u.id)).length;
    const share = u.plans.filter((p) => p.crop === crop).reduce((a, p) => a + p.area_dec, 0) / u.area_dec;
    return { u, g, open, hs, share, score: g.peak + hs * 2 + open * 0.1 };
  }).sort((a, b) => b.score - a.score);
  const sent = s.advisories.find((a) => a.upazila === upz.id);
  const allFarmers = upazilaFarmers.map((f) => f.id);
  const advice = UPAZILA_DEFAULT_ADVICE[upz.id];
  const defaultMsg = T(advice.bn, advice.en);
  const nUnions = Object.values(unionsAll).filter((u) => u.meta.kind === 'union').length;
  const nTowns = Object.values(unionsAll).length - nUnions;
  const send = () => {
    dispatch({ type: 'addAdvisory', adv: { id: `UPZ-${upz.id}`, upazila: upz.id, text: msg ?? defaultMsg, to: allFarmers, at: todayDhaka() } });
    toast(`${num(allFarmers.length, 'bn')} জন কৃষককে পাঠানো হয়েছে`, `Sent to ${allFarmers.length} farmers`);
  };
  return (
    <div>
      <PageHeader eyebrow={T(`উপজেলা কৃষি অফিসার · ${upz.district.bn} জেলা`, `Upazila agriculture officer · ${upz.district.en} district`)} title={T(`${upz.name.bn} উপজেলার সার্বিক চিত্র`, `${upz.name.en} upazila at a glance`)}
        subtitle={T('ওপরের অংশ আসল তথ্য: উপগ্রহ, সরকারি পরিসংখ্যান, কৃষি অফিসের হিসাব, আবহাওয়া আর সরকারি বাজারদর; প্রতিটির উৎস আর তারিখ দেওয়া আছে। নিচের পরিকল্পনা-অংশ নমুনা তথ্যে চলে, আলাদা করে চিহ্নিত।', 'The top part is real data: satellites, official statistics, agriculture-office figures, weather and official market prices, each with its source and date. The planning part below runs on sample data and is marked as such.')} tags={['REAL', 'RULE']} />

      <SectionNav label={T('পাতার অংশ', 'Page sections')} sections={[
        { id: 'up-now', label: T('এখন মাঠে', 'In the fields') },
        { id: 'up-rotation', label: T('ফসলচক্রের প্রভাব', 'Rotation impact') },
        { id: 'up-weather', label: T('আবহাওয়া', 'Weather') },
        { id: 'up-crops', label: T('ফসল', 'Crops') },
        { id: 'up-prices', label: T('বাজারদর', 'Prices') },
        { id: 'up-sample', label: T('নমুনা পরিকল্পনা', 'Sample planning') },
        { id: 'up-advice', label: T('পরামর্শ পাঠান', 'Send advice') },
      ]} />

      <UpazilaNow />
      <RotationImpact />

      <div id="up-sample" className="mt-12 mb-4 flex flex-wrap items-center gap-3 border-t border-border pt-8">
        <h2 className="text-[22px] font-bold">{T(`নমুনা পরিকল্পনা: ${bnOf(cropName(crop, 'bn'))} দাম পড়ার ঝুঁকি, ইউনিয়ন অনুযায়ী`, `Sample planning: ${cropName(crop, 'en').toLowerCase()} price-drop risk by union`)}</h2>
        <Tags list={['DEMO', 'AI']} />
        <p className="w-full text-[13.5px] leading-6 text-muted">{T(`আজ ${fmtDate(todayDhaka(), 'bn')}। ${upz.name.bnOf} ${num(nUnions, 'bn')}টি ইউনিয়ন ও ${num(nTowns, 'bn')}টি পৌরসভার নমুনা কৃষকদের পরিকল্পনা থেকে হিসাব; আসল কৃষকদের তথ্য এলে এটা আসল হবে। কোনো ইউনিয়নের কৃষক আর অনুরোধ দেখতে বাঁ পাশে ইউনিয়ন বেছে নিন।`, `Today ${fmtDate(todayDhaka(), 'en')}. Worked out from sample farmers' plans in ${upz.name.en}'s ${nUnions} unions and ${nTowns === 1 ? 'municipality' : `${nTowns} municipalities`}; it becomes real once real farmers' plans come in. Pick a union on the left to see its farmers and requests.`)}</p>
        <div className="flex w-full flex-wrap items-center gap-1.5" role="group" aria-label={T('ফসল', 'Crop')}>
          <span className="mr-1 text-[13px] font-semibold text-muted">{T(`${upz.name.bnOf} নমুনা পরিকল্পনায় ফসল (বেশি জমি আগে):`, `Crops in ${upz.name.en}'s sample plans (most land first):`)}</span>
          {crops.map((c) => (
            <button key={c.k} type="button" aria-pressed={crop === c.k} onClick={() => setPick(c.k)}
              className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition ${crop === c.k ? 'border-primary-700 bg-primary-700 text-white' : 'border-border bg-white text-ink/75 hover:border-primary-300'}`}>
              {cropName(c.k, lang)} <span className={crop === c.k ? 'text-white/75' : 'text-muted'}>{num(Math.round((c.area / crops.reduce((a, x) => a + x.area, 0)) * 100), lang)}%</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="bg-canvas text-[13px] text-muted"><tr>
            {[T('ক্রম', 'Rank'), T('ইউনিয়ন', 'Union'), T('কৃষক', 'Farmers'), T(`${bnOf(cropName(crop, 'bn'))} জমি`, `${cropName(crop, 'en')} land`), T('দাম পড়ার ঝুঁকি', 'Price-drop risk'), T('ব্যস্ততম সপ্তাহ', 'Busiest week'), T('এলাকার সতর্কতা', 'Area alerts'), T('খোলা অনুরোধ', 'Open requests')].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {stats.map((x, i) => (
              <tr key={x.u.id}>
                <td className="px-4 py-3 font-bold">{num(i + 1, lang)}</td>
                <td className="px-4 py-3 font-semibold">{L(x.u.meta)}</td>
                <td className="px-4 py-3 tabular">{num(x.u.farmers.length, lang)}</td>
                <td className="px-4 py-3 tabular">{num(x.share * 100, lang)}%</td>
                <td className="px-4 py-3"><span className={`chip ${RISK_STYLE[x.g.risk.level].cls}`}>{L(RISK_STYLE[x.g.risk.level])}</span></td>
                <td className="px-4 py-3 font-semibold tabular">{T(`স্বাভাবিকের ${num(x.g.peak, 'bn', { dp: 1 })} গুণ`, `${num(x.g.peak, 'en', { dp: 1 })}× normal`)}</td>
                <td className="px-4 py-3">{x.hs ? <Badge tone="red">{num(x.hs, lang)}</Badge> : '—'}</td>
                <td className="px-4 py-3 tabular">{num(x.open, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {stats.map((x) => (
          <LazyMount key={x.u.id} height={232}><Card className="p-4">
            <div className="flex items-center justify-between"><div className="font-semibold">{T(`${x.u.meta.bn}: প্রতি সপ্তাহে ${cropName(crop, 'bn')}`, `${x.u.meta.en}: ${cropName(crop, 'en').toLowerCase()} each week`)}</div><span className={`chip ${RISK_STYLE[x.g.risk.level].cls}`}>{L(RISK_STYLE[x.g.risk.level])}</span></div>
            <SupplyChart bins={x.g.bins} normal={x.g.normal} dip={PRICE_DIP[crop]} height={160} />
          </Card></LazyMount>
        ))}
      </div>

      <Card id="up-advice" className="mt-6 p-5">
        <h2 className="flex items-center gap-2 text-[19px] font-bold"><Building2 size={18} className="text-primary-600" />{T('পুরো উপজেলায় পরামর্শ পাঠান', 'Send advice to the whole upazila')}</h2>
        <textarea rows={4} value={msg ?? defaultMsg} onChange={(e) => setMsg(e.target.value)} disabled={!!sent} className="mt-3 w-full rounded-2xl border border-border p-3 text-[14px] leading-6 outline-none focus:border-primary-300 disabled:bg-canvas" aria-label={T('পরামর্শের লেখা', 'Advice text')} />
            <SmsMeter text={msg ?? defaultMsg} className="mt-1" />
        <Button disabled={!!sent} onClick={send} className="mt-2">{sent ? <><CheckCircle2 size={16} />{T(`${num(allFarmers.length, 'bn')} জনকে পাঠানো হয়েছে`, `Sent to ${allFarmers.length} farmers`)}</> : <><Send size={16} />{T(`${num(allFarmers.length, 'bn')} জন কৃষককে পাঠান`, `Send to ${allFarmers.length} farmers`)}</>}</Button>
      </Card>
      <Link to="/officer" className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-primary-700">{T('ইউনিয়নের পাতায় ফিরুন', 'Back to the union view')}<ChevronRight size={15} /></Link>
    </div>
  );
}

// Harvest timing. The whole district's Aman from real satellites (when each upazila cuts it, roughly how much, today's
// state), then for one upazila what to grow after the Aman and what a bigha earns, and for the officer's own upazila
// the Rabi harvest union by union from the sample farmers' plans. The upazila lives in the URL (?u=…) so Back works.
function SupplyPage() {
  const { T, officerUpazila } = useStore();
  const home = officerUpazila.id;
  const outlook = useMemo(() => districtOutlook(districtOf(home)), [home]);
  const [params, setParams] = useSearchParams();
  const view = outlook.rows.some((r) => r.id === params.get('u')) ? params.get('u') : home;
  const row = outlook.rows.find((r) => r.id === view);
  const plan = useMemo(() => cropSwitch(row, outlook.year), [row, outlook.year]);
  const pick = (u) => setParams(u === home ? {} : { u });
  const d = outlook.district;
  return (
    <div>
      <PageHeader eyebrow={T('ফসল কবে উঠবে', 'Harvest timing')} title={T(`${d.bn} জেলায় কবে, কোথায়, কত ফসল উঠবে`, `When, where and how much ${d.en} district harvests`)}
        subtitle={T('আমন: উপগ্রহে মাপা রোপণের দিন থেকে জেলার প্রতিটি উপজেলায় ধান কাটার সময় আর আনুমানিক পরিমাণ। তারপর বেছে নেওয়া উপজেলায় আমনের পরে কোন ফসলে বিঘায় বেশি লাভ। আপনার উপজেলার জন্য নিচে ইউনিয়ন ধরে রবি ফসলের হিসাবও আছে।', 'Aman: each upazila’s harvest window and rough amount, from transplanting days measured by satellite. Then, for the upazila you pick, which crop after the Aman earns most per bigha. For your own upazila, the Rabi harvest union by union is further down.')}
        tags={['REAL', 'RULE']} />
      <UpazilaPicker outlook={outlook} value={view} home={home} onPick={pick} />
      <SectionNav label={T('পাতার অংশ', 'Page sections')} sections={[
        { id: 'ho-district', label: T('জেলার আমন', 'District Aman') },
        { id: 'ho-switch', label: T('আমনের পরে কী লাগাবেন', 'What to grow next') },
        ...(view === home ? [{ id: 'ho-unions', label: T('ইউনিয়নের রবি ফসল', 'Rabi by union') }] : []),
      ]} />
      <DistrictAman outlook={outlook} selected={view} home={home} onPick={pick} />
      <div className="mt-6"><CropSwitch key={view} row={row} plan={plan} year={outlook.year} /></div>
      {view === home ? <UnionRabi /> : (
        <Note tone="info" className="mt-6">{T(`ইউনিয়ন ধরে রবি ফসলের সাপ্তাহিক হিসাব নমুনা কৃষকদের পরিকল্পনা থেকে হয়, তাই শুধু আপনার উপজেলার (${officerUpazila.name.bn}) জন্য আছে।`, `The union-by-union Rabi harvest comes from sample farmers’ plans, so it exists only for your own upazila (${officerUpazila.name.en}).`)}{' '}
          <button type="button" onClick={() => pick(home)} className="font-semibold text-primary-700 hover:underline">{T(`${officerUpazila.name.bn} দেখুন`, `Open ${officerUpazila.name.en}`)}</button></Note>
      )}
    </div>
  );
}

// The officer's own upazila, union by union: Rabi tonnes per week from the sample farmers' plans.
function UnionRabi() {
  const { s, T, L, unionsAll, officerUpazila } = useStore();
  const lang = s.lang;
  const list = Object.values(unionsAll);
  const [crop, setCrop] = useState(() => cropsByArea(list)[0]?.k ?? 'tomato'); // the upazila's biggest planned crop first
  const curves = list.map((u) => supplyCurve(null, u.plans, crop));
  const weeks = curves.flatMap((c) => [...c.keys()]);
  const lo = Math.min(...weeks) - 1, hi = Math.max(...weeks) + 1;
  const data = [];
  for (let w = lo; w <= hi; w++) {
    const row = { w, label: fmtDate(weekStart(w), lang) };
    // Two series: the area the officer picked, and the rest of the upazila summed (11 areas are too many hues).
    list.forEach((u, i) => { const v = curves[i].get(w) || 0; if (u.id === s.officerUnion) row.mine = +v.toFixed(2); else row.rest = +((row.rest || 0) + v).toFixed(2); });
    data.push(row);
  }
  const mine = unionsAll[s.officerUnion]?.meta;
  const seriesName = (n) => (n === 'mine' ? T(mine.full.bn, mine.full.en) : T('উপজেলার বাকি সব এলাকা', 'Rest of the upazila'));
  const dip = PRICE_DIP[crop];
  const lab = (w) => fmtDate(weekStart(w), lang);
  const windows = list.map((u, i) => { const ks = [...curves[i].keys()]; const peak = ks.reduce((a, k) => (curves[i].get(k) > (curves[i].get(a) ?? -1) ? k : a), ks[0]); return { u, first: Math.min(...ks), last: Math.max(...ks), peak, total: [...curves[i].values()].reduce((a, b) => a + b, 0) }; });
  return (
    <>
      <div id="ho-unions" className="mt-10 mb-3 flex flex-wrap items-center gap-2 border-t border-border pt-8">
        <h2 className="text-[20px] font-bold">{T(`${officerUpazila.name.bn}: ইউনিয়ন ধরে রবি ফসল, কোন সপ্তাহে কত টন`, `${officerUpazila.name.en}: Rabi harvest by union, week by week`)}</h2>
        <Tags list={['RULE', 'DEMO']} />
        <p className="w-full text-[13.5px] leading-6 text-muted">{T('কোন ইউনিয়নে, কোন সপ্তাহে, কত টন ফসল উঠবে, নমুনা কৃষকদের পরিকল্পনা থেকে। এখানে কেনাবেচা বা দামের পূর্বাভাস নেই।', 'How many tonnes each union will harvest, week by week, from the sample farmers’ plans. No buying or price forecasts here.')}</p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">{Object.values(RABI_CROPS).map((c) => <button key={c.id} type="button" onClick={() => setCrop(c.id)} className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${crop === c.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-white text-ink/70'}`}>{L(c.name)}</button>)}</div>
      <Card className="p-5">
        <div className="font-semibold">{T(`${cropName(crop, 'bn')}: প্রতি সপ্তাহে কত টন — ${mine.full.bn} আর উপজেলার বাকি সব এলাকা`, `${cropName(crop, 'en')}: tonnes per week, ${mine.full.en} and the rest of the upazila`)}</div>
        <div className="mt-3" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eef0ec" />
              {dip && <ReferenceArea x1={lab(Math.max(dip[0], lo))} x2={lab(Math.min(dip[1], hi))} fill="#c9932b" fillOpacity={0.12} />}
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5d6d66' }} tickLine={false} axisLine={{ stroke: '#cfd8d3' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5d6d66' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: 'rgba(19, 38, 27, .05)' }} formatter={(v, n) => [`${num(v, lang, { dp: 1 })} ${T('টন', 't')}`, seriesName(n)]} />
              <Legend formatter={seriesName} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="mine" stackId="s" fill="#2f6e2f" />
              <Bar dataKey="rest" stackId="s" fill="#c9cfc6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {dip && <p className="mt-1 text-[12px] text-muted">{T('সোনালি অংশ: যে সপ্তাহগুলোতে কৃষকের বিক্রয়মূল্য সাধারণত স্বাভাবিকের চেয়ে ১০% বা বেশি কম থাকে। কৃষি বিপণন অধিদপ্তরের (DAM) সারা দেশের মাসিক দাম থেকে।', 'Gold band: weeks when farm-gate prices usually sit 10% or more below normal, from Department of Agricultural Marketing (DAM) national monthly prices.')}</p>}
      </Card>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[14px]">
          <thead className="bg-canvas text-[13px] text-muted"><tr>{[T('ইউনিয়ন', 'Union'), T('প্রথম সপ্তাহ', 'First week'), T('সবচেয়ে বেশি যে সপ্তাহে', 'Busiest week'), T('শেষ সপ্তাহ', 'Last week'), T('মোট (টন)', 'Total (t)')].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{windows.map((w) => <tr key={w.u.id}><td className="px-4 py-3 font-semibold">{L(w.u.meta)}</td>{Number.isFinite(w.first) ? <><td className="px-4 py-3">{lab(w.first)}</td><td className="px-4 py-3 font-semibold">{lab(w.peak)}</td><td className="px-4 py-3">{lab(w.last)}</td><td className="px-4 py-3 tabular">{num(w.total, lang, { dp: 1 })}</td></> : <td colSpan={4} className="px-4 py-3 text-muted">—</td>}</tr>)}</tbody>
        </table>
      </Card>
      <Note tone="gold" className="mt-4">{T('সব পরিমাণ আনুমানিক: নমুনা কৃষকদের পরিকল্পনা থেকে জমির মাপ × গড় ফলন।', 'All amounts are estimates: field size × average yield, from the sample farmers’ plans.')} <Tags list={['DEMO']} /></Note>
    </>
  );
}

// The district outlook needs the radar; for an upazila not built yet the page says so.
export function Supply() {
  const { T, officerUpazila } = useStore();
  if (!AMAN.districts[districtOf(officerUpazila.id)]?.upazilas.some((u) => u.id === officerUpazila.id)) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-7 text-amber-900">{T(`${officerUpazila.name.bn} উপজেলার রাডারের তথ্য এখনো তৈরি হয়নি, তাই আমন কাটার হিসাব দেখানো যাচ্ছে না।`, `Radar data for ${officerUpazila.name.en} has not been built yet, so the Aman harvest timing cannot be shown.`)}</div>;
  }
  return <SupplyPage />;
}
