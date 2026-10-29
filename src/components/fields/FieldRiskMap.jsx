// Field-level vulnerability on a map: every registered field of one upazila, coloured by the risk picked (water
// standing, soil washing off, heat at flowering, a dry Rabi, crop-stress years). The levels are engine/risks.js, the
// same as each field's risk card; terrain is NASA SRTM and ASTER, stress years each field's own MODIS 250 m pixel.
import { useMemo, useState } from 'react';
import { Waves, Mountain, Thermometer, Sun, Leaf } from 'lucide-react';
import { useStore, tms } from '../../store';
import { Card, Segmented, Tags } from '../ui';
import MapView from '../map/MapView';
import { fieldRisks } from '../../engine/risks';
import { fieldTerrain } from '../../engine/briefs';
import { landSummary, fieldGreen } from '../../engine/landsat';

const KINDS = [
  { k: 'wet', icon: Waves, bn: 'পানি জমা', en: 'Standing water' },
  { k: 'erosion', icon: Mountain, bn: 'মাটি ধোয়া', en: 'Erosion' },
  { k: 'stress', icon: Leaf, bn: 'ফসলের চাপ', en: 'Crop stress' },
  { k: 'heat', icon: Thermometer, bn: 'ফুলে গরম', en: 'Heat at flowering' },
  { k: 'dry', icon: Sun, bn: 'শুকনো রবি', en: 'Dry Rabi' },
];
const COLOR = ['#43863a', '#c99a3a', '#b42318'];
const LEVEL = [{ bn: 'কম', en: 'Low' }, { bn: 'কিছুটা', en: 'Some' }, { bn: 'বেশি', en: 'High' }];

// upazilaId: whose fields to show; highlight: a field id to ring (the farmer's own)
export default function FieldRiskMap({ upazilaId, highlight = null }) {
  const { T, L, parcels } = useStore();
  const [kind, setKind] = useState('wet');
  const tm = tms[upazilaId];
  const rows = useMemo(() => parcels.filter((p) => p.upazila === upazilaId).map((p) => {
    const r = fieldRisks({ terrain: fieldTerrain(p.id), tm, land: landSummary(upazilaId), field: fieldGreen(p.id, upazilaId) });
    return { p, r: Object.fromEntries(r.map((x) => [x.k, x])) };
  }), [parcels, upazilaId, tm]);
  if (!rows.length) return null;
  const pts = rows.map(({ p, r }) => {
    const x = r[kind];
    return { id: p.id, lat: p.lat, lon: p.lon, color: x ? COLOR[x.level] : '#9aa59e', r: p.id === highlight ? 11 : 8, ring: p.id === highlight ? '#ffffff' : undefined,
      label: `${L(p.name)}: ${x ? `${L(LEVEL[x.level])} · ${L(x.value)}` : T('তথ্য নেই', 'no data')}` };
  });
  const lat = rows.map((x) => x.p.lat), lon = rows.map((x) => x.p.lon), pad = 0.01;
  const counts = [0, 1, 2].map((lv) => rows.filter((x) => x.r[kind]?.level === lv).length);
  return (
    <Card data-tour="risk-map" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl">
          <h2 className="text-[19px] font-bold">{T('জমিগুলোর ঝুঁকির মানচিত্র', 'Where the fields are vulnerable')}</h2>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('নিবন্ধিত প্রতিটি জমি, বাছাই করা ঝুঁকির রঙে। পানি জমা আর ঢাল নাসার দুই উচ্চতা-মডেল থেকে, ফসলের চাপ জমির নিজের MODIS পিক্সেল থেকে; গরম আর শুকনো রবি উপজেলার আবহাওয়া, তাই সব জমিতে একই।', 'Every registered field, coloured by the risk picked. Standing water and slope come from two NASA elevation models, crop stress from each field’s own MODIS pixel; heat and a dry Rabi are the upazila’s weather, so they are the same on every field.')}</p>
        </div>
        <Tags list={['SAT', 'MODEL', 'RULE']} />
      </div>
      <Segmented className="mt-3" value={kind} onChange={setKind} options={KINDS.map((x) => ({ value: x.k, label: L(x), icon: x.icon }))} />
      <div className="mt-3 overflow-hidden rounded-2xl">
        <MapView center={[(Math.min(...lat) + Math.max(...lat)) / 2, (Math.min(...lon) + Math.max(...lon)) / 2]} upazila={upazilaId} bounds={[[Math.min(...lat) - pad, Math.min(...lon) - pad], [Math.max(...lat) + pad, Math.max(...lon) + pad]]} basemap="satellite" points={pts} height={340} label={T('জমির ঝুঁকির মানচিত্র', 'Field risk map')} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label={T('রঙের মানে', 'Legend')}>
        {[0, 1, 2].map((lv) => <li key={lv} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: COLOR[lv] }} />{L(LEVEL[lv])}: <b className="tabular">{counts[lv]}</b></li>)}
      </ul>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('উচ্চতার মডেল ফসল-গাছের মাথা দেখে আর কয়েক মিটার ভুল থাকে; পানি জমা নিশ্চিত হয় বর্ষায় মাঠে দেখে। মানচিত্রে চাপুন বা আঙুল রাখুন: প্রতিটি জমির সংখ্যা।', 'The elevation models see crop and tree tops and carry metres of error; standing water is confirmed by looking in the monsoon. Tap or hover a field for its numbers.')}</p>
    </Card>
  );
}
