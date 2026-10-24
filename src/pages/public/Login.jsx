import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Building2, ShieldCheck, UserRound, Info, MapPinned, Globe2 } from 'lucide-react';
import BrandMark from '../../components/brand/BrandMark';
import Photo from '../../components/Photo';
import { Segmented } from '../../components/ui';
import { LangToggle, BackButton } from '../../components/chrome';
import { useStore, demo } from '../../store';
import { UPAZILAS, placeLine } from '../../data/upazilas';
import { cropName, IRRIGATION } from '../../engine/crops';
import { num } from '../../engine/dates';
import { PROJECT_NAME } from '../../config/brand';
import registry from '../../data/fields/parcels.json';
import { LEVELS } from '../../data/stories';
import { bnDigits } from '../../engine/dates';
import { ABROAD, ABROAD_ORDER, areaIn } from '../../data/abroad';
import FarmerAvatar from '../../components/brand/FarmerAvatar';

export default function Login() {
  const { s, dispatch, T, L, farmers } = useStore();
  const [role, setRole] = useState('farmer');
  const navigate = useNavigate();
  // One sample farmer per upazila, each where that upazila's area alert is: Rahim in Purbapara, Deopara (tomato leaf
  // spot, Godagari) and Razib Miah in Chauhat village, Chauhat union (mustard aphids and a cold-hit seedbed, Dhamrai).
  // and, for the other five divisions, the story farmers (data/stories.js), each in a real village of their upazila.
  // Both lists run in the story level order: Dhaka, Rajshahi, Barishal, then the rest.
  const heroes = LEVELS.map((l) => farmers.find((f) => f.id === l.live)).filter(Boolean);
  const enterFarmer = (id) => { dispatch({ type: 'chooseFarmer', id }); navigate('/farmer'); };
  const where = (h) => {
    const u = demo.unions.find((x) => x.id === h.union);
    return T(`গ্রাম ${h.villageBn}, ${u.full.bn}, ${placeLine(UPAZILAS[u.upazila], 'bn')}`, `${h.village} village, ${u.full.en}, ${placeLine(UPAZILAS[u.upazila], 'en')}`);
  };
  // What the upazila office already has on record for this farmer: every field, before they ever open the app.
  const landLine = (h) => {
    const mine = registry.parcels.filter((p) => p.owner === h.id);
    const dec = mine.reduce((a, p) => a + p.area_dec, 0);
    return mine.length > 1
      ? T(`উপজেলা অফিসে ${num(mine.length, 'bn')}টি জমি নিবন্ধিত, মোট ${num(dec / 33, 'bn', { dp: 1 })} বিঘা; প্রতিটি উপগ্রহে দেখা যায়`, `${mine.length} fields registered with the upazila office, ${num(dec / 33, 'en', { dp: 1 })} bigha; each watched by satellite`)
      : T(`${num(h.area_dec / 33, 'bn', { dp: 1 })} বিঘা জমি, গতবার ${cropName(h.last_crop, 'bn')}, সেচ ${IRRIGATION[h.irrigation].bn}`, `${num(h.area_dec / 33, 'en', { dp: 1 })} bigha, last grew ${cropName(h.last_crop, 'en').toLowerCase()}, ${IRRIGATION[h.irrigation].en.toLowerCase()}`);
  };
  const enterOfficer = (u) => { dispatch({ type: 'set', patch: { officerUpazila: u.id, officerUnion: u.defaultUnion } }); navigate('/officer/upazila'); };
  const row = 'group flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition hover:border-primary-400 hover:bg-primary-50';
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* The photo stays put (sticky, one screen tall) while the list of farmers and officers scrolls beside it. */}
      <div className="relative hidden h-screen overflow-hidden lg:sticky lg:top-0 lg:block lg:self-start">
        <Photo name="farmer" fill sizes="50vw" priority />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,38,20,.0)_45%,rgba(13,38,20,.8)_100%)]" />
        <Poem />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="font-display max-w-md text-[30px] font-bold leading-tight">{T('যিনি মাঠে আছেন, সিদ্ধান্ত তাঁর। আমরা শুধু হিসাবটা হাতের কাছে আনি।', 'The farmer in the field makes the call. We just put the working in their hands.')}</p>
        </div>
      </div>
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><BackButton /><Link to="/" aria-label={T('প্রথম পাতা', 'Home')}><BrandMark /></Link></div><LangToggle /></div>
        <div className="mx-auto my-auto w-full max-w-[520px] py-10">
          <h1 className="text-[32px] font-bold">{T(`${PROJECT_NAME} খুলুন`, `Open ${PROJECT_NAME}`)}</h1>
          <p className="mt-2 text-[16px] leading-7 text-muted">{T('এই নমুনায় পাসওয়ার্ড বা ওটিপি নেই। কৃষক বা কর্মকর্তা বেছে নিলেই চলবে, পরে যেকোনো সময় বদলানো যায়।', 'There is no password or OTP in this demo. Pick the farmer or the officer — you can switch any time.')}</p>
          <Segmented className="mt-6 grid w-full grid-cols-2" value={role} onChange={setRole}
            options={[{ value: 'farmer', icon: UserRound, label: T('আমি কৃষক', 'I am a farmer') }, { value: 'officer', icon: ShieldCheck, label: T('আমি কৃষি কর্মকর্তা', 'I am an officer') }]} />
          {role === 'farmer' ? (
            <div className="mt-5 space-y-2.5">
              {heroes.map((h) => (
                <button key={h.id} type="button" onClick={() => enterFarmer(h.id)} className={`${row} ${h.id === s.farmerId ? 'border-primary-300 bg-white' : 'border-border bg-white'}`}>
                  <FarmerAvatar id={h.id} size={48} className="transition-transform duration-300 group-hover:scale-[1.06]" fallback={<span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-100 text-[18px] font-bold text-primary-800">{L(h.name).slice(0, 1)}</span>} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[16px] font-bold">{L(h.name)}{(() => { const lv = LEVELS.find((x) => x.live === h.id); return lv && <span className="rounded-full px-2 py-0.5 text-[11.5px] font-bold text-white" style={{ background: lv.tone }}>{T(`স্তর ${bnDigits(lv.n)} · ${lv.division.bn}`, `Level ${lv.n} · ${lv.division.en}`)}</span>; })()}</span>
                    <span className="block text-[13.5px] font-semibold leading-5 text-primary-800">{where(h)}</span>
                    <span className="block text-[13.5px] leading-5 text-muted">{landLine(h)}</span>
                  </span>
                  <ChevronRight size={20} className="text-primary-600 transition group-hover:translate-x-0.5" />
                </button>
              ))}
              <Link to="/stories" className="flex items-center gap-2 rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 p-3.5 text-[14px] font-semibold text-primary-800 hover:bg-primary-50">
                <MapPinned size={17} />{T('সাত বিভাগের গল্প আর মিশন, আসল নাসা আবহাওয়ায়', 'The seven division stories and missions, on real NASA weather')}<ChevronRight size={15} className="ml-auto" />
              </Link>
              <Neighbours role="farmer" />
            </div>
          ) : (
            <div className="mt-5 space-y-2.5">
              {LEVELS.map((l) => UPAZILAS[l.upz]).filter(Boolean).map((u) => (
                <button key={u.id} type="button" onClick={() => enterOfficer(u)} className="group flex w-full items-center gap-3 rounded-2xl bg-primary-950 p-3.5 text-left text-white transition hover:bg-primary-900">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10"><Building2 size={21} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold">{L(u.officer)}</span>
                    <span className="block text-[13.5px] font-semibold leading-5 text-primary-100">{placeLine(u, s.lang)}</span>
                    <span className="block text-[13.5px] leading-5 text-primary-200">{T('উপজেলা কৃষি অফিসার — উপজেলার সব ইউনিয়ন ও গ্রাম', 'Upazila agriculture officer — every union and village')}</span>
                  </span>
                  <ChevronRight size={20} />
                </button>
              ))}
              <Neighbours role="officer" />
            </div>
          )}
          <div className="mt-6 flex gap-2 rounded-xl bg-white p-3.5 text-[13.5px] leading-6 text-muted ring-1 ring-border"><Info size={17} className="mt-0.5 shrink-0" />{T('উপজেলা কৃষি অফিসারদের নাম আসল, কিন্তু কৃষকের জমি, অনুরোধ আর সব সংখ্যা নমুনা তথ্য — কোনো অফিসের আসল কাজের হিসাব নয়। আসল ব্যবহারে মোবাইল নম্বর দিয়ে নিবন্ধন হবে — সেটা পরের ধাপের কাজ।', 'The upazila agriculture officers’ names are real, but the farmers’ fields, the requests and every number are sample data, not any office’s real work. A real launch would register people by mobile number; that comes later.')}</div>
        </div>
      </div>
    </main>
  );
}

// The neighbouring countries, like the Bangladesh pairs: in each country one sample farmer and the local agriculture
// officer for that farmer's area, side by side; either half opens that person's app.
function Neighbours({ role }) {
  const { T, L } = useStore();
  return (
    <div className="pt-4">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <Globe2 size={17} className="text-primary-700" />
        <h2 className="text-[15px] font-bold">{T('প্রতিবেশী দেশ', 'Neighbouring countries')}</h2>
        <span className="h-px flex-1 bg-border" />
        <span className="text-[12px] font-semibold text-muted">{T('প্রতি দেশে একজন কৃষক, একজন কৃষি কর্মকর্তা', 'One farmer and one officer per country')}</span>
      </div>
      <div className="space-y-2.5">
        {ABROAD_ORDER.map((id) => {
          const c = ABROAD[id];
          const f = c.farmer;
          const farmer = (
            <Link key="f" to={`/abroad/${id}`} className={`group flex min-w-0 items-center gap-3 p-3.5 text-left transition hover:bg-primary-50 ${role === 'farmer' ? '' : 'opacity-90'}`}>
              <FarmerAvatar id={f.id} size={44} flag={c.flag} className="transition-transform duration-300 group-hover:scale-[1.06]" fallback={<span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[22px]" style={{ background: c.soft }} aria-hidden="true">{c.flag}</span>} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-muted"><UserRound size={12} />{T('কৃষক', 'Farmer')}</span>
                <span className="block truncate text-[15.5px] font-bold leading-tight">{L(f.name)}</span>
                <span className="line-clamp-2 block text-[12.5px] font-semibold leading-[18px] text-primary-800">{T(`${f.village.bn}, ${f.place.bn.split(',').slice(-2).join(',').trim()}`, `${f.village.en}, ${f.place.en.split(',').slice(-2).join(',').trim()}`)}</span>
                <span className="line-clamp-2 block text-[12.5px] leading-[18px] text-muted">{T(`${bnDigits((Math.round(areaIn(c, f.farmDec) * 10) / 10).toString())} ${c.unit.bn} · ${f.now.bn}`, `${Math.round(areaIn(c, f.farmDec) * 10) / 10} ${c.unit.en}${areaIn(c, f.farmDec) === 1 ? '' : 's'} · ${f.now.en}`)}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-primary-600 transition group-hover:translate-x-0.5" />
            </Link>
          );
          const officer = (
            <Link key="o" to={`/abroad/${id}/officer`} className="group flex min-w-0 items-center gap-3 p-3.5 text-left text-white transition hover:brightness-110" style={{ background: `linear-gradient(135deg, ${c.tone}, #0d2614 150%)` }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15"><Building2 size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-white/70"><ShieldCheck size={12} />{T('কৃষি কর্মকর্তা', 'Agriculture officer')}</span>
                <span className="block text-[15px] font-bold leading-tight">{L(c.local.role)}</span>
                <span className="block truncate text-[12.5px] leading-5 text-white/75">{L(c.local.area)} · {L(c.name)}</span>
              </span>
              <ChevronRight size={18} className="shrink-0" />
            </Link>
          );
          return (
            <div key={id} className="grid overflow-hidden rounded-2xl border border-border bg-white sm:grid-cols-2">
              {role === 'farmer' ? [farmer, officer] : [officer, farmer]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Jibanananda Das, "Abar asibo phire" (Ruposhi Bangla): the poet's Kartik and its new rice, the season this app plans
// for. It sits on a small frosted card in the sky at the top right, clear of the farmer whatever the window's shape,
// and follows the app's language (the Bangla original, or an English translation). The words rise in one by one each
// time it appears; with reduced motion they are simply there.
const POEM = {
  bn: { lines: ['আবার আসিব ফিরে ধানসিড়িটির তীরে — এই বাংলায়', 'হয়তো মানুষ নয় — হয়তো বা শঙ্খচিল শালিখের বেশে;', 'হয়তো ভোরের কাক হয়ে এই কার্তিকের নবান্নের দেশে', 'কুয়াশার বুকে ভেসে একদিন আসিব এ কাঁঠাল-ছায়ায়;'],
    by: '— জীবনানন্দ দাশ, “আবার আসিব ফিরে”, রূপসী বাংলা' },
  en: { lines: ['I will come back to the Dhansiri’s banks — to this Bengal,', 'perhaps not as a man — perhaps as a kite or a myna;', 'perhaps as a crow at dawn, to this land of Kartik’s new rice,', 'drifting on the mist one day into this jackfruit shade;'],
    by: '— Jibanananda Das, “Abar Ashibo Phire”, Ruposhi Bangla (translation: FieldShift)' },
};
function Poem() {
  const { s } = useStore();
  const p = POEM[s.lang] ?? POEM.en;
  let k = 0;
  return (
    // The wrapper does the placing: .glass sets position: relative, which would cancel absolute on the card itself.
    <div className="absolute right-5 top-5 w-[min(22rem,45%)] xl:right-8 xl:top-8">
    <figure key={s.lang} lang={s.lang} className="glass lite rounded-[22px] px-5 py-4">
      <blockquote className={`font-display text-[#3b2a1c] ${s.lang === 'bn' ? 'text-[14.5px] leading-[1.7] xl:text-[16px]' : 'text-[13.5px] italic leading-[1.55] xl:text-[15px]'} font-semibold`}>
        {p.lines.map((line) => (
          <span key={line} className="block [text-wrap:balance]">
            {/* Real spaces between the word spans, so the poem copies and reads aloud as words. */}
            {line.split(' ').map((w, i) => <Fragment key={`${k}`}>{i > 0 && ' '}<span className="word" style={{ '--wd': `${250 + 55 * k++}ms` }}>{w}</span></Fragment>)}
          </span>
        ))}
      </blockquote>
      <figcaption className="word mt-2.5 text-[12px] font-semibold leading-4 text-[#5b4632]" style={{ '--wd': `${350 + 55 * k}ms` }}>{p.by}</figcaption>
    </figure>
    </div>
  );
}
