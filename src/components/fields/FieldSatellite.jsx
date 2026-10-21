// One field from space: the latest clear Sentinel-2 picture (true colour or green cover), what the AI pattern
// matcher thinks is growing, the open-rule health reading, what to look for at this time of year, and the
// field's green-cover line through the seasons.
import { useEffect, useMemo, useState } from 'react';
import { Satellite, RefreshCw, Sprout, ScanLine, Send, Pencil, Sparkles, Loader2, WifiOff, CheckCircle2, Clock } from 'lucide-react';
import { useStore, demo } from '../../store';
import { Card, Badge, Button, Note, Tags, Segmented } from '../ui';
import NdviChart from './NdviChart';
import { LEVEL_LOOK } from './FieldsMap';
import { useFieldWatch } from './useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { pictureBox } from '../../engine/sentinel';
import { plotSquare } from '../../engine/world';
import { cropName, IRRIGATION } from '../../engine/crops';
import { num, fmtDate, parseISO, iso, todayDhaka } from '../../engine/dates';
import { WATCH_PROV } from '../../data/parcels';

const pctLabel = (p, lang) => `${num(Math.round(p * 100), lang)}%`;

// The field's square drawn over the picture, in the picture's own 0–100 coordinates.
function Outline({ parcel, box }) {
  const [[s, w], [n, e]] = box ?? pictureBox(parcel);
  const pts = plotSquare(parcel.lat, parcel.lon, parcel.area_dec).map(([la, lo]) => `${((lo - w) / (e - w)) * 100},${((n - la) / (n - s)) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <polygon points={pts} fill="none" stroke="#fff" strokeWidth="0.9" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2.5 }} />
      <polygon points={pts} fill="none" stroke="#edc067" strokeWidth="0.5" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.5 }} />
    </svg>
  );
}

// The sharpest photo there is of the field (Esri, at the deepest zoom it has here), stitched from map tiles.
// close: only the field and a margin, made 4× sharper by the in-browser AI model (src/ai/superres.js).
const closeBox = (p) => {
  const side = Math.max(70, 1.8 * Math.sqrt(p.area_dec * 40.4686));
  const dLat = side / 2 / 111320, dLon = side / 2 / (111320 * Math.cos((p.lat * Math.PI) / 180));
  return [[p.lat - dLat, p.lon - dLon], [p.lat + dLat, p.lon + dLon]];
};
// tight: frame the field and its neighbours (about 180 m across) instead of the 480 m view, without AI.
const tightBox = (p) => {
  const side = Math.max(150, 4 * Math.sqrt(p.area_dec * 40.4686));
  const dLat = side / 2 / 111320, dLon = side / 2 / (111320 * Math.cos((p.lat * Math.PI) / 180));
  return [[p.lat - dLat, p.lon - dLon], [p.lat + dLat, p.lon + dLon]];
};
export function PhotoPicture({ parcel, close, tight = false }) {
  const { T, s } = useStore();
  const [st, setSt] = useState({ phase: 'load' });
  useEffect(() => {
    const ac = new AbortController();
    let url = null;
    setSt({ phase: 'load' });
    (async () => {
      const { esriDepthAt, esriTile, stitch, upscale4 } = await import('../../ai/superres');
      const z = await esriDepthAt(parcel.lat, parcel.lon);
      const { canvas, bounds } = await stitch(esriTile, z, close ? closeBox(parcel) : tight ? tightBox(parcel) : pictureBox(parcel), { signal: ac.signal, maxPx: 2200 });
      let out = canvas;
      if (close) { setSt({ phase: 'ai', progress: 0 }); out = await upscale4(canvas, { signal: ac.signal, onProgress: (x) => setSt({ phase: 'ai', progress: x }) }); }
      const blob = await new Promise((ok) => out.toBlob(ok, 'image/jpeg', 0.92));
      if (ac.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setSt({ phase: 'done', url, bounds, z, px: close ? out.width : canvas.width });
    })().catch((e) => { if (e.name !== 'AbortError') setSt({ phase: 'error' }); });
    return () => { ac.abort(); if (url) URL.revokeObjectURL(url); };
  }, [parcel.id, parcel.lat, parcel.lon, parcel.area_dec, close, tight]);
  // Metres per screen-pixel of the source photo at this zoom (Web Mercator), for an honest caption.
  const mpp = st.z ? (156543.03 * Math.cos((parcel.lat * Math.PI) / 180)) / 2 ** st.z : null;
  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-primary-950">
        {st.phase === 'done' && <img src={st.url} alt={close ? T('AI দিয়ে পরিষ্কার করা জমির কাছের ছবি', 'Close-up of the field, cleared up by AI') : T('জমির সবচেয়ে পরিষ্কার উপগ্রহ ছবি', 'Sharpest satellite photo of the field')} className="h-full w-full object-cover" />}
        {st.phase === 'done' && <Outline parcel={parcel} box={st.bounds} />}
        {st.phase !== 'done' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13.5px] text-white/85">
            {st.phase === 'error' ? T('ছবি আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।', 'Could not load the photo. Check the connection and try again.')
              : <span className="flex flex-col items-center gap-2"><Loader2 size={22} className="animate-spin" />{st.phase === 'ai'
                ? T(`AI ছবি পরিষ্কার করছে… ${num(Math.round(st.progress * 100), 'bn')}%`, `AI is clearing up the photo… ${Math.round(st.progress * 100)}%`)
                : T('ছবি আনা হচ্ছে…', 'Loading the photo…')}</span>}
          </div>
        )}
        {close && st.phase === 'done' && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-violet-700/90 px-2.5 py-1 text-[11.5px] font-semibold text-white"><Sparkles size={12} />{T('AI × ৪', 'AI × 4')}</span>}
      </div>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">
        {close
          ? T('উৎসের ছবি থেকে AI (Real-ESRGAN) চার গুণ বড় ও পরিষ্কার করেছে, আপনার ফোনেই। আইল আর জমির কিনারা আসল ছবির; ঘাস বা গাছের মতো সূক্ষ্ম দাগ AI-এর অনুমান, মাপা নয়।', 'AI (Real-ESRGAN) made the source photo four times larger and clearer, on your own device. Bunds and field edges come from the real photo; grass-like fine texture is the AI’s estimate, not a measurement.')
          : T('উপগ্রহের সবচেয়ে পরিষ্কার ছবি (Esri, Maxar)। তারিখ নির্দিষ্ট নয়, কয়েক বছর পুরোনো হতে পারে; আজকের অবস্থা দেখতে "আজকের ছবি" দেখুন।', 'The sharpest satellite photo (Esri, Maxar). Its date is not given and it may be a few years old; see "Today" for the field as it is now.')}
        {mpp ? T(` উৎস: প্রতি বিন্দু প্রায় ${num(mpp, 'bn', { dp: 1 })} মিটার।`, ` Source: about ${num(mpp, 'en', { dp: 1 })} m per pixel.`) : ''}
      </p>
    </>
  );
}

export function Picture({ parcel, pictures, kind }) {
  const { T } = useStore();
  const [failed, setFailed] = useState(false);
  const src = failed ? pictures.fallback?.[kind] : pictures[kind];
  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-primary-950">
      {src ? <img src={src} alt={kind === 'tc' ? T('উপগ্রহ থেকে জমির আসল রঙের ছবি', 'True-colour satellite picture of the field') : T('জমির সবুজের মানচিত্র', 'Green-cover map of the field')}
        className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" /> : null}
      <Outline parcel={parcel} />
      {kind === 'ndvi' && (
        <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/55 px-2.5 py-1.5 text-[11.5px] text-white backdrop-blur">
          <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg,#a50026,#f46d43,#fee08b,#d9ef8b,#66bd63,#006837)' }} />
          <div className="mt-1 flex justify-between"><span>{T('খালি মাটি / পানি', 'Bare soil / water')}</span><span>{T('ঘন সবুজ ফসল', 'Thick green crop')}</span></div>
        </div>
      )}
    </div>
  );
}

export default function FieldSatellite({ parcel, index, active, onPlan, onEdit, onReading }) {
  const { s, T, L, dispatch, toast, farmer } = useStore();
  const lang = s.lang;
  const fw = useFieldWatch(parcel);
  const [kind, setKind] = useState('photo');
  const r = useMemo(() => (fw.watch ? readField(fw.watch, { today: todayDhaka() }) : null), [fw.watch]);
  const look = LEVEL_LOOK[r?.level ?? 'none'];
  useEffect(() => { if (r) onReading?.(parcel.id, r); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  const notField = r?.top?.pattern.notField;
  const registeredMatch = r?.lastRabi?.[0] && r.lastRabi[0].pattern.crops.includes(parcel.last_crop);

  const tellOffice = () => {
    const issues = r.findings.filter((f) => f.tone !== 'ok');
    const body = (k) => `${L(parcel.name)} (${parcel.id}), ${fmtDate(parseISO(r.last.d), k)}: ${issues.map((f) => f[k]).join(' ')}`;
    dispatch({ type: 'addRequest', req: {
      id: `S-${parcel.id}-${Date.now().toString(36)}`, farmerId: farmer.id, union: parcel.union, village: parcel.village, villageBn: parcel.villageBn, lat: parcel.lat, lon: parcel.lon,
      crop: r.top?.pattern.crops.at(-1) ?? parcel.last_crop, symptom: notField ? 'question' : 'satellite', type: 'help', parcel: parcel.id,
      text: { bn: body('bn'), en: body('en') }, ai: null, created: iso(todayDhaka()), status: 'open', priority: r.level === 'warn' ? 'High' : 'Medium', mine: true } });
    toast('উপজেলা কৃষি অফিসে জানানো হয়েছে', 'Sent to the upazila agriculture office');
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[16px] font-bold text-white" style={{ background: look.color }}>{num(index + 1, lang)}</span>
          <div className="min-w-0">
            <h2 className="text-[21px] font-bold leading-tight">{L(parcel.name)}</h2>
            <p className="mt-0.5 text-[14px] text-muted">{lang === 'bn' ? parcel.villageBn : parcel.village}, {L(demo.unions.find((u) => u.id === parcel.union)?.full)} · {T(`${num(parcel.area_dec, 'bn')} শতক (${num(parcel.area_dec / 33, 'bn', { dp: 1 })} বিঘা)`, `${parcel.area_dec} decimal (${num(parcel.area_dec / 33, 'en', { dp: 1 })} bigha)`)} · {L(IRRIGATION[parcel.irrigation])}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {parcel.pending ? <Badge tone="amber"><Clock size={12} />{T('উপজেলা অফিসের যাচাই বাকি', 'Waiting for the office to check')}</Badge>
                : <Badge><CheckCircle2 size={12} />{T(`উপজেলা কৃষি অফিসে নিবন্ধিত · ${parcel.id}`, `Registered with the upazila office · ${parcel.id}`)}</Badge>}
              {active && <Badge tone="blue"><Sprout size={12} />{T('এই জমির মৌসুম পরিকল্পনা চলছে', 'Season plan is for this field')}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!active && <Button onClick={onPlan} className="!py-2"><Sprout size={16} />{T('এই জমির পরিকল্পনা করুন', 'Plan this field')}</Button>}
          <Button variant="secondary" onClick={onEdit} className="!py-2"><Pencil size={15} />{T('অবস্থান ঠিক করুন', 'Correct the position')}</Button>
        </div>
      </div>

      {!fw.watch ? (
        <div className="grid place-items-center gap-2 p-10 text-center text-[14.5px] text-muted">
          {fw.status === 'loading' ? <><Loader2 size={22} className="animate-spin text-primary-600" />{T('উপগ্রহের ছবি থেকে জমি পড়া হচ্ছে…', 'Reading the field from satellite pictures…')}{fw.progress && <span className="tabular">{num(fw.progress.done, lang)}/{num(fw.progress.total, lang)}</span>}</>
            : fw.status === 'offline' ? <><WifiOff size={22} />{T('ইন্টারনেট নেই। সংযোগ পেলে নতুন জমির উপগ্রহের হিসাব শুরু হবে।', 'Offline. The satellite reading for this new field starts once you are connected.')}</>
              : fw.status === 'error' ? <><Satellite size={22} />{T('উপগ্রহের তথ্য আনা যায়নি।', 'Could not fetch the satellite data.')}<Button variant="secondary" onClick={fw.refresh}><RefreshCw size={15} />{T('আবার চেষ্টা', 'Try again')}</Button></>
                : <><Satellite size={22} />{T('উপগ্রহের হিসাব শুরু হচ্ছে…', 'Starting the satellite reading…')}</>}
        </div>
      ) : (
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
            <Segmented value={kind} onChange={setKind} className="mb-3 grid w-full grid-cols-2 sm:grid-cols-4"
              options={[{ value: 'photo', label: T('কাছের ছবি', 'Sharp photo') }, { value: 'close', icon: Sparkles, label: T('জমি কাছ থেকে', 'Close-up') },
                { value: 'tc', label: T('আজকের ছবি', 'Today') }, { value: 'ndvi', label: T('সবুজের মানচিত্র', 'Green cover') }]} />
            {kind === 'photo' || kind === 'close' ? <PhotoPicture key={kind} parcel={parcel} close={kind === 'close'} />
              : fw.watch.pictures ? <Picture key={`${kind}-${fw.watch.pictures.date}`} parcel={parcel} pictures={fw.watch.pictures} kind={kind} /> : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted">
              <span className={kind === 'photo' || kind === 'close' ? 'invisible' : ''}>{T(`সেন্টিনেল-২ উপগ্রহ, ${fmtDate(parseISO(fw.watch.latest), 'bn')} · ১০ মিটার`, `Sentinel-2, ${fmtDate(parseISO(fw.watch.latest), 'en')} · 10 m`)}{r?.ageDays > 0 ? T(` (${num(r.ageDays, 'bn')} দিন আগে)`, ` (${r.ageDays} days ago)`) : ''}</span>
              <button type="button" onClick={fw.refresh} disabled={fw.status === 'loading'} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60">
                <RefreshCw size={13} className={fw.status === 'loading' ? 'animate-spin' : ''} />
                {fw.status === 'loading' ? T('নতুন ছবি খোঁজা হচ্ছে…', 'Looking for new pictures…') : fw.status === 'offline' ? T('অফলাইন', 'Offline') : T('নতুন ছবি খুঁজুন', 'Check for new pictures')}
              </button>
            </div>
            <p className={`mt-1 text-[12.5px] leading-5 text-muted ${kind === 'photo' || kind === 'close' ? 'hidden' : ''}`}>{T('হলুদ দাগের ঘর আপনার জমি। উপগ্রহের প্রতিটি বিন্দু ১০ মিটার, তাই ছোট আইল দেখা যায় না।', 'The yellow square is your field. Each satellite pixel is 10 m, so small bunds do not show.')}</p>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl bg-canvas p-4">
              <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-muted">{T('এখন জমিতে কী আছে', 'What is on the field now')}</span><Tags list={['REAL', 'AI']} /></div>
              {r?.top ? (
                <>
                  <div className="font-display mt-1 text-[22px] font-bold leading-tight">{L(r.top.pattern.name)}</div>
                  {r.stage && <div className="text-[14.5px] text-ink/80">{T('এখন', 'Now')}: {L(r.stage)}</div>}
                  {!notField && (
                    <ul className="mt-3 space-y-1.5">
                      {r.guess.slice(0, 3).map((g) => (
                        <li key={g.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-[13px]">
                          <span className="truncate">{L(g.pattern.name)}</span><span className="tabular font-semibold">{pctLabel(g.p, lang)}</span>
                          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-black/[.06]"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, g.p * 100)}%` }} /></span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.top.n < 3 && !notField && <p className="mt-2 text-[12.5px] text-muted">{T('এই মৌসুমে মেঘের জন্য পরিষ্কার ছবি কম, তাই অনুমান কম নিশ্চিত।', 'Clouds left few clear pictures this season, so the guess is less certain.')}</p>}
                </>
              ) : <p className="mt-1 text-[14px] text-muted">{T('এই মৌসুমে এখনো যথেষ্ট পরিষ্কার ছবি নেই।', 'Not enough clear pictures this season yet.')}</p>}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-bold text-white" style={{ background: look.color }}><look.icon size={15} />{L(look)}</span>
                <span className="text-[13px] text-muted">{T(`সবুজ ${num(Math.round(r.last.ndvi * 100), 'bn')}/১০০`, `Green cover ${Math.round(r.last.ndvi * 100)}/100`)}</span>
                <Tags list={['RULE']} />
              </div>
              <div className="space-y-2">
                {r.findings.map((f, i) => <Note key={i} tone={f.tone === 'warn' ? 'warn' : f.tone === 'watch' ? 'gold' : 'ok'}>{L(f)}</Note>)}
              </div>
            </div>

            {r.risks.length > 0 && (
              <div className="rounded-2xl border border-border p-3.5">
                <div className="text-[13px] font-semibold text-muted">{T('এই সময়ে জমিতে যা খেয়াল রাখবেন', 'What to look for at this time of year')}</div>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] leading-6">{r.risks.map((x, i) => <li key={i}>{L(x)}</li>)}</ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button to="/farmer/doctor" variant="secondary" className="!py-2"><ScanLine size={16} />{T('পাতার ছবি তুলে দেখান', 'Photograph a leaf')}</Button>
              {(r.level !== 'ok' || notField) && <Button onClick={tellOffice} className="!py-2"><Send size={16} />{notField ? T('অফিসকে অবস্থান ঠিক করতে বলুন', 'Ask the office to fix the position') : T('কৃষি অফিসকে জানান', 'Tell the agriculture office')}</Button>}
            </div>
            <p className="text-[12.5px] leading-5 text-muted">{T('উপগ্রহ রোগ বা পোকার নাম বলতে পারে না, শুধু দেখায় জমির কোথায় ফসল দুর্বল। নিশ্চিত হতে জমিতে গিয়ে দেখুন বা পাতার ছবি পাঠান।', 'A satellite cannot name a disease or a pest; it only shows where the crop is weaker. Walk the field or send a leaf photo to be sure.')}</p>
          </div>

          <div className="min-w-0 lg:col-span-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[17px] font-bold"><Satellite size={17} className="text-primary-600" />{T('মৌসুম ধরে জমির সবুজ', 'The field’s green cover through the seasons')}</h3>
              <span className="text-[12.5px] text-muted">{T(`${num(r.series.length, 'bn')}টি পরিষ্কার ছবি`, `${r.series.length} clear pictures`)}</span>
            </div>
            <NdviChart series={r.series} expected={notField ? [] : r.expectedCurve} season={r.season} />
            {r.lastRabi[0] && !notField && (
              <p className="mt-3 rounded-xl bg-canvas px-3.5 py-2.5 text-[14px] leading-6">
                <span className="font-semibold">{T('গত রবিতে উপগ্রহ যা দেখেছে', 'What the satellite saw last Rabi')}: </span>
                {L(r.lastRabi[0].pattern.name)} ({pctLabel(r.lastRabi[0].p, lang)}).{' '}
                <span className={registeredMatch ? 'text-primary-800' : 'text-clay-700'}>{T(`অফিসের খাতায়: ${cropName(parcel.last_crop, 'bn')}${registeredMatch ? ', মিলে গেছে।' : ', মেলেনি; অফিস একবার দেখে নিতে পারে।'}`, `The office record says ${cropName(parcel.last_crop, 'en').toLowerCase()}${registeredMatch ? ', which matches.' : ', which does not match; the office may want to check.'}`)}</span>
              </p>
            )}
            <p className="mt-2 text-[12px] leading-5 text-muted">{T(`উৎস: ${WATCH_PROV.dataset}, ${WATCH_PROV.via}। মেঘ বা কুয়াশা ঢাকা ছবি বাদ। সবুজ = NDVI × ১০০।`, `Source: ${WATCH_PROV.dataset}, via ${WATCH_PROV.via}. Cloudy and hazy passes are left out. Green cover = NDVI × 100.`)}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
