import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, UsersRound, LifeBuoy, BellRing, Sprout, TrendingDown, MapPinned, ClipboardCheck } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, StatCard, Card, Badge, Button, Tags, RISK_STYLE, CountUp } from '../../components/ui';
import MapView from '../../components/map/MapView';
import { LazyMount } from '../../components/SectionNav';
import { areaInfo } from '../../components/map/UpazilaLayers';
import SupplyChart from '../../components/charts/SupplyChart';
import { SYMPTOMS, DISEASES, aiLabel } from '../../data/demo';
import { cropName } from '../../engine/crops';
import { PRICE_DIP } from '../../engine/glut';
import { num, fmtDate, fmtBangla, todayDhaka } from '../../engine/dates';
import { useOfficerUnion, sortRequests, PRIORITY, CROP_COLOR, ClusterCard, ageLabel, unionGlut, cropsByArea } from './shared';

const areaChip = (union, T, lang) => {
  const a = areaInfo(union.id);
  if (!a) return null;
  const v = a.villages.filter((p) => p.k === 'village').length;
  return (
    <span className="pointer-events-auto rounded-xl bg-white/95 px-3 py-2 text-[12.5px] leading-5 text-ink shadow-lg">
      <b className="block text-[13.5px]">{T(union.meta.full.bn, union.meta.full.en)}</b>
      {T(`${num(v, 'bn')}টি গ্রাম · ${num(a.km2, 'bn', { dp: 1 })} বর্গ কিমি · ${num(union.farmers.length, 'bn')} জন নমুনা কৃষক`, `${v} villages · ${a.km2.toFixed(1)} km² · ${union.farmers.length} sample farmers`)}
    </span>
  );
};

export default function OfficerDashboard() {
  const { s, T, L, hotspots, farmerOf, farmers, confirmedAll } = useStore();
  const lang = s.lang;
  const navigate = useNavigate();
  const union = useOfficerUnion();
  const reqs = sortRequests(s.requests.filter((r) => r.union === union.id));
  const open = reqs.filter((r) => r.status === 'open');
  const hs = hotspots.filter((h) => h.members.some((m) => m.union === union.id));
  const crop = cropsByArea([union])[0]?.k ?? 'tomato'; // this union's biggest planned crop
  const g = unionGlut(union, crop);
  const areaOf = (ps) => ps.reduce((a, p) => a + p.area_dec, 0);
  const cropShare = areaOf(union.plans.filter((p) => p.crop === crop)) / (areaOf(union.plans) || 1); // of planned land, as on the planting page
  const unionFarmers = farmers.filter((f) => f.hero && f.union === union.id);
  const undecided = unionFarmers.filter((f) => !confirmedAll.some((c) => c.plot_id === f.id));
  const participation = unionFarmers.length ? Math.round(((unionFarmers.length - undecided.length) / unionFarmers.length) * 100) : 0;
  const points = useMemo(() => {
    // A shared plan can come from a field this app has no farmer record for: count it, but it has no pin.
    const pts = union.plans.flatMap((p) => { const f = farmerOf(p.plot_id); if (!f) return []; return { id: p.plot_id, lat: f.lat, lon: f.lon, color: CROP_COLOR[p.crop], r: 4, label: `${L(f.name)}: ${cropName(p.crop, lang)}` }; });
    for (const r of open) pts.push({ id: `q${r.id}`, lat: r.lat, lon: r.lon, color: r.priority === 'High' ? '#b42318' : '#e3a33a', r: 8, ring: '#13261b', label: `${L(farmerOf(r.farmerId)?.name)}: ${L(SYMPTOMS[r.symptom])}`, onClick: () => navigate(`/officer/requests/${r.id}`) });
    return pts;
  }, [union, open, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageHeader eyebrow={T(`আজ ${fmtBangla(todayDhaka(), 'bn')}, ${fmtDate(todayDhaka(), 'bn')}`, `Today, ${fmtDate(todayDhaka(), 'en')} (${fmtBangla(todayDhaka(), 'en')})`)} title={T(`${union.meta.full.bn}`, `${union.meta.full.en}`)}
        subtitle={T('কৃষকদের অনুরোধ, এলাকার সতর্কতা আর এই রবিতে কে কী লাগাচ্ছেন — এক জায়গায়।', 'Farmer requests, area alerts and what everyone is planting this Rabi, in one place.')} tags={['DEMO']} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1" data-stagger>
        <StatCard icon={UsersRound} label={T('কৃষক', 'Farmers')} value={<CountUp value={union.farmers.length} />} note={T(union.meta.full.bnIn, `in ${union.meta.full.en}`)} to="/officer/farmers" />
        <StatCard icon={LifeBuoy} tone={open.length ? 'amber' : 'green'} label={T('খোলা অনুরোধ', 'Open requests')} value={<CountUp value={open.length} />} note={T(`${num(open.filter((r) => r.priority === 'High').length, 'bn')}টি জরুরি`, `${open.filter((r) => r.priority === 'High').length} urgent`)} to="/officer/requests" />
        <StatCard icon={BellRing} tone={hs.length ? 'red' : 'green'} label={T('এলাকার সতর্কতা', 'Area alerts')} value={<CountUp value={hs.length} />} note={hs.length ? T('একই সমস্যা কয়েক জমিতে', 'Same problem in several fields') : T('কিছু নেই', 'None')} to="/officer/alerts" />
        <StatCard icon={Sprout} tone="blue" label={cropName(crop, lang)} value={`${num(cropShare * 100, lang)}%`} note={T('পরিকল্পিত জমির', 'of planned land')} to="/officer/planting" />
        <StatCard icon={TrendingDown} tone={g.risk.level === 'High' ? 'red' : g.risk.level === 'Medium' ? 'amber' : 'green'} label={T('দাম পড়ার ঝুঁকি', 'Price-drop risk')} value={L(RISK_STYLE[g.risk.level])} note={T(`সবচেয়ে ব্যস্ত সপ্তাহে স্বাভাবিকের ${num(g.peak, 'bn', { dp: 1 })} গুণ`, `Busiest week ${num(g.peak, 'en', { dp: 1 })}× normal`)} to="/officer/planting" />
      </div>

      <Card className="mt-4 flex flex-wrap items-center gap-4 p-4 sm:px-5" data-tour="plan-participation">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700 shadow-2xs"><ClipboardCheck size={20} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[15px] font-bold">{T('নমুনা কৃষকের পরিকল্পনা', 'Sample farmer plan progress')}</h2>
            <span className="font-display tabular text-[13.5px] font-bold text-primary-800">{T(`${num(unionFarmers.length - undecided.length, 'bn')} / ${num(unionFarmers.length, 'bn')} জন`, `${unionFarmers.length - undecided.length} / ${unionFarmers.length} farmers`)}</span>
          </div>
          <div role="progressbar" aria-label={T('কৃষকের পরিকল্পনার অগ্রগতি', 'Farmer plan progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={participation}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary-100 shadow-inner">
            <div className="plan-progress-fill progress-sheen h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-600 to-paddy-500 transition-all duration-700 ease-[var(--ease-spring)]" style={{ width: `${participation}%` }} />
          </div>
        </div>
        <Link to="/officer/farmers" className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-semibold text-primary-700 transition-colors hover:text-paddy-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          {T('কারা বাকি দেখুন', 'View pending')}<ChevronRight size={16} />
        </Link>
      </Card>

      {hs.length > 0 && <div className="mt-6 space-y-4">{hs.map((h) => <ClusterCard key={h.id} h={h} union={union} compact />)}</div>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-[20px] font-bold">{T('এলাকার মানচিত্র', 'Area map')}</h2><p className="text-[13.5px] text-muted">{T('কে কী লাগাচ্ছেন আর কোথায় অনুরোধ এসেছে। অবস্থান আনুমানিক।', 'What is planted where, and where requests came from. Positions approximate.')}</p></div>
            <Button to="/officer/map" variant="secondary" className="shrink-0 whitespace-nowrap"><MapPinned size={16} />{T('বড় করে দেখুন', 'Full map')}</Button>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-border/80 shadow-xs">
            <LazyMount height={470} idle><MapView center={[union.meta.lat, union.meta.lon]} zoom={13} focus={union.id} overlay={areaChip(union, T, lang)} points={points} circles={hs.map((h) => ({ id: h.id, lat: h.lat, lon: h.lon, radius: 900, color: '#b42318' }))} height={470} label={T('ইউনিয়নের মানচিত্র', 'Union map')} /></LazyMount>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
            {Object.entries(CROP_COLOR).map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5 font-medium"><i className="inline-block h-2.5 w-2.5 rounded-full shadow-2xs" style={{ background: c }} />{cropName(k, lang)}</span>)}
            <span className="inline-flex items-center gap-1.5 font-medium"><i className="inline-block h-3 w-3 rounded-full bg-paddy-500 ring-2 ring-ink shadow-2xs" />{T('অনুরোধ', 'Request')}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-[20px] font-bold">{T('আগে যেগুলো দেখবেন', 'Look at these first')}</h2><p className="text-[13.5px] text-muted">{T('জরুরিগুলো ওপরে', 'Urgent ones at the top')}</p></div><Badge tone={open.length ? 'amber' : 'green'}>{T(`${num(open.length, 'bn')}টি খোলা`, `${open.length} open`)}</Badge></div>
          <div className="mt-4 space-y-2.5">
            {reqs.slice(0, 4).map((r) => {
              const f = farmerOf(r.farmerId);
              const isUrgent = r.priority === 'High' && r.status === 'open';
              return (
                <Link key={r.id} to={`/officer/requests/${r.id}`} className={`group block rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isUrgent ? 'border-l-4 !border-l-red-500 border-border bg-white hover:border-red-300' : r.mine ? 'border-l-4 !border-l-sky-500 border-sky-200 bg-sky-50/50 hover:bg-sky-50/80' : 'border-border bg-white hover:border-primary-300 hover:bg-primary-50/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate text-[15px] font-bold text-ink group-hover:text-primary-950 transition-colors">{L(f?.name)}</span>{r.mine && <Badge tone="blue">{T('নতুন', 'New')}</Badge>}</div><div className="mt-0.5 text-[13px] text-muted">{cropName(r.crop, lang)}, {lang === 'bn' ? r.villageBn : r.village}, {ageLabel(r.created, T)}</div></div>
                    <Badge tone={r.status === 'open' ? PRIORITY[r.priority].tone : 'green'}>{r.status === 'open' ? L(PRIORITY[r.priority]) : T('উত্তর দেওয়া', 'Answered')}</Badge>
                  </div>
                  <p className="mt-2 text-[14px] leading-6 text-ink/75">{L(SYMPTOMS[r.symptom])}{r.ai ? T(`। ছবি দেখে মনে হচ্ছে: ${aiLabel(r.ai[0]).bn} (${num(r.ai[0].p * 100, 'bn')}%)${r.doctor ? '' : ' — নমুনা অনুমান'}`, `. Photo suggests: ${aiLabel(r.ai[0]).en.toLowerCase()} (${num(r.ai[0].p * 100, 'en')}%)${r.doctor ? '' : ' — sample guess'}`) : ''}</p>
                </Link>
              );
            })}
          </div>
          <Button to="/officer/requests" variant="ghost" className="mt-3 w-full justify-center">{T('সব অনুরোধ দেখুন', 'See all requests')}<ChevronRight size={16} /></Button>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-[20px] font-bold">{T(`${cropName(crop, 'bn')}: কোন সপ্তাহে কত টন উঠবে`, `${cropName(crop, 'en')}: tonnes ready each week`)}</h2><p className="text-[13.5px] text-muted">{undecided.length ? T(`এখনো পরিকল্পনা পাকা করেননি: ${undecided.map((f) => f.name.bn).join(', ')}`, `Not confirmed yet: ${undecided.map((f) => f.name.en).join(', ')}`) : T('এই ইউনিয়নের নমুনা কৃষকেরা সবাই পরিকল্পনা পাকা করেছেন।', 'All sample farmers in this union have confirmed their plans.')}</p></div>
          <div className="flex items-center gap-2"><Tags list={['RULE', 'DEMO']} /><Button to="/officer/planting" variant="secondary">{T('লাগানোর পালা দেখুন', 'Planting slots')}</Button></div>
        </div>
        <div className="mt-2"><SupplyChart bins={g.bins} normal={g.normal} dip={PRICE_DIP[crop]} height={210} /></div>
      </Card>

      {/* the rules behind every recommendation, for an officer to check */}
      <Card className="lift mt-6 flex flex-wrap items-start gap-3 border-l-4 !border-l-amber-500 border-amber-200 bg-amber-50/70 p-5 transition-all duration-200 hover:shadow-md">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 shadow-2xs"><ClipboardCheck size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-amber-950">{T('কর্মকর্তার যাচাই দরকার', 'Officer review needed')}</h2>
          <p className="mt-1 text-[14px] leading-6 text-amber-900/85">{T('ফসলের গরম-বৃষ্টির সীমা, লাগানোর তারিখ, দাম পড়ার নিয়ম আর বৃষ্টি শুরুর নিয়ম এখনো শুরুর মান: সাধারণ কৃষিবিজ্ঞান থেকে নেওয়া, কোনো কৃষি কর্মকর্তা যাচাই করেননি। প্রতিটির উৎস আর কারণ এক তালিকায় আছে; ঠিক করে "যাচাই করেছেন" ঘরে নাম দিন।', 'The crop heat and rain limits, planting dates, the price-drop rule and the rain-onset rule are starting values from general agronomy that no agriculture officer has checked yet. Each one is listed with its basis; correct it and sign the “Reviewed by” column.')}</p>
          <a href="https://github.com/razibr246/nasa-field-shift-360/blob/main/docs/THRESHOLDS.md" target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1 text-[14px] font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-950">{T('সীমা ও নিয়মের তালিকা খুলুন', 'Open the thresholds list')}<ChevronRight size={15} /></a>
        </div>
      </Card>
    </div>
  );
}
