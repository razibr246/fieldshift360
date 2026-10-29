// My field: what threatens this field, in one card (engine/risks.js): water gathering and erosion from NASA SRTM,
// heat at flowering, cold nights and a dry Rabi from NASA POWER, and stressed seasons from MODIS.
import { useMemo } from 'react';
import { Waves, Mountain, Thermometer, Snowflake, Sun, Leaf, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { fieldRisks } from '../../engine/risks';
import { fieldTerrain } from '../../engine/briefs';
import { landSummary, fieldGreen } from '../../engine/landsat';

const ICON = { wet: Waves, erosion: Mountain, heat: Thermometer, cold: Snowflake, dry: Sun, stress: Leaf };
const LEVEL = [
  { bn: 'কম', en: 'Low', cls: 'bg-primary-50 text-primary-800 ring-primary-200', bar: '#43863a' },
  { bn: 'কিছুটা', en: 'Some', cls: 'bg-paddy-50 text-paddy-800 ring-paddy-200', bar: '#c99a3a' },
  { bn: 'বেশি', en: 'High', cls: 'bg-red-50 text-red-800 ring-red-200', bar: '#b42318' },
];

// tm and upazilaId default to the signed-in farmer's; the officer's farmer page passes the officer's upazila.
export default function FieldRisks({ parcel, tm: tmIn, upazilaId }) {
  const { T, L, tm: tmMine, upazila } = useStore();
  const tm = tmIn ?? tmMine, upz = upazilaId ?? upazila.id;
  const risks = useMemo(() => fieldRisks({ terrain: fieldTerrain(parcel?.id), tm, land: landSummary(upz), field: fieldGreen(parcel?.id, upz) }), [parcel?.id, tm, upz]);
  if (!risks.length) return null;
  const high = risks.filter((r) => r.level === 2);
  return (
    <Card data-tour="farm-risks" className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><ShieldAlert size={19} className="text-red-700" />{T('এই জমির ঝুঁকি', 'What threatens this field')}</h2>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{high.length
            ? T(`সবচেয়ে বড় ঝুঁকি: ${high.map((r) => L(r.title)).join(', ')}। নিচে প্রতিটির পেছনের নাসার তথ্য।`, `Biggest risks: ${high.map((r) => L(r.title)).join(', ')}. The NASA data behind each is below.`)
            : T('বড় কোনো ঝুঁকি দেখা যাচ্ছে না। নিচে প্রতিটির পেছনের নাসার তথ্য।', 'No high risk shows. The NASA data behind each is below.')}</p>
        </div>
        <Tags list={['SAT', 'MODEL', 'RULE']} />
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {risks.map((r) => {
          const I = ICON[r.k], lv = LEVEL[r.level];
          return (
            <li key={r.k} className="rounded-2xl border border-border bg-white p-4" style={{ boxShadow: `inset 3px 0 0 ${lv.bar}` }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[15px] font-bold"><I size={17} style={{ color: lv.bar }} />{L(r.title)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${lv.cls}`}>{L(lv)}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-semibold leading-5 text-ink/85">{L(r.value)}</p>
              <p className="mt-1 text-[13px] leading-5 text-muted">{L(r.note)}</p>
              <p className="mt-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink/45">{r.src}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('উচ্চতা নাসার দুটি মডেলের (SRTM আর ASTER) গড়; দুটোই ফসল-গাছের ওপরের তল দেখে, তাই কয়েক মিটার ভুল থাকতে পারে, প্রতিটি জমির অমিল পাশে লেখা; আবহাওয়া উপজেলার, জমির নয়। মাঠে দাঁড়িয়ে দেখা আর অভিজ্ঞ কৃষকের কথাই শেষ।', 'Heights are the mean of two NASA models (SRTM and ASTER); both see crop and tree tops, so metres of error remain, and each field’s disagreement is shown; the weather is the upazila’s, not the field’s. What you see standing in the field, and what experienced farmers say, comes first.')}</p>
    </Card>
  );
}
