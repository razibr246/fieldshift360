// Who this is for, and how many: the farm households of Bangladesh (Agriculture Census 2019), the people of the seven
// upazilas the app runs in today (Population Census 2022), and, for each upazila, three NASA SEDAC measures of the
// land and its people (scripts/fetch/sedac.mjs): how crowded it is, how much of it lies below 10 m on the coast,
// and how much of it is cropland.
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num } from '../../engine/dates';
import { UPAZILAS } from '../../data/upazilas';
import { LEVELS } from '../../data/stories';
import census from '../../data/region/census.json';
import sedac from '../../data/region/sedac.json';
import BD from '../../data/geo/bangladesh_crops.json';

const BORO_HA = BD.national.rabi.find((c) => c.key === 'boro').ha;
const pct = (x, lang) => `${num(Math.round(x * 100), lang)}%`;

export default function ImpactReach() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const rows = LEVELS.map((l) => ({ id: l.upz, u: UPAZILAS[l.upz], people: census.upazilas[l.upz], sd: sedac.upazilas[l.upz] })).filter((r) => r.u && r.people && r.sd);
  const people = rows.reduce((a, r) => a + r.people, 0);
  const coast = rows.filter((r) => r.sd.leczShare >= 0.5);
  // GIBS shows GPW density in classes up to "1000 and more", so the median class is what can be said.
  const density = ([lo, hi]) => (lo >= 1000 ? T(`${num(1000, 'bn')}+`, '1,000+') : `${num(lo, lang)}–${num(hi, lang)}`);
  const big = [
    { v: T(`${num(census.bangladesh.farmHouseholds / 1e7, 'bn', { dp: 2 })} কোটি`, `${num(census.bangladesh.farmHouseholds / 1e6, 'en', { dp: 1 })} million`), k: T('কৃষক পরিবার সারা দেশে, যাদের প্রতি মৌসুমে এই সিদ্ধান্ত নিতে হয়', 'farm households in Bangladesh, each making this choice every season'), src: T('কৃষি শুমারি ২০১৯ (বিবিএস)', 'Agriculture Census 2019 (BBS)') },
    { v: T(`${num(BORO_HA / 1e5, 'bn', { dp: 1 })} লাখ হেক্টর`, `${num(BORO_HA / 1e6, 'en', { dp: 2 })} million ha`), k: T('বোরো ধানের জমি: এখানেই সেচের পানি বাঁচানোর সবচেয়ে বড় সুযোগ', 'of Boro rice: the biggest chance to save irrigation water'), src: T('বিবিএস ২০২২-২৩', 'BBS 2022-23') },
    { v: T(`${num(people / 1e5, 'bn', { dp: 1 })} লাখ`, `${num(people / 1e6, 'en', { dp: 2 })} million`), k: T(`মানুষ সাত বিভাগের ${num(rows.length, 'bn')}টি উপজেলায়, যেখানে অ্যাপ আজ পুরো চলে`, `people in the ${rows.length} upazilas, one per division, where the app runs in full today`), src: T('জনশুমারি ২০২২ (বিবিএস)', 'Population Census 2022 (BBS)') },
  ];
  return (
    <section id="impact" className="scroll-mt-20 py-16 sm:py-20">
      <div className="page-shell">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="text-[32px] font-bold sm:text-[40px]">{T('কারা উপকার পাবে, কতজন', 'Who it is for, and how many')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('প্রতিটি হিসাবের উপকরণ সারা দেশের জন্য খোলা (নাসার উপগ্রহ, বিশ্বের মাটির মানচিত্র, সরকারি পরিসংখ্যান), তাই নতুন উপজেলা যোগ করা মানে একই স্ক্রিপ্ট আবার চালানো। নিচের সারণির শেষ তিন ঘর নাসার SEDAC থেকে, প্রতিটি উপজেলার নিজের সীমানার ভেতরে মাপা।', 'Every input is open for the whole country (NASA satellites, the global soil map, official statistics), so adding an upazila means running the same scripts again. The last three columns below are from NASA SEDAC, measured inside each upazila’s own boundary.')}</p>
          </div>
          <Tags list={['RECORD']} />
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-3" data-stagger>
          {big.map((b) => (
            <div key={b.src} data-reveal className="glass flat rounded-[22px] p-5">
              <div className="font-display text-[34px] font-bold leading-none tabular text-primary-800">{b.v}</div>
              <p className="mt-2 text-[15px] leading-6 text-ink">{b.k}</p>
              <p className="mt-2 text-[12.5px] text-muted">{b.src}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="glass flat mt-5 overflow-hidden rounded-[22px]">
          {/* Phones: one small card per upazila, so the SEDAC numbers are not hidden off to the side of a table. */}
          <div className="sm:hidden">
            <h3 className="px-5 pt-4 text-[15px] font-bold">{T('সাত উপজেলা, এক নজরে', 'The seven upazilas at a glance')}</h3>
            <ul className="mt-2 divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-2"><span className="font-semibold">{L(r.u.name)} <span className="text-[12px] font-normal text-muted">{L(r.u.division)}</span></span><span className="tabular text-[14px]">{T(`${num(r.people, 'bn')} জন`, `${num(r.people, 'en')} people`)}</span></div>
                  <dl className="mt-1.5 grid grid-cols-3 gap-2 text-[12px]">
                    <div><dt className="text-muted">{T('প্রতি বর্গকিমি', 'Per km²')}</dt><dd className="font-semibold tabular">{density(r.sd.density.medianClass)}</dd></div>
                    <div><dt className="text-muted">{T('১০ মি-এর নিচে', 'Below 10 m')}</dt><dd className={`font-semibold tabular ${r.sd.leczShare >= 0.5 ? 'text-sky-800' : ''}`}>{pct(r.sd.leczShare, lang)}</dd></div>
                    <div><dt className="text-muted">{T('ফসলি জমি', 'Cropland')}</dt><dd className="font-semibold tabular">{r.sd.croplandShare == null ? '–' : pct(r.sd.croplandShare, lang)}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <caption className="px-5 pt-4 text-left text-[15px] font-bold text-ink sm:px-6">{T('সাত উপজেলা, এক নজরে', 'The seven upazilas at a glance')}</caption>
            <thead className="text-[12.5px] text-muted">
              <tr>
                {[T('উপজেলা', 'Upazila'), T('মানুষ (২০২২)', 'People (2022)'), T('প্রতি বর্গকিমিতে মানুষ', 'People per km²'), T('১০ মিটারের নিচে নিচু জমি', 'Low land below 10 m'), T('ফসলি জমি', 'Cropland')].map((h, i) => (
                  <th key={h} scope="col" className={`px-3.5 py-2.5 font-semibold sm:px-6 ${i ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="px-3.5 py-2.5 text-left font-semibold sm:px-6">{L(r.u.name)}<span className="block text-[12px] font-normal text-muted">{L(r.u.division)}</span></th>
                  <td className="px-3.5 py-2.5 text-right tabular sm:px-6">{num(r.people, lang)}</td>
                  <td className="px-3.5 py-2.5 text-right tabular sm:px-6">{density(r.sd.density.medianClass)}</td>
                  <td className={`px-3.5 py-2.5 text-right tabular sm:px-6 ${r.sd.leczShare >= 0.5 ? 'font-bold text-sky-800' : ''}`}>{pct(r.sd.leczShare, lang)}</td>
                  <td className="px-3.5 py-2.5 text-right tabular sm:px-6">{r.sd.croplandShare == null ? '–' : pct(r.sd.croplandShare, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="px-5 pb-4 pt-2 text-[12.5px] leading-5 text-muted sm:px-6">
            {T(`${coast.map((r) => r.u.name.bn).join(', ')}-এর অর্ধেকের বেশি জমি সমুদ্রের সঙ্গে যুক্ত ১০ মিটারের নিচের নিচু অঞ্চলে: সেখানে বন্যার পানি দেরিতে নামে, আর সমুদ্রের কাছে জোয়ার, জলোচ্ছ্বাস আর লবণ আগে পৌঁছায়। তাই সেখানে আগাম আর পানি-সহিষ্ণু ফসল, উপকূলে লবণ-সহিষ্ণু জাতের হিসাব আগে আসে। `, `More than half of ${coast.map((r) => r.u.name.en).join(', ')} lies in the low zone joined to the sea, below 10 m: floods drain slowly there, and near the sea tides, surges and salt arrive first. So early and flood-tolerant crops, and on the coast salt-tolerant varieties, come first there. `)}
            {T('উৎস: জনসংখ্যা বিবিএস জনশুমারি ২০২২; ঘনত্ব নাসা SEDAC GPW v4.11 (২০২০, মাঝামাঝি শ্রেণি); নিচু উপকূল নাসা SEDAC LECZ v3; ফসলি জমি নাসা SEDAC Global Agricultural Lands (২০০০)। SEDAC-এর স্তরগুলো নাসা GIBS থেকে পড়া।', 'Sources: people, BBS Population Census 2022; density, NASA SEDAC GPW v4.11 (2020, median class); low coast, NASA SEDAC LECZ v3; cropland, NASA SEDAC Global Agricultural Lands (2000). SEDAC layers read through NASA GIBS.')}
          </p>
        </div>
      </div>
    </section>
  );
}
