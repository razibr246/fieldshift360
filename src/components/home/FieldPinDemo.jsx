// "Show us your field", acted out on the aerial photo: when the section comes into view the big green plot's edge is
// traced, a pin drops onto it and a small label appears. It is an example, labelled so; the real picking happens on
// /farmer/farm. The SVG uses the photo's own pixel grid and the same centred cover crop as the photo under it (the
// photo must be drawn with focus "50% 50%"), so the outline stays on the plot at every screen size.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';

const W = 1672, H = 941; // the landParcels photo
// The large paddy plot just below the centre, traced from the photo (corners in photo pixels).
const PLOT = [[659, 638], [856, 562], [997, 566], [1097, 646], [864, 794]];
const PIN = [872, 655];

export default function FieldPinDemo() {
  const { T } = useStore();
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [still, setStill] = useState(false);
  // On a phone the photo (and this drawing) is shrunk about four times; the pin and label grow back so the label
  // stays readable. z = 1 on a desktop-sized photo.
  const [z, setZ] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => { const k = Math.max(el.clientWidth / W, el.clientHeight / H); setZ(Math.min(2.6, Math.max(1, 0.6 / k))); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStill(true); setShown(true); return undefined; }
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const t = (ms, delay = 0, ease = 'cubic-bezier(.22,1,.36,1)') => (still ? 'none' : `all ${ms}ms ${ease} ${delay}ms`);
  const pts = PLOT.map((p) => p.join(',')).join(' ');
  const label = T('আপনার জমি এখানে', 'Your field here');
  const note = T('উদাহরণ', 'Example');
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <filter id="fpd-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="fpd-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0d2614" floodOpacity=".45" /></filter>
      </defs>
      {/* the plot: a soft fill, a blurred glow and the traced edge */}
      <polygon points={pts} fill="#f6c453" style={{ opacity: shown ? 0.22 : 0, transition: t(900, 900) }} />
      <polygon points={pts} fill="none" stroke="#f6c453" strokeWidth="14" filter="url(#fpd-glow)" pathLength="1" strokeDasharray="1"
        style={{ strokeDashoffset: shown ? 0 : 1, opacity: shown ? 0.8 : 0, transition: t(1500, 150, 'ease-in-out') }} />
      <polygon points={pts} fill="none" stroke="#fff7df" strokeWidth="4.5" strokeLinejoin="round" pathLength="1" strokeDasharray="1"
        style={{ strokeDashoffset: shown ? 0 : 1, transition: t(1500, 150, 'ease-in-out') }} />
      {/* corner handles, as on the real map */}
      {PLOT.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill="#fff" stroke="#c98a12" strokeWidth="4" style={{ opacity: shown ? 1 : 0, transition: t(300, 1500 + i * 70) }} />
      ))}
      {/* the pin drops in with a small bounce; its shadow grows as it lands */}
      <ellipse cx={PIN[0]} cy={PIN[1] + 4} rx="22" ry="7" fill="#0d2614" style={{ opacity: shown ? 0.35 : 0, transition: t(500, 1250) }} />
      <g style={{ transform: shown ? 'translateY(0)' : 'translateY(-120px)', opacity: shown ? 1 : 0, transition: t(700, 1100, 'cubic-bezier(.34,1.56,.64,1)') }}>
        <g transform={`translate(${PIN[0]} ${PIN[1]}) scale(${z})`} filter="url(#fpd-shadow)">
          <path d="M0 0 C -8 -18 -34 -36 -34 -62 A 34 34 0 1 1 34 -62 C 34 -36 8 -18 0 0 Z" fill="#2f6e2f" stroke="#fff" strokeWidth="5" />
          <circle cx="0" cy="-62" r="12" fill="#fff" />
        </g>
      </g>
      {/* the label, centred above the pin */}
      <g transform={`translate(${PIN[0] - 145 * z} ${PIN[1] - 200 * z}) scale(${z})`} style={{ opacity: shown ? 1 : 0, transition: t(500, 1800) }}>
        <rect width="290" height="84" rx="22" fill="#fffdf6" opacity=".96" filter="url(#fpd-shadow)" />
        <text x="22" y="36" fontSize="27" fontWeight="700" fill="#13261b">{label}</text>
        <text x="22" y="66" fontSize="20" fontWeight="600" fill="#8a6411">{note}</text>
      </g>
    </svg>
  );
}
