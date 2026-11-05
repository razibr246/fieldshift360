// The mustard field at harvest (Phalgun), on the same sickle work as the wheat harvest (wheat.js: check, cut two
// fistfuls low, lay them down, tie a bundle, set it on the row, move up). What changes is the crop: branched plants
// about a metre high whose pods (siliques) have turned straw-coloured, a few late yellow flowers at the tips, the
// neighbours' later-sown mustard still in yellow bloom beyond, and the check is a pod rubbed open to show the seed
// has gone dark. Harvest when about four pods in five have turned straw-coloured (BARI), in the morning so fewer
// pods burst. mustardPainter() moves it to a frame of wheat.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, PAN, E0, SPACING, G, SHEAF_AT } from './wheat';
import { hash, wobble } from '../../engine/motion';
import { viewBox } from './camera';

const f1 = (n) => n.toFixed(1);
const STALKS = 110; // front-row plants drawn ahead of the edge
const STUBBLE = 90; // and stubble behind it
const STEM = '#9d9a52', POD = '#cdbd6c', POD_DARK = '#b3a253', FLOWER = '#f2c932', SEED = '#3a2417';

// A fistful of cut mustard: stems from the cut ends at the bottom, pods crowded on the upper half.
function Fistful({ thick = 1 }) {
  const n = 4 + thick * 2;
  return (
    <g>
      <g stroke={STEM} strokeWidth="1.4" strokeLinecap="round" fill="none">
        {Array.from({ length: n }, (_, i) => { const s = (i - (n - 1) / 2) * (1.6 + thick * 0.4); return <path key={i} d={`M${f1(s * 0.5)} 40L${f1(s * 1.4)} -48`} />; })}
      </g>
      <g stroke={POD} strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: n * 5 }, (_, i) => { const s = ((i % n) - (n - 1) / 2) * (1.6 + thick * 0.4), y = -18 - Math.floor(i / n) * 7, d = i % 2 ? 1 : -1; return <path key={i} d={`M${f1(s * (0.9 - y / 100))} ${y}l${d * 4} -3`} />; })}
      </g>
      <path d="M-4 -2h8" stroke="#7d7a3c" strokeWidth="2" opacity=".5" />
    </g>
  );
}

// A bundle lying on its side, pods to the right; the band is round it at x = -6 (when tied).
function Sheaf({ band = true }) {
  return (
    <g>
      <g stroke={STEM} strokeWidth="1.3" strokeLinecap="round">
        {[-4.5, -3, -1.5, 0, 1.5, 3, 4.5].map((y) => <path key={y} d={`M-24 ${y * 0.9}L10 ${y * 1.3}`} />)}
      </g>
      <g stroke={POD} strokeWidth="1.5" strokeLinecap="round">
        {[-6, -3, 0, 3, 6].flatMap((y) => [8, 13, 18, 23].map((x) => <path key={`${x}${y}`} d={`M${x} ${y * 1.2}l3.5 ${y > 0 ? 2.2 : -2.2}`} />))}
      </g>
      {band && <ellipse data-k="band" cx="-6" cy="0" rx="2.6" ry="6.8" fill="none" stroke="#7d6a38" strokeWidth="2.2" />}
      {band && <path data-k="knot" d="M-7 -7.5c1-2 3-2.4 3.6-.6" fill="none" stroke="#7d6a38" strokeWidth="2" strokeLinecap="round" />}
    </g>
  );
}

// The কাস্তে, as in the wheat harvest.
function Sickle(props) {
  return (
    <g {...props}>
      <path d="M-6 0L9 0" stroke="#8a5a2e" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M8 -1.5C20 -2 30 -10 31 -24C31.5 -30 28 -34 24 -35C27 -30 27 -22 22 -14C17 -7 12 -4 8 2Z" fill="#9aa4a8" stroke="#5b6266" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M23 -15l-2 -1M25.5 -20l-2 -.6M26.6 -25l-2 -.2M19.8 -10l-1.8 -1.4M16 -6.6l-1.4 -1.8" stroke="#5b6266" strokeWidth=".8" strokeLinecap="round" />
    </g>
  );
}

// A strip of the crop behind the front row, PAN units wide (it repeats): three rows going back, each paler and
// shorter; a plant is a stem with two short branches and a fuzz of pods on top. `cut` draws the same strip as stubble.
const DEPTH = [[-9, 0.97, '#a3a058', '#c8b86a'], [-18, 0.93, '#aaa762', '#cfc078'], [-26, 0.9, '#b3b06e', '#d6c886']];
function Backdrop({ k, cut = false }) {
  return (
    <g transform={`translate(${E0 - 400 + k * PAN} 0)`}>
      {DEPTH.map(([dy, s, stem, pod], r) => Array.from({ length: 9 }, (_, i) => {
        const x = (i + 0.5 + r * 0.33) * (PAN / 9), h = (96 + hash(i * 3 + r * 31) * 18) * s, l = (hash(i * 7 + r * 13) - 0.5) * 8;
        if (cut) return <path key={`${r}${i}`} d={`M${f1(x)} ${G + dy}l${f1(l * 0.1)} -${f1(6 + hash(i + r) * 4)}`} stroke="#8f8a4a" strokeWidth="1.4" />;
        const tx = x + l, ty = G + dy - h;
        return (
          <g key={`${r}${i}`}>
            <path d={`M${f1(x)} ${G + dy}Q${f1(x + l * 0.4)} ${f1(G + dy - h * 0.6)} ${f1(tx)} ${f1(ty)}M${f1(x + l * 0.5)} ${f1(G + dy - h * 0.62)}l-9 -16M${f1(x + l * 0.6)} ${f1(G + dy - h * 0.7)}l8 -14`} stroke={stem} strokeWidth="1.1" fill="none" />
            <path d={`M${f1(tx - 4)} ${f1(ty + 4)}h8M${f1(tx - 3)} ${f1(ty + 10)}h6M${f1(tx - 13)} ${f1(ty + 22)}h6M${f1(tx + 5)} ${f1(ty + 24)}h6`} stroke={pod} strokeWidth="3.4" strokeLinecap="round" opacity=".9" />
          </g>
        );
      }))}
    </g>
  );
}

export default function MustardArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="150 30 680 229" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'একজন কৃষক পাকা সরিষার ফল ঘষে কালো দানা দেখেন, কাস্তে দিয়ে গোড়ার কাছে সরিষা গাছ কেটে আঁটি বাঁধেন; দূরে অন্যের সরিষা খেত হলুদ ফুলে ভরা' : 'A farmer rubs a ripe mustard pod to see the dark seed, cuts the plants low with a sickle and ties them in bundles; beyond, a neighbour’s mustard is still in yellow flower'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#d3e8f0" /><stop offset=".8" stopColor="#f6efd2" /></linearGradient>
        <linearGradient id={`field${id}`} x2="0" y2="1"><stop stopColor="#f3d54a" /><stop offset="1" stopColor="#d9b832" /></linearGradient>
        <linearGradient id={`soil${id}`} x2="0" y2="1"><stop stopColor="#b8925c" /><stop offset="1" stopColor="#8a6a42" /></linearGradient>
        <radialGradient id={`sun${id}`}><stop stopColor="#fff6d0" /><stop offset=".5" stopColor="#f7d36f" stopOpacity=".9" /><stop offset="1" stopColor="#f7d36f" stopOpacity="0" /></radialGradient>
        {/* the crop still standing is right of the cut edge, the stubble left of it */}
        <clipPath id={`uncut${id}`}><rect data-k="uncutClip" x={E0} y="0" width="3000" height="310" /></clipPath>
        <clipPath id={`cut${id}`}><rect data-k="cutClip" x={E0 - 3000} y="0" width="3000" height="310" /></clipPath>
      </defs>
      <rect width="920" height="310" fill={`url(#sky${id})`} />
      <circle cx="790" cy="46" r="50" fill={`url(#sun${id})`} />
      <g fill="#fff" opacity=".7">
        <path data-k="cloud0" d="M0 26c-14 0-18-19-4-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path data-k="cloud1" d="M0 22c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <g data-k="trees" fill="#4f7d4f" opacity=".72">
        {[0, 600, 1200].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M0 168c120-22 220-10 330 3 110 13 190-8 270-4v30H0Z" fill="#7aa06a" opacity=".7" />
            <path d="M60 172v-52h7v52Zm-15-50q18-38 36 0-18-9-36 0Zm6-19q13-28 26 0-13-7-26 0Z" />
            <path d="M330 170c-10-18-6-36 8-44 14 8 18 26 8 44Z" />
            <path d="M470 172v-62h8v62Zm-17-56q21-42 42 0-21-10-42 0Z" />
          </g>
        ))}
      </g>
      {/* the neighbours' later-sown mustard, still in bloom: the yellow that marks a Bangladeshi Rabi landscape */}
      <g data-k="fields">
        {[0, 920].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M0 176c160-12 300-4 460 2 170 6 300-6 460-2v60H0Z" fill={`url(#field${id})`} />)}
        {[0, 920].map((x) => <path key={`l${x}`} transform={`translate(${x} 0)`} d="M0 190c180-8 320 0 460 3s300-4 460-1M0 206c180-6 320 1 460 3s300-3 460-1" fill="none" stroke="#c9a52a" strokeWidth="1.4" opacity=".5" />)}
        {[0, 920].map((x) => <g key={`d${x}`} transform={`translate(${x} 0)`} fill="#fbe57a" opacity=".8">{Array.from({ length: 46 }, (_, i) => <circle key={i} cx={f1(i * 20 + hash(i) * 14)} cy={f1(181 + hash(i * 5) * 24)} r={f1(1.2 + hash(i * 3) * 1.4)} />)}</g>)}
      </g>
      <g data-k="world">
        <path d={`M${E0 - 700} ${G - 26}H${E0 + 900}V310H${E0 - 700}Z`} fill={`url(#soil${id})`} />
        <path d={`M${E0 - 700} ${G - 26}H${E0 + 900}`} stroke="#d8b471" strokeWidth="2" opacity=".6" />
        <g clipPath={`url(#uncut${id})`}>{Array.from({ length: 30 }, (_, i) => <Backdrop key={i} k={i} />)}</g>
        <g clipPath={`url(#cut${id})`}>{Array.from({ length: 30 }, (_, i) => <Backdrop key={i} k={i} cut />)}</g>
        <path data-k="stubble" stroke="#8f8a4a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path data-k="stems" stroke={STEM} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path data-k="pods" stroke={POD} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path data-k="podsDark" stroke={POD_DARK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path data-k="flowers" stroke={FLOWER} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        {Array.from({ length: 9 }, (_, k) => <g key={k} transform={`translate(${SHEAF_AT[0] - (k + 1) * PAN} ${SHEAF_AT[1]}) rotate(-14) scale(1.1)`}><Sheaf /></g>)}
        <Sickle data-k="sickleGround" />
        <g data-k="sheaf"><Sheaf /></g>
        <Farmer look={LOOKS.mustard} slots={{
          farHand: (
            <>
              <g data-k="fistful1"><Fistful thick={1} /></g>
              <g data-k="fistful2"><Fistful thick={2} /></g>
              <g data-k="ear"><path d="M0 0L0 -18" stroke={STEM} strokeWidth="1.3" /><path d="M0 -6l4 -3M0 -10l-4 -3M0 -14l4 -3M0 -18l-3 -3" stroke={POD} strokeWidth="1.7" strokeLinecap="round" /></g>
            </>
          ),
          nearHand: (
            <>
              <Sickle data-k="sickleHeld" />
              <g data-k="grains" fill={SEED}>{[[-2, 0], [1.5, -1], [0, 1.6], [2.8, 1], [-0.8, -1.8], [3.4, -0.6]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1" />)}</g>
            </>
          ),
        }} />
        <g data-k="particles" />
      </g>
    </svg>
  );
}

export function mustardPainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.mustard);
  const [world, trees, fields, stubble, stems, pods, podsDark, flowers, sheaf, sickleGround, sickleHeld, fist1, fist2, ear, grains, parts, uncutClip, cutClip] =
    ['world', 'trees', 'fields', 'stubble', 'stems', 'pods', 'podsDark', 'flowers', 'sheaf', 'sickleGround', 'sickleHeld', 'fistful1', 'fistful2', 'ear', 'grains', 'particles', 'uncutClip', 'cutClip'].map(q);
  const sheafBand = sheaf.querySelector('[data-k="band"]'), sheafKnot = sheaf.querySelector('[data-k="knot"]');
  const clouds = [q('cloud0'), q('cloud1')];
  const show = (el, on) => { el.style.display = on ? '' : 'none'; };
  return (t, w, loops = 0) => {
    const fr = frame(t, w);
    svg.setAttribute('viewBox', viewBox(fr.view));
    const camTotal = loops * PAN + fr.cam;
    world.setAttribute('transform', `translate(${f1(-fr.cam)} 0)`);
    trees.setAttribute('transform', `translate(${f1(-((camTotal * 0.3) % 600))} 0)`);
    fields.setAttribute('transform', `translate(${f1(-((camTotal * 0.6) % 920))} 0)`);
    clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((((i ? 610 : 80) + w * (i ? 3 : 4.2) - camTotal * 0.03) % 1180) + 1180) % 1180 - 130} ${i ? 62 : 46})`));
    uncutClip.setAttribute('x', f1(fr.edge + 1));
    cutClip.setAttribute('width', f1(3000 + fr.edge + 1 - E0));
    // The front row, plant by plant: a stem with its own height and lean (from its place in the field, so it keeps
    // them from loop to loop), two side branches, pods along the top half pointing up and out, now and then a late
    // flower; it sways, leans in to his fist while he gathers it, and is stubble once cut. Only plants in view.
    let st = '', sb = '', pd = '', pk = '', fl = '';
    const left = fr.view.x + fr.cam - 30, right = fr.view.x + fr.view.w + fr.cam + 30;
    for (let i = -STUBBLE; i < STALKS; i++) {
      const x = E0 + SPACING * (i + 0.5), n = i + loops * 10;
      if (x < left || x > right) continue;
      const h = 98 + hash(n * 3.1) * 18, l = (hash(n * 7.7) - 0.5) * 9;
      if (x < fr.edge) { sb += `M${f1(x)} ${G + 1}l${f1(l * 0.1)} -${f1(6 + hash(n) * 4)}`; continue; }
      const sway = 2.8 * wobble(w * 0.9 + n * 0.37, n % 7) + 1.3 * Math.sin(w * 1.7 + x * 0.05);
      let tx = x + l + sway, ty = G - h, cx = x + l * 0.4 + sway * 0.5, cy = G - h * 0.55;
      const j = x < E0 + 22 ? 0 : x < E0 + 44 ? 1 : -1;
      const k = j >= 0 ? fr.lean[j] : 0;
      if (k > 0) {
        cx += (fr.fist[0] - cx) * k; cy += (fr.fist[1] + 6 - cy) * k;
        tx += (fr.fist[0] + (tx - x) * 0.5 + 4 - tx) * k; ty += (fr.fist[1] - 52 - ty) * k;
      }
      st += `M${f1(x)} ${G + 1}Q${f1(cx)} ${f1(cy)} ${f1(tx)} ${f1(ty)}`;
      if (i === 0 && fr.plucked) continue; // the pods he picked to check
      // Points up the stem's top half (on the curve), with a branch out each side from 55% and 68% of the height.
      const at = (u) => { const a = 1 - u; return [a * a * x + 2 * a * u * cx + u * u * tx, a * a * (G + 1) + 2 * a * u * cy + u * u * ty]; };
      const sideA = at(0.55), sideB = at(0.68), bend = (tx - x) * 0.2;
      const tipA = [sideA[0] - 9 + bend, sideA[1] - 17], tipB = [sideB[0] + 8 + bend, sideB[1] - 15];
      st += `M${f1(sideA[0])} ${f1(sideA[1])}L${f1(tipA[0])} ${f1(tipA[1])}M${f1(sideB[0])} ${f1(sideB[1])}L${f1(tipB[0])} ${f1(tipB[1])}`;
      // pods: on the main stem from 62% to the tip, and along each branch; alternate sides, pointing upward
      const add = (px, py, s, dark) => { const seg = `M${f1(px)} ${f1(py)}l${f1(s * 4.2)} -${f1(3.2)}`; if (dark) pk += seg; else pd += seg; };
      for (let u = 0.62, m = 0; u < 0.99; u += 0.075, m++) { const [px, py] = at(u); add(px, py, m % 2 ? 1 : -1, hash(n * 13 + m) < 0.3); }
      for (const [a, b] of [[sideA, tipA], [sideB, tipB]]) for (let v = 0.35; v <= 1; v += 0.32) { const px = a[0] + (b[0] - a[0]) * v, py = a[1] + (b[1] - a[1]) * v; add(px, py, b[0] > a[0] ? 1 : -1, false); }
      if (hash(n * 5.3) < 0.22) fl += `M${f1(tx)} ${f1(ty - 1)}l.1 0`; // a late flower on a few plants
    }
    stubble.setAttribute('d', sb); stems.setAttribute('d', st); pods.setAttribute('d', pd); podsDark.setAttribute('d', pk); flowers.setAttribute('d', fl);
    // what is in his hands
    show(fist1, fr.held && fr.held.n === 1); show(fist2, fr.held && fr.held.n === 2);
    const hf = fr.held && (fr.held.n === 1 ? fist1 : fist2);
    if (hf) hf.setAttribute('transform', `translate(${f1(fr.held.x)} ${f1(fr.held.y)}) rotate(${f1(fr.held.a)})`);
    show(ear, !!fr.ear);
    if (fr.ear) ear.setAttribute('transform', `translate(${f1(fr.ear.x)} ${f1(fr.ear.y)}) rotate(${f1(fr.ear.a + 90)})`);
    show(grains, !!fr.grains);
    if (fr.grains) grains.setAttribute('transform', `translate(${f1(fr.grains[0])} ${f1(fr.grains[1])})`);
    show(sickleHeld, fr.sickle.held); show(sickleGround, !fr.sickle.held);
    (fr.sickle.held ? sickleHeld : sickleGround).setAttribute('transform', `translate(${f1(fr.sickle.x)} ${f1(fr.sickle.y)}) rotate(${f1(fr.sickle.a)})${fr.sickle.held ? '' : ' scale(1 .38)'}`);
    // the bundle he lays down, ties, lifts and sets on the row
    show(sheaf, !!fr.bundle);
    if (fr.bundle) {
      sheaf.setAttribute('transform', `translate(${f1(fr.bundle.x)} ${f1(fr.bundle.y)}) rotate(${f1(fr.bundle.a)}) translate(6 0)`);
      sheafBand.setAttribute('stroke-dasharray', `${f1(fr.band * 31)} 40`);
      sheafBand.style.display = fr.band > 0.02 ? '' : 'none';
      sheafKnot.style.display = fr.bundle.knot ? '' : 'none';
    }
    paintFarmer(fr.sk, fr.extra);
    // the rubbed pod's husk blows away pale; dust where the plants are cut and the bundle lands
    parts.innerHTML = [
      ...fr.chaff.map((c) => `<ellipse cx="${f1(c.x)}" cy="${f1(c.y)}" rx="${f1(c.r * 1.8)}" ry="${f1(c.r * 0.6)}" fill="#e4dba6" opacity="${c.o.toFixed(2)}"/>`),
      ...fr.puffs.flatMap((d) => [0, 1, 2].map((i) => `<circle cx="${f1(d.x + (i - 1) * 7 * (0.4 + d.k))}" cy="${f1(G - 2 - d.k * 6 - i * 1.5)}" r="${f1(1.6 + d.k * 3.2)}" fill="#d9c08a" opacity="${((1 - d.k) * 0.45).toFixed(2)}"/>`)),
    ].join('');
  };
}
