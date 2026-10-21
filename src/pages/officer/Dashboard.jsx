import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, UsersRound, LifeBuoy, BellRing, Sprout, TrendingDown, MapPinned } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, StatCard, Card, Badge, Button, Tags, RISK_STYLE } from '../../components/ui';
import MapView from '../../components/map/MapView';
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
  const cropShare = union.plans.filter((p) => p.crop === crop).reduce((a, p) => a + p.area_dec, 0) / union.area_dec;
  const undecided = farmers.filter((f) => f.hero && f.union === union.id && !confirmedAll.some((c) => c.plot_id === f.id));
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={UsersRound} label={T('কৃষক', 'Farmers')} value={num(union.farmers.length, lang)} note={T(union.meta.full.bnIn, `in ${union.meta.full.en}`)} to="/officer/farmers" />
        <StatCard icon={LifeBuoy} tone={open.length ? 'amber' : 'green'} label={T('খোলা অনুরোধ', 'Open requests')} value={num(open.length, lang)} note={T(`${num(open.filter((r) => r.priority === 'High').length, 'bn')}টি জরুরি`, `${open.filter((r) => r.priority === 'High').length} urgent`)} to="/officer/requests" />
        <StatCard icon={BellRing} tone={hs.length ? 'red' : 'green'} label={T('এলাকার সতর্কতা', 'Area alerts')} value={num(hs.length, lang)} note={hs.length ? T('একই সমস্যা কয়েক জমিতে', 'Same problem in several fields') : T('কিছু নেই', 'None')} to="/officer/alerts" />
        <StatCard icon={Sprout} tone="blue" label={cropName(crop, lang)} value={`${num(cropShare * 100, lang)}%`} note={T('পরিকল্পিত জমির', 'of planned land')} to="/officer/planting" />
        <StatCard icon={TrendingDown} tone={g.risk.level === 'High' ? 'red' : g.risk.level === 'Medium' ? 'amber' : 'green'} label={T('দাম পড়ার ঝুঁকি', 'Price-drop risk')} value={L(RISK_STYLE[g.risk.level])} note={T(`সবচেয়ে ব্যস্ত সপ্তাহে স্বাভাবিকের ${num(g.peak, 'bn', { dp: 1 })} গুণ`, `Busiest week ${num(g.peak, 'en', { dp: 1 })}× normal`)} to="/officer/planting" />
      </div>

      {hs.length > 0 && <div className="mt-6 space-y-4">{hs.map((h) => <ClusterCard key={h.id} h={h} union={union} compact />)}</div>}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-[20px] font-bold">{T('এলাকার মানচিত্র', 'Area map')}</h2><p className="text-[13.5px] text-muted">{T('কে কী লাগাচ্ছেন আর কোথায় অনুরোধ এসেছে। অবস্থান আনুমানিক।', 'What is planted where, and where requests came from. Positions approximate.')}</p></div>
            <Button to="/officer/map" variant="secondary" className="shrink-0 whitespace-nowrap"><MapPinned size={16} />{T('বড় করে দেখুন', 'Full map')}</Button>
          </div>
          <MapView center={[union.meta.lat, union.meta.lon]} zoom={13} focus={union.id} overlay={areaChip(union, T, lang)} points={points} circles={hs.map((h) => ({ id: h.id, lat: h.lat, lon: h.lon, radius: 900, color: '#b42318' }))} height={470} label={T('ইউনিয়নের মানচিত্র', 'Union map')} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
            {Object.entries(CROP_COLOR).map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{cropName(k, lang)}</span>)}
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full bg-paddy-500 ring-2 ring-ink" />{T('অনুরোধ', 'Request')}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-[20px] font-bold">{T('আগে যেগুলো দেখবেন', 'Look at these first')}</h2><p className="text-[13.5px] text-muted">{T('জরুরিগুলো ওপরে', 'Urgent ones at the top')}</p></div><Badge tone={open.length ? 'amber' : 'green'}>{T(`${num(open.length, 'bn')}টি খোলা`, `${open.length} open`)}</Badge></div>
          <div className="mt-4 space-y-2.5">
            {reqs.slice(0, 4).map((r) => {
              const f = farmerOf(r.farmerId);
              return (
                <Link key={r.id} to={`/officer/requests/${r.id}`} className={`block rounded-xl border p-3.5 transition hover:border-primary-300 hover:bg-primary-50/40 ${r.mine ? 'border-sky-200 bg-sky-50/50' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate text-[15px] font-bold">{L(f?.name)}</span>{r.mine && <Badge tone="blue">{T('নতুন', 'New')}</Badge>}</div><div className="mt-0.5 text-[13px] text-muted">{cropName(r.crop, lang)}, {lang === 'bn' ? r.villageBn : r.village}, {ageLabel(r.created, T)}</div></div>
                    <Badge tone={r.status === 'open' ? PRIORITY[r.priority].tone : 'green'}>{r.status === 'open' ? L(PRIORITY[r.priority]) : T('উত্তর দেওয়া', 'Answered')}</Badge>
                  </div>
                  <p className="mt-2 text-[14px] text-ink/75">{L(SYMPTOMS[r.symptom])}{r.ai ? T(`। ছবি দেখে মনে হচ্ছে: ${aiLabel(r.ai[0]).bn} (${num(r.ai[0].p * 100, 'bn')}%)${r.doctor ? '' : ' — নমুনা অনুমান'}`, `. Photo suggests: ${aiLabel(r.ai[0]).en.toLowerCase()} (${num(r.ai[0].p * 100, 'en')}%)${r.doctor ? '' : ' — sample guess'}`) : ''}</p>
                </Link>
              );
            })}
          </div>
          <Button to="/officer/requests" variant="ghost" className="mt-3 w-full">{T('সব অনুরোধ দেখুন', 'See all requests')}<ChevronRight size={16} /></Button>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-[20px] font-bold">{T(`${cropName(crop, 'bn')}: কোন সপ্তাহে কত টন উঠবে`, `${cropName(crop, 'en')}: tonnes ready each week`)}</h2><p className="text-[13.5px] text-muted">{undecided.length ? T(`এখনো পরিকল্পনা পাকা করেননি: ${undecided.map((f) => f.name.bn).join(', ')}`, `Not confirmed yet: ${undecided.map((f) => f.name.en).join(', ')}`) : T('এই ইউনিয়নের নমুনা কৃষকেরা সবাই পরিকল্পনা পাকা করেছেন।', 'All sample farmers in this union have confirmed their plans.')}</p></div>
          <div className="flex items-center gap-2"><Tags list={['RULE', 'DEMO']} /><Button to="/officer/planting" variant="secondary">{T('লাগানোর পালা দেখুন', 'Planting slots')}</Button></div>
        </div>
        <div className="mt-2"><SupplyChart bins={g.bins} normal={g.normal} dip={PRICE_DIP[crop]} height={210} /></div>
      </Card>
    </div>
  );
}
