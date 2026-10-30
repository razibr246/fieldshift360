// The flooded Aman field in Shraban: an earthen bund (aail) with a leak, water over the mud, older rows already
// planted in the distance, a light rain. The water is drawn over his legs, so they stand in it. amanPainter() moves it
// to a frame of aman.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, HILLS, MUD, WATER, GAP, SHIFT } from './aman';
import { viewBox } from './camera';

// Rice seedlings: a few blades from one root clump at the origin (rooted end down); a tied bundle is held tight.
const Blades = ({ n = 3, h = 24, spread = 9 }) => (
  <g stroke="#4c9a4a" strokeWidth="1.8" strokeLinecap="round" fill="none">
    {Array.from({ length: n }, (_, i) => { const a = (i - (n - 1) / 2) * spread; const x = Math.sin((a * Math.PI) / 180) * h, y = -Math.cos((a * Math.PI) / 180) * h; return <path key={i} d={`M0 0Q${(x * 0.3).toFixed(1)} ${(y * 0.6).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`} />; })}
  </g>
);

// A tied bundle of seedlings as it comes from the nursery bed: blades of a few greens, a straw tie, roots in a clump of mud.
const Sheaf = () => (
  <g>
    <path d="M-3 4C-4 -6-5 -18-8 -30M-1 4C-1 -8-2 -20-3 -33M1 4C2 -8 2 -21 2 -34M3 4C4 -6 6 -18 9 -31M0 4C0 -8 1 -22 5 -32M-2 4C-3 -9-5 -20-11 -27" fill="none" stroke="#4c9a4a" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M-1 4C-2 -10-3 -22-1 -32M2 4C3 -10 4 -20 10 -27" fill="none" stroke="#72bf5f" strokeWidth="1.1" strokeLinecap="round" />
    <path d="M-3 4L-5 10M-1 4L-2 11M1 4V11M3 4L5 10" stroke="#6e5432" strokeWidth="1.2" strokeLinecap="round" />
    <ellipse cx="0" cy="7.5" rx="4.6" ry="2.6" fill="#6e5432" opacity=".85" />
    <path d="M-4.6 -2H4.6" stroke="#c9ad6a" strokeWidth="3" strokeLinecap="round" />
  </g>
);

export default function AmanArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="236 42 660 222" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'বর্ষায় পানিভরা ধানক্ষেতে একজন কৃষক আইল সারিয়ে, পিছু হেঁটে সারি ধরে আমনের চারা রোপণ করছেন' : 'In the monsoon a farmer mends the bund, then walks backward planting Aman seedlings in a row'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#c3dde6" /><stop offset=".8" stopColor="#e9efe0" /></linearGradient>
        <linearGradient id={`far${id}`} x2="0" y2="1"><stop stopColor="#a9cbbd" /><stop offset="1" stopColor="#86b2a0" /></linearGradient>
        <linearGradient id={`water${id}`} x2="0" y2="1"><stop stopColor="#86b5a3" stopOpacity=".34" /><stop offset=".5" stopColor="#6a9a8a" stopOpacity=".5" /><stop offset="1" stopColor="#4f7e70" stopOpacity=".72" /></linearGradient>
        <linearGradient id={`bund${id}`} x2="0" y2="1"><stop stopColor="#7c6a43" /><stop offset="1" stopColor="#5d4a2e" /></linearGradient>
      </defs>
      <rect width="920" height="310" fill={`url(#sky${id})`} />
      <circle cx="790" cy="50" r="22" fill="#f2e2a6" opacity=".55" />
      <g fill="#fff" opacity=".7">
        <path data-k="cloud0" d="M0 26c-15 0-18-19-5-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path data-k="cloud1" d="M0 22c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <path d="M0 170c127-38 221-14 323 4 117 20 203-24 316-7 96 14 184 13 281-7v80H0Z" fill="#93b67e" opacity=".6" />
      <g fill="#3f6e49" opacity=".75"><path d="M72 197v-54h8v54Zm-13-51q17-37 34 0-17-8-34 0Zm751 49v-67h9v67Zm-16-61q20-41 39 0-20-9-39 0Z" /><path d="M300 196c-9-15-6-32 7-40 13 8 15 25 7 40Z" /></g>
      {/* the flooded field running back to the trees, with rows planted days ago */}
      <path d="M0 212c137-12 270-4 399 1 175 7 324-13 521-2v99H0Z" fill={`url(#far${id})`} />
      <g stroke="#5f9b55" strokeWidth="1.6" strokeLinecap="round" opacity=".75">
        {Array.from({ length: 34 }, (_, i) => <path key={i} d={`M${14 + i * 20} ${222 + (i % 2)}l-2 -8M${16 + i * 20} ${222 + (i % 2)}l2 -8`} />)}
        {Array.from({ length: 26 }, (_, i) => <path key={`b${i}`} d={`M${20 + i * 26} ${234 + (i % 2)}l-3 -11M${23 + i * 26} ${234 + (i % 2)}l3 -11`} />)}
      </g>
      <path d="M0 247.5H920" stroke="#e6f3ee" strokeWidth="1.4" opacity=".7" />
      {/* the field round him, drawn SHIFT units from where it shows so the work sits in the middle of the frame */}
      <g transform={`translate(${SHIFT} 0)`}>
      {/* the bund, with its leak */}
      <path d="M690 266C698 250 706 238 716 234C728 230 746 230 758 234C768 240 776 252 782 266Z" fill={`url(#bund${id})`} />
      <path d="M704 242C708 237 712 235 716 234C728 230 746 230 758 234C762 236 765 239 768 243" fill="none" stroke="#8fa25c" strokeWidth="3.2" strokeLinecap="round" opacity=".8" />
      <path d="M708 238L722 236L723 250L707 251Z" fill="#3f5e57" opacity=".8" />
      <path data-k="patch" d="M705 240C709 233 720 232 724 236C725 243 724 250 715 252C709 251 704 248 705 240Z" fill="#6e5432" stroke="#4d3a22" strokeWidth="1" opacity="0" />
      <g fill="#6f9a4d" opacity=".9"><path d="M728 232l-3-10 6 8 2-12 3 13M748 232l-4-9 6 7 3-11 2 12" /></g>
      <g transform="translate(736 231) rotate(-86)"><Blades n={7} h={22} spread={2.6} /><path d="M-4 2h8" stroke="#c9ad6a" strokeWidth="3" /></g>
      <g data-k="leak" stroke="#d7ece6" strokeWidth="1.6" strokeLinecap="round" />
      {/* the field round him: planted hills, the bundle in the water, him, then the water over it all */}
      {HILLS.map(([, x], i) => <g key={x} data-k={`hill${i}`} transform={`translate(${x} ${MUD})`} opacity="0"><Blades n={3} h={30} /></g>)}
      <g data-k="bundleLying" />
      <Farmer look={LOOKS.aman} slots={{
        // held in his far hand but carried out in front of his knees, so it is drawn in front of the legs
        mid: <g data-k="bundle"><Sheaf /></g>,
        nearHand: (
          <>
            <circle data-k="mud" r="7.5" fill="#6e5432" stroke="#4d3a22" strokeWidth="1" />
            <g data-k="sprig"><Blades n={3} h={24} /><path d="M-1 1l-1 5M2 1l1 5" stroke="#6e5432" strokeWidth="1.2" /></g>
          </>
        ),
      }} />
      <path d={`M0 ${WATER}H1080V310H0Z`} fill={`url(#water${id})`} />
      <path d={`M0 ${WATER}H703M766 ${WATER}H1080`} stroke="#eef8f4" strokeWidth="1.6" opacity=".75" />
      <g data-k="tie" stroke="#c9ad6a" strokeWidth="2.4" strokeLinecap="round" />
      <g data-k="drips" fill="#e3f3f0" />
      <g data-k="splash" fill="#eef8f5" />
      <g data-k="ripples" fill="none" stroke="#f2fbf8" />
      </g>
      <g data-k="rain" stroke="#9ec6d6" strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function amanPainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.aman);
  const clouds = [q('cloud0'), q('cloud1')];
  const hills = HILLS.map((_, i) => q(`hill${i}`));
  const [patch, leak, bundle, mud, sprig, tie, ripples, rain, drips, splash] = ['patch', 'leak', 'bundle', 'mud', 'sprig', 'tie', 'ripples', 'rain', 'drips', 'splash'].map(q);
  const lying = q('bundleLying');
  lying.innerHTML = bundle.innerHTML;
  const f1 = (n) => n.toFixed(1);
  return (t, w) => {
    const fr = frame(t, w);
    svg.setAttribute('viewBox', viewBox(fr.view));
    clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((((i ? 600 : 80) + w * (i ? 3.4 : 4.6)) % 1180) + 1180) % 1180 - 130} ${i ? 66 : 50})`));
    patch.setAttribute('opacity', f1(fr.patch));
    leak.innerHTML = fr.leak > 0.02 ? Array.from({ length: 6 }, (_, i) => { const k = ((w * 1.6 + i / 6) % 1); return `<path d="M${f1(GAP[0] + k * 16)} ${f1(GAP[1] - 2 + k * k * 6)}l5 1" opacity="${(fr.leak * (1 - k) * 0.9).toFixed(2)}"/>`; }).join('') : '';
    const held = fr.t >= 3.85;
    bundle.style.display = held ? '' : 'none';
    lying.style.display = held ? 'none' : '';
    (held ? bundle : lying).setAttribute('transform', `translate(${f1(fr.bundle.x)} ${f1(fr.bundle.y)}) rotate(${f1(fr.bundle.a)}) scale(${(fr.bundle.s * 1.15).toFixed(2)})`);
    mud.style.display = fr.mud ? '' : 'none';
    if (fr.mud) mud.setAttribute('transform', `translate(${f1(fr.mud.x)} ${f1(fr.mud.y)})`);
    sprig.style.display = fr.sprig ? '' : 'none';
    if (fr.sprig) sprig.setAttribute('transform', `translate(${f1(fr.sprig.x)} ${f1(fr.sprig.y)}) rotate(${f1(fr.sprig.a)})`);
    hills.forEach((h, i) => {
      const s = fr.hills[i];
      h.setAttribute('opacity', s ? '1' : '0');
      if (s) h.setAttribute('transform', `translate(${HILLS[i][1]} ${MUD}) rotate(${f1(s.a)})`);
    });
    tie.innerHTML = fr.tie ? `<path d="M${f1(fr.tie.x)} ${f1(fr.tie.y)}l8 3" opacity="${fr.tie.o.toFixed(2)}"/>` : '';
    splash.innerHTML = fr.splash.map((d) => `<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r="1.4" opacity="${d.o.toFixed(2)}"/>`).join('');
    drips.innerHTML = fr.drips.map((d) => `<ellipse cx="${f1(d.x)}" cy="${f1(d.y)}" rx="1.2" ry="1.8"/>`).join('');
    ripples.innerHTML = fr.ripples.map((r) => `<ellipse cx="${f1(r.x)}" cy="${WATER + 1}" rx="${f1((4 + r.k * 30) * r.size)}" ry="${f1((1.2 + r.k * 6) * r.size)}" stroke-width="${f1(1.6 * (1 - r.k) + 0.3)}" opacity="${((1 - r.k) * 0.75).toFixed(2)}"/>`).join('');
    rain.innerHTML = Array.from({ length: 34 }, (_, i) => {
      const x = ((i * 71 + w * 46) % 960) - 20, y = ((i * 89 + w * 380) % 330) - 20;
      return y < WATER - 4 ? `<path d="M${f1(x)} ${f1(y)}l-3 9"/>` : `<ellipse cx="${f1(x)}" cy="${WATER + 2 + (i % 5) * 9}" rx="${f1(2 + ((w * 3 + i) % 1) * 5)}" ry="1" fill="none" opacity=".5"/>`;
    }).join('');
    paintFarmer(fr.sk, fr.extra);
  };
}
