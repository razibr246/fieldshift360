// Long-term trends on a map with a time slider: GRACE water storage, MODIS Rabi greenness, SMAP soil water, for the
// seven upazilas and the five neighbouring-country farms. Press play to watch the years go by. Values come from
// engine/trends.js; every dot also has its number in the list beside the map, so nothing is told by colour alone.
import { useEffect, useMemo, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useStore } from '../../store';
import { Segmented, Tags } from '../ui';
import MapView from './MapView';
import { TREND_LAYERS, trendLayer, trendColor } from '../../engine/trends';
import { UPAZILAS } from '../../data/upazilas';
import { num, bnDigits } from '../../engine/dates';
import ws from '../../data/water/water_sat.json';

const ABROAD = { india: { bn: 'পাঞ্জাব, ভারত', en: 'Punjab, India' }, pakistan: { bn: 'সিন্ধু, পাকিস্তান', en: 'Sindh, Pakistan' }, nepal: { bn: 'কৈলালী, নেপাল', en: 'Kailali, Nepal' }, bhutan: { bn: 'পুনাখা, ভুটান', en: 'Punakha, Bhutan' }, myanmar: { bn: 'নিয়াং-উ, মিয়ানমার', en: 'Nyaung-U, Myanmar' } };
const PLACES = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat', ...Object.keys(ABROAD)];
const at = (id) => UPAZILAS[id]?.center ?? ws.points[id]?.at;

export default function TrendMap() {
  const { T, L, s } = useStore();
  const [kind, setKind] = useState('grace');
  const layer = TREND_LAYERS[kind];
  const data = useMemo(() => trendLayer(kind, ws, PLACES), [kind]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setI(data.years.length - 1); setPlaying(false); }, [data]);
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setI((x) => { if (x >= data.years.length - 1) { setPlaying(false); return x; } return x + 1; }), 900);
    return () => clearInterval(t);
  }, [playing, data]);
  const year = data.years[i];
  const name = (id) => (UPAZILAS[id] ? L(UPAZILAS[id].name) : L(ABROAD[id]));
  const val = (id) => data.values[id]?.[year];
  const fmt = (v) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), s.lang, { dp: kind === 'green' ? 1 : 0 })}`);
  const points = PLACES.filter((id) => at(id)).map((id) => ({ id, lat: at(id)[0], lon: at(id)[1], color: trendColor(val(id), layer.span), r: UPAZILAS[id] ? 9 : 11, ring: '#1b2620', label: `${name(id)}: ${fmt(val(id))} ${L(layer.unit)}` }));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={kind} onChange={setKind} options={Object.entries(TREND_LAYERS).map(([k, x]) => ({ value: k, label: x.src }))} />
        <Tags list={[layer.kind]} />
      </div>
      <p className="mt-2 text-[14.5px] font-semibold">{L(layer)} · {T(`${bnDigits(year ?? '')} সাল`, `${year ?? ''}`)}</p>
      <p className="text-[12.5px] text-muted">{L(layer.note)}</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-2xl">
          <MapView center={[25.5, 84]} bounds={[[19.5, 66], [31.5, 98]]} upazila={false} points={points} height={380} label={T('দীর্ঘ মেয়াদের ধারার মানচিত্র', 'Long-term trend map')} />
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 self-start text-[13px] lg:grid-cols-1" aria-label={T(`${bnDigits(year ?? '')} সালের মান`, `Values in ${year}`)}>
          {PLACES.map((id) => (
            <li key={id} className="flex items-center justify-between gap-2 border-b border-border/60 py-1">
              <span className="flex min-w-0 items-center gap-1.5"><span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/30" style={{ background: trendColor(val(id), layer.span) }} /><span className="truncate">{name(id)}</span></span>
              <span className="tabular font-semibold">{fmt(val(id))}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => { if (i >= data.years.length - 1) setI(0); setPlaying(!playing); }} aria-label={playing ? T('থামাও', 'Pause') : T('বছরগুলো চালাও', 'Play the years')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-700 text-white shadow">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <input type="range" min={0} max={Math.max(0, data.years.length - 1)} value={i} onChange={(e) => { setPlaying(false); setI(+e.target.value); }}
          aria-label={T('বছর', 'Year')} className="w-full accent-primary-700" />
        <span className="w-12 text-right font-bold tabular">{T(bnDigits(year ?? ''), year ?? '')}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
        <span>{T('স্বাভাবিকের নিচে', 'Below normal')}</span>
        <span className="h-2.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${trendColor(-layer.span, layer.span)}, ${trendColor(0, layer.span)}, ${trendColor(layer.span, layer.span)})` }} />
        <span>{T('স্বাভাবিকের ওপরে', 'Above normal')}</span>
      </div>
    </div>
  );
}
