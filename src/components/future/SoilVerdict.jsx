// Field Future: does any rotation clearly do better for this soil than farming as now? Said plainly, with what the
// best and the next-best change in the soil (carbon, nitrogen, water, cover) and what they cost (fodder when the straw
// stays on the field). When no rotation clearly helps, it says so and what that means. engine/explain.js decides.
import { Scale, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Note, Tags } from '../ui';
import { soilVerdict, soilChanges } from '../../engine/explain';
import { num } from '../../engine/dates';
import { WATER_M3_PER_MM_BIGHA, ureaSavedKgPerBigha } from '../../engine/soilfuture';

const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

export default function SoilVerdict({ ff, second, sumOf, rotName }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const habit = sumOf(ff.habit), best = sumOf(ff.best);
  const v = soilVerdict({ best, habit });
  const WORD = {
    carbon: (x) => T(`মাটির জৈব কার্বন দশ বছরে এখনকার চেয়ে ${signed(x.v, 'bn')} শতাংশ বিন্দু`, `Soil organic carbon over ten years: ${signed(x.v, 'en')} percentage points against as now`),
    nitrogen: (x) => (x.v >= 0
      ? T(`ডাল-জাতীয় ফসলে বাতাসের নাইট্রোজেন মাটিতে: বিঘায় বছরে ইউরিয়া ${num(ureaSavedKgPerBigha(x.v), 'bn', { dp: 1 })} কেজি কম লাগে`, `Pulses fix nitrogen from the air: ${num(ureaSavedKgPerBigha(x.v), 'en', { dp: 1 })} kg less urea a bigha a year`)
      : T(`ডাল কম, তাই বিঘায় বছরে ইউরিয়া ${num(ureaSavedKgPerBigha(-x.v), 'bn', { dp: 1 })} কেজি বেশি লাগে`, `Fewer pulses, so ${num(ureaSavedKgPerBigha(-x.v), 'en', { dp: 1 })} kg more urea a bigha a year`)),
    water: (x) => T(`সেচের পানি বিঘায় বছরে ${num(Math.abs(x.v * WATER_M3_PER_MM_BIGHA), 'bn')} ঘনমিটার ${x.v <= 0 ? 'কম' : 'বেশি'}`, `${num(Math.abs(x.v * WATER_M3_PER_MM_BIGHA), 'en')} m³ ${x.v <= 0 ? 'less' : 'more'} irrigation a bigha a year`),
    cover: (x) => T(`জমি ফসলে ঢাকা থাকে বছরে ${signed(x.v, 'bn', 0)} দিন (খালি জমির মাটি বৃষ্টিতে ধুয়ে যায়)`, `The field is under a crop ${signed(x.v, 'en', 0)} days a year (bare soil washes away in rain)`),
    fodder: (x) => (x.residue === 'retain'
      ? T(`খড় জমিতে রাখলে মাটি ভালো হয়, কিন্তু গরুর খাবার কম থাকে (${signed(x.v, 'bn')} ফসলের খড়)`, `Straw kept on the field builds the soil but leaves less for cattle (${signed(x.v, 'en')} crops’ worth of straw)`)
      : T(`গরুর খাবারের খড় বা লতা: বছরে ${signed(x.v, 'bn')} ফসলের মতো`, `Straw or haulm for cattle: ${signed(x.v, 'en')} crops’ worth a year`)),
  };
  const Sign = ({ n }) => (n > 0 ? <ArrowUpRight size={15} className="shrink-0 text-primary-700" /> : n < 0 ? <ArrowDownRight size={15} className="shrink-0 text-red-700" /> : <Minus size={15} className="shrink-0 text-ink/40" />);
  const block = (e, title) => {
    const lines = soilChanges(sumOf(e), habit, e.rot.residue);
    return (
      <div className="rounded-2xl bg-canvas p-3.5">
        <div className="text-[14.5px] font-bold">{title}</div>
        <div className="mt-0.5 whitespace-pre-line text-[12px] leading-4 text-muted">{rotName(e.rot)}</div>
        <ul className="mt-2 space-y-1.5 text-[13.5px] leading-5">
          {lines.map((x) => <li key={x.k} className="flex items-start gap-1.5"><Sign n={x.sign} /><span className={x.sign < 0 ? 'text-red-800' : 'text-ink/85'}>{WORD[x.k](x)}</span></li>)}
        </ul>
      </div>
    );
  };
  return (
    <Card id="ff-verdict" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[20px] font-bold"><Scale size={20} className="text-primary-700" />{T('মাটির জন্য সত্যিই ভালো কোনটা?', 'Does any rotation really help the soil?')}</h2>
        <Tags list={['MODEL', 'RULE']} />
      </div>
      <Note tone={v.kind === 'better' ? 'ok' : 'gold'} className="mt-3">
        {v.kind === 'better'
          ? T(`হ্যাঁ: সেরা ফসলচক্রে দশ বছরে মাটির কার্বন এখনকার চেয়ে ${signed(v.gain, 'bn')} শতাংশ বিন্দু বেশি থাকে, মাটির স্বাস্থ্যের নম্বর ${signed(v.health, 'bn', 0)}।`, `Yes: with the best rotation the soil holds ${signed(v.gain, 'en')} percentage points more carbon after ten years than farming as now, and the soil-health score is ${signed(v.health, 'en', 0)}.`)
          : v.kind === 'slower'
            ? T('এই জমিতে কোনো ফসলচক্রই দশ বছরে মাটির কার্বন পুরো ধরে রাখে না; সেরাটা শুধু ক্ষয় ধীর করে। মানে: খড় বা গোবর বেশি দেওয়া, জমি খালি না রাখা, আর প্রতি দুই-তিন বছরে মাটি পরীক্ষা জরুরি।', 'On this field no rotation keeps all its soil carbon over ten years; the best only slows the loss. That means more straw or manure back to the soil, no bare months, and a soil test every two or three years.')
            : T('না, স্পষ্ট করে নয়: কোনো ফসলচক্রই মাটির জন্য এখনকার চাষের চেয়ে স্পষ্ট ভালো নয় (কার্বনে ১ শতাংশ বিন্দুর কম পার্থক্য, যা হিসাবের ভুলের মধ্যেই পড়ে)। মানে: মাটির কারণে ফসল বদলানোর দরকার নেই; পানি, আয় বা ঝুঁকি দেখে বাছুন, আর খড় জমিতে ফেরানোর মতো ছোট কাজ করুন।', 'No, not clearly: no rotation does clearly better for the soil than farming as now (under 1 percentage point of carbon, within the error of the working). That means there is no soil reason to change crops; choose by water, income or risk, and do small things like returning straw.')}
      </Note>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {block(ff.best, T('সেরা ফসলচক্র, এখনকার তুলনায়', 'The best rotation, against as now'))}
        {second && block(second, T('পরের বিকল্প, এখনকার তুলনায়', 'The next alternative, against as now'))}
      </div>
      <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('মাটির কার্বন ICBM মডেলে, শুরু SoilGrids-এর আনুমানিক কার্বন থেকে; নাইট্রোজেন আর খড়ের হিসাব প্রকাশিত গড় মানে। দিক (বাড়ে না কমে) মাপের চেয়ে বেশি নির্ভরযোগ্য। জলবায়ু বদলালে টেকে কি না, নিচের ৮ মডেলের পরীক্ষায়।', 'Soil carbon from the ICBM model, started from SoilGrids’ estimated carbon; nitrogen and straw from published averages. The direction (up or down) is more reliable than the size. Whether it holds as the climate changes is in the eight-model test below.')}</p>
    </Card>
  );
}
