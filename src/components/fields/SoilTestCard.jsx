// "My soil test": the farmer (or the officer beside them) types in the SRDI report. Saved per field; from then on
// the season plan, Field Future and the fertiliser doses use it instead of the SoilGrids estimate, and the card
// shows how far the estimate was from the test. Rules: engine/soiltest.js.
import { useState } from 'react';
import { FlaskConical, Pencil, Trash2, Save } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { checkTest, testVsEstimate, isStale, LAND, LIMITS } from '../../engine/soiltest';
import { num, fmtDate, parseISO, todayDhaka } from '../../engine/dates';

const field = 'h-11 w-full rounded-xl border border-border bg-white px-3 text-[15px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/12';

export default function SoilTestCard() {
  const { s, T, L, dispatch, toast, soil, activeParcel, farmer } = useStore();
  const lang = s.lang;
  const id = activeParcel?.id ?? farmer.id;
  const saved = s.soilTests?.[id] ?? null;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({ date: '', lab: '', ph: '', om: '', n: '', land: '' }));
  const [errs, setErrs] = useState([]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const edit = () => { setForm(saved ? { date: saved.date ?? '', lab: saved.lab ?? '', ph: saved.ph ?? '', om: saved.om ?? '', n: saved.n ?? '', land: saved.land ?? '' } : { date: '', lab: '', ph: '', om: '', n: '', land: '' }); setErrs([]); setOpen(true); };
  const save = (e) => {
    e.preventDefault();
    const r = checkTest(form, Date.parse(`${todayDhaka()}T23:59:59Z`));
    setErrs(r.errors);
    if (!r.ok) return;
    dispatch({ type: 'saveSoilTest', id, test: r.test });
    setOpen(false);
    toast('মাটি পরীক্ষা রাখা হলো; পরিকল্পনা এখন এটা ধরে হিসাব করছে', 'Soil test saved; the plan now works on it');
  };
  const remove = () => { dispatch({ type: 'clearSoilTest', id }); toast('মাটি পরীক্ষা মুছে ফেলা হলো', 'Soil test removed'); };
  const rows = testVsEstimate(soil);
  const err = (k) => errs.find((x) => x.k === k);
  const d = (iso) => fmtDate(parseISO(iso), lang);

  return (
    <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[15.5px] font-bold"><FlaskConical size={17} className="text-clay-600" aria-hidden="true" />{T('আমার মাটি পরীক্ষা', 'My soil test')}</h3>
        {saved && <Tags list={['RECORD']} />}
      </div>

      {saved && !open && (
        <>
          <p className="mt-1.5 text-[13.5px] leading-6 text-ink/80">
            {T(`${d(saved.date)}${saved.lab ? `, ${saved.lab}` : ''}। পরিকল্পনা, জমির ভবিষ্যৎ আর সারের হিসাব এখন এটাই ধরে।`, `${d(saved.date)}${saved.lab ? `, ${saved.lab}` : ''}. The plan, Field Future and fertiliser now use it.`)}
            {saved.land && <> {T('জমির ধরন', 'Land type')}: <b>{L(LAND[saved.land])}</b>{T('।', '.')}</>}
          </p>
          {isStale(saved.date) && <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-900">{T('পরীক্ষাটা ৩ বছরের বেশি পুরোনো; আবার পরীক্ষা করান।', 'This test is over 3 years old; have the soil tested again.')}</p>}
          {rows.length > 0 && (
            <table className="mt-2.5 w-full text-left text-[13px]">
              <caption className="sr-only">{T('পরীক্ষা আর আনুমানিক হিসাবের তুলনা', 'Test against the estimate')}</caption>
              <thead className="text-[12px] text-muted"><tr><th className="py-1 font-semibold">{T('মান', 'Value')}</th><th className="py-1 font-semibold">{T('পরীক্ষা', 'Test')}</th><th className="py-1 font-semibold">{T('SoilGrids অনুমান', 'SoilGrids estimate')}</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.k} className="border-t border-border"><td className="py-1.5">{L(r.name)}</td><td className="py-1.5 font-semibold tabular">{num(r.test, lang, { dp: r.k === 'n' ? 3 : 1 })}{r.unit}</td><td className="py-1.5 tabular text-ink/70">{num(r.est, lang, { dp: r.k === 'n' ? 3 : 1 })}{r.unit}</td></tr>)}</tbody>
            </table>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={edit} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50"><Pencil size={14} aria-hidden="true" />{T('বদলান', 'Edit')}</button>
            <button type="button" onClick={remove} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"><Trash2 size={14} aria-hidden="true" />{T('মুছুন', 'Remove')}</button>
          </div>
        </>
      )}

      {!saved && !open && (
        <>
          <p className="mt-1.5 text-[13.5px] leading-6 text-ink/80">{T('SRDI বা অন্য গবেষণাগারের রিপোর্ট থাকলে এখানে লিখুন। তখন আনুমানিক হিসাবের বদলে আপনার জমির আসল মাটি ধরে পরামর্শ আসবে।', 'Have a report from SRDI or another lab? Enter it here, and the advice will use your field’s real soil instead of the estimate.')}</p>
          <button type="button" onClick={edit} className="mt-2.5 inline-flex h-11 items-center gap-1.5 rounded-full bg-clay-600 px-4 text-[14px] font-semibold text-white hover:bg-clay-700"><FlaskConical size={15} aria-hidden="true" />{T('রিপোর্ট থেকে লিখুন', 'Enter from the report')}</button>
        </>
      )}

      {open && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2" noValidate>
          <label className="text-[13px] font-semibold">{T('পরীক্ষার তারিখ', 'Test date')}<input type="date" value={form.date} onChange={set('date')} max={todayDhaka()} className={`${field} mt-1`} aria-invalid={!!err('date')} /></label>
          <label className="text-[13px] font-semibold">{T('গবেষণাগার (ঐচ্ছিক)', 'Lab (optional)')}<input value={form.lab} onChange={set('lab')} placeholder={T('যেমন: SRDI রাজশাহী', 'e.g. SRDI Rajshahi')} className={`${field} mt-1`} /></label>
          {Object.entries(LIMITS).map(([k, lim]) => (
            <label key={k} className="text-[13px] font-semibold">{L(lim.name)}{lim.unit && ` (${lim.unit})`}{k !== 'ph' && <span className="font-normal text-muted"> {T('ঐচ্ছিক', 'optional')}</span>}
              <input inputMode="decimal" value={form[k]} onChange={set(k)} placeholder={k === 'ph' ? '6.2' : k === 'om' ? '1.5' : '0.08'} className={`${field} mt-1`} aria-invalid={!!err(k)} />
            </label>
          ))}
          <label className="text-[13px] font-semibold sm:col-span-2">{T('জমির ধরন (রিপোর্টে লেখা থাকে)', 'Land type (on the report)')}
            <select value={form.land} onChange={set('land')} className={`${field} mt-1`}>
              <option value="">{T('জানা নেই', 'Not known')}</option>
              {Object.entries(LAND).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
            </select>
          </label>
          {errs.length > 0 && <ul role="alert" className="space-y-1 text-[13px] font-semibold text-red-700 sm:col-span-2">{errs.map((x, i) => <li key={i}>{L(x)}</li>)}</ul>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary-700 px-5 text-[14px] font-semibold text-white hover:bg-primary-800"><Save size={15} aria-hidden="true" />{T('রাখুন', 'Save')}</button>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-full px-4 text-[14px] font-semibold text-ink/75 ring-1 ring-border hover:bg-canvas">{T('বাতিল', 'Cancel')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
