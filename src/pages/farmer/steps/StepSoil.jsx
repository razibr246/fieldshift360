// Season planner step 3: the soil, from real sources only. SoilGrids (ISRIC) for the field's own 250 m cell, SRDI's
// fertilizer recommendation for the union (built on SRDI's soil tests), and what a farmer should do about each.
// Where no source has a value (P, K, S, Zn, B levels; a field soil test) the screen says so instead of guessing.
import { useState } from 'react';
import { Layers, FlaskConical, Droplets, Sprout, ExternalLink, AlertTriangle, CheckCircle2, Info, TestTube } from 'lucide-react';
import { useStore } from '../../../store';
import { StepHeader, Card, Tags, WhyButton, MiniBar } from '../../../components/ui';
import { RABI_CROPS, cropName } from '../../../engine/crops.js';
import { soilFit } from '../../../engine/decision.js';
import { fertilizerPlan, phWord, PH_GOOD, TEXTURE, WRB, LAND_TYPES, PRICE_SRC } from '../../../engine/soil.js';
import { num } from '../../../engine/dates.js';

const SRC = {
  soilgrids: { label: 'ISRIC SoilGrids 2.0, 250 m (CC BY 4.0)', url: 'https://soilgrids.org' },
  srdi: { label: 'SRDI Fertilizer Recommendation System (frs-bd.com)', url: 'http://frs-bd.com/' },
  srdiPh: { label: 'SRDI Rajshahi seminar, June 2026: pH 5.6–7.3, dolomite 3–10 kg per decimal by soil test (BSS)', url: 'https://www.bssnews.net/district/397868' },
  om: { label: 'Banglapedia: about 70% of high and medium-high land has under 2% organic matter', url: 'https://en.banglapedia.org/index.php/Soil_Organic_Matter' },
  lab: { label: 'SRDI mobile soil labs: Tk 25 per sample for pH, P, K, S (Jago News, 2025)', url: 'https://www.jagonews24.com/en/sci-tech/news/78422' },
};
const TONE = { ok: 'text-primary-800 bg-primary-50 ring-primary-200', watch: 'text-amber-800 bg-amber-50 ring-amber-200', warn: 'text-red-800 bg-red-50 ring-red-200' };

export default function StepSoil() {
  const { s, T, L, soil, union, chosen, farmer, activeParcel, srdiUnion } = useStore();
  const lang = s.lang;
  const [crop, setCrop] = useState(chosen.crop.id);
  const [land, setLand] = useState(soil.tested?.land ?? null);
  const [phys, setPhys] = useState(null);
  const area = activeParcel?.area_dec ?? farmer.area_dec;
  const plan = fertilizerPlan(srdiUnion, crop, { land, areaDec: area, phys, landform: soil.landform });
  const ph = phWord(soil.ph);
  const tex = TEXTURE[soil.texture];
  const wrb = soil.wrb?.[0];
  const fits = Object.values(RABI_CROPS).map((c) => ({ c, f: soilFit(c, soil) })).sort((a, b) => b.f.score - a.f.score);
  const where = soil.scope === 'field' ? T(`আপনার জমি (${activeParcel?.name.bn ?? ''})`, `your field (${activeParcel?.name.en ?? ''})`) : L(union.meta.full);
  const kgTxt = (x) => (x == null ? '–' : x >= 1 ? `${num(x, lang, { dp: x < 10 ? 1 : 0 })} ${T('কেজি', 'kg')}` : `${num(Math.round(x * 1000), lang)} ${T('গ্রাম', 'g')}`);

  const why = {
    title: T('মাটির হিসাব কীভাবে কাজে লাগে', 'How the soil is used'), tags: ['REAL', 'RULE'],
    blocks: [
      { h: T('নিয়মগুলো', 'The rules'), lines: [
        T('মাটির pH ফসলের পছন্দের মধ্যে থাকলে ১০০ নম্বর; একটু বাইরে (০.৫-এর মধ্যে) হলে ৬৫; তার বেশি বাইরে হলে ৩০।', 'Soil pH inside the crop’s range scores 100; just outside (within 0.5) scores 65; further out scores 30.'),
        T('যে ফসল পানি জমা সহ্য করে না, তা পানি আটকে থাকা মাটিতে (গ্লেসল, প্ল্যানোসল) হলে ১০ নম্বর কম।', 'Crops that hate standing water lose 10 on soils that stay wet (Gleysols, Planosols).')] },
      { h: T('আপনার এলাকায় কোন ফসলের সঙ্গে মাটি কতটা মেলে', 'How each crop matches the soil here'), table: { head: [T('ফসল', 'Crop'), T('নম্বর', 'Score'), T('কারণ', 'Reason')], rows: fits.map(({ c, f }) => [L(c.name), num(f.score, lang), f.notes.map(L).join('। ')]) } },
    ],
    sources: [SRC.soilgrids.label, SRC.srdi.label],
  };

  return (
    <div>
      <StepHeader kicker={T('ধাপ ৩, মাটি', 'Step 3, soil')} title={T('আপনার জমির মাটি কেমন হতে পারে', 'What your soil is likely to be')}
        sub={T(`${where}। আন্তর্জাতিক মাটির মানচিত্র (SoilGrids) আর মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউটের (SRDI) ইউনিয়নের মাটি পরীক্ষার তথ্য থেকে। কোনো সংখ্যা বানানো নয়।`, `${where}. From the global soil map (SoilGrids) and the Soil Resource Development Institute’s (SRDI) union soil tests. No number is made up.`)}
        tags={['MODEL', 'RECORD', 'RULE']} />

      {/* ---- the soil itself ---- */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[17px] font-bold"><Layers size={18} className="text-clay-500" />{T('মাটির ধরন, ওপরের ৩০ সেমি', 'The soil, top 30 cm')}</h3>
          <span className="text-[12.5px] text-muted">{soil.tested ? T('pH ও জৈব পদার্থ: আপনার মাটি পরীক্ষা', 'pH and organic matter: your soil test') : soil.scope === 'field' ? T('আপনার জমির ২৫০ মিটারের ঘর', 'Your field’s 250 m cell') : T('ইউনিয়নের মাঝখান', 'Union centre')}</span>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14.5px] font-semibold">{T('মাটি কতটা টক (pH)', 'How acidic (pH)')}</span>
            <span className="flex items-baseline gap-2"><span className="font-display text-[22px] font-bold">{num(soil.ph, lang, { dp: 1 })}</span>{ph && <span className={`rounded-full px-2 py-0.5 text-[12.5px] font-semibold ring-1 ${TONE[ph.tone]}`}>{L(ph)}</span>}</span>
          </div>
          <PhBar ph={soil.ph} range={soil.ph_range} lang={lang} T={T} />
          <p className="mt-1.5 text-[12.5px] text-muted">{T(`সবুজ ঘর: SRDI-র হিসাবে pH ${num(PH_GOOD[0], 'bn', { dp: 1 })}–${num(PH_GOOD[1], 'bn', { dp: 1 })}-এ ফসল সবচেয়ে সহজে খাবার পায়। ${soil.ph_range ? `ধূসর দাগ: মানচিত্রের ৯০% অনিশ্চয়তা (${num(soil.ph_range[0], 'bn', { dp: 1 })}–${num(soil.ph_range[1], 'bn', { dp: 1 })})।` : 'কালো দাগ: আপনার মাটি পরীক্ষার pH।'}`, `Green band: SRDI’s pH ${PH_GOOD[0]}–${PH_GOOD[1]}, where crops take up nutrients most easily.${soil.ph_range ? ` Grey: the map’s 90% range (${soil.ph_range[0]}–${soil.ph_range[1]}).` : ' The mark is your soil test’s pH.'}`)}</p>
        </div>
        {soil.ph_range && soil.ph_range[1] - soil.ph_range[0] > 2 && (
          <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] leading-5 text-amber-900 ring-1 ring-amber-200"><AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {T(`মানচিত্রটা এখানে pH নিয়ে নিশ্চিত নয়: আসল মান ${num(soil.ph_range[0], 'bn', { dp: 1 })} থেকে ${num(soil.ph_range[1], 'bn', { dp: 1 })} যেকোনো কিছু হতে পারে।${soil.landform === 'barind' ? ' SRDI জানিয়েছে উঁচু বরেন্দ্রের অনেক জমি টক হয়ে গেছে।' : ''} চুন দেওয়ার আগে মাটি পরীক্ষা করান।`, `The map is unsure about pH here: the true value could be anywhere from ${soil.ph_range[0]} to ${soil.ph_range[1]}.${soil.landform === 'barind' ? ' SRDI reports that much High Barind land has turned acidic.' : ''} Test the soil before liming.`)}
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Stat label={T('জৈব পদার্থ', 'Organic matter')} value={`${num(soil.om_pct, lang, { dp: 1 })}%`}
            note={T(`৯০% সম্ভাব্য সীমা ${num(soil.om_range?.[0], 'bn', { dp: 1 })}–${num(soil.om_range?.[1], 'bn', { dp: 1 })}%। দেশের উঁচু ও মাঝারি উঁচু জমির প্রায় ৭০%-এ ২%-এর কম।`, `90% range ${soil.om_range?.[0]}–${soil.om_range?.[1]}%. About 70% of Bangladesh’s high and medium-high land has under 2%.`)}>
            <MiniBar value={Math.min(100, (soil.om_pct / 4) * 100)} color={soil.om_pct < 2 ? 'bg-paddy-500' : 'bg-primary-500'} className="mt-1.5" />
          </Stat>
          <Stat label={T('মোট নাইট্রোজেন', 'Total nitrogen')} value={`${num(soil.n_total_pct, lang, { dp: 2 })}%`}
            note={T('মাটিতে জমা মোট নাইট্রোজেন; ফসল এখনই কতটা পাবে তা নয়। ইউরিয়ার মাত্রা নিচে SRDI-র সুপারিশে।', 'Nitrogen stored in the soil, not what the crop can take up now. The urea dose is in SRDI’s advice below.')} />
          <Stat label={T('মাটির বুনট', 'Texture')} value={tex ? L(tex) : soil.texture}
            note={T(`এঁটেল ${num(soil.clay, 'bn')}%, পলি ${num(soil.silt, 'bn')}%, বালি ${num(soil.sand, 'bn')}%`, `Clay ${soil.clay}%, silt ${soil.silt}%, sand ${soil.sand}%`)}>
            <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full" role="img" aria-label={T('এঁটেল, পলি আর বালির ভাগ', 'Clay, silt and sand shares')}>
              <span style={{ width: `${soil.clay}%`, background: '#8a5a3b' }} /><span className="border-l-2 border-white" style={{ width: `${soil.silt}%`, background: '#c4a27a' }} /><span className="border-l-2 border-white" style={{ width: `${soil.sand}%`, background: '#e7d4a8' }} />
            </div>
          </Stat>
          <Stat label={T('খাবার ধরে রাখার ক্ষমতা (CEC)', 'Nutrient-holding capacity (CEC)')} value={`${num(soil.cec, lang, { dp: 0 })} cmol/kg`}
            note={T('যত বেশি, তত বেশি সার মাটিতে ধরে থাকে, পানিতে ধুয়ে যায় কম।', 'The higher it is, the more fertiliser the soil holds instead of losing it to water.')} />
        </div>

        {wrb && (
          <div className="mt-4 flex gap-2.5 rounded-xl bg-canvas p-3.5 text-[14px] leading-6">
            <Droplets size={18} className="mt-0.5 shrink-0 text-sky-700" />
            <div>
              <div className="font-semibold">{WRB[wrb.name] ? L(WRB[wrb.name]) : wrb.name} <span className="font-normal text-muted">({T(`সম্ভাবনা ${num(wrb.p, 'bn')}%`, `${wrb.p}% likely`)})</span></div>
              <div className="text-ink/80">{soil.drainage === 'poor' ? T('পানি সহজে নামে না। শীতের সবজি, সরিষা আর গম উঁচু বেডে লাগান, চারপাশে নালা রাখুন; ধানের জন্য এই মাটি ভালো।', 'Water drains slowly. Grow winter vegetables, mustard and wheat on raised beds with drains; this soil suits rice.')
                : soil.drainage === 'good' ? T('পানি দ্রুত নেমে যায়; সেচ ঘন ঘন লাগবে।', 'Water drains fast; it will need frequent irrigation.')
                  : T('পানি মাঝারি গতিতে নামে।', 'Water drains at a moderate pace.')}</div>
              {soil.wrb.length > 1 && <div className="mt-0.5 text-[12.5px] text-muted">{T('অন্য সম্ভাবনা', 'Also possible')}: {soil.wrb.slice(1).map((w) => `${w.name} ${num(w.p, lang)}%`).join(', ')}</div>}
            </div>
          </div>
        )}
        <Sources list={[SRC.soilgrids, SRC.om]} T={T} />
      </Card>

      {/* ---- SRDI fertilizer advice ---- */}
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[17px] font-bold"><FlaskConical size={18} className="text-primary-600" />{T('কতটা সার দেবেন (SRDI)', 'How much fertiliser (SRDI)')}</h3>
          <Tags list={['RECORD']} />
        </div>
        <p className="mt-1 text-[13.5px] text-muted">{T(`মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট ${L(union.meta.full)}-এর মাটি পরীক্ষা থেকে এই মাত্রা ঠিক করেছে। আপনার ${num(area, 'bn')} শতক জমির জন্য হিসাব করা।`, `SRDI set these doses from its soil tests in ${L(union.meta.full)}, worked out for your ${area} decimal.`)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={T('ফসল', 'Crop')}>
          {Object.values(RABI_CROPS).map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={crop === c.id} onClick={() => setCrop(c.id)}
              className={`rounded-lg border px-3 py-1.5 text-[13.5px] font-semibold ${crop === c.id ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-border hover:bg-primary-50'}`}>{L(c.name)}</button>
          ))}
        </div>
        {plan?.types?.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-muted">{T('SRDI-র মাটির ধরন', 'SRDI soil type')}:</span>
            {plan.types.map((t) => (
              <button key={t} type="button" onClick={() => setPhys(t)} aria-pressed={plan.physiography === t}
                className={`rounded-full px-2.5 py-1 ring-1 ${plan.physiography === t ? 'bg-primary-700 text-white ring-primary-700' : 'ring-border hover:bg-primary-50'}`}>{t}</button>
            ))}
            <span className="text-[12px] text-muted">{T('এই ইউনিয়নে SRDI দুই ধরনের মাটির জন্য আলাদা মাত্রা দেয়; আপনার জমি যেটায়, সেটা বাছুন।', 'SRDI gives separate doses for both soils in this union; pick the one your field is on.')}</span>
          </div>
        )}
        {plan && !plan.none && plan.lands.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-muted">{T('জমির ধরন', 'Land type')}:</span>
            {plan.lands.map((l) => (
              <button key={l} type="button" onClick={() => setLand(l)} title={L(LAND_TYPES[l].detail)} aria-pressed={plan.land === l}
                className={`rounded-full px-2.5 py-1 ring-1 ${plan.land === l ? 'bg-primary-700 text-white ring-primary-700' : 'ring-border hover:bg-primary-50'}`}>{L(LAND_TYPES[l])}</button>
            ))}
          </div>
        )}
        {!srdiUnion ? (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-[14px]">{T('এই ইউনিয়নের SRDI সুপারিশ এখনো আনা হয়নি।', 'SRDI’s advice for this union has not been fetched yet.')}</p>
        ) : !plan || plan.none ? (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-[14px]">{T(`SRDI এই ইউনিয়নে ${cropName(crop, 'bn')}-এর জন্য রবি মৌসুমে কোনো সুপারিশ দেয়নি।`, `SRDI gives no Rabi advice for ${cropName(crop, 'en').toLowerCase()} in this union.`)}</p>
        ) : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead className="text-[12.5px] text-muted"><tr>
                  <th className="py-2 pr-3 font-semibold">{T('সার', 'Fertiliser')}</th>
                  <th className="py-2 pr-3 font-semibold">{T(`আপনার ${num(area, 'bn')} শতকে`, `For your ${area} dec`)}</th>
                  <th className="py-2 pr-3 font-semibold">{T('প্রতি বিঘায়', 'Per bigha')}</th>
                  <th className="py-2 pr-3 font-semibold">{T('সরকারি দামে', 'At the official price')}</th>
                  <th className="py-2 font-semibold">{T('কখন', 'When')}</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {plan.items.map((it) => (
                    <tr key={it.nutrient + it.fertilizer} className={it.notNeeded ? 'text-muted' : ''}>
                      <td className="py-2 pr-3"><div className="font-semibold">{it.fertilizer.replace(/\s*\(.*\)/, '')}</div><div className="text-[12px] text-muted">{it.nutrient}</div></td>
                      <td className="py-2 pr-3 font-display text-[15.5px] font-bold">{it.notNeeded ? <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-700"><CheckCircle2 size={14} />{T('লাগবে না', 'Not needed')}</span> : it.kg == null ? T('প্রয়োজন মতো', 'As needed') : kgTxt(it.kg)}</td>
                      <td className="py-2 pr-3 text-muted">{it.notNeeded || it.kgPerBigha == null ? '' : kgTxt(it.kgPerBigha)}</td>
                      <td className="py-2 pr-3">{it.cost != null && it.cost > 0 ? `${num(it.cost, lang)} ${T('টাকা', 'Tk')}` : ''}</td>
                      <td className="py-2 text-[12.5px] leading-5 text-ink/75">{it.how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-primary-50 p-3 text-[14px]">
                <div className="text-[12.5px] text-primary-800">{T('ইউরিয়া, টিএসপি, এমওপির খরচ (সরকারি দামে)', 'Urea, TSP and MoP at the official price')}</div>
                <div className="font-display text-[20px] font-bold">{num(plan.cost, lang)} {T('টাকা', 'Tk')}</div>
                {plan.unpriced.length > 0 && <div className="text-[12px] text-muted">{T('জিপসাম, দস্তা, বোরনের সরকারি দাম নেই; বাজারদরে আলাদা।', 'Gypsum, zinc and boron have no official price; add the local price.')}</div>}
              </div>
              {plan.enough.length > 0 && (
                <div className="rounded-xl bg-canvas p-3 text-[14px] leading-6">
                  <div className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={15} className="text-primary-700" />{T('মাটিতে যথেষ্ট আছে', 'Already enough in the soil')}</div>
                  <div className="text-ink/80">{plan.enough.join(', ')}{T(' — SRDI-র পরীক্ষায় এই ইউনিয়নে এগুলো দিতে হবে না।', ' — by SRDI’s tests these need not be added in this union.')}</div>
                </div>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-muted">{T(`জাত: ${plan.variety}। মাটির ধরন: ${plan.physiography}। জমির ধরন: ${L(LAND_TYPES[plan.land])} (${L(LAND_TYPES[plan.land].detail)})।`, `Varieties: ${plan.variety}. Soil: ${plan.physiography}. Land type: ${L(LAND_TYPES[plan.land])} (${L(LAND_TYPES[plan.land].detail)}).`)}</p>
          </>
        )}
        <Sources list={[SRC.srdi, PRICE_SRC]} T={T} />
      </Card>

      {/* ---- what to do ---- */}
      <Card className="mt-4 p-5">
        <h3 className="flex items-center gap-2 text-[17px] font-bold"><Sprout size={18} className="text-primary-600" />{T('মাটির জন্য যা করবেন', 'What to do for the soil')}</h3>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-6">
          {soil.ph < PH_GOOD[0] && <Do icon={AlertTriangle} tone="text-amber-700">{T(`মাটি টক (pH ${num(soil.ph, 'bn', { dp: 1 })})। SRDI মাটি পরীক্ষা করে ডলোমাইট চুন দিতে বলে: সাধারণত প্রতি শতকে ৩–১০ কেজি (বেলে মাটিতে কম, এঁটেলে বেশি), অর্থাৎ বিঘায় ১০০–৩৩০ কেজি।`, `The soil is acidic (pH ${soil.ph}). SRDI advises dolomite lime after a soil test: usually 3–10 kg per decimal (less on sandy soil, more on clay), that is 100–330 kg per bigha.`)}</Do>}
          {soil.ph > PH_GOOD[1] && <Do icon={Info} tone="text-sky-700">{T('মাটি একটু ক্ষারীয়; দস্তা আর বোরন কম পেতে পারে। SRDI-র মাত্রায় জিংক ও বোরন দিন।', 'The soil is slightly alkaline, so zinc and boron can run short. Give them at SRDI’s dose.')}</Do>}
          {soil.om_pct < 2 && <Do icon={Sprout} tone="text-primary-700">{T(`জৈব পদার্থ ${num(soil.om_pct, 'bn', { dp: 1 })}%। প্রতি মৌসুমে গোবর বা কম্পোস্ট দিন, ফসলের নাড়া মাটিতে মিশিয়ে দিন, পোড়াবেন না।`, `Organic matter is ${soil.om_pct}%. Add manure or compost every season and plough crop residues back in instead of burning them.`)}</Do>}
          <Do icon={TestTube} tone="text-violet-700">{T('এই হিসাব মানচিত্র আর ইউনিয়নের গড় থেকে; আপনার জমির নিজের পরীক্ষা নয়। SRDI-র ভ্রাম্যমাণ মাটি পরীক্ষাগারে মাত্র ২৫ টাকায় pH, ফসফরাস, পটাশ আর গন্ধক মাপা যায়; উপজেলা কৃষি অফিসে খোঁজ নিন।', 'This comes from a map and the union’s tests, not your own field. SRDI’s mobile soil labs measure pH, phosphorus, potash and sulphur for Tk 25; ask the upazila agriculture office.')}</Do>
        </ul>
        <Sources list={[SRC.srdiPh, SRC.lab]} T={T} />
      </Card>

      {/* ---- which crops suit it ---- */}
      <Card className="mt-4 p-4">
        <div className="mb-2 flex items-center justify-between"><div className="text-[15px] font-semibold">{T('কোন ফসলের সঙ্গে মাটি মেলে', 'Which crops suit this soil')}</div><WhyButton small payload={why} /></div>
        <ul className="divide-y divide-border">
          {fits.map(({ c, f }) => (
            <li key={c.id} className="grid grid-cols-[88px_64px_1fr] items-center gap-3 py-2 text-[14px]">
              <span className="font-semibold">{L(c.name)}</span>
              <MiniBar value={f.score} color={f.score >= 80 ? 'bg-primary-500' : f.score >= 55 ? 'bg-paddy-500' : 'bg-red-500'} />
              <span className="leading-snug text-muted">{L(f.notes[f.notes.length - 1])}</span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-3 text-[13px] text-muted">{T('ফসফরাস, পটাশ, গন্ধক, দস্তা আর বোরনের মাত্রা কোনো খোলা মানচিত্রে নেই; তাই সেগুলোর "কম/বেশি" লেখা হয়নি, SRDI-র সারের মাত্রাতেই সেগুলোর হিসাব আছে।', 'Phosphorus, potash, sulphur, zinc and boron levels are on no open map, so no "low/high" is shown for them; SRDI’s doses already account for them.')}</p>
    </div>
  );
}

const Stat = ({ label, value, note, children }) => (
  <div className="rounded-xl bg-canvas p-3">
    <div className="text-[12.5px] text-muted">{label}</div>
    <div className="font-display text-[19px] font-bold leading-tight">{value}</div>
    {children}
    {note && <p className="mt-1.5 text-[12.5px] leading-5 text-muted">{note}</p>}
  </div>
);
const Do = ({ icon: Icon, tone, children }) => <li className="flex gap-2.5"><Icon size={17} className={`mt-1 shrink-0 ${tone}`} /><span>{children}</span></li>;

function PhBar({ ph, range, lang, T }) {
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - 4) / 5) * 100))}%`;
  return (
    <div className="mt-2">
      <div className="relative h-3 rounded-full" style={{ background: 'linear-gradient(90deg,#d08f26,#e3cf6a,#8dbe78,#5aa6a8,#5e74b6)' }}>
        <div className="absolute inset-y-0 rounded-full ring-2 ring-primary-700/70" style={{ left: pos(PH_GOOD[0]), width: `calc(${pos(PH_GOOD[1])} - ${pos(PH_GOOD[0])})` }} />
        {range && <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-ink/35" style={{ left: pos(range[0]), width: `calc(${pos(range[1])} - ${pos(range[0])})` }} />}
        <div className="absolute -top-1.5 h-6 w-1.5 rounded bg-ink" style={{ left: `calc(${pos(ph)} - 3px)` }} />
      </div>
      <div className="mt-1 flex justify-between text-[12px] text-muted">{[4, 5, 6, 7, 8, 9].map((v) => <span key={v}>{num(v, lang)}</span>)}</div>
      <div className="flex justify-between text-[12px] text-muted"><span>{T('টক', 'acidic')}</span><span>{T('ক্ষারীয়', 'alkaline')}</span></div>
    </div>
  );
}

function Sources({ list, T }) {
  return (
    <div className="mt-3 text-[12.5px] leading-5 text-muted">
      <span className="font-semibold">{T('সূত্র', 'Sources')}: </span>
      {list.map((src, i) => <span key={src.url}>{i > 0 && ' · '}<a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-primary-700">{src.label}<ExternalLink size={11} /></a></span>)}
    </div>
  );
}
