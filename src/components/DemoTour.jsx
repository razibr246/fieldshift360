// The 3-minute demo story for a judge or a visitor: the existing pages in order, with a short line on what to look
// at in each. Each step sets who is signed in (a Godagari or Dhamrai farmer, the union officer, the upazila officer)
// and opens the page; nothing here computes anything of its own.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clapperboard, X } from 'lucide-react';
import { useStore } from '../store';

export const TOUR = [
  { path: '/', hash: 'climate-shift', title: { bn: 'দুই এলাকা, দুই বিপদ', en: 'Two places, two dangers' },
    say: { bn: 'ফাটা মাটি আর ডোবা জমি: বরেন্দ্রের গোদাগাড়ীতে খরা, নিচু ধামরাইয়ে বন্যা। পাশে নাসা পাওয়ারের ২৫ মৌসুমে আবহাওয়া কতটা বদলেছে (সাত বিভাগের সাত উপজেলার গড়)। পরের দুই ধাপে দুই এলাকার কৃষক নিজের এলাকার তথ্যে আলাদা উত্তর পান।', en: 'Cracked earth and drowned fields: drought on Godagari’s Barind, floods in low-lying Dhamrai. Beside it, how 25 seasons of NASA POWER weather have changed (seven upazilas, one per division, averaged). In the next two steps a farmer in each place gets a different answer from their own area’s data.' } },
  { path: '/farmer/plan', farmer: 'RAHIM', title: { bn: 'রহিমের সিদ্ধান্ত: রাখুন, বদলান, না সরে যান', en: 'Rahim’s decision: keep, adjust or shift' },
    say: { bn: 'গোদাগাড়ীর রহিম উদ্দিন। প্রতিটি ফসল আর তারিখ গত ২৫ মৌসুমের নাসার আবহাওয়ায় যাচাই করা: কত মৌসুমে ঠিক ছিল, সঙ্গে মাটি, সেচ আর লাভ।', en: 'Rahim Uddin in Godagari. Every crop and date is tested against 25 seasons of NASA weather: how many seasons it worked, with soil, water and profit.' } },
  { path: '/farmer/plan', farmer: 'RAZIB', title: { bn: 'একই প্রশ্ন, ধামরাইয়ে', en: 'The same question in Dhamrai' },
    say: { bn: 'ধামরাইয়ের রাজিব মিয়া: নিজের এলাকার আলাদা নাসা তথ্য, তাই উত্তরও আলাদা।', en: 'Razib Miah in Dhamrai: his own area’s NASA data, so a different answer.' } },
  { path: '/farmer/voice', farmer: 'RAHIM', title: { bn: 'বাংলায় মুখে জিজ্ঞেস করুন', en: 'Ask it aloud in Bangla' },
    say: { bn: '"এই রবিতে কী লাগাব?" বলুন বা চিপে চাপুন। একই হিসাব থেকে উত্তর আসে, বাংলায়।', en: 'Say "এই রবিতে কী লাগাব?" (what should I plant this Rabi?) or tap a chip. The answer comes from the same working, in Bangla.' } },
  { path: '/officer/requests', officer: ['godagari', 'Deopara'], title: { bn: 'ইউনিয়নের কৃষি কর্মকর্তা সমস্যা পান', en: 'The union officer receives a problem report' },
    say: { bn: 'কৃষকের পাঠানো ছবি আর জমির তথ্যসহ অনুরোধ। একটি খুলে উত্তর পাঠান; উত্তর কৃষকের সাহায্য পাতায় যায়। এগুলো নমুনা অনুরোধ।', en: 'Requests arrive with the farmer’s photo and field details. Open one and send a reply; it reaches the farmer’s Help page. These are sample requests.' } },
  { path: '/officer/supply', officer: ['godagari', 'Deopara'], title: { bn: 'সবাই একসঙ্গে তুললে দাম পড়ে', en: 'When everyone harvests at once, prices fall' },
    say: { bn: 'কোন সপ্তাহে কত ফসল উঠবে, আর ডিএএম-এর দামের ইতিহাসে কোন মাসে দাম সাধারণত পড়ে। কর্মকর্তা আগেই রোপণ ছড়িয়ে দিতে বলতে পারেন।', en: 'How much comes in each week, and which months DAM’s price history usually dips. The officer can spread planting dates ahead of time.' } },
  { path: '/officer/radar', officer: ['godagari', 'Deopara'], title: { bn: 'বৃষ্টি কবে নামে, রোপণ কবে হয়', en: 'When the rains set in, when planting happens' },
    say: { bn: 'জিপিএম আইমার্জের ২৫ বছরের বৃষ্টি থেকে প্রতি বছরের বৃষ্টি শুরু, আর সেন্টিনেল-১ রাডারে আমন রোপণের তারিখ।', en: 'The date the rains set in each year from 25 years of GPM IMERG rain, and Aman transplanting dates from Sentinel-1 radar.' } },
];

export function startTour(dispatch, navigate) { dispatch({ type: 'set', patch: { tour: 0 } }); go(TOUR[0], dispatch, navigate); }

function go(step, dispatch, navigate) {
  if (step.farmer) dispatch({ type: 'chooseFarmer', id: step.farmer });
  if (step.officer) dispatch({ type: 'set', patch: { officerUpazila: step.officer[0], officerUnion: step.officer[1] } });
  navigate(step.path);
}

export default function DemoTour() {
  const { s, T, L, dispatch } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const k = s.tour;
  const step = k == null ? null : TOUR[k];
  // bring the step's section into view once its page is there
  useEffect(() => {
    if (!step?.hash || pathname !== step.path) return undefined;
    const t = setTimeout(() => document.getElementById(step.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
    return () => clearTimeout(t);
  }, [step, pathname]);
  if (!step) return null;
  const to = (n) => { dispatch({ type: 'set', patch: { tour: n } }); go(TOUR[n], dispatch, navigate); };
  const close = () => dispatch({ type: 'set', patch: { tour: null } });
  return (
    <aside role="dialog" aria-label={T('ডেমো গল্প', 'Demo story')}
      className="fixed inset-x-3 bottom-[84px] z-[60] mx-auto max-w-[560px] rounded-[22px] border border-black/10 bg-white/95 p-4 shadow-[0_18px_44px_-14px_rgba(0,0,0,.45)] backdrop-blur sm:bottom-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-700 text-white"><Clapperboard size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase tracking-[.14em] text-primary-700">{T(`ডেমো গল্প · ধাপ ${(k + 1).toLocaleString('bn-BD')}/${TOUR.length.toLocaleString('bn-BD')}`, `Demo story · step ${k + 1}/${TOUR.length}`)}</p>
          <p className="mt-0.5 text-[16px] font-bold leading-snug">{L(step.title)}</p>
          <p className="mt-1 text-[13.5px] leading-6 text-ink/75">{L(step.say)}</p>
        </div>
        <button type="button" onClick={close} aria-label={T('গল্প বন্ধ করুন', 'Close the story')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" disabled={k === 0} onClick={() => to(k - 1)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-ink/70 hover:bg-black/5 disabled:opacity-40"><ArrowLeft size={16} />{T('আগে', 'Back')}</button>
        <div className="flex gap-1" aria-hidden="true">{TOUR.map((_, i) => <i key={i} className={`h-1.5 w-1.5 rounded-full ${i === k ? 'bg-primary-700' : 'bg-black/15'}`} />)}</div>
        {k < TOUR.length - 1
          ? <button type="button" onClick={() => to(k + 1)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('পরের ধাপ', 'Next')}<ArrowRight size={16} /></button>
          : <button type="button" onClick={close} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('শেষ', 'Done')}</button>}
      </div>
    </aside>
  );
}
