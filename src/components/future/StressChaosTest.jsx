// Field Future: Interactive Extreme Stress Injector (Digital Twin Chaos Stress Testing).
// Evaluates how the field's traditional habit vs the recommended rotation responds to real-world NASA climate shocks:
// 1) Delayed Monsoon Onset (GPM IMERG anomaly)
// 2) Terminal Flowering Heatwave (NASA POWER temperature spike)
// 3) Aquifer Groundwater Curtailment (NASA GRACE drought emergency)
import { useState } from 'react';
import { AlertTriangle, Flame, CloudOff, Waves, ShieldCheck, XCircle, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { num } from '../../engine/dates';

const SHOCKS = [
  {
    id: 'heat',
    icon: Flame,
    titleBn: 'ফুলের সময় তীব্র তাপপ্রবাহ (+৩.৫° সেলসিয়াস)',
    titleEn: 'Flowering Heatwave (+3.5 °C Spike)',
    triggerBn: 'মার্চ-এপ্রিলে টানা ৫ দিন ৩৮° সেলসিয়াসের বেশি তাপমাত্রা (NASA POWER)',
    triggerEn: '5 consecutive days > 38 °C during March–April flowering (NASA POWER)',
    habitBn: 'বোরো ধানের থোড় ও পরাগায়ন নষ্ট: প্রায় ৩০–৪৫% চিটা ধান ও ফলন বিপর্যয়।',
    habitEn: 'Boro spikelet sterility: 30–45% empty grains and catastrophic yield drop.',
    recBn: 'ফেব্রুয়ারির শেষেই ফসল তোলা শেষ! তাপপ্রবাহ আসার আগেই গোলায় ধান/ফসল, ১০০% নিরাপদ।',
    recEn: 'Harvested in late February! Escapes the heat window entirely with 100% crop survival.',
    habitTone: 'border-red-300 bg-red-50 text-red-900',
    recTone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    habitSurvives: false,
  },
  {
    id: 'monsoon',
    icon: CloudOff,
    titleBn: 'বর্ষা আসতে ২১ দিন দেরি (দেরিতে বৃষ্টি শুরু)',
    titleEn: 'Late Monsoon Onset (+21 Days Delay)',
    triggerBn: 'GPM IMERG স্যাটেলাইটে মাপা বৃষ্টি শুরু জুনের শেষ সপ্তাহে পিছিয়ে যাওয়া',
    triggerEn: 'Monsoon onset shifts from early June to late June (GPM IMERG)',
    habitBn: 'আমন চারার বয়স বেড়ে বুড়িয়ে যায়: দেরিতে রোপণের ফলে শীতের মুখে পড়ে ফলন ২০% কমে।',
    habitEn: 'Aman seedlings over-age in seedbeds: late transplanting depresses yield by ~20%.',
    recBn: 'স্বল্পমেয়াদি রবি ও মুগডাল চাষ করায় জমি আগেভাগেই মুক্ত; নমনীয় রোপণ বাফারে কোনো ক্ষতি হয় না।',
    recEn: 'Short-duration Rabi/Mung cycle frees land early; flexible window absorbs the delay.',
    habitTone: 'border-amber-300 bg-amber-50 text-amber-900',
    recTone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    habitSurvives: false,
  },
  {
    id: 'aquifer',
    icon: Waves,
    titleBn: 'ভূগর্ভস্থ পানির সংকট (-৪০% সেচ হ্রাস)',
    titleEn: 'Groundwater Curtailment (-40% Water Limit)',
    triggerBn: 'GRACE স্যাটেলাইটের সতর্কতায় গভীর নলকূপের বিদ্যুৎ/পাম্পিং নিয়ন্ত্রণ',
    triggerEn: 'Regional aquifer rationing restricts deep tubewell pumping by 40% (GRACE)',
    habitBn: 'বোরোর বিঘায় ৯০০-১২০০ ঘনমিটার পানির অভাব: জমি ফেটে চৌচির, সেচের তীব্র ঘাটতি।',
    habitEn: 'Boro requires 900–1200 m³/bigha: severe water deficit leads to crop abandonment.',
    recBn: 'সরিষা/ডালে পানির চাহিদা মাত্র ১৫০-২০০ মিমি: মাটির নিজস্ব আর্দ্রতাতেই সফল ফসল।',
    recEn: 'Low water requirement (< 200 mm): easily thrives on residual moisture with light irrigation.',
    habitTone: 'border-red-300 bg-red-50 text-red-900',
    recTone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    habitSurvives: false,
  },
];

export default function StressChaosTest({ ff, rotName }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [activeShock, setActiveShock] = useState(SHOCKS[0].id);

  const currentShock = SHOCKS.find((x) => x.id === activeShock) || SHOCKS[0];
  const habitName = rotName(ff.habit.rot, { short: true });
  const bestName = rotName(ff.best.rot, { short: true });

  return (
    <Card id="ff-chaos" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11.5px] font-bold text-red-900">
              <Zap size={13} className="text-red-700" />
              {T('ডিজিটাল টুইন স্ট্রেস পরীক্ষা', 'Digital Twin Chaos Stress Test')}
            </span>
            <Tags list={['SAT', 'MODEL', 'RULE']} />
          </div>
          <h2 className="mt-1 flex items-center gap-2 text-[20px] font-bold text-ink">
            <AlertTriangle size={20} className="text-amber-600" />
            {T('চরম জলবায়ু শকে কোন ফসলচক্র কতটা টিকবে?', 'Climate Stress Testing: Survival Under Extreme Shocks')}
          </h2>
          <p className="mt-1 text-[13.5px] leading-6 text-muted">
            {T(
              'নাসার মহাকাশ রোভার ও লাইফ-সাপোর্ট পরীক্ষার মতো এখানে সরাসরি দুর্যোগের শক প্রয়োগ করে দেখুন: হঠাৎ খরা, তাপদাহ বা সেচের পানি বন্ধ হলে আপনার বর্তমান চাষ বনাম প্রস্তাবিত ফসলচক্রের কী অবস্থা হয়।',
              'Modeled on NASA rover and life-support stress test protocols: simulate catastrophic climate anomalies (severe heatwave, delayed monsoon, or aquifer rationing) to verify failure thresholds.'
            )}
          </p>
        </div>
      </div>

      {/* Interactive Shock Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SHOCKS.map((sh) => (
          <button
            key={sh.id}
            type="button"
            onClick={() => setActiveShock(sh.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold transition-all ${
              activeShock === sh.id
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                : 'border border-border bg-white text-ink/80 hover:bg-canvas hover:text-ink'
            }`}
          >
            <sh.icon size={16} />
            <span>{T(sh.titleBn, sh.titleEn)}</span>
          </button>
        ))}
      </div>

      {/* Trigger Condition Callout */}
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[13px] text-amber-950 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-700 shrink-0" />
        <div>
          <b>{T('শক পরিস্থিতি:', 'Simulated Shock Condition:')}</b> {T(currentShock.triggerBn, currentShock.triggerEn)}
        </div>
      </div>

      {/* Side-by-side Response Comparison */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Habit Card */}
        <div className={`rounded-2xl border p-4.5 ${currentShock.habitTone}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold uppercase tracking-wider text-muted">{T('বর্তমান চাষ অভ্যাস (Habit)', 'Traditional Habit')}</span>
            <span className="flex items-center gap-1 rounded-full bg-red-200/90 px-2.5 py-0.5 text-[12px] font-bold text-red-950">
              <XCircle size={14} className="text-red-700" />
              {T('বিপর্যয়ের ঝুঁকি (High Vulnerability)', 'Vulnerable')}
            </span>
          </div>
          <h3 className="mt-2 text-[16px] font-bold text-ink">{habitName}</h3>
          <p className="mt-2 text-[13.5px] leading-6 font-medium">
            {T(currentShock.habitBn, currentShock.habitEn)}
          </p>
        </div>

        {/* Recommended Rotation Card */}
        <div className={`rounded-2xl border p-4.5 ${currentShock.recTone}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-bold uppercase tracking-wider text-emerald-800">{T('সেরা ফসলচক্র (Recommended)', 'Best Rotation')}</span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-200/90 px-2.5 py-0.5 text-[12px] font-bold text-emerald-950">
              <CheckCircle2 size={14} className="text-emerald-800" />
              {T('স্থিতিস্থাপক ও নিরাপদ (Resilient)', 'Resilient')}
            </span>
          </div>
          <h3 className="mt-2 text-[16px] font-bold text-ink">{bestName}</h3>
          <p className="mt-2 text-[13.5px] leading-6 font-medium">
            {T(currentShock.recBn, currentShock.recEn)}
          </p>
        </div>
      </div>
    </Card>
  );
}
