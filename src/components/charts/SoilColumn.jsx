// A living cut through one field's topsoil, season by season, for one rotation (engine/soilfuture.js).
// Everything in it is drawn from the simulation: the crop growing on top is that season's crop, the soil darkens or
// pales with the modelled organic carbon, roots reach as deep and as often as the crop covers the ground, the
// earthworms follow the soil-health score, blue drops fall when the season needs irrigation, and red pests come out when
// a crop family follows itself. With reduced motion the picture stands still at the same state.
import { useId, useMemo } from 'react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { cropOf, omPctOf } from '../../engine/soilfuture';

const W = 220, H = 300, SKY = 92;
// How each crop stands: height, colour of leaf and of what it bears, and how deep its roots go (of the column).
const LOOK = {
  boro: { h: 54, leaf: '#4f9a3c', top: '#d6b44a', kind: 'blade', root: 0.32 },
  aman: { h: 58, leaf: '#3f8a35', top: '#d9b54c', kind: 'blade', root: 0.32 },
  aus: { h: 50, leaf: '#58a043', top: '#d2b253', kind: 'blade', root: 0.36 },
  wheat: { h: 50, leaf: '#7da449', top: '#d9a940', kind: 'ear', root: 0.62 },
  lentil: { h: 26, leaf: '#6e9c43', top: '#a7c36c', kind: 'bush', root: 0.5 },
  mungbean: { h: 30, leaf: '#4f8f34', top: '#2f6e2f', kind: 'bush', root: 0.48 },
  mustard: { h: 44, leaf: '#6f9a3a', top: '#f2c314', kind: 'flower', root: 0.55 },
  tomato: { h: 38, leaf: '#3f7f34', top: '#d8432c', kind: 'fruit', root: 0.45 },
  sesame: { h: 46, leaf: '#62953d', top: '#f4efe2', kind: 'flower', root: 0.58 },
  jute: { h: 72, leaf: '#2f7a2f', top: '#3c8c34', kind: 'stem', root: 0.7 },
};
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
// Pale clay to dark humus-rich loam, centred on today's level.
const soilColour = (ratio) => mix('#caa27a', '#3a2717', Math.max(0, Math.min(1, 0.5 + (ratio - 1) * 6)));

function Plant({ x, look, grow, k }) {
  const h = look.h * grow, base = SKY;
  const y = base - h;
  return (
    <g className="soil-grow" style={{ transformOrigin: `${x}px ${base}px`, animationDelay: `${(k % 5) * 60}ms` }}>
      {look.kind === 'blade' && <>
        <path d={`M${x} ${base} Q${x - 5} ${y + h * 0.4} ${x - 8} ${y}`} stroke={look.leaf} strokeWidth="2" fill="none" />
        <path d={`M${x} ${base} L${x} ${y - 2}`} stroke={look.leaf} strokeWidth="2.2" />
        <path d={`M${x} ${base} Q${x + 5} ${y + h * 0.4} ${x + 8} ${y + 4}`} stroke={look.leaf} strokeWidth="2" fill="none" />
        {grow > 0.75 && <path d={`M${x} ${y - 2} q6 4 7 12`} stroke={look.top} strokeWidth="3" fill="none" strokeLinecap="round" />}
      </>}
      {look.kind === 'ear' && <>
        <path d={`M${x} ${base} L${x} ${y}`} stroke={look.leaf} strokeWidth="2" />
        <path d={`M${x} ${base - h * 0.3} q-7 -6 -9 -14 M${x} ${base - h * 0.5} q7 -6 9 -14`} stroke={look.leaf} strokeWidth="1.8" fill="none" />
        {grow > 0.6 && <ellipse cx={x} cy={y} rx="2.6" ry="7" fill={look.top} />}
      </>}
      {look.kind === 'bush' && <>
        <path d={`M${x} ${base} L${x} ${y + 4}`} stroke={look.leaf} strokeWidth="1.8" />
        {[-6, 0, 6].map((d, i) => <circle key={i} cx={x + d} cy={y + 6 + (i % 2) * 5} r={5.5 * Math.max(0.4, grow)} fill={look.leaf} />)}
        {grow > 0.7 && <path d={`M${x - 3} ${y + 12} q3 6 7 0`} stroke={look.top} strokeWidth="2.4" fill="none" />}
      </>}
      {look.kind === 'flower' && <>
        <path d={`M${x} ${base} L${x} ${y}`} stroke={look.leaf} strokeWidth="2" />
        <path d={`M${x} ${base - h * 0.35} q-8 -3 -10 -10 M${x} ${base - h * 0.55} q8 -3 10 -10`} stroke={look.leaf} strokeWidth="1.8" fill="none" />
        {grow > 0.55 && [0, 1, 2].map((i) => <circle key={i} cx={x + (i - 1) * 4} cy={y + i * 3} r="3" fill={look.top} stroke="#00000014" />)}
      </>}
      {look.kind === 'fruit' && <>
        <path d={`M${x} ${base} Q${x - 4} ${y + 10} ${x} ${y}`} stroke={look.leaf} strokeWidth="2.2" fill="none" />
        {[-7, 7].map((d, i) => <path key={i} d={`M${x} ${base - h * (0.4 + i * 0.2)} q${d} -4 ${d * 1.4} -11`} stroke={look.leaf} strokeWidth="1.8" fill="none" />)}
        {grow > 0.6 && [[-5, 0.55], [5, 0.4], [1, 0.25]].map(([d, f], i) => <circle key={i} cx={x + d} cy={base - h * f} r="3.6" fill={look.top} />)}
      </>}
      {look.kind === 'stem' && <>
        <path d={`M${x} ${base} L${x} ${y}`} stroke={look.leaf} strokeWidth="2.6" />
        {[0.3, 0.5, 0.7, 0.88].map((f, i) => <path key={i} d={`M${x} ${base - h * f} q${i % 2 ? 8 : -8} -2 ${i % 2 ? 11 : -11} -8`} stroke={look.top} strokeWidth="2" fill="none" />)}
      </>}
    </g>
  );
}

// season: 0 Rabi, 1 Kharif-1, 2 Aman; row: that year's simulation row; prevSoc: carbon at the start of the year.
export default function SoilColumn({ row, season, soc0, soil, health, title, tone = '#2f6e2f', badge }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const id = season === 0 ? row.rabi : season === 1 ? row.k1 : 'aman';
  const crop = cropOf(id);
  const look = LOOK[id];
  const ratio = row.soc / soc0;
  const om = omPctOf(row.soc, soil);
  const plantsN = look ? 7 : 0;
  const rootDepth = look ? look.root : 0;
  const worms = Math.max(0, Math.round(health / 18));
  const slotWater = row.slotWater?.[season] ?? 0;
  const irrigated = id !== 'fallow' && slotWater > 0;
  const rep = row.rep?.[season] ?? 0;
  const pests = rep >= 1 ? 3 : rep > 0 ? 1 : 0;
  const specks = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: 10 + ((i * 47) % 200), y: SKY + 14 + ((i * 71) % 180), r: 0.9 + ((i * 13) % 5) / 3 })), []);
  const speckN = Math.round(18 + 28 * Math.max(0, Math.min(1, 0.5 + (ratio - 1) * 6)));
  const key = `${row.year}-${season}`;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <figure className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <figcaption className="truncate text-[14px] font-bold" style={{ color: tone }}>{title}</figcaption>
        {badge}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[#eaf3fb]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
          aria-label={T(`${bnDigits(row.year)}: ${crop.name.bn}; জৈব পদার্থ ${num(om, 'bn', { dp: 2 })}%`, `${row.year}: ${crop.name.en}; organic matter ${num(om, 'en', { dp: 2 })}%`)}>
          <defs>
            <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={season === 2 ? '#cfe0ec' : season === 1 ? '#fbe9c8' : '#e7f1f7'} />
              <stop offset="1" stopColor="#f6f8f1" />
            </linearGradient>
            <linearGradient id={`soil-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={soilColour(ratio)} />
              <stop offset="0.55" stopColor={mix('#b58c66', '#5a4027', Math.max(0, Math.min(1, 0.45 + (ratio - 1) * 3)))} />
              <stop offset="1" stopColor="#a98563" />
            </linearGradient>
          </defs>
          <rect width={W} height={SKY} fill={`url(#sky-${uid})`} />
          {season === 2 && <rect y={SKY - 7} width={W} height="7" fill="#7fb3d5" opacity=".55" className="soil-shimmer" />}
          {irrigated && Array.from({ length: Math.min(6, 1 + Math.round(slotWater / 120)) }, (_, i) => (
            <path key={`${key}-d${i}`} className="soil-drop" style={{ animationDelay: `${i * 260}ms` }}
              d={`M${24 + i * 33} 8 q4 7 0 10 q-4 -3 0 -10z`} fill="#2f8a8f" opacity=".75" />
          ))}
          <g key={key}>
            {Array.from({ length: plantsN }, (_, i) => <Plant key={i} k={i} x={18 + i * 31} look={look} grow={1} />)}
            {!look && <path d={`M10 ${SKY - 1} l20 -2 l14 2 l22 -1 l18 2 l30 -2 l26 1 l24 -1 l30 2`} stroke="#9a7a55" strokeWidth="1.5" fill="none" />}
          </g>
          <rect y={SKY} width={W} height={H - SKY} fill={`url(#soil-${uid})`} style={{ transition: 'fill 900ms' }} />
          {specks.slice(0, speckN).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#1f140b" opacity=".35" />)}
          <g key={`r-${key}`} className="soil-roots">
            {look && Array.from({ length: plantsN }, (_, i) => {
              const x = 18 + i * 31, d = (H - SKY) * rootDepth;
              return <path key={i} d={`M${x} ${SKY} q-6 ${d * 0.4} 2 ${d * 0.7} t-3 ${d * 0.3} M${x} ${SKY + 8} q9 ${d * 0.3} 13 ${d * 0.55}`} stroke="#f3e6cf" strokeWidth="1.3" fill="none" opacity=".85" pathLength="1" />;
            })}
          </g>
          {Array.from({ length: worms }, (_, i) => (
            <path key={`w${i}`} className="soil-worm" style={{ animationDelay: `${i * 0.7}s` }}
              d={`M${30 + ((i * 53) % 150)} ${SKY + 70 + ((i * 37) % 110)} q6 -6 12 0 t12 0 t12 0`} stroke="#d58a7f" strokeWidth="4" strokeLinecap="round" fill="none" />
          ))}
          {Array.from({ length: pests }, (_, i) => (
            <g key={`p${i}-${key}`} className="soil-pest" style={{ animationDelay: `${i * 0.4}s` }} transform={`translate(${40 + i * 44} ${SKY - 12})`}>
              <ellipse rx="4.6" ry="3.4" fill="#b3261e" /><circle cx="-4" r="2" fill="#5b130f" />
            </g>
          ))}
          <line x1="0" x2={W} y1={SKY} y2={SKY} stroke="#5d4530" strokeWidth="1.4" />
          <text x="8" y={H - 9} fontSize="8.5" fill="#fff" opacity=".8">{T('০–৩০ সেমি মাটি', 'Topsoil 0–30 cm')}</text>
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-bold text-ink shadow-sm">{L(crop.name)}</div>
        <div className="pointer-events-none absolute bottom-7 right-2 rounded-lg bg-black/45 px-2 py-1 text-right text-white backdrop-blur-[2px]">
          <div className="text-[10.5px] leading-none opacity-85">{T('জৈব পদার্থ', 'Organic matter')}</div>
          <div className="font-display text-[17px] font-bold leading-tight tabular">{num(om, lang, { dp: 2 })}%</div>
        </div>
      </div>
    </figure>
  );
}
