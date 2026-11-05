// A living cut through one field's topsoil (0–30 cm), season by season, for one rotation (engine/soilfuture.js).
// Everything in it comes from the simulation or the field's own SoilGrids profile, drawn the way a soil scientist
// would sketch a paddy-field pit in Bangladesh:
//   Horizons   the tilled layer (Ap), the plough pan that puddling for rice packs down at about 15–20 cm (thicker
//              with two puddled crops a year: Sharma & De Datta 1985; BRRI), and the subsoil below it.
//   Colour     darker with more organic matter (Munsell value falls as OM rises), set from the modelled carbon.
//   Mottles    rust-orange iron mottles and grey streaks in the subsoil where the field drains imperfectly or poorly
//              (SoilGrids WRB/drainage): the redoximorphic sign of soil that stands wet for months.
//   Texture    sand grains from the field's sand share; crumbs (aggregates) from soil health, broken into slurry
//              while a paddy is puddled.
//   Roots      fibrous rice roots crowd the top 10 cm and bend gently along the pan; wheat's fibrous roots and the
//              taproots of mustard, legumes, tomato, sesame and jute push through it. Legumes carry nitrogen
//              nodules when the model credits them with fixed nitrogen.
//   Flooding   a puddled field runs out of oxygen within days: under a thin brown oxidised skin the tilled layer turns
//              grey (reduced iron), rice roots leak oxygen and coat themselves in rust-orange iron plaque, and
//              microbes break organic matter down to methane, which bubbles up through the water and escapes through
//              the plants' own air channels. The bubbles follow the field's methane rate (methaneRate, the same IPCC
//              2019 numbers as the climate account): Boro more than rainfed Aman, more again with straw kept.
//   Drying     a clay-rich topsoil (35% clay or more, as on the Barind) cracks as it dries in the dry seasons, half as
//              much under heavy irrigation.
//   Life       earthworms follow the soil-health score and leave burrows (biopores) through the pan; none while the
//              field is flooded (no air).
//   Surface    standing water on a puddled crop, a straw layer when straw and stubble are kept, irrigation drops
//              when the season needs water, and pests and root disease when a crop family follows itself.
//   Growth     each season the crop grows from seedling to full size and its grain or fruit ripens from green.
// With reduced motion the picture stands still at the same state.
import { useId, useMemo } from 'react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { cropOf, omPctOf, CARBON, CH4, methaneRate } from '../../engine/soilfuture';

export const SKY = 96; // the soil surface in the drawing's own units (Plant draws up from it)
const W = 220, H = 320, DEPTH = 30;
const PX = (H - SKY) / DEPTH; // pixels per centimetre of soil
const ycm = (cm) => SKY + cm * PX;
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
// Soil horizons are never ruler-straight: a boundary across the column at y px, wandering by up to amp px, smoothed.
const edgePts = (y, amp, seed) => Array.from({ length: W / 11 + 2 }, (_, i) => [Math.min(W, i * 11), y + (rnd(i, seed) - 0.5) * 2 * amp]);
const smoothD = (pts, move = true) => pts.reduce((d, [x, y], i) => {
  if (i === 0) return `${move ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  const [px, py] = pts[i - 1];
  return `${d} Q${px.toFixed(1)} ${py.toFixed(1)} ${((px + x) / 2).toFixed(1)} ${((py + y) / 2).toFixed(1)}`;
}, '') + ` L${pts.at(-1)[0].toFixed(1)} ${pts.at(-1)[1].toFixed(1)}`;
const band = (top, bottom, seed) => `${smoothD(top)} ${smoothD([...bottom].reverse(), false)} Z`;

// How each crop stands and roots. n: plants across the cut (by its usual spacing); h: height in px;
// root: 'fibrous' or 'tap' and how deep in cm (past 30 runs out of the picture).
export const LOOK = {
  boro: { kind: 'rice', n: 7, h: 60, leaf: '#4f9a3c', top: '#d6b44a', root: 'fibrous', depth: 20 },
  aman: { kind: 'rice', n: 7, h: 66, leaf: '#3f8a35', top: '#d9b54c', root: 'fibrous', depth: 20 },
  aus: { kind: 'rice', n: 7, h: 54, leaf: '#58a043', top: '#d2b253', root: 'fibrous', depth: 24 },
  wheat: { kind: 'wheat', n: 9, h: 58, leaf: '#7da449', top: '#d9a940', root: 'fibrous', depth: 36 },
  lentil: { kind: 'lentil', n: 9, h: 26, leaf: '#6e9c43', top: '#a7c36c', root: 'tap', depth: 32, legume: true },
  mungbean: { kind: 'mung', n: 7, h: 36, leaf: '#4f8f34', top: '#26251f', root: 'tap', depth: 30, legume: true },
  mustard: { kind: 'mustard', n: 8, h: 64, leaf: '#6f9a3a', top: '#f2c314', root: 'tap', depth: 36 },
  tomato: { kind: 'tomato', n: 4, h: 54, leaf: '#3f7f34', top: '#d8432c', root: 'tap', depth: 34 },
  sesame: { kind: 'sesame', n: 7, h: 66, leaf: '#62953d', top: '#f6eef0', root: 'tap', depth: 32 },
  jute: { kind: 'jute', n: 9, h: 86, leaf: '#2f7a2f', top: '#e9c43c', root: 'tap', depth: 32 },
};
// Blend two colours, given as #rrggbb or as rgb(r,g,b) (what mix itself returns, so blends can be blended again).
const mix = (a, b, t) => {
  const p = (h) => (h.startsWith('rgb') ? h.match(/\d+/g).map(Number) : [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const [x, y] = [p(a), p(b)];
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
};
// Topsoil colour from organic matter: about 1% reads as pale brown, about 5% as dark humus brown.
const topColour = (om) => mix('#b9946a', '#3b2a1b', (om - 1) / 4);

export function Plant({ x, look, k }) {
  const b = SKY, h = look.h;
  const L = look.leaf, C = look.top;
  const stroke = { fill: 'none', strokeLinecap: 'round' };
  let body;
  if (look.kind === 'rice') {
    // A hill of tillers fanning out, arching leaves, and drooping panicles of grain.
    body = <>
      {[-2, -1, 0, 1, 2].map((t) => <path key={`s${t}`} d={`M${x} ${b} Q${x + t * 1.5} ${b - h * 0.5} ${x + t * 3.2} ${b - h * 0.78}`} stroke={L} strokeWidth="1.6" {...stroke} />)}
      {[-1, 1].flatMap((sg) => [0.45, 0.7].map((f, i) => <path key={`l${sg}${i}`} d={`M${x} ${b - h * f * 0.5} q${sg * 9} ${-h * 0.25} ${sg * 14} ${-h * (0.2 + i * 0.12)}`} stroke={L} strokeWidth="1.4" {...stroke} />))}
      {[-1, 0, 1].map((t) => {
        const tx = x + t * 3.2 * 1.4, ty = b - h * 0.78;
        return <g key={`p${t}`}>
          <path d={`M${tx} ${ty} q${3 + t * 2} -6 ${6 + t * 3} 2 q2 5 1 11`} stroke={C} strokeWidth="1.3" {...stroke} />
          {[0, 1, 2, 3].map((g) => <ellipse key={g} className="soil-ripen" style={{ '--ripe': C }} cx={tx + 6 + t * 3 + (g % 2 ? 1.2 : -0.6)} cy={ty + 1 + g * 2.6} rx="1.5" ry="0.9" fill={C} />)}
        </g>;
      })}
    </>;
  } else if (look.kind === 'wheat') {
    body = <>
      {[-2.5, 0, 2.5].map((t) => {
        const tx = x + t, ty = b - h * (0.88 + (t === 0 ? 0.08 : 0));
        return <g key={t}>
          <path d={`M${x} ${b} Q${x + t * 0.4} ${b - h * 0.5} ${tx} ${ty}`} stroke={L} strokeWidth="1.5" {...stroke} />
          {[0, 1, 2, 3, 4].map((g) => <ellipse key={g} className="soil-ripen" style={{ '--ripe': C }} cx={tx + (g % 2 ? 1.1 : -1.1)} cy={ty - g * 2.6} rx="1.6" ry="1.4" fill={C} />)}
          {[0, 1, 2, 3, 4].map((g) => <path key={`a${g}`} d={`M${tx + (g % 2 ? 1.6 : -1.6)} ${ty - g * 2.6} l${g % 2 ? 3 : -3} -6`} stroke={C} strokeWidth=".5" />)}
        </g>;
      })}
      {[-1, 1].map((sg) => <path key={sg} d={`M${x} ${b - h * 0.25} q${sg * 6} -8 ${sg * 11} -14`} stroke={L} strokeWidth="1.3" {...stroke} />)}
    </>;
  } else if (look.kind === 'mustard') {
    // Branching stem, racemes of four-petalled yellow flowers on top, thin pods (siliques) below them.
    const tops = [[0, 1], [-7, 0.82], [7, 0.78]];
    body = <>
      <path d={`M${x} ${b} L${x} ${b - h}`} stroke={L} strokeWidth="1.8" />
      <path d={`M${x} ${b - h * 0.55} L${x - 7} ${b - h * 0.82} M${x} ${b - h * 0.5} L${x + 7} ${b - h * 0.78}`} stroke={L} strokeWidth="1.3" {...stroke} />
      {[-1, 1].map((sg) => <path key={sg} d={`M${x} ${b - h * 0.18} q${sg * 9} -2 ${sg * 12} -10 q${-sg * 6} 1 ${-sg * 12} 10z`} fill={L} opacity=".9" />)}
      {tops.map(([dx, f], i) => <g key={i}>
        {[0, 1, 2].map((j) => <path key={j} d={`M${x + dx} ${b - h * f + 6 + j * 4} l${j % 2 ? 4 : -4} -3`} stroke="#8aa64a" strokeWidth=".9" />)}
        {[0, 1, 2, 3].map((j) => { const a = (j / 4) * Math.PI * 2; return <circle key={`f${j}`} cx={x + dx + Math.cos(a) * 2} cy={b - h * f + Math.sin(a) * 2} r="1.7" fill={C} />; })}
      </g>)}
    </>;
  } else if (look.kind === 'tomato') {
    // Zig-zag stem, compound leaves of paired leaflets, trusses of red fruit with green calyces.
    const leaf = (f, sg, i) => {
      const y0 = b - h * f, x0 = x + sg * 1;
      return <g key={`lf${i}`}>
        <path d={`M${x0} ${y0} q${sg * 8} -3 ${sg * 15} -1`} stroke={L} strokeWidth="1" {...stroke} />
        {[4, 8, 12].map((d, j) => <ellipse key={j} cx={x0 + sg * d} cy={y0 - 1.6 - (j % 2)} rx="2.3" ry="1.3" fill={L} transform={`rotate(${sg * -20} ${x0 + sg * d} ${y0})`} />)}
      </g>;
    };
    body = <>
      <path d={`M${x} ${b} L${x + 2} ${b - h * 0.3} L${x - 1} ${b - h * 0.6} L${x + 1} ${b - h}`} stroke="#4c7a2f" strokeWidth="2" {...stroke} />
      {[[0.28, -1], [0.45, 1], [0.66, -1], [0.85, 1]].map(([f, sg], i) => leaf(f, sg, i))}
      {[[0.35, 6], [0.58, -6]].map(([f, dx], i) => <g key={`t${i}`}>
        {[0, 1, 2].map((j) => <g key={j}><circle cx={x + dx + (j - 1) * 3.8} cy={b - h * f + (j === 1 ? 2.5 : 0)} r="3.2" fill={C} /><circle cx={x + dx + (j - 1) * 3.8} cy={b - h * f - 2.6 + (j === 1 ? 2.5 : 0)} r="0.9" fill="#3d7a2c" /></g>)}
      </g>)}
    </>;
  } else if (look.kind === 'lentil') {
    // A low, bushy plant: arching branches with paired leaflets (pinnate), small flat pods.
    const br = [[-9, 0.7], [-4, 0.95], [1, 1], [6, 0.9], [10, 0.65]];
    body = <>
      {br.map(([dx, f], i) => {
        const tx = x + dx, ty = b - h * f;
        return <g key={i}>
          <path d={`M${x} ${b} Q${x + dx * 0.3} ${b - h * f * 0.6} ${tx} ${ty}`} stroke="#5f8a38" strokeWidth=".9" {...stroke} />
          {[0.35, 0.55, 0.75, 0.92].map((g, j) => {
            const px = x + dx * (0.3 + g * 0.7) * 0.95, py = b - h * f * g;
            return <g key={j}><ellipse cx={px - 1.6} cy={py} rx="1.4" ry=".7" fill={L} /><ellipse cx={px + 1.6} cy={py - 0.4} rx="1.4" ry=".7" fill={L} /></g>;
          })}
        </g>;
      })}
      {[-5, 3].map((dx, i) => <ellipse key={`p${i}`} cx={x + dx} cy={b - h * (0.42 + i * 0.12)} rx="2.2" ry="1.2" fill={C} stroke="#7d9a4a" strokeWidth=".3" />)}
    </>;
  } else if (look.kind === 'mung') {
    // An erect, bushy plant: a main stem and two side branches, trifoliate leaves on long stalks (broad ovate leaflets
    // with a midrib), and slim pods in clusters of three to five on stalks in the upper canopy, black when ripe.
    const leaflet = (cx, cy, a, sz, key) => <g key={key} transform={`rotate(${a} ${cx} ${cy})`}>
      <path d={`M${cx} ${cy} q${-sz * 0.55} ${-sz * 0.5} 0 ${-sz * 1.25} q${sz * 0.55} ${sz * 0.75} 0 ${sz * 1.25}z`} fill={L} />
      <path d={`M${cx} ${cy} l0 ${-sz * 1.1}`} stroke="#3c6f25" strokeWidth=".35" opacity=".7" />
    </g>;
    const tri = (px, py, dir, sz, key) => {
      const ex = px + dir * sz * 1.5, ey = py - sz * 0.9; // the end of the leaf stalk
      return <g key={key}>
        <path d={`M${px} ${py} q${dir * sz * 0.8} ${-sz * 0.2} ${dir * sz * 1.5} ${-sz * 0.9}`} stroke="#4a7a2c" strokeWidth=".6" {...stroke} />
        {leaflet(ex, ey, dir * 58, sz, 'a')}{leaflet(ex, ey, dir * 12, sz * 1.1, 'b')}{leaflet(ex, ey, dir * -34, sz * 0.95, 'c')}
      </g>;
    };
    const pods = (px, py, dir, key) => <g key={key}>
      <path d={`M${px} ${py} q${dir * 2} -4 ${dir * 3} -7`} stroke="#4a7a2c" strokeWidth=".55" {...stroke} />
      {[-22, 4, 26].map((a, j) => { const sx = Math.sin((a * Math.PI) / 180); return <path key={j} className="soil-ripen-stroke" style={{ '--ripe': C }} d={`M${px + dir * 3} ${py - 7} q${sx * 3.5 + dir} 1.5 ${sx * 4.5 + dir * 1.6} 6.5`} stroke={C} strokeWidth=".8" {...stroke} />; })}
    </g>;
    body = <>
      <path d={`M${x} ${b} Q${x - 1.5} ${b - h * 0.5} ${x} ${b - h}`} stroke="#4a7a2c" strokeWidth="1.5" {...stroke} />
      <path d={`M${x} ${b - h * 0.32} q-5 -4 -8 -${h * 0.38}M${x} ${b - h * 0.4} q5 -4 8 -${h * 0.34}`} stroke="#4a7a2c" strokeWidth="1" {...stroke} />
      {pods(x - 6, b - h * 0.5, -1, 'pa')}{pods(x + 6, b - h * 0.58, 1, 'pb')}
      {tri(x - 1, b - h * 0.3, -1, 4.2, 't0')}{tri(x + 1, b - h * 0.42, 1, 4.4, 't1')}
      {tri(x - 7, b - h * 0.62, -1, 4, 't2')}{tri(x + 7, b - h * 0.7, 1, 4, 't3')}
      {tri(x, b - h * 0.9, -1, 4.2, 't4')}{tri(x + 1, b - h * 0.97, 1, 3.6, 't5')}
      {pods(x + 2, b - h * 0.8, 1, 'pc')}
    </>;
  } else if (look.kind === 'sesame') {
    body = <>
      <path d={`M${x} ${b} L${x} ${b - h}`} stroke={L} strokeWidth="1.8" />
      {[0.25, 0.45, 0.65, 0.85].map((f, i) => <g key={i}>
        {[-1, 1].map((sg) => <path key={sg} d={`M${x} ${b - h * f} q${sg * 6} -1 ${sg * 10} -6 q${-sg * 5} 0 ${-sg * 10} 6z`} fill={L} />)}
        {f > 0.5 ? <path d={`M${x + (i % 2 ? 1.5 : -1.5)} ${b - h * f - 2} l${i % 2 ? 2 : -2} -4 l${i % 2 ? 2 : -2} 1 z`} fill={C} stroke="#d9b8c4" strokeWidth=".5" />
          : <rect x={x + (i % 2 ? 1 : -3)} y={b - h * f - 5} width="2" height="5" rx="1" fill="#7f9c4a" />}
      </g>)}
    </>;
  } else if (look.kind === 'jute') {
    body = <>
      <path d={`M${x} ${b} L${x} ${b - h}`} stroke="#6b5a2a" strokeWidth="1.6" />
      {[0.55, 0.65, 0.75, 0.85, 0.95].map((f, i) => <path key={i} d={`M${x} ${b - h * f} q${i % 2 ? 7 : -7} -1 ${i % 2 ? 10 : -10} -6 q${i % 2 ? -5 : 5} 2 ${i % 2 ? -10 : 10} 6z`} fill={L} />)}
      <circle cx={x + 1.5} cy={b - h - 1} r="1.6" fill={C} />
    </>;
  }
  return <g className="soil-grow" style={{ transformOrigin: `${x}px ${b}px`, animationDelay: `${(k % 5) * 60}ms` }}>
    <g className="soil-sway" style={{ transformOrigin: `${x}px ${b}px`, animationDelay: `${-(k * 0.83) % 4}s`, animationDuration: `${3.6 + (k % 3) * 0.5}s` }}>{body}</g>
  </g>;
}

// Roots for one plant. pan: { top, bottom } in cm or null; legume nodules when fixing nitrogen.
function Roots({ x, look, k, pan, nodules, density, disease, flooded, nodFill }) {
  const out = [];
  const end = (cm) => Math.min(ycm(cm), H + 8);
  const plaque = flooded && look.kind === 'rice'; // rice roots leak oxygen into reduced soil: rust-orange iron plaque
  const root = (key, d, w, o = 0.85) => {
    if (plaque) out.push(<path key={`${key}-fe`} d={d} stroke="#c47a35" strokeWidth={w + 0.9} fill="none" opacity=".2" strokeLinecap="round" pathLength="1" />);
    // a darker rim under a pale core, so a root reads as round and alive rather than a flat line
    out.push(<path key={`${key}-rim`} d={d} stroke="#9c8159" strokeWidth={w + 0.55} fill="none" opacity={o * 0.38} strokeLinecap="round" pathLength="1" />);
    out.push(<path key={key} d={d} stroke="#f3e6cc" strokeWidth={w} fill="none" opacity={o} strokeLinecap="round" pathLength="1" />);
  };
  if (look.root === 'fibrous') {
    // Rice and wheat: a mat of fine roots, most of them in the top 10 cm. Rice roots meet the pan and run along it;
    // wheat sends some through cracks and old root channels.
    const n = Math.round(14 + 8 * density), deepShare = look.depth > 30 ? 0.4 : 0.12;
    for (let i = 0; i < n; i++) {
      const a = (rnd(i, k) - 0.5) * 2;
      // Depth skewed to the surface (most rice root mass is in the top 10 cm); shallow roots spread wide, deep ones steep.
      let stop = 2 + (look.depth - 2) * rnd(i, k + 4) ** 2.1;
      const through = pan && stop > pan.top && rnd(i, k + 9) < deepShare;
      // Roots stopped by the pan end at different depths above it; about a third creep along its top.
      const blocked = pan && stop > pan.top - 1 && !through;
      const bent = blocked && rnd(i, k + 13) < 0.35;
      if (blocked) stop = bent ? pan.top - 0.3 : pan.top - 0.8 - 4 * rnd(i, k + 14);
      const steep = stop / look.depth, ex = x + a * (20 - 12 * steep), ey = end(stop);
      const mid = SKY + (ey - SKY) * 0.7;
      // A root that meets the pan curves over smoothly and creeps along its top instead of turning a corner.
      const d = bent
        ? `M${x + a} ${SKY + 1} C${x + a * 7} ${SKY + (ey - SKY) * 0.25} ${ex - a * 1.5} ${mid} ${ex} ${ey - 2.2} S${ex + (a >= 0 ? 4 : -4)} ${ey} ${ex + (a >= 0 ? 6 + 6 * rnd(i, k + 5) : -6 - 6 * rnd(i, k + 5))} ${ey + 0.4}`
        : `M${x + a} ${SKY + 1} C${x + a * 7} ${SKY + (ey - SKY) * 0.25} ${ex - a * 2} ${mid} ${ex} ${ey}`;
      root(`f${i}`, d, 0.45 + 0.4 * steep, 0.6 + 0.25 * steep);
      // Laterals off the upper half, and fine branches near the surface where most uptake happens.
      if (i % 2 === 0) root(`fb${i}`, `M${(x + ex) / 2} ${(SKY + ey) / 2} q${a * 3} 2 ${a * 5} 5`, 0.3, 0.5);
      if (i % 3 === 1 && stop > 4) root(`fh${i}`, `M${x + a * 3.5} ${SKY + (ey - SKY) * 0.18} q${a >= 0 ? 2.5 : -2.5} 0.6 ${a >= 0 ? 4 : -4} 2.4`, 0.25, 0.45);
    }
  } else {
    // A taproot that thins with depth and wanders a little, laterals that curve down and shorten with depth.
    // The taproot meanders around stones and old root channels: six short segments, each a little thinner.
    const d = look.depth, wob = (rnd(k, 31) - 0.5) * 9;
    const N = 6, tx = (cm) => x + wob * Math.sin((cm / d) * 2.6 + k) + 1.6 * Math.sin(cm * 0.9 + k * 2.3);
    const pts = Array.from({ length: N + 1 }, (_, i) => { const cm = (d * i) / N; return [i ? tx(cm) : x, i === N ? end(d) : ycm(cm)]; });
    for (let i = 0; i < N; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], bend = (rnd(i, k + 33) - 0.5) * 3;
      root(`t${i}`, `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${((ax + bx) / 2 + bend).toFixed(1)} ${((ay + by) / 2).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`, 2.1 * (1 - i / (N + 1.5)), 0.92 - i * 0.07);
    }
    for (let i = 0; i < 9; i++) {
      // Laterals leave the taproot at a shallow angle, arch outwards and bend down; long near the crown, shorter deeper.
      const cm = 1.2 + i * (d / 10), sg = rnd(i, k + 21) < 0.5 ? 1 : -1, len = (8 + rnd(i, k) * 9) * (1 - i / 12);
      const yy = ycm(cm), xx = tx(cm);
      root(`l${i}`, `M${xx.toFixed(1)} ${yy.toFixed(1)} c${(sg * len * 0.45).toFixed(1)} ${(-len * 0.04).toFixed(1)} ${(sg * len * 0.85).toFixed(1)} ${(len * 0.18).toFixed(1)} ${(sg * len).toFixed(1)} ${(len * 0.7).toFixed(1)}`, 0.75 - i * 0.04, 0.78);
      // secondary branches off each lateral, and fine root hairs near its tip where water and nutrients go in
      if (i < 5) root(`ls${i}`, `M${xx + sg * len * 0.55} ${yy + len * 0.18} q${sg * 2} 1 ${sg * 3} 4`, 0.35, 0.55);
      if (i < 5) root(`lt${i}`, `M${xx + sg * len * 0.3} ${yy + len * 0.07} q${sg * 2.4} -0.4 ${sg * 3.6} 2.6`, 0.28, 0.5);
      if (i < 4) for (let hh = 0; hh < 3; hh++) root(`lh${i}${hh}`, `M${xx + sg * len * (0.8 + hh * 0.07)} ${yy + len * (0.45 + hh * 0.09)} l${sg * (1.4 + hh * 0.3)} ${-0.6 + hh * 0.5}`, 0.16, 0.45);
      // Nodules: round, pink-brown, clustered on the upper laterals near the crown (most in the top 10 cm)
      if (nodules && cm < 9) for (let nd = 0; nd < (i === 0 ? 2 : 1); nd++) {
        const f = 0.22 + nd * 0.25;
        out.push(<circle key={`n${i}${nd}`} cx={xx + sg * len * f} cy={yy + len * (0.02 + f * f * 0.5) + 0.7} r={0.85 + rnd(i * 3 + nd, k) * 0.45} fill={nodFill} stroke="#8a5a4c" strokeWidth=".2" />);
      }
      if (nodules && i === 0) out.push(<circle key="ncrown" cx={x + 1.4} cy={ycm(1.6)} r="1.15" fill={nodFill} stroke="#8a5a4c" strokeWidth=".2" />);
    }
  }
  // Root disease from a crop family following itself: brown lesions on the upper roots.
  if (disease && k % 2 === 0) out.push(<ellipse key="dz" cx={x + 2} cy={ycm(5 + (k % 3) * 2)} rx="2.6" ry="1.6" fill="#5b2f17" opacity=".9" />);
  return <>{out}</>;
}

// What one column shows in one season: the crop, whether it stands flooded, whether the clay cracks, whether a
// legume carries nodules, whether it is irrigated. The column draws from this and the caption below explains it.
export function frameState(row, season, soil = {}) {
  const id = season === 0 ? row.rabi : season === 1 ? row.k1 : 'aman';
  const flooded = !!CARBON[id]?.puddle;
  const slotWater = row.slotWater?.[season] ?? 0;
  const clay = soil.clay ?? 0;
  return {
    id, flooded, slotWater,
    irrigated: id !== 'fallow' && slotWater > 0 && !flooded,
    // Shrink-swell clay cracks whenever it dries out between waterings in the dry seasons (Rabi, Kharif-1); heavy
    // irrigation narrows the cracks but does not stop them.
    cracks: !flooded && clay >= 35 && season !== 2 ? Math.round((3 + (clay - 35) / 3) * (slotWater > 300 ? 0.5 : 1)) : 0,
    nodules: !!LOOK[id]?.legume && (row.nFix ?? 0) > 0,
  };
}

// season: 0 Rabi, 1 Kharif-1, 2 Aman; row: that year's simulation row; soc0: carbon at the start.
export default function SoilColumn({ row, season, soc0, soil = {}, health, title, tone = '#2f6e2f', badge, residue }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { id, flooded, slotWater, irrigated, cracks, nodules } = frameState(row, season, soil);
  const crop = cropOf(id);
  const look = LOOK[id];
  const om = omPctOf(row.soc, soil), om0 = omPctOf(soc0, soil), dOm = om - om0;
  const puddles = row.puddles ?? 1;
  const pan = puddles > 0 ? { top: 15, bottom: 15 + 2.5 + 1.5 * Math.min(2, puddles) } : null;
  const drainage = soil.drainage ?? 'imperfect';
  const mottleN = drainage === 'poor' ? 22 : drainage === 'imperfect' ? 12 : 3;
  const sand = soil.sand ?? 25;
  // No air in a flooded field: the worms leave or die back until it drains.
  const worms = flooded ? 0 : Math.max(0, Math.round(health / 18));
  const burrows = Math.max(1, Math.round(health / 22));
  const crumbs = flooded ? 0 : Math.round(4 + health / 7);
  const rep = row.rep?.[season] ?? 0;
  const pests = rep >= 1 ? 3 : rep > 0 ? 1 : 0;
  const density = Math.max(0, Math.min(1, (row.input ?? 4) / 8));
  const straw = residue === 'retain';
  // Methane bubbles in proportion to the field's methane rate; straw a field goes in with is taken at a typical
  // 5 t/ha of rice straw, three fifths of it kept when straw is retained and a quarter otherwise (CARBON keep).
  const bubbles = flooded ? Math.round(6 * methaneRate(id, straw ? 3 : 1.25) / CH4.ef) : 0;

  const key = `${row.year}-${season}`;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const top = topColour(om);
  const gley = mix(top, '#727a70', 0.55); // the reduced, grey tilled layer of a flooded field
  const grains = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: 4 + rnd(i, 2) * (W - 8), y: SKY + 3 + rnd(i, 3) * (H - SKY - 6), r: 0.6 + rnd(i, 4) * 0.9 })), []);
  const nGrains = Math.round(10 + sand * 0.9);
  const plantsN = look?.n ?? 0, gap = W / (plantsN + 1);
  const ps = Array.from({ length: plantsN }, (_, i) => Math.round(gap * (i + 1)));
  return (
    <figure className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <figcaption className="truncate text-[14px] font-bold" style={{ color: tone }}>{title}</figcaption>
        {badge}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-[#eaf3fb]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
          aria-label={T(`${bnDigits(row.year)}: ${crop.name.bn}; জৈব পদার্থ ${num(om, 'bn', { dp: 2 })}%${pan ? ', ১৫ সেমিতে শক্ত তলা' : ''}`, `${row.year}: ${crop.name.en}; organic matter ${num(om, 'en', { dp: 2 })}%${pan ? ', plough pan at 15 cm' : ''}`)}>
          <defs>
            <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={season === 2 ? '#c9dbe8' : season === 1 ? '#fbe6c2' : '#e4eff6'} />
              <stop offset="1" stopColor="#f6f8f1" />
            </linearGradient>
            <linearGradient id={`soil-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={top} />
              <stop offset={pan ? pan.top / DEPTH : 0.5} stopColor={mix('#b9946a', '#3b2a1b', ((om - 1) / 4) * 0.6)} />
              <stop offset="1" stopColor={drainage === 'poor' ? '#9a958a' : '#b0916b'} />
            </linearGradient>
            {/* Flooded: a thin oxidised brown skin, then grey reduced soil down to the pan; the subsoil as usual. */}
            <linearGradient id={`gley-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8a6440" />
              <stop offset={0.8 / DEPTH} stopColor="#8a6440" />
              <stop offset={1.4 / DEPTH} stopColor={gley} />
              <stop offset={pan ? pan.top / DEPTH : 0.5} stopColor={mix(gley, '#5d6359', 0.3)} />
              <stop offset="1" stopColor={drainage === 'poor' ? '#9a958a' : '#b0916b'} />
            </linearGradient>
            {/* Soil is never flat colour: fine grain (silt and sand catching light) and coarse patches of darker
                humus and lighter mineral soil, from fractal noise, laid over the horizon colours. */}
            <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed={3} result="fine" />
              <feColorMatrix in="fine" type="matrix" values="0 0 0 0 .1  0 0 0 0 .07  0 0 0 0 .04  0 0 0 1.4 -.62" />
            </filter>
            <filter id={`patch-${uid}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency=".045 .07" numOctaves="3" seed={11} result="coarse" />
              <feColorMatrix in="coarse" type="matrix" values="0 0 0 0 .14  0 0 0 0 .09  0 0 0 0 .05  0 0 0 1.3 -.5" />
            </filter>
            <linearGradient id={`light-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".14" /><stop offset=".22" stopColor="#fff" stopOpacity="0" />
              <stop offset=".8" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".18" />
            </linearGradient>
            <linearGradient id={`side-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity=".16" /><stop offset=".08" stopColor="#000" stopOpacity="0" />
              <stop offset=".92" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".16" />
            </linearGradient>
            <radialGradient id={`nod-${uid}`} cx=".38" cy=".35" r=".7">
              <stop offset="0" stopColor="#f1d2bf" /><stop offset=".6" stopColor="#c99a80" /><stop offset="1" stopColor="#8f6450" />
            </radialGradient>
            <linearGradient id={`worm-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e8a596" /><stop offset=".5" stopColor="#c8746a" /><stop offset="1" stopColor="#a1544d" />
            </linearGradient>
            <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9cc7e0" stopOpacity=".55" /><stop offset="1" stopColor="#5f9cc4" stopOpacity=".8" />
            </linearGradient>
          </defs>
          <rect width={W} height={SKY} fill={`url(#sky-${uid})`} />
          {irrigated && Array.from({ length: Math.min(6, 1 + Math.round(slotWater / 120)) }, (_, i) => (
            <path key={`${key}-d${i}`} className="soil-drop" style={{ animationDelay: `${i * 260}ms` }}
              d={`M${24 + i * 33} 8 q4 7 0 10 q-4 -3 0 -10z`} fill="#2f8a8f" opacity=".75" />
          ))}

          {/* Soil: horizons, then what lives and grows in them. */}
          <rect y={SKY} width={W} height={H - SKY} fill={`url(#${flooded ? 'gley' : 'soil'}-${uid})`} />
          <rect y={SKY} width={W} height={H - SKY} filter={`url(#patch-${uid})`} opacity=".32" />
          <rect y={SKY} width={W} height={H - SKY} filter={`url(#grain-${uid})`} opacity={flooded ? 0.35 : 0.6} />
          {/* the subsoil below the tilled layer, under an uneven boundary */}
          <path d={band(edgePts(ycm(pan ? pan.bottom : 17) + 2, 1.6, 71), [[0, H + 2], [W, H + 2]], 0)} fill={drainage === 'poor' ? '#8f8a7e' : '#a98a64'} opacity=".28" />
          {pan && <>
            <path d={band(edgePts(ycm(pan.top), 1.3, 31), edgePts(ycm(pan.bottom), 1.1, 37), 0)} fill="#4e3d2d" opacity=".3" />
            <path d={smoothD(edgePts(ycm(pan.top), 1.3, 31))} stroke="#2e2117" strokeWidth=".6" opacity=".35" fill="none" />
            {/* Platy structure: thin flattened lenses packed by the puddling. */}
            {Array.from({ length: 30 }, (_, i) => {
              const px = rnd(i, 41) * W, py = ycm(pan.top + 0.4 + rnd(i, 42) * (pan.bottom - pan.top - 0.8)), len = 6 + rnd(i, 43) * 12;
              return <path key={`pl${i}`} d={`M${px} ${py} q${len / 2} -0.9 ${len} 0`} stroke="#2e2117" strokeWidth=".7" opacity=".38" fill="none" />;
            })}
          </>}
          {grains.slice(0, nGrains).map((p, i) => <circle key={`g${i}`} cx={p.x} cy={p.y} r={p.r} fill="#efe1c4" opacity=".55" />)}
          {grains.slice(0, Math.round(14 + om * 8)).map((p, i) => p.y < ycm(pan ? pan.top : 15) && <circle key={`h${i}`} cx={(p.x * 1.7) % W} cy={p.y} r={p.r * 1.1} fill="#1f140b" opacity=".35" />)}
          {Array.from({ length: crumbs }, (_, i) => (
            <path key={`c${i}`} d={`M${8 + rnd(i, 7) * (W - 16)} ${ycm(1 + rnd(i, 8) * 11)} q2 -2.4 4.4 -.4 q1.4 2.6 -1.6 3.2 q-3.6 .2 -2.8 -2.8z`} fill={mix('#2a1c11', '#6a4b30', rnd(i, 9))} opacity=".55" />
          ))}
          {Array.from({ length: cracks }, (_, i) => {
            const cx = 14 + ((i * 47 + 23) % (W - 28)), dep = 4 + rnd(i, 51) * 5, w0 = 1.6 + rnd(i, 52) * 1.2;
            const zig = [0.3, 0.6, 1].map((f, j) => `${cx + (j % 2 ? 1.6 : -1.4) * (1 - f / 2)} ${ycm(dep * f)}`).join(' L');
            return <path key={`k${i}-${key}`} className="soil-crack" style={{ animationDelay: `${300 + i * 90}ms` }}
              d={`M${cx - w0} ${SKY} L${zig} L${cx + w0} ${SKY} Z`} fill="#24180e" opacity=".7" />;
          })}
          {flooded && [3, 6, 9].map((cm) => <path key={`sl${cm}`} d={`M0 ${ycm(cm)} Q${W / 4} ${ycm(cm) - 1.5} ${W / 2} ${ycm(cm)} T${W} ${ycm(cm)}`} stroke="#d9c7a8" strokeWidth=".5" opacity=".35" fill="none" />)}
          {Array.from({ length: mottleN }, (_, i) => {
            const cx = 6 + rnd(i, 11) * (W - 12), cy = ycm((pan ? pan.bottom : 16) + 1 + rnd(i, 12) * 11);
            return i % 4 === 3
              ? <path key={`m${i}`} d={`M${cx} ${cy - 5} q2 5 0 10`} stroke="#8e9a9c" strokeWidth="1.6" opacity=".5" fill="none" />
              : <ellipse key={`m${i}`} cx={cx} cy={cy} rx={1.6 + rnd(i, 13) * 2.4} ry={1 + rnd(i, 14) * 1.4} fill="#c66a2a" opacity=".55" />;
          })}
          {Array.from({ length: burrows }, (_, i) => {
            const bx = 20 + ((i * 61) % (W - 40));
            const d = `M${bx} ${SKY + 2} q-3 ${PX * 8} 2 ${PX * 14} t-1 ${PX * 10}`;
            return <g key={`b${i}`}><path d={d} stroke="#2b1d12" strokeWidth="2" opacity=".16" fill="none" /><path d={d} stroke="#7a5636" strokeWidth=".6" opacity=".3" fill="none" /></g>;
          })}
          {straw && !flooded && Array.from({ length: 18 }, (_, i) => <path key={`st${i}`} d={`M${4 + i * 12 + rnd(i, 15) * 5} ${SKY - 1.2} l${7 + rnd(i, 16) * 5} ${-1 + rnd(i, 17) * 2}`} stroke="#d6b467" strokeWidth="1.3" strokeLinecap="round" />)}
          {straw && flooded && Array.from({ length: 14 }, (_, i) => <path key={`si${i}`} d={`M${8 + rnd(i, 18) * (W - 16)} ${ycm(1 + rnd(i, 19) * 6)} l4 1`} stroke="#c9a85c" strokeWidth="1" opacity=".8" />)}
          <g key={`r-${key}`} className="soil-roots">
            {look && ps.map((x, i) => <Roots key={i} x={x} k={i} look={look} pan={pan} nodules={nodules} density={density} disease={pests > 0} flooded={flooded} nodFill={`url(#nod-${uid})`} />)}
          </g>
          {Array.from({ length: worms }, (_, i) => {
            // An earthworm: a rounded, segmented body (rings), the pale saddle (clitellum) a third of the way back,
            // crawling by waves of contraction along its burrow.
            const wx = 24 + ((i * 53) % 150), wy = ycm(3 + ((i * 37) % 11)), dir = i % 2 ? -1 : 1;
            const d = `M${wx} ${wy} c${dir * 4} -3.5 ${dir * 8} 2.5 ${dir * 12} -0.5 s${dir * 8} 3 ${dir * 13} 0.5`;
            return <g key={`w${i}`} className="soil-worm" style={{ animationDelay: `${i * 0.7}s` }}>
              <path d={d} stroke="#1f150d" strokeWidth="4.6" strokeLinecap="round" fill="none" opacity=".18" transform="translate(.4 .9)" />
              <path d={d} stroke={`url(#worm-${uid})`} strokeWidth="3.6" strokeLinecap="round" fill="none" />
              <path className="soil-peristalsis" d={d} stroke="#7d3b35" strokeWidth="3.6" strokeDasharray=".45 1.35" fill="none" opacity=".35" />
              <path d={d} stroke="#f6c8bb" strokeWidth="2.6" strokeDasharray={`0 ${dir > 0 ? 7 : 18} 3.2 40`} fill="none" opacity=".75" />
              <path d={d} stroke="#fff" strokeWidth=".6" strokeLinecap="round" fill="none" opacity=".35" transform="translate(0 -1)" />
            </g>;
          })}
          {/* Worm casts: little coiled heaps of soil they leave on the surface, a sign of a living soil */}
          {!flooded && Array.from({ length: Math.min(4, worms) }, (_, i) => {
            const cx = 30 + ((i * 71 + 17) % (W - 60));
            return <path key={`cast${i}`} d={`M${cx - 3} ${SKY} q.5 -2.4 2 -2.6 q1 -1.6 2.2 -.4 q1.6 -.4 1.8 1.4 q1 .8 .6 1.6z`} fill={mix(top, '#2a1c11', 0.35)} opacity=".9" />;
          })}

          {Array.from({ length: bubbles }, (_, i) => {
            const fromStem = i % 3 === 2 && ps.length, bx = fromStem ? ps[i % ps.length] + 2 : 8 + rnd(i, 61) * (W - 16);
            const by = fromStem ? SKY - 3 : ycm(1.5 + rnd(i, 62) * 7), rise = by - (SKY - 10);
            return <circle key={`ch4${i}-${key}`} className="soil-bubble" cx={bx} cy={by} r={0.9 + rnd(i, 63) * 1.1}
              style={{ '--rise': `${-rise}px`, animationDelay: `${(i * 0.37) % 2.4}s`, animationDuration: `${2.2 + rnd(i, 64) * 1.4}s` }}
              fill="#eef6f2" stroke="#7d9a8c" strokeWidth=".4" />;
          })}

          {/* Surface: water on a puddled crop, the crop, its pests. */}
          {flooded && <>
            <rect y={SKY - 9} width={W} height="9" fill={`url(#water-${uid})`} className="soil-shimmer" />
            <path d={`M0 ${SKY - 9} Q${W / 8} ${SKY - 10.5} ${W / 4} ${SKY - 9} T${W / 2} ${SKY - 9} T${(W * 3) / 4} ${SKY - 9} T${W} ${SKY - 9}`} stroke="#fff" strokeWidth=".7" opacity=".7" fill="none" />
          </>}
          <g key={key}>
            {look && ps.map((x, i) => <Plant key={i} k={i} x={x} look={look} />)}
            {!look && <>
              {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${8 + i * 13} ${SKY} l${rnd(i, 21) - 0.5} -5`} stroke="#c8a85e" strokeWidth="1.5" strokeLinecap="round" />)}
              {[40, 150].map((x) => <g key={x} className="soil-sway" style={{ transformOrigin: `${x}px ${SKY}px` }}>
                {[-9, -5, -2, 1, 4, 8].map((a, j) => <path key={j} d={`M${x + a * 0.15} ${SKY} q${a * 0.45} ${-5 - (j % 3) * 2} ${a * 0.95} ${-9 - (j % 3) * 2.5}`} stroke={j % 2 ? '#6e9a46' : '#5d8a3b'} strokeWidth=".9" strokeLinecap="round" fill="none" />)}
              </g>)}
              <g className="soil-sway" style={{ transformOrigin: `96px ${SKY}px` }}>
                <path d={`M96 ${SKY} l0 -6`} stroke="#5f8a3c" strokeWidth=".8" />
                {[-1, 1].map((sg) => <path key={sg} d={`M96 ${SKY - 4} q${sg * 4} -3 ${sg * 6} -1 q${-sg * 3} 2.5 ${-sg * 6} 1z`} fill="#72a24c" />)}
                <path d={`M96 ${SKY - 6} q-2.4 -3 0 -5 q2.4 2 0 5z`} fill="#7fb055" />
              </g>
            </>}
          </g>
          {Array.from({ length: pests }, (_, i) => (
            <g key={`p${i}-${key}`} className="soil-pest" transform={`translate(${46 + i * 52} ${SKY - (look ? look.h * 0.45 : 10)})`}>
              <g style={{ animationDelay: `${i * 0.4}s` }}>
                <path d="M-3 -1 l-3 -2 M-3 1 l-3 2 M0 -2 l0 -3.4 M0 2 l0 3.4 M3 -1 l3 -2 M3 1 l3 2" stroke="#3b0f0c" strokeWidth=".7" />
                <ellipse rx="4.2" ry="2.8" fill="#a3261d" /><circle cx="-4.4" r="1.7" fill="#3b0f0c" />
              </g>
            </g>
          ))}
          {/* The surface: a crumbly tilth with small clods on a dry field, a smooth mud skin under water. */}
          {(() => {
            const pts = edgePts(SKY, flooded ? 0.25 : 0.9, 5);
            return <>
              <path d={`${smoothD(pts)} L${W} ${SKY + 3} L0 ${SKY + 3} Z`} fill={flooded ? '#7b5b3b' : top} />
              <path d={smoothD(pts)} stroke="#3d2c1d" strokeWidth=".9" fill="none" opacity=".75" />
              {!flooded && Array.from({ length: 16 }, (_, i) => {
                const cx = 4 + rnd(i, 81) * (W - 8), r = 0.9 + rnd(i, 82) * 1.6;
                return <g key={`cl${i}`}><ellipse cx={cx} cy={SKY - r * 0.35} rx={r * 1.25} ry={r * 0.75} fill={mix(top, '#2a1c11', 0.25 + rnd(i, 83) * 0.25)} /><ellipse cx={cx - r * 0.35} cy={SKY - r * 0.65} rx={r * 0.5} ry={r * 0.28} fill="#fff" opacity=".18" /></g>;
              })}
            </>;
          })()}
          <rect y={SKY} width={W} height={H - SKY} fill={`url(#light-${uid})`} pointerEvents="none" />
          <rect y={SKY} width={W} height={H - SKY} fill={`url(#side-${uid})`} pointerEvents="none" />

          {/* Depth scale. */}
          {[10, 20].map((cm) => <g key={cm}><line x1="0" x2="6" y1={ycm(cm)} y2={ycm(cm)} stroke="#fff" strokeWidth=".8" opacity=".8" /><text x="8" y={ycm(cm) + 3} fontSize="8" fill="#fff" opacity=".8">{lang === 'bn' ? bnDigits(cm) : cm}</text></g>)}
          <text x="6" y={H - 8} fontSize="8.5" fill="#fff" opacity=".85">{T('০–৩০ সেমি মাটি', 'Topsoil 0–30 cm')}</text>
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-bold text-ink shadow-sm">{L(crop.name)}</div>
        <div className="pointer-events-none absolute bottom-2 right-1.5 rounded-lg bg-black/45 px-1.5 py-0.5 text-right text-white backdrop-blur-[2px] sm:bottom-7 sm:right-2 sm:px-2 sm:py-1">
          <div className="hidden text-[10.5px] leading-none opacity-85 sm:block">{T('জৈব পদার্থ', 'Organic matter')}</div>
          <div className="font-display text-[13px] font-bold leading-tight tabular sm:text-[17px]">{num(om, lang, { dp: 2 })}%</div>
          <div className={`hidden text-[10.5px] font-semibold leading-none tabular sm:block ${dOm >= 0 ? 'text-lime-200' : 'text-red-200'}`}>{Math.abs(dOm) < 0.005 ? T('শুরুর মতো', 'as at start') : `${dOm > 0 ? '+' : '−'}${num(Math.abs(dOm), lang, { dp: 2 })} ${T('শুরু থেকে', 'since start')}`}</div>
        </div>
      </div>
    </figure>
  );
}

// The key under the three columns, drawn with the same marks.
export function SoilLegend() {
  const { T } = useStore();
  const items = [
    [<rect key="a" x="1" y="3" width="16" height="8" rx="1.5" fill="#4a3422" />, T('চাষের স্তর: যত কালো, তত জৈব পদার্থ', 'Tilled layer: darker = more organic matter')],
    [<g key="b"><rect x="1" y="4" width="16" height="6" fill="#5a4634" opacity=".6" /><path d="M2 7 H9 M11 5.5 H16" stroke="#2a1d12" strokeWidth=".7" /></g>, T('শক্ত তলা: ধানে কাদা করায় ১৫–২০ সেমিতে জমে', 'Plough pan: packed at 15–20 cm by puddling for rice')],
    [<g key="c"><ellipse cx="6" cy="7" rx="3" ry="2" fill="#c66a2a" opacity=".7" /><path d="M13 3 q2 4 0 8" stroke="#8e9a9c" strokeWidth="1.6" fill="none" /></g>, T('মরচে দাগ: পানি জমে থাকা মাটির চিহ্ন', 'Rust mottles: soil that stands wet')],
    [<path key="d" d="M1 8 q4 -4 8 0 t8 0" stroke="#d58a7f" strokeWidth="3" strokeLinecap="round" fill="none" />, T('কেঁচো: ডোবানো ধানক্ষেতে থাকে না (অক্সিজেন নেই)', 'Earthworms: none while a paddy is flooded (no air)')],
    [<g key="r"><rect x="1" y="2" width="16" height="2" fill="#8a6440" /><rect x="1" y="4" width="16" height="8" fill="#787d72" /></g>, T('ধূসর মাটি: ডোবানো জমিতে অক্সিজেন ফুরোলে, ওপরে পাতলা বাদামি স্তর', 'Grey soil: a flooded field out of oxygen, under a thin brown skin')],
    [<g key="p"><path d="M9 1 V13" stroke="#c9772d" strokeWidth="3" opacity=".45" /><path d="M9 1 V13" stroke="#f1e2c6" strokeWidth="1.1" /></g>, T('মরচে রঙা শিকড়: ধানের শিকড় অক্সিজেন ছাড়ে, লোহা জমে', 'Rust-coated rice roots: they leak oxygen and iron settles on them')],
    [<g key="m"><circle cx="5" cy="9" r="2" fill="#eef6f2" stroke="#7d9a8c" strokeWidth=".6" /><circle cx="11" cy="5" r="1.6" fill="#eef6f2" stroke="#7d9a8c" strokeWidth=".6" /></g>, T('মিথেনের বুদবুদ: ডোবানো মাটিতে পচন (খড় রাখলে বেশি)', 'Methane bubbles: decay in flooded soil (more with straw kept)')],
    [<path key="k" d="M6 1 L8 7 L7 13 L10 7 L11 1 Z" fill="#24180e" opacity=".75" />, T('ফাটল: শুকনো মৌসুমে এঁটেল মাটি (৩৫%-এর বেশি কাদা)', 'Cracks: clay soil (over 35% clay) drying out')],
    [<g key="e"><path d="M9 1 V13 M9 5 q4 1 6 4" stroke="#d9c6a4" strokeWidth="1.2" fill="none" /><circle cx="14" cy="8" r="1.7" fill="#e0828a" /></g>, T('ডালের শিকড়ে গুটি: বাতাসের নাইট্রোজেন', 'Legume nodules: nitrogen from the air')],
    [<path key="f" d="M1 9 l6 -1 M6 10 l7 0 M11 8 l6 1" stroke="#d6b467" strokeWidth="1.6" strokeLinecap="round" />, T('খড়ের আবরণ: খড়-নাড়া রেখে দিলে', 'Straw cover: when straw is kept')],
    [<g key="g"><ellipse cx="9" cy="7" rx="4.2" ry="2.8" fill="#a3261d" /><circle cx="4.6" cy="7" r="1.7" fill="#3b0f0c" /></g>, T('পোকা ও শিকড়ের রোগ: একই গোত্রের ফসল পরপর', 'Pests and root disease: one crop family after itself')],
    [<g key="paleo"><rect x="1" y="2" width="16" height="10" rx="1.5" fill="#7a2e1d" opacity=".85" /><circle cx="5" cy="7" r="1.5" fill="#f8d488" /><circle cx="12" cy="7" r="1.5" fill="#f8d488" /></g>, T('জীবাশ্ম কার্বন স্তর: মাটির খনিজ কণার সাথে শতাব্দীর প্রাচীন কার্বন সঞ্চয়', 'Paleosol fossil carbon: mineral-bound century-old carbon')],
    [<g key="diesel"><path d="M4 12 h10 v-7 l-3 -3 h-4 l-3 3 z" fill="#1e3a8a" /><circle cx="9" cy="7" r="1.8" fill="#38bdf8" /></g>, T('জীবাশ্ম ডিজেল সাশ্রয়: কম সেচের রবি ফসলে পাম্পিং ধোঁয়া ও ভূগর্ভস্থ পানি সাশ্রয়', 'Fossil diesel offset: avoided pumping fuel emissions')],
  ];
  return (
    <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-[12.5px] leading-5 text-muted sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([icon, label], i) => (
        <li key={i} className="flex items-center gap-2"><svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true" className="shrink-0">{icon}</svg>{label}</li>
      ))}
    </ul>
  );
}
