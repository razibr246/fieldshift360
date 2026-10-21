// Seven Divisions, seven farmers: the hub. A map of Bangladesh with the seven levels, each farmer's two environmental
// and biological "bosses", and how the FieldShift Score and the Danger Ends work.
import { Link } from 'react-router-dom';
import { MapPinned, Swords, Bug, Sparkles, ArrowRight, Skull, Flame, Waves, Landmark, Info, HeartHandshake } from 'lucide-react';
import { useStore } from '../../store';
import CropPhoto from '../../components/CropPhoto';
import BD from '../../data/geo/bangladesh_crops.json';
import { LEVELS, mapXY } from '../../data/stories';
import { DANGERS, WEIGHTS } from '../../engine/missions';
import { bnDigits } from '../../engine/dates';

const DIVISION_OF = {
  Dhaka: ['Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi', 'Manikganj', 'Munshiganj', 'Tangail', 'Kishoreganj', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
  Rajshahi: ['Rajshahi', 'Chapai Nawabganj', 'Naogaon', 'Natore', 'Bogura', 'Joypurhat', 'Pabna', 'Sirajganj'],
  Chattogram: ['Chattogram', 'Cox’s Bazar', 'Bandarban', 'Rangamati', 'Khagrachari', 'Feni', 'Noakhali', 'Lakshmipur', 'Cumilla', 'Chandpur', 'Brahmanbaria'],
  Khulna: ['Khulna', 'Bagerhat', 'Satkhira', 'Jashore', 'Narail', 'Magura', 'Jhenaidah', 'Chuadanga', 'Kushtia', 'Meherpur'],
  Barishal: ['Barishal', 'Bhola', 'Patuakhali', 'Barguna', 'Pirojpur', 'Jhallokati'],
  Rangpur: ['Rangpur', 'Dinajpur', 'Thakurgaon', 'Panchagar', 'Nilphamari', 'Lalmonirhat', 'Kurigram', 'Gaibandha'],
  Sylhet: ['Sylhet', 'Sunamganj', 'Habiganj', 'Moulvibazar'],
};
const divOf = Object.fromEntries(Object.entries(DIVISION_OF).flatMap(([d, list]) => list.map((z) => [z, d])));
const DANGER_ICON = { 1: Skull, 2: Flame, 3: Waves, 4: Landmark };

export default function Stories() {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const [W, H] = BD.viewBox;
  const tone = Object.fromEntries(LEVELS.map((l) => [l.division.en, l.tone]));
  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <div className="hero-rise max-w-3xl">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><MapPinned size={15} />{T('সাত বিভাগ, সাত কৃষক', 'Seven divisions, seven farmers')}</p>
        <h1 className="mt-5 text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[56px]">
          <span className="block">{T('প্রতিটি বিভাগের', 'Every division has')}</span>
          <span className="block bg-[linear-gradient(100deg,#245a28_0%,#43863a_45%,#237479_100%)] bg-clip-text pb-2 text-transparent">{T('নিজের লড়াই।', 'its own fight.')}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-[1.7] text-ink/70">{T('খরা, পাহাড়ি ঢল, লবণ, জোয়ার, কুয়াশা আর ব্লাইট। প্রতিটি গল্প একটি খেলার স্তর: একজন কৃষক, দুই-তিনটি জমি, আর সেই এলাকার আসল নাসা আবহাওয়ার ২৫ বছর। আপনার সিদ্ধান্ত একটি সত্যিকারের পুরোনো বছরে চালিয়ে দেখা হয়।', 'Drought, flash floods, salt, tides, fog and blight. Each story is a game level: one farmer, two or three plots, and 25 years of that place’s real NASA weather. Your decisions are played through a real past year.')}</p>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="glass flat rounded-[28px] p-4 lg:sticky lg:top-24">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={T('বাংলাদেশের মানচিত্রে সাতটি স্তর', 'The seven levels on a map of Bangladesh')}>
            {BD.districts.map((d) => <path key={d.id} d={d.d} fill={tone[divOf[d.id]] ?? '#dfe7dc'} fillOpacity={0.18} stroke="#fff" strokeWidth="1.2" />)}
            {LEVELS.map((l) => {
              const [x, y] = mapXY(l.lat, l.lon);
              return (
                <Link key={l.id} to={`/stories/${l.id}`} aria-label={`${L(l.division)}: ${L(l.farmer)}`}>
                  <circle cx={x} cy={y} r="22" fill={l.tone} opacity=".18" className="story-pulse" style={{ transformOrigin: `${x}px ${y}px` }} />
                  <circle cx={x} cy={y} r="13" fill={l.tone} stroke="#fff" strokeWidth="3" />
                  <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{lang === 'bn' ? bnDigits(l.n) : l.n}</text>
                  <text x={x + (x > 450 ? -20 : 20)} y={y + 4} textAnchor={x > 450 ? 'end' : 'start'} fontSize="17" fontWeight="700" fill="#13261b" stroke="#fff" strokeWidth="4" paintOrder="stroke">{L(l.division)}</text>
                </Link>
              );
            })}
          </svg>
          <p className="px-1 text-[12px] text-muted">{T('জেলার সীমানা: geoBoundaries (BBS/OCHA)। রং বিভাগ অনুযায়ী।', 'District boundaries: geoBoundaries (BBS/OCHA), coloured by division.')}</p>
        </div>

        <ol className="space-y-4">
          {LEVELS.map((l) => (
            <li key={l.id}>
              <Link to={`/stories/${l.id}`} className="tool-card glass flat group grid overflow-hidden rounded-[24px] sm:grid-cols-[180px_1fr]">
                <div className="relative min-h-[150px]"><CropPhoto crop={l.crops[0]} width={500} sizes="200px" linkCredit={false} /></div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 min-w-7 place-items-center rounded-full px-2 text-[13px] font-bold text-white" style={{ background: l.tone }}>{T(`স্তর ${bnDigits(l.n)}`, `Level ${l.n}`)}</span>
                    <span className="text-[13px] font-semibold text-muted">{L(l.division)} · {L(l.upazila)}</span>
                    <span className="rounded-full bg-primary-700 px-2 py-0.5 text-[11.5px] font-bold text-white">{T('নমুনা খামার', 'Sample farm')}</span>
                    {l.woman && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11.5px] font-bold text-violet-800"><HeartHandshake size={12} />{T('নারী কৃষক', 'Woman farmer')}</span>}
                  </div>
                  <div className="font-display mt-1 text-[22px] font-semibold">{L(l.farmer)}</div>
                  <div className="mt-2 grid gap-1.5 text-[13.5px] leading-5 sm:grid-cols-2">
                    <span className="flex gap-1.5"><Swords size={15} className="mt-0.5 shrink-0 text-red-700" /><span><b>{T('পরিবেশের দানব', 'Environmental boss')}:</b> {L(l.hazard)}</span></span>
                    <span className="flex gap-1.5"><Bug size={15} className="mt-0.5 shrink-0 text-paddy-700" /><span><b>{T('রোগ-পোকার দানব', 'Biological boss')}:</b> {L(l.bio)}</span></span>
                  </div>
                  <div className="mt-2 flex gap-1.5 text-[13.5px] leading-5 text-primary-800"><Sparkles size={15} className="mt-0.5 shrink-0" /><span><b>{T('পাওয়ার-আপ', 'Power-up')}:</b> {L(l.power)}</span></div>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-700">{l.mission ? T('গল্প পড়ুন, খেলুন, খামারে ঢুকুন', 'Read, play, enter the farm') : T('খামারে ঢুকুন', 'Enter the farm')}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="glass flat rounded-[24px] p-5">
          <h2 className="text-[22px] font-bold">{T('FieldShift স্কোর', 'The FieldShift Score')}</h2>
          <p className="mt-1 text-[14.5px] leading-6 text-muted">{T('প্রতিটি সিদ্ধান্ত পাঁচ দিক থেকে মাপা; মোট ১০০, সঙ্গে বোনাস।', 'Every decision is weighed on five pillars: 100 points, plus a bonus.')}</p>
          <div className="mt-3 rounded-xl bg-primary-950 px-4 py-3 text-center font-mono text-[14px] text-primary-50">{T('স্কোর', 'Score')} = 0.25·Y + 0.20·E + 0.20·C + 0.20·B + 0.15·M</div>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-6">
            {[['Y', T('ফলন: জাতের সম্ভাব্য ফলনের কত ভাগ', 'Yield: share of the variety’s potential')], ['E', T('মাটি ও পরিবেশ: চুন, সুষম সার, লবণ, পানি', 'Soil and earth: lime, balanced fertiliser, salt, water')], ['C', T('জলবায়ু সহনশীলতা: জাত, সময়, সতর্কতায় সাড়া', 'Climate resilience: variety, timing, acting on alerts')], ['B', T('আইপিএম: ফাঁদ, পাখির ডাল, সময়মতো ওষুধ; অন্ধ স্প্রেতে −১৫', 'IPM: traps, perches, timely treatment; −15 for blind spraying')], ['M', T('বাজার: শুকানো, সংরক্ষণ, দালাল এড়িয়ে বিক্রি', 'Market: drying, storage, selling past the middlemen')]].map(([k, v]) => (
              <li key={k} className="flex gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-100 text-[12px] font-bold text-primary-800">{k}</span><span>{v} <span className="text-muted">({lang === 'bn' ? bnDigits(Math.round(WEIGHTS[k] * 100)) : Math.round(WEIGHTS[k] * 100)})</span></span></li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-muted">{T('FieldShift-এর সতর্কতা মেনে কাজ করলে ×১.১ বোনাস।', 'Acting on a FieldShift alert earns a ×1.1 bonus.')}</p>
        </div>
        <div className="glass flat rounded-[24px] p-5">
          <h2 className="text-[22px] font-bold">{T('বিপদের শেষ: খেলা যেখানে থামে', 'Danger Ends: where the game stops')}</h2>
          <ul className="mt-3 space-y-3">
            {Object.entries(DANGERS).map(([k, d]) => { const Icon = DANGER_ICON[k]; return (
              <li key={k} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700"><Icon size={19} /></span><span><span className="block text-[15px] font-bold">{L(d.title)}</span><span className="block text-[13.5px] leading-5 text-muted">{L(d.text)}</span></span></li>
            ); })}
          </ul>
        </div>
      </section>
      <p className="mt-8 flex gap-2 text-[13px] leading-6 text-muted"><Info size={16} className="mt-1 shrink-0" />{T('গল্পের কৃষক আর তাঁদের পরিবার বানানো চরিত্র, এসব এলাকার কৃষকদের সাধারণ অভিজ্ঞতা থেকে লেখা; কোনো আসল মানুষ নন। গল্পে কর্মকর্তা শুধু পদে আছেন; প্রতিটি উপজেলার আসল কৃষি অফিসারের নাম অফিসের DAE বাতায়ন থেকে পাশে দেওয়া, গল্পের ঘটনা তাঁদের নিয়ে নয়। প্রতিটি বিপদের সময় আর মাপ আসল নাসা তথ্য থেকে।', 'The farmers in these stories and their families are composite characters written from what farmers in these places commonly face; they are not real people. In the stories the officer appears only by post; each upazila’s real agriculture officer is named beside it, from the office’s DAE portal, and the events are not about them. The timing and size of every hazard comes from real NASA data.')}</p>
    </div>
  );
}
