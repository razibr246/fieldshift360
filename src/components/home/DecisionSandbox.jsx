// Interactive FieldShift Decision Sandbox (Home Page).
// Lets farmers, officers, and NASA Space Apps judges interactively test how
// NASA POWER climate, soil physics, and farmer priorities dynamically drive crop rotation decisions in 0ms.
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Droplets, Coins, ShieldCheck, Layers, Timer, ChevronRight, Sparkles, SlidersHorizontal, MapPin } from 'lucide-react';
import { useStore, climates, soilData } from '../../store';
import { ScoreRing, Tags, LABEL_STYLE, climateTag } from '../ui';
import SeasonRibbon from '../charts/SeasonRibbon';
import { decide, PRIORITIES } from '../../engine/decision';
import { RABI_CROPS } from '../../engine/crops';
import { buildDemo } from '../../data/demo';
import { makeUnion } from '../../engine/world';
import { num, fmtDate, fmtBangla, banglaDate, daysBetween, bnDigits } from '../../engine/dates';
import { THEN, NOW } from '../../engine/climate';

const DEMO = buildDemo();

const SIM_PLACES = [
  { id: 'godagari', farmerId: 'RAHIM', unionId: 'Deopara', nameBn: 'গোদাগাড়ী (রাজশাহী · বরেন্দ্র খরা)', nameEn: 'Godagari (Rajshahi · Barind)' },
  { id: 'dhamrai', farmerId: 'RAZIB', unionId: 'Chauhat', nameBn: 'ধামরাই (ঢাকা · পলল অববাহিকা)', nameEn: 'Dhamrai (Dhaka · Floodplain)' },
];

const SIM_PRIORITIES = [
  { id: 'water', icon: Droplets, nameBn: 'সেচ কম', nameEn: 'Water Saver' },
  { id: 'income', icon: Coins, nameBn: 'আয় বেশি', nameEn: 'Max Profit' },
  { id: 'risk', icon: ShieldCheck, nameBn: 'ঝুঁকি কম', nameEn: 'Low Risk' },
  { id: 'soil', icon: Layers, nameBn: 'মাটি সুরক্ষা', nameEn: 'Soil Health' },
  { id: 'early', icon: Timer, nameBn: 'আগাম ফসল', nameEn: 'Early Harvest' },
];

const SIM_CROPS = [
  { id: 'wheat', nameBn: 'গম', nameEn: 'Wheat' },
  { id: 'maize', nameBn: 'ভুট্টা', nameEn: 'Maize' },
  { id: 'mustard', nameBn: 'সরিষা', nameEn: 'Mustard' },
  { id: 'lentil', nameBn: 'মসুর', nameEn: 'Lentil' },
  { id: 'potato', nameBn: 'আলু', nameEn: 'Potato' },
];

export default function DecisionSandbox() {
  const { s, T, L, decision: d, dispatch, today, econ } = useStore();
  const navigate = useNavigate();
  const lang = s.lang;
  const [tab, setTab] = useState('sim'); // 'field' | 'sim'

  // Simulator interactive state
  const [placeId, setPlaceId] = useState('godagari');
  const [priorityId, setPriorityId] = useState('water');
  const [cropId, setCropId] = useState('wheat');

  const place = SIM_PLACES.find((p) => p.id === placeId) ?? SIM_PLACES[0];
  const farmer = DEMO.farmers.find((f) => f.id === place.farmerId) ?? DEMO.farmers[0];

  // Run pure decision engine in real-time
  const simDecision = useMemo(() => {
    const clim = climates[placeId] ?? climates.godagari;
    if (!clim) return d;
    const soil = soilData.unions[place.unionId] ?? soilData.unions.Deopara;
    const union = makeUnion(clim, DEMO, place.unionId);
    const plot = { ...farmer, last_crop: cropId };
    return decide({
      clim,
      soil,
      plot,
      union,
      priorities: [priorityId],
      econ,
      today,
    });
  }, [placeId, priorityId, cropId, place.unionId, farmer, econ, today, d]);

  const activeDec = tab === 'field' ? d : simDecision;
  const st = LABEL_STYLE[activeDec.label] ?? LABEL_STYLE.KEEP;

  // Apply simulated settings and navigate to Planner
  const handleApplyToPlanner = () => {
    dispatch({ type: 'chooseFarmer', id: place.farmerId });
    dispatch({ type: 'set', patch: { priorities: [priorityId] } });
    navigate('/farmer/plan');
  };

  return (
    <div
      className="surface-card spotlight-card lift mt-6 overflow-hidden rounded-[28px] border border-primary-200/80 bg-white/95 p-5 sm:p-7 shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-xl"
      style={{ animation: 'rise 1.2s var(--ease-smooth) .65s both' }}
    >
      {/* Tab Switcher & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sim'}
            onClick={() => setTab('sim')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-bold transition-all duration-200 active:scale-95 ${
              tab === 'sim'
                ? 'bg-gradient-to-r from-primary-700 to-sky-700 text-white shadow-xs'
                : 'bg-canvas text-muted hover:bg-border/60 hover:text-ink'
            }`}
          >
            <Sparkles size={15} className={tab === 'sim' ? 'text-amber-300' : ''} />
            <span>{T('সরাসরি শিফট সিমুলেটর (ল্যাব)', 'Live Shift Sandbox (Lab)')}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'field'}
            onClick={() => setTab('field')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-bold transition-all duration-200 active:scale-95 ${
              tab === 'field'
                ? 'bg-primary-700 text-white shadow-xs'
                : 'bg-canvas text-muted hover:bg-border/60 hover:text-ink'
            }`}
          >
            <Sprout size={15} />
            <span>{T('রহিমের মাঠের সুপারিশ', "Rahim's Field Working")}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-800 ring-1 ring-emerald-200">
            <span className="telemetry-pulse" />
            <span>{T('০ সেকেন্ড ক্লায়েন্ট গণনা', '0s Browser Compute')}</span>
          </span>
          <Tags list={[climateTag(), 'RULE']} />
        </div>
      </div>

      {/* Simulator Controls Strip (Only in 'sim' tab) */}
      {tab === 'sim' && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border/80 bg-canvas/60 p-4 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-muted">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <SlidersHorizontal size={13} className="text-primary-600" />
              {T('প্যারামিটার পরিবর্তন করে দেখুন:', 'Tweak Live Parameters:')}
            </span>
            <span className="text-primary-700">
              {T('ক্লিক করলেই ফলাফল পরিবর্তিত হবে', 'Click any chip to see instant shift')}
            </span>
          </div>

          {/* Place Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-[12px] font-semibold text-muted flex items-center gap-1">
              <MapPin size={12} /> {T('এলাকা:', 'Place:')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SIM_PLACES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlaceId(p.id)}
                  className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition-all duration-150 active:scale-95 ${
                    placeId === p.id
                      ? 'border border-primary-600 bg-primary-600 text-white shadow-xs'
                      : 'border border-border bg-white text-muted hover:border-primary-300 hover:text-ink'
                  }`}
                >
                  {L({ bn: p.nameBn, en: p.nameEn })}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-[12px] font-semibold text-muted">
              {T('চাওয়া:', 'Goal:')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SIM_PRIORITIES.map((pr) => {
                const Icon = pr.icon;
                return (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setPriorityId(pr.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-all duration-150 active:scale-95 ${
                      priorityId === pr.id
                        ? 'border border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border border-border bg-white text-muted hover:border-sky-300 hover:text-ink'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{L({ bn: pr.nameBn, en: pr.nameEn })}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base Crop Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 text-[12px] font-semibold text-muted">
              {T('আগের ফসল:', 'Prev Crop:')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SIM_CROPS.map((cr) => (
                <button
                  key={cr.id}
                  type="button"
                  onClick={() => setCropId(cr.id)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all duration-150 active:scale-95 ${
                    cropId === cr.id
                      ? 'border border-amber-600 bg-amber-600 text-white shadow-xs'
                      : 'border border-border bg-white text-muted hover:border-amber-300 hover:text-ink'
                  }`}
                >
                  {L({ bn: cr.nameBn, en: cr.nameEn })}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Dynamic Decision Viewport */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="rounded-2xl p-1 shadow-2xs">
              <ScoreRing value={activeDec.rec.score} size={62} />
            </div>
            <span className="mt-1 whitespace-nowrap text-[11px] font-semibold text-muted">
              {T('১০০-এর মধ্যে', 'out of 100')}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${st.bg} ${st.text}`}>
                {L(st)}
              </span>
              <p className="font-display text-[22px] font-bold leading-tight sm:text-[26px]">
                {L(activeDec.rec.crop.name)}
              </p>
            </div>

            <p className="mt-1.5 text-[15px] font-semibold text-ink/85">
              {(() => {
                const left = daysBetween(today, activeDec.rec.t0);
                const y = banglaDate(activeDec.rec.t0).year;
                const when = T(
                  `লাগানোর দিন ${fmtBangla(activeDec.rec.t0, 'bn')} ${bnDigits(y)} (${fmtDate(activeDec.rec.t0, 'bn')})`,
                  `Plant on ${fmtDate(activeDec.rec.t0, 'en')} (${fmtBangla(activeDec.rec.t0, 'en')} ${y})`
                );
                const cd =
                  left > 0
                    ? T(`আর ${num(left, 'bn')} দিন`, `${left} days to go`)
                    : left === 0
                    ? T('আজই', 'today')
                    : T(`${num(-left, 'bn')} দিন আগে পেরিয়েছে`, `${-left} days ago`);
                return (
                  <>
                    {when} ·{' '}
                    <span className={`font-bold tabular ${left < 0 ? 'text-clay-700' : 'text-paddy-700'}`}>
                      {cd}
                    </span>
                  </>
                );
              })()}
            </p>

            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              {(() => {
                const r = (a) => `${a[0]}–${a[a.length - 1]}`;
                const { then, now } = activeDec.rec.bt;
                return T(
                  `এই দিনে লাগালে আবহাওয়া ঠিক ছিল: এখন (${bnDigits(r(NOW))}) ${num(now.n, 'bn')} মৌসুমের ${num(
                    now.safe,
                    'bn'
                  )}টিতে, আগে (${bnDigits(r(THEN))}) ${num(then.n, 'bn')}টির ${num(then.safe, 'bn')}টিতে`,
                  `Planted on this day, the weather was fine in ${now.safe} of ${now.n} seasons now (${r(
                    NOW
                  )}) and ${then.safe} of ${then.n} before (${r(THEN)})`
                );
              })()}
            </p>
          </div>
        </div>

        {/* Action Link / Buttons */}
        <div className="flex flex-col items-end gap-2.5">
          {tab === 'sim' ? (
            <button
              type="button"
              onClick={handleApplyToPlanner}
              className="btn-gloss inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-transform active:scale-95"
            >
              <Sprout size={16} />
              <span>{T('এই পছন্দ নিয়ে পরিকল্পনায় যান', 'Open with these settings')}</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <Link
              to="/farmer/plan"
              className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-primary-700 underline-offset-4 hover:underline transition-colors hover:text-paddy-700"
            >
              {T('পুরো হিসাব দেখুন', 'See the full working')}
              <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {/* Season Timeline Ribbon (in both tabs) */}
      <div className="mt-5">
        <SeasonRibbon />
      </div>
    </div>
  );
}
