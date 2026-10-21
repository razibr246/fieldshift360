// Season planner steps 1–4: field here; weather (StepClimate.jsx), soil (StepSoil.jsx) and what matters (StepPriorities.jsx) in their own files.
import { useState } from 'react';
import { MapPinned, Pencil, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../../store';
import { StepHeader, Card, Button } from '../../../components/ui';
import LandPicker from '../../../components/map/LandPicker';
import Photo from '../../../components/Photo';
import { IRRIGATION, cropName } from '../../../engine/crops.js';
import { num } from '../../../engine/dates.js';


// ---------- 1. Field ----------
export function StepField() {
  const { s, T, L, dispatch, farmer, union, landConfirmed, myParcels, activeParcel } = useStore();
  const [editing, setEditing] = useState(!landConfirmed);
  const lang = s.lang;
  return (
    <div>
      <StepHeader kicker={T('ধাপ ১, জমি', 'Step 1, your field')} title={myParcels.length > 1 ? T('কোন জমির পরিকল্পনা করবেন?', 'Which field are you planning?') : T('আপনার জমিটা কোথায়?', 'Where is your field?')}
        sub={myParcels.length > 1
          ? T('আপনার সব জমি উপজেলা কৃষি অফিসে নিবন্ধিত আছে। একটি বেছে নিন; ইউনিয়ন, মাটি আর পাশের কৃষকদের হিসাব সেই জমি ধরে হবে।', 'All your fields are registered with the upazila agriculture office. Pick one; the union, soil and neighbours are worked out for it.')
          : T('মানচিত্রে জমির ওপর পিন বসিয়ে নিশ্চিত করুন। এখান থেকেই ইউনিয়ন, মাটি আর পাশের কৃষকদের হিসাব ঠিক হয়।', 'Put the pin on your field and confirm it. Your union, soil and neighbours are worked out from here.')} tags={['DEMO']} />
      {myParcels.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label={T('জমি বাছুন', 'Choose a field')}>
          {myParcels.map((p, i) => {
            const on = p.id === activeParcel?.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => !on && dispatch({ type: 'useParcel', id: farmer.id, parcel: p })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[14px] ${on ? 'border-primary-600 bg-primary-50 font-semibold text-primary-900' : 'border-border bg-white hover:border-primary-300'}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${on ? 'bg-primary-700 text-white' : 'bg-black/[.06]'}`}>{num(i + 1, lang)}</span>
                <span>{L(p.name)}<span className="block text-[12.5px] font-normal text-muted">{T(`${num(p.area_dec / 33, 'bn', { dp: 1 })} বিঘা, গতবার ${cropName(p.last_crop, 'bn')}`, `${num(p.area_dec / 33, 'en', { dp: 1 })} bigha, last ${cropName(p.last_crop, 'en').toLowerCase()}`)}</span></span>
              </button>
            );
          })}
        </div>
      )}
      {editing ? (
        <LandPicker compact height={340} onDone={() => setEditing(false)} />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/7]">
            <Photo name="landParcels" fill sizes="720px" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <div className="flex items-center gap-1.5 text-[13.5px] text-white/85"><CheckCircle2 size={15} />{T('জমি নিশ্চিত করা আছে', 'Field confirmed')}</div>
              <div className="font-display text-[22px] font-bold">{activeParcel ? L(activeParcel.name) : L(farmer.name)}</div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[14.5px] sm:grid-cols-4">
            <Fact k={T('জায়গা', 'Place')} v={`${lang === 'bn' ? farmer.villageBn : farmer.village}, ${L(union.meta)}`} />
            <Fact k={T('জমির মাপ', 'Size')} v={T(`${num(farmer.area_dec, 'bn')} শতক (${num(farmer.area_dec / 33, 'bn', { dp: 1 })} বিঘা)`, `${farmer.area_dec} decimal (${num(farmer.area_dec / 33, 'en', { dp: 1 })} bigha)`)} />
            <Fact k={T('গত রবিতে', 'Last Rabi')} v={cropName(farmer.last_crop, lang)} />
            <Fact k={T('সেচ', 'Water')} v={L(IRRIGATION[farmer.irrigation])} />
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-border p-4">
            <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={16} />{T('জমি বদলান', 'Change field')}</Button>
            <Button to="/farmer/farm" variant="ghost"><MapPinned size={16} />{T('বড় মানচিত্রে দেখুন', 'Open the full map')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
const Fact = ({ k, v }) => <div><dt className="text-[13px] text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>;

// ---------- 2. Weather then vs now: its own file ----------
export { default as StepClimate } from './StepClimate';

// ---------- 3. Soil: its own file (real SoilGrids and SRDI data) ----------
export { default as StepSoil } from './StepSoil';

// ---------- 4. What matters: its own file (real water and money per crop) ----------
export { default as StepPriorities, W_LABEL } from './StepPriorities';
