// Bangladesh as NASA's astronauts and satellites have photographed it, from the NASA Image and Video Library
// (scripts/python/nasa_images.py): the delta that made the soil, the salt coast, and cropland turning into town.
// Each picture carries NASA's credit and links to its page in the library, as NASA's media guidelines ask.
import { ExternalLink } from 'lucide-react';
import { useStore } from '../store';
import { Tags } from './ui';
import { fmtDate, bnDigits } from '../engine/dates';
import lib from '../data/nasa_images.json';

const FILES = import.meta.glob('../assets/images/nasa/*.webp', { eager: true, import: 'default' });
const src = (id, w) => FILES[`../assets/images/nasa/${id}-${w}.webp`];

// What each picture shows a farmer, in a line; NASA's own caption is on its library page.
const SAYS = {
  delta: { bn: 'পদ্মা-যমুনা-মেঘনার পলি দিয়ে গড়া পৃথিবীর সবচেয়ে বড় ব-দ্বীপ: বাংলাদেশের উর্বর মাটি এখান থেকেই। স্পেস শাটল থেকে তোলা।', en: 'The world’s largest delta, built from the silt of the Ganges, Brahmaputra and Meghna: where Bangladesh’s fertile soil comes from. From the Space Shuttle.' },
  sundarbans: { bn: 'সুন্দরবন আর খুলনার উপকূল, মহাকাশ স্টেশন থেকে: নদী আর জোয়ারের এই জালে লবণ ঢোকে, তাই দাকোপে লবণ-সহিষ্ণু জাতের হিসাব।', en: 'The Sundarbans and the Khulna coast from the Space Station: through this maze of rivers and tides the salt comes in, which is why Dacope’s plan weighs salt-tolerant varieties.' },
  rupganj: { bn: 'ঢাকার পাশে রূপগঞ্জ, নাসার ASTER-এ: লাল গাছপালা আর ফসল, নীলচে-ধূসর শহর। ২০০০ থেকে ২০২০-এ জনসংখ্যা ৭৬ হাজার থেকে ৪ লাখ ৮২ হাজার; ফসলের জমি কমছে, তাই যে জমি আছে তার মাটি বাঁচানো জরুরি।', en: 'Rupganj beside Dhaka, by NASA’s ASTER: red is plants and crops, blue-grey is town. From 2000 to 2020 its people grew from 76,000 to 482,000; cropland is shrinking, so keeping the soil of what is left matters more.' },
  coast: { bn: 'বঙ্গোপসাগরের পাড়ে দক্ষিণের উপকূল, মহাকাশ স্টেশন থেকে: ঘোলা পানিতে নদীর পলি সাগরে যাচ্ছে।', en: 'The southern coast on the Bay of Bengal from the Space Station: the muddy water is river silt flowing out to sea.' },
};

export default function NasaEyes() {
  const { s, T, L } = useStore();
  return (
    <section id="nasa-eyes" className="scroll-mt-20 py-16 sm:py-20">
      <div className="page-shell">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="text-[32px] font-bold sm:text-[40px]">{T('নাসার চোখে বাংলাদেশ', 'Bangladesh through NASA’s eyes')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('নভোচারী আর উপগ্রহের তোলা ছবি, নাসার ছবির ভান্ডার থেকে: যে ব-দ্বীপের মাটিতে আমাদের চাষ, যে উপকূলে লবণ ঢোকে, আর যে ফসলি জমি শহর হয়ে যাচ্ছে।', 'Pictures taken by astronauts and satellites, from NASA’s image library: the delta whose soil we farm, the coast where the salt comes in, and cropland turning into town.')}</p>
          </div>
          <Tags list={['REAL']} />
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
          {lib.images.map((im) => (
            <figure key={im.id} data-reveal className="glass flat flex flex-col overflow-hidden rounded-[22px]">
              <a href={im.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/3] overflow-hidden bg-primary-950" aria-label={T(`নাসার পাতায় ছবিটা দেখুন: ${im.title}`, `See the picture on NASA’s page: ${im.title}`)}>
                <img src={src(im.id, 900)} srcSet={`${src(im.id, 900)} 900w, ${src(im.id, 1600)} 1600w`} sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                  alt={im.title} loading="lazy" decoding="async" width={im.width} height={im.height}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </a>
              <figcaption className="flex flex-1 flex-col p-4">
                <p className="text-[14px] leading-6 text-ink">{L(SAYS[im.role])}</p>
                <p className="mt-auto pt-3 text-[12px] leading-5 text-muted">
                  {T('ছবি', 'Image')}: {im.credit} · {fmtDate(Date.parse(im.date), s.lang)} {s.lang === 'bn' ? bnDigits(im.date.slice(0, 4)) : im.date.slice(0, 4)}{' '}
                  <a href={im.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary-700 hover:underline">{im.id}<ExternalLink size={11} /></a>
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">{T('নাসা এই অ্যাপের পৃষ্ঠপোষক বা সমর্থক নয়; ছবিগুলো নাসার মিডিয়া নির্দেশিকা মেনে, নাসার নাম দিয়ে ব্যবহার করা।', 'NASA does not endorse this app; the pictures are used under NASA’s media guidelines, credited to NASA.')}</p>
      </div>
    </section>
  );
}
