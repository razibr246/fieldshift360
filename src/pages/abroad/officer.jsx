// The local agriculture officer's tabs in a neighbouring country, laid out like the Bangladesh upazila officer's:
// Overview (the office, the area map and today's picture), Area alerts (each with an SMS in the farmers' own
// language), Farmer requests, Farmer and field, and Whole country (six farming zones on a NASA satellite map).
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Rectangle, Polygon, Tooltip as LTooltip, useMap } from 'react-leaflet';
import StopOnLeave from '../../components/map/StopOnLeave';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Info, Map as MapIcon, Flame, Megaphone, BellRing, LifeBuoy, Satellite, Send, CheckCircle2, CloudRain, Thermometer, Sun, Globe2, ArrowRight, Phone, UserRound } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { zoneFlags, zoneLevel, zoneAdvice, FLAG_TEXT, countryFires, todaysCall, SMS_LANG_NAME, SMS_DRAFT } from '../../engine/abroad';
import { READ_ON, areaIn } from '../../data/abroad';
import { plotSquare } from '../../engine/world';
import { useAbroad } from '../../layouts/AbroadLayout';
import { SmsMeter } from '../../components/ui';
import FarmerAvatar from '../../components/brand/FarmerAvatar';
import { Section, SourceTag, Stat, Sources, FiresPanel, FieldPanel, SeasonCharts, fullDate, baseText, BoardChip } from './parts';
import { Plan } from './farmer';

const LEVEL = {
  high: { bn: 'সতর্ক', en: 'Alert', fill: '#c2562b', chip: 'bg-clay-500 text-white' },
  watch: { bn: 'নজরে', en: 'Watch', fill: '#d08f26', chip: 'bg-paddy-100 text-paddy-700 ring-1 ring-paddy-300' },
  info: { bn: 'জানিয়ে রাখুন', en: 'Advise', fill: '#237479', chip: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200' },
  ok: { bn: 'স্বাভাবিক', en: 'Normal', fill: '#43863a', chip: 'bg-primary-50 text-primary-800 ring-1 ring-primary-200' },
};
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const GIBS = (d) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// The page eases in with a transform, so Leaflet can measure the box before it settles: measure again, then fit.
function Settle({ bounds }) {
  const map = useMap();
  useEffect(() => {
    const go = () => { map.invalidateSize(); map.fitBounds(bounds, { padding: [12, 12] }); };
    const t = [setTimeout(go, 120), setTimeout(go, 700)];
    return () => t.forEach(clearTimeout);
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// The officer's own area (like an upazila): its outline, its villages (GeoNames), this week's fires inside it and the
// sample field. `full` adds every village dot and lets the map scroll-zoom.
function AreaMapBox({ height = 380, full = false, focus = null }) {
  const { L } = useStore();
  const { c, data } = useAbroad();
  const a = data.area, field = data.field;
  const lat0 = field.lat, lon0 = field.lon;
  const ring = a?.ring;
  const bounds = ring ? [[Math.min(...ring.map((p) => p[0])), Math.min(...ring.map((p) => p[1]))], [Math.max(...ring.map((p) => p[0])), Math.max(...ring.map((p) => p[1]))]]
    : [[lat0 - 0.3, lon0 - 0.3], [lat0 + 0.3, lon0 + 0.3]];
  const sq = plotSquare(field.lat, field.lon, field.area_dec);
  const fires = a ? a.fires.points : data.points.farm.fires.points;
  const places = a ? (full ? a.places : a.places.filter((p) => p.town || p.pop > 0).slice(0, 30)) : [];
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/5" style={{ height }}>
      <MapContainer bounds={bounds} scrollWheelZoom={full} zoomSnap={0.25} zoomDelta={0.5} className="fs-frac h-full w-full">
        <StopOnLeave />
        <Settle bounds={focus ? [[focus.lat - 0.03, focus.lon - 0.03], [focus.lat + 0.03, focus.lon + 0.03]] : bounds} key={focus ? `${focus.lat},${focus.lon}` : 'all'} />
        <TileLayer url={ESRI} maxNativeZoom={18} attribution="Imagery © Esri, Maxar, Earthstar Geographics · geoBoundaries · GeoNames" />
        {ring && <Polygon positions={ring} pathOptions={{ color: '#edc067', weight: 3, fillColor: '#edc067', fillOpacity: 0.06, dashArray: '6 5' }} />}
        {places.map((p) => (
          <CircleMarker key={`${p.n}${p.lat}`} center={[p.lat, p.lon]} radius={p.town ? 4.5 : 3} pathOptions={{ color: '#13261b', weight: 1, fillColor: '#fff', fillOpacity: 0.95 }}>
            <LTooltip direction="top" offset={[0, -4]} permanent={p.town || (focus && focus.n === p.n)} className="fs-place">{p.n}</LTooltip>
          </CircleMarker>
        ))}
        {fires.map(([la, lo], i) => <CircleMarker key={`f${i}`} center={[la, lo]} radius={4} pathOptions={{ color: '#fff', weight: 1, fillColor: '#ff5a1f', fillOpacity: 0.95 }} />)}
        <Rectangle bounds={[[Math.min(...sq.map((p) => p[0])), Math.min(...sq.map((p) => p[1]))], [Math.max(...sq.map((p) => p[0])), Math.max(...sq.map((p) => p[1]))]]} pathOptions={{ color: '#edc067', weight: 3 }} />
        <CircleMarker center={[field.lat, field.lon]} radius={7} pathOptions={{ color: '#fff', weight: 2.5, fillColor: '#edc067', fillOpacity: 1 }}>
          <LTooltip direction="top" offset={[0, -8]} permanent>{L(c.farmer.name)}</LTooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

function OfficeCard({ national = false }) {
  const { T, L } = useStore();
  const { c } = useAbroad();
  const o = c.local;
  const head = c.officer.head;
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-primary-950 p-5 text-white shadow-[var(--shadow-lift)] sm:p-7">
      <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(120% 90% at 100% 0%, ${c.tone}cc 0%, transparent 55%)` }} />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_340px] lg:items-end">
        <div className="scene-in">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white/75"><span className="text-[20px]" aria-hidden="true">{c.flag}</span>{national ? T(`সারা দেশ · ${c.name.bn}`, `Whole country · ${c.name.en}`) : T(`স্থানীয় কৃষি দপ্তর · ${c.name.bn}`, `Local agriculture office · ${c.name.en}`)}</div>
          <h1 className="mt-2 font-display text-[28px] font-bold leading-[1.15] tracking-tight sm:text-[34px]">{national ? L(c.officer.office).split(' (')[0] : L(o.role)}</h1>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-6 text-white/75">{national ? L(c.officer.city) : L(o.office)}</p>
          {!national && <p className="mt-1 text-[13px] text-white/60">{T(`এলাকা: ${o.area.bn}`, `Area: ${o.area.en}`)}{o.phone && <> · <Phone size={12} className="inline" /> {o.phone}</>}</p>}
        </div>
        <div className="glass lite rounded-[22px] p-4 text-ink">
          {national ? (head ? (
            <>
              <div className="text-[12px] font-semibold text-muted">{T('জাতীয় দপ্তরের প্রধান', 'Head of the national department')}</div>
              <div className="mt-1 text-[17px] font-bold leading-tight">{L(head.name)}</div>
              <div className="mt-0.5 text-[12.5px] leading-4 text-muted">{L(head.role)}</div>
              <a href={head.source.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 hover:underline">{T('উৎস', 'Source')}: {head.source.label}<ExternalLink size={11} /></a>
              <div className="mt-0.5 text-[11.5px] text-muted">{T(`পড়া হয়েছে ${fullDate(READ_ON, 'bn')}`, `Read ${fullDate(READ_ON, 'en')}`)}</div>
            </>
          ) : <div className="flex gap-2.5 text-[13px] leading-5 text-muted"><Info size={17} className="mt-0.5 shrink-0" />{L(c.officer.noHead)}</div>) : (
            <>
              <div className="flex gap-2.5 text-[13px] leading-5 text-muted"><Info size={17} className="mt-0.5 shrink-0" />{L(o.noName)}</div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {o.source && <a href={o.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 hover:underline">{o.source.label}<ExternalLink size={11} /></a>}
                {o.noNameSrc && <a href={o.noNameSrc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 hover:underline">{o.noNameSrc.label}<ExternalLink size={11} /></a>}
              </div>
              {head && <div className="mt-2.5 border-t border-border/70 pt-2 text-[12px] leading-4 text-muted">{T(`জাতীয় প্রধান: ${head.name.bn}, ${c.officer.office.bn.split(',')[0]}`, `National head: ${head.name.en}, ${c.officer.office.en.split(',')[0]}`)}</div>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- Overview ----
export function Overview() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data, fc, now, alerts, req } = useAbroad();
  const farm = data.points.farm;
  const field = data.field;
  const green = field.series.length ? Math.round(field.series[field.series.length - 1].ndvi * 100) : null;
  const call = todaysCall(c.id, data, fc, now.date);
  const open = req.list.filter((r) => !r.reply).length;
  return (
    <div className="page-shell space-y-5">
      <OfficeCard />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-reveal-children>
        <Stat label={T('এলাকার সতর্কতা', 'Area alerts')} value={num(alerts.filter((a) => a.level !== 'info').length, lang)} sub={T(`${num(alerts.length, lang)}টি বার্তা তৈরি`, `${alerts.length} messages ready`)} tone={alerts.some((a) => a.level === 'high') ? 'hot' : 'ink'} />
        <Stat label={T('খোলা অনুরোধ', 'Open requests')} value={num(open, lang)} sub={T('কৃষকের কাছ থেকে', 'from farmers')} />
        <Stat label={T('নমুনা জমির সবুজ', 'Sample field green')} value={green == null ? '—' : num(green, lang)} sub={T('সেন্টিনেল-২, NDVI×১০০', 'Sentinel-2, NDVI×100')} tone="ok" />
        {data.area ? <Stat label={T('এলাকায় আগুন (৭ দিন)', 'Fires in the area (7 days)')} value={num(data.area.fires.n, lang)} sub={T(`${num(data.area.areaKm2, lang)} বর্গ কিমি, ${num(data.area.placeCount, lang)}টি গ্রাম`, `${data.area.areaKm2} km², ${data.area.placeCount} villages`)} tone={data.area.fires.n >= 15 ? 'hot' : 'ink'} />
          : <Stat label={T('৫০ কিমিতে আগুন (৭ দিন)', 'Fires within 50 km (7 days)')} value={num(farm.fires.km50, lang)} sub="NASA FIRMS" tone={farm.fires.km50 >= 15 ? 'hot' : 'ink'} />}
      </div>
      <Section icon={MapIcon} title={T(`আমার এলাকা: ${c.local.area.bn}`, `My area: ${c.local.area.en}`)} sub={T('এলাকার সীমা (হলুদ ড্যাশ), গ্রাম, নমুনা জমি আর এ সপ্তাহের আগুন (কমলা)', 'The area outline (yellow dashes), villages, the sample field and this week’s fires (orange)')} tag={<SourceTag>geoBoundaries · NASA FIRMS</SourceTag>}>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <AreaMapBox height={380} />
          <div className="space-y-2.5">
            <div className="rounded-2xl bg-white/75 p-4 ring-1 ring-white/80">
              <div className="text-[12.5px] font-semibold text-muted">{T('নমুনা কৃষকের আজকের সিদ্ধান্ত', 'The sample farmer’s call today')}</div>
              <div className="mt-1 text-[15.5px] font-bold leading-snug">{L({ bn: bnDigits(call.title.bn), en: call.title.en })}</div>
              <Link to={`/abroad/${c.id}/officer/farmer`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary-700">{T('কৃষক ও জমি দেখুন', 'Open farmer and field')}<ArrowRight size={14} /></Link>
            </div>
            {alerts.slice(0, 3).map((a) => (
              <Link key={a.key} to={`/abroad/${c.id}/officer/alerts`} className="lift flex items-start gap-3 rounded-2xl bg-white/75 p-3.5 ring-1 ring-white/80">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LEVEL[a.level].fill }} />
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-5">{L({ bn: bnDigits(a.title.bn), en: a.title.en })}</span>
                <span className={`chip ${LEVEL[a.level].chip}`}>{L(LEVEL[a.level])}</span>
              </Link>
            ))}
            {alerts.length === 0 && <p className="rounded-2xl bg-white/60 p-4 text-[14px] text-muted">{T('এই মুহূর্তে এলাকায় কোনো সতর্কতা নেই।', 'No alerts for the area right now.')}</p>}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---- Area map (the officer's whole area, village by village) ----
export function AreaMap() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data } = useAbroad();
  const a = data.area;
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(null);
  const list = a ? a.places.filter((p) => !q || p.n.toLowerCase().includes(q.toLowerCase())) : [];
  return (
    <div className="page-shell space-y-5">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-reveal-children>
        <Stat label={T('এলাকা', 'Area')} value={a ? `${num(a.areaKm2, lang)} ${T('বর্গ কিমি', 'km²')}` : '—'} sub={L(c.local.level ?? c.local.area)} />
        <Stat label={T('গ্রাম ও বসতি', 'Villages and settlements')} value={a ? num(a.placeCount, lang) : '—'} sub="GeoNames" />
        <Stat label={T('এলাকায় আগুন (৭ দিন)', 'Fires in the area (7 days)')} value={a ? num(a.fires.n, lang) : '—'} sub="NASA FIRMS VIIRS" tone={a?.fires.n >= 15 ? 'hot' : 'ink'} />
        <Stat label={T('নমুনা জমি', 'Sample field')} value={`${num(areaIn(c, data.field.area_dec), lang, { dp: 1 })} ${c.unit.bn.split(' ')[0]}`} sub={T(`${c.farmer.name.bn}, ${c.farmer.village.bn}`, `${c.farmer.name.en}, ${c.farmer.village.en}`)} />
      </div>
      <Section icon={MapIcon} title={T(`এলাকার মানচিত্র: ${c.local.area.bn}`, `Area map: ${c.local.area.en}`)} sub={a ? (a.level.startsWith('OCHA') ? T(`সীমা: জাতিসংঘ OCHA-র প্রশাসনিক সীমা (দেশের পরিসংখ্যান দপ্তরের তথ্য, HDX), “${a.name}”`, `Outline: UN OCHA administrative boundaries (from the national statistics office, on HDX), “${a.name}”`) : T(`সীমা: geoBoundaries (${a.level}, “${a.name}”) — প্রশাসনিক সীমার খোলা তথ্য; সরকারি মানচিত্রের সঙ্গে সামান্য তফাত থাকতে পারে`, `Outline: geoBoundaries (${a.level}, “${a.name}”) — open boundary data; it can differ slightly from official maps`)) : T('এই এলাকার সীমা খোলা তথ্যে পাওয়া যায়নি', 'No open boundary was found for this area')} tag={<SourceTag>{a?.level.startsWith('OCHA') ? 'UN OCHA' : 'geoBoundaries'} · GeoNames</SourceTag>}>
        {c.local.areaNote && <p className="-mt-1 mb-3 rounded-xl bg-paddy-50 px-3 py-2 text-[13px] leading-5 text-paddy-700 ring-1 ring-paddy-100">{L(c.local.areaNote)}</p>}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <AreaMapBox height="min(560px, 62vh)" full focus={focus} />
          <div className="flex min-h-0 flex-col">
            <input type="search" aria-label={T('গ্রামের নাম খুঁজুন', 'Find a village')} value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('গ্রামের নাম খুঁজুন', 'Find a village')} className="h-11 rounded-full border border-border bg-white px-4 text-[14.5px] outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            <ul className="mt-2 max-h-[500px] space-y-1 overflow-y-auto pr-1">
              {list.slice(0, 120).map((p) => (
                <li key={`${p.n}${p.lat}`}>
                  <button type="button" onClick={() => setFocus(p)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition hover:bg-white ${focus === p ? 'bg-white font-semibold ring-1 ring-border' : ''}`}>
                    <span>{p.n}</span>{p.town && <span className="chip bg-paddy-50 text-paddy-700">{T('শহর', 'Town')}</span>}
                  </button>
                </li>
              ))}
              {a && list.length === 0 && <li className="px-3 py-2 text-[13.5px] text-muted">{T('এই নামে কোনো গ্রাম নেই', 'No village by that name')}</li>}
            </ul>
            <p className="mt-2 text-[12px] text-muted">{T('গ্রামের নাম GeoNames-এর রোমান বানানে।', 'Village names as GeoNames spells them, in Roman letters.')}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---- Planting calendar for the area: the same season plan the farmer sees ----
export const Planting = Plan;

// ---- Area alerts, each with an SMS ----
export function Alerts() {
  const { s, T, L } = useStore();
  const { c, alerts, notices } = useAbroad();
  return (
    <div className="page-shell space-y-5">
      <Section icon={BellRing} title={T('এলাকার সতর্কতা', 'Area alerts')} sub={T(`লাইভ পূর্বাভাস, গত ৩০ দিন আর উপগ্রহের আগুন থেকে — প্রতিটির সঙ্গে কৃষকের ভাষায় (${SMS_LANG_NAME[c.local.sms].bn}) এসএমএস`, `From the live forecast, the last 30 days and satellite fires — each with an SMS in the farmers’ language (${SMS_LANG_NAME[c.local.sms].en})`)} tag={<SourceTag>{T('লাইভ', 'Live')}</SourceTag>}>
        {alerts.length === 0 ? <p className="text-[14.5px] text-muted">{T('এই মুহূর্তে কোনো সতর্কতা নেই। পূর্বাভাস বদলালে এখানে আসবে।', 'No alerts right now. They appear here when the forecast changes.')}</p> : (
          <div className="grid gap-3 lg:grid-cols-2" data-reveal-children>{alerts.map((a) => <AlertCard key={a.key} a={a} lang={c.local.sms} onSend={(t) => notices.send(a.key, t)} sent={notices.list.some((n) => n.key === a.key && n.t.slice(0, 10) === new Date().toISOString().slice(0, 10))} />)}</div>
        )}
        {SMS_DRAFT.has(c.local.sms) && <p className="mt-3 rounded-xl bg-paddy-50 px-3 py-2 text-[12.5px] leading-5 text-paddy-700 ring-1 ring-paddy-100">{T(`${SMS_LANG_NAME[c.local.sms].bn} বার্তাগুলো যন্ত্রে লেখা খসড়া — পাঠানোর আগে স্থানীয় কাউকে দিয়ে মিলিয়ে নিন, অথবা ইংরেজিটা পাঠান।`, `The ${SMS_LANG_NAME[c.local.sms].en} messages are machine-drafted — have a local speaker check them before sending, or send the English one.`)}</p>}
      </Section>
      {notices.list.length > 0 && (
        <Section icon={Send} title={T('পাঠানো বার্তা', 'Sent messages')} sub={T('কৃষকের হোম পাতায় দেখা যায়', 'Shown on the farmer’s home page')}>
          <ul className="space-y-2">{notices.list.map((n) => <li key={n.id} className="rounded-2xl bg-white/70 p-3 text-[14px] leading-6 ring-1 ring-white/80"><span className="mr-2 text-[12px] font-semibold text-muted">{fullDate(n.t.slice(0, 10), s.lang)}</span><span dir="auto">{n.text}</span></li>)}</ul>
        </Section>
      )}
    </div>
  );
}

function AlertCard({ a, lang, onSend, sent }) {
  const { T, L } = useStore();
  const [which, setWhich] = useState('local');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const source = which === 'local' ? a.sms : a.smsEn;
  const [text, setText] = useState(source ?? '');
  useEffect(() => setText(source ?? ''), [source]);
  const two = lang !== 'en' && a.smsEn && a.smsEn !== a.sms;
  return (
    <article className="rounded-2xl bg-white/75 p-4 ring-1 ring-white/80">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15.5px] font-bold leading-snug">{L({ bn: bnDigits(a.title.bn), en: a.title.en })}</h3>
        <span className={`chip ${LEVEL[a.level].chip}`}>{L(LEVEL[a.level])}</span>
      </div>
      <p className="mt-1 text-[14px] leading-6 text-muted">{L(a.body)}</p>
      {a.sms && (
        <>
          {two && (
            <div className="mt-3 inline-flex rounded-full bg-white p-0.5 ring-1 ring-border">
              {[['local', L(SMS_LANG_NAME[lang])], ['en', L(SMS_LANG_NAME.en)]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setWhich(k)} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${which === k ? 'bg-ink text-white' : 'text-muted'}`}>{l}{k === 'local' && SMS_DRAFT.has(lang) ? T(' (খসড়া)', ' (draft)') : ''}</button>
              ))}
            </div>
          )}
          <textarea dir="auto" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border bg-white p-2.5 text-[14.5px] leading-6 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100" aria-label={T('কৃষককে উত্তর (এসএমএসে যাবে)', 'Reply to the farmer (sent by SMS)')} />
          <SmsMeter text={text} className="mt-1" />
          <button type="button" onClick={async () => { setSending(true); const ok = await onSend(text); setSendError(!ok); setSending(false); }} disabled={sent || sending} className="btn-gloss mt-2.5 inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-white disabled:opacity-60">{sent ? <><CheckCircle2 size={16} />{T('আজ পাঠানো হয়েছে', 'Sent today')}</> : sending ? T('পাঠানো হচ্ছে…', 'Sending…') : <><Send size={15} />{T('কৃষককে পাঠান', 'Send to the farmer')}</>}</button>
          {sendError && <p role="alert" className="mt-2 text-[13px] font-semibold text-red-700">{T('পাঠানো যায়নি। আবার চেষ্টা করুন।', 'Not sent. Please try again.')}</p>}
        </>
      )}
    </article>
  );
}

// ---- Farmer requests ----
export function Requests() {
  const { s, T, L } = useStore();
  const { c, req, boardMode, boardError } = useAbroad();
  const [draft, setDraft] = useState({});
  return (
    <div className="page-shell space-y-5">
      <Section icon={LifeBuoy} title={T('কৃষকের অনুরোধ', 'Farmer requests')} sub={T(`${L(c.farmer.name)} “সাহায্য” পাতা থেকে যা পাঠান`, `What ${L(c.farmer.name)} sends from the Help page`)} tag={<BoardChip mode={boardError ? 'error' : boardMode} />}>
        {req.list.length === 0 ? (
          <div className="rounded-2xl bg-white/60 p-5 text-[14.5px] leading-6 text-muted">{T('এখনো কোনো অনুরোধ আসেনি। কৃষকের “সাহায্য” পাতা থেকে একটি পাঠিয়ে দেখুন।', 'No requests yet. Send one from the farmer’s Help page to try it.')} <Link to={`/abroad/${c.id}/help`} className="font-semibold text-primary-700">{T('কৃষকের সাহায্য পাতা', 'Farmer’s Help page')} →</Link></div>
        ) : (
          <ul className="space-y-3">
            {req.list.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white/75 p-4 ring-1 ring-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-semibold text-muted"><span>{L(c.farmer.name)} · {L(c.farmer.village)}</span><span>{fullDate(r.t.slice(0, 10), s.lang)}</span></div>
                <p className="mt-1.5 text-[15px] leading-6">{r.text}</p>
                {r.reply ? <div className="mt-2 rounded-xl bg-primary-50 p-2.5 text-[14px] ring-1 ring-primary-100"><b>{T('আপনার উত্তর', 'Your reply')}:</b> {r.reply.text}</div> : (
                  <div className="mt-2.5 flex gap-2">
                    <input aria-label={T('এই কৃষককে উত্তর', 'Reply to this farmer')} value={draft[r.id] ?? ''} onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })} className="h-10 flex-1 rounded-full border border-border bg-white px-4 text-[14.5px] outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100" placeholder={T('উত্তর লিখুন', 'Write a reply')} />
                    <button type="button" disabled={!draft[r.id]?.trim()} onClick={async () => { const ok = await req.reply(r.id, draft[r.id].trim()); if (ok) setDraft({ ...draft, [r.id]: '' }); }} className="btn-gloss inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-white disabled:opacity-50"><Send size={15} />{T('উত্তর', 'Reply')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---- Farmer and field ----
export function FarmerView() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data } = useAbroad();
  const f = c.farmer;
  return (
    <div className="page-shell space-y-5">
      <section className="surface-card flex flex-wrap items-center gap-4 rounded-[22px] p-5">
        <FarmerAvatar id={f.id} size={56} rounded="rounded-2xl" flag={c.flag} />
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-bold">{L(f.name)} <span className="ml-1 text-[15px] font-semibold text-muted">{f.name.local}</span></div>
          <div className="text-[14px] font-semibold text-primary-800">{T(`গ্রাম ${f.village.bn}, ${f.place.bn}`, `${f.village.en} village, ${f.place.en}`)}</div>
          <div className="text-[13.5px] text-muted">{T(`${num(areaIn(c, f.farmDec), lang, { dp: 1 })} ${c.unit.bn} · ${f.water.bn} · ${f.now.bn}`, `${num(areaIn(c, f.farmDec), 'en', { dp: 1 })} ${c.unit.en} · ${f.water.en} · ${f.now.en}`)}</div>
        </div>
        <Link to={`/abroad/${c.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold ring-1 ring-border hover:bg-primary-50"><UserRound size={15} />{T('কৃষকের পাতা', 'Farmer’s view')}</Link>
      </section>
      <Section icon={Satellite} title={T('জমি, উপগ্রহ থেকে', 'The field, from space')} tag={<SourceTag tone="violet">{T('ইএসএ সেন্টিনেল-২', 'ESA Sentinel-2')}</SourceTag>}><FieldPanel field={data.field} /></Section>
      <Section icon={CloudRain} title={T('এলাকার মৌসুম', 'The area’s season')} sub={T(`${baseText(data.points.farm, 'bn')}-এর তুলনায়`, `Against ${baseText(data.points.farm, 'en')}`)} tag={<SourceTag>ERA5</SourceTag>}><SeasonCharts point={data.points.farm} /></Section>
    </div>
  );
}

// ---- Whole country ----
export function Country() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data } = useAbroad();
  const [pick, setPick] = useState(null);
  const [base, setBase] = useState('nasa');
  const day = useMemo(yesterday, []);
  const zones = useMemo(() => Object.entries(c.zones).map(([key, z]) => { const p = data.points[key]; const flags = zoneFlags(p); return { key, z, p, flags, level: zoneLevel(flags) }; }), [c, data]);
  const alerts = zones.filter((x) => x.level === 'high').length, watch = zones.filter((x) => x.level === 'watch').length;
  const wettest = [...zones].sort((a, b) => b.p.rain30.pct - a.p.rain30.pct)[0];
  const driest = [...zones].filter((x) => x.p.rain30.normal >= 25).sort((a, b) => a.p.rain30.pct - b.p.rain30.pct)[0];
  const lats = zones.map((x) => x.p.lat), lons = zones.map((x) => x.p.lon);
  const bounds = [[Math.min(...lats) - 1, Math.min(...lons) - 1], [Math.max(...lats) + 1, Math.max(...lons) + 1]];
  const farm = data.points.farm;
  return (
    <div className="page-shell space-y-5">
      <OfficeCard national />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-reveal-children>
        <Stat label={T('সতর্ক / নজরে থাকা অঞ্চল', 'Zones on alert / watch')} value={`${num(alerts, lang)} / ${num(watch, lang)}`} sub={T(`${num(zones.length, lang)}টি কৃষি অঞ্চলের মধ্যে`, `of ${zones.length} farming zones`)} tone={alerts ? 'hot' : 'ink'} />
        <Stat label={T('দেশে আগুন ধরা পড়া (৭ দিন)', 'Fire detections in the country (7 days)')} value={num(countryFires(data), lang)} sub={T('নাসা FIRMS, তিন VIIRS উপগ্রহ', 'NASA FIRMS, three VIIRS satellites')} tone="hot" />
        <Stat label={T('সবচেয়ে ভেজা অঞ্চল (৩০ দিন)', 'Wettest zone (30 days)')} value={`${num(wettest.p.rain30.pct, lang)}%`} sub={L(wettest.z.name)} tone="wet" />
        {driest && <Stat label={T('সবচেয়ে শুকনো অঞ্চল (৩০ দিন)', 'Driest zone (30 days)')} value={`${num(driest.p.rain30.pct, lang)}%`} sub={L(driest.z.name)} tone="dry" />}
      </div>
      <Section icon={Globe2} title={T('দেশজুড়ে কৃষি অঞ্চল', 'Farming zones across the country')} sub={base === 'nasa' ? T(`নাসা উপগ্রহের ছবি, ${fullDate(day, 'bn')} (NOAA-20 VIIRS, NASA GIBS)`, `NASA satellite picture of ${fullDate(day, 'en')} (NOAA-20 VIIRS, NASA GIBS)`) : T('এসরি উপগ্রহ ছবি', 'Esri satellite imagery')}
        tag={<div className="inline-flex rounded-full bg-white/70 p-0.5 ring-1 ring-border">{[['nasa', T('নাসা, গতকাল', 'NASA, yesterday')], ['esri', T('বিস্তারিত', 'Detailed')]].map(([k, l]) => <button key={k} type="button" onClick={() => setBase(k)} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold transition ${base === k ? 'bg-ink text-white' : 'text-muted'}`}>{l}</button>)}</div>}>
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="h-[420px] overflow-hidden rounded-2xl ring-1 ring-black/5">
            <MapContainer bounds={bounds} scrollWheelZoom={false} zoomSnap={0.25} zoomDelta={0.5} className="fs-frac h-full w-full">
              <StopOnLeave />
              <Settle bounds={bounds} />
              {base === 'nasa' ? <TileLayer key="nasa" url={GIBS(day)} maxNativeZoom={9} maxZoom={12} attribution="NASA EOSDIS GIBS · NOAA-20 VIIRS" /> : <TileLayer key="esri" url={ESRI} maxNativeZoom={18} attribution="Imagery © Esri, Maxar, Earthstar Geographics" />}
              {zones.flatMap((x) => x.p.fires.points.map(([la, lo], i) => <CircleMarker key={`${x.key}-f${i}`} center={[la, lo]} radius={2.2} pathOptions={{ color: '#ff5a1f', weight: 0, fillOpacity: 0.85 }} />))}
              {zones.map((x) => (
                <CircleMarker key={x.key} center={[x.p.lat, x.p.lon]} radius={pick === x.key ? 15 : 11} eventHandlers={{ click: () => setPick(x.key) }} pathOptions={{ color: '#fff', weight: 2.5, fillColor: LEVEL[x.level].fill, fillOpacity: 0.95 }}>
                  <LTooltip direction="top" offset={[0, -10]}>{L(x.z.name)} · {L(LEVEL[x.level])}</LTooltip>
                </CircleMarker>
              ))}
              <CircleMarker center={[farm.lat, farm.lon]} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#13261b', fillOpacity: 1 }}><LTooltip direction="bottom" offset={[0, 8]} permanent>{L(c.farmer.name)}</LTooltip></CircleMarker>
            </MapContainer>
          </div>
          <ul className="space-y-2" data-reveal-children>
            {zones.map((x) => (
              <li key={x.key}>
                <button type="button" onClick={() => setPick(x.key)} className={`lift flex w-full items-center gap-3 rounded-2xl bg-white/75 p-3 text-left ring-1 transition ${pick === x.key ? 'ring-2 ring-ink/40' : 'ring-white/80'}`}>
                  <span className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white" style={{ background: LEVEL[x.level].fill }} />
                  <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold leading-tight">{L(x.z.name)}</span><span className="block text-[12.5px] leading-4 text-muted">{L(x.z.crop)} · {L(x.z.line)}</span></span>
                  <span className={`chip ${LEVEL[x.level].chip}`}>{L(LEVEL[x.level])}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <Section icon={Megaphone} title={T('এ সপ্তাহে অঞ্চলগুলোর কৃষকদের কী বলবেন', 'What to tell each zone’s farmers this week')} sub={T('প্রতিটি অঞ্চলের গত ৩০ দিন, ওই অঞ্চলের নিজের স্বাভাবিকের সঙ্গে (সাধারণত ২০০১–২০২৫; রেকর্ড ভাঙা হলে ২০১৭–২০২৫)', 'Each zone’s last 30 days against its own normal (usually 2001–2025; 2017–2025 where the record breaks)')} tag={<SourceTag>ERA5 · NASA FIRMS</SourceTag>}>
        <div className="grid gap-3 md:grid-cols-2" data-reveal-children>{zones.map((x) => <ZoneCard key={x.key} x={x} active={pick === x.key} onPick={() => setPick(x.key)} />)}</div>
      </Section>
      <Section icon={Flame} title={T('এ সপ্তাহে কোথায় আগুন', 'Where the fires are this week')} sub={T('প্রথম স্তরের প্রশাসনিক অঞ্চল অনুযায়ী (geoBoundaries); শুধু গোনার জন্য, সীমানা আঁকা হয়নি', 'By first-level region (geoBoundaries); used only to count, no borders are drawn')} tag={<SourceTag>NASA FIRMS</SourceTag>}>
        <FiresPanel data={data} here={null} />
      </Section>
      <div className="flex gap-2.5 rounded-2xl bg-white/70 p-4 text-[13.5px] leading-6 text-muted ring-1 ring-white/80">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div>
          {T('দপ্তর আর (যেখানে দেখানো) প্রধানের নাম আসল, সরকারি পাতা থেকে। কিন্তু এই পাতাগুলো FieldShift-এর নমুনা — ওই দপ্তরের নিজের ব্যবস্থা নয়, আর তাঁরা এর সঙ্গে যুক্ত নন।', 'The offices and (where shown) the head’s name are real, from official pages. But these pages are a FieldShift sample — not the offices’ own system, and they are not involved with it.')}
          <div className="mt-2"><Sources list={[{ label: 'ERA5 (Copernicus/ECMWF) via Open-Meteo', url: 'https://open-meteo.com/en/docs/historical-weather-api' }, { label: 'NASA FIRMS', url: 'https://firms.modaps.eosdis.nasa.gov/' }, { label: 'NASA GIBS', url: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api' }, { label: 'geoBoundaries', url: 'https://www.geoboundaries.org/' }]} /></div>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({ x, active, onPick }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const r = x.p.rain30;
  const dT = r.tmax - r.tmaxNormal;
  const pct = Math.min(300, r.pct ?? 0);
  return (
    <article onClick={onPick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }} role="button" tabIndex={0} aria-pressed={active}
      aria-label={`${L(x.z.name)}: ${L(LEVEL[x.level])}`}
      className={`cursor-pointer rounded-2xl bg-white/75 p-4 ring-1 transition focus-visible:ring-2 focus-visible:ring-primary-700 ${active ? 'ring-2 ring-ink/30' : 'ring-white/80'}`}>
      <div className="flex items-start justify-between gap-2">
        <div><h3 className="text-[15px] font-bold leading-tight">{L(x.z.name)}</h3><div className="text-[12.5px] text-muted">{L(x.z.crop)} · {L(x.z.line)}</div></div>
        <span className={`chip ${LEVEL[x.level].chip}`}>{L(LEVEL[x.level])}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[12.5px]">
        <div><div className="flex items-center gap-1 text-muted"><CloudRain size={13} />{T('বৃষ্টি', 'Rain')}</div><b className="tabular text-[15px]">{num(r.rain, lang)}</b> <span className="text-muted">/ {num(r.normal, lang)} {T('মিমি', 'mm')}</span></div>
        <div><div className="flex items-center gap-1 text-muted"><Thermometer size={13} />{T('দিনের তাপ', 'Day heat')}</div><b className={`tabular text-[15px] ${dT >= 1.5 ? 'text-clay-700' : ''}`}>{dT >= 0 ? '+' : '−'}{num(Math.abs(dT), lang, { dp: 1 })}°</b></div>
        <div><div className="flex items-center gap-1 text-muted"><Flame size={13} />{T('আগুন', 'Fires')}</div><b className="tabular text-[15px]">{num(x.p.fires.km50, lang)}</b> <span className="text-muted">{T('৫০ কিমি', '50 km')}</span></div>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-primary-50" title={`${r.pct}%`}><div className="bar-grow h-full rounded-full" style={{ width: `${(pct / 300) * 100}%`, background: r.pct >= 150 ? '#2f7fb8' : r.pct <= 60 ? '#a8552a' : '#43863a' }} /></div>
      <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{T(`৩০ দিনের বৃষ্টি স্বাভাবিকের ${num(r.pct, lang)}%`, `30-day rain ${r.pct}% of normal`)}</span><span className="tabular">{T('স্বাভাবিক = ১০০%', 'normal = 100%')}</span></div>
      {x.flags.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{x.flags.map((f) => <li key={f.key} className={`chip ${f.level === 'high' ? 'bg-clay-50 text-clay-700 ring-1 ring-clay-300' : 'bg-paddy-50 text-paddy-700 ring-1 ring-paddy-300'}`}>{L(FLAG_TEXT[f.key])}</li>)}</ul>}
      <ul className="mt-2.5 space-y-1.5 border-t border-border/70 pt-2.5">{zoneAdvice(x.flags, x.z).map((a) => <li key={a.en} className="flex gap-2 text-[13.5px] leading-5"><Sun size={14} className="mt-0.5 shrink-0 text-paddy-500" />{L(a)}</li>)}</ul>
    </article>
  );
}

