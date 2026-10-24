import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { Search, UsersRound, ArrowLeft, ChevronRight, Sprout, Droplets, Layers, MapPin, LifeBuoy, CheckCircle2 } from 'lucide-react';
import { useStore, soilData, srdi } from '../../store';
import { srdiUnionOf } from '../../engine/soil';
import priceSeasons from '../../data/price_seasons.json';
import cropEconomics from '../../data/crop_economics.json';
import { PageHeader, Card, Badge, Button, Tags, EmptyState, RISK_STYLE, LABEL_STYLE, ScoreRing } from '../../components/ui';
import MapView from '../../components/map/MapView';
import { cropName, IRRIGATION, RABI_CROPS } from '../../engine/crops';
import { decide } from '../../engine/decision';
import { num, fmtDate, todayDhaka } from '../../engine/dates';
import { CROP_COLOR, REQ_STATUS, ageLabel } from './shared';
import { SYMPTOMS, upazilaOfUnion } from '../../data/demo';
import FieldsMap, { LEVEL_LOOK } from '../../components/fields/FieldsMap';
import { seriesNow } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';

export default function Farmers() {
  const { s, T, L, unionsAll } = useStore();
  const lang = s.lang;
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [crop, setCrop] = useState('all');
  const [scope, setScope] = useState(params.get('q') ? 'all' : 'mine');
  // A search from the top bar looks across all unions.
  useEffect(() => { const v = params.get('q') ?? ''; setQ(v); if (v) setScope('all'); }, [params]);
  const rows = useMemo(() => {
    const unions = scope === 'mine' ? [unionsAll[s.officerUnion]] : Object.values(unionsAll);
    return unions.flatMap((u) => u.farmers.map((f) => ({ f, u, plan: u.plans.find((p) => p.plot_id === f.id), open: s.requests.filter((r) => r.farmerId === f.id && r.status === 'open').length })));
  }, [unionsAll, s.officerUnion, scope, s.requests]);
  const shown = rows.filter(({ plan }) => (crop === 'all' || (crop === 'none' ? !plan : plan?.crop === crop)))
    .filter(({ f }) => { const t = q.trim().toLowerCase(); return !t || `${f.name.bn} ${f.name.en} ${f.village} ${f.villageBn}`.toLowerCase().includes(t); })
    .sort((a, b) => b.open - a.open || (b.f.hero ? 1 : 0) - (a.f.hero ? 1 : 0));
  const LIMIT = 120;
  return (
    <div>
      <PageHeader eyebrow={T('কৃষক ও জমি', 'Farmers and fields')} title={T('ইউনিয়নের কৃষকেরা', 'Farmers in your union')} subtitle={T('কে কী লাগাচ্ছেন, কার অনুরোধ খোলা আছে, সেচের পানি কোথা থেকে।', 'What each farmer is planting, who has open requests, and where their water comes from.')} tags={['DEMO']} />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-black/[.05] px-3 focus-within:ring-2 focus-within:ring-primary-500 lg:flex-1">
            <Search size={17} className="text-muted" />
            <span className="sr-only">{T('খুঁজুন', 'Search')}</span>
            <input value={q} onChange={(e) => { setQ(e.target.value); setParams(e.target.value ? { q: e.target.value } : {}, { replace: true }); }} className="w-full bg-transparent text-[15px] outline-none" placeholder={T('কৃষক বা গ্রামের নাম', 'Farmer or village name')} />
          </label>
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 text-[14.5px] font-semibold" aria-label={T('ফসল দিয়ে ছাঁকুন', 'Filter by crop')}>
            <option value="all">{T('সব ফসল', 'All crops')}</option>
            {Object.values(RABI_CROPS).map((c) => <option key={c.id} value={c.id}>{L(c.name)}</option>)}
            <option value="none">{T('এখনো ঠিক করেননি', 'Not decided')}</option>
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-11 rounded-xl border border-border bg-white px-3 text-[14.5px] font-semibold" aria-label={T('কোন ইউনিয়ন', 'Which unions')}>
            <option value="mine">{T('আমার ইউনিয়ন', 'My union')}</option>
            <option value="all">{T('সব ইউনিয়ন', 'All unions')}</option>
          </select>
        </div>
        {/* Phones: one card per farmer. The table below needs a wider screen. */}
        <ul className="divide-y divide-border md:hidden">
          {shown.slice(0, LIMIT).map(({ f, u, plan, open }) => (
            <li key={f.id}>
              <Link to={`/officer/farmers/${f.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-primary-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><UsersRound size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5"><span className="font-bold">{L(f.name)}</span>{f.hero && <Badge tone="blue">{T('গল্পের কৃষক', 'Story farmer')}</Badge>}{open > 0 && <Badge tone="amber">{T(`${num(open, 'bn')}টি অনুরোধ`, `${open} open`)}</Badge>}</span>
                  <span className="block truncate text-[13.5px] text-muted">{lang === 'bn' ? f.villageBn : f.village}, {L(u.meta)} · {T(`${num(f.area_dec, 'bn')} শতক`, `${f.area_dec} dec`)} · {L(IRRIGATION[f.irrigation])}</span>
                  <span className="mt-0.5 block text-[13.5px] font-semibold">{plan ? <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CROP_COLOR[plan.crop] }} />{cropName(plan.crop, lang)}, {fmtDate(plan.date, lang)}</span> : <span className="font-normal text-muted">{T('এখনো ঠিক করেননি', 'Not decided yet')}</span>}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] text-left">
            <thead className="bg-canvas text-[13px] text-muted"><tr>{[T('কৃষক', 'Farmer'), T('গ্রাম, ইউনিয়ন', 'Village, union'), T('এই রবিতে', 'This Rabi'), T('জমি', 'Land'), T('সেচ', 'Water'), T('খোলা অনুরোধ', 'Open requests'), ''].map((x, i) => <th key={i} className="px-5 py-3 font-semibold">{x}</th>)}</tr></thead>
            <tbody className="divide-y divide-border text-[14.5px]">
              {shown.slice(0, LIMIT).map(({ f, u, plan, open }) => (
                <tr key={f.id} className="hover:bg-primary-50/40">
                  <td className="px-5 py-3"><Link to={`/officer/farmers/${f.id}`} className="flex items-center gap-3 font-bold hover:text-primary-700"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><UsersRound size={17} /></span>{L(f.name)}{f.hero && <Badge tone="blue">{T('গল্পের কৃষক', 'Story farmer')}</Badge>}</Link></td>
                  <td className="px-5 py-3 text-muted">{lang === 'bn' ? f.villageBn : f.village}, {L(u.meta)}</td>
                  <td className="px-5 py-3 font-semibold">{plan ? <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CROP_COLOR[plan.crop] }} />{cropName(plan.crop, lang)}, {fmtDate(plan.date, lang)}</span> : <span className="font-normal text-muted">{T('এখনো ঠিক করেননি', 'Not decided')}</span>}</td>
                  <td className="px-5 py-3 tabular">{T(`${num(f.area_dec, 'bn')} শতক`, `${f.area_dec} dec`)}</td>
                  <td className="px-5 py-3">{L(IRRIGATION[f.irrigation])}</td>
                  <td className="px-5 py-3">{open ? <Badge tone="amber">{num(open, lang)}</Badge> : <span className="text-muted">—</span>}</td>
                  <td className="px-5 py-3"><Button to={`/officer/farmers/${f.id}`} variant="ghost" className="!px-2 !py-1">{T('দেখুন', 'View')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length === 0 && <div className="p-6"><EmptyState icon={UsersRound} title={T('কাউকে পাওয়া যায়নি', 'No one found')} text={T('অন্য নাম লিখুন, অথবা "সব ইউনিয়ন" বেছে নিন।', 'Try another name, or choose "All unions".')} /></div>}
        <div className="border-t border-border px-5 py-3 text-[13px] text-muted">{shown.length > LIMIT ? T(`${num(shown.length, 'bn')} জনের মধ্যে প্রথম ${num(LIMIT, 'bn')} জন`, `First ${LIMIT} of ${shown.length}`) : T(`${num(shown.length, 'bn')} জন`, `${shown.length} shown`)}</div>
      </Card>
    </div>
  );
}

// The upazila office's register of a farmer's fields: each one's satellite status, and the farmer's own changes
// waiting to be checked (verify, or put the field back where the register has it).
function FarmerFields({ f }) {
  const { s, T, L, dispatch, toast, parcels, unionsAll } = useStore();
  const lang = s.lang;
  const mine = parcels.filter((p) => p.owner === f.id);
  const [sel, setSel] = useState(null);
  const [all, setAll] = useState(true);
  const levels = useMemo(() => Object.fromEntries(mine.map((p) => { const series = seriesNow(p); return [p.id, series.length ? readField({ series }, { today: todayDhaka() }) : null]; })), [mine]);
  if (!mine.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
        <h2 className="flex items-center gap-2 text-[19px] font-bold"><MapPin size={18} className="text-primary-600" />{T(`অফিসে নিবন্ধিত জমি (${num(mine.length, 'bn')}টি)`, `Fields on the office register (${mine.length})`)}</h2>
        <Tags list={['REAL', 'AI', 'DEMO']} />
      </div>
      <FieldsMap parcels={mine} levels={Object.fromEntries(mine.map((p) => [p.id, levels[p.id]?.level ?? 'none']))} selectedId={sel} focusAll={all}
        onSelect={(id) => { setSel(id); setAll(false); }} onShowAll={() => setAll(true)} height={300} upazila={upazilaOfUnion(f.union).id} />
      <ul className="divide-y divide-border">
        {mine.map((p, i) => {
          const r = levels[p.id], look = LEVEL_LOOK[r?.level ?? 'none'];
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: look.color }}>{num(i + 1, lang)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 font-semibold">{L(p.name)} <span className="text-[12.5px] font-normal text-muted">{p.id}</span>{p.pending && <Badge tone="amber">{p.added ? T('কৃষক নতুন যোগ করেছেন', 'Added by the farmer') : T('কৃষক অবস্থান বদলেছেন', 'Moved by the farmer')}</Badge>}</div>
                <div className="text-[13px] text-muted">{lang === 'bn' ? p.villageBn : p.village}, {L(unionsAll[p.union]?.meta ?? { bn: p.union, en: p.union })} · {T(`${num(p.area_dec, 'bn')} শতক`, `${p.area_dec} dec`)} · {r?.top ? L(r.top.pattern.name) : T('উপগ্রহের হিসাব নেই', 'No satellite reading yet')}</div>
                {r && r.level !== 'ok' && <div className="mt-0.5 text-[13px]" style={{ color: look.color }}><look.icon size={13} className="mr-1 inline" />{L(r.findings.find((x) => x.tone !== 'ok') ?? look)}</div>}
              </div>
              {p.pending && (
                <div className="flex gap-2">
                  <Button className="!px-3 !py-1.5 text-[13.5px]" onClick={() => { dispatch({ type: 'verifyParcel', id: p.id, date: today }); toast('জমি যাচাই হয়েছে', 'Field verified'); }}><CheckCircle2 size={15} />{T('যাচাই করুন', 'Verify')}</Button>
                  {!p.added && <Button variant="secondary" className="!px-3 !py-1.5 text-[13.5px]" onClick={() => { dispatch({ type: 'resetParcel', id: p.id }); toast('অফিসের অবস্থানে ফেরানো হয়েছে', 'Put back to the registered position'); }}>{T('আগের অবস্থান', 'Registered position')}</Button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function FarmDetail() {
  const { id } = useParams();
  const { s, T, L, unionsAll, farmerOf, officerClim: clim } = useStore();
  const lang = s.lang;
  const f = farmerOf(id);
  const u = f && unionsAll[f.union];
  const d = useMemo(() => (f && u ? decide({ clim, soil: soilData.unions[f.union], plot: f, union: u, priorities: [], econ: { prices: priceSeasons, costs: cropEconomics, srdiUnion: srdiUnionOf(srdi, f.union) } }) : null), [clim, f, u]);
  // A farmer from another upazila's office (e.g. an old link) is not this officer's to open.
  if (f && !u) return <EmptyState title={T('এই কৃষক অন্য উপজেলার', 'This farmer belongs to another upazila')} action={<Button to="/officer/farmers">{T('কৃষকের তালিকায় ফিরুন', 'Back to farmers')}</Button>} />;
  if (!f) return <EmptyState title={T('এই কৃষককে পাওয়া যায়নি', 'Farmer not found')} action={<Button to="/officer/farmers">{T('কৃষকের তালিকায় ফিরুন', 'Back to farmers')}</Button>} />;
  const plan = u.plans.find((p) => p.plot_id === f.id);
  const soil = soilData.unions[f.union];
  const reqs = s.requests.filter((r) => r.farmerId === f.id);
  const st = LABEL_STYLE[d.label];
  return (
    <div>
      <Link to="/officer/farmers" className="mb-4 inline-flex items-center gap-2 text-[14.5px] font-semibold text-muted hover:text-primary-700"><ArrowLeft size={16} />{T('কৃষকের তালিকা', 'All farmers')}</Link>
      <PageHeader eyebrow={T('কৃষক ও জমি', 'Farmer and field')} title={L(f.name)} subtitle={`${lang === 'bn' ? f.villageBn : f.village}, ${L(u.meta)}. ${T(`${num(f.area_dec, 'bn')} শতক, ${IRRIGATION[f.irrigation].bn}`, `${f.area_dec} decimal, ${IRRIGATION[f.irrigation].en.toLowerCase()}`)}`} tags={['DEMO']} />
      <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <Card className="overflow-hidden">
          <MapView center={[f.lat, f.lon]} zoom={15} basemap="satellite" points={[...u.farmers.filter((x) => x.id !== f.id).map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, color: '#b9d8aa', r: 4 })), { id: f.id, lat: f.lat, lon: f.lon, color: '#d08f26', r: 10, ring: '#ffffff', label: L(f.name) }]} height={320} className="!rounded-none !border-0" label={T('জমির মানচিত্র', 'Field map')} />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4" data-stagger>
            {[[Sprout, T('এই রবিতে', 'This Rabi'), plan ? `${cropName(plan.crop, lang)}, ${fmtDate(plan.date, lang)}` : T('ঠিক করেননি', 'Not decided')], [Sprout, T('গত রবিতে', 'Last Rabi'), cropName(f.last_crop, lang)], [Droplets, T('সেচ', 'Water'), L(IRRIGATION[f.irrigation])], [Layers, T('মাটি', 'Soil'), `pH ${num(soil.ph, lang, { dp: 1 })}`]].map(([Icon, l, v]) => (
              <div key={l} className="rounded-xl bg-canvas p-3.5"><Icon size={17} className="text-primary-600" /><div className="mt-2 text-[13px] text-muted">{l}</div><div className="mt-0.5 text-[14.5px] font-bold">{v}</div></div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <FarmerFields f={f} />
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2"><h2 className="text-[19px] font-bold">{T('এই জমির জন্য পরামর্শ', 'Recommendation for this field')}</h2><Tags list={['RULE']} /></div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`rounded-lg ${st.bg} px-3 py-1.5 font-semibold text-white`}>{L(st.short)}</span>
              <div className="min-w-0"><div className="font-bold">{L(d.rec.crop.name)}, {fmtDate(d.rec.t0, lang)}</div><div className="text-[13px] text-muted">{T('কৃষকের নিজের চাওয়া ছাড়া, সব দিক সমান ধরে', 'All factors weighted equally, before the farmer’s own priorities')}</div></div>
              <span className="ml-auto"><ScoreRing value={d.rec.score} size={46} /></span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{d.options.map((o) => <span key={o.crop.id} className="chip bg-black/5 text-ink/75">{L(o.crop.name)} {num(o.score, lang)}</span>)}</div>
            <div className="mt-3 text-[13.5px] text-muted">{T('দাম পড়ার ঝুঁকি', 'Price-drop risk')}: <span className={`chip ${RISK_STYLE[d.rec.glut.level].cls}`}>{L(RISK_STYLE[d.rec.glut.level])}</span></div>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[19px] font-bold"><LifeBuoy size={18} className="text-primary-600" />{T('আগের অনুরোধ', 'Past requests')}</h2>
            {reqs.length === 0 ? <p className="mt-2 text-[14px] text-muted">{T('এই কৃষক এখনো কিছু জানাননি।', 'This farmer has not sent any requests.')}</p> : (
              <ul className="mt-2 divide-y divide-border">{reqs.map((r) => <li key={r.id}><Link to={`/officer/requests/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary-700"><span className="text-[14.5px] font-semibold">{L(SYMPTOMS[r.symptom])} <span className="font-normal text-muted">{ageLabel(r.created, T)}</span></span><Badge tone={REQ_STATUS[r.status].tone}>{L(REQ_STATUS[r.status])}</Badge></Link></li>)}</ul>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted"><MapPin size={13} />{T('অবস্থান আনুমানিক (নমুনা)', 'Approximate position (demo)')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
