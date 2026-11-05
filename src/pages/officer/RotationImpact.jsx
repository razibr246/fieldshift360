// What a change of rotation would do across the whole upazila: the Field Future engine on the upazila's own NASA
// weather and its middle union's soil, the share of registered fields Sentinel-2 saw under Boro last Rabi, and the
// upazila's cropland (the agriculture office's Aman area where published, else the Sentinel-2 land-cover share of
// the BBS area), scaled by how many Boro farmers switch. [REAL in, RULE]
import { useMemo, useState } from 'react';
import { Droplets, Scale, Leaf, Users, Waves } from 'lucide-react';
import { useStore, soilData } from '../../store';
import { Card, Tags, Note } from '../../components/ui';
import { num } from '../../engine/dates';
import deltas from '../../data/climate/cmip6_deltas.json';
import radar from '../../data/radar/aman_radar.json';
import waterSat from '../../data/water/water_sat.json';
import { UPAZILA_FACTS } from '../../data/upazila_facts';
import { UPAZILAS } from '../../data/upazilas';
import { unionsOf } from '../../data/demo';
import { PARCELS } from '../../data/parcels';
import { savedWatch } from '../../data/fieldWatch';
import { readField } from '../../engine/fieldwatch';
import { graceRecord } from '../../engine/soilwater';
import { climateChange, fieldContext, fieldFuture, climateLedger, cropOf } from '../../engine/soilfuture';
import EdibleOilDividend from '../../components/officer/EdibleOilDividend';

// BBS official area, km² (areaOfficialKm2 in src/data/geo/<upazila>_boundary.json, kept here so the maps stay unloaded).
const AREA_KM2 = { godagari: 475.26, dhamrai: 307.41, sitakunda: 483.96, dacope: 991.56, bakerganj: 411.36, gangachara: 269.67, gowainghat: 481.12 };
const radarRow = (id) => Object.values(radar.districts).flatMap((d) => d.upazilas).find((u) => u.id === id);
const median = (a) => { const v = [...a].sort((x, y) => x - y); return v[v.length >> 1]; };

export default function RotationImpact() {
  const { s, T, L, officerClim, econ } = useStore();
  const lang = s.lang;
  const upz = UPAZILAS[s.officerUpazila] ?? UPAZILAS.godagari;
  // The upazila's middle soil: the union with the median organic carbon.
  const soil = useMemo(() => {
    const us = unionsOf(upz.id).map((u) => soilData.unions[u.id]).filter((x) => x?.soc_g_kg != null);
    const m = median(us.map((x) => x.soc_g_kg));
    return us.find((x) => x.soc_g_kg === m) ?? us[0];
  }, [upz.id]);
  // What Sentinel-2 saw last Rabi on the upazila's registered fields.
  const seen = useMemo(() => {
    let n = 0, boro = 0;
    for (const p of PARCELS.filter((x) => x.upazila === upz.id)) {
      const w = savedWatch(p);
      if (!w?.series?.length) continue;
      const top = readField(w).lastRabi?.[0];
      if (!top || top.pattern?.notField) continue;
      n++; if (top.id === 'boro' || top.id === 'mustard_boro') boro++;
    }
    return { n, boro, share: n ? boro / n : null };
  }, [upz.id]);
  const ff = useMemo(() => {
    if (!officerClim || !soil) return null;
    const ctx = fieldContext({ clim: officerClim, change: climateChange(deltas, upz.id), soil, plot: { irrigation: 'stw' }, amanT: null, econ });
    const f = fieldFuture({ ctx, lastCrop: 'boro', plan: null, priorities: [] });
    return { ctx, f, lh: climateLedger(ctx, f.habit.rot, f.habit.now), lb: climateLedger(ctx, f.best.rot, f.best.now) };
  }, [officerClim, soil, upz.id, econ]);
  const facts = UPAZILA_FACTS[upz.id]?.season;
  const officeAman = facts?.items?.find((i) => i.key === 'aman')?.ha ?? null;
  const row = radarRow(upz.id);
  const landCover = row?.croplandShare && AREA_KM2[upz.id] ? Math.round((row.croplandShare * AREA_KM2[upz.id] * 100) / 100) * 100 : null;
  const [areaIn, setArea] = useState(null);
  const area = areaIn ?? officeAman ?? landCover ?? 0;
  const [adopt, setAdopt] = useState(30);
  const [boroIn, setBoro] = useState(null);
  const g = useMemo(() => graceRecord(waterSat, upz.id), [upz.id]);
  if (!ff) return null;
  // Per cent of the cropland under Boro. Too few registered fields have satellite readings to set it (2–4 an upazila),
  // so it starts at an example 50% for the officer to set; the satellite count is shown beside it as a hint.
  const enoughFields = seen.n >= 10;
  const boroShare = boroIn ?? (enoughFields ? Math.round(seen.share * 100) : 50);
  const { f, lh, lb } = ff;
  const ha = area * (boroShare / 100) * (adopt / 100);
  const waterM3 = (f.habit.sNow.waterMm - f.best.sNow.waterMm) * 10 * ha; // 1 mm on a hectare = 10 m³
  const co2 = (lh.net - lb.net) * ha;
  const socT = ((f.best.sNow.socEnd - f.habit.sNow.socEnd) * 44) / 12 * ha;
  const mmOverLand = area ? (waterM3 / (area * 1e4)) * 1000 : 0;
  const name = (rot) => rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year '));
  const big = (x, dp = 0) => num(x, lang, { dp });
  const mil = (x) => (Math.abs(x) >= 1e6 ? `${num(x / 1e6, lang, { dp: 1 })} ${T('মিলিয়ন', 'million')}` : num(x, lang));
  return (
    <Card id="up-rotation" className="mt-6 scroll-mt-40 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="text-[20px] font-bold">{T(`বোরো চাষিরা ফসলচক্র বদলালে পুরো ${L(upz.name)} উপজেলায় কী হয়`, `If Boro farmers changed rotation across ${upz.name.en} upazila`)}</h2>
          <p className="mt-1 text-[14px] leading-6 text-muted">{T(`এখনকার "বোরো → রোপা আমন" বনাম এই উপজেলার মাঝামাঝি মাটিতে সেরা ফসলচক্র: ${name(f.best.rot)}${f.best.rot.residue === 'retain' ? ', খড় জমিতে' : ''}। দশ বছরের হিসাব, উপজেলার নিজের নাসা আবহাওয়ায়।`, `Today's "Boro → T. Aman" against the best rotation on this upazila's middle soil: ${name(f.best.rot)}${f.best.rot.residue === 'retain' ? ', straw kept' : ''}. Ten years, on the upazila's own NASA weather.`)}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-white p-3.5">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold"><Users size={15} className="text-primary-700" />{T('কত ভাগ বোরো চাষি বদলান', 'Share of Boro farmers who switch')}: <b className="tabular">{big(adopt)}%</b></span>
          <input type="range" aria-label={T('কত ভাগ বোরো চাষি বদলান', 'Share of Boro farmers who switch')} min="5" max="100" step="5" value={adopt} onChange={(e) => setAdopt(+e.target.value)} className="mt-2 w-full accent-primary-700" />
          <span className="mt-3 flex items-center gap-1.5 text-[13.5px] font-semibold">{T('ফসলি জমির কত ভাগে বোরো', 'Share of the cropland under Boro')}: <b className="tabular">{big(boroShare)}%</b></span>
          <input type="range" aria-label={T('ফসলি জমির কত ভাগে বোরো', 'Share of the cropland under Boro')} min="5" max="100" step="5" value={boroShare} onChange={(e) => setBoro(+e.target.value)} className="mt-2 w-full accent-primary-700" />
          <span className="text-[12px] leading-5 text-muted">{enoughFields
            ? T(`শুরুর মান উপগ্রহ থেকে: উপজেলার ${num(seen.n, 'bn')}টি নিবন্ধিত জমির ${num(seen.boro, 'bn')}টিতে গত রবিতে বোরো ছিল।`, `Starting value from Sentinel-2: Boro last Rabi on ${seen.boro} of the upazila's ${seen.n} registered fields.`)
            : T(`${boroIn == null ? 'উদাহরণ হিসেবে ৫০% ধরা; ' : ''}আপনার জানা ভাগ বসান। উপগ্রহে নিবন্ধিত ${num(seen.n, 'bn')}টি জমির ${num(seen.boro, 'bn')}টিতে গত রবিতে বোরো ছিল, কিন্তু এত কম জমিতে ভাগ বলা যায় না।`, `${boroIn == null ? 'An example 50% to start; ' : ''}set the share you know. Sentinel-2 saw Boro last Rabi on ${seen.boro} of ${seen.n} registered fields, too few to set a share.`)}</span>
        </label>
        <label className="block rounded-2xl border border-border bg-white p-3.5">
          <span className="text-[13.5px] font-semibold">{T('উপজেলার ফসলি জমি, হেক্টর', 'Upazila cropland, hectares')}</span>
          <input type="number" min="0" step="100" value={Math.round(area)} onChange={(e) => setArea(Math.max(0, +e.target.value || 0))} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-[16px] tabular" />
          <span className="mt-1 block text-[12px] leading-5 text-muted">
            {officeAman ? T(`কৃষি অফিসের ${num(facts.year, 'bn').replace(/,/g, '')}-এর আমনের জমি: ${num(officeAman, 'bn')} হেক্টর (${facts.source.bn})`, `Agriculture office's ${facts.year} Aman area: ${num(officeAman, 'en')} ha (${facts.source.en})`) : null}
            {landCover ? <>{officeAman ? ' · ' : ''}{T(`উপগ্রহের ভূমি-ব্যবহারে আনুমানিক: ${num(landCover, 'bn')} হেক্টর (বিবিএস আয়তনের ${num(row.croplandShare * 100, 'bn')}%)`, `Land-cover estimate: ${num(landCover, 'en')} ha (${num(row.croplandShare * 100, 'en')}% of the BBS area)`)}</> : null}
            {T(' · নিজের জানা সংখ্যা বসাতে পারেন।', ' · You can enter your own figure.')}
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
        <Out icon={Users} label={T('ফসলচক্র বদলায়', 'Hectares that switch')} value={`${big(ha)} ${T('হে.', 'ha')}`} sub={T('বোরো জমির মধ্যে', 'of the Boro land')} />
        <Out icon={Droplets} tone="text-sky-700" label={T('সেচের পানি বাঁচে, বছরে', 'Irrigation saved a year')} value={`${mil(waterM3)} ${T('ঘনমিটার', 'm³')}`} sub={T(`পুরো ফসলি জমিতে প্রায় ${num(mmOverLand, 'bn', { dp: 0 })} মিমি`, `about ${num(mmOverLand, 'en', { dp: 0 })} mm over all the cropland`)} />
        <Out icon={Scale} tone="text-primary-800" label={T('গ্রিনহাউস গ্যাস কমে, বছরে', 'Greenhouse gas cut a year')} value={`${mil(co2)} ${T('টন CO₂e', 't CO₂e')}`} sub={T('মিথেন কমে আর মাটিতে কার্বন জমে', 'less methane, more carbon in the soil')} />
        <Out icon={Leaf} tone="text-primary-800" label={T('মাটিতে বাড়তি কার্বন, ১০ বছরে', 'Extra soil carbon, 10 years')} value={`${mil(socT)} ${T('টন CO₂', 't CO₂')}`} sub={T('এখনকার চাষের তুলনায়', 'against farming as now')} />
      </div>

      <EdibleOilDividend switchedHa={ha} upazilaName={upz.name} />

      {g?.trend && g.trend.perDecade < 0 && (
        <>
          <Note tone="gold" className="mt-4"><span className="inline-flex items-start gap-1.5"><Waves size={16} className="mt-1 shrink-0" />{T(`GRACE উপগ্রহে এ অঞ্চলের মাটির ওপরে-নিচে জমা পানি কমছে দশকে প্রায় ${num(Math.abs(g.trend.perDecade), 'bn', { dp: 1 })} সেমি, অর্থাৎ বছরে প্রায় ${num(Math.abs(g.trend.perDecade), 'bn', { dp: 1 })} মিমি। ${num(adopt, 'bn')}% বোরো চাষি বদলালে সেচে যা বাঁচে, তা উপজেলার ফসলি জমিতে বছরে প্রায় ${num(mmOverLand, 'bn', { dp: 0 })} মিমি। GRACE-এর হিসাব ৩০০ কিমির অঞ্চলের, তাই এটা মোটা দাগের তুলনা, সমান হিসাব নয়।`, `GRACE shows the water stored on and under this region falling about ${num(Math.abs(g.trend.perDecade), 'en', { dp: 1 })} cm a decade, about ${num(Math.abs(g.trend.perDecade), 'en', { dp: 1 })} mm a year. If ${adopt}% of Boro farmers switch, the irrigation saved comes to about ${num(mmOverLand, 'en', { dp: 0 })} mm a year over the upazila's cropland. GRACE covers a 300 km region, so this is a rough comparison, not a balance.`)}</span></Note>

          {/* Aquifer Recovery & Stability Projection Gauge */}
          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-sky-950 flex items-center gap-1.5">
                <Waves size={16} className="text-sky-700" />
                {T('ভূগর্ভস্থ পানির রিচার্জ ও স্থিতিশীলতা প্রক্ষেপণ', 'Regional Aquifer Deficit Recovery Projection')}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                mmOverLand >= Math.abs(g.trend.perDecade)
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {mmOverLand >= Math.abs(g.trend.perDecade)
                  ? T('পতন সম্পূর্ণ রোধ সম্ভব (Stabilized)', 'Deficit Fully Offset')
                  : T(`পতন ${num(Math.round((mmOverLand / Math.abs(g.trend.perDecade)) * 100), lang)}% হ্রাস`, `${Math.round((mmOverLand / Math.abs(g.trend.perDecade)) * 100)}% Deficit Offset`)}
              </span>
            </div>
            <div className="mt-2.5 h-3 w-full rounded-full bg-sky-200/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((mmOverLand / Math.abs(g.trend.perDecade)) * 100))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11.5px] text-sky-900/80">
              <span>{T('বর্তমান পতন: বছরে প্রায় ', 'Current Depletion: ~')}{num(Math.abs(g.trend.perDecade), lang, { dp: 1 })} {T('মিমি', 'mm/yr')}</span>
              <span>{T('সেচ সাশ্রয়: বছরে প্রায় ', 'Adoption Offset: ~')}{num(mmOverLand, lang, { dp: 1 })} {T('মিমি', 'mm/yr')}</span>
            </div>
          </div>
        </>
      )}
      <p className="mt-3 text-[12.5px] leading-5 text-muted">{T(`প্রতি হেক্টরে: সেচ ${num((f.habit.sNow.waterMm - f.best.sNow.waterMm) * 10, 'bn')} ঘনমিটার কম, নিট গ্রিনহাউস গ্যাস ${num(lh.net - lb.net, 'bn', { dp: 2 })} টন CO₂e কম। মাটি: উপজেলার মাঝামাঝি ইউনিয়নের SoilGrids মান; সেচের উৎস অগভীর নলকূপ ধরা। জমি আর চাষির ভাগ বাস্তবে আলাদা হবে; এটা পরিকল্পনার হিসাব।`, `Per hectare: ${num((f.habit.sNow.waterMm - f.best.sNow.waterMm) * 10, 'en')} m³ less irrigation, ${num(lh.net - lb.net, 'en', { dp: 2 })} t CO₂e less net greenhouse gas. Soil: the upazila's middle union's SoilGrids values; irrigation from shallow tube wells assumed. Real land and uptake will differ; this is a planning estimate.`)}</p>
    </Card>
  );
}

function Out({ icon: Icon, label, value, sub, tone = 'text-ink' }) {
  return <div className="rounded-2xl border border-border bg-white p-3.5"><div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted"><Icon size={15} className={tone} />{label}</div><div className={`font-display mt-1 text-[22px] font-bold leading-tight tabular ${tone}`}>{value}</div><div className="text-[12px] text-muted">{sub}</div></div>;
}
