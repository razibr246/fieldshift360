// A one-page poster of the best rotation for the farmer's wall or the union notice board: the crops in pictures,
// season by season on the Bangla calendar, the field's own numbers and three plain rules, sized for A4 and printed
// with the browser's print. Words are short and large for readers who read little.
import { X, Printer } from 'lucide-react';
import { useStore } from '../../store';
import { num } from '../../engine/dates';
import { cropOf, climateLedger, WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';
import { Plant, LOOK, SKY } from '../charts/SoilColumn';

const SEASONS = [
  { slot: 'rabi', bn: 'রবি', en: 'Rabi', months: { bn: 'কার্তিক – ফাল্গুন', en: 'Kartik – Falgun (Nov–Mar)' }, tone: '#e7f1f7' },
  { slot: 'k1', bn: 'খরিফ-১', en: 'Kharif-1', months: { bn: 'চৈত্র – আষাঢ়', en: 'Chaitra – Asharh (Mar–Jul)' }, tone: '#fbecd2' },
  { slot: 'aman', bn: 'খরিফ-২ (আমন)', en: 'Kharif-2 (Aman)', months: { bn: 'আষাঢ় – কার্তিক', en: 'Asharh – Kartik (Jul–Nov)' }, tone: '#dcebf3' },
];

function CropIcon({ id }) {
  const look = LOOK[id];
  if (!look) return <div className="grid h-[92px] place-items-center text-[13px] text-muted">—</div>;
  return (
    <svg viewBox={`0 0 80 ${SKY + 6}`} className="h-[92px] w-auto" aria-hidden="true">
      <rect y={SKY} width="80" height="6" rx="2" fill="#8a6a45" />
      <Plant x={40} look={look} k={0} />
    </svg>
  );
}

export default function RotationPoster({ ff, ctx, onClose }) {
  const { T, L, farmer, upazila, s } = useStore();
  const lang = s.lang;
  const b = ff.best, h = ff.habit;
  const lh = climateLedger(ctx, h.rot, h.now), lb = climateLedger(ctx, b.rot, b.now);
  const water = (h.sNow.waterMm - b.sNow.waterMm) * WATER_M3_PER_MM_BIGHA;
  const crops = b.rot.cycle.flatMap((y) => [y.rabi, y.k1]);
  const rules = [
    b.rot.residue === 'retain' && T('খড়-নাড়া পোড়াবেন না, চাষ দিয়ে মাটিতে মিশিয়ে দিন।', 'Do not burn the straw: plough it back in.'),
    crops.some((id) => cropOf(id)?.legume) && T('ডাল ফসল (মসুর, মুগ) বাতাস থেকে নাইট্রোজেন আনে, ইউরিয়া কম লাগে।', 'Pulses (lentil, mungbean) take nitrogen from the air: less urea.'),
    h.rot.cycle.some((y) => y.rabi === 'boro') && !crops.includes('boro') && T('বোরোর বদলে কম পানির রবি ফসল: নলকূপের পানি বাঁচে।', 'A low-water Rabi crop instead of Boro saves tube-well water.'),
    crops.includes('boro') && T('বোরোতে AWD: পানি শুকালে তবেই আবার সেচ।', 'AWD on Boro: irrigate again only when the water has gone down.'),
    T('একই গোত্রের ফসল পরপর নয়: রোগ-পোকা কমে।', 'Do not follow a crop with its own family: fewer pests and diseases.'),
  ].filter(Boolean).slice(0, 3);
  const n = (x, dp = 0) => num(x, lang, { dp });
  const sg = (x) => { const r = Math.round(x * 10) / 10; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n(Math.abs(r), 1)}`; };
  return (
    <div className="poster-overlay fixed inset-0 z-[80] overflow-auto bg-black/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={T('ফসলচক্রের পোস্টার', 'Rotation poster')}>
      <div className="mx-auto mb-3 flex max-w-[800px] justify-end gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-[14.5px] font-semibold text-white"><Printer size={16} />{T('প্রিন্ট করুন', 'Print')}</button>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14.5px] font-semibold"><X size={16} />{T('বন্ধ', 'Close')}</button>
      </div>
      <article className="poster-sheet mx-auto max-w-[800px] rounded-[18px] bg-white p-8 text-ink shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b-4 border-primary-700 pb-4">
          <div>
            <p className="text-[16px] font-bold text-primary-700">{T('আমার জমির ফসলচক্র', 'My field’s rotation')}</p>
            <h1 className="mt-1 text-[38px] font-extrabold leading-tight">{L(farmer.name)}</h1>
            <p className="text-[18px] text-muted">{T(`${farmer.villageBn}, ${upazila.name.bn} · ${n(farmer.area_dec)} শতক`, `${farmer.village}, ${upazila.name.en} · ${farmer.area_dec} decimal`)}</p>
          </div>
          <div className="text-right text-[14px] font-bold text-primary-800">FieldShift 360<div className="font-normal text-muted">{T('নাসার তথ্যে', 'with NASA data')}</div></div>
        </header>

        {b.rot.cycle.map((y, yi) => (
          <section key={yi} className="mt-5">
            {b.rot.cycle.length > 1 && <h2 className="mb-2 text-[20px] font-bold">{yi ? T('পরের বছর', 'The next year') : T('এক বছর', 'One year')}</h2>}
            <div className="grid grid-cols-3 gap-3">
              {SEASONS.map((se) => {
                const id = se.slot === 'rabi' ? y.rabi : se.slot === 'k1' ? y.k1 : 'aman';
                return (
                  <div key={se.slot} className="rounded-2xl p-3 text-center" style={{ background: se.tone }}>
                    <div className="text-[18px] font-extrabold">{T(se.bn, se.en)}</div>
                    <div className="text-[13px] text-muted">{L(se.months)}</div>
                    <div className="mt-1 flex justify-center"><CropIcon id={id} /></div>
                    <div className="text-[22px] font-bold">{L(cropOf(id).name)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-primary-50 p-3"><div className="text-[34px] font-extrabold text-primary-800">{sg(b.sNow.dSoc)}%</div><div className="text-[14px]">{T('মাটির জৈব পদার্থ, ১০ বছরে', 'Soil organic matter, 10 years')}</div></div>
          <div className="rounded-2xl bg-sky-50 p-3"><div className="text-[34px] font-extrabold text-sky-800">{n(water)}</div><div className="text-[14px]">{T('ঘনমিটার সেচ কম, বিঘায় বছরে', 'm³ less irrigation, per bigha a year')}</div></div>
          <div className="rounded-2xl bg-paddy-50 p-3"><div className="text-[34px] font-extrabold text-paddy-700">{lh.net > 0 ? `${n((1 - lb.net / lh.net) * 100)}%` : '–'}</div><div className="text-[14px]">{T('কম গ্রিনহাউস গ্যাস', 'less greenhouse gas')}</div></div>
        </section>

        <section className="mt-6">
          <h2 className="text-[22px] font-bold">{T('তিনটি কথা মনে রাখুন', 'Three things to remember')}</h2>
          <ol className="mt-2 space-y-2">
            {rules.map((r, i) => <li key={i} className="flex gap-3 text-[19px] leading-7"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-700 text-[16px] font-bold text-white">{n(i + 1)}</span>{r}</li>)}
          </ol>
        </section>

        <footer className="mt-6 border-t border-border pt-3 text-[13px] leading-5 text-muted">
          {T(`উপজেলা কৃষি অফিসার: ${upazila.officer.bn}, ${upazila.name.bn} উপজেলা কৃষি অফিস। হিসাব: নাসা POWER ও NEX-GDDP-CMIP6, ISRIC SoilGrids, FAOSTAT; মডেলের হিসাব, ভবিষ্যদ্বাণী নয়। নমুনা কৃষক।`, `Upazila agriculture officer: ${upazila.officer.en}, ${upazila.name.en} upazila agriculture office. Worked out from NASA POWER and NEX-GDDP-CMIP6, ISRIC SoilGrids, FAOSTAT; model estimates, not forecasts. A sample farmer.`)}
        </footer>
      </article>
    </div>
  );
}
