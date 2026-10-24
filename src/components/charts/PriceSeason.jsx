// When a crop's price usually falls, month by month, from DAM's national monthly prices [REAL],
// plus this week's Dhaka retail price where DAM's weekly report lists the crop.
import { useStore } from '../../store.jsx';
import { PRICE_SEASONS, noHarvestPrices } from '../../engine/glut.js';
import { num, fmtDate, parseISO, bnDigits } from '../../engine/dates.js';
import { Tags } from '../ui';
import MARKET from '../../data/market/market_dhaka.json';

const MONTHS = { bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
const FULL = { bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
const ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // a Rabi year, sowing to the next sowing
// app crop -> item in DAM's weekly Dhaka retail report (wheat is sold to shoppers as flour)
const RETAIL = { boro: 'rice_coarse', lentil: 'lentil_coarse', wheat: 'atta_loose' };
const PRICE_TYPE = { growers: { bn: 'কৃষকের বিক্রয়মূল্য', en: 'farm-gate price' }, wholesale: { bn: 'পাইকারি দাম', en: 'wholesale price' } };

export default function PriceSeason({ crop, cropLabel }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const c = PRICE_SEASONS.crops[crop];
  const retail = MARKET.items.find((i) => i.key === RETAIL[crop]);
  if (!c) return <p className="text-[13.5px] text-muted">{T('এই ফসলের দামের যথেষ্ট তথ্য কৃষি বিপণন অধিদপ্তরে (DAM) নেই।', 'DAM does not have enough price data for this crop.')}</p>;
  const yrs = Object.keys(c.years);
  const known = ORDER.filter((m) => c.index[m - 1] != null);
  const lo = known.reduce((a, m) => (c.index[m - 1] < c.index[a - 1] ? m : a), known[0]);
  const hi = Math.max(...known.map((m) => c.index[m - 1]));
  const top = Math.max(1.2, hi);
  const pct = (v) => Math.round(Math.abs(1 - v) * 100);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[19px] font-bold">{T('দাম কখন কমে', 'When prices fall')}</h2>
        <Tags list={['REAL']} />
      </div>
      <p className="mt-1 text-[13px] leading-5 text-muted">
        {T(`${cropLabel}, ${L(PRICE_TYPE[c.priceType])}, সারা দেশের মাসিক গড়, ${bnDigits(yrs[0])}–${bnDigits(yrs[yrs.length - 1])}। প্রতি বছরের স্বাভাবিক দাম = ১০০।`, `${cropLabel}, ${L(PRICE_TYPE[c.priceType])}, national monthly average, ${yrs[0]}–${yrs[yrs.length - 1]}. Each year's normal price = 100.`)}
      </p>
      <div className="relative mt-3 flex h-24 items-end gap-[3px]" role="img" aria-label={T(`সবচেয়ে কম দাম ${FULL.bn[lo - 1]} মাসে`, `Lowest price in ${FULL.en[lo - 1]}`)}>
        {ORDER.map((m) => {
          const v = c.index[m - 1], dip = c.dipMonths.includes(m);
          return (
            <div key={m} className="relative flex h-full flex-1 items-end" title={v == null ? T('তথ্য নেই', 'No data') : `${L({ bn: FULL.bn[m - 1], en: FULL.en[m - 1] })}: ${num(v * 100, lang)}`}>
              {v == null
                ? <div className="w-full rounded-t-[3px] border border-dashed border-border" style={{ height: '12%' }} />
                : <div className={`w-full rounded-t-[3px] ${dip ? 'bg-paddy-500' : 'bg-primary-300'}`} style={{ height: `${(v / top) * 100}%` }} />}
            </div>
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink/30" style={{ bottom: `${(1 / top) * 100}%` }} title="100" />
      </div>
      <div className="mt-1 flex gap-[3px] text-center text-[10.5px] text-muted">{ORDER.map((m) => <span key={m} className="flex-1 truncate">{MONTHS[lang][m - 1]}</span>)}</div>
      <p className="mt-3 text-[13.5px] leading-6">
        {noHarvestPrices(crop)
          ? T('ফসল তোলার মাসগুলোর (ডিসেম্বর–জুন) দাম DAM-এর তথ্যে প্রায় নেই, তাই এই সময়ে দাম কমে কি না বলা যাচ্ছে না।', 'DAM has almost no prices for the harvest months (December–June), so we cannot tell whether prices fall then.')
          : c.dipMonths.length
          ? T(`সাধারণত ${c.dipMonths.map((m) => FULL.bn[m - 1]).join(', ')} মাসে দাম স্বাভাবিকের চেয়ে অন্তত ১০% কম থাকে। সবচেয়ে কম ${FULL.bn[lo - 1]} মাসে, প্রায় ${num(pct(c.index[lo - 1]), 'bn')}% কম।`, `Prices usually sit at least 10% below normal in ${c.dipMonths.map((m) => FULL.en[m - 1]).join(', ')}. Lowest in ${FULL.en[lo - 1]}, about ${pct(c.index[lo - 1])}% below.`)
          : T(`কোনো মাসেই দাম স্বাভাবিকের চেয়ে ১০% বা তার বেশি কমে না। সবচেয়ে কম ${FULL.bn[lo - 1]} মাসে, প্রায় ${num(pct(c.index[lo - 1]), 'bn')}% কম।`, `No month falls 10% or more below normal. Lowest in ${FULL.en[lo - 1]}, about ${pct(c.index[lo - 1])}% below.`)}
      </p>
      {retail && (
        <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-[13px] leading-5 text-muted">
          {T(`এই সপ্তাহে ঢাকায় খুচরা ${retail.bn}: `, `Dhaka retail ${retail.en.toLowerCase()} this week: `)}
          <b className="tabular text-ink">৳{num(retail.price, lang, { dp: 1 })}/{T('কেজি', 'kg')}</b>
          {T(` (গত বছর ৳${num(retail.lastYear, 'bn', { dp: 1 })}), সপ্তাহ শুরু ${fmtDate(parseISO(MARKET.week), 'bn')}`, ` (a year ago ৳${num(retail.lastYear, 'en', { dp: 1 })}), week of ${fmtDate(parseISO(MARKET.week), 'en')}`)}
        </p>
      )}
      <p className="mt-2 text-[12px] text-muted">{T('উৎস: কৃষি বিপণন অধিদপ্তর (DAM), market.dam.gov.bd', 'Source: Department of Agricultural Marketing (DAM), market.dam.gov.bd')}</p>
    </div>
  );
}
