import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPinned } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Tags, Note } from '../../components/ui';
import MapView from '../../components/map/MapView';
import { upazilaBoundary, upazilaBounds } from '../../components/map/UpazilaBoundary';
import { LandCoverLayer, UnionLayer, VillageLayer, landcoverOf, placesOf, areaInfo } from '../../components/map/UpazilaLayers';
import { SYMPTOMS } from '../../data/demo';
import { cropName, RABI_CROPS } from '../../engine/crops';
import { num } from '../../engine/dates';
import { useOfficerUnion, CROP_COLOR } from './shared';

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

export default function AreaMap() {
  const { s, T, L, hotspots, farmerOf, officerUpazila: upz } = useStore();
  const lang = s.lang;
  const navigate = useNavigate();
  const union = useOfficerUnion();
  const UPAZILA = upazilaBoundary(upz.id);
  const PLACES = placesOf(upz.id);
  const [layers, setLayers] = useState({ crops: true, requests: true, clusters: true, landuse: true, places: true });
  const [year, setYear] = useState(2025);
  const [crop, setCrop] = useState('all');
  const [view, setView] = useState('upazila');
  const open = s.requests.filter((r) => r.union === union.id && r.status === 'open');
  const hs = hotspots.filter((h) => h.members.some((m) => m.union === union.id));
  const points = useMemo(() => {
    const pts = [];
    if (layers.crops) union.plans.filter((p) => crop === 'all' || p.crop === crop).forEach((p) => {
      const f = farmerOf(p.plot_id); if (!f) return;
      pts.push({ id: p.plot_id, lat: f.lat, lon: f.lon, color: CROP_COLOR[p.crop], r: 5, label: `${L(f.name)}: ${cropName(p.crop, lang)}, ${num(p.area_dec, lang)} ${T('শতক', 'dec')}`, onClick: () => navigate(`/officer/farmers/${f.id}`) });
    });
    if (layers.requests) open.forEach((r) => pts.push({ id: `q${r.id}`, lat: r.lat, lon: r.lon, color: r.priority === 'High' ? '#b42318' : '#e3a33a', r: 9, ring: '#13261b', label: `${L(farmerOf(r.farmerId)?.name)}: ${L(SYMPTOMS[r.symptom])}`, onClick: () => navigate(`/officer/requests/${r.id}`) }));
    return pts;
  }, [layers, crop, union, open, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k) => setLayers((x) => ({ ...x, [k]: !x[k] }));
  const counts = Object.keys(RABI_CROPS).map((k) => [k, union.plans.filter((p) => p.crop === k).length]);
  return (
    <div>
      <PageHeader eyebrow={T('এলাকার মানচিত্র', 'Area map')} title={T(`${union.meta.full.bnOf} মানচিত্র`, `${union.meta.full.en} map`)} subtitle={T('কোন জমিতে কী লাগানো হচ্ছে, কোথা থেকে অনুরোধ এসেছে। কোনো বিন্দুতে চাপ দিলে সেই কৃষক বা অনুরোধ খুলবে।', 'What is planted where, and where requests came from. Tap a dot to open that farmer or request.')} tags={['AI', 'DEMO']} />
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[['crops', T('ফসলের পরিকল্পনা', 'Planned crops')], ['requests', T('খোলা অনুরোধ', 'Open requests')], ['clusters', T('এলাকার সতর্কতা', 'Area alerts')], ['landuse', T('জমির ব্যবহার', 'Land use')], ['places', T('গ্রাম ও ইউনিয়নের নাম', 'Village and union names')]].filter(([k]) => k !== 'landuse' || landcoverOf(upz.id)).map(([k, l]) => (
            <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={layers[k]} className={`min-h-9 rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition ${layers[k] ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-white text-ink/70 hover:border-primary-300'}`}>{l}</button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-white p-0.5" role="group" aria-label={T('কতটা জায়গা দেখাবে', 'How much to show')}>
              {[['upazila', T('পুরো উপজেলা', 'Whole upazila')], ['union', T(`${union.meta.full.bn}`, `${union.meta.full.en}`)]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setView(k)} aria-pressed={view === k}
                  className={`h-9 rounded-[10px] px-3 text-[13.5px] font-semibold transition-colors duration-300 ${view === k ? 'bg-primary-700 text-white' : 'text-ink/70 hover:text-ink'}`}>{l}</button>
              ))}
            </div>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="h-10 rounded-xl border border-border bg-white px-3 text-[14px] font-semibold" aria-label={T('ফসল দিয়ে ছাঁকুন', 'Filter by crop')}>
              <option value="all">{T('সব ফসল', 'All crops')}</option>
              {Object.values(RABI_CROPS).map((c) => <option key={c.id} value={c.id}>{L(c.name)}</option>)}
            </select>
          </div>
        </div>
        <MapView center={[union.meta.lat, union.meta.lon]} zoom={13} upazila={upz.id} bounds={view === 'upazila' ? upazilaBounds(upz.id) : undefined} focus={view === 'union' ? union.id : undefined} focusLabels={!layers.places} overlay={view === 'union' ? areaChip(union, T, lang) : null} points={points} circles={layers.clusters ? hs.map((h) => ({ id: h.id, lat: h.lat, lon: h.lon, radius: 900, color: '#b42318' })) : []} height={540} label={T('ইউনিয়নের মানচিত্র', 'Union map')}>
          {layers.landuse && <LandCoverLayer upazila={upz.id} year={year} />}
          {layers.places && <UnionLayer upazila={upz.id} lang={lang} highlight={union.meta.en} />}
          {layers.places && <VillageLayer upazila={upz.id} />}
        </MapView>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          {counts.map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CROP_COLOR[k] }} />{cropName(k, lang)} ({num(c, lang)})</span>)}
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full bg-paddy-500 ring-2 ring-ink" />{T('অনুরোধ', 'Request')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-red-600" />{T('একই সমস্যার গুচ্ছ', 'Problem cluster')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 border-t-[2.5px] border-dashed border-ink" />{T(`${upz.name.bn} উপজেলার সীমানা (${num(UPAZILA.areaOfficialKm2, 'bn', { dp: 2 })} বর্গ কিমি)`, `${upz.name.en} upazila boundary (${UPAZILA.areaOfficialKm2} km²)`)}</span>
        </div>
        {layers.landuse && landcoverOf(upz.id) && <LandUseList upz={upz} year={year} setYear={setYear} />}
        {layers.places && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[15px] font-semibold text-ink">{T(`ইউনিয়ন ও পৌরসভা — মোট ${num(PLACES.places.filter((p) => p.k === 'village').length, 'bn')}টি গ্রাম`, `Unions and municipalities — ${PLACES.places.filter((p) => p.k === 'village').length} villages in all`)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...PLACES.unions].sort((a, b) => b.villages - a.villages).map((u) => (
                <span key={u.en} className={`rounded-full px-3 py-1 text-[13px] ${u.en === union.meta.en ? 'bg-primary-700 font-semibold text-white' : 'bg-primary-50 text-ink'}`}>{lang === 'bn' ? u.bn : u.en} · {num(u.villages, lang)} {T('গ্রাম', u.villages === 1 ? 'village' : 'villages')}</span>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-muted">{T('মানচিত্র কাছে আনলে (জুম করলে) প্রতিটি গ্রাম, রেলস্টেশন আর বিলের নাম দেখা যাবে। গ্রামের নাম ইংরেজি বানানে, GeoNames থেকে; ইউনিয়নের সীমানা বাংলাদেশ পরিসংখ্যান ব্যুরোর (BBS)।', 'Zoom in to see every village, railway station and beel by name. Village names are GeoNames spellings; union boundaries are from the Bangladesh Bureau of Statistics (BBS).')}</p>
          </div>
        )}
        {hs.length > 0 && <Note tone="warn" className="mt-4"><MapPinned size={14} className="mr-1 inline" />{T(`${hs.map((h) => [...new Set(h.members.map((m) => m.villageBn))].join(' ও ')).join('; ')} গ্রামে একই রকম ${num(hs[0].members.length, 'bn')}টি খবর এসেছে।`, `${hs[0].members.length} similar reports from ${hs.map((h) => [...new Set(h.members.map((m) => m.village))].join(' and ')).join('; ')}.`)}</Note>}
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">{T('ইউনিয়নের নাম আসল, জমির অবস্থান আনুমানিক। ইন্টারনেট না থাকলে মানচিত্রের ছবি আসবে না, তবে বিন্দুগুলো দেখা যাবে।', 'Union names are real; field positions are approximate. Without internet the map tiles will not load, but the dots still show.')} <Tags list={['DEMO']} /></p>
      </Card>
    </div>
  );
}

// The colour key for the land-use layer, as a list: what each colour is, how much of the upazila it covers,
// and how that changed since 2017.
function LandUseList({ upz, year, setYear }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const { data: LANDCOVER, classes: LC_CLASSES } = landcoverOf(upz.id);
  const total = LC_CLASSES.reduce((a, c) => a + c.km2[year], 0);
  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-ink">{T(`${upz.name.bn} উপজেলায় জমির ব্যবহার, ${num(year, 'bn').replace(/,/g, '')}`, `Land use in ${upz.name.en} upazila, ${year}`)}</p>
        <div className="inline-flex rounded-xl border border-border bg-white p-0.5" role="group" aria-label={T('বছর', 'Year')}>
          {LANDCOVER.years.map((y) => (
            <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={year === y}
              className={`h-8 rounded-[10px] px-3 text-[13px] font-semibold tabular transition-colors duration-300 ${year === y ? 'bg-primary-700 text-white' : 'text-ink/70 hover:text-ink'}`}>{lang === 'bn' ? num(y, 'bn').replace(/,/g, '') : y}</button>
          ))}
        </div>
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {LC_CLASSES.map((c) => {
          const km = c.km2[year], pct = (km / total) * 100, diff = c.km2['2025'] - c.km2['2017'];
          return (
            <li key={c.key} className="flex items-center gap-3 text-[14px]">
              <i className="h-4 w-4 shrink-0 rounded-[4px] ring-1 ring-black/10" style={{ background: c.color }} />
              <span className="min-w-0 flex-1 text-ink">{lang === 'bn' ? c.bn : c.en}</span>
              <span className="tabular text-muted">{num(km, lang, { dp: 1 })} {T('বর্গ কিমি', 'km²')}</span>
              <span className="w-12 text-right font-semibold tabular text-ink">{num(pct, lang, { dp: pct < 10 ? 1 : 0 })}%</span>
              {year === 2025 && (
                <span className={`w-16 text-right text-[12.5px] tabular ${Math.abs(diff) < 0.5 ? 'text-muted' : diff > 0 ? 'text-clay-700' : 'text-sky-700'}`} title={T('২০১৭ থেকে বদল', 'Change since 2017')}>
                  {Math.abs(diff) < 0.5 ? '—' : `${diff > 0 ? '+' : '−'}${num(Math.abs(diff), lang, { dp: 1 })}`}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12.5px] text-muted">
        {T('উপগ্রহের (Sentinel-2, ১০ মিটার) বার্ষিক ভূমি-ব্যবহার মানচিত্র থেকে — Esri, Impact Observatory ও Microsoft। এটি দেখায় জমিতে ফসল হচ্ছে কিনা; কোন ফসল, তা দেখায় না — কোন জমিতে কী লাগানো হচ্ছে তা ওপরের রঙিন বিন্দুতে।', 'From the yearly Sentinel-2 (10 m) land-cover map by Esri, Impact Observatory and Microsoft. It shows whether land is farmed, not which crop — the coloured dots above show what is planned on each field.')}
        {year === 2025 && T(' ডান পাশের সংখ্যা ২০১৭ থেকে বদল (বর্গ কিমি)।', ' The right-hand number is the change since 2017 (km²).')}
      </p>
    </div>
  );
}
