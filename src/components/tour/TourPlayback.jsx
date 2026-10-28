import { Clock3, ListOrdered, Pause, Play, Sparkles, X, Zap } from 'lucide-react';
import { num } from '../../engine/dates';

export const TOUR_STEP_SECONDS = 8;
export const QUICK_TOUR_STEP_SECONDS = 6;

export function TourModePicker({ T, title, steps, quickSteps, onStart, onClose }) {
  const minutes = Math.max(1, Math.ceil(steps * TOUR_STEP_SECONDS / 60));
  const quickDuration = quickSteps * QUICK_TOUR_STEP_SECONDS;
  return (
    <aside role="dialog" aria-label={T('গাইডের ধরন বাছুন', 'Choose a guide style')}
      className="sheet-up fixed inset-x-3 bottom-4 z-[80] mx-auto max-w-[620px] rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_24px_56px_-16px_rgba(13,38,20,.6)] backdrop-blur lg:bottom-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-[0_6px_16px_-6px_rgba(36,90,40,.8)]"><Sparkles size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold leading-snug">{title}</p>
          <p className="mt-1 text-[13.5px] leading-6 text-ink/75">{T('পুরো, দ্রুত অথবা নিজের গতির গাইড বেছে নিন।', 'Choose a full, quick, or self-paced guide.')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={T('বন্ধ করুন', 'Close')}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => onStart('auto')}
          className="group rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-[var(--shadow-glow-primary)]">
          <span className="flex items-center gap-2 text-[14px] font-bold text-primary-900"><Play size={16} className="shrink-0 fill-current" />{T('অটো ট্যুর', 'Auto tour')}</span>
          <span className="mt-1 block text-[12px] leading-5 text-ink/70">{T('সব পাতা · থামানো যাবে', 'Every page · pause any time')}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-primary-700"><Clock3 size={14} />{T(`প্রায় ${num(minutes, 'bn')} মিনিট`, `About ${minutes} min`)}</span>
        </button>
        <button type="button" onClick={() => onStart('quick')}
          className="group rounded-2xl border border-paddy-100 bg-gradient-to-br from-paddy-50 to-white p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-paddy-300 hover:shadow-[var(--shadow-glow-amber)]">
          <span className="flex items-center gap-2 text-[14px] font-bold text-paddy-700"><Zap size={16} className="shrink-0 fill-current" />{T('দ্রুত ট্যুর', 'Quick tour')}</span>
          <span className="mt-1 block text-[12px] leading-5 text-ink/70">{T('৫টি গুরুত্বপূর্ণ পাতা', '5 key pages')}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-paddy-700"><Clock3 size={14} />{T(`৪৫ সেকেন্ডের কম · প্রায় ${num(quickDuration, 'bn')} সেকেন্ড`, `Under 45 sec · about ${quickDuration} sec`)}</span>
        </button>
        <button type="button" onClick={() => onStart('manual')}
          className="group rounded-2xl border border-border bg-gradient-to-br from-white to-canvas p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-[var(--shadow-card)]">
          <span className="flex items-center gap-2 text-[14px] font-bold text-ink"><ListOrdered size={17} className="shrink-0" />{T('ম্যানুয়াল ট্যুর', 'Manual tour')}</span>
          <span className="mt-1 block text-[12px] leading-5 text-ink/70">{T('নিজের গতিতে আগে-পরে যান', 'Move back and forward at your pace')}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted"><Clock3 size={14} />{T('নিজের সময়ে', 'At your pace')}</span>
        </button>
      </div>
    </aside>
  );
}

export function TourPlayback({ T, lang, step, total, elapsed, paused, complete, mode, onToggle }) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const secondLabel = seconds < 10
    ? T(`০${num(seconds, 'bn')}`, `0${num(seconds, 'en')}`)
    : num(seconds, lang);
  const clock = `${num(minutes, lang)}:${secondLabel}`;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-black/[.05] bg-primary-50/65 px-4 py-1.5 text-[12px]">
      <span className="flex min-w-0 items-center gap-1.5 font-semibold text-primary-800">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${complete ? 'bg-paddy-500' : paused ? 'bg-muted' : 'bg-primary-500 animate-pulse'}`} />
        <span className="truncate">{complete ? T('ট্যুর শেষ', 'Tour complete') : paused ? T('বিরতি', 'Paused') : mode === 'quick' ? T('দ্রুত ট্যুর', 'Quick tour') : T('অটো ট্যুর', 'Auto tour')}</span>
        <span aria-live="off" className="tabular text-muted">{clock} · {num(step, lang)}/{num(total, lang)}</span>
      </span>
      {!complete && (
        <button type="button" onClick={onToggle} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 font-semibold text-primary-800 hover:bg-white"
          aria-label={paused ? T('ট্যুর চালিয়ে যান', 'Resume the tour') : T('ট্যুর থামান', 'Pause the tour')}>
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? T('চালান', 'Resume') : T('থামান', 'Pause')}
        </button>
      )}
    </div>
  );
}
