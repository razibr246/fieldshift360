// "Our neighbours" on the home page: each neighbouring country's farmland, each card leading to that country's
// sample farmer. The photos are Wikimedia Commons farm photos in the image registry (abroad<Country>, credited on the
// card as their licences ask); the country's landscape is in the hero slideshow instead. A country without a photo
// (Myanmar) shows its colour card. Wide screens get a bento grid (two large on top, four below); phones a row that
// scrolls sideways with snap points.
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2 } from 'lucide-react';
import { useStore } from '../store';
import { ABROAD } from '../data/abroad';
import { IMAGES } from '../assets/images';
import Photo from './Photo';

const photoName = (id) => `abroad${id[0].toUpperCase()}${id.slice(1)}`;
const CARDS = [
  { id: 'bhutan' }, { id: 'nepal' }, { id: 'india' }, { id: 'pakistan' },
  { id: 'afghanistan', own: { name: { bn: 'আফগানিস্তান', en: 'Afghanistan' }, flag: '🇦🇫', tone: '#2f5d8a' } },
  { id: 'myanmar' },
];

export default function NeighbourPhotos() {
  const { T, L } = useStore();
  const cards = CARDS.map((x) => ({ ...x, c: ABROAD[x.id], pic: IMAGES[photoName(x.id)] ? photoName(x.id) : null }));
  return (
    <section className="py-16 sm:py-20">
      <div className="page-shell">
        <div data-reveal className="max-w-2xl">
          <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Globe2 size={15} />{T('প্রতিবেশী দেশ', 'Neighbouring countries')}</p>
          <h2 className="mt-3 text-[32px] font-bold leading-tight sm:text-[40px]">{T('একই পাহাড়, একই নদী, একই আকাশ', 'The same mountains, rivers and sky')}</h2>
          <p className="mt-3 text-[16px] leading-8 text-muted">{T('হিমালয়ের বরফ গলে যে নদী নামে, তা-ই আমাদের মাঠ ভেজায়। প্রতিবেশী প্রতিটি দেশে একজন কৃষক আর তাঁর এলাকার কৃষি কর্মকর্তা — আসল জমি, আসল আবহাওয়া।', 'The rivers that come down from the Himalayan snow are the ones that water our fields. In each neighbouring country, one farmer and the agriculture officer for their area — real fields, real weather.')}</p>
        </div>
        <div data-reveal-children className="hide-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-12 md:gap-4 md:overflow-visible md:px-0">
          {cards.map((x, i) => <Card key={x.id} x={x} big={i < 2} />)}
        </div>
      </div>
    </section>
  );
}

function Card({ x, big }) {
  const { T, L } = useStore();
  const meta = x.c ?? x.own;
  const inner = (
    <>
      {x.pic ? (
        <Photo name={x.pic} fill sizes={big ? '(min-width: 768px) 50vw, 85vw' : '(min-width: 768px) 25vw, 85vw'}
          className="transition-transform duration-[2400ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.06]" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 85% 10%, ${meta.tone}cc, ${meta.tone}55 45%, #13261b 110%)` }}>
          <span className="absolute right-5 top-4 text-[64px] opacity-90 drop-shadow-lg">{meta.flag}</span>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,14,0)_35%,rgba(8,22,14,.78)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/85"><span className="text-[18px]" aria-hidden="true">{meta.flag}</span>{L(meta.name)}</div>
        {x.pic && <div className={`mt-0.5 font-display font-bold leading-snug ${big ? 'text-[21px] sm:text-[24px]' : 'text-[17px]'}`}>{L(IMAGES[x.pic].alt).replace(/, [^,]+$/, '')}</div>}
        {x.c ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12.5px] font-semibold ring-1 ring-white/25 backdrop-blur transition group-hover:bg-white/25">
            {T(`${x.c.farmer.name.bn}-এর খামার`, `${x.c.farmer.name.en}’s farm`)}<ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : <span className="mt-2 inline-block text-[12px] text-white/70">{T('শুধু ছবি — এই দেশের পাতা এখনো নেই', 'Photo only — no pages for this country yet')}</span>}
      </div>
      {x.pic && IMAGES[x.pic].credit && <span className="absolute right-3 top-3 max-w-[70%] truncate rounded-full bg-black/30 px-2 py-0.5 text-[10.5px] font-medium text-white/80 backdrop-blur">{T('ছবি', 'Photo')}: {IMAGES[x.pic].credit.artist} · {IMAGES[x.pic].credit.license}</span>}
    </>
  );
  const shape = `group relative w-[85vw] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-primary-950 shadow-[var(--shadow-card)] ring-1 ring-black/5 md:w-auto md:max-w-none ${big ? 'aspect-[4/5] md:col-span-6 md:aspect-[16/10]' : 'aspect-[4/5] md:col-span-3 md:aspect-[4/5] lg:aspect-[3/4]'}`;
  return x.c
    ? <Link to={`/abroad/${x.id}`} className={`${shape} lift touch-manipulation`}>{inner}</Link>
    : <div className={shape}>{inner}</div>;
}
