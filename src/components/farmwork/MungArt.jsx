// The mung-bean bed after the Rabi harvest: dry loam, a kodal, a watering can, and the farmer. mungPainter() moves it
// to a frame of mungbean.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, CHOPS, SPROUTS, STUCK } from './mungbean';
import { viewBox } from './camera';

// The kodal, about a metre long: drawn around where the front hand holds it (the origin), the handle running back to
// its end and forward to the heavy blade, which is turned down like an adze.
function Kodal(props) {
  return (
    <g {...props}>
      <path d="M-42 0L60 0" stroke="#7a5230" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M-42 0L60 0" stroke="#b07b45" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      <path d="M52 -5L66 -5L70 24Q61 28 50 24Z" fill="#6f777b" stroke="#454b4e" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M52 -1L66 -1" stroke="#9aa3a7" strokeWidth="1.4" />
    </g>
  );
}

// The watering can, hung from its handle (the origin), the spout and rose to the right.
function Can(props) {
  return (
    <g {...props}>
      <path d="M-12 13C-12 2 6 2 7 13" fill="none" stroke="#4f6d78" strokeWidth="3" strokeLinecap="round" />
      <path d="M-15 13L13 13L14 42L-16 42Z" fill="#7d9aa3" stroke="#4f6d78" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-15 19L13 19M-15 36L14 36" stroke="#a8c1c8" strokeWidth="1.4" opacity=".8" />
      <path d="M12 33L41 8" stroke="#6b8992" strokeWidth="4" strokeLinecap="round" />
      <circle cx="43" cy="6.5" r="4.4" fill="#7d9aa3" stroke="#4f6d78" strokeWidth="1.3" />
    </g>
  );
}

export default function MungArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="196 26 660 222" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'একজন কৃষক কোদালে মাটি আলগা করে সারিতে আর ছিটিয়ে মুগ বীজ বুনছেন, মাটি ঢেকে পানি দিচ্ছেন' : 'A farmer loosens the bed with a kodal, sows mung beans in a line and by hand, covers them and waters'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#d9eef0" /><stop offset=".8" stopColor="#f8f2da" /></linearGradient>
        <linearGradient id={`soil${id}`} x2="0" y2="1"><stop stopColor="#b48654" /><stop offset="1" stopColor="#7a5738" /></linearGradient>
        <radialGradient id={`sun${id}`}><stop stopColor="#fff4c9" /><stop offset=".5" stopColor="#f6cf6a" stopOpacity=".9" /><stop offset="1" stopColor="#f6cf6a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="920" height="310" fill={`url(#sky${id})`} />
      <circle cx="792" cy="50" r="48" fill={`url(#sun${id})`} />
      <g fill="#fff" opacity=".75">
        <path data-k="cloud0" d="M0 26c-15 0-18-19-5-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path data-k="cloud1" d="M0 22c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <path d="M0 167c127-40 221-14 323 4 117 20 203-24 316-7 96 14 184 13 281-7v82H0Z" fill="#9fbd85" opacity=".65" />
      <path d="M0 193c127-32 251-8 357 8 128 19 261-20 366-10 81 8 145 7 197-8v70H0Z" fill="#6c9461" opacity=".6" />
      <g fill="#46734b" opacity=".75"><path d="M72 197v-54h8v54Zm-13-51q17-37 34 0-17-8-34 0Zm751 49v-67h9v67Zm-16-61q20-41 39 0-20-9-39 0Z" /><path d="M640 196c-9-15-6-32 7-40 13 8 15 25 7 40Z" /></g>
      <path d="M0 229c166-18 314-7 459-2 170 7 301-15 461-3v86H0Z" fill={`url(#soil${id})`} />
      <path d="M0 240c177-17 294-4 460 2 176 6 311-15 460-3" fill="none" stroke="#dbb57a" strokeWidth="3" opacity=".55" />
      <g fill="none" stroke="#5a4330" strokeWidth="3" opacity=".35"><path d="M20 290q220-30 442-2t435 0" /></g>
      {/* the bed: loosened where the kodal bit, a shallow line for the seed, darker where it is watered */}
      {CHOPS.map(([, x], i) => <ellipse key={x} data-k={`loose${i}`} cx={x - 6} cy="265" rx="26" ry="6.5" fill="#6b4a2e" opacity="0" />)}
      <path d="M478 267Q560 263 652 266" fill="none" stroke="#5e432b" strokeWidth="3.2" strokeLinecap="round" opacity=".7" />
      <path d="M478 269.5Q560 265.5 652 268.5" fill="none" stroke="#d4ad77" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
      <ellipse data-k="wet" cx="628" cy="268" rx="66" ry="9" fill="#5b3f27" opacity="0" />
      <Kodal data-k="hoeStuck" transform={`translate(${STUCK.x} ${STUCK.y}) rotate(${STUCK.a})`} />
      <ellipse data-k="canShadow" rx="18" ry="3.6" fill="#2c241b" />
      <Can data-k="canGround" />
      <Farmer look={LOOKS.mungbean} slots={{
        mid: (
          <>
            {/* the seed bag: a cloth gathered and tied at the waist */}
            <g data-k="pouch">
              <path d="M-1 -6C-2 -3-1-1 0 0" fill="none" stroke="#8d784f" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M-6.6 1.4C-9.6 7.4-8.6 13.8 0 15.2C8.6 13.8 9.6 7.4 6.6 1.4C3.6 2.8-3.6 2.8-6.6 1.4Z" fill="#cdb98e" stroke="#8d784f" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M-6 1.6C-3.4-1.6 3.4-1.6 6 1.6M-3.4 4.4C-4.6 8-3.6 11.4-1.4 13M3 5C4.2 8.4 3.6 11.4 2 13" fill="none" stroke="#9c865a" strokeWidth="1" strokeLinecap="round" opacity=".8" />
              <circle cx="0" cy="0.4" r="1.9" fill="#b8a173" stroke="#8d784f" strokeWidth="1" />
            </g>
            <Kodal data-k="hoeHeld" />
          </>
        ),
        nearHand: <Can data-k="canHeld" />,
      }} />
      <g data-k="sprouts">
        {SPROUTS.map((x, i) => (
          <g key={x} data-k={`sprout${i}`} transform={`translate(${x} ${267 + (i % 3) * 1.5})`}>
            <path d="M0 0V-12" stroke="#4f8e3f" strokeWidth="2" strokeLinecap="round" />
            <path d="M0 -10C-6 -16-12 -12-9 -9C-6 -7-3 -8 0 -10ZM0 -11C5 -17 12 -14 9 -10C7 -8 3 -9 0 -11Z" fill="#6aac4f" stroke="#3f7a35" strokeWidth=".8" />
          </g>
        ))}
      </g>
      <path data-k="smear" fill="none" stroke="#efe6d4" strokeLinecap="round" strokeLinejoin="round" />
      <g data-k="particles" />
      <rect data-k="night" width="920" height="310" fill="#1f2c4d" opacity="0" />
    </svg>
  );
}

export function mungPainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.mungbean);
  const clouds = [q('cloud0'), q('cloud1')];
  const loose = CHOPS.map((_, i) => q(`loose${i}`));
  const sprouts = SPROUTS.map((_, i) => q(`sprout${i}`));
  const [hoeStuck, hoeHeld, canGround, canHeld, pouch, wet, night, parts, smear, canShadow] = ['hoeStuck', 'hoeHeld', 'canGround', 'canHeld', 'pouch', 'wet', 'night', 'particles', 'smear', 'canShadow'].map(q);
  const f1 = (n) => n.toFixed(1);
  return (t, w) => {
    const fr = frame(t, w);
    svg.setAttribute('viewBox', viewBox(fr.view));
    clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((((i ? 610 : 90) + w * (i ? 3 : 4.2)) % 1180) + 1180) % 1180 - 130} ${i ? 70 : 54})`));
    loose.forEach((e, i) => e.setAttribute('opacity', (fr.loose[i] * 0.55).toFixed(2)));
    wet.setAttribute('opacity', (fr.wet * 0.45).toFixed(2));
    hoeHeld.style.display = fr.held ? '' : 'none';
    hoeStuck.style.display = fr.held ? 'none' : '';
    if (fr.held) hoeHeld.setAttribute('transform', `translate(${f1(fr.hoe.x)} ${f1(fr.hoe.y)}) rotate(${f1(fr.hoe.a)})`);
    const held = fr.t >= 15.62;
    canHeld.style.display = held ? '' : 'none';
    canGround.style.display = held ? 'none' : '';
    (held ? canHeld : canGround).setAttribute('transform', `translate(${f1(fr.can.x)} ${f1(fr.can.y)}) rotate(${f1(fr.can.a)})`);
    const lift = Math.max(0, 223 - fr.can.y);
    canShadow.setAttribute('cx', f1(fr.can.x + 2 + lift * 0.15));
    canShadow.setAttribute('cy', '266');
    canShadow.setAttribute('rx', f1(18 - Math.min(9, lift * 0.2)));
    canShadow.setAttribute('opacity', (0.28 * (1 - Math.min(0.75, lift / 60))).toFixed(2));
    pouch.setAttribute('transform', `translate(${f1(fr.pouch[0])} ${f1(fr.pouch[1])}) rotate(${f1(fr.sk.lumbar * 0.4)})`);
    sprouts.forEach((s, i) => {
      const k = Math.max(0, Math.min(1, fr.sprout * 1.25 - (i % 4) * 0.08));
      s.setAttribute('opacity', k > 0 ? '1' : '0');
      s.setAttribute('transform', `translate(${SPROUTS[i]} ${267 + (i % 3) * 1.5}) scale(${f1(0.2 + 0.8 * k)} ${(k * (1 + 0.12 * Math.sin(k * Math.PI))).toFixed(2)})`);
    });
    night.setAttribute('opacity', (fr.night * 0.2).toFixed(2));
    paintFarmer(fr.sk, fr.extra);
    if (fr.smear) {
      smear.setAttribute('d', `M${fr.smear.pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}`);
      smear.setAttribute('stroke-width', '9');
      smear.setAttribute('opacity', fr.smear.o.toFixed(2));
    } else smear.setAttribute('opacity', '0');
    parts.innerHTML = [
      ...fr.dust.flatMap((d) => [0, 1, 2].map((i) => `<circle cx="${f1(d.x + (i - 1) * 7 * (0.4 + d.k))}" cy="${f1(260 - d.k * 6 - i * 1.5)}" r="${f1(1.6 + d.k * 3.2)}" fill="#d1b083" opacity="${((1 - d.k) * 0.5).toFixed(2)}"/>`)),
      ...fr.clods.map((c) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(c.r)}" fill="#6e4d31" opacity="${c.o.toFixed(2)}"/>`),
      ...fr.seeds.filter((s) => s.o > 0.02).map((s) => `<ellipse cx="${f1(s.x)}" cy="${f1(s.y)}" rx="1.9" ry="1.4" fill="#5f7a2e" stroke="#3e5220" stroke-width=".5" opacity="${s.o.toFixed(2)}"/>`),
      ...fr.drops.map((d) => `<path d="M${f1(d.x)} ${f1(d.y - 3)}l0 5" stroke="#8cc8e0" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>`),
    ].join('');
  };
}
