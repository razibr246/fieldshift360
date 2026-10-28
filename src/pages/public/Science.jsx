// "The science, plainly": the words the app uses (evapotranspiration, NDVI, soil-moisture anomaly, water balance and
// the rest) in a farmer's words; how datasets taken at very different scales are brought down to one field and one
// season; how a satellite's view differs from a measurement on the ground, and how the app combines both; and which
// methods sit behind each answer, with their uncertainty and where local knowledge has to check them.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Satellite, Ruler, Layers, Scale, Users, ArrowRight, Droplets, Leaf, Thermometer, CloudRain, Mountain, Waves, Sprout, Wind, Snowflake, FlaskConical } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../../components/ui';
import { num } from '../../engine/dates';
import { rainCrossCheck } from '../../engine/climate';

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
  ['SRTM', t('৩০ মিটার, একবার (২০০০)', '30 m, once (2000)'), t('জমি আর তার চারপাশের উচ্চতা থেকে নিচু জমি আর ঢাল', 'Height at the field and round it: hollows and slopes')],
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
  const { T, L, s, clim } = useStore();
  const lang = s.lang;
  const cross = useMemo(() => (clim ? rainCrossCheck(clim) : null), [clim]);
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
              {T(`এখনই, গোদাগাড়ীর ২৫ রবি মৌসুমে নাসা POWER আর GPM IMERG উপগ্রহের বৃষ্টির মিল r = ${num(cross.rabi.r, 'bn', { dp: 2 })}; বর্ষায় r = ${num(cross.monsoon.r, 'bn', { dp: 2 })}। গড় রবির বৃষ্টি: POWER ${num(cross.rabi.power, 'bn')} মিমি, IMERG ${num(cross.rabi.imerg, 'bn')} মিমি।`, `Right now, over Godagari’s 25 Rabi seasons, NASA POWER and GPM IMERG satellite rain agree at r = ${cross.rabi.r.toFixed(2)}; in the monsoon r = ${cross.monsoon.r.toFixed(2)}. Mean Rabi rain: POWER ${Math.round(cross.rabi.power)} mm, IMERG ${Math.round(cross.rabi.imerg)} mm.`)}
              <span className="ml-1 inline-block align-middle"><Tags list={['REAL']} /></span>
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
