import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Tags, ProgressBar, Note, Badge, RISK_STYLE, WhyButton } from '../../components/ui';
import SupplyChart from '../../components/charts/SupplyChart';
import PriceSeason from '../../components/charts/PriceSeason';
import { RABI_CROPS, cropName } from '../../engine/crops';
import { slotLoad, PRICE_DIP, PRICE_SEASONS, HIGH_FACTOR, weekStart, noHarvestPrices } from '../../engine/glut';
import { num, fmtDate, fmtRange } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { useOfficerUnion, unionGlut, CROP_COLOR, cropsByArea } from './shared';

const RISK_DOT = { Low: 'bg-primary-500', Medium: 'bg-amber-500', High: 'bg-red-500' };

export default function Planting() {
  const { s, T, L, farmers, confirmedAll } = useStore();
  const lang = s.lang;
  const union = useOfficerUnion();
  const [crop, setCrop] = useState(() => cropsByArea([union])[0]?.k ?? 'tomato'); // this union's biggest planned crop first
  const glut = Object.fromEntries(Object.keys(RABI_CROPS).map((k) => [k, unionGlut(union, k)]));
  const g = glut[crop];
  const limit = g.normal * HIGH_FACTOR;
  const binList = [...g.bins.entries()];
  const peakWeek = binList.reduce((a, b) => (b[1] > (a?.[1] ?? -1) ? b : a), null)?.[0];
  const overWeeks = binList.filter(([, t]) => t > limit).length;
  const totalT = binList.reduce((a, [, t]) => a + t, 0);
  const slots = slotLoad(union);
  const mix = Object.keys(RABI_CROPS).map((k) => ({ k, area: union.plans.filter((p) => p.crop === k).reduce((a, p) => a + p.area_dec, 0) }));
  const planned = mix.reduce((a, x) => a + x.area, 0) || 1;
  const undecided = farmers.filter((f) => f.hero && f.union === union.id && !confirmedAll.some((c) => c.plot_id === f.id));
  const why = {
    title: T('দাম পড়ার ঝুঁকি কীভাবে হিসাব হয়', 'How the price-drop warning works'), tags: ['RULE', 'REAL', 'DEMO'],
    blocks: [{ h: T('হিসাব', 'The calculation'), lines: [
      T(`প্রতিটি পরিকল্পনা থেকে: জমির মাপ × দেশের গড় ফলন (FAOSTAT ${num(PRICE_SEASONS.faoYear, 'bn')}), ফসল ওঠার সপ্তাহগুলোতে ভাগ করে কোন সপ্তাহে কত টন।`, `For each plan: field size × Bangladesh's average yield (FAOSTAT ${PRICE_SEASONS.faoYear}), spread over the harvest weeks, gives tonnes per week.`),
      T(`লাল রেখা: স্বাভাবিক সাপ্তাহিক সরবরাহের ${num(HIGH_FACTOR, 'bn', { dp: 1 })} গুণ। এর ওপরে গেলে দাম পড়ার ঝুঁকি বেশি।`, `Red line: ${HIGH_FACTOR}× the normal weekly supply. Above it, the risk of a price drop is high.`),
      T('সোনালি অংশ: যে মাসগুলোতে কৃষকের বিক্রয়মূল্য সাধারণত স্বাভাবিকের চেয়ে ১০% বা বেশি কম থাকে। কৃষি বিপণন অধিদপ্তরের (DAM) সারা দেশের মাসিক দাম থেকে, অনেক বছরের গড়ে।', 'Gold band: the months when farm-gate prices usually sit 10% or more below normal, from many years of DAM national monthly prices.'),
      T('ঝুঁকি বেশি: যে সপ্তাহে ফসল লাল রেখার ওপরে আর দামও সাধারণত কমে। মাঝারি: এর যেকোনো একটি।', 'High risk: a week above the red line that also falls in the price-dip months. Medium: either one.'),
      T('লাগানোর পালা: প্রতিটি পালায় স্বাভাবিক টমেটো জমির চার ভাগের এক ভাগ × ১.৩ পর্যন্ত জায়গা। ভরে গেলে পরের কৃষককে অন্য সময় বা অন্য ফসলের কথা বলা হয়।', 'Planting slots: each slot holds up to a quarter of normal tomato land × 1.3. When it fills, the next farmer is offered another time or crop.')] }],
    sources: [
      T('দামের মৌসুম: কৃষি বিপণন অধিদপ্তর (DAM), market.dam.gov.bd', 'Price seasons: Department of Agricultural Marketing (DAM), market.dam.gov.bd'),
      T(`ফলন: FAOSTAT, বাংলাদেশ ${num(PRICE_SEASONS.faoYear, 'bn')}`, `Yields: FAOSTAT, Bangladesh ${PRICE_SEASONS.faoYear}`),
      T('কৃষকদের পরিকল্পনা ও স্বাভাবিক ফসলের ভাগ: নমুনা তথ্য। অ্যাপে কৃষকেরা যে পরিকল্পনা পাকা করেন, সেগুলো সঙ্গে সঙ্গে যোগ হয়।', 'Farmer plans and the normal crop mix: sample data. Plans farmers confirm in the app are added straight away.'),
    ],
  };
  return (
    <div>
      <PageHeader eyebrow={T('সবাই মিলে পরিকল্পনা', 'Planning together')} title={T('লাগানোর সময় ও দাম পড়ার ঝুঁকি', 'Planting time and price-drop risk')} subtitle={T(`${union.meta.full.bnOf} কৃষকদের পরিকল্পনা ধরে, কোন সপ্তাহে কত ফসল উঠবে।`, `How much ${union.meta.en} will harvest each week, based on farmers’ plans.`)} tags={['RULE', 'REAL', 'DEMO']} action={<WhyButton payload={why} />} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="self-start p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={T('ফসল', 'Crop')}>{Object.values(RABI_CROPS).map((c) => {
              const cg = glut[c.id], on = crop === c.id, has = cg.bins.size > 0;
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => setCrop(c.id)} title={has ? `${T('ঝুঁকি', 'Risk')}: ${L(RISK_STYLE[cg.risk.level])}` : T('কোনো পরিকল্পনা নেই', 'No plans')}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition ${on ? 'border-primary-600 bg-primary-600 text-white' : `border-border bg-white hover:border-primary-300 ${has ? 'text-ink/75' : 'text-ink/40'}`}`}>
                  <i className={`inline-block h-2 w-2 rounded-full ${has ? RISK_DOT[cg.risk.level] : 'border border-current'} ${on ? 'ring-2 ring-white/70' : ''}`} aria-hidden="true" />
                  {L(c.name)}
                </button>
              );
            })}</div>
            <span className={`chip !text-[12.5px] ${RISK_STYLE[g.risk.level].cls}`}>{T('দাম পড়ার ঝুঁকি', 'Price-drop risk')}: {L(RISK_STYLE[g.risk.level])}</span>
          </div>
          {g.bins.size > 0 && (
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-canvas px-3 py-2.5"><dt className="text-[12.5px] text-muted">{T('সবচেয়ে ব্যস্ত সপ্তাহ', 'Busiest week')}</dt><dd className="mt-0.5 text-[17px] font-bold tabular">{fmtDate(weekStart(peakWeek), lang)}</dd><dd className={`text-[12.5px] font-semibold ${g.peak > HIGH_FACTOR ? 'text-red-700' : 'text-muted'}`}>{T(`স্বাভাবিকের ${num(g.peak, 'bn', { dp: 1 })} গুণ`, `${num(g.peak, 'en', { dp: 1 })}× normal`)}</dd></div>
              <div className="rounded-xl bg-canvas px-3 py-2.5"><dt className="text-[12.5px] text-muted">{T('সীমার ওপরে', 'Above the line')}</dt><dd className={`mt-0.5 text-[17px] font-bold tabular ${overWeeks ? 'text-red-700' : ''}`}>{T(`${num(overWeeks, 'bn')} সপ্তাহ`, `${overWeeks} week${overWeeks === 1 ? '' : 's'}`)}</dd><dd className="text-[12.5px] text-muted">{T(`মোট ${num(g.bins.size, 'bn')} সপ্তাহের মধ্যে`, `out of ${g.bins.size}`)}</dd></div>
              <div className="rounded-xl bg-canvas px-3 py-2.5"><dt className="text-[12.5px] text-muted">{T('মোট ফসল উঠবে', 'Total harvest')}</dt><dd className="mt-0.5 text-[17px] font-bold tabular">{num(totalT, lang, { dp: 1 })} {T('টন', 't')}</dd><dd className="text-[12.5px] text-muted">{T(`স্বাভাবিক: ${num(g.normal, 'bn', { dp: 1 })} টন/সপ্তাহ`, `normal: ${num(g.normal, 'en', { dp: 1 })} t/week`)}</dd></div>
            </dl>
          )}
          <div className="mt-4"><SupplyChart bins={g.bins} normal={g.normal} dip={PRICE_DIP[crop]} height={260} legend /></div>
          {g.bins.size ? (
            <Note tone={overWeeks ? (g.risk.level === 'High' ? 'warn' : 'gold') : 'ok'} className="mt-4">
              {overWeeks
                ? T(`${bnOf(cropName(crop, 'bn'))} ${num(overWeeks, 'bn')} সপ্তাহে ফসল সীমার ওপরে উঠবে। যাঁরা এখনো ঠিক করেননি, তাঁদের আগে বা পরে লাগাতে, অথবা অন্য ফসল করতে বলুন।`, `${cropName(crop, 'en')} goes above the line in ${overWeeks} week${overWeeks === 1 ? '' : 's'}. Ask farmers who have not decided yet to plant earlier or later, or to grow another crop.`)
                : T('কোনো সপ্তাহেই ফসল সীমার ওপরে যাচ্ছে না। এখনকার পরিকল্পনা ঠিক আছে।', 'No week goes above the line. The current plans look fine.')}
              {!PRICE_DIP[crop] && <span className="mt-0.5 block text-[13px] opacity-80">{noHarvestPrices(crop) ? T('ফসল তোলার মাসগুলোর দাম DAM-এর তথ্যে নেই, তাই ঝুঁকি শুধু সরবরাহ দেখে ধরা হয়েছে।', 'DAM has no prices for the harvest months, so the risk is judged on supply alone.') : T('DAM-এর দামের হিসাবে এই ফসলের দাম ফসল তোলার মৌসুমে খুব একটা কমে না, তাই ঝুঁকি শুধু সরবরাহ দেখে ধরা হয়েছে।', 'DAM prices show no regular price dip for this crop at harvest, so the risk is judged on supply alone.')}</span>}
            </Note>
          ) : <p className="mt-2 text-[13.5px] text-muted">{T('এই ফসলের কোনো পরিকল্পনা এখনো নেই।', 'No plans for this crop yet.')}</p>}
        </Card>
        <div className="space-y-6">
          <Card className="p-5"><PriceSeason crop={crop} cropLabel={cropName(crop, lang)} /></Card>
          {/* Planting slots are a tomato practice (staggered transplanting); shown when tomato is the crop in view. */}
          {crop === 'tomato' && (
            <Card className="p-5">
              <h2 className="text-[19px] font-bold">{T('টমেটো লাগানোর পালা', 'Tomato planting slots')}</h2>
              <div className="mt-3 space-y-3">
                {slots.map((sl) => (
                  <div key={sl.id}>
                    <div className="flex justify-between text-[14px]"><span className="font-semibold">{fmtRange(sl.from, sl.to, lang)}</span><span className={sl.full ? 'font-bold text-red-700' : 'text-muted'}>{sl.full ? T('ভরে গেছে', 'Full') : T(`${num((sl.load / sl.cap) * 100, 'bn')}% ভরা`, `${num((sl.load / sl.cap) * 100, 'en')}% full`)}</span></div>
                    <ProgressBar value={(sl.load / sl.cap) * 100} color={sl.full ? 'bg-red-500' : 'bg-primary-500'} className="mt-1" />
                  </div>
                ))}
              </div>
              <Note tone="gold" className="mt-4">{T('কোনো পালা ভরে গেলে নতুন কৃষককে অন্য সপ্তাহে লাগাতে, বা জমির অর্ধেকে অন্য ফসল করতে বলুন। তাতে ভিড় শুধু এক সপ্তাহ থেকে আরেক সপ্তাহে সরে যায় না।', 'When a slot is full, suggest another week or a second crop on half the land, so the crowd does not just move to the next week.')}</Note>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-[19px] font-bold">{T('কোন ফসলে কত জমি', 'Land by crop')}</h2>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-black/5">{mix.map((x) => <div key={x.k} style={{ width: `${(x.area / planned) * 100}%`, background: CROP_COLOR[x.k] }} title={cropName(x.k, lang)} />)}</div>
            <ul className="mt-3 space-y-0.5 text-[14px]">{mix.map((x) => <li key={x.k}><button type="button" onClick={() => setCrop(x.k)} aria-pressed={crop === x.k} className={`-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-lg px-2 py-1 text-left transition ${crop === x.k ? 'bg-primary-50 font-semibold' : 'hover:bg-black/[.03]'}`}><span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CROP_COLOR[x.k] }} />{cropName(x.k, lang)}</span><b className="tabular">{num((x.area / planned) * 100, lang)}%</b></button></li>)}</ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2"><h2 className="text-[19px] font-bold">{T('এখনো ঠিক করেননি', 'Not decided yet')}</h2><Tags list={['DEMO']} /></div>
            {undecided.length === 0 ? <p className="mt-2 text-[14px] text-muted">{T('এই ইউনিয়নের নমুনা কৃষকেরা সবাই পরিকল্পনা পাকা করেছেন।', 'All sample farmers in this union have confirmed their plans.')}</p> : (
              <ul className="mt-2 divide-y divide-border">{undecided.map((f) => <li key={f.id}><Link to={`/officer/farmers/${f.id}`} className="group flex items-center justify-between gap-2 py-2.5 text-[14.5px]"><span className="font-semibold group-hover:text-primary-700">{L(f.name)}</span><span className="inline-flex items-center gap-1"><Badge tone="slate"><Phone size={12} />{T('ফোন করে জানান', 'Give a call')}</Badge><ChevronRight size={16} className="text-muted transition group-hover:translate-x-0.5" /></span></Link></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
