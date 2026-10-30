// The 3-minute demo story for a judge or a visitor: one farmer's decision first, then the existing pages in order, with a short line on what to look
// at in each. Each step sets who is signed in (a Godagari or Dhamrai farmer, the union officer, the upazila officer)
// and opens the page; nothing here computes anything of its own.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clapperboard, X } from 'lucide-react';
import { useStore } from '../../store';

export const TOUR = [
  // One farmer, one field, one decision first; the evidence and what is real; the ten-year view; then the rest.
  { path: '/farmer/plan', farmer: 'RAHIM', step: 4, hash: 'season-compare', title: { bn: 'একজন কৃষক, একটা জমি, একটা সিদ্ধান্ত', en: 'One farmer, one field, one decision' },
    say: { bn: 'গোদাগাড়ীর রহিম উদ্দিন, বরেন্দ্রের একটা জমি। এই রবিতে কী লাগাবেন? এখন যা করেন আর দুটি বিকল্প পাশাপাশি: একই ২৫ মৌসুমের নাসা আবহাওয়া, একই দাম, একই জমি। রঙিন দাগে দেখা যায় কেন কোনটা ওপরে।', en: 'Rahim Uddin, one field on Godagari’s Barind. What should he sow this Rabi? What he grows now and two alternatives side by side: the same 25 seasons of NASA weather, the same prices, the same field. The coloured bar shows why each ranks where it does.' } },
  { path: '/farmer/plan', farmer: 'RAHIM', step: 4, hash: 'first-step', title: { bn: 'প্রথম কাজ, আর তার আগে মাঠে কী দেখবেন', en: 'The first step, and what to check in the field first' },
    say: { bn: 'কোন ফসল, কোন সপ্তাহে। তার আগে: মাটি পরীক্ষা (মাটির সংখ্যা মডেলের আনুমানিক), বীজ, সেচের পালা, পানি জমে কি না। এক চাপে পুরো তুলনাটা উপসহকারী কৃষি কর্মকর্তার কাছে যায়।', en: 'Which crop, which week. Before that: a soil test (the soil figures are a model estimate), seed, the irrigation turn, whether water stands. One tap sends the whole comparison to the union’s agriculture officer.' } },
  { path: '/farmer/plan', farmer: 'RAHIM', step: 4, hash: 'how-made', title: { bn: 'পরামর্শটা কীভাবে তৈরি, কতটা পাকা', en: 'How the advice was made, and how firm it is' },
    say: { bn: 'কোন তথ্য হিসাবে ঢুকেছে আর কোনটা শুধু পাশে দেখানো; ফসলের নিয়ম আর তার যাচাই এখনো বাকি; আর ওজন বা আবহাওয়া বদলালেও একই ফসল প্রথম থাকে কি না। ব্যবধান কম হলে অ্যাপ নিজেই বলে "কাছাকাছি, নিশ্চিত নয়"।', en: 'What went into the calculation and what is only context; the crop rules, still awaiting local review; and whether the same crop stays first under other weights and weather. When the lead is small the app says “a close call” itself.' } },
  { path: '/science', hash: 'coverage', title: { bn: 'কোনটা আসল, কোনটা মডেল, কোনটা নমুনা', en: 'What is real, what is modelled, what is sample' },
    say: { bn: 'প্রতিটি উৎস: উপগ্রহে দেখা, স্টেশনের মাপ, মডেলের হিসাব, প্রকাশিত রেকর্ড, নিয়ম না নমুনা; কোন বছর, কত বড় এলাকা, আর এই জমির জন্য আছে, পুরোনো না নেই। কৃষকেরা নমুনা; আবহাওয়া, উপগ্রহ, দাম আর ফলন আসল।', en: 'Every source: seen by satellite, measured at a station, estimated by a model, a published record, a rule or sample; which years, how large an area, and whether it is here, out of date or missing for this field. The farmers are sample; the weather, satellites, prices and yields are real.' } },
  { path: '/', hash: 'climate-shift', title: { bn: 'আবহাওয়া বদলেছে, পুরোনো ফসলচক্র টেকে না', en: 'The weather has moved; the old rotation no longer holds' },
    say: { bn: 'ফাটা মাটি আর ডোবা জমি: বরেন্দ্রের গোদাগাড়ীতে খরা, নিচু ধামরাইয়ে বন্যা। পাশে নাসা পাওয়ারের ২৫ মৌসুমে তাপ, বৃষ্টি আর খুব গরম দিন কতটা বদলেছে।', en: 'Cracked earth and drowned fields: drought on Godagari’s Barind, floods in low-lying Dhamrai. Beside it, how 25 seasons of NASA POWER heat, rain and hot days have changed.' } },
  { path: '/', hash: 'impact', title: { bn: 'প্রায় ১.৭ কোটি কৃষক পরিবারের সিদ্ধান্ত', en: 'A choice nearly 17 million farm households make' },
    say: { bn: 'সারা দেশে ১.৬৯ কোটি কৃষক পরিবার (কৃষি শুমারি ২০১৯), ৪৮.৫ লাখ হেক্টর বোরো। নিচের সারণিতে সাত উপজেলার মানুষ আর নাসা SEDAC-এর মাপ: কতটা ঘন বসতি, কতটা জমি ১০ মিটারের নিচে, কতটা ফসলি।', en: '16.88 million farm households (Agriculture Census 2019) and 4.85 million ha of Boro. Below, the seven upazilas’ people and NASA SEDAC’s measures: how crowded, how much lies below 10 m, how much is cropland.' } },
  { path: '/farmer/future', farmer: 'RAHIM', hash: 'ff-time', title: { bn: 'একই জমি, তিন রকম ফসলচক্র, দশ বছর', en: 'One field, three rotations, ten years' },
    say: { bn: 'রহিমের জমির ২৫০ মিটার ঘরের আনুমানিক মাটি (SoilGrids মডেল, মাটি পরীক্ষা নয়) থেকে শুরু। প্রতিটি মৌসুমে মাটির কাটা অংশ: জৈব পদার্থ, শক্ত তলা, শিকড়, কেঁচো। এখনকার বোরো-আমন মাটি ধরে রাখে না; ডাল আর পাট ঢোকালে মাটি ভালো হয়।', en: 'It starts from Rahim’s own soil (SoilGrids). Each season, a cut through the field: organic matter, the plough pan, roots, earthworms. Boro–Aman as now does not build the soil; pulses and jute in the rotation do.' } },
  { path: '/farmer/future', farmer: 'RAHIM', hash: 'ff-best', title: { bn: 'কৃষকের চাওয়া মিলিয়ে সেরা ফসলচক্র', en: 'The best rotation for what the farmer wants' },
    say: { bn: 'কয়েকশো ফসলচক্র দশ বছর করে চালানো: মাটির স্বাস্থ্য, সেচের পানি, লাভ, আবহাওয়ার ঝুঁকি আর রোগ-পোকা। কৃষক "কম পানি" বা "বেশি আয়" বেছে নিলে ক্রম বদলায়।', en: 'Several hundred rotations run for ten years each: soil health, irrigation water, profit, weather risk and pests. When the farmer picks “less water” or “more income”, the ranking changes.' } },
  { path: '/farmer/future', farmer: 'RAHIM', hash: 'ff-ledger', title: { bn: 'পানি আর জলবায়ুর খাতা', en: 'Water and the climate account' },
    say: { bn: 'ধানক্ষেতের মিথেন বনাম মাটিতে জমা কার্বন (আইপিসিসি পদ্ধতি)। বোরোতে AWD দিলে পানি আর মিথেন দুটোই কমে।', en: 'Paddy methane against carbon stored in the soil (IPCC method). AWD on the Boro saves both water and methane.' } },
  { path: '/farmer/future', farmer: 'RAHIM', hash: 'ff-robust', title: { bn: '৪০টি সম্ভাব্য ভবিষ্যতে পরীক্ষা', en: 'Each choice tested against 40 possible futures' },
    say: { bn: 'নাসার NEX-GDDP-CMIP6-এর ৮টি জলবায়ু মডেলে আলাদা করে ২০৪০-এর দশক চালানো: কোন ফসলচক্র কতগুলো ভবিষ্যতে মাটি ধরে রাখে আর ঝুঁকি বাড়ায় না।', en: 'The 2040s run in each of NASA NEX-GDDP-CMIP6’s eight climate models: in how many futures each rotation keeps the soil and adds no risk.' } },
  { path: '/farmer/plan', farmer: 'RAZIB', title: { bn: 'এই মৌসুমের ধাপ, ধামরাইয়ে', en: 'This season’s step, in Dhamrai' },
    say: { bn: 'ফসলচক্রের এ বছরের ধাপ: কোন ফসল, কবে। প্রতিটি তারিখ ২৫ মৌসুমের নাসা আবহাওয়ায় যাচাই। ধামরাইয়ের রাজিব নিজের এলাকার তথ্যে আলাদা উত্তর পান।', en: 'This year’s step of the rotation: which crop, and when. Every date is tested on 25 seasons of NASA weather. Razib in Dhamrai gets a different answer from his own area’s data.' } },
  { path: '/farmer/voice', farmer: 'RAHIM', title: { bn: 'বাংলায় মুখে জিজ্ঞেস করুন', en: 'Ask it aloud in Bangla' },
    say: { bn: '"এই ধান কাটার পর কী লাগামু?" বলুন বা চিপে চাপুন। একই হিসাব থেকে উত্তর আসে, বাংলায়।', en: 'Say "এই ধান কাটার পর কী লাগামু?" (what do I plant after this rice?) or tap a chip. The answer comes from the same working, in Bangla.' } },
  { path: '/officer/radar', officer: ['godagari', 'Deopara'], title: { bn: 'বৃষ্টি কবে নামে, রোপণ কবে হয়', en: 'When the rains set in, when planting happens' },
    say: { bn: 'জিপিএম আইমার্জের ২৫ বছরের বৃষ্টি থেকে প্রতি বছরের বৃষ্টি শুরু, আর সেন্টিনেল-১ রাডারে আমন রোপণ; জেলার প্রতিটি উপজেলায়। কৃষি কর্মকর্তা এখান থেকেই এলাকার ফসলচক্র সাজাতে পারেন।', en: 'The date the rains set in each year from 25 years of GPM IMERG rain, and Aman transplanting from Sentinel-1 radar, for every upazila of the district. From here the officer can plan the area’s rotations.' } },
  { path: '/officer/upazila', officer: ['godagari', 'Deopara'], hash: 'up-rotation', title: { bn: 'পুরো উপজেলায় কী বদলায়', en: 'What changes across the upazila' },
    say: { bn: 'বোরো চাষিদের একটা অংশ ফসলচক্র বদলালে উপজেলায় বছরে কত পানি বাঁচে, কত গ্রিনহাউস গ্যাস কমে, মাটিতে কত কার্বন জমে; পাশে GRACE উপগ্রহে মাটির নিচের পানি কমার হার।', en: 'If a share of Boro farmers changed rotation: water saved a year across the upazila, greenhouse gas cut, carbon built in the soil; beside it the fall in water underground from the GRACE satellites.' } },
];

export function startTour(dispatch, navigate) { dispatch({ type: 'set', patch: { tour: 0 } }); go(TOUR[0], dispatch, navigate); }

function go(step, dispatch, navigate) {
  if (step.farmer) dispatch({ type: 'chooseFarmer', id: step.farmer });
  if (step.step != null) dispatch({ type: 'set', patch: { step: step.step } });
  if (step.officer) dispatch({ type: 'set', patch: { officerUpazila: step.officer[0], officerUnion: step.officer[1] } });
  navigate(step.path);
}

export default function DemoTour() {
  const { s, T, L, dispatch } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const k = s.tour;
  const step = k == null ? null : TOUR[k];
  const to = (n) => { dispatch({ type: 'set', patch: { tour: n } }); go(TOUR[n], dispatch, navigate); };
  const close = () => dispatch({ type: 'set', patch: { tour: null } });
  useEffect(() => {
    if (!step) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight' && k < TOUR.length - 1) to(k + 1);
      if (event.key === 'ArrowLeft' && k > 0) to(k - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, k]);
  // bring the step's section into view once its page is there
  useEffect(() => {
    if (!step?.hash || pathname !== step.path) return undefined;
    // Sections further up may mount on the way (LazyMount) and push the target down, so look again after each glide,
    // up to three times, until it has stopped moving.
    let tries = 0, t = 0;
    const aim = () => {
      const el = document.getElementById(step.hash);
      if (!el) return;
      const top = el.getBoundingClientRect().top - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
      if (Math.abs(top) > 8) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (Math.abs(top) > 8 && ++tries < 4) t = setTimeout(aim, 1100);
    };
    t = setTimeout(aim, 500);
    return () => clearTimeout(t);
  }, [step, pathname]);
  if (!step) return null;
  return (
    <aside role="dialog" aria-label={T('ডেমো গল্প', 'Demo story')}
      className="fixed inset-x-3 bottom-[84px] z-[60] mx-auto max-w-[560px] rounded-[22px] border border-black/10 bg-white/95 p-4 shadow-[0_18px_44px_-14px_rgba(0,0,0,.45)] backdrop-blur sm:bottom-5">
      <div className="mb-3 flex gap-1" role="progressbar" aria-label={T('ডেমো গল্পের অগ্রগতি', 'Demo story progress')} aria-valuemin={1} aria-valuemax={TOUR.length} aria-valuenow={k + 1}>
        {TOUR.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= k ? 'bg-primary-700' : 'bg-black/10'}`} />)}
      </div>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-700 text-white"><Clapperboard size={18} /></span>
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
          <p className="text-[11.5px] font-bold uppercase tracking-[.14em] text-primary-700">{T(`ডেমো গল্প · ধাপ ${(k + 1).toLocaleString('bn-BD')}/${TOUR.length.toLocaleString('bn-BD')}`, `Demo story · step ${k + 1}/${TOUR.length}`)}</p>
          <p className="mt-0.5 text-[16px] font-bold leading-snug">{L(step.title)}</p>
          <p className="mt-1 text-[13.5px] leading-6 text-ink/75">{L(step.say)}</p>
        </div>
        <button type="button" onClick={close} aria-label={T('গল্প বন্ধ করুন', 'Close the story')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" disabled={k === 0} onClick={() => to(k - 1)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-ink/70 hover:bg-black/5 disabled:opacity-40"><ArrowLeft size={16} />{T('আগে', 'Back')}</button>
        <p className="text-[12px] font-medium tabular-nums text-ink/55">{T('← → চালান · Esc বন্ধ', '← → navigate · Esc close')}</p>
        {k < TOUR.length - 1
          ? <button type="button" onClick={() => to(k + 1)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('পরের ধাপ', 'Next')}<ArrowRight size={16} /></button>
          : <button type="button" onClick={close} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('শেষ', 'Done')}</button>}
      </div>
    </aside>
  );
}
