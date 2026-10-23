// Drawn characters for the named farmers (Bangladesh's seven division farmers and the five neighbouring countries'),
// in place of a first-letter tile. Plain SVG, so they are sharp at every size and cost no download. Each is built from
// a few parts (face, hair, headwear, beard, clothing) chosen to fit the person's story; a farmer without a character
// gets `fallback` (the old letter tile). The eyes blink now and then, unless the reader asks for less motion.

const SKIN = { a: '#c68a5e', b: '#a8704a', c: '#8d5b3c', d: '#d8a47a', e: '#b77b52' };
const CAST = {
  RAHIM: { skin: SKIN.b, hair: '#5b5551', beard: '#d9d4cc', hat: 'gamcha', hatColor: '#b0302b', shirt: '#e4eaf0', bg: '#f6e3cf' },
  RAZIB: { skin: SKIN.a, hair: '#1d1714', shirt: '#3f7f39', bg: '#e7e2f7' },
  DIDARUL: { skin: SKIN.b, hair: '#1d1714', beard: '#231b16', hat: 'topi', shirt: '#f1efe8', bg: '#dceeee' },
  PRAHLAD: { skin: SKIN.c, hair: '#2a2420', mous: '#2a2420', shirt: '#f3efe2', scarf: 'shoulder', scarfColor: '#c9482e', bg: '#f6e0d6' },
  KADER: { skin: SKIN.e, hair: '#e7e3dc', beard: '#efebe4', hat: 'topi', shirt: '#dfe7ee', bg: '#dcebd3' },
  MOFIZUL: { skin: SKIN.a, hair: '#211a16', mous: '#211a16', scarf: 'muffler', scarfColor: '#5b6fa8', shirt: '#7b5a3c', bg: '#e1edd8' },
  RAHIMA: { skin: SKIN.d, hat: 'hijab', hatColor: '#6d4aa8', shirt: '#6d4aa8', female: true, bg: '#ece3f6' },
  HARJINDER: { skin: SKIN.e, beard: '#1d1714', hat: 'turban', hatColor: '#e08a1e', shirt: '#f2f2ee', bg: '#fbeee2' },
  GHULAMNABI: { skin: SKIN.b, hair: '#2a2420', beard: '#3a322c', hat: 'sindhi', hatColor: '#b8262f', shirt: '#eef0f2', bg: '#e3f3ea' },
  RAMPYARI: { skin: SKIN.a, hair: '#1d1714', hat: 'scarf', hatColor: '#c8203c', shirt: '#e8b33a', female: true, bg: '#fbe6e9' },
  KINLEY: { skin: SKIN.d, hair: '#1d1714', hair2: 'bob', shirt: '#b5432e', kira: true, female: true, bg: '#fcf1dc' },
  KYAWWIN: { skin: SKIN.a, hair: '#1d1714', hat: 'gaungbaung', hatColor: '#e7a3b6', shirt: '#f4f1ea', bg: '#f8f0d8' },
};
export const hasAvatar = (id) => !!CAST[id];

export default function FarmerAvatar({ id, size = 48, className = '', flag, fallback = null, rounded = 'rounded-xl' }) {
  const c = CAST[id];
  if (!c) return fallback;
  const dark = (hex, k = 0.82) => `#${hex.slice(1).match(/../g).map((h) => Math.round(parseInt(h, 16) * k).toString(16).padStart(2, '0')).join('')}`;
  const face = c.hat === 'hijab' ? { rx: 9.6, ry: 11, cy: 30 } : { rx: 11, ry: 12.5, cy: 29 };
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden transition-transform duration-300 ease-[cubic-bezier(.34,1.4,.64,1)] group-hover:scale-105 ${rounded} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="7 5 50 50" width={size} height={size} className="fa-avatar block transition-transform duration-300">
        <rect width="64" height="64" fill={c.bg} />
        <circle cx="50" cy="12" r="16" fill="#fff" opacity=".35" />
        {/* hair or scarf behind the head */}
        {c.hair2 === 'bob' && <path d="M19 35 C17 18 24 12.5 32 12.5 C40 12.5 47 18 45 35 C44 39 42 41 40.5 41 L40.5 26 C37.5 21 26.5 21 23.5 26 L23.5 41 C22 41 20 39 19 35 Z" fill={c.hair} />}
        {c.hat === 'hijab' && <path d="M16.5 31 C16.5 16 24 10.5 32 10.5 C40 10.5 47.5 16 47.5 31 C47.5 42 44 48 32 50 C20 48 16.5 42 16.5 31 Z" fill={c.hatColor} />}
        {c.hat === 'scarf' && <path d="M19 28 C17 36 18 45 14 52 L23 50 C22.5 41 21.5 34 21 28 Z M45 28 C47 36 46 45 50 52 L41 50 C41.5 41 42.5 34 43 28 Z" fill={c.hatColor} />}
        {c.hat === 'scarf' && <path d="M21 26 C20 33 21 38 22 41 L24 41 C23.5 35 23.5 30 24 26 Z M43 26 C44 33 43 38 42 41 L40 41 C40.5 35 40.5 30 40 26 Z" fill={c.hair} />}
        {/* body */}
        <path d="M7 64 C9 50 19 44.5 32 44.5 C45 44.5 55 50 57 64 Z" fill={c.hat === 'hijab' ? dark(c.hatColor, 0.9) : c.shirt} />
        {c.kira && <path d="M24 46 L32 58 L40 46 C37 45 27 45 24 46 Z" fill="#f4e7c8" />}
        {!c.kira && c.hat !== 'hijab' && <path d="M26.5 45.2 L32 52.5 L37.5 45.2" fill="none" stroke={dark(c.shirt, 0.75)} strokeWidth="1.6" strokeLinejoin="round" />}
        {c.scarf === 'shoulder' && <path d="M15 48.5 C22 44 30 45 38 52 L35.5 55 C28.5 49 21.5 48.5 16.5 52 Z" fill={c.scarfColor} />}
        {c.scarf === 'muffler' && <path d="M22.5 41 C27 44.5 37 44.5 41.5 41 L42.5 46 C37 49.5 27 49.5 21.5 46 Z M37 46 L39 56 L35.5 56.5 L34 47 Z" fill={c.scarfColor} />}
        {/* neck and head */}
        <rect x="28" y="37" width="8" height="9" rx="3" fill={dark(c.skin, 0.9)} />
        {c.hat !== 'hijab' && <><circle cx="21" cy="30" r="2.6" fill={dark(c.skin, 0.93)} /><circle cx="43" cy="30" r="2.6" fill={dark(c.skin, 0.93)} /></>}
        <ellipse cx="32" cy={face.cy} rx={face.rx} ry={face.ry} fill={c.skin} />
        {/* hair on top */}
        {c.hair && (!c.hat || c.hat === 'gamcha' || c.hat === 'gaungbaung') && c.hair2 !== 'bob' && <path d="M20.8 28 C19.5 16 26.5 12.6 32.5 13 C39.5 13.4 44.5 17.5 43.2 28 C41.5 21.5 36.5 19.2 32 19.2 C27 19.2 22.6 21.6 20.8 28 Z" fill={c.hair} />}
        {c.hair2 === 'bob' && <path d="M21 25 C22 17 27 14.5 32 14.5 C38 14.5 42.5 17.5 43 25 C39 21.5 35 22.5 31 21 C28 22.5 24 22.5 21 25 Z" fill={c.hair} />}
        {(c.hat === 'topi' || c.hat === 'gamcha' || c.hat === 'sindhi' || c.hat === 'gaungbaung') && c.hair && <path d="M21 27 C21 24 22 22.5 23.5 22 L23.5 27 Z M43 27 C43 24 42 22.5 40.5 22 L40.5 27 Z" fill={c.hair} />}
        {/* beard and moustache */}
        {c.beard && <path d="M21.2 29.5 C21.5 40.5 27 44.6 32 44.6 C37 44.6 42.5 40.5 42.8 29.5 C41.2 36 37 38.8 32 38.8 C27 38.8 22.8 36 21.2 29.5 Z" fill={c.beard} />}
        {(c.beard || c.mous) && <path d="M27.6 34 Q32 31.9 36.4 34 Q32 35.6 27.6 34 Z" fill={c.mous ?? c.beard} />}
        {/* face */}
        <g className="fa-eyes" style={{ transformOrigin: `32px ${face.cy}px` }}>
          <ellipse cx="27.8" cy={face.cy} rx="1.35" ry="1.5" fill="#1d1714" />
          <ellipse cx="36.2" cy={face.cy} rx="1.35" ry="1.5" fill="#1d1714" />
        </g>
        <path d={`M25.8 ${face.cy - 3.6} Q27.8 ${face.cy - 4.8} 29.8 ${face.cy - 3.8} M34.2 ${face.cy - 3.8} Q36.2 ${face.cy - 4.8} 38.2 ${face.cy - 3.6}`} fill="none" stroke={c.hair && c.hair !== '#e7e3dc' ? dark(c.hair, 1) : '#6b5a4c'} strokeWidth="1.1" strokeLinecap="round" />
        <path d={`M29.3 ${face.cy + 6.4} Q32 ${face.cy + 8.6} 34.7 ${face.cy + 6.4}`} fill="none" stroke={c.beard ? '#7a4a36' : dark(c.skin, 0.62)} strokeWidth="1.3" strokeLinecap="round" />
        {c.female && <><circle cx="25" cy={face.cy + 4.5} r="1.8" fill="#e58a7a" opacity=".35" /><circle cx="39" cy={face.cy + 4.5} r="1.8" fill="#e58a7a" opacity=".35" /></>}
        {/* headwear */}
        {c.hat === 'gamcha' && <>
          <path d="M19.6 22.6 C25 19.4 39 19.4 44.4 22.6 L44.4 26.2 C39 23.3 25 23.3 19.6 26.2 Z" fill={c.hatColor} />
          <path d="M22 21.4 L22 25 M26 20.4 L26 24 M30 20 L30 23.5 M34 20 L34 23.5 M38 20.4 L38 24 M42 21.4 L42 25" stroke="#f3d6c8" strokeWidth=".8" opacity=".7" />
          <path d="M44 23.5 C48 21 50 24 47.5 26.5 C50 28 48 31.5 44.5 28 Z" fill={dark(c.hatColor, 0.85)} />
        </>}
        {c.hat === 'topi' && <><path d="M21.6 22.8 C22 14.5 42 14.5 42.4 22.8 Z" fill="#f7f5ef" /><path d="M23.5 20.5 L40.5 20.5 M25 18 L39 18" stroke="#d7d2c4" strokeWidth=".8" /></>}
        {c.hat === 'sindhi' && <>
          <path d="M21.4 24 C21.5 15.5 42.5 15.5 42.6 24 L36 24 C35 21 29 21 28 24 Z" fill={c.hatColor} />
          {[24, 27.5, 36.5, 40].map((x) => <circle key={x} cx={x} cy="20.5" r="1" fill="#f3d36b" />)}
          <path d="M23 18.8 L41 18.8" stroke="#f3d36b" strokeWidth=".8" />
        </>}
        {c.hat === 'turban' && <>
          <path d="M19 25 C16.5 12 25.5 6.5 32 6.5 C40 6.5 48 11.5 45 25 C40 20.5 24 20.5 19 25 Z" fill={c.hatColor} />
          <path d="M21 21 C27 15 37 13 44 16.5 M20.5 17 C26 11 36 9.5 42 12" fill="none" stroke={dark(c.hatColor, 0.8)} strokeWidth="1.2" />
        </>}
        {c.hat === 'gaungbaung' && <>
          <path d="M20.2 22.2 C25 18.8 39 18.8 43.8 22.2 L43.8 25.8 C39 23 25 23 20.2 25.8 Z" fill={c.hatColor} />
          <path d="M20.5 21.5 C15 17 14 22 17.5 25 C15 27 18 30 21 26 Z" fill={dark(c.hatColor, 0.88)} />
        </>}
        {c.hat === 'scarf' && <path d="M19.4 28 C18 15 25 10.8 32 10.8 C39 10.8 46 15 44.6 28 C42.8 20.5 38 17.6 32 17.6 C26 17.6 21.2 20.5 19.4 28 Z" fill={c.hatColor} />}
        {c.hat === 'hijab' && <path d="M22.4 22 C25 16 39 16 41.6 22" fill="none" stroke={dark(c.hatColor, 0.8)} strokeWidth="1" opacity=".6" />}
      </svg>
      {flag && <span className="absolute bottom-0.5 right-0.5 grid place-items-center rounded-md bg-white/90 px-0.5 text-[11px] leading-none shadow-sm">{flag}</span>}
    </span>
  );
}
