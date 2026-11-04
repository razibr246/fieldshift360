// "Can I spray now?" Every daylight hour of the next two days from the live forecast, judged for drift (wind),
// drying (Delta T) and wash-off (rain in the next 4 hours), with the best window named. The farmer still reads the
// product label and decides; the check is re-run on opening and on "check again", because a forecast changes.
// Rules: engine/spray.js. Used on Today and in the crop doctor's result.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wind, RefreshCw, CheckCircle2, PauseCircle, XCircle, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { fetchForecast, hourLabel, dayLong, clockText } from '../../engine/forecast';
import { sprayPlan } from '../../engine/spray';
import { bnDigits } from '../../engine/dates';

const LOOK = {
  go: { icon: CheckCircle2, cell: 'bg-primary-600 text-white', text: 'text-primary-800', bn: 'স্প্রে করা যায়', en: 'Good to spray' },
  risk: { icon: PauseCircle, cell: 'bg-amber-300 text-amber-950', text: 'text-amber-800', bn: 'সাবধানে', en: 'Take care' },
  no: { icon: XCircle, cell: 'bg-red-500 text-white', text: 'text-red-700', bn: 'এখন নয়', en: 'Not now' },
};

export default function SprayCheck({ lat, lon, compact = false }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [st, setSt] = useState({ status: 'loading', fc: null, at: null });
  const load = useCallback(() => {
    setSt((p) => ({ ...p, status: 'loading' }));
    fetchForecast(lat, lon).then((fc) => setSt({ status: 'ok', fc, at: Date.now() }), () => setSt((p) => ({ ...p, status: p.fc ? 'ok' : 'error' })));
  }, [lat, lon]);
  useEffect(() => { load(); }, [load]);
  const plan = useMemo(() => (st.fc ? sprayPlan(st.fc.hours, { fromTime: `${st.fc.current.time.slice(0, 13)}:00` }) : null), [st.fc]);
  const h = (x) => hourLabel(x % 24, lang, bnDigits);
  const day = (d) => (d === st.fc?.days[0]?.date ? T('আজ', 'Today') : d === st.fc?.days[1]?.date ? T('কাল', 'Tomorrow') : dayLong(d, lang));
  const now = plan?.nowOk;
  const nowLook = now ? LOOK[now.ok] : null;

  return (
    <section aria-labelledby="spray-h" className="rounded-[20px] bg-white/85 p-4 ring-1 ring-border sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="spray-h" className="flex items-center gap-2 text-[16.5px] font-bold"><Wind size={18} className="text-sky-700" aria-hidden="true" />{T('ওষুধ স্প্রে করার সময়', 'When to spray')}</h3>
        <span className="flex items-center gap-2"><Tags list={['MODEL', 'RULE']} />
          <button type="button" onClick={load} disabled={st.status === 'loading'} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50 disabled:opacity-60">
            {st.status === 'loading' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}{T('আবার দেখুন', 'Check again')}
          </button>
        </span>
      </div>

      {st.status === 'error' && <p className="mt-2 text-[14px] text-muted">{T('পূর্বাভাস আনা যায়নি। বাতাস জোরে বইলে, বৃষ্টি আসার মুখে বা ভরদুপুরের গরমে স্প্রে করবেন না।', 'Could not fetch the forecast. Do not spray in strong wind, just before rain, or in the midday heat.')}</p>}
      {st.status === 'loading' && !plan && <p className="mt-2 text-[14px] text-muted">{T('পূর্বাভাস আনা হচ্ছে…', 'Fetching the forecast…')}</p>}

      {plan && (
        <div aria-live="polite">
          <div className="mt-3 rounded-2xl bg-canvas p-3.5">
            {now ? (
              <>
                <p className={`flex items-center gap-2 text-[16px] font-bold ${nowLook.text}`}><nowLook.icon size={18} aria-hidden="true" />{T('এখন', 'Now')}: {L(nowLook)}</p>
                {now.why.length > 0 && <ul className="mt-1 space-y-0.5 text-[13.5px] leading-6 text-ink/80">{now.why.map((w) => <li key={w.k}>{L(w)}</li>)}</ul>}
              </>
            ) : <p className="text-[14.5px] font-semibold text-ink/80">{T('এখন অন্ধকার; দিনের আলোয় স্প্রে করুন।', 'It is dark now; spray in daylight.')}</p>}
            <p className="mt-2 text-[14.5px] leading-6">
              {plan.best
                ? T(`সবচেয়ে ভালো সময়: ${day(plan.best.date)} ${h(plan.best.from)} থেকে ${h(plan.best.to)}`, `Best time: ${day(plan.best.date)}, ${h(plan.best.from)} to ${h(plan.best.to)}`)
                : T('আগামী দুই দিনে একটানা ভালো সময় নেই। জরুরি না হলে অপেক্ষা করুন, বা কর্মকর্তাকে জিজ্ঞেস করুন।', 'No good stretch in the next two days. Wait unless it is urgent, or ask your officer.')}
            </p>
          </div>

          {!compact && (
            <div className="mt-3 space-y-2">
              {[...new Set(plan.hours.map((x) => x.date))].map((d) => (
                <div key={d}>
                  <p className="text-[12.5px] font-semibold text-muted">{day(d)}</p>
                  <ol className="mt-1 flex flex-wrap gap-1" aria-label={T(`${day(d)}, ঘণ্টা ধরে`, `${day(d)}, hour by hour`)}>
                    {plan.hours.filter((x) => x.date === d).map((x) => (
                      <li key={x.time} title={x.why.map((w) => L(w)).join('; ') || L(LOOK.go)} className={`grid h-11 min-w-11 place-items-center rounded-lg px-1 text-[11.5px] font-semibold leading-tight ${LOOK[x.ok].cell}`}>
                        <span>{lang === 'bn' ? bnDigits(x.hour % 12 || 12) : x.hour % 12 || 12}</span>
                        <span className="sr-only">{h(x.hour)}: {L(LOOK[x.ok])}{T('। ', '. ')}{x.why.map((w) => L(w)).join(T('। ', '. '))}</span>
                        <span aria-hidden="true" className="text-[10px] font-bold">{x.ok === 'go' ? '✓' : x.ok === 'risk' ? '!' : '✕'}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[12.5px] leading-5 text-muted">
            {T('বাতাস ৩–১৫ কিমি/ঘণ্টা, বৃষ্টি আসার ৪ ঘণ্টা আগে নয়, খুব গরম-শুকনো হাওয়ায় নয়। ওষুধের প্যাকেটের লেখা, মাস্ক-গ্লাভস আর ফসল তোলার আগের অপেক্ষার দিন মেনে চলুন।', 'Wind 3–15 km/h, not within 4 hours of rain, not in very hot dry air. Follow the product label, wear a mask and gloves, and keep its wait before harvest.')}
            {st.at && <> {T(`পূর্বাভাস ${clockText(st.at, 'bn')}-এর; যাওয়ার আগে আবার দেখুন।`, `Forecast from ${clockText(st.at, 'en')}; check again before you go.`)}</>}
          </p>
        </div>
      )}
    </section>
  );
}
