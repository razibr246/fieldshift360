// The tomato field: a row of staked plants, a woven basket and the farmer, with the far hills and trees drifting more
// slowly than the row as the camera follows him (parallax). tomatoPainter() moves it to a frame of tomato.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, PAN, PLANT_X, PLANT_Y, FRUIT, TRUSS, LEAF, SNAP, BASKET } from './tomato';

const BRUSH = 0.86; // when his hip passes the last plant, walking on to this one
import { ring, wobble } from '../../engine/motion';
import { viewBox } from './camera';

const COPIES = [-2, -1, 0, 1, 2];
const loc = ([x, y]) => [x - PLANT_X, y - PLANT_Y];
const fruitL = loc(FRUIT), trussL = loc(TRUSS), leafPivot = loc(LEAF.pivot), leafTip = loc(LEAF.tip);
const BRANCH = [-3, -112]; // where the fruiting branch leaves the main stem

// A pinnate tomato leaf along +x from its base: a midrib, three pairs of leaflets and an end leaflet.
function Leaf({ x, y, a, s = 1, shade = 0 }) {
  const fill = shade ? '#3f7c3f' : '#4f9446';
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0Q16 -2 32 1" fill="none" stroke="#386b34" strokeWidth="1.5" strokeLinecap="round" />
      {[[7, -36], [8, 30], [15, -30], [16, 26], [23, -22], [24, 20]].map(([px, ra], i) => (
        <path key={i} d="M0 0C3 -4.6 9.5 -5.6 13.5 -2.2C10.4 1.2 4 2 0 0Z" transform={`translate(${px} ${i % 2 ? 0.5 : -0.5}) rotate(${ra})`} fill={fill} stroke="#2f6332" strokeWidth=".7" />
      ))}
      <path d="M31 1C35 -3.6 42 -3.6 45 .6C41.6 4 35 4.2 31 1Z" fill={fill} stroke="#2f6332" strokeWidth=".7" />
    </g>
  );
}

// A tomato: red when ripe, turning, or green; the star-shaped calyx on top.
function Tomato({ r = 10, ripe = 1, ...rest }) {
  const fill = ripe >= 1 ? '#d8402c' : ripe > 0.4 ? '#e6913a' : '#86b45a';
  return (
    <g {...rest}>
      <circle r={r} fill={fill} stroke={ripe >= 1 ? '#a52d22' : ripe > 0.4 ? '#b8692a' : '#5e8d3e'} strokeWidth="1.2" />
      <ellipse cx={-r * 0.35} cy={-r * 0.38} rx={r * 0.32} ry={r * 0.2} fill="#fff" opacity=".35" transform={`rotate(-30 ${-r * 0.35} ${-r * 0.38})`} />
      <path d={`M0 ${-r + 1}l-4.5 -2.6 3.2 -.2 -1 -3.4 2.3 2.4 2.3 -2.4 -1 3.4 3.2 .2Z`} fill="#3f7a35" />
    </g>
  );
}

// One plant of the row with its stake; the fruiting branch and the leaf he lifts can move (data-k), and the filler
// plant halfway to the next one.
function Plant({ k }) {
  return (
    <g data-copy={k} transform={`translate(${PLANT_X + k * PAN} ${PLANT_Y})`}>
      <g data-k="sway">
        <ellipse cx="0" cy="2" rx="40" ry="6" fill="#4a3424" opacity=".3" />
        <path d="M9 4L13 -152" stroke="#c9a66b" strokeWidth="4" strokeLinecap="round" />
        <path d="M10.5 -40h5M11.4 -90h5M12.4 -132h5" stroke="#9b7a45" strokeWidth="2" />
        <path d="M0 2C-3 -40 3 -80-2 -112C-5 -128-1 -140 1 -150" fill="none" stroke="#3e7a3e" strokeWidth="5.2" strokeLinecap="round" />
        <path d="M2 -60C8 -64 12 -64 14 -62M-1 -100C6 -104 10 -103 13 -101" stroke="#d8c08a" strokeWidth="1.6" fill="none" />
        <Leaf x={1} y={-30} a={-18} s={1.15} shade />
        <Leaf x={-1} y={-46} a={-160} s={1.05} shade />
        <Leaf x={2} y={-70} a={-30} s={1.1} />
        <Leaf x={-2} y={-84} a={-150} s={1.0} />
        <Leaf x={0} y={-126} a={-38} s={0.95} />
        <Leaf x={0} y={-138} a={-140} s={0.85} />
        <Leaf x={1} y={-150} a={-80} s={0.7} />
        {/* a truss on the far side: one red, one turning, one green */}
        <path d="M2 -66C14 -60 20 -52 22 -44M22 -44l-6 6M22 -44l6 6" fill="none" stroke="#3d7438" strokeWidth="1.8" />
        <Tomato r={8.5} ripe={1} transform="translate(16 -30)" />
        <Tomato r={8} ripe={0.6} transform="translate(29 -34)" />
        <Tomato r={7} ripe={0} transform="translate(23 -48)" />
        {/* the fruiting branch on his side, which he steadies and which springs back after the pick */}
        <g data-k="branch" transform="rotate(0)">
          <path d={`M${BRANCH[0]} ${BRANCH[1]}C-14 -112-26 -108 ${trussL[0]} ${trussL[1]}`} fill="none" stroke="#3e7a3e" strokeWidth="3" strokeLinecap="round" />
          <Leaf x={trussL[0] + 2} y={trussL[1] - 4} a={-168} s={0.8} />
          <path d={`M${trussL[0]} ${trussL[1]}C-36 -96-42 -92 ${trussL[0] + 6} ${trussL[1] + 12}`} fill="none" stroke="#3d7438" strokeWidth="1.8" />
          <Tomato r={7.5} ripe={0} transform={`translate(${trussL[0] + 10} ${trussL[1] + 16})`} />
          <Tomato r={7} ripe={0.6} transform={`translate(${trussL[0] + 20} ${trussL[1] + 9})`} />
          <path data-k="stub" d={`M${trussL[0]} ${trussL[1]}l-3 6`} stroke="#3d7438" strokeWidth="1.8" strokeLinecap="round" />
          <g data-k="hanging">
            <path d={`M${trussL[0]} ${trussL[1]}L${fruitL[0]} ${fruitL[1] - 10}`} stroke="#3d7438" strokeWidth="1.8" />
            <Tomato r={10.5} ripe={1} transform={`translate(${fruitL[0]} ${fruitL[1]})`} />
          </g>
        </g>
        <g data-k="leaf">
          <path d={`M${leafPivot[0]} ${leafPivot[1]}L${leafPivot[0] + 4} ${leafPivot[1] + 6}`} stroke="#3e7a3e" strokeWidth="2.4" />
          <Leaf x={leafPivot[0]} y={leafPivot[1]} a={(Math.atan2(leafTip[1] - leafPivot[1], leafTip[0] - leafPivot[0]) * 180) / Math.PI} s={0.82} />
        </g>
      </g>
      {/* the smaller plant between this one and the last */}
      <g transform="translate(-150 -4)">
        <ellipse cx="0" cy="5" rx="28" ry="5" fill="#4a3424" opacity=".25" />
        <path d="M6 6L9 -104" stroke="#c9a66b" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M0 5C-2 -30 2 -62 0 -96" fill="none" stroke="#3e7a3e" strokeWidth="4.2" strokeLinecap="round" />
        <Leaf x={0} y={-26} a={-24} s={0.9} shade />
        <Leaf x={0} y={-40} a={-156} s={0.85} shade />
        <Leaf x={0} y={-62} a={-34} s={0.85} />
        <Leaf x={0} y={-76} a={-148} s={0.8} />
        <Leaf x={0} y={-94} a={-90} s={0.6} />
        <Tomato r={6.5} ripe={0} transform="translate(13 -38)" />
        <Tomato r={6} ripe={0} transform="translate(-12 -54)" />
      </g>
      {/* grass along the bed */}
      <path d="M-120 6l-3-10 6 8 2-12 3 13M-60 7l-4-9 6 7 3-11 2 12M60 6l-3-10 6 8 2-12 3 13M110 7l-4-9 6 7 3-11 2 12" fill="#6f9550" opacity=".8" />
    </g>
  );
}

export default function TomatoArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="150 44 680 229" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'একজন কৃষক সারি ধরে হেঁটে গাছ থেকে পাকা টমেটো তুলে ঝুড়িতে রাখছেন' : 'A farmer walks the row, picks a ripe tomato and lays it in his basket'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#d4ecef" /><stop offset=".75" stopColor="#f3f1dc" /></linearGradient>
        <linearGradient id={`soil${id}`} x2="0" y2="1"><stop stopColor="#9a6c45" /><stop offset="1" stopColor="#5f432e" /></linearGradient>
        <linearGradient id={`weave${id}`} x2="0" y2="1"><stop stopColor="#d9a961" /><stop offset="1" stopColor="#9a6a32" /></linearGradient>
        <radialGradient id={`sun${id}`}><stop stopColor="#fff3c4" /><stop offset=".55" stopColor="#f5d070" stopOpacity=".9" /><stop offset="1" stopColor="#f5d070" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="920" height="310" fill={`url(#sky${id})`} />
      <circle cx="800" cy="52" r="46" fill={`url(#sun${id})`} />
      <g fill="#fff" opacity=".72">
        <path data-k="cloud0" d="M0 26c-14 0-18-19-4-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path data-k="cloud1" d="M0 22c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <g data-k="hills">
        {[0, 920].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M0 156c118-40 187-20 278 5 109 30 191-28 296-7s222 26 346-8v89H0Z" fill="#9db985" opacity=".62" />)}
      </g>
      <g data-k="trees" fill="#3f6b45" opacity=".72">
        {[0, 600, 1200].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M0 182c120-30 220-12 330 4 110 16 190-10 270-6v40H0Z" fill="#6a9461" opacity=".75" />
            <path d="M70 186v-58h7v58Zm-16-56q19-40 38 0-19-9-38 0Zm6-20q13-30 27 0-13-8-27 0Z" />
            <path d="M250 184v-44h6v44Zm-13-42q16-30 32 0-16-7-32 0Z" />
            <path d="M420 186v-70h8v70Zm-18-62q22-44 44 0-22-10-44 0Zm6-22q16-33 33 0-17-9-33 0Z" />
            <path d="M520 186c-8-14-6-30 6-38 12 8 14 24 6 38Z" />
          </g>
        ))}
      </g>
      <path d="M0 228c175-20 299-8 466-2 175 7 299-18 454-2v86H0Z" fill={`url(#soil${id})`} />
      <path d="M0 236c177-16 304-4 466 2 176 6 298-14 454-2M0 282c184-8 360 5 514 0s281-11 406-3" fill="none" stroke="#b88b5d" strokeWidth="2.6" opacity=".45" />
      <g data-k="world">
        {COPIES.map((k) => <Plant key={k} k={k} />)}
        <path data-k="stalk" stroke="#3d7438" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse data-k="basketShadow" rx="30" ry="5" fill="#2c241b" />
        <Farmer look={LOOKS.tomato} slots={{
          nearHand: (
            <>
              <g data-k="basketBack">
                <path d="M-30 30A30 7 0 0 1 30 30" fill="none" stroke="#8a5a2a" strokeWidth="3" />
                <ellipse cx="0" cy="30" rx="28.5" ry="6.2" fill="#5b3a1e" />
                <Tomato r={7} transform="translate(-15 27)" /><Tomato r={7.5} transform="translate(-4 25.5)" /><Tomato r={7} ripe={0.7} transform="translate(9 27.5)" /><Tomato r={6.5} transform="translate(18 29)" />
                <Tomato data-k="top" r={8.5} transform="translate(5 22)" />
              </g>
              <g data-k="held"><path d="M0 -10l-2 -6" stroke="#3d7438" strokeWidth="1.8" strokeLinecap="round" /><Tomato r={10.5} /></g>
            </>
          ),
          front: (
            <g data-k="basketFront">
              <path d="M-30 30L-23.5 61Q0 67.5 23.5 61L30 30A30 7 0 0 1-30 30Z" fill={`url(#weave${id})`} stroke="#80521f" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M-28 40Q0 47 28 40M-26 50Q0 57 26 50M-17 35l-2 29M-6 37l-1 30M6 37l1 30M17 35l2 29" fill="none" stroke="#f0c987" strokeWidth="1.3" opacity=".7" />
              <path d="M-30 30A30 7 0 0 0 30 30" fill="none" stroke="#80521f" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M-24 30C-25 6 25 6 24 30" fill="none" stroke="#8a5a2a" strokeWidth="3.4" strokeLinecap="round" />
            </g>
          ),
        }} />
        <g data-k="dust" fill="#c9a77a" />
      </g>
      <g data-k="grass" fill="#5d8a45" opacity=".9">
        {[0, 400, 800, 1200].map((x) => <path key={x} transform={`translate(${x} 0)`} d="M20 310l4-22 3 22M64 310l-3-17 7 17M150 310l5-26 2 26M230 310l-4-15 7 15M300 310l4-21 3 21M352 310l-5-18 8 18" />)}
      </g>
    </svg>
  );
}

export function tomatoPainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.tomato);
  const world = q('world'), hills = q('hills'), trees = q('trees'), grass = q('grass'), stalk = q('stalk');
  const clouds = [q('cloud0'), q('cloud1')];
  const back = q('basketBack'), front = q('basketFront'), held = q('held'), top = q('top'), dust = q('dust'), basketShadow = q('basketShadow');
  const copies = [...svg.querySelectorAll('[data-copy]')].map((g) => ({
    k: +g.dataset.copy, sway: g.querySelector('[data-k="sway"]'), branch: g.querySelector('[data-k="branch"]'),
    hanging: g.querySelector('[data-k="hanging"]'), stub: g.querySelector('[data-k="stub"]'), leaf: g.querySelector('[data-k="leaf"]'),
  }));
  const rotAt = (deg, [x, y]) => `rotate(${deg.toFixed(2)} ${x} ${y})`;
  let dustCount = -1;
  return (t, w, loops = 0) => {
    const fr = frame(t, w);
    svg.setAttribute('viewBox', viewBox(fr.view));
    const camTotal = loops * PAN + fr.cam;
    world.setAttribute('transform', `translate(${(-fr.cam).toFixed(1)} 0)`);
    hills.setAttribute('transform', `translate(${(-((camTotal * 0.06) % 920)).toFixed(1)} 0)`);
    trees.setAttribute('transform', `translate(${(-((camTotal * 0.34) % 600)).toFixed(1)} 0)`);
    grass.setAttribute('transform', `translate(${(-((camTotal * 1.25) % 400)).toFixed(1)} 0)`);
    clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((((i ? 610 : 70) + w * (i ? 3.2 : 4.4) - camTotal * 0.02) % 1180) + 1180) % 1180 - 130} ${i ? 70 : 52})`));
    for (const c of copies) {
      const plant = loops + c.k; // the same plant keeps its own breeze from loop to loop
      // the plant he brushes past on his way down the row shivers as he goes by
      const brush = c.k === -1 ? ring(t - BRUSH, 2.4, 1.8, 0.22) : 0;
      c.sway.setAttribute('transform', `rotate(${(0.9 * wobble(w * 0.55, plant) + brush).toFixed(2)} 0 0)`);
      const mine = c.k === 0;
      c.branch.setAttribute('transform', rotAt((mine ? fr.branch : 0) + 1.2 * wobble(w * 0.8, plant + 0.5), BRANCH));
      c.leaf.setAttribute('transform', rotAt((mine ? fr.leaf : 0) + 1.5 * wobble(w * 0.9, plant + 0.3), leafPivot));
      const gone = c.k < 0 || (mine && fr.picked);
      c.hanging.style.display = gone ? 'none' : '';
      c.stub.style.display = gone ? '' : 'none';
    }
    // the stalk still joins the fruit in his hand to the truss until it snaps
    if (fr.fruit && t < SNAP) {
      const a = (fr.branch * Math.PI) / 180, dx = trussL[0] - BRANCH[0], dy = trussL[1] - BRANCH[1];
      const tx = PLANT_X + BRANCH[0] + dx * Math.cos(a) - dy * Math.sin(a), ty = PLANT_Y + BRANCH[1] + dx * Math.sin(a) + dy * Math.cos(a);
      stalk.setAttribute('d', `M${tx.toFixed(1)} ${ty.toFixed(1)}L${fr.fruit[0].toFixed(1)} ${(fr.fruit[1] - 10).toFixed(1)}`);
      stalk.style.display = '';
    } else stalk.style.display = 'none';
    held.style.display = fr.fruit ? '' : 'none';
    if (fr.fruit) held.setAttribute('transform', `translate(${fr.fruit[0].toFixed(1)} ${fr.fruit[1].toFixed(1)}) rotate(${fr.fruitAngle.toFixed(1)})`);
    const b = `translate(${fr.basket.x.toFixed(1)} ${fr.basket.y.toFixed(1)}) rotate(${fr.basket.a.toFixed(2)})`;
    back.setAttribute('transform', b);
    front.setAttribute('transform', b);
    // its shadow on the soil: full and dark when it stands there, smaller and fainter the higher it is carried
    const lift = Math.max(0, BASKET[1] - fr.basket.y);
    basketShadow.setAttribute('cx', (fr.basket.x + lift * 0.15).toFixed(1));
    basketShadow.setAttribute('cy', (BASKET[1] + 63).toFixed(1));
    basketShadow.setAttribute('rx', (30 - Math.min(14, lift * 0.3)).toFixed(1));
    basketShadow.setAttribute('opacity', (0.3 * (1 - Math.min(0.75, lift / 60))).toFixed(2));
    top.style.display = fr.top.on ? '' : 'none';
    if (fr.top.on) top.setAttribute('transform', `translate(5 ${(22 + fr.top.y).toFixed(1)})`);
    paintFarmer(fr.sk, fr.extra);
    if (dustCount !== fr.dust.length || fr.dust.length) {
      dust.innerHTML = fr.dust.map((d) => [0, 1, 2].map((i) => `<circle cx="${(d.x + (i - 1) * 7 * (0.4 + d.k)).toFixed(1)}" cy="${(260 - d.k * 6 - i * 1.5).toFixed(1)}" r="${(1.6 + d.k * 3.2).toFixed(1)}" opacity="${((1 - d.k) * 0.5).toFixed(2)}" />`).join('')).join('');
      dustCount = fr.dust.length;
    }
  };
}
