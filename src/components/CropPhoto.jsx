// A real photo of the crop growing, from Wikimedia Commons, fetched live with its author and licence (Commons'
// licences require the credit, so it is always shown). Each crop has a hand-picked file (data/crop_photos.js); a crop
// without one is looked up on Commons by name. Until the picture arrives, or with no internet, the bundled field
// photo stands in. Answers are kept for a week in the browser so the page does not ask Commons every time.
import { useEffect, useState } from 'react';
import Photo from './Photo';
import { useStore } from '../store';
import { CROP_PHOTOS } from '../data/crop_photos';
import { STORAGE_PREFIX } from '../config/brand';

const API = 'https://commons.wikimedia.org/w/api.php';
const WEEK = 7 * 864e5;
const memo = new Map(); // cropId → Promise of { src, page, artist, license } or null

const strip = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const cacheKey = (id) => `${STORAGE_PREFIX}.cropPhoto.v1.${id}`;
const readCache = (id) => {
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey(id)) || 'null');
    return c && Date.now() - c.at < WEEK ? c.data : null;
  } catch { return null; }
};
const writeCache = (id, data) => { try { localStorage.setItem(cacheKey(id), JSON.stringify({ at: Date.now(), data })); } catch { /* storage full or blocked */ } };

async function lookup(crop, width) {
  const pick = CROP_PHOTOS[crop.id];
  const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(width), iiextmetadatafilter: 'Artist|LicenseShortName' });
  if (pick) params.set('titles', `File:${pick.file}`);
  else { params.set('generator', 'search'); params.set('gsrnamespace', '6'); params.set('gsrlimit', '1'); params.set('gsrsearch', `${crop.search ?? `${crop.name.en} crop field`} filetype:bitmap`); }
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(String(res.status));
  const page = Object.values((await res.json()).query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.thumburl) return null;
  const m = ii.extmetadata ?? {};
  return { src: ii.thumburl, page: ii.descriptionurl, artist: strip(m.Artist?.value) || 'Wikimedia Commons', license: strip(m.LicenseShortName?.value), where: pick?.where ?? null };
}

function photoOf(crop, width) {
  if (!memo.has(crop.id)) {
    const cached = readCache(crop.id);
    memo.set(crop.id, cached ? Promise.resolve(cached) : lookup(crop, width).then((d) => { if (d) writeCache(crop.id, d); return d; }).catch(() => { memo.delete(crop.id); return null; }));
  }
  return memo.get(crop.id);
}

// Inside a link (a card), pass linkCredit={false}: the credit is then plain text, since links cannot nest.
export default function CropPhoto({ crop, width = 800, fallback = 'seedlings', sizes = '400px', className = '', linkCredit = true, creditTop = false }) {
  const { T, L } = useStore();
  const [img, setImg] = useState(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let alive = true;
    setImg(null); setShown(false);
    photoOf(crop, width).then((d) => { if (alive) setImg(d); });
    return () => { alive = false; };
  }, [crop.id, width]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {!shown && <Photo name={fallback} fill sizes={sizes} decorative />}
      {img && (
        <>
          <img key={img.src} src={img.src} alt={T(`খেতে ${L(crop.name)}`, `${L(crop.name)} growing in the field`)} loading="lazy" decoding="async" referrerPolicy="no-referrer"
            onLoad={() => setShown(true)} onError={() => setImg(null)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${shown ? 'opacity-100' : 'opacity-0'}`} />
          {shown && (
            <Credit link={linkCredit} href={img.page}
              className={`absolute inset-x-0 px-3 text-[11px] leading-4 text-white/90 hover:text-white ${creditTop ? 'top-0 bg-gradient-to-b from-black/60 to-transparent pb-6 pt-2' : 'bottom-0 bg-gradient-to-t from-black/70 to-transparent pb-2 pt-6'}`}>
              <span className="font-semibold">{L(crop.name)}</span>{img.where ? `, ${L(img.where)}` : ''}
              <span className="block truncate text-white/75">{T('ছবি', 'Photo')}: {img.artist}{img.license ? ` · ${img.license}` : ''} · {T('উইকিমিডিয়া কমন্স', 'Wikimedia Commons')}</span>
            </Credit>
          )}
        </>
      )}
    </div>
  );
}

const Credit = ({ link, href, className, children }) => (link
  ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  : <span className={className}>{children}</span>);
