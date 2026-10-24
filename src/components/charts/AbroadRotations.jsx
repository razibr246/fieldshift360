// The neighbouring-country farm's rotation options over ten years (engine/rotationAbroad.js): soil organic matter
// now and in the 2040s, legume nitrogen, paddy methane and the net greenhouse-gas balance, per hectare.
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Note } from '../ui';
import { num } from '../../engine/dates';
import { climateChange } from '../../engine/soilfuture';
import { abroadRotations, cropAbroad } from '../../engine/rotationAbroad';
import soilYields from '../../data/soil/abroad_soil_yields.json';
import { TEXTURE } from '../../engine/soil';

const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

export default function AbroadRotations({ id, normals }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [deltas, setDeltas] = useState(null);
  useEffect(() => { import('../../data/climate/cmip6_deltas.json').then((m) => setDeltas(m.default)); }, []);
  const c = soilYields.countries[id];
  const res = useMemo(() => (c ? abroadRotations({ country: id, soil: c.soil, yields: c.yields, normals, change: deltas ? climateChange(deltas, `abroad_${id}`, 'ssp245') : null }) : null), [c, id, normals, deltas]);
  if (!res) return null;
  const name = (o) => `${o.cycle.map((y) => y.map((k) => L(cropAbroad(k).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year '))}`;
  const straw = (o) => (o.residue === 'retain' ? T('খড় জমিতে রেখে', 'straw kept') : T('খড়ের বেশির ভাগ তুলে বা পুড়িয়ে', 'most straw removed or burnt'));
  const soilOf = (o) => o.dSocFut ?? o.dSoc;
  const best = res.options.reduce((a, o) => (soilOf(o) > soilOf(a) ? o : a), res.options[0]);
  const habit = res.options.find((o) => o.habit);
  const crops = [...new Set(res.options.flatMap((o) => o.crops))].filter((k) => k !== 'fallow');
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13.5px]">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-2 pr-2 font-semibold">{T('ফসলচক্র (বর্ষা → শীত)', 'Rotation (monsoon → winter)')}</th>
              <th className="px-2 py-2 font-semibold">{T('১০ বছরে জৈব পদার্থ', 'Organic matter, 10 years')}</th>
              <th className="px-2 py-2 font-semibold">{T('২০৪০-এর দশকে', 'In the 2040s')}</th>
              <th className="px-2 py-2 font-semibold">{T('ডালের নাইট্রোজেন', 'Legume nitrogen')}</th>
              <th className="px-2 py-2 font-semibold">{T('ধানের মিথেন', 'Paddy methane')}</th>
              <th className="px-2 py-2 font-semibold">{T('নিট গ্রিনহাউস গ্যাস', 'Net greenhouse gas')}</th>
            </tr>
          </thead>
          <tbody>
            {res.options.map((o, i) => (
              <tr key={i} className={`border-t border-border ${o === best ? 'bg-primary-50/70' : ''}`}>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {o.habit && <span className="rounded-full bg-[#6b7a72] px-1.5 py-0.5 text-[11px] font-bold text-white">{T('এখন যেমন', 'As now')}</span>}
                    {o === best && <span className="rounded-full bg-primary-700 px-1.5 py-0.5 text-[11px] font-bold text-white">{T('মাটির জন্য সেরা', 'Best for the soil')}</span>}
                  </div>
                  <div className="mt-0.5 font-semibold">{name(o)}</div>
                  <div className="text-[12px] text-muted">{straw(o)}</div>
                </td>
                <td className="px-2 py-2 tabular">{num(o.om, lang, { dp: 2 })}% <span className={o.dSoc >= 0 ? 'text-primary-800' : 'text-red-700'}>({signed(o.dSoc, lang)}%)</span></td>
                <td className={`px-2 py-2 tabular ${o.dSocFut != null && o.dSocFut < 0 ? 'text-red-700' : 'text-primary-800'}`}>{o.dSocFut != null ? `${signed(o.dSocFut, lang)}%` : '–'}</td>
                <td className="px-2 py-2 tabular">{o.nFix ? `${num(o.nFix, lang)} ${T('কেজি/হে.', 'kg/ha')}` : '–'}</td>
                <td className="px-2 py-2 tabular">{o.ch4 ? `${num(o.ch4, lang)} ${T('কেজি/হে.', 'kg/ha')}` : '–'}</td>
                <td className={`px-2 py-2 tabular font-semibold ${o.net > 0 ? 'text-red-700' : 'text-primary-800'}`}>{signed(o.net, lang, 2)} {T('টন CO₂e/হে.', 't CO₂e/ha')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {best !== habit && <Note tone="ok" className="mt-3">{T(`মাটির জন্য সেরা: ${name(best)}, ${straw(best)}। দশ বছরে জৈব পদার্থ ${signed(best.dSoc, 'bn')}%${best.dSocFut != null ? `, ২০৪০-এর দশকের গরমেও ${signed(best.dSocFut, 'bn')}%` : ''}; এখনকার চক্রে ২০৪০-এর দশকে ${signed(habit.dSocFut ?? habit.dSoc, 'bn')}%।`, `Best for the soil: ${name(best)}, ${straw(best)}. Organic matter ${signed(best.dSoc, 'en')}% in ten years${best.dSocFut != null ? `, ${signed(best.dSocFut, 'en')}% even in the warmer 2040s` : ''}; the current cycle in the 2040s: ${signed(habit.dSocFut ?? habit.dSoc, 'en')}%.`)}</Note>}
      <p className="mt-2 text-[12.5px] leading-5 text-muted">
        {T(`মাটি: SoilGrids, এই খামারে ${num(c.soil.soc_g_kg, 'bn', { dp: 1 })} গ্রাম/কেজি জৈব কার্বন (${num(res.om0, 'bn', { dp: 2 })}% জৈব পদার্থ), ${TEXTURE[c.soil.texture]?.bn ?? c.soil.texture} মাটি। ফলন (FAOSTAT, দেশের গড় ২০২০–২০২৪, টন/হেক্টর): `, `Soil: SoilGrids, ${num(c.soil.soc_g_kg, 'en', { dp: 1 })} g/kg organic carbon on this farm (${num(res.om0, 'en', { dp: 2 })}% organic matter), ${(TEXTURE[c.soil.texture]?.en ?? c.soil.texture).toLowerCase()}. Yields (FAOSTAT, national mean 2020–2024, t/ha): `)}
        {crops.map((k) => `${L(cropAbroad(k).name)} ${num(c.yields[k]?.tHa ?? 0, lang, { dp: 2 })}`).join(', ')}.
        {T(' এখনকার চক্রটি আজকের মাটির কার্বন ধরে রাখে ধরে নিয়ে হিসাব (বাংলাদেশের মতোই)। মিথেন: আইপিসিসি ২০১৯ টিয়ার-১।', ' The current cycle is taken as holding today’s soil carbon (as in Bangladesh). Methane: IPCC 2019 Tier 1.')}
        {res.proxy && T(' ছোলার নিজের সহগ মডেলে নেই, তাই মসুরেরটা ধরা (দুটোই শীতের ডাল)।', ' Chickpea has no coefficients of its own in the model, so lentil’s are used (both winter grain legumes).')}
        {T(' এগুলো তুলনার জন্য বিকল্প, স্থানীয় পরামর্শ নয়; পানির হিসাব মৌসুমের পরিকল্পনা পাতায়।', ' These are options to compare, not local advice; water is on the season plan page.')}
      </p>
    </div>
  );
}
