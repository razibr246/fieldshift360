// The wheat field at harvest: the front of the swath he is cutting is drawn stalk by stalk (so a fistful can lean in
// to his hand and fall to the sickle, leaving stubble), the uncut crop stands behind it, cut sheaves lie in a row, and
// the far fields and trees drift more slowly than the crop as the camera follows him. wheatPainter() moves it to a
// frame of wheat.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, PAN, E0, SPACING, G, SHEAF_AT } from './wheat';
import { hash, wobble } from '../../engine/motion';
import { viewBox } from './camera';

const f1 = (n) => n.toFixed(1);
const STALKS = 110; // front-row stalks drawn ahead of the edge
const STUBBLE = 90; // and stubble behind it

// A bunch of cut wheat: stems from the cut ends at the bottom to the ears at the top, around the grip at the origin.
function Fistful({ thick = 1 }) {
  const n = 5 + thick * 3;
  return (
    <g>
      <g stroke="#c49a45" strokeWidth="1.3" strokeLinecap="round">
        {Array.from({ length: n }, (_, i) => { const s = (i - (n - 1) / 2) * (1.2 + thick * 0.3); return <path key={i} d={`M${f1(s * 0.5)} 40L${f1(s * 0.9)} -44`} />; })}
      </g>
      <g stroke="#dcb14f" strokeWidth="4.6" strokeLinecap="round">
        {Array.from({ length: n }, (_, i) => { const s = (i - (n - 1) / 2) * (1.2 + thick * 0.3); return <path key={i} d={`M${f1(s * 0.92)} -45L${f1(s * 1.05)} -58`} />; })}
      </g>
      <path d="M-3 -2h6" stroke="#9c7a35" strokeWidth="2" opacity=".5" />
    </g>
  );
}

// A sheaf lying on its side, heads to the right; the band is round it at x = -6 (when tied).
function Sheaf({ band = true }) {
  return (
    <g>
      <g stroke="#c49a45" strokeWidth="1.3" strokeLinecap="round">
        {[-4.5, -3, -1.5, 0, 1.5, 3, 4.5].map((y) => <path key={y} d={`M-24 ${y * 0.9}L6 ${y}`} />)}
      </g>
      <g stroke="#dcb14f" strokeWidth="4.4" strokeLinecap="round">
        {[-4, -1.5, 1, 3.5].map((y) => <path key={y} d={`M8 ${y}L24 ${y * 1.5}`} />)}
      </g>
      <g stroke="#b58c3c" strokeWidth=".7">{[-4, -1.5, 1, 3.5].map((y) => <path key={y} d={`M22 ${y * 1.5}l9 ${y * 0.6 - 1}`} />)}</g>
      {band && <ellipse data-k="band" cx="-6" cy="0" rx="2.6" ry="6.8" fill="none" stroke="#9c7a35" strokeWidth="2.2" />}
      {band && <path data-k="knot" d="M-7 -7.5c1-2 3-2.4 3.6-.6" fill="none" stroke="#9c7a35" strokeWidth="2" strokeLinecap="round" />}
    </g>
  );
}

// The কাস্তে: a short wooden handle in the hand (the origin) and a crescent blade with a toothed inner edge.
function Sickle(props) {
  return (
    <g {...props}>
      <path d="M-6 0L9 0" stroke="#8a5a2e" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M8 -1.5C20 -2 30 -10 31 -24C31.5 -30 28 -34 24 -35C27 -30 27 -22 22 -14C17 -7 12 -4 8 2Z" fill="#9aa4a8" stroke="#5b6266" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M23 -15l-2 -1M25.5 -20l-2 -.6M26.6 -25l-2 -.2M19.8 -10l-1.8 -1.4M16 -6.6l-1.4 -1.8" stroke="#5b6266" strokeWidth=".8" strokeLinecap="round" />
    </g>
  );
}

// A strip of the crop behind the front row, PAN units wide (it repeats): three rows going back, each a little paler and
// shorter. `cut` draws the same strip as stubble.
const DEPTH = [[-9, 0.97, '#c9a24e', '#dfb75c'], [-18, 0.93, '#cfab5d', '#e3c06c'], [-26, 0.9, '#d4b46a', '#e6c87b']];
function Backdrop({ k, cut = false }) {
  return (
    <g transform={`translate(${E0 - 400 + k * PAN} 0)`}>
      {DEPTH.map(([dy, s, stem, ear], r) => Array.from({ length: 10 }, (_, i) => {
        const x = (i + 0.5 + r * 0.33) * (PAN / 10), h = (100 + hash(i * 3 + r * 31) * 16) * s, l = (hash(i * 7 + r * 13) - 0.5) * 8;
        if (cut) return <path key={`${r}${i}`} d={`M${f1(x)} ${G + dy}l${f1(l * 0.1)} -${f1(6 + hash(i + r) * 4)}`} stroke="#b9954b" strokeWidth="1.3" />;
        return (
          <g key={`${r}${i}`}>
            <path d={`M${f1(x)} ${G + dy}Q${f1(x + l * 0.4)} ${f1(G + dy - h * 0.6)} ${f1(x + l)} ${f1(G + dy - h)}`} stroke={stem} strokeWidth="1.2" fill="none" />
            <path d={`M${f1(x + l)} ${f1(G + dy - h)}l${f1(l * 0.08)} -10`} stroke={ear} strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      }))}
    </g>
  );
}

export default function WheatArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="150 30 680 229" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'একজন কৃষক পাকা গমের শিষ ঘষে দেখে, কাস্তে দিয়ে মুঠো মুঠো গম কেটে আঁটি বাঁধছেন' : 'A farmer rubs a ripe wheat ear to check the grain, cuts the wheat by the fistful with a sickle and ties sheaves'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#cfe6ee" /><stop offset=".8" stopColor="#f7ebcb" /></linearGradient>
        <linearGradient id={`field${id}`} x2="0" y2="1"><stop stopColor="#e3c46f" /><stop offset="1" stopColor="#c99f4c" /></linearGradient>
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
      <g data-k="fields">
        {[0, 920].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M0 176c160-12 300-4 460 2 170 6 300-6 460-2v60H0Z" fill={`url(#field${id})`} />)}
        {[0, 920].map((x) => <path key={`l${x}`} transform={`translate(${x} 0)`} d="M0 190c180-8 320 0 460 3s300-4 460-1M0 206c180-6 320 1 460 3s300-3 460-1" fill="none" stroke="#c49a45" strokeWidth="1.4" opacity=".5" />)}
      </g>
      <g data-k="world">
        <path d={`M${E0 - 700} ${G - 26}H${E0 + 900}V310H${E0 - 700}Z`} fill={`url(#soil${id})`} />
        <path d={`M${E0 - 700} ${G - 26}H${E0 + 900}`} stroke="#d8b471" strokeWidth="2" opacity=".6" />
        <g clipPath={`url(#uncut${id})`}>{Array.from({ length: 30 }, (_, i) => <Backdrop key={i} k={i} />)}</g>
        <g clipPath={`url(#cut${id})`}>{Array.from({ length: 30 }, (_, i) => <Backdrop key={i} k={i} cut />)}</g>
        <path data-k="stubble" stroke="#b08b43" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path data-k="stems" stroke="#bf9744" strokeWidth="1.35" fill="none" strokeLinecap="round" />
        <path data-k="ears" stroke="#ddb352" strokeWidth="4.6" fill="none" strokeLinecap="round" />
        <path data-k="awns" stroke="#c39a45" strokeWidth=".7" fill="none" />
        {Array.from({ length: 9 }, (_, k) => <g key={k} transform={`translate(${SHEAF_AT[0] - (k + 1) * PAN} ${SHEAF_AT[1]}) rotate(-14) scale(1.1)`}><Sheaf /></g>)}
        <Sickle data-k="sickleGround" />
        <g data-k="sheaf"><Sheaf /></g>
        <Farmer look={LOOKS.wheat} slots={{
          farHand: (
            <>
              <g data-k="fistful1"><Fistful thick={1} /></g>
              <g data-k="fistful2"><Fistful thick={2} /></g>
              <g data-k="ear"><path d="M0 0L0 -6" stroke="#bf9744" strokeWidth="1.3" /><path d="M0 -6L0 -16" stroke="#ddb352" strokeWidth="4.4" strokeLinecap="round" /><path d="M0 -16l2 -9M0 -16l-2 -8" stroke="#c39a45" strokeWidth=".7" /></g>
            </>
          ),
          nearHand: (
            <>
              <Sickle data-k="sickleHeld" />
              <g data-k="grains" fill="#c9923e">{[[-2, 0], [1.5, -1], [0, 1.6], [2.8, 1]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.4" ry="1" />)}</g>
            </>
          ),
        }} />
        <g data-k="particles" />
      </g>
    </svg>
  );
}

export function wheatPainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.wheat);
  const [world, trees, fields, stubble, stems, ears, awns, sheaf, sickleGround, sickleHeld, fist1, fist2, ear, grains, parts, uncutClip, cutClip] =
    ['world', 'trees', 'fields', 'stubble', 'stems', 'ears', 'awns', 'sheaf', 'sickleGround', 'sickleHeld', 'fistful1', 'fistful2', 'ear', 'grains', 'particles', 'uncutClip', 'cutClip'].map(q);
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
    // The front row: each stalk has its own height and lean (from its place in the field, so the same stalk keeps
    // them from loop to loop), sways in the breeze, leans in to his fist while he gathers it, and is stubble once cut.
    // Only the stalks in view are drawn.
    let st = '', sb = '', ea = '', aw = '';
    const left = fr.view.x + fr.cam - 30, right = fr.view.x + fr.view.w + fr.cam + 30;
    for (let i = -STUBBLE; i < STALKS; i++) {
      const x = E0 + SPACING * (i + 0.5), n = i + loops * 10;
      if (x < left || x > right) continue;
      const h = 104 + hash(n * 3.1) * 16, l = (hash(n * 7.7) - 0.5) * 8;
      if (x < fr.edge) { sb += `M${f1(x)} ${G + 1}l${f1(l * 0.1)} -${f1(6 + hash(n) * 4)}`; continue; }
      const sway = 2.6 * wobble(w * 0.9 + n * 0.37, n % 7) + 1.2 * Math.sin(w * 1.7 + x * 0.05);
      let tx = x + l + sway, ty = G - h, cx = x + l * 0.4 + sway * 0.5, cy = G - h * 0.55;
      const j = x < E0 + 22 ? 0 : x < E0 + 44 ? 1 : -1;
      const k = j >= 0 ? fr.lean[j] : 0;
      if (k > 0) {
        cx += (fr.fist[0] - cx) * k; cy += (fr.fist[1] + 6 - cy) * k;
        tx += (fr.fist[0] + (tx - x) * 0.5 + 4 - tx) * k; ty += (fr.fist[1] - 52 - ty) * k;
      }
      st += `M${f1(x)} ${G + 1}Q${f1(cx)} ${f1(cy)} ${f1(tx)} ${f1(ty)}`;
      if (i === 0 && fr.plucked) continue; // the ear he picked to check
      const dx = tx - cx, dy = ty - cy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
      ea += `M${f1(tx - ux * 1)} ${f1(ty - uy * 1)}L${f1(tx + ux * 11)} ${f1(ty + uy * 11)}`;
      aw += `M${f1(tx + ux * 9)} ${f1(ty + uy * 9)}l${f1(ux * 9 + 2)} ${f1(uy * 9 - 1)}M${f1(tx + ux * 6)} ${f1(ty + uy * 6)}l${f1(ux * 8 - 2.5)} ${f1(uy * 8 - 1)}`;
    }
    stubble.setAttribute('d', sb); stems.setAttribute('d', st); ears.setAttribute('d', ea); awns.setAttribute('d', aw);
    // what is in his hands
    show(fist1, fr.held && fr.held.n === 1); show(fist2, fr.held && fr.held.n === 2);
    const hf = fr.held && (fr.held.n === 1 ? fist1 : fist2);
    if (hf) hf.setAttribute('transform', `translate(${f1(fr.held.x)} ${f1(fr.held.y)}) rotate(${f1(fr.held.a)})`);
    show(ear, !!fr.ear);
    if (fr.ear) ear.setAttribute('transform', `translate(${f1(fr.ear.x)} ${f1(fr.ear.y)}) rotate(${f1(fr.ear.a + 90)})`);
    show(grains, !!fr.grains);
    if (fr.grains) grains.setAttribute('transform', `translate(${f1(fr.grains[0])} ${f1(fr.grains[1])})`);
    show(sickleHeld, fr.sickle.held); show(sickleGround, !fr.sickle.held);
    // lying on the ground the blade is flat, so it is seen foreshortened
    (fr.sickle.held ? sickleHeld : sickleGround).setAttribute('transform', `translate(${f1(fr.sickle.x)} ${f1(fr.sickle.y)}) rotate(${f1(fr.sickle.a)})${fr.sickle.held ? '' : ' scale(1 .38)'}`);
    // the bundle he lays down, ties, lifts and throws onto the row
    show(sheaf, !!fr.bundle);
    if (fr.bundle) {
      sheaf.setAttribute('transform', `translate(${f1(fr.bundle.x)} ${f1(fr.bundle.y)}) rotate(${f1(fr.bundle.a)}) translate(6 0)`);
      sheafBand.setAttribute('stroke-dasharray', `${f1(fr.band * 31)} 40`);
      sheafBand.style.display = fr.band > 0.02 ? '' : 'none';
      sheafKnot.style.display = fr.bundle.knot ? '' : 'none';
    }
    paintFarmer(fr.sk, fr.extra);
    parts.innerHTML = [
      ...fr.chaff.map((c) => `<ellipse cx="${f1(c.x)}" cy="${f1(c.y)}" rx="${f1(c.r * 1.6)}" ry="${f1(c.r * 0.7)}" fill="#e8d09a" opacity="${c.o.toFixed(2)}"/>`),
      ...fr.puffs.flatMap((d) => [0, 1, 2].map((i) => `<circle cx="${f1(d.x + (i - 1) * 7 * (0.4 + d.k))}" cy="${f1(G - 2 - d.k * 6 - i * 1.5)}" r="${f1(1.6 + d.k * 3.2)}" fill="#d9c08a" opacity="${((1 - d.k) * 0.45).toFixed(2)}"/>`)),
    ].join('');
  };
}
