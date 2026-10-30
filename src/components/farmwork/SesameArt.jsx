// The sesame bed in Chaitra: dry, cloddy soil turned fine under the maul; a bowl of sand to carry the tiny seed; a
// leafy branch to cover it. sesamePainter() moves it to a frame of sesame.js.
import { useId } from 'react';
import Farmer, { LOOKS, farmerPainter } from './Farmer';
import { frame, CLODS, SPROUTS, SWEEP_FROM, BRANCH } from './sesame';
import { viewBox } from './camera';

const f1 = (n) => n.toFixed(1);

// The মুগুর: a wooden maul drawn round where the front hand holds it (the origin): the handle runs back to the end the
// other hand holds and forward to the heavy block, set across the handle.
function Maul(props) {
  return (
    <g {...props}>
      <path d="M-28 0L30 0" stroke="#7a5230" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M-28 0L30 0" stroke="#b07b45" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
      <rect x="27" y="-13" width="14" height="26" rx="3" fill="#8b5e34" stroke="#5e3d20" strokeWidth="1.4" />
      <path d="M30 -10v20M35 -11v22" stroke="#a87444" strokeWidth="1" opacity=".7" />
    </g>
  );
}

// A wide shallow bowl of dry sand (origin at the middle of its foot).
function Bowl({ swirl = false, ...props }) {
  return (
    <g {...props}>
      <path d="M-18 -11Q0 -6 18 -11L14 -1Q0 3-14 -1Z" fill="#9aa7ab" stroke="#5f6c70" strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="0" cy="-11" rx="18" ry="3.6" fill="#e3cf9e" stroke="#5f6c70" strokeWidth="1.2" />
      <g data-k={swirl ? 'swirl' : undefined} opacity=".7"><path d="M-9 -11.5Q0 -14.5 9 -11.5" fill="none" stroke="#b39a62" strokeWidth="1" /><circle cx="3" cy="-11" r=".8" fill="#3b2d22" /><circle cx="-4" cy="-10.6" r=".7" fill="#3b2d22" /></g>
    </g>
  );
}

// A leafy branch, about a metre and a half, from its cut end (the origin) along +x; the leaves are on its far half.
function Branch(props) {
  const leaves = [[60, -4, -30], [68, -9, -10], [70, 6, 30], [78, 7, 10], [84, -7, -24], [92, -2, 0], [88, 4, 40], [98, 6, 20], [102, -6, -20], [108, 0, 6], [75, 1, 60], [95, -9, -40]];
  return (
    <g {...props}>
      <path d="M0 0L110 0M56 0L68 -9M66 0L80 8M78 0L90 -8M92 0L104 7" stroke="#6b4a2c" strokeWidth="2.4" strokeLinecap="round" />
      {leaves.map(([x, y, a], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry="3" transform={`rotate(${a} ${x} ${y})`} fill={i % 2 ? '#5e9a48' : '#4b8a3e'} stroke="#3a6d30" strokeWidth=".6" />
      ))}
    </g>
  );
}

export default function SesameArt({ lang, svgRef }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg ref={svgRef} viewBox="196 26 660 222" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn' ? 'একজন কৃষক মুগুর দিয়ে ঢেলা ভেঙে, তিলের ছোট বীজ বালুর সাথে মিশিয়ে ছিটিয়ে বুনছেন আর ডাল টেনে ঢেকে দিচ্ছেন' : 'A farmer breaks the clods with a maul, mixes the tiny sesame seed with sand, broadcasts it and drags a leafy branch to cover it'}>
      <defs>
        <linearGradient id={`sky${id}`} x2="0" y2="1"><stop stopColor="#d3ebf0" /><stop offset=".8" stopColor="#faf0d4" /></linearGradient>
        <linearGradient id={`soil${id}`} x2="0" y2="1"><stop stopColor="#c19a68" /><stop offset="1" stopColor="#8b6a45" /></linearGradient>
        <radialGradient id={`sun${id}`}><stop stopColor="#fff6d0" /><stop offset=".5" stopColor="#f6cd62" stopOpacity=".9" /><stop offset="1" stopColor="#f6cd62" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="920" height="310" fill={`url(#sky${id})`} />
      <circle cx="792" cy="48" r="50" fill={`url(#sun${id})`} />
      <g fill="#fff" opacity=".75">
        <path data-k="cloud0" d="M0 26c-15 0-18-19-5-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path data-k="cloud1" d="M0 22c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <path d="M0 168c127-40 221-14 323 4 117 20 203-24 316-7 96 14 184 13 281-7v82H0Z" fill="#a8c08a" opacity=".62" />
      <path d="M0 194c127-32 251-8 357 8 128 19 261-20 366-10 81 8 145 7 197-8v70H0Z" fill="#76996a" opacity=".55" />
      <g fill="#4d7a50" opacity=".72"><path d="M90 196v-52h8v52Zm-13-49q17-37 34 0-17-8-34 0Zm712 48v-66h9v66Zm-16-60q20-41 39 0-20-9-39 0Z" /><path d="M690 195c-9-15-6-32 7-40 13 8 15 25 7 40Z" /></g>
      <path d="M0 229c166-18 314-7 459-2 170 7 301-15 461-3v86H0Z" fill={`url(#soil${id})`} />
      <path d="M0 240c177-17 294-4 460 2 176 6 311-15 460-3" fill="none" stroke="#e2bf86" strokeWidth="3" opacity=".5" />
      {/* the bed: a patch of fine soil where each clod was, and a smooth band where the branch has swept */}
      {CLODS.map(([, x], i) => <ellipse key={x} data-k={`fine${i}`} cx={x} cy="264" rx="18" ry="5" fill="#d2b07c" opacity="0" />)}
      <rect data-k="swept" x="0" y="257" height="13" rx="6" fill="#d8bb8a" opacity="0" />
      {CLODS.map(([, x], i) => <path key={x} data-k={`clod${i}`} d={`M${x - 10} 263c-2-6 3-11 9-11 5-1 11 3 11 8 1 4-3 6-10 6-6 0-9-1-10-3Z`} fill="#8e6a44" stroke="#6b4e31" strokeWidth="1.1" />)}
      <Maul data-k="maulGround" />
      <Bowl data-k="bowlGround" swirl />
      <g data-k="bagGround"><path d="M-6 0C-8-6-6-12 0-12C6-12 8-6 6 0Z" fill="#cdb98e" stroke="#8d784f" strokeWidth="1.1" /></g>
      <Branch data-k="branchGround" />
      <g data-k="sprouts">
        {SPROUTS.map((x, i) => (
          <g key={x} data-k={`sprout${i}`} transform={`translate(${x} ${266 + (i % 3) * 1.4})`}>
            <path d="M0 0V-9" stroke="#5a9a44" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-4" cy="-10" rx="4.2" ry="2.8" fill="#6db254" stroke="#3f7a35" strokeWidth=".7" />
            <ellipse cx="4" cy="-10.6" rx="4.2" ry="2.8" fill="#6db254" stroke="#3f7a35" strokeWidth=".7" />
          </g>
        ))}
      </g>
      <Farmer look={LOOKS.sesame} slots={{
        farHand: <Bowl data-k="bowlHeld" />,
        mid: (
          <>
            <g data-k="bag"><path d="M-6.6 1.4C-9.6 7.4-8.6 13.8 0 15.2C8.6 13.8 9.6 7.4 6.6 1.4C3.6 2.8-3.6 2.8-6.6 1.4Z" fill="#cdb98e" stroke="#8d784f" strokeWidth="1.3" strokeLinejoin="round" /><path d="M-6 1.6C-3.4-1.6 3.4-1.6 6 1.6" fill="none" stroke="#9c865a" strokeWidth="1" /></g>
            <Maul data-k="maulHeld" />
          </>
        ),
        nearHand: <Branch data-k="branchHeld" />,
      }} />
      <g data-k="particles" />
      <rect data-k="night" width="920" height="310" fill="#1f2c4d" opacity="0" />
    </svg>
  );
}

export function sesamePainter(svg) {
  const q = (k) => svg.querySelector(`[data-k="${k}"]`);
  const paintFarmer = farmerPainter(svg.querySelector('[data-farmer]'), LOOKS.sesame);
  const clouds = [q('cloud0'), q('cloud1')];
  const fine = CLODS.map((_, i) => q(`fine${i}`)), clods = CLODS.map((_, i) => q(`clod${i}`));
  const sprouts = SPROUTS.map((_, i) => q(`sprout${i}`));
  const [maulGround, maulHeld, bowlGround, bowlHeld, bag, bagGround, branchGround, branchHeld, swept, swirl, night, parts] =
    ['maulGround', 'maulHeld', 'bowlGround', 'bowlHeld', 'bag', 'bagGround', 'branchGround', 'branchHeld', 'swept', 'swirl', 'night', 'particles'].map(q);
  const show = (el, on) => { el.style.display = on ? '' : 'none'; };
  const place = (el, x, y, a = 0) => el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})`);
  return (t, w) => {
    const fr = frame(t, w);
    svg.setAttribute('viewBox', viewBox(fr.view));
    clouds.forEach((c, i) => c.setAttribute('transform', `translate(${((((i ? 610 : 90) + w * (i ? 3 : 4.2)) % 1180) + 1180) % 1180 - 130} ${i ? 70 : 54})`));
    fr.clods.forEach((c, i) => { show(clods[i], !c.broken); fine[i].setAttribute('opacity', c.broken ? '.75' : '0'); });
    show(maulHeld, fr.held); show(maulGround, !fr.held);
    place(fr.held ? maulHeld : maulGround, fr.maul.x, fr.maul.y, fr.maul.a);
    // the seed bag: at his waist, then in his hand while he pours, then dropped beside the bowl
    const bagDown = !fr.bag.held && t >= 4.25;
    show(bag, !bagDown); show(bagGround, bagDown);
    if (bagDown) place(bagGround, fr.bag.x, fr.bag.y); else place(bag, fr.bag.x, fr.bag.y, fr.bag.a);
    show(bowlHeld, fr.bowl.held); show(bowlGround, !fr.bowl.held);
    place(fr.bowl.held ? bowlHeld : bowlGround, fr.bowl.x, fr.bowl.y, 0);
    if (swirl) swirl.setAttribute('transform', `rotate(${f1(fr.swirl * 40)} 0 -11)`);
    const dragging = t >= BRANCH.pick && t < BRANCH.drop;
    show(branchHeld, dragging); show(branchGround, !dragging);
    place(dragging ? branchHeld : branchGround, fr.branch.x, fr.branch.y, fr.branch.a);
    // the smooth band the leaves have raked, from where they started to where they are now
    if (Number.isFinite(fr.sweep)) { swept.setAttribute('x', f1(fr.sweep)); swept.setAttribute('width', f1(Math.max(0, SWEEP_FROM - fr.sweep + 8))); swept.setAttribute('opacity', '.6'); }
    else swept.setAttribute('opacity', '0');
    sprouts.forEach((s, i) => {
      const k = Math.max(0, Math.min(1, fr.sprout * 1.25 - (i % 4) * 0.08));
      s.setAttribute('opacity', k > 0 ? '1' : '0');
      s.setAttribute('transform', `translate(${SPROUTS[i]} ${266 + (i % 3) * 1.4}) scale(${f1(0.2 + 0.8 * k)} ${(k * (1 + 0.12 * Math.sin(k * Math.PI))).toFixed(2)})`);
    });
    night.setAttribute('opacity', (fr.night * 0.2).toFixed(2));
    paintFarmer(fr.sk, fr.extra);
    parts.innerHTML = [
      ...fr.crumbs.map((c) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(c.r)}" fill="#8e6a44" opacity="${c.o.toFixed(2)}"/>`),
      ...fr.stream.map((d) => `<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r=".9" fill="#3b2d22"/>`),
      ...fr.seeds.filter((s) => s.o > 0.02).map((s) => `<circle cx="${f1(s.x)}" cy="${f1(s.y)}" r="${s.sand ? '1.1' : '.9'}" fill="${s.sand ? '#e8d3a2' : '#3b2d22'}" opacity="${s.o.toFixed(2)}"/>`),
      ...fr.dust.map((d) => `<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r="2.4" fill="#d9c08a" opacity="${d.o.toFixed(2)}"/>`),
    ].join('');
  };
}
