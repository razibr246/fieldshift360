// A field's Rabi greenness a generation ago and now: NASA/USGS Landsat (30 m) for 1988–91 and 1998–2001, MODIS
// (250 m) for recent years. The comparison inside Landsat is one sensor; Landsat against MODIS is two, so only a clear
// change is named. The farmer's own memory of what grew here is asked for, because it is the best check.
import { History } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags } from '../ui';
import { landsatThenNow } from '../../engine/landsat';
import { num, bnDigits } from '../../engine/dates';

export default function LandsatThen({ parcel, upazilaId }) {
  const { T, L, s, upazila } = useStore();
  const r = landsatThenNow(parcel?.id, upazilaId ?? upazila.id);
  if (!r) return null;
  const bars = [...r.then.map((e) => ({ k: T(bnDigits(e.label), e.label), v: e.ndvi, src: 'Landsat 30 m' })), ...(r.now != null ? [{ k: T('এখন (২০১৬–)', 'Now (2016–)'), v: r.now, src: 'MODIS 250 m' }] : [])];
  const inside = r.then.length > 1 ? r.then[r.then.length - 1].ndvi - r.then[0].ndvi : null;
  return (
    <Card data-tour="landsat-then" className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[19px] font-bold"><History size={19} className="text-primary-700" />{T('এক প্রজন্ম আগে রবিতে এই জমি', 'This field in the Rabi a generation ago')}</h2>
        <Tags list={['SAT']} />
      </div>
      <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T(`${L(parcel.name)}: ডিসেম্বর-মার্চে জমি কতটা সবুজ ছিল (NDVI, ০ খালি মাটি থেকে ১ ঘন সবুজ)।`, `${L(parcel.name)}: how green the field was from December to March (NDVI, 0 bare soil to 1 dense green).`)}</p>
      <ul className="mt-3 space-y-2">
        {bars.map((b) => (
          <li key={b.k} className="grid grid-cols-[96px_1fr_48px] items-center gap-2 text-[13.5px]">
            <span className="font-semibold">{b.k}</span>
            <span className="h-3 rounded-full bg-black/[.06]"><span className="block h-3 rounded-full bg-primary-600" style={{ width: `${Math.max(3, b.v * 100)}%` }} /></span>
            <span className="text-right tabular">{num(b.v, s.lang, { dp: 2 })}</span>
            <span className="col-start-2 -mt-1.5 text-[11.5px] text-muted">{b.src}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[14px] leading-6">
        {inside != null && Math.abs(inside) > 0.05 && T(`একই উপগ্রহে (Landsat) ১৯৮৮–৯১ থেকে ১৯৯৮–২০০১-এ রবির সবুজ ${inside > 0 ? 'বেড়েছে' : 'কমেছে'}। `, `On the same satellite (Landsat), Rabi greenness ${inside > 0 ? 'rose' : 'fell'} from 1988–91 to 1998–2001. `)}
        {r.direction === 'greener' ? T('এখন রবিতে জমি আগের চেয়ে স্পষ্ট বেশি সবুজ: শুকনো মৌসুমে সেচের বোরো ছড়ানোর সঙ্গে মেলে, আর সেই সেচের পানিই মাটির নিচ থেকে কমছে।', 'The field is clearly greener in the Rabi now: that fits irrigated Boro spreading into the dry season, and the water for it is what is falling underground.')
          : r.direction === 'browner' ? T('এখন রবিতে জমি আগের চেয়ে স্পষ্ট কম সবুজ: জমি বেশি দিন খালি থাকছে, নাকি লবণ বা পানির অভাব? মাঠে মিলিয়ে দেখুন।', 'The field is clearly less green in the Rabi now: is it lying bare longer, or is it salt or water? Check in the field.')
            : T('তখন আর এখনের সবুজে স্পষ্ট পার্থক্য নেই।', 'There is no clear difference between then and now.')}
      </p>
      <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[13px] leading-5 text-ink/80">{T('তখন এই জমিতে রবিতে কী হতো, আপনার বা পরিবারের বড়দের মনে আছে? সেই স্মৃতিই এই হিসাবের সবচেয়ে ভালো যাচাই।', 'Do you, or the elders of your family, remember what grew here in the Rabi then? That memory is the best check on this.')}</p>
      <p className="mt-2 text-[12px] leading-5 text-muted">{T('Landsat আর MODIS আলাদা উপগ্রহ, আলাদা মাপে (৩০ আর ২৫০ মিটার): তাই ০.০৫-এর কম পার্থক্য ধরা হয় না, আর পার্থক্যের কিছুটা যন্ত্রের কারণেও হতে পারে। ১৯৮৪–৮৬-এর Landsat ছবিতে এখানে পরিষ্কার পিক্সেল নেই।', 'Landsat and MODIS are different satellites at different scales (30 and 250 m): differences under 0.05 are not counted, and part of any difference may come from the instruments. The 1984–86 Landsat pictures have no clear pixels here.')}</p>
    </Card>
  );
}
