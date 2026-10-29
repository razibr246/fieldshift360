// Data coverage and gaps for the selected field: every dataset, what kind of evidence it is, whether it goes into the
// calculation or is only context, its years and scale, and whether it is here for this field, only at area scale,
// out of date, sample or missing. The register and the status rules are engine/provenance.js.
import { CheckCircle2, CircleDashed, Clock, XCircle, FlaskConical, Map as MapIcon, ExternalLink } from 'lucide-react';
import { useStore } from '../../store';
import { Tag } from '../ui';
import { num } from '../../engine/dates';
import { coverage, STATUS } from '../../engine/provenance';
import { savedWatch } from '../../data/parcels';
import { fieldTerrain } from '../../engine/briefs';
import { fieldGreen } from '../../engine/landsat';
import deltas from '../../data/climate/cmip6_deltas.json';
import econ from '../../data/market/crop_economics.json';
import watchFile from '../../data/fields/field_watch.json';
import { provenance as radarProv } from '../../data/radar/aman_radar.json'; // only this key is bundled

const ICON = { ok: CheckCircle2, coarse: MapIcon, stale: Clock, missing: XCircle, sample: FlaskConical, unreviewed: CircleDashed };
const TONE = { ok: 'text-primary-700', coarse: 'text-sky-700', stale: 'text-amber-700', missing: 'text-red-700', sample: 'text-amber-700', unreviewed: 'text-amber-700' };
const years = Object.values(econ.crops).flatMap((c) => [c.price?.year, c.cost?.year]).filter(Boolean);

export default function DataCoverage() {
  const { T, L, clim, soil, upazila, activeParcel, today, liveWeather } = useStore();
  const p = activeParcel;
  const rows = coverage({
    today, climEnd: clim?.prov?.end, soilScope: soil?.scope, srdi: true,
    terrain: !!fieldTerrain(p?.id), fieldNdvi: !!fieldGreen(p?.id, upazila.id),
    watch: !!(p && savedWatch(p)), watchEnd: watchFile.provenance?.window?.[1],
    cmip6: !!deltas.upazilas?.[upazila.id], priceYearMin: years.length ? Math.min(...years) : null,
    radarThrough: radarProv?.through, liveWeather,
  });
  const gaps = rows.filter((r) => ['stale', 'missing'].includes(r.status));
  return (
    <div>
      <p className="text-[14.5px] leading-7 text-ink/80">
        {T(`এখন দেখানো জমি: ${p ? L(p.name) : 'কোনো জমি বাছা হয়নি'}, ${L(upazila.name)}। `, `The field shown now: ${p ? L(p.name) : 'no field picked'}, ${upazila.name.en}. `)}
        {gaps.length
          ? T(`${num(gaps.length, 'bn')}টি তথ্য নেই বা পুরোনো: ${gaps.map((g) => L(g.name)).join(', ')}। এগুলো যেখানে লাগে, সেখানে উত্তর কম নিশ্চিত।`, `${gaps.length} are missing or out of date: ${gaps.map((g) => L(g.name)).join(', ')}. Wherever they are used, the answer is less certain.`)
          : T('কোনো তথ্য বাদ বা পুরোনো নেই।', 'Nothing is missing or out of date.')}
      </p>
      <div className="mt-3 overflow-x-auto rounded-[22px] border border-border bg-white">
        <table className="w-full min-w-[820px] text-left text-[13.5px]">
          <thead className="bg-canvas text-[12.5px] text-muted">
            <tr>
              <th className="px-3 py-2.5 font-semibold">{T('তথ্য', 'Data')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('কী ধরনের', 'Kind')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('কাজে লাগে', 'Used')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('বছর', 'Years')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('মাপ', 'Scale')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('এই জমিতে', 'For this field')}</th>
              <th className="px-3 py-2.5 font-semibold">{T('সীমা', 'Limit')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const I = ICON[r.status];
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2.5 font-semibold">
                    {r.src?.startsWith('http') ? <a href={r.src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary-800">{L(r.name)}<ExternalLink size={11} className="opacity-60" /></a> : L(r.name)}
                    <div className="mt-0.5 text-[12px] font-normal leading-5 text-muted">{L(r.what)}</div>
                  </td>
                  <td className="px-3 py-2.5"><Tag t={r.kind} /></td>
                  <td className="px-3 py-2.5 text-[12.5px]">{r.use === 'calc' ? T('হিসাবে', 'In the calculation') : T('শুধু পাশে', 'Context only')}</td>
                  <td className="px-3 py-2.5 tabular">{typeof r.years === 'string' ? r.years : L(r.years)}</td>
                  <td className="px-3 py-2.5 text-[12.5px]">{L(r.scale)}</td>
                  <td className={`px-3 py-2.5 font-semibold ${TONE[r.status]}`}><span className="inline-flex items-center gap-1.5"><I size={15} className="shrink-0" />{L(STATUS[r.status])}</span></td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink/75">{L(r.limit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
