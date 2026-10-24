// Water under the field and in its root zone, from two NASA satellites through GIBS (scripts/fetch/gibs-water.mjs):
// GRACE/GRACE-FO, the water stored on and under the land in the region, year by year since 2003; and SMAP, the
// root-zone soil moisture in the latest month against the same month in every year since 2015. Used by Field Future
// in Bangladesh and by the neighbouring-country farm pages. [REAL]
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Waves, Sprout } from 'lucide-react';
import { useStore } from '../../store';
import { Note } from '../ui';
import { num, bnDigits, MONTHS_BN, MONTHS_EN } from '../../engine/dates';
import waterSat from '../../data/water/water_sat.json';
import soilWetness from '../../data/water/soil_wetness.json';
import { graceRecord, smapNow, smapVsPower, GRACE_CAP } from '../../engine/soilwater';

const MUTED = '#5d6a63', GRID = '#eef0ec';
const BD = new Set(['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']);
const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

export default function SatWater({ id }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const g = useMemo(() => graceRecord(waterSat, id), [id]);
  const sm = useMemo(() => smapNow(waterSat, id), [id]);
  const chk = useMemo(() => smapVsPower(waterSat, soilWetness, id), [id]);
  if (!g && !sm) return null;
  const tick = { fontSize: 11, fill: MUTED };
  const data = g?.years.map((y) => ({ year: y.year, cm: Math.round(y.cm * 10) / 10, trend: g.trend ? Math.round(g.trend.line(y.year) * 10) / 10 : null })) ?? [];
  const falling = g?.trend && g.trend.p < 0.05 && g.trend.perDecade < 0, rising = g?.trend && g.trend.p < 0.05 && g.trend.perDecade > 0;
  const mon = sm ? (lang === 'bn' ? MONTHS_BN : MONTHS_EN)[+sm.month.slice(5) - 1] : '';
  const yr = (y) => (lang === 'bn' ? bnDigits(y) : y);
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
      {g && (
        <div className="rounded-2xl border border-border bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[14px] font-bold"><Waves size={16} className="text-sky-700" />{T('মাটির ওপরে-নিচে জমা পানি, GRACE উপগ্রহ', 'Water stored on and under the land, GRACE satellites')}</div>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{T('মাটি, ভূগর্ভ, নদী-পুকুর মিলিয়ে মোট পানি, ২০০৪–২০০৯-এর গড়ের তুলনায়, সেন্টিমিটারে। প্রতি বছরের গড়।', 'Soil, groundwater, rivers and ponds together, against the 2004–2009 mean, in centimetres of water. Yearly means.')}</p>
          <div className="mt-2 h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -14 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={tick} tickFormatter={yr} interval={3} />
                <YAxis tick={tick} allowDecimals={false} tickFormatter={(v) => num(v, lang)} />
                <ReferenceLine y={0} stroke="#9aa59f" />
                <Tooltip formatter={(v, n) => [`${signed(v, lang)} ${T('সেমি', 'cm')}`, n === 'trend' ? T('ধারা', 'Trend') : T('জমা পানি', 'Water stored')]} labelFormatter={yr} />
                <Line dataKey="cm" stroke="#2f7fa8" strokeWidth={2} dot={{ r: 2.5, fill: '#2f7fa8', strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
                {g.trend && <Line dataKey="trend" stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <span>{T('২০০৩–২০০৭', '2003–2007')}: <b className="tabular">{signed(g.early, lang)} {T('সেমি', 'cm')}</b></span>
            <span>{T(`২০১৬–${bnDigits(g.last)}`, `2016–${g.last}`)}: <b className="tabular">{signed(g.late, lang)} {T('সেমি', 'cm')}</b></span>
            {g.trend && <span>{T('দশকে', 'A decade')}: <b className={`tabular ${falling ? 'text-red-700' : ''}`}>{signed(g.trend.perDecade, lang)} {T('সেমি', 'cm')}</b> <span className="text-muted">({g.trend.p < 0.001 ? T('p < ০.০০১', 'p < 0.001') : `p = ${num(g.trend.p, lang, { dp: 3 })}`})</span></span>}
          </div>
          {falling && <Note tone="gold" className="mt-2">{BD.has(id)
            ? T('এ অঞ্চলে মাটির নিচে জমা পানি বছর বছর কমছে। বঙ্গীয় অববাহিকায় শুকনো মৌসুমে সেচের জন্য ভূগর্ভের পানি তোলা এর বড় কারণ (Shamsudduha ও অন্যরা ২০১২)। তাই যে ফসলচক্রে বোরোর মতো বেশি সেচ লাগে, তার আসল খরচ মাটির নিচে জমছে।', 'The water stored under this region is falling year by year. In the Bengal Basin, pumping groundwater for dry-season irrigation is a major cause (Shamsudduha et al. 2012). A rotation that needs heavy irrigation, like Boro, runs up its real cost underground.')
            : id === 'india'
              ? T('উত্তর-পশ্চিম ভারতে মাটির নিচের পানি বছর বছর কমছে; সেচের জন্য নলকূপে পানি তোলাই এর মূল কারণ বলে GRACE দিয়েই দেখানো হয়েছে (Rodell ও অন্যরা ২০০৯, Nature)। ধান-গমের মতো বেশি সেচের চক্রের আসল খরচ মাটির নিচে জমছে।', 'Groundwater under north-west India is falling year by year; GRACE itself showed that pumping for irrigation is the main cause (Rodell et al. 2009, Nature). A thirsty cycle like rice–wheat runs up its real cost underground.')
              : T('এ অঞ্চলে মাটির ওপরে-নিচে জমা পানি বছর বছর কমছে। বেশি সেচের ফসল এই ঘাটতি বাড়ায়।', 'The water stored on and under this region is falling year by year. Heavily irrigated crops add to the loss.')}</Note>}
          {rising && <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('এ অঞ্চলে জমা পানি কমছে না, বরং বাড়ছে।', 'The water stored here is not falling; it is rising.')}</p>}
          <p className="mt-2 text-[11.5px] leading-4 text-muted">{T(`GRACE-এর একেকটি ঘর প্রায় ৩০০ কিমি চওড়া, তাই এটি পুরো অঞ্চলের পানি, এক জমির নয়; কাছাকাছি উপজেলায় একই মান আসে। ২০১৭–১৮-এ দুই উপগ্রহের মাঝে ফাঁক। GIBS-এর রঙের মাপ ±${num(GRACE_CAP, 'bn')} সেমিতে থামে${g.capped ? ', আর কিছু মাস সেই সীমা ছুঁয়েছে, তাই আসল পরিবর্তন আরও বড় হতে পারে' : ''}।`, `Each GRACE cell is about 300 km across, so this is the region’s water, not one field’s; nearby upazilas share a value. A gap in 2017–18 between the two missions. GIBS’s colour scale stops at ±${GRACE_CAP} cm${g.capped ? ', and some months reach it, so the true change may be larger' : ''}.`)}</p>
        </div>
      )}
      {sm && (
        <div className="rounded-2xl border border-border bg-white p-3.5">
          <div className="flex items-center gap-1.5 text-[14px] font-bold"><Sprout size={16} className="text-primary-700" />{T('এখন শিকড়ের মাটিতে পানি, SMAP উপগ্রহ', 'Root-zone soil moisture now, SMAP satellite')}</div>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{T('ওপরের এক মিটার মাটিতে প্রতি ঘনমিটারে কত ঘনমিটার পানি।', 'Cubic metres of water in each cubic metre of the top metre of soil.')}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[30px] font-bold tabular text-sky-700">{num(sm.value, lang, { dp: 2 })}</span>
            <span className="text-[13px] text-muted">{T(`${mon} ${bnDigits(sm.month.slice(0, 4))}`, `${mon} ${sm.month.slice(0, 4)}`)}</span>
          </div>
          {sm.normal != null && <p className="mt-1 text-[14px]">{T(`${num(sm.n, 'bn')} বছরের ${mon} মাসের গড় ${num(sm.normal, 'bn', { dp: 2 })}; এবার `, `The ${mon} mean over ${sm.n} years is ${num(sm.normal, 'en', { dp: 2 })}; this year `)}<b className={sm.pct < -10 ? 'text-clay-700' : sm.pct > 10 ? 'text-sky-700' : ''}>{signed(sm.pct, lang, 0)}%</b>{T(` (কম-বেশি ${num(sm.min, 'bn', { dp: 2 })}–${num(sm.max, 'bn', { dp: 2 })})।`, ` (range ${num(sm.min, 'en', { dp: 2 })}–${num(sm.max, 'en', { dp: 2 })}).`)}</p>}
          {sm.pct != null && sm.pct < -10 && <Note tone="gold" className="mt-2">{T('রবির শুরুতে মাটি স্বাভাবিকের চেয়ে শুকনো। বোনার আগে "জো" দেখে নিন; জমিতে থেকে যাওয়া পানিতে চলে এমন ফসল (মসুর, ছোলা, সরিষা) বা হালকা সেচের পরিকল্পনা রাখুন।', 'The soil is drier than usual at the start of the Rabi. Check the moisture ("jo") before sowing, and plan for crops that run on stored water (lentil, chickpea, mustard) or a light irrigation.')}</Note>}
          {sm.pct != null && sm.pct > 10 && <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('মাটি স্বাভাবিকের চেয়ে ভেজা: বোনার আগে জমি শুকানোর সময় রাখুন।', 'The soil is wetter than usual: allow time for the field to dry before sowing.')}</p>}
          {chk && <p className="mt-2 text-[12.5px] leading-5 text-muted">{T(`তথ্য যাচাই: SMAP আর নাসা পাওয়ারের নিজের মাটির আর্দ্রতা (MERRA-2) ${num(chk.n, 'bn')} মাসে পাশাপাশি রাখলে মিল r = ${num(chk.r, 'bn', { dp: 2 })}, দুটো আলাদা হিসাব একই কথা বলছে।`, `Data check: SMAP against NASA POWER’s own soil wetness (MERRA-2) over ${chk.n} months gives r = ${num(chk.r, 'en', { dp: 2 })}; two separate records tell the same story.`)}</p>}
          <p className="mt-2 text-[11.5px] leading-4 text-muted">{T('SMAP লেভেল-৪ (প্রায় ৯ কিমি), প্রতি মাসের ৮ ও ২২ তারিখের মাপের গড়; চলতি মাসে যেদিন পর্যন্ত পাওয়া গেছে। উৎস: নাসা GIBS।', 'SMAP Level 4 (about 9 km), the mean of the 8th and 22nd of each month; the current month as far as it is out. Source: NASA GIBS.')}</p>
        </div>
      )}
    </div>
  );
}
