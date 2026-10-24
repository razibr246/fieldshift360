// The district story: the eight scenes of the first Ropon Radar prototype (public/radar), retold on real data for the
// officer's own district and upazila - under cloud, radar sees through, where and when they planted, did the rain move,
// the adaptation gap, a field replay, the advice, and the evidence. Each scene animates in, plays on its own and can be
// stepped through; with reduced motion the scenes show their final state.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, CloudRain, Satellite, Map as MapIcon, TrendingUp, ArrowLeftRight, Sprout, MessageSquareText, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { SmsMeter } from '../ui';
import { fmtDate, num, bnDigits } from '../../engine/dates';
import { CAT, LATEST, catOf, doyToMs } from '../../radar/aman';
import { gapSeries, median, cloudShare, ONSET_RULE } from '../../radar/story';
import WATCH from '../../data/fields/field_watch.json';
import { PARCELS } from '../../data/parcels';

const GREEN = '#2f6e2f', GOLD = '#d08f26', TEAL = '#2f8a8f', INK = '#13261b', MUTED = '#5d6a63';
const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lon/lat rings → one SVG frame for the whole district.
function useDistrictFrame(district, W, H, pad = 18) {
  return useMemo(() => {
    const pts = district.upazilas.flatMap((u) => u.ring);
    const lons = pts.map((p) => p[0]), lats = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
    const kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180);
    const s = Math.min((W - 2 * pad) / ((x1 - x0) * kx), (H - 2 * pad) / (y1 - y0));
    const ox = (W - (x1 - x0) * kx * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const p = ([lon, lat]) => [ox + (lon - x0) * kx * s, oy + (y1 - lat) * s];
    return { p, path: (ring) => `M${ring.map((q) => p(q).map((v) => v.toFixed(1)).join(',')).join('L')}Z` };
  }, [district, W, H, pad]);
}

function useOn(dep) { // flips true just after a scene mounts, so CSS transitions run
  const [on, setOn] = useState(reduce());
  useEffect(() => { if (reduce()) { setOn(true); return undefined; } setOn(false); const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, [dep]);
  return on;
}

function Panel({ kicker, title, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-semibold text-primary-700">{kicker}</div>
      <h3 className="font-display mt-0.5 text-[24px] font-bold leading-tight sm:text-[28px]">{title}</h3>
      <div className="mt-2 space-y-2 text-[15px] leading-7 text-ink/85">{children}</div>
    </div>
  );
}
const Hero = ({ v, unit, note }) => <div className="mt-2"><div className="font-display text-[44px] font-bold leading-none text-primary-800 tabular">{v}<span className="ml-1 text-[20px] text-ink/60">{unit}</span></div>{note && <div className="mt-1 text-[13px] text-muted">{note}</div>}</div>;

export default function RadarStory({ district, row, detail, home }) {
  const { s, T, L, officerUpazila } = useStore();
  const lang = s.lang;
  const [k, setK] = useState(0);
  const [auto, setAuto] = useState(!reduce());
  const W = 640, H = 400;
  const { p, path } = useDistrictFrame(district, W, H);
  const on = useOn(k);
  const yr = (y) => num(y, lang).replace(/,/g, '');
  const day = (doy, y = LATEST) => fmtDate(doyToMs(y, doy), lang);
  const se = row.seasons[LATEST];
  const gaps = useMemo(() => (detail ? gapSeries(detail, row) : []), [detail, row]);
  const gNow = gaps.find((g) => g.year === LATEST);
  const gMed = median(gaps.filter((g) => g.year !== LATEST).map((g) => g.gap));
  const cloud = useMemo(() => cloudShare(WATCH.parcels, PARCELS.filter((x) => x.upazila === home).map((x) => x.id)), [home]);
  const tr = row.rainTrend;
  const up = district.upazilas;
  const advice = useMemo(() => {
    if (!gNow) return '';
    const later = gNow.gap != null && gMed != null && gNow.gap > gMed + 7, sooner = gNow.gap != null && gMed != null && gNow.gap < gMed - 7;
    const rainLine = tr ? T(`জুন-জুলাইয়ের বৃষ্টি ২০০১ থেকে প্রতি দশকে ${num(Math.abs(tr.perDecade), 'bn')} মিমি ${tr.perDecade < 0 ? 'কমছে' : 'বাড়ছে'}${tr.significant ? ', যা পরিসংখ্যানে নিশ্চিত' : ', তবে তা এখনো পরিসংখ্যানে নিশ্চিত নয়'}।`, `June–July rain since 2001 is ${tr.perDecade < 0 ? 'falling' : 'rising'} by ${Math.abs(tr.perDecade)} mm a decade${tr.significant ? ', a statistically clear trend' : ', though not yet statistically clear'}.`) : '';
    return T(`${row.bn}: এবার কাজে লাগার মতো বৃষ্টি শুরু ${day(gNow.onset)}, রাডারে রোপণ ${gNow.transplant ? day(gNow.transplant) : 'এখনো ধরা পড়েনি'}; ফাঁক ${gNow.gap != null ? `${bnDigits(gNow.gap)} দিন` : '–'}, আগের বছরগুলোর মাঝামাঝি ${gMed != null ? bnDigits(Math.round(gMed)) : '–'} দিন। ${later ? 'বৃষ্টির তুলনায় রোপণ পিছিয়ে চলছে: বীজতলা আগে করতে আর সেচের পালা ঠিক রাখতে কৃষকদের বলুন।' : sooner ? 'বৃষ্টির পরপরই রোপণ হচ্ছে: চারার বয়স ২৫–৩০ দিন হয়েছে কিনা দেখে নিতে বলুন।' : 'রোপণ বৃষ্টির সঙ্গে তাল রেখে চলছে।'} ${rainLine}`,
      `${row.en}: usable rain began ${day(gNow.onset)} this year and radar saw transplanting ${gNow.transplant ? `on ${day(gNow.transplant)}` : 'not yet'}; a gap of ${gNow.gap ?? '–'} days against a usual ${gMed != null ? Math.round(gMed) : '–'}. ${later ? 'Planting is lagging the rain: advise earlier seedbeds and steady irrigation turns.' : sooner ? 'Planting follows the rain closely: check seedlings are 25–30 days old.' : 'Planting is keeping pace with the rain.'} ${rainLine}`);
  }, [gNow, gMed, tr, row, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const scenes = [
    { icon: CloudRain, sec: 12, bn: 'মেঘের নিচে', en: 'Under cloud', stage: () => (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        <rect width={W} height={H} fill="#24412b" />
        {up.map((u) => <path key={u.id} d={path(u.ring)} fill={u.id === home ? '#3f6b46' : '#2f5537'} stroke="#f3f6f0" strokeOpacity={u.id === home ? 1 : 0.55} strokeWidth={u.id === home ? 2.4 : 1.2} />)}
        <g className={on && !reduce() ? 'story-cloud' : ''}>
          {[[90, 90, 150], [300, 60, 190], [520, 120, 170], [180, 260, 210], [440, 300, 180], [620, 230, 150]].map(([cx, cy, r], i) => <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.55} fill="#fff" opacity={0.42} filter="url(#story-blur)" />)}
        </g>
        <defs><filter id="story-blur"><feGaussianBlur stdDeviation="22" /></filter></defs>
      </svg>), text: () => (
      <Panel kicker={T(`${district.bn} জেলা · বর্ষাকাল`, `${district.en} district · monsoon`)} title={T('আমন রোপণ হয় মেঘের নিচে', 'Aman is planted under cloud')}>
        <p>{T('আমন ধান রোপণ হয় বর্ষার মাঝখানে, ঠিক যখন সাধারণ (আলোর) উপগ্রহ মেঘের কারণে মাটি দেখতে পায় না।', 'Aman is transplanted in the heart of the monsoon, exactly when ordinary optical satellites cannot see the ground for cloud.')}</p>
        {cloud && <Hero v={num(Math.round(cloud.share * 100), lang)} unit="%" note={T(`${officerUpazila.name.bnOf} নিবন্ধিত জমির ওপর সেন্টিনেল-২-এর ${bnDigits(cloud.passes)}টি পাসের মধ্যে এতগুলো মেঘে ঢাকা বা অস্পষ্ট ছিল (জুন ২০২৫ থেকে, শুকনো মাসসহ; বর্ষায় আরও বেশি)।`, `Of ${cloud.passes} Sentinel-2 passes over ${officerUpazila.name.en}'s registered fields, this share was cloudy or hazy (since June 2025, dry months included; worse in the monsoon).`)} />}
      </Panel>) },
    { icon: Satellite, sec: 12, bn: 'রাডার মেঘ ভেদ করে', en: 'Radar sees through', stage: () => {
      const c = detail?.seasons?.[LATEST]?.curve?.filter((x) => x.med != null) ?? [];
      if (c.length < 3) return <div className="grid h-full place-items-center text-white/70">{T('রাডারের তথ্য আনা হচ্ছে…', 'Loading radar data…')}</div>;
      const d0 = c[0].doy, d1 = c[c.length - 1].doy, lo = Math.min(...c.map((x) => x.med)) - 1, hi = Math.max(...c.map((x) => x.med)) + 1;
      const x = (d) => 40 + ((d - d0) / (d1 - d0)) * (W - 70), y = (v) => 30 + ((hi - v) / (hi - lo)) * (H - 80);
      const t = se?.transplantDoy;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <rect width={W} height={H} fill="#0f2416" />
          {[lo + 1, (lo + hi) / 2, hi - 1].map((v) => <g key={v}><line x1={40} x2={W - 30} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity="0.08" /><text x={34} y={y(v) + 4} textAnchor="end" fontSize="12" fill="#ffffff99">{num(v, lang, { dp: 0 })}</text></g>)}
          <text x={40} y={20} fontSize="13" fill="#ffffffcc">{T('রাডার সংকেত VH (dB), ৩৬ জমির মাঝামাঝি', 'Radar VH (dB), median of 36 fields')}</text>
          <polyline points={c.map((q) => `${x(q.doy).toFixed(1)},${y(q.med).toFixed(1)}`).join(' ')} fill="none" stroke="#9fe0a8" strokeWidth="3" pathLength="1" strokeDasharray="1" style={{ strokeDashoffset: on ? 0 : 1, transition: reduce() ? 'none' : 'stroke-dashoffset 4s ease-in-out' }} />
          {t && <g style={{ opacity: on ? 1 : 0, transition: 'opacity .6s 3.6s' }}><line x1={x(t)} x2={x(t)} y1={28} y2={H - 50} stroke={GOLD} strokeWidth="2.5" /><text x={x(t) + 6} y={H - 56} fontSize="13" fontWeight="700" fill={GOLD}>{T(`রোপণ ${day(t)}`, `planted ${day(t)}`)}</text></g>}
          {[5, 6, 7, 8, 9, 10].map((m) => { const dm = Math.round((Date.UTC(LATEST, m, 1) - Date.UTC(LATEST, 0, 1)) / 864e5) + 1; return dm >= d0 && dm <= d1 ? <text key={m} x={x(dm)} y={H - 22} fontSize="12" fill="#ffffff99">{fmtDate(doyToMs(LATEST, dm), lang).replace(/^[০-৯\d]+\s/, '')}</text> : null; })}
        </svg>
      ); }, text: () => (
      <Panel kicker={T(`${row.bn} · ${yr(LATEST)} মৌসুম · সেন্টিনেল-১`, `${row.en} · ${LATEST} season · Sentinel-1`)} title={T('রাডার মেঘ ভেদ করে দেখে', 'Radar sees through cloud')}>
        <p>{T('জমিতে পানি দিয়ে চাষ দিলে মসৃণ পানির ওপর থেকে রাডারের সংকেত প্রায় ফেরে না, তাই রেখাটা হঠাৎ নামে। চারা বড় হতে থাকলে আবার ওঠে। ওই নামা-ওঠার খাঁজটাই রোপণের দিন।', 'Flooding a field for puddling turns it into smooth water that sends little radar back, so the line dips. As the seedlings grow it rises again. That notch is the transplanting date.')}</p>
        {se?.transplantDoy && <Hero v={day(se.transplantDoy)} unit="" note={T(`${bnDigits(se.nDetected)}/${bnDigits(se.nFields)}টি নমুনা জমিতে ধরা পড়েছে, ${bnDigits(se.passes)}টি রাডার পাস থেকে`, `seen in ${se.nDetected} of ${se.nFields} sample fields, from ${se.passes} radar passes`)} />}
      </Panel>) },
    { icon: MapIcon, sec: 11, bn: 'কোথায় কবে রোপণ', en: 'Where and when', stage: () => (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
        <rect width={W} height={H} fill="#f4f6f2" />
        {up.map((u, i) => { const c = CAT[catOf(u.seasons[LATEST]?.shift)]; const [cx, cy] = p(u.point); return (
          <g key={u.id} style={{ opacity: on ? 1 : 0, transition: reduce() ? 'none' : `opacity .7s ${0.25 * i}s` }}>
            <path d={path(u.ring)} fill={c.color} fillOpacity="0.75" stroke="#fff" strokeWidth={u.id === home ? 3.5 : 1.5} />
            <text x={cx} y={cy} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff" stroke="#00000055" strokeWidth="3" paintOrder="stroke">{L(u)}</text>
          </g>); })}
      </svg>), text: () => (
      <Panel kicker={T(`${district.bn} জেলার ${bnDigits(up.length)}টি উপজেলা · ${yr(LATEST)}`, `${district.en} district's ${up.length} upazilas · ${LATEST}`)} title={T('কোথায় সময়মতো, কোথায় দেরিতে', 'Where it was on time, where late')}>
        <p>{T('প্রতিটি উপজেলাকে তার নিজের ২০১৭–২০২৫-এর স্বাভাবিক রোপণের দিনের সঙ্গে মেলানো; ±৭ দিন হলে স্বাভাবিক।', 'Each upazila is compared with its own usual transplanting day, 2017–2025; within ±7 days counts as usual.')}</p>
        <ul className="grid grid-cols-1 gap-1 text-[14px] sm:grid-cols-2">{['early', 'on track', 'late', 'none'].map((key) => { const n = up.filter((u) => catOf(u.seasons[LATEST]?.shift) === key).length; return n ? <li key={key} className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: CAT[key].color }} />{L(CAT[key])}: <b>{bnDigits(n)}</b></li> : null; })}</ul>
      </Panel>) },
    { icon: TrendingUp, sec: 12, bn: 'বৃষ্টি কি সরছে?', en: 'Did the rain move?', stage: () => {
      const ys = Object.keys(row.rainJJ).map(Number).sort();
      const vals = ys.map((y) => row.rainJJ[y]); const hi = Math.max(...vals) * 1.1;
      const bw = (W - 70) / ys.length, x = (i) => 46 + i * bw, y = (v) => H - 40 - (v / hi) * (H - 80);
      const fit = tr ? (yv) => tr.slope * yv + tr.intercept : null;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <rect width={W} height={H} fill="#f4f6f2" />
          {ys.map((yv, i) => <rect key={yv} x={x(i) + 1} width={bw - 2} y={on ? y(vals[i]) : H - 40} height={on ? H - 40 - y(vals[i]) : 0} rx="2" fill={yv === LATEST ? GOLD : TEAL} fillOpacity={yv === LATEST ? 0.9 : 0.75} style={{ transition: reduce() ? 'none' : `all .5s ${0.06 * i}s` }} />)}
          {fit && <line x1={x(0) + bw / 2} x2={x(ys.length - 1) + bw / 2} y1={y(fit(ys[0]))} y2={y(fit(ys[ys.length - 1]))} stroke={INK} strokeWidth="2.5" strokeDasharray="7 5" style={{ opacity: on ? 1 : 0, transition: 'opacity .6s 1.8s' }} />}
          {ys.filter((yv) => yv % 5 === 0 || yv === ys[0]).map((yv) => <text key={yv} x={x(ys.indexOf(yv)) + bw / 2} y={H - 22} textAnchor="middle" fontSize="12" fill={MUTED}>{yr(yv)}</text>)}
          <text x={46} y={20} fontSize="13" fill={MUTED}>{T(`${row.bn}: জুন-জুলাইয়ের মোট বৃষ্টি (মিমি), নাসা আইমার্জ`, `${row.en}: June–July rain (mm), NASA IMERG`)}</text>
        </svg>
      ); }, text: () => (
      <Panel kicker={T('২০০১–২০২৬ · প্রবণতা পরীক্ষা', '2001–2026 · trend test')} title={T('বৃষ্টি কি কমছে?', 'Is the rain falling away?')}>
        {tr && <Hero v={`${tr.perDecade > 0 ? '+' : ''}${num(tr.perDecade, lang)}`} unit={T('মিমি/দশক', 'mm/decade')} note={T(`সেনের ঢাল, ৯৫% পরিসর ${num(tr.ci[0], 'bn')} থেকে ${num(tr.ci[1], 'bn')}; ম্যান-কেন্ডাল p = ${num(tr.p, 'bn', { dp: 2 })}, সব উপজেলা মিলিয়ে সংশোধিত q = ${num(tr.q, 'bn', { dp: 2 })} → ${tr.significant ? 'নিশ্চিত প্রবণতা' : 'এখনো নিশ্চিত নয়'}`, `Sen's slope, 95% range ${tr.ci[0]} to ${tr.ci[1]}; Mann–Kendall p = ${tr.p}, corrected across upazilas q = ${tr.q} → ${tr.significant ? 'a clear trend' : 'not yet clear'}`)} />}
        <p className="text-[14px]">{T('জেলার সব উপজেলা: ', 'Every upazila in the district: ')}{up.map((u) => `${L(u)} ${u.rainTrend ? `${u.rainTrend.perDecade > 0 ? '+' : ''}${num(u.rainTrend.perDecade, lang)}${u.rainTrend.significant ? '*' : ''}` : '–'}`).join(' · ')} <span className="text-muted">{T('(* নিশ্চিত)', '(* clear)')}</span></p>
      </Panel>) },
    { icon: ArrowLeftRight, sec: 12, bn: 'অভিযোজনের ফাঁক', en: 'The adaptation gap', stage: () => {
      const rows = gaps.filter((g) => g.onset != null);
      if (!rows.length) return <div className="grid h-full place-items-center text-muted">{T('বৃষ্টির তথ্য আনা হচ্ছে…', 'Loading rain data…')}</div>;
      const all = rows.flatMap((g) => [g.onset, g.transplant].filter(Boolean)); const lo = Math.min(...all) - 6, hi = Math.max(...all) + 6;
      const x = (d) => 70 + ((d - lo) / (hi - lo)) * (W - 100), rh = (H - 60) / rows.length;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
          <rect width={W} height={H} fill="#f4f6f2" />
          {[6, 7, 8, 9].map((m) => { const dm = Math.round((Date.UTC(2025, m - 1, 1) - Date.UTC(2025, 0, 1)) / 864e5) + 1; return dm > lo && dm < hi ? <g key={m}><line x1={x(dm)} x2={x(dm)} y1={14} y2={H - 34} stroke="#dfe5de" /><text x={x(dm) + 3} y={H - 16} fontSize="12" fill={MUTED}>{fmtDate(doyToMs(2025, dm), lang).replace(/^[০-৯\d]+\s/, '')}</text></g> : null; })}
          {rows.map((g, i) => { const cy = 22 + i * rh + rh / 2; return (
            <g key={g.year}>
              <text x={62} y={cy + 4} textAnchor="end" fontSize="12.5" fontWeight={g.year === LATEST ? 700 : 400} fill={INK}>{yr(g.year)}</text>
              {g.transplant && <rect x={x(g.onset)} y={cy - 4} height="8" rx="4" width={on ? x(g.transplant) - x(g.onset) : 0} fill={g.year === LATEST ? GOLD : '#9bb9a0'} style={{ transition: reduce() ? 'none' : `width .8s ${0.12 * i}s` }} />}
              <circle cx={x(g.onset)} cy={cy} r="5.5" fill={TEAL} />
              {g.transplant && <circle cx={x(g.transplant)} cy={cy} r="5.5" fill={GREEN} style={{ opacity: on ? 1 : 0, transition: `opacity .3s ${0.12 * i + 0.7}s` }} />}
              {g.gap != null && <text x={x(g.transplant) + 9} y={cy + 4} fontSize="12" fill={MUTED} style={{ opacity: on ? 1 : 0, transition: `opacity .3s ${0.12 * i + 0.8}s` }}>{T(`${bnDigits(g.gap)} দিন`, `${g.gap} d`)}</text>}
            </g>); })}
        </svg>
      ); }, text: () => (
      <Panel kicker={T(`${row.bn} · ২০১৭–${yr(LATEST)}`, `${row.en} · 2017–${LATEST}`)} title={T('বৃষ্টি শুরু থেকে রোপণ পর্যন্ত', 'From usable rain to planting')}>
        <p>{T(`নীল বিন্দু: কাজে লাগার মতো বৃষ্টি শুরুর দিন (১ জুন থেকে ৩ দিনে ${bnDigits(ONSET_RULE.wetMm)} মিমি, পরের ৩০ দিনে ৭ দিনের বেশি খরা নয়)। সবুজ: রাডারে রোপণ। মাঝের দাগ: ফাঁক।`, `Blue: usable-rain onset (from 1 June, ${ONSET_RULE.wetMm} mm in 3 days, no dry spell over 7 days in the next 30). Green: radar transplanting. The bar between: the gap.`)}</p>
        {gNow?.gap != null && <Hero v={bnDigits(gNow.gap)} unit={T('দিন', 'days')} note={T(`এ বছরের ফাঁক; আগের বছরগুলোর মাঝামাঝি ${gMed != null ? bnDigits(Math.round(gMed)) : '–'} দিন`, `this year's gap; the usual is ${gMed != null ? Math.round(gMed) : '–'} days`)} />}
      </Panel>) },
    { icon: Sprout, sec: 11, bn: 'মাঠের রিপ্লে', en: 'Field replay', stage: () => <FieldReplay detail={detail} row={row} on={on} /> , text: () => (
      <Panel kicker={T(`${row.bn} · ৩৬টি নমুনা জমি · ${yr(LATEST)}`, `${row.en} · 36 sample fields · ${LATEST}`)} title={T('এক এক করে জমিতে রোপণ', 'Field by field, the planting')}>
        <p>{T('প্রতিটি বিন্দু একটা সত্যিকারের ফসলি জমি (সেন্টিনেল-২ ভূমি-ব্যবহার)। রাডার যেদিন সেই জমিতে রোপণ দেখেছে, সেদিন বিন্দুটা জ্বলে ওঠে।', 'Each dot is a real cropland point (Sentinel-2 land cover). It lights up on the day radar saw that field transplanted.')}</p>
        <a href="#rd-history" className="inline-flex text-[14px] font-semibold text-primary-700 hover:underline">{T('আসল রাডার ছবিতে দেখুন →', 'See it in the real radar images →')}</a>
      </Panel>) },
    { icon: MessageSquareText, sec: 14, bn: 'পরামর্শ', en: 'The advice', stage: () => (
      <div className="flex h-full flex-col justify-center bg-[#f4f6f2] p-5">
        <div className="mx-auto w-full max-w-sm rounded-[28px] border-[6px] border-ink bg-white p-4 shadow-xl">
          <div className="text-[12px] font-semibold text-muted">{T('এসএমএস · উপজেলা কৃষি অফিস', 'SMS · upazila agriculture office')}</div>
          <p className="mt-2 rounded-2xl rounded-tl-sm bg-primary-50 p-3 text-[14px] leading-6" style={{ clipPath: on ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)', transition: reduce() ? 'none' : 'clip-path 2.4s steps(24)' }}>{advice}</p>
        </div>
      </div>), text: () => (
      <Panel kicker={T('সংখ্যা থেকে কাজের কথা', 'From numbers to action')} title={T('কৃষকদের কী বলবেন', 'What to tell farmers')}>
        <p>{T('ওপরের ফাঁক আর বৃষ্টির প্রবণতা থেকে লেখা। পাঠানোর আগে নিজের চোখে দেখে দরকারমতো বদলান।', 'Written from the gap and the rain trend above. Read it and change it as needed before sending.')}</p>
        <SmsMeter text={advice} />
        <Link to="/officer/upazila" className="inline-flex text-[14px] font-semibold text-primary-700 hover:underline">{T('উপজেলার সবাইকে বার্তা পাঠাতে →', 'Send a notice to the whole upazila →')}</Link>
      </Panel>) },
    { icon: BookOpen, sec: 12, bn: 'প্রমাণ', en: 'Evidence', stage: () => (
      <div className="grid h-full grid-cols-2 gap-2 bg-[#f4f6f2] p-4 text-[13px] sm:grid-cols-3">
        {[[T('রাডার', 'Radar'), 'Copernicus Sentinel-1 RTC, VH, ~40 m'], [T('বৃষ্টি', 'Rain'), 'NASA/JAXA GPM IMERG v2.10'], [T('ফসলি জমি', 'Cropland'), 'Esri | IO | Sentinel-2 10 m'], [T('নমুনা জমি', 'Sample fields'), T(`${bnDigits(se?.nFields ?? 36)}টি প্রতি উপজেলায়`, `${se?.nFields ?? 36} per upazila`)], [T('রাডার পাস', 'Radar passes'), T(`${bnDigits(se?.passes ?? 0)}টি এ মৌসুমে`, `${se?.passes ?? 0} this season`)], [T('প্রবণতা', 'Trend'), "Sen's slope + Mann–Kendall, BH"]].map(([k2, v], i) => (
          <div key={k2} className="rounded-xl border border-border bg-white p-3" style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(8px)', transition: reduce() ? 'none' : `all .5s ${0.12 * i}s` }}><div className="text-[12px] text-muted">{k2}</div><div className="mt-0.5 font-semibold">{v}</div></div>
        ))}
      </div>), text: () => (
      <Panel kicker={T('কোথা থেকে এল', 'Where it comes from')} title={T('প্রমাণ ও পদ্ধতি', 'Evidence and method')}>
        <p>{T('সব সংখ্যা আসল উপগ্রহ তথ্য থেকে, প্রতি উপজেলায় ৩৬টি নমুনা জমিতে। এটা প্রথম রোপণ রাডারের একই গল্প, তবে নমুনা রংপুরের বদলে আপনার জেলার আসল তথ্যে।', 'Every number comes from real satellite data on 36 sample fields per upazila. It is the first Ropon Radar\'s story, retold on your district\'s real data instead of sample Rangpur data.')}</p>
        <Link to="/officer/radar-original" className="inline-flex text-[14px] font-semibold text-primary-700 hover:underline">{T('প্রথম সংস্করণটি দেখুন (নমুনা তথ্য) →', 'See the first version (sample data) →')}</Link>
      </Panel>) },
  ];
  const sc = scenes[k];
  const timer = useRef(null);
  useEffect(() => {
    if (!auto) return undefined;
    timer.current = setTimeout(() => setK((x) => (x + 1) % scenes.length), sc.sec * 1000);
    return () => clearTimeout(timer.current);
  }, [k, auto]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (n) => { setAuto(false); setK((n + scenes.length) % scenes.length); };
  return (
    <div onKeyDown={(e) => { if (e.key === 'ArrowRight') go(k + 1); if (e.key === 'ArrowLeft') go(k - 1); }}>
      <div className="grid overflow-hidden rounded-2xl border border-border bg-white md:grid-cols-[1.15fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[400px]" key={`stage-${k}`}>{sc.stage()}</div>
        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6" key={`text-${k}`}>
          <div className="story-in">{sc.text()}</div>
          <div className="text-[12px] text-muted">{T(`দৃশ্য ${bnDigits(k + 1)}/${bnDigits(scenes.length)}`, `Scene ${k + 1} of ${scenes.length}`)}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => go(k - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white hover:bg-primary-50" aria-label={T('আগের দৃশ্য', 'Previous scene')}><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => setAuto(!auto)} className="grid h-10 w-10 place-items-center rounded-full bg-primary-700 text-white hover:bg-primary-800" aria-label={auto ? T('থামান', 'Pause') : T('চালান', 'Play')}>{auto ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}</button>
        <button type="button" onClick={() => go(k + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white hover:bg-primary-50" aria-label={T('পরের দৃশ্য', 'Next scene')}><ChevronRight size={18} /></button>
        <div className="hide-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {scenes.map((x, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-current={i === k} className={`relative inline-flex min-h-10 shrink-0 items-center gap-1.5 overflow-hidden rounded-full border px-3 text-[13px] font-semibold ${i === k ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-border bg-white text-ink/70 hover:bg-canvas'}`}>
              <x.icon size={14} />{L(x)}
              {i === k && auto && <span key={`p-${k}`} className="story-progress absolute inset-x-0 bottom-0 h-[3px] bg-primary-600" style={{ animationDuration: `${sc.sec}s` }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// The 36 sample fields of the upazila lighting up in order of their radar transplanting day (one season in ~8 s).
function FieldReplay({ detail, row, on }) {
  const { T, s } = useStore();
  const W = 640, H = 400;
  const [d, setD] = useState(150);
  const t = detail?.seasons?.[LATEST]?.fields ?? [];
  useEffect(() => {
    if (!on) return undefined;
    if (reduce()) { setD(300); return undefined; }
    setD(150);
    const iv = setInterval(() => setD((x) => (x >= 300 ? x : x + 2)), 110);
    return () => clearInterval(iv);
  }, [on]);
  if (!detail) return <div className="grid h-full place-items-center text-muted">{T('তথ্য আনা হচ্ছে…', 'Loading…')}</div>;
  const [x0, y0, x1, y1] = detail.box;
  const kx = Math.cos(((y0 + y1) / 2) * Math.PI / 180), sc = Math.min((W - 40) / ((x1 - x0) * kx), (H - 60) / (y1 - y0));
  const ox = (W - (x1 - x0) * kx * sc) / 2, oy = (H - 20 - (y1 - y0) * sc) / 2;
  const p = ([lon, lat]) => [ox + (lon - x0) * kx * sc, oy + (y1 - lat) * sc];
  const ring = row.ring.map(p).map((q) => q.join(',')).join(' ');
  const done = t.filter((v) => v != null && v <= d).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <rect width={W} height={H} fill="#132a1b" />
      <polygon points={ring} fill="#1f3d28" stroke="#e8efe6" strokeWidth="2" />
      {detail.fields.map((f, i) => { const [cx, cy] = p(f); const lit = t[i] != null && t[i] <= d; return (
        <g key={i}>{lit && <circle cx={cx} cy={cy} r="15" fill={GOLD} opacity="0.25" />}<circle cx={cx} cy={cy} r={lit ? 7 : 4.5} fill={lit ? GOLD : 'none'} stroke="#ffffff" strokeOpacity={t[i] == null ? 0.35 : 0.85} strokeWidth="2" style={{ transition: 'r .3s, fill .3s' }} /></g>); })}
      <text x={20} y={H - 16} fontSize="15" fontWeight="700" fill="#fff">{fmtDate(doyToMs(LATEST, Math.min(d, 300)), s.lang)}</text>
      <text x={W - 20} y={H - 16} textAnchor="end" fontSize="15" fontWeight="700" fill={GOLD}>{T(`${bnDigits(done)}/${bnDigits(t.length)} জমি`, `${done}/${t.length} fields`)}</text>
    </svg>
  );
}
