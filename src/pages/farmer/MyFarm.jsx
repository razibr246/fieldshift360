import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Layers, Sprout, Plus, X, Satellite, Clock, MapPinned, ArrowRight } from 'lucide-react';
import { useStore, demo } from '../../store';
import { Card, Button, Badge, Tags, soilTag } from '../../components/ui';
import Photo from '../../components/Photo';
import LandPicker from '../../components/map/LandPicker';
import FieldsMap, { LEVEL_LOOK } from '../../components/fields/FieldsMap';
import FieldSatellite from '../../components/fields/FieldSatellite';
import FieldRisks from '../../components/fields/FieldRisks';
import FieldRiskMap from '../../components/fields/FieldRiskMap';
import LandsatThen from '../../components/fields/LandsatThen';
import SoilTestCard from '../../components/fields/SoilTestCard';
import { seriesNow } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { num, fmtDate, fmtBangla, todayDhaka } from '../../engine/dates';
import { TEXTURE } from '../../engine/soil';


export default function MyFarm() {
  const { s, dispatch, T, L, toast, union, soil, chosen, confirmedPlan, landConfirmed, myParcels, activeParcel, upazila } = useStore();
  const lang = s.lang;
  const [selectedId, setSelectedId] = useState(activeParcel?.id ?? null);
  const [focusAll, setFocusAll] = useState(true); // the map opens on every field at once
  const [editing, setEditing] = useState(null); // null | 'edit' | 'add'
  const [live, setLive] = useState({}); // parcelId -> reading from the open satellite card (may include new passes)
  const editRef = useRef(null);
  const selected = myParcels.find((p) => p.id === selectedId) ?? activeParcel ?? myParcels[0];
  const selIndex = myParcels.indexOf(selected);

  // What every field looks like from space right now (saved readings and anything already fetched here).
  const readings = useMemo(() => Object.fromEntries(myParcels.map((p) => {
    const series = seriesNow(p);
    return [p.id, series.length ? readField({ series }, { today: todayDhaka() }) : null];
  })), [myParcels]);
  const readingOf = (id) => live[id] ?? readings[id];
  const levels = Object.fromEntries(myParcels.map((p) => [p.id, readingOf(p.id)?.level ?? 'none']));
  const totalDec = myParcels.reduce((a, p) => a + p.area_dec, 0);
  const unionsCount = new Set(myParcels.map((p) => p.union)).size;
  const needLook = myParcels.filter((p) => levels[p.id] === 'warn' || levels[p.id] === 'watch').length;

  const pick = (id) => { setSelectedId(id); setFocusAll(false); setEditing(null); };
  const openEditor = (mode) => { setEditing(mode); setTimeout(() => editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  const planThis = () => { dispatch({ type: 'useParcel', id: s.farmerId, parcel: selected }); toast(`এখন থেকে "${selected.name.bn}"-এর পরিকল্পনা`, `Now planning "${selected.name.en}"`); };

  return (
    <div className="space-y-6">
      <section data-tour="farm-hero" className="my-farm-hero relative isolate overflow-hidden rounded-[26px] border border-white/20 bg-primary-950 text-white">
        <div className="my-farm-hero-backdrop absolute inset-0 -z-10">
          <Photo name="landParcels" fill sizes="(min-width: 1200px) 1200px, 100vw" priority decorative className="my-farm-hero-photo" />
          <div className="my-farm-hero-scrim absolute inset-0" />
          <div className="my-farm-hero-orb my-farm-hero-orb-one absolute -right-20 -top-32 h-80 w-80 rounded-full" aria-hidden="true" />
          <div className="my-farm-hero-orb my-farm-hero-orb-two absolute -bottom-48 right-1/4 h-72 w-72 rounded-full" aria-hidden="true" />
        </div>
        <div className={`my-farm-hero-content relative grid gap-6 p-5 sm:p-8 ${myParcels.length ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)] lg:items-center' : ''}`}>
          <div className="max-w-2xl">
          <p className="my-farm-eyebrow inline-flex items-center gap-2 text-[14px] font-semibold text-white/90">
            <MapPinned size={15} aria-hidden="true" />{T('আমার জমি', 'My fields')}
          </p>
          <h1 className="mt-2 text-[30px] font-bold leading-tight sm:text-[38px]">{myParcels.length > 1 ? T('আপনার সব জমি, এক মানচিত্রে', 'All your fields on one map') : T('মানচিত্রে আপনার জমি', 'Your field on the map')}</h1>
          <p className="mt-3 max-w-xl text-[15.5px] leading-7 text-white/90">{myParcels.length
            ? T(`${upazila.name.bn} উপজেলা কৃষি অফিসে আপনার নামে ${num(myParcels.length, 'bn')}টি জমি আছে, মোট ${num(totalDec / 33, 'bn', { dp: 1 })} বিঘা, ${num(unionsCount, 'bn')}টি ইউনিয়নে। প্রতিটি জমির এখনকার অবস্থা উপগ্রহের ছবি থেকে দেখুন।`, `The ${upazila.name.en} upazila agriculture office has ${myParcels.length} fields in your name, ${num(totalDec / 33, 'en', { dp: 1 })} bigha in ${unionsCount} union${unionsCount > 1 ? 's' : ''}. See how each one looks now from satellite pictures.`)
            : T('গ্রামের নাম লিখে খুঁজুন, উপগ্রহের ছবিতে নিজের জমি চিনে পিন বসান, তারপর মাপ আর সেচের উৎস দিয়ে নিশ্চিত করুন।', 'Search your village, find your field on the satellite picture and drop the pin, then add the size and water source and confirm.')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {landConfirmed ? <Badge tone="dark" className="!border-white/30 !bg-white/15"><CheckCircle2 size={13} />{T('অফিসে নিবন্ধিত', 'Registered with the office')}</Badge> : <Badge tone="amber">{T('জমি এখনো নিশ্চিত হয়নি', 'Field not confirmed yet')}</Badge>}
            {needLook > 0 && <Badge tone="amber">{T(`${num(needLook, 'bn')}টি জমিতে নজর দরকার`, `${needLook} field${needLook > 1 ? 's' : ''} to look at`)}</Badge>}
            <Tags list={['REAL', 'AI', 'DEMO']} />
          </div>
          </div>
          {myParcels.length > 0 && (
            <aside className="my-farm-summary rounded-[22px] p-4 sm:p-5" aria-label={T('আপনার জমির সারাংশ', 'Your field summary')}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 text-paddy-300 ring-1 ring-white/15"><Sprout size={19} aria-hidden="true" /></span>
                  <div>
                    <h2 className="text-[15px] font-bold">{T('জমির এক নজরে', 'Field overview')}</h2>
                    <p className="text-[12px] text-white/70">{T('আপনার নিবন্ধিত জমি', 'Your registered fields')}</p>
                  </div>
                </div>
                <Satellite size={18} className="text-white/70" aria-hidden="true" />
              </div>
              <dl className="grid grid-cols-2 gap-2">
                <div className="my-farm-summary-stat">
                  <dt>{T('জমি', 'Fields')}</dt>
                  <dd>{num(myParcels.length, lang)}</dd>
                </div>
                <div className="my-farm-summary-stat">
                  <dt>{T('মোট আয়তন', 'Total area')}</dt>
                  <dd>{num(totalDec / 33, lang, { dp: 1 })}<span>{T(' বিঘা', ' bigha')}</span></dd>
                </div>
                <div className="my-farm-summary-stat">
                  <dt>{T('ইউনিয়ন', 'Unions')}</dt>
                  <dd>{num(unionsCount, lang)}</dd>
                </div>
                <div className={`my-farm-summary-stat ${needLook ? 'is-attention' : ''}`}>
                  <dt>{T('খেয়াল দরকার', 'Needs attention')}</dt>
                  <dd>{num(needLook, lang)}</dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      </section>

      {myParcels.length > 0 ? (
        <>
          <Card className="p-4 sm:p-5" data-tour="farm-map">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <FieldsMap parcels={myParcels} levels={levels} selectedId={selected?.id} focusAll={focusAll} onSelect={pick} onShowAll={() => setFocusAll(true)} height={440} upazila={upazila.id} />
              <div className="my-farm-field-list flex min-w-0 flex-col">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[18px] font-bold">{T(`আমার ${num(myParcels.length, 'bn')}টি জমি`, `My ${myParcels.length} fields`)}</h2>
                    <p className="mt-0.5 text-[12.5px] text-muted">{T('মানচিত্রে দেখতে একটি জমি বেছে নিন', 'Choose a field to locate it on the map')}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[12px] font-semibold text-primary-800 ring-1 ring-primary-100">{T(`মোট ${num(totalDec, 'bn')} শতক`, `${totalDec} decimals`)}</span>
                </div>
                <ul className="my-farm-field-options space-y-2" aria-label={T('নিবন্ধিত জমির তালিকা', 'Registered fields')}>
                  {myParcels.map((p, i) => {
                    const r = readingOf(p.id), look = LEVEL_LOOK[levels[p.id]], on = p.id === selected?.id;
                    return (
                      <li key={p.id}>
                        <button type="button" onClick={() => pick(p.id)} aria-pressed={on}
                          className={`my-farm-field-option flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${on ? 'is-selected border-primary-400 bg-primary-50' : 'border-border bg-white hover:border-primary-300 hover:bg-primary-50/50'}`}>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: look.color }}>{num(i + 1, lang)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-[15px] font-bold">{L(p.name)}</span>
                              {p.id === activeParcel?.id && <Sprout size={14} className="text-sky-700" aria-label={T('পরিকল্পনার জমি', 'Field being planned')} />}
                              {p.pending && <Clock size={13} className="text-amber-700" aria-label={T('অফিসের যাচাই বাকি', 'Office check pending')} />}
                            </span>
                            <span className="block truncate text-[13px] text-muted">{L(demo.unions.find((u) => u.id === p.union)?.full)} · {T(`${num(p.area_dec / 33, 'bn', { dp: 1 })} বিঘা`, `${num(p.area_dec / 33, 'en', { dp: 1 })} bigha`)}{r?.top ? ` · ${L(r.top.pattern.name)}` : ''}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold" style={{ color: look.color }}><look.icon size={14} /><span className="hidden sm:inline">{L(look)}</span></span>
                          {on && <ArrowRight size={16} className="my-farm-field-arrow shrink-0 text-primary-700" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <Button variant="secondary" onClick={() => openEditor('add')} className="mt-3" data-tour="farm-add"><Plus size={16} />{T('আরেকটি জমি যোগ করুন', 'Add another field')}</Button>
                <p className="mt-2 flex gap-1.5 text-[12.5px] leading-5 text-muted"><Satellite size={14} className="mt-0.5 shrink-0" />{T('জমির অবস্থান উপজেলা কৃষি অফিস দিয়েছে। কোনোটা ভুল হলে নিজে ঠিক করে দিন, অফিস যাচাই করবে।', 'The upazila agriculture office entered where each field is. If one is wrong, correct it and the office will check.')}</p>
              </div>
            </div>
          </Card>

          {selected && editing !== 'add' && (
            <div data-tour="farm-sat"><FieldSatellite key={selected.id} parcel={selected} index={selIndex} active={selected.id === activeParcel?.id}
              onPlan={planThis} onEdit={() => openEditor('edit')} onReading={(id, r) => setLive((x) => (x[id] === r ? x : { ...x, [id]: r }))} /></div>
          )}
          {selected && editing !== 'add' && <FieldRisks parcel={selected} />}
          {selected && editing !== 'add' && <LandsatThen parcel={selected} />}
          {editing !== 'add' && <FieldRiskMap upazilaId={upazila.id} highlight={selected?.id} />}
        </>
      ) : null}

      {(editing || myParcels.length === 0) && (
        <div ref={editRef} className="scroll-mt-24" data-tour="farm-picker">
          <Card className="p-4 sm:p-5">
            {editing && (
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-[19px] font-bold">{editing === 'add' ? T('নতুন জমি যোগ করুন', 'Add a field') : T(`"${selected.name.bn}"-এর অবস্থান ঠিক করুন`, `Correct where "${selected.name.en}" is`)}</h2>
                <Button variant="ghost" onClick={() => setEditing(null)} className="!px-2"><X size={18} />{T('বন্ধ', 'Close')}</Button>
              </div>
            )}
            <LandPicker height={460} mode={editing === 'add' ? 'add' : 'edit'} parcel={editing === 'edit' ? selected : undefined} onDone={() => setEditing(null)} />
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2" data-tour="farm-cards">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[20px] font-bold"><Sprout size={19} className="text-primary-600" />{T('এই মৌসুমের পরিকল্পনা', 'This season’s plan')}</h2>{confirmedPlan ? <Badge><CheckCircle2 size={13} />{T('পাকা', 'Confirmed')}</Badge> : <Badge tone="amber">{T('পাকা হয়নি', 'Not confirmed')}</Badge>}</div>
          {activeParcel && <p className="mt-1 text-[14px] text-muted">{T(`জমি: ${activeParcel.name.bn}`, `Field: ${activeParcel.name.en}`)}</p>}
          <dl className="mt-4 divide-y divide-border text-[15px]">
            {[[T('ফসল', 'Crop'), L(chosen.crop.name)], [T('লাগানো', 'Planting'), `${fmtDate(chosen.t0, lang)} (${fmtBangla(chosen.t0, lang)})`], [T('ফসল তোলা', 'Harvest'), `${fmtDate(chosen.hw.start, lang)} – ${fmtDate(chosen.hw.end, lang)}`], [T('নম্বর', 'Score'), num(chosen.score, lang)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
            ))}
          </dl>
          <Button to="/farmer/plan" onClick={() => dispatch({ type: 'set', patch: { step: confirmedPlan ? 4 : 1 } })} className="mt-4 w-full">{confirmedPlan ? T('পরিকল্পনা দেখুন', 'Review the plan') : T('মৌসুমের পরিকল্পনা করুন', 'Plan the season')}</Button>
        </Card>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[20px] font-bold"><Layers size={19} className="text-clay-500" />{soil.scope === 'field' ? T('এই জমির মাটি', 'This field’s soil') : T(`${union.meta.full.bnOf} মাটি`, `Soil in ${union.meta.en}`)}</h2><Tags list={[soilTag()]} /></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center" data-stagger>
            <div className="rounded-xl bg-clay-50 p-3"><div className="text-[12.5px] text-clay-700">pH</div><div className="font-display text-[20px] font-bold tabular">{num(soil.ph, lang, { dp: 1 })}</div></div>
            <div className="rounded-xl bg-clay-50 p-3"><div className="text-[12.5px] text-clay-700">{T('জৈব পদার্থ', 'Organic matter')}</div><div className="font-display text-[20px] font-bold tabular">{num(soil.om_pct, lang, { dp: 1 })}%</div></div>
            <div className="rounded-xl bg-clay-50 p-3"><div className="text-[12.5px] text-clay-700">{T('পানি নামে', 'Drainage')}</div><div className="text-[15px] font-bold">{{ poor: T('ধীরে', 'Slowly'), imperfect: T('মাঝারি', 'Fair'), good: T('দ্রুত', 'Quickly') }[soil.drainage] ?? '–'}</div></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
            {soil.texture && <span className="chip bg-black/5 text-ink/75">{T('বুনট', 'Texture')}: {L(TEXTURE[soil.texture] ?? { bn: soil.texture, en: soil.texture })}</span>}
            {soil.wrb?.[0] && <span className="chip bg-black/5 text-ink/75">{soil.wrb[0].name}</span>}
            {soil.physiography?.[0] && <span className="chip bg-black/5 text-ink/75">SRDI: {soil.physiography[0]}</span>}
          </div>
          <p className="mt-3 text-[13.5px] text-muted">{soil.tested ? T('pH আর জৈব পদার্থ আপনার মাটি পরীক্ষার; বাকিটা ISRIC SoilGrids-এর আনুমানিক হিসাব।', 'pH and organic matter are from your soil test; the rest is the ISRIC SoilGrids estimate.') : (soil.scope === 'field' ? T('আপনার জমির ২৫০ মিটারের ঘরের হিসাব (ISRIC SoilGrids), মাঠের মাটি পরীক্ষা নয়।', 'For your field’s 250 m cell (ISRIC SoilGrids), not a field soil test.') : T('ইউনিয়নের মাঝখানের হিসাব (ISRIC SoilGrids), মাঠের মাটি পরীক্ষা নয়।', 'For the union centre (ISRIC SoilGrids), not a field soil test.'))}</p>
          <SoilTestCard />
          <Button to="/farmer/plan" variant="secondary" onClick={() => dispatch({ type: 'set', patch: { step: 2 } })} className="mt-3 w-full">{T('মাটি আর সারের পুরো হিসাব', 'Full soil and fertiliser advice')}</Button>
        </Card>
      </div>
    </div>
  );
}
