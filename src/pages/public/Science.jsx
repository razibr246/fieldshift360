// "The science, plainly": the words the app uses (evapotranspiration, NDVI, soil-moisture anomaly, water balance and
// the rest) in a farmer's words; how datasets taken at very different scales are brought down to one field and one
// season; how a satellite's view differs from a measurement on the ground, and how the app combines both; and which
// methods sit behind each answer, with their uncertainty and where local knowledge has to check them.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Satellite, Ruler, Layers, Scale, Users, ArrowRight, Tag as TagIcon, Database, GitCompare, ClipboardCheck, Droplets, Leaf, Thermometer, CloudRain, Mountain, Waves, Sprout, Wind, Snowflake, FlaskConical } from 'lucide-react';
import { useStore } from '../../store';
import { Tags, TagLegend } from '../../components/ui';
import { num, bnDigits } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { rainCrossCheck } from '../../engine/climate';
import { disagreements, modelSpread } from '../../engine/provenance';
import { fieldTerrain } from '../../engine/briefs';
import { fieldGreen, stressMethods, landRecord } from '../../engine/landsat';
import { MODEL, placeVerdict, treeQuestions } from '../../engine/stressModel';
import { UPAZILAS } from '../../data/upazilas';
import { RABI_CROPS, ROTATION_CROPS } from '../../engine/crops';
import { reviewOf } from '../../data/reviews';
import deltas from '../../data/climate/cmip6_deltas.json';
import DataCoverage from '../../components/explain/DataCoverage';
import TrendMap from '../../components/map/TrendMap';

const t = (bn, en) => ({ bn, en });
const TERMS = [
  { icon: Droplets, term: t('বাষ্পীভবন-প্রস্বেদন (ET)', 'Evapotranspiration (ET)'), say: t('মাটি থেকে উবে যাওয়া পানি আর গাছের পাতা দিয়ে বেরিয়ে যাওয়া পানি, একসঙ্গে। গরম, রোদ আর বাতাস যত বেশি, তত বেশি। ফসলের যতটা দরকার তার যে অংশ বৃষ্টি দেয় না, সেটাই সেচ।', 'Water lost from the soil plus water the plants breathe out through their leaves. More heat, sun and wind, more of it. Whatever part of the crop’s need the rain does not cover is the irrigation.') },
  { icon: Wind, term: t('রেফারেন্স ET₀ আর ফসল-সহগ Kc', 'Reference ET₀ and crop coefficient Kc'), say: t('ET₀ হলো ছাঁটা ঘাসের মাঠ থেকে কতটা পানি যায় (আবহাওয়া থেকে হিসাব)। Kc বলে একটা ফসল সেই তুলনায় কত পানি খায়: চারায় কম, ফুলে-দানায় বেশি। ফসলের পানি = ET₀ × Kc (FAO-56)।', 'ET₀ is the water a mown grass field loses, worked out from the weather. Kc says how much more or less a crop uses than that: little as a seedling, most at flowering and grain fill. Crop water = ET₀ × Kc (FAO-56).') },
  { icon: Leaf, term: t('এনডিভিআই (NDVI)', 'NDVI'), say: t('উপগ্রহ লাল আর অদৃশ্য নিকট-লাল আলো মাপে। সবুজ সুস্থ পাতা লাল আলো খায়, নিকট-লাল ফিরিয়ে দেয়। তা থেকে −১ থেকে ১-এর একটা সংখ্যা: খালি মাটি ০.১–০.২, ঘন সবুজ ফসল ০.৬–০.৮। নিজের স্বাভাবিকের চেয়ে কম হলে গাছ চাপে আছে।', 'A satellite measures red and invisible near-infrared light. Healthy green leaves absorb red and reflect near-infrared, giving a number from −1 to 1: bare soil 0.1–0.2, dense green crop 0.6–0.8. Below its usual value, the crop is under stress.') },
  { icon: Waves, term: t('মাটির আর্দ্রতা আর তার অসংগতি', 'Soil moisture and its anomaly'), say: t('মাটিতে কতটা পানি আছে (প্রতি ঘনমিটার মাটিতে কত ঘনমিটার পানি)। অসংগতি মানে এ বছরের মান ওই মাসের বহু বছরের গড়ের চেয়ে কত বেশি বা কম: শূন্যের নিচে মানে স্বাভাবিকের চেয়ে শুকনো।', 'How much water the soil holds (cubic metres of water per cubic metre of soil). The anomaly is how far this year sits above or below the many-year average for the same month: below zero means drier than usual.') },
  { icon: Scale, term: t('পানির হিসাব (water balance)', 'Water balance'), say: t('মাটির শিকড়ের অংশকে একটা পাত্র ভাবুন: বৃষ্টি আর সেচ ঢোকে, ET বেরোয়, বেশি হলে নিচে চুইয়ে যায়। পাত্র কতটা খালি তা থেকেই "আজ কি সেচ লাগবে"।', 'Think of the root zone as a bucket: rain and irrigation go in, ET goes out, any overflow drains down. How empty the bucket is gives "do I water today".') },
  { icon: Thermometer, term: t('বাতাসের তাপ বনাম মাটির উপরিতলের তাপ', 'Air temperature versus land surface temperature'), say: t('আবহাওয়া কেন্দ্র মাটি থেকে দুই মিটার ওপরে ছায়ায় বাতাস মাপে। উপগ্রহ (MODIS) মাপে মাটি আর পাতার উপরিতল, রোদে যা অনেক বেশি গরম হয়। ফসল দুটোই টের পায়।', 'A weather station measures the air in shade two metres up. A satellite (MODIS) measures the surface of soil and leaves, which runs much hotter in the sun. The crop feels both.') },
  { icon: Snowflake, term: t('ঠান্ডা আর কুয়াশার ঝুঁকি (তুষার নয়)', 'Cold and fog risk (not frost)'), say: t('বাংলাদেশে তুষারপাত হয় না, কিন্তু পৌষ-মাঘে রাত ১০°-এর নিচে নামলে বোরোর চারা হলুদ হয়, আর ঘন কুয়াশায় পাতায় ছত্রাক ছড়ায়। অ্যাপ এই ঠান্ডা রাত গোনে।', 'Bangladesh has no frost, but nights below 10 °C in Poush and Magh yellow Boro seedlings, and thick fog spreads leaf fungus. The app counts those cold nights.') },
  { icon: CloudRain, term: t('চরম বৃষ্টি', 'Extreme rainfall'), say: t('এক দিনে বা টানা তিন দিনে এত বৃষ্টি যে জমিতে পানি জমে, পাকা ফসল নষ্ট হয়। প্রতিটি ফসলের নিজের সীমা আছে (যেমন সরিষা পাকার সময় ৩০ মিমি)।', 'So much rain in a day, or three days running, that water stands in the field and ripe crop spoils. Each crop has its own limit (30 mm while mustard ripens, for example).') },
  { icon: Mountain, term: t('মাটির নিচের পানি (GRACE)', 'Water underground (GRACE)'), say: t('দুটি উপগ্রহ একে অপরকে অনুসরণ করে পৃথিবীর মাধ্যাকর্ষণ মাপে। মাটির নিচে পানি কমলে ভর কমে, মাধ্যাকর্ষণ সামান্য বদলায়। তা থেকে একটা অঞ্চলে জমা পানি বছরে কত কমছে।', 'Two satellites chase each other round the Earth and measure its gravity. When water drains from underground the mass drops and gravity changes slightly, showing how much stored water a region loses each year.') },
  { icon: Sprout, term: t('ডাল ফসল, ঢাকনা ফসল, গভীর শিকড়', 'Legumes, cover crops, deep roots'), say: t('ডাল (মসুর, মুগ) শিকড়ের গুটিতে বাতাস থেকে নাইট্রোজেন ধরে। ঢাকনা ফসল খালি মাসে মাটি ঢেকে রাখে, বৃষ্টিতে মাটি ধুয়ে যায় না। গভীর শিকড় (সরিষা, পাট, তিল) ধানের শক্ত তলা ভেঙে পানি নিচে নামতে দেয়।', 'Legumes (lentil, mung) fix nitrogen from the air in their root nodules. A cover crop keeps the soil covered in bare months so rain does not wash it away. Deep roots (mustard, jute, sesame) break the rice plough pan and let water soak down.') },
  { icon: FlaskConical, term: t('মাটির জৈব পদার্থ', 'Soil organic matter'), say: t('মাটিতে পচে মিশে থাকা গাছের অংশ। পানি ধরে রাখে, পুষ্টি জোগায়, মাটি ঝুরঝুরে রাখে। শিকড়, খড় আর ডালের লতা এটা বাড়ায়; প্রতি বছর কাদা করা আর পোড়ানো কমায়।', 'Rotted plant matter mixed into the soil. It holds water, feeds the crop and keeps the soil crumbly. Roots, straw and pulse haulm build it; puddling every year and burning wear it down.') },
];

// Each dataset at its own scale, and how it is brought to the field and the season.
const SCALES = [
  ['NASA POWER', t('০.৫° × ০.৬২৫° (প্রায় ৫০ কিমি), দৈনিক', '0.5° × 0.625° (about 50 km), daily'), t('জমির ঘরের বিন্দু; কাছের আবহাওয়া কেন্দ্রের স্বাভাবিকের সঙ্গে তাপ মেলানো; ২৫ মৌসুমে ফসলের নিয়ম চালানো', 'The point for the field’s cell; temperatures matched to the nearest BMD station’s normals; crop rules run over 25 seasons')],
  ['GPM IMERG', t('০.১° (প্রায় ১০ কিমি), দৈনিক', '0.1° (about 10 km), daily'), t('একই বিন্দু; মৌসুমের মোট বৃষ্টি POWER-এর সঙ্গে মিলিয়ে দেখা', 'The same point; season totals checked against POWER')],
  ['MODIS NDVI · LST', t('০.০৫° (প্রায় ৫ কিমি), মাসিক', '0.05° (about 5 km), monthly'), t('উপজেলার মাঝখানের ৩×৩ পিক্সেলের মধ্যমা; মাসিক মান থেকে প্রতিটি মাসের স্বাভাবিক আর এ বছরের ফারাক', 'Median of the 3×3 pixels at the upazila centre; each month’s usual value and this year’s departure')],
  ['MERRA-2', t('০.৫° × ০.৬২৫°, মাসিক', '0.5° × 0.625°, monthly'), t('মাসিক বাষ্পীভবন-প্রস্বেদন, FAO-56 হিসাবের পাশে', 'Monthly evapotranspiration, beside the FAO-56 working')],
  ['SMAP L4', t('৯ কিমি, দিনে কয়েকবার', '9 km, several times a day'), t('মাসে দুই দিনের নমুনা, মাসের গড়', 'Two days a month sampled, averaged per month')],
  ['GRACE / GRACE-FO', t('প্রায় ৩০০ কিমি (ম্যাসকন), মাসিক', 'about 300 km (mascons), monthly'), t('অঞ্চলের প্রবণতা, জমির নয়', 'A regional trend, not the field’s')],
  ['NEX-GDDP-CMIP6', t('০.২৫°, মাসিক পরিবর্তন', '0.25°, monthly change'), t('প্রতিটি মডেলের মাসিক পরিবর্তন জমির ২৫ বছরের আবহাওয়ায় যোগ (delta পদ্ধতি)', 'Each model’s monthly change added to the field’s own 25 years (the delta method)')],
  ['SRTM + ASTER', t('৩০ মিটার, ২০০০–২০১৩', '30 m, 2000–2013'), t('দুই মডেলের গড়: জমি আর তার চারপাশের উচ্চতা থেকে নিচু জমি আর ঢাল; দুটোর অমিলই জমির অনিশ্চয়তা', 'The mean of two models: height at the field and round it, for hollows and slopes; their disagreement is the field’s uncertainty')],
  ['MODIS MOD13Q1', t('২৫০ মিটার, ১৬ দিনে একবার', '250 m, every 16 days'), t('জমির কেন্দ্রের পিক্সেল, প্রতি রবির জানুয়ারি-ফেব্রুয়ারি: কোন বছর ফসল চাপে ছিল', 'The pixel at the field’s centre, each Rabi’s January–February: the years the crop was stressed')],
  ['Sentinel-2 / HLS', t('১০–৩০ মিটার, ৫ দিনে একবার', '10–30 m, every 5 days'), t('জমির সীমানার ভেতরের পিক্সেল: কোন ফসল, কতটা সবুজ', 'The pixels inside the field boundary: which crop, how green')],
  ['ISRIC SoilGrids', t('২৫০ মিটার, একবার', '250 m, once'), t('জমির ঘরের মাটি: কার্বন, pH, বুনট, ঘনত্ব', 'The field’s cell: carbon, pH, texture, density')],
];

const METHODS = [
  { k: t('নিয়ম মেনে পুরোনো বছর চালানো (backtest)', 'Replaying past years by rule (backtest)'), u: t('কোন তারিখে লাগালে কত বছর ঠিকঠাক গেছে', 'Which sowing day went well in how many years'), q: t('নিয়মগুলো বই থেকে নেওয়া সীমা; স্থানীয় জাত অন্য রকম হতে পারে', 'The thresholds come from the guides; local varieties may differ') },
  { k: t('মাটির কার্বন মডেল (ICBM)', 'Soil carbon model (ICBM)'), u: t('দশ বছরে জৈব পদার্থ কোন দিকে যায়', 'Which way organic matter goes in ten years'), q: t('দিক বিশ্বাসযোগ্য, সঠিক মান নয়; শুরুর কার্বন একটা মাটি পরীক্ষায় ঠিক হবে', 'The direction is sound, not the exact number; a soil test would fix the starting carbon') },
  { k: t('আটটি জলবায়ু মডেলের দল (ensemble)', 'An ensemble of eight climate models'), u: t('কোন ফসলচক্র কতগুলো ভবিষ্যতে টেকে', 'In how many futures a rotation holds'), q: t('মডেলগুলোর মতের অমিলই অনিশ্চয়তা; আমরা সবচেয়ে খারাপ মডেলটাও দেখাই', 'Their disagreement is the uncertainty; the worst model is shown too') },
  { k: t('প্যাটার্ন মেলানো (উপগ্রহে কোন ফসল)', 'Pattern matching (which crop the satellite saw)'), u: t('জমির সবুজের বাঁক কোন ফসলের সঙ্গে মেলে, কত শতাংশ মিল', 'Which crop the field’s green curve fits, and how well'), q: t('৭০ শতাংশের কম মিল হলে নিশ্চিত ধরা হয় না; কৃষকের কথাই শেষ', 'Under a 70% fit it is not taken as certain; the farmer’s word is final') },
  { k: t('কাছাকাছি একই সমস্যার দল (DBSCAN)', 'Clusters of the same problem nearby (DBSCAN)'), u: t('কর্মকর্তার কাছে এলাকার সতর্কতা', 'Area alerts for the officer'), q: t('বার্তা যাওয়ার আগে কর্মকর্তা দেখে অনুমোদন দেন', 'The officer reads and approves every message before it goes') },
];

export default function Science() {
  const { T, L, s, clim, upazila, activeParcel } = useStore();
  const lang = s.lang;
  const cross = useMemo(() => (clim ? rainCrossCheck(clim) : null), [clim]);
  const terrain = fieldTerrain(activeParcel?.id);
  const dis = useMemo(() => disagreements({ cross, terrain, field: fieldGreen(activeParcel?.id, upazila.id), spread: modelSpread(deltas, upazila.id) }), [cross, terrain, activeParcel?.id, upazila.id]);
  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <div className="hero-rise max-w-3xl">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><BookOpen size={15} />{T('সহজ ভাষায় বিজ্ঞান', 'The science, plainly')}</p>
        <h1 className="mt-5 text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[56px]">{T('উপগ্রহ থেকে আপনার জমি পর্যন্ত', 'From the satellite to your field')}</h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-[1.7] text-ink/70">{T('অ্যাপের কঠিন শব্দগুলোর মানে, আলাদা আলাদা মাপের তথ্য কীভাবে একটা জমি আর একটা মৌসুমে আনা হয়, উপগ্রহের মাপ আর মাটির মাপের ফারাক, আর কোথায় আপনার অভিজ্ঞতা দিয়ে যাচাই করতে হবে।', 'What the app’s hard words mean, how data taken at very different scales is brought down to one field and one season, how a satellite’s view differs from a measurement on the ground, and where your own experience has to check it.')}</p>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><BookOpen size={20} className="text-primary-700" />{T('শব্দকোষ', 'Glossary')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-stagger>
          {TERMS.map((x) => (
            <article key={x.term.en} className="glass flat rounded-[22px] p-5">
              <h3 className="flex items-center gap-2 text-[16.5px] font-bold"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><x.icon size={18} /></span>{L(x.term)}</h3>
              <p className="mt-2 text-[14.5px] leading-7 text-ink/80">{L(x.say)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><Ruler size={20} className="text-primary-700" />{T('আলাদা মাপের তথ্য, একটা জমিতে', 'Many scales, one field')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('একটা উপগ্রহ ৩০ মিটারের ঘর দেখে, আরেকটা ৩০০ কিলোমিটারের; একটা প্রতিদিন, আরেকটা মাসে একবার। অ্যাপ সবগুলোকে একই বিশ্লেষণের একক, অর্থাৎ "আপনার জমি, একটা মৌসুম", এ নামিয়ে আনে: বড় ঘর থেকে জমির বিন্দুর মান, ছোট ঘর থেকে জমির ভেতরের পিক্সেলের গড়, প্রতিদিনের মান থেকে মৌসুমের মোট বা গড়।', 'One satellite sees 30-metre squares, another 300-kilometre ones; one every day, another once a month. The app brings them all to one unit of analysis, “your field, one season”: the value at the field’s point from coarse grids, the average of the pixels inside the field from fine ones, and season totals or means from daily values.')}</p>
        <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="bg-canvas text-[13px] text-muted"><tr><th className="px-4 py-2.5 font-semibold">{T('তথ্য', 'Data')}</th><th className="px-4 py-2.5 font-semibold">{T('নিজের মাপ', 'Its own scale')}</th><th className="px-4 py-2.5 font-semibold">{T('জমি আর মৌসুমে আনা হয় যেভাবে', 'How it reaches the field and the season')}</th></tr></thead>
            <tbody>{SCALES.map(([d, sc, how]) => <tr key={d} className="border-t border-border"><td className="px-4 py-2.5 font-semibold">{d}</td><td className="px-4 py-2.5 tabular">{L(sc)}</td><td className="px-4 py-2.5 text-ink/80">{L(how)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="glass flat rounded-[24px] p-6">
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><Satellite size={20} className="text-sky-700" />{T('উপগ্রহ বনাম মাটির মাপ', 'Satellite versus ground')}</h2>
          <ul className="mt-3 space-y-2.5 text-[15px] leading-7 text-ink/80">
            <li>{T('আবহাওয়া কেন্দ্র একটা বিন্দুতে ঠিক মাপে, কিন্তু কেন্দ্র কম, আপনার জমি থেকে দূরে।', 'A weather station measures one point exactly, but stations are few and far from your field.')}</li>
            <li>{T('উপগ্রহ সব জায়গা দেখে, প্রতিদিন, কিন্তু একটা বড় ঘরের গড়; মেঘ, ছায়া আর হিসাবের ধাপে ভুল ঢোকে।', 'A satellite sees everywhere, every day, but as the average of a large square; cloud, shadow and the steps of retrieval add error.')}</li>
            <li>{T('অ্যাপ দুটো মেলায়: নাসা POWER-এর তাপ কাছের বিএমডি কেন্দ্রের ৩০ বছরের স্বাভাবিকের সঙ্গে মেলানো হয়; দুটি আলাদা বৃষ্টির উৎস একে অপরকে যাচাই করে; আর আপনি "মাটি ভেজা / শুকনো" বললে সেচের হিসাব আপনার কথাই মানে।', 'The app combines them: NASA POWER temperatures are matched to the nearest BMD station’s 30-year normals; two independent rain sources check each other; and when you say “the soil is wet / dry”, the watering advice takes your word.')}</li>
          </ul>
          {cross && (
            <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-[14.5px] leading-7 text-sky-950">
              {T(`এখনই, ${upazila.name.bnOf ?? upazila.name.bn} ২৫ রবি মৌসুমে নাসা POWER আর GPM IMERG উপগ্রহের বৃষ্টির মিল r = ${num(cross.rabi.r, 'bn', { dp: 2 })}; বর্ষায় r = ${num(cross.monsoon.r, 'bn', { dp: 2 })}। গড় রবির বৃষ্টি: POWER ${num(cross.rabi.power, 'bn')} মিমি, IMERG ${num(cross.rabi.imerg, 'bn')} মিমি।`, `Right now, over ${upazila.name.en}’s 25 Rabi seasons, NASA POWER and GPM IMERG satellite rain agree at r = ${cross.rabi.r.toFixed(2)}; in the monsoon r = ${cross.monsoon.r.toFixed(2)}. Mean Rabi rain: POWER ${Math.round(cross.rabi.power)} mm, IMERG ${Math.round(cross.rabi.imerg)} mm.`)}
              <span className="ml-1 inline-block align-middle"><Tags list={['MODEL', 'SAT']} /></span>
            </div>
          )}
        </div>
        <div className="glass flat rounded-[24px] p-6">
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><Layers size={20} className="text-primary-700" />{T('কোন পদ্ধতি কী বলে, কতটা নিশ্চিত', 'What each method says, and how sure')}</h2>
          <ul className="mt-3 space-y-3">
            {METHODS.map((m) => (
              <li key={m.k.en} className="rounded-2xl border border-border bg-white p-3.5">
                <p className="text-[15px] font-bold">{L(m.k)}</p>
                <p className="mt-0.5 text-[14px] text-ink/80">{L(m.u)}</p>
                <p className="mt-1 text-[13.5px] text-paddy-700">{T('অনিশ্চয়তা: ', 'Uncertainty: ')}{L(m.q)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="labels" className="mt-12 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><TagIcon size={20} className="text-primary-700" />{T('প্রতিটি সংখ্যার পাশের লেবেল', 'The label beside every number')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('উপগ্রহে দেখা, স্টেশনে মাপা, মডেলে আনুমানিক, প্রকাশিত রেকর্ড, নিয়মে ধরা আর নমুনা: সারা অ্যাপে একই লেবেল, যাতে বোঝা যায় কোন সংখ্যা কতটা সরাসরি মাপ।', 'Seen by satellite, measured at a station, estimated by a model, a published record, assumed by a rule, or sample: the same labels across the app, so you can tell how direct each number is.')}</p>
        <TagLegend className="mt-4 rounded-[22px] border border-border bg-white p-4" />
      </section>

      <section id="trends" className="mt-12 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><Satellite size={20} className="text-primary-700" />{T('বছরের পর বছর: মানচিত্রে দীর্ঘ ধারা', 'Year after year: long-term trends on a map')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('সাত উপজেলা আর প্রতিবেশী পাঁচ দেশের খামারে মাটির নিচের পানি, রবির সবুজ আর মাটির ভেজা ভাব কীভাবে বদলেছে। চালু করে বছরগুলো চলতে দেখুন।', 'How water underground, Rabi greenness and soil water have changed at the seven upazilas and the five neighbouring farms. Press play and watch the years go by.')}</p>
        <div className="mt-4 rounded-[22px] border border-border bg-white p-4"><TrendMap /></div>
      </section>

      <section id="coverage" className="mt-12 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><Database size={20} className="text-primary-700" />{T('কোন তথ্য আছে, কোনটা নেই', 'Data coverage and gaps')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('প্রতিটি উৎস: কী ধরনের প্রমাণ, হিসাবে ঢোকে না শুধু পাশে দেখানো, কোন বছর, কত বড় এলাকার, আর এই জমির জন্য আছে কি না, পুরোনো কি না।', 'Every source: what kind of evidence, whether it enters the calculation or is only shown beside it, which years, over how large an area, and whether it is here, and current, for this field.')}</p>
        <div className="mt-4"><DataCoverage /></div>
      </section>

      <section id="disagree" className="mt-12 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><GitCompare size={20} className="text-primary-700" />{T('যেখানে উৎসগুলো মেলে না', 'Where the sources disagree')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('একই জিনিস দুই উৎসে মাপলে পুরো মেলে না। কতটা অমিল, আর তাতে উত্তর কতটা কম নিশ্চিত, তা এখানে খোলাখুলি।', 'The same thing measured by two sources never agrees exactly. How far they differ, and how much less certain that makes the answer, is set out here.')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dis.map((x) => <Disagree key={x.k} x={x} />)}
        </div>
      </section>

      <MethodsCompare />

      <MachineLearning />

      <section id="rules" className="mt-12 scroll-mt-28">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><ClipboardCheck size={20} className="text-primary-700" />{T('ফসলের নিয়ম আর তাদের যাচাই', 'The crop rules and who has checked them')}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T('প্রতিটি নিয়ম প্রকাশিত গবেষণা থেকে নেওয়া শুরুর মান (উৎস docs/THRESHOLDS.md-এ)। স্থানীয় কৃষিবিদ বা কৃষি কর্মকর্তা যাচাই করলে কে, কবে, কী বদলালেন তা এখানে আর docs/REVIEW_LOG.md-এ লেখা হবে। এখন পর্যন্ত কেউ যাচাই করেননি।', 'Each rule is a starting value from published research (sources in docs/THRESHOLDS.md). When a local agronomist or agriculture officer reviews them, who, when and what changed is recorded here and in docs/REVIEW_LOG.md. So far no one has.')}</p>
        <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="bg-canvas text-[12.5px] text-muted"><tr><th className="px-3 py-2.5 font-semibold">{T('ফসল', 'Crop')}</th><th className="px-3 py-2.5 font-semibold">{T('নিয়ম', 'Rules')}</th><th className="px-3 py-2.5 font-semibold">{T('কারণ', 'Rationale')}</th><th className="px-3 py-2.5 font-semibold">{T('স্থানীয় যাচাই', 'Local review')}</th></tr></thead>
            <tbody>
              {[...Object.values(RABI_CROPS), ...Object.values(ROTATION_CROPS)].filter((c) => c.rules?.length).map((c) => {
                const rv = reviewOf(c.id);
                return (
                  <tr key={c.id} className="border-t border-border align-top">
                    <td className="px-3 py-2.5 font-semibold">{L(c.name)}</td>
                    <td className="px-3 py-2.5 tabular">{num(c.rules.length, lang)}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink/80">{c.rules.map((r) => L(r)).join(' · ')}</td>
                    <td className="px-3 py-2.5 text-[12.5px]">{rv.length ? rv.map((r) => `${r.who}, ${r.when}`).join('; ') : <span className="font-semibold text-amber-800">{T('এখনো হয়নি', 'Not yet')}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 rounded-[28px] bg-primary-950 p-7 text-white sm:p-9">
        <h2 className="flex items-center gap-2 text-[24px] font-bold"><Users size={22} className="text-paddy-300" />{T('যেখানে আপনার বিচারই শেষ কথা', 'Where your judgement has the last word')}</h2>
        <ul className="mt-3 grid gap-2.5 text-[15.5px] leading-7 text-white/85 sm:grid-cols-2">
          <li>{T('আপনার জমির ফলন, জাত আর মাটি পরীক্ষার ফল: মডেলের চেয়ে এগুলোই বেশি সঠিক।', 'Your own yields, varieties and soil-test results: these beat the model.')}</li>
          <li>{T('স্থানীয় বাজার, পাইকার আর দাম: অ্যাপ কেবল জাতীয় দরের ধারা জানে।', 'Local markets, traders and prices: the app only knows national price patterns.')}</li>
          <li>{T('বীজ, যন্ত্র, শ্রমিক আর সেচের পালা: নতুন ফসল এগুলোর ওপর নির্ভর করে।', 'Seed, machines, labour and irrigation turns: a new crop depends on them.')}</li>
          <li>{T('নিচু জমিতে পানি জমা, ঢালে মাটি ধোয়া: মাঠে দাঁড়িয়ে চোখে দেখাই আসল।', 'Water standing on low land, soil washing off a slope: seeing it in the field is what counts.')}</li>
        </ul>
        <Link to="/farmer/future" className="mt-6 inline-flex items-center gap-2 rounded-full bg-paddy-300 px-6 py-3 text-[16px] font-semibold text-primary-950">{T('আপনার জমির ১০ বছর দেখুন', 'See your field’s ten years')}<ArrowRight size={17} /></Link>
      </section>
    </div>
  );
}

const LEVEL = {
  small: { bn: 'অমিল কম', en: 'Small difference', cls: 'bg-primary-50 text-primary-800 ring-primary-200' },
  some: { bn: 'কিছুটা অমিল', en: 'Some difference', cls: 'bg-paddy-50 text-paddy-800 ring-paddy-200' },
  big: { bn: 'বড় অমিল', en: 'Large difference', cls: 'bg-red-50 text-red-800 ring-red-200' },
};
function Disagree({ x }) {
  const { T, L, s } = useStore();
  const n = (v, dp = 0) => num(v, s.lang, { dp });
  const pm = (v, dp = 0) => { const r = Math.round(v * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n(Math.abs(r), dp)}`; };
  const body = {
    rain: {
      h: T('রবির বৃষ্টি: নাসা POWER বনাম GPM IMERG উপগ্রহ', 'Rabi rain: NASA POWER against the GPM IMERG satellite'),
      v: T(`গড় রবিতে POWER ${n(x.a)} মিমি, IMERG ${n(x.b)} মিমি (${x.pct != null ? pm(x.pct) : '–'}%); বছর থেকে বছরে মিল r = ${n(x.r, 2)}।`, `In an average Rabi, POWER ${n(x.a)} mm, IMERG ${n(x.b)} mm (${x.pct != null ? pm(x.pct) : '–'}%); year-to-year agreement r = ${n(x.r, 2)}.`),
      e: T('ফসলের বৃষ্টির নিয়ম POWER-এ চলে। অমিল বেশি হলে "বৃষ্টিতে ক্ষতি" কোন বছর হয়েছে তা নিয়ে কম নিশ্চিত হোন।', 'The crops’ rain rules run on POWER. The larger the gap, the less sure the “rain damage” years are.'),
    },
    terrain: {
      h: T('জমির উচ্চতা: SRTM বনাম ASTER', 'Field height: SRTM against ASTER'),
      v: T(`এই জমিতে দুই মডেল গড়ে ${n(x.spread, 1)} মিটার আলাদা; জমি চারপাশের চেয়ে ${n(Math.abs(x.relief), 1)} মিটার ${x.relief < 0 ? 'নিচু' : 'উঁচু'}।`, `At this field the two models differ by ${n(x.spread, 1)} m on average; the field sits ${n(Math.abs(x.relief), 1)} m ${x.relief < 0 ? 'below' : 'above'} the land round it.`),
      e: T('অমিল নিচুর মাপের চেয়ে বড় হলে "পানি জমে" বলা যায় না: মাঠে দেখে নিন।', 'When the disagreement is larger than the hollow, “water stands here” cannot be claimed: look in the field.'),
    },
    green: {
      h: T('রবির সবুজ: জমির ২৫০ মিটার পিক্সেল বনাম এলাকা', 'Rabi greenness: the field’s 250 m pixel against the area'),
      v: T(`জমি NDVI ${n(x.a, 2)}, এলাকা ${n(x.b, 2)} (${pm(x.diff, 2)})।`, `Field NDVI ${n(x.a, 2)}, area ${n(x.b, 2)} (${pm(x.diff, 2)}).`),
      e: T('বড় ফারাক মানে এলাকার গড় এই জমির কথা বলে না: জমির নিজের মাপকে বেশি গুরুত্ব দেওয়া হয়।', 'A large gap means the area average does not describe this field: the field’s own record is given more weight.'),
    },
    models: {
      h: T('২০৪০-এর দশক: ৮টি জলবায়ু মডেল', 'The 2040s: eight climate models'),
      v: T(`বছরের বৃষ্টির পরিবর্তন ${pm(x.rainMin)}% থেকে ${pm(x.rainMax)}%; রবির দিনের তাপ ${pm(x.heatMin, 1)}° থেকে ${pm(x.heatMax, 1)}°।`, `Change in yearly rain from ${pm(x.rainMin)}% to ${pm(x.rainMax)}%; Rabi daytime heat from ${pm(x.heatMin, 1)}° to ${pm(x.heatMax, 1)}°.`),
      e: T('মডেলগুলো একমত নয়, তাই এদের গড় নয়, প্রতিটি আলাদা চালানো হয় (জমির ভবিষ্যতে ৮ মডেলের পরীক্ষা)।', 'The models do not agree, so each is run on its own rather than averaged (Field Future’s eight-model test).'),
    },
  }[x.k];
  const lv = LEVEL[x.level];
  return (
    <article className="rounded-[22px] border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="text-[15.5px] font-bold">{body.h}</h3><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${lv.cls}`}>{L(lv)}</span></div>
      <p className="mt-1.5 text-[14px] font-semibold leading-6 text-ink/85">{body.v}</p>
      <p className="mt-1 text-[13.5px] leading-6 text-muted">{body.e}</p>
    </article>
  );
}

// Three statistical methods on one field's MODIS record (engine/landsat.js stressMethods): which Rabi seasons each
// calls stressed, where they agree, and what each is good and bad at.
const METHOD = {
  trend: { bn: 'নিজের ধারা থেকে নিচে (অ্যাপ যা ব্যবহার করে)', en: 'Below its own trend (what the app uses)', good: { bn: 'যে জমি বছর বছর সবুজ হচ্ছে, তার পুরোনো সাধারণ বছরকে চাপ বলে না', en: 'Does not call an ordinary early year stressed on a field that has been greening' }, bad: { bn: 'ছোট রেকর্ডে ধারা নিজেই অনিশ্চিত', en: 'On a short record the trend itself is uncertain' } },
  low: { bn: 'সবচেয়ে কম পাঁচ ভাগের এক ভাগ', en: 'The lowest fifth', good: { bn: 'সহজ, বোঝানো যায়, কোনো অনুমান লাগে না', en: 'Simple to explain, assumes nothing' }, bad: { bn: 'জমি সবুজ হতে থাকলে পুরোনো বছরগুলোই বেশি ধরা পড়ে', en: 'If the field greens over time, it mostly picks the early years' } },
  area: { bn: 'এলাকার তুলনায় কম', en: 'Below the area that season', good: { bn: 'সবার ওপর পড়া আবহাওয়া বাদ যায়; থাকে জমির নিজের সমস্যা', en: 'Weather that hit everyone cancels out; the field’s own trouble is left' }, bad: { bn: 'খরার মতো এলাকাজুড়ে চাপ ধরা পড়ে না', en: 'Misses a drought that hit the whole area' } },
};
function MethodsCompare() {
  const { T, L, s, upazila, activeParcel, parcels } = useStore();
  const p = activeParcel ?? parcels.find((x) => x.upazila === upazila.id);
  const m = p ? stressMethods(fieldGreen(p.id, upazila.id), landRecord(upazila.id)?.ndvi) : null;
  if (!m) return null;
  const span = Array.from(new Set(fieldGreen(p.id, upazila.id).rabi.map((r) => r.y))).sort((a, b) => a - b);
  return (
    <section id="methods" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 text-[24px] font-bold"><Layers size={20} className="text-primary-700" />{T('একই তথ্যে তিনটি পদ্ধতি', 'Three methods on the same data')}</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T(`${bnOf(p.name.bn)} ২৫০ মিটার MODIS রেকর্ডে (প্রতি রবির জানুয়ারি-ফেব্রুয়ারি) কোন মৌসুমে ফসল চাপে ছিল, তিনটি আলাদা পরিসংখ্যান পদ্ধতিতে। যেখানে তিনটিই একমত, সেখানেই সবচেয়ে বেশি ভরসা; যেখানে মেলে না, সেখানে মাঠের মানুষের স্মৃতিই ঠিক করবে।`, `Which Rabi seasons were stressed in ${L(p.name)}’s 250 m MODIS record (January–February of each Rabi), by three different statistical methods. Where all three agree, trust it most; where they differ, the memory of the people who farm it decides.`)}</p>
      <div className="mt-4 overflow-x-auto rounded-[22px] border border-border bg-white p-4">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead><tr><th className="w-[230px] pb-2 text-left font-semibold text-muted">{T('পদ্ধতি', 'Method')}</th>{span.map((y) => <th key={y} className="pb-2 text-center font-normal text-muted tabular">{T(`'${bnDigits(String(y).slice(2))}`, `'${String(y).slice(2)}`)}</th>)}</tr></thead>
          <tbody>
            {Object.entries(m.sets).map(([k, ys]) => (
              <tr key={k} className="border-t border-border">
                <td className="py-2 pr-2 font-semibold">{L(METHOD[k])}</td>
                {span.map((y) => <td key={y} className="py-2 text-center">{ys.includes(y) ? <span className={`mx-auto block h-3.5 w-3.5 rounded-full ${m.all.includes(y) ? 'bg-red-600' : 'bg-amber-500'}`} title={String(y)} /> : <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-black/10" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[13.5px] leading-6">{m.all.length
          ? T(`তিনটি পদ্ধতিই একমত: ${m.all.map((y) => num(y, 'bn').replace(',', '')).join(', ')} (লাল)।`, `All three agree on ${m.all.join(', ')} (red).`)
          : T('কোনো বছরে তিনটি পদ্ধতি একসঙ্গে একমত নয়: চাপের বছর নিয়ে এই জমির রেকর্ড স্পষ্ট নয়।', 'The three never agree on one year: this field’s record is not clear about stressed seasons.')}
          {' '}{T(`প্রথম দুটির মিল ${num(Math.round(m.agreeTrendLow * 100), 'bn')}%।`, `The first two overlap ${Math.round(m.agreeTrendLow * 100)}%.`)}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {Object.keys(m.sets).map((k) => (
          <article key={k} className="rounded-[18px] border border-border bg-white p-3.5 text-[13.5px] leading-6">
            <p className="font-bold">{L(METHOD[k])}</p>
            <p className="mt-1 text-primary-800">+ {L(METHOD[k].good)}</p>
            <p className="text-red-800">− {L(METHOD[k].bad)}</p>
          </article>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-muted">{T('একটা পিক্সেল প্রায় ১৫ বিঘা: জমি আর তার পাশের জমি একসঙ্গে। মেঘলা দিনে MODIS-এর মান কম আসে; প্রতি মাসের সবচেয়ে বেশি মানটা রাখা হয়।', 'One pixel is about 15 bigha: the field and its neighbours together. Clouds pull MODIS values down; each month keeps its highest composite.')}</p>
    </section>
  );
}

// Machine learning on NASA data, tested on seasons it never saw (engine/stressModel.js, scripts/build/train_stress_model.mjs):
// which approach did best, where the weather explains the crop's year and where it does not, and what that means.
const APPROACH = { base: { bn: 'সবসময় গড় ধরা', en: 'Always the average' }, ridge: { bn: 'রিজ রিগ্রেশন', en: 'Ridge regression' }, logistic: { bn: 'লজিস্টিক রিগ্রেশন', en: 'Logistic regression' }, tree: { bn: 'সিদ্ধান্ত-গাছ (দুই ধাপ)', en: 'Decision tree (two levels)' } };
const VERDICT = {
  explains: { bn: 'আবহাওয়া কিছুটা ব্যাখ্যা করে', en: 'Weather explains part of it', cls: 'bg-primary-50 text-primary-800 ring-primary-200' },
  little: { bn: 'আবহাওয়া প্রায় কিছুই বলে না', en: 'Weather adds almost nothing', cls: 'bg-paddy-50 text-paddy-800 ring-paddy-200' },
  other: { bn: 'অন্য কিছু ঠিক করে (সেচ, জোয়ার, লবণ)', en: 'Something else decides (irrigation, tides, salt)', cls: 'bg-sky-50 text-sky-900 ring-sky-200' },
};
function MachineLearning() {
  const { T, L, s } = useStore();
  const n = (v, dp = 2) => num(Math.abs(v) < 0.005 ? 0 : v, s.lang, { dp }); // no "−0"
  const st = MODEL.area.stressed;
  const places = Object.keys(MODEL.perPlace).map((id) => ({ id, ...placeVerdict(id) }));
  const q = treeQuestions()[0];
  return (
    <section id="ml" className="mt-12 scroll-mt-28">
      <h2 className="flex items-center gap-2 text-[24px] font-bold"><Layers size={20} className="text-primary-700" />{T('মেশিন লার্নিং: নাসার তথ্য কী বলতে পারে, কী পারে না', 'Machine learning: what NASA data can and cannot predict')}</h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">{T(`প্রশ্ন: একটা রবি মৌসুমের আবহাওয়া (বৃষ্টি, ভারী বৃষ্টি, ঠান্ডা রাত, গরম দিন, মাটির ভেজা ভাব, আগের বর্ষা) দেখে কি বলা যায় সেবার ফসল কতটা সবুজ বা চাপে থাকবে? সাত উপজেলার ${n(MODEL.area.seasons, 0)} মৌসুমে (${n(MODEL.area.n, 0)}টি উদাহরণ) চারটি পদ্ধতি শেখানো হয়েছে, আর প্রতিটি বছর এমন মডেল দিয়ে পরীক্ষা করা হয়েছে যা সেই বছর কখনো দেখেনি।`, `The question: from a Rabi season’s weather (rain, heavy rain, cold nights, warm days, soil wetness, the monsoon before), can we tell how green or stressed the crops will be? Four approaches were trained on ${MODEL.area.seasons} seasons in seven upazilas (${MODEL.area.n} examples), and every year was tested by a model that never saw it.`)}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-[22px] border border-border bg-white">
          <table className="w-full min-w-[420px] text-left text-[13.5px]">
            <thead className="bg-canvas text-[12.5px] text-muted"><tr><th className="px-3 py-2.5 font-semibold">{T('পদ্ধতি', 'Approach')}</th><th className="px-3 py-2.5 font-semibold">{T('চাপের বছর চেনা (AUC)', 'Spots stressed seasons (AUC)')}</th><th className="px-3 py-2.5 font-semibold">{T('গড়ের চেয়ে ভালো', 'Better than the average')}</th></tr></thead>
            <tbody>{Object.entries(APPROACH).map(([k, a]) => st[k] && (
              <tr key={k} className="border-t border-border"><td className="px-3 py-2.5 font-semibold">{L(a)}</td><td className="px-3 py-2.5 tabular">{k === 'base' ? T('— (তুলনার ভিত্তি)', '— (the floor)') : st[k].auc == null ? '–' : n(st[k].auc)}</td><td className="px-3 py-2.5 tabular">{st[k].skill == null ? T('—', '—') : `${st[k].skill >= 0 ? '+' : '−'}${n(Math.abs(st[k].skill * 100), 0)}%`}</td></tr>
            ))}</tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-[12px] leading-5 text-muted">{T('AUC ০.৫ মানে আন্দাজের সমান, ১ মানে নিখুঁত। "গড়ের চেয়ে ভালো" ভুলের পরিমাণ (Brier) দিয়ে মাপা; রিজ সবুজের মাত্রা আন্দাজ করে, তাই তার AUC আছে, Brier নেই।', 'AUC 0.5 is no better than chance, 1 is perfect. “Better than the average” is measured by the error (Brier score); ridge estimates how green, so it has an AUC but no Brier score.')}</p>
        </div>
        <div className="rounded-[22px] border border-border bg-white p-4">
          <h3 className="text-[15.5px] font-bold">{T('জায়গা ভেদে: আবহাওয়া কি ফসলের বছর ব্যাখ্যা করে?', 'Place by place: does the weather explain the crop’s year?')}</h3>
          <ul className="mt-2 space-y-1.5">{places.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
              <span className="font-semibold">{L(UPAZILAS[p.id].name)}</span>
              <span className="flex items-center gap-2"><span className="tabular text-muted">r {n(p.r)}</span><span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${VERDICT[p.kind].cls}`}>{L(VERDICT[p.kind])}</span></span>
            </li>
          ))}</ul>
        </div>
      </div>
      <div className="mt-4 rounded-[22px] bg-primary-950 p-5 text-[15px] leading-7 text-white/90">
        <p className="font-bold text-white">{T('এর মানে কী', 'What this means')}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>{T('যেখানে রবির ফসল বৃষ্টির ওপর নির্ভর করে (সীতাকুণ্ড, গোয়াইনঘাট), সেখানে আবহাওয়া ফসলের বছরের কিছুটা আগে থেকে বলে দেয়। সেচের বোরো, জোয়ার বা লবণের এলাকায় আবহাওয়া প্রায় কিছুই বলে না: সেখানে সেচ, পানি আর ব্যবস্থাপনাই ঠিক করে।', 'Where the Rabi crop depends on rain (Sitakunda, Gowainghat), the weather foretells part of the crop’s year. In irrigated Boro, tidal or salty areas it says almost nothing: irrigation, water and management decide there.')}</li>
          <li>{T(`একটা জমির পর্যায়ে আবহাওয়া চাপের বছর প্রায় চেনেই না (AUC ${n(MODEL.field.stressed.ridge.auc)}): জমির চাপ আসে বোনার দিন, সেচ, পোকা আর ফসল বদলানো থেকে, যা উপগ্রহ দেখে না, কৃষক জানেন।`, `At a single field the weather barely recognises stressed seasons (AUC ${n(MODEL.field.stressed.ridge.auc)}): a field’s stress comes from sowing date, irrigation, pests and changes of crop, which the satellites do not see and the farmer knows.`)}</li>
          <li>{T('তাই এই অ্যাপ কালো বাক্সের ভবিষ্যদ্বাণী দেয় না: খোলা নিয়ম, ২৫ মৌসুমের তথ্য আর মাঠে যাচাই। মাত্র ২৪টি মৌসুম আর সাতটি জায়গা: মডেল পথ দেখায়, ভবিষ্যৎ বলে না।', 'That is why this app gives no black-box forecast: open rules, 25 seasons of records and checks in the field. With only 24 seasons and seven places, the models point the way; they do not foretell.')}</li>
          {q && <li>{T(`সিদ্ধান্ত-গাছের প্রথম প্রশ্ন: "${q.feature.bn} কি স্বাভাবিকের চেয়ে কম?" — চাপের বছর আলাদা করতে এটাই সবচেয়ে কাজের।`, `The decision tree’s first question: “Is the ${q.feature.en.toLowerCase()} below normal?” — the single most useful question for telling stressed seasons apart.`)}</li>}
        </ul>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-muted">{T('শেখানোর তথ্য: নাসা POWER দৈনিক আবহাওয়া (BMD-তে মেলানো) আর মাটির ভেজা ভাব, MODIS-এর রবির সবুজ। কোড: scripts/build/train_stress_model.mjs; ফল: src/data/models/stress_model.json।', 'Training data: NASA POWER daily weather (matched to BMD) and soil wetness, MODIS Rabi greenness. Code: scripts/build/train_stress_model.mjs; results: src/data/models/stress_model.json.')}</p>
    </section>
  );
}
