// Field Future: the area round the field seen from space since 2001 (engine/landsat.js): the year's green cycle with
// the leanest months marked (when fields most often lie bare, the window a cover or Kharif-1 crop can fill), each Rabi
// season's greenness against the area's trend (years of vegetation stress), the ground heat of the hot months then and
// now, and how much water the land gives back to the air.
import { useMemo } from 'react';
import { Leaf, Thermometer, Wind, CalendarRange } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { landSummary } from '../../engine/landsat';

const MONTHS = {
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const GREEN = '#43863a', LEAN = '#c99a3a', RED = '#b42318', MUTED = '#6b7a72';

export default function LandFromSpace({ upazila, place }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const d = useMemo(() => landSummary(upazila), [upazila]);
  if (!d) return null;
  const n = (v, dp = 0) => num(v, lang, { dp });
  const yr = (y) => (lang === 'bn' ? bnDigits(y) : String(y));
  const mo = (m) => MONTHS[lang][m - 1];
  const cyc = d.green.cycle, top = Math.max(...cyc), lo = Math.min(...cyc) - 0.05;
  const rabi = d.rabi, zMax = Math.max(1.5, ...rabi.map((r) => Math.abs(r.z)));
  return (
    <Card id="ff-land" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="text-[20px] font-bold">{T(`মহাকাশ থেকে ${L(place)}, ${yr(d.years[0])}–${yr(d.years[1])}`, `${L(place)} from space, ${d.years[0]}–${d.years[1]}`)}</h2>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('নাসার MODIS উপগ্রহে প্রতি মাসে এলাকা কতটা সবুজ আর মাটির উপরিতল কতটা গরম, আর নাসার MERRA-2-এ জমি থেকে কতটা পানি বাতাসে যায়। এই জায়গার চারপাশের প্রায় ৫ কিলোমিটার: এলাকার জমিগুলো, একটা জমি নয়।', 'How green the area is each month and how hot its ground surface, from NASA’s MODIS satellites, and how much water the land gives back to the air, from NASA’s MERRA-2. About 5 km round this place: the area’s fields, not one field.')}</p>
        </div>
        <Tags list={['REAL']} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><Leaf size={16} className="text-primary-700" />{T('বছরের সবুজ চক্র (NDVI)', 'The year’s green cycle (NDVI)')}</h3>
          <svg viewBox="0 0 360 150" className="mt-2 w-full" role="img" aria-label={T('মাসে মাসে গড় NDVI', 'Average NDVI by month')}>
            {cyc.map((v, i) => {
              const h = ((v - lo) / (top - lo)) * 110, x = 6 + i * 29.5, lean = d.green.lean.includes(i + 1);
              return (
                <g key={i}>
                  <rect x={x} y={120 - h} width={22} height={h} rx={4} fill={lean ? LEAN : GREEN} opacity={lean ? 1 : 0.85}><title>{`${mo(i + 1)}: NDVI ${n(v, 2)}`}</title></rect>
                  <text x={x + 11} y={136} textAnchor="middle" fontSize="9.5" fill={MUTED}>{mo(i + 1)}</text>
                  {(lean || i + 1 === d.green.greenest) && <text x={x + 11} y={116 - h} textAnchor="middle" fontSize="9" fill="#1f2a24">{n(v, 2)}</text>}
                </g>
              );
            })}
          </svg>
          <p className="mt-1 flex gap-2 text-[13.5px] leading-6 text-ink/80"><CalendarRange size={16} className="mt-1 shrink-0" style={{ color: LEAN }} />
            {T(`সবচেয়ে কম সবুজ: ${d.green.lean.map(mo).join(', ')}। এই মাসগুলোতে এলাকার অনেক জমি ফাঁকা বা পানির নিচে থাকে: ঢাকনা ফসল বা খরিফ-১-এর ফসল এই ফাঁক ভরলে মাটি ঢাকা থাকে, কম ধুয়ে যায়। সবচেয়ে সবুজ ${mo(d.green.greenest)}।`, `Least green: ${d.green.lean.map(mo).join(', ')}. In these months many of the area’s fields lie bare or under water: a cover crop or a Kharif-1 crop filling the gap keeps the soil covered and losing less. Greenest: ${mo(d.green.greenest)}.`)}</p>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><Leaf size={16} className="text-primary-700" />{T('প্রতিটি রবির সবুজ, এলাকার ধারার তুলনায়', 'Each Rabi’s greenness against the area’s trend')}</h3>
          <svg viewBox="0 0 360 150" className="mt-2 w-full" role="img" aria-label={T('বছরে বছরে রবির সবুজের ফারাক', 'Rabi greenness departure by year')}>
            <line x1="0" x2="360" y1="70" y2="70" stroke="#cfd8cc" />
            {rabi.map((r, i) => {
              const w = 340 / rabi.length, x = 10 + i * w, h = (Math.abs(r.z) / zMax) * 60;
              return (
                <g key={r.y}>
                  <rect x={x} y={r.z >= 0 ? 70 - h : 70} width={Math.max(3, w - 3)} height={h} rx={2} fill={r.stress ? RED : r.z >= 0 ? GREEN : '#a9b8a6'}><title>{`${r.y}: NDVI ${n(r.v, 2)}`}</title></rect>
                  {(r.stress || (i % 4 === 0 && !rabi.slice(Math.max(0, i - 1), i + 2).some((q) => q.stress))) && <text x={x + w / 2} y={r.z >= 0 || r.stress ? 146 : 146} textAnchor="middle" fontSize="8.5" fill={r.stress ? RED : MUTED}>{yr(r.y)}</text>}
                </g>
              );
            })}
          </svg>
          <p className="mt-1 text-[13.5px] leading-6 text-ink/80">{d.stressYears.length
            ? T(`লাল বছরগুলো (${d.stressYears.map(yr).join(', ')}) রবিতে এলাকা স্বাভাবিকের চেয়ে স্পষ্ট কম সবুজ ছিল: খরা, গরম বা দেরিতে লাগানোর মৌসুম। পুরো সময়ে রবি প্রতি দশকে NDVI ${n(d.greening, 3)} করে সবুজ হয়েছে, বেশি জমিতে সেচের ফসল আসায়।`, `In the red years (${d.stressYears.join(', ')}) the area was clearly less green than usual in the Rabi: seasons of drought, heat or late sowing. Over the whole record the Rabi has greened by ${d.greening.toFixed(3)} NDVI a decade as more land came under irrigated crops.`)
            : T('কোনো রবিতে স্পষ্ট চাপ দেখা যায়নি।', 'No Rabi shows clear stress.')}</p>
        </section>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-canvas p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted"><Thermometer size={16} className="text-red-700" />{T('মার্চ-মে, মাটির উপরিতলের দিনের তাপ (MODIS)', 'March–May daytime ground-surface heat (MODIS)')}</p>
          <p className="font-display mt-1 text-[24px] font-bold tabular">{n(d.heat.then, 1)}° → {n(d.heat.now, 1)}°</p>
          <p className="text-[13px] leading-5 text-muted">{T(`২০০১–২০১২ বনাম ২০১৩ থেকে; বোরোর ফুল আর দানা ভরার মাস। ফারাক ${d.heat.change >= 0 ? '+' : '−'}${n(Math.abs(d.heat.change), 1)}°।`, `2001–2012 against 2013 on; the months Boro flowers and fills its grain. Change ${d.heat.change >= 0 ? '+' : '−'}${Math.abs(d.heat.change).toFixed(1)}°.`)}</p>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted"><Wind size={16} className="text-sky-700" />{T('জমি থেকে বাতাসে পানি (MERRA-2)', 'Water from the land to the air (MERRA-2)')}</p>
          <p className="font-display mt-1 text-[24px] font-bold tabular">{T(`বছরে প্রায় ${n(Math.round(d.evapYear / 10) * 10)} মিমি`, `About ${Math.round(d.evapYear / 10) * 10} mm a year`)}</p>
          <p className="text-[13px] leading-5 text-muted">{T(`সবচেয়ে বেশি ${mo(d.evapCycle.indexOf(Math.max(...d.evapCycle)) + 1)}-এ (দিনে ${n(Math.max(...d.evapCycle), 1)} মিমি), সবচেয়ে কম ${mo(d.evapCycle.indexOf(Math.min(...d.evapCycle)) + 1)}-এ। রবিতে এটা কম বলে বৃষ্টি না হলেও মাটির পানি ধীরে কমে, যা সেচের হিসাবে ধরা হয়।`, `Highest in ${mo(d.evapCycle.indexOf(Math.max(...d.evapCycle)) + 1)} (${Math.max(...d.evapCycle).toFixed(1)} mm a day), lowest in ${mo(d.evapCycle.indexOf(Math.min(...d.evapCycle)) + 1)}. It is low in the Rabi, so soil water falls slowly even without rain, as the irrigation working allows for.`)}</p>
        </div>
      </div>
    </Card>
  );
}
