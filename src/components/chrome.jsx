// Small pieces of app chrome shared by the layouts.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Languages,
  AlertTriangle,
  Satellite,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { useStore, clim, soilData } from '../store.jsx';

export function LangToggle({ dark = false, glass = false }) {
  const { s, dispatch } = useStore();
  const next = s.lang === 'bn' ? 'English' : 'বাংলা';
  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          type: 'set',
          patch: { lang: s.lang === 'bn' ? 'en' : 'bn' },
        })
      }
      className={`group inline-flex h-10 items-center gap-1.5 px-3 text-[14px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 ${glass ? 'glass-pill rounded-full px-3.5 text-ink' : dark ? 'rounded-xl bg-white/10 text-white hover:bg-white/20' : 'rounded-xl border border-border bg-white text-ink hover:bg-primary-50 shadow-2xs'}`}
      aria-label={s.lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
      lang={s.lang === 'bn' ? 'en' : 'bn'}
    >
      <Languages size={16} className="transition-transform duration-300 group-hover:rotate-12" />
      {next}
    </button>
  );
}

// Back to the previous page, or to the home page when this one was opened directly (no history inside the app).
export function BackButton({ className = '' }) {
  const { T } = useStore();
  const navigate = useNavigate();
  const back = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'));
  return (
    <button type="button" onClick={back} aria-label={T('আগের পাতায় ফিরে যান', 'Go back to the previous page')}
      className={`group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-[14px] font-semibold text-ink/80 shadow-2xs transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-ink hover:scale-105 active:scale-95 ${className}`}>
      <ArrowLeft size={17} className="transition-transform duration-200 group-hover:-translate-x-0.5" /><span className="hidden sm:inline">{T('ফিরে যান', 'Back')}</span>
    </button>
  );
}

export function DataStatusChips({ dark = false }) {
  const { dispatch, T, clim: active } = useStore();
  const real = (active ?? clim).prov.status === 'REAL'; // the climate of the farmer's or officer's own upazila
  const soilReal = soilData.provenance.status === 'REAL';
  const open = () => dispatch({ type: 'set', patch: { dataInfo: true } });
  const base = 'chip !px-2.5 !py-1 cursor-pointer';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={open}
        className={`${base} ${real ? 'bg-sky-100 text-sky-900' : dark ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}
      >
        <Satellite size={12} />
        {T('আবহাওয়া', 'Weather')}:{' '}
        {real ? T('নাসার আসল তথ্য', 'NASA data') : T('অস্থায়ী', 'placeholder')}
      </button>
      <button
        type="button"
        onClick={open}
        className={`${base} ${soilReal ? 'bg-sky-100 text-sky-900' : dark ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-900'}`}
      >
        <Layers size={12} />
        {T('মাটি', 'Soil')}:{' '}
        {soilReal ? T('আসল', 'real') : T('নমুনা', 'sample')}
      </button>
    </div>
  );
}

export function PlaceholderBanner() {
  const { dispatch, T, clim: active } = useStore();
  if ((active ?? clim).prov.status === 'REAL') return null; // only when the active upazila's climate is real
  return (
    // <div className="border-b border-red-200 bg-red-50 text-red-800">
    //   <div className="page-shell flex items-start gap-2 py-2 text-[13px] leading-5">
    //     <AlertTriangle size={15} className="mt-0.5 shrink-0" />
    //     <p className="min-w-0 flex-1">
    //       {T(
    //         'এখন অস্থায়ী আবহাওয়ার তথ্য দেখানো হচ্ছে, নাসার আসল তথ্য নয়। ',
    //         'This build is showing placeholder weather data, not real NASA data. '
    //       )}
    //       <button
    //         type="button"
    //         onClick={() => dispatch({ type: 'set', patch: { dataInfo: true } })}
    //         className="font-semibold underline underline-offset-2"
    //       >
    //         {T('কীভাবে আসল তথ্য আনবেন', 'How to load the real data')}
    //       </button>
    //     </p>
    //   </div>
    // </div>
    <></>
  );
}

// Clears everything the user did in the demo (saved in this browser) after a second tap.
export function ResetDemo({ dark = false, className = '' }) {
  const { dispatch, T } = useStore();
  const [ask, setAsk] = useState(false);
  const cls = dark
    ? 'text-primary-100 hover:bg-primary-900'
    : 'text-muted hover:bg-black/5 hover:text-ink';
  return (
    <button
      type="button"
      onClick={() => {
        if (ask) {
          dispatch({ type: 'reset' });
          setAsk(false);
        } else {
          setAsk(true);
          setTimeout(() => setAsk(false), 4000);
        }
      }}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-semibold ${cls} ${className}`}
    >
      <RotateCcw size={15} />
      {ask
        ? T('আবার চাপুন, সব মুছে যাবে', 'Tap again to clear everything')
        : T('নমুনা আবার শুরু করুন', 'Restart the demo')}
    </button>
  );
}
