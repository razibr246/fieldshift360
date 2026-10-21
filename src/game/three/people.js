// The five farmers as low-poly 3D figures with jointed limbs, each dressed as people dress where they farm:
// Harjinder Singh in a saffron dastar, white kurta-pyjama and a steel kara; Ghulam Nabi Chandio in a mirror-work
// Sindhi cap, white shalwar kameez and an ajrak shawl; Rampyari Chaudhary in a Tharu skirt with bright bands, a white
// choli, a red orhni and silver jewellery; Kinley Wangmo in a woven kira and silk tego with folded wonju cuffs;
// U Kyaw Win in a checked longyi, a white eingyi and a gaung baung head-wrap. Tools appear for the work: a watering
// can (a clay pot for the women), a sickle, a sprayer, a phone. animate() poses the figure every frame.
// Bodies are built for a realistic look: a shaped torso (broader chest on men, a narrower waist on women), smooth
// tapered limbs with rounded joints, hands with fingers, adult proportions, fabric that catches the light at its edges
// and skin with a soft sheen, and a painted face on every head — in their likeness for a farmer drawn from a real
// person (look.face). The walk sways the hips and counter-turns the shoulders.
import * as THREE from 'three';

const geo = {
  sphere: (r, w = 14, h = 10, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest),
  cyl: (rt, rb, h, s = 12, open = false, t0 = 0, tl = Math.PI * 2) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open, t0, tl),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  torus: (r, t, rs = 8, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
};
const mats = new Map();
// Phones get plain materials; elsewhere cloth and skin get a sheen (light caught at grazing angles, as fabric and skin do).
const HQ = typeof window !== 'undefined' && !window.matchMedia?.('(pointer: coarse)').matches;
export function mat(color, o = {}) {
  const k = `${color}|${o.flat ? 1 : 0}|${o.map?.uuid ?? ''}|${o.emissive ?? ''}|${o.rough ?? ''}|${o.metal ?? ''}|${o.side ?? ''}|${o.sheen ?? ''}`;
  if (!mats.has(k)) {
    const base = { color: o.map ? '#ffffff' : color, map: o.map ?? null, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, flatShading: !!o.flat, emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissive ? 1 : 0, side: o.side ?? THREE.FrontSide };
    mats.set(k, HQ && o.sheen ? new THREE.MeshPhysicalMaterial({ ...base, sheen: o.sheen, sheenRoughness: o.sheenRough ?? 0.7, sheenColor: new THREE.Color(o.sheenColor ?? '#ffffff') }) : new THREE.MeshStandardMaterial(base));
  }
  return mats.get(k);
}
const cloth = (color, o = {}) => mat(color, { sheen: 0.55, sheenRough: 0.8, ...o });

// A limb hanging from its joint: radius r0 at the top, r1 at the bottom, a slight muscle swell, rounded ends that
// close over the joints when it bends. Shared between figures.
const shapes = new Map();
function limb(r0, r1, len, swell = 1.07) {
  const k = `limb${r0}|${r1}|${len}|${swell}`;
  if (shapes.has(k)) return shapes.get(k);
  const pts = [];
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(r1 * Math.sin(a), -len - r1 * Math.cos(a) * 0.85)); }
  pts.push(new THREE.Vector2((r1 + (r0 - r1) * 0.35) * swell, -len * 0.62), new THREE.Vector2((r1 + (r0 - r1) * 0.78) * swell, -len * 0.3));
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector2(r0 * Math.cos(a), r0 * Math.sin(a) * 0.85)); }
  const g = new THREE.LatheGeometry(pts, 16); shapes.set(k, g); return g;
}
// The torso from the waist to the base of the neck, turned on a lathe and flattened front to back.
function torsoShape(female) {
  const k = `torso${female}`;
  if (shapes.has(k)) return shapes.get(k);
  const prof = female
    ? [[0.162, -0.04], [0.15, 0.06], [0.148, 0.12], [0.163, 0.22], [0.178, 0.3], [0.17, 0.37], [0.178, 0.44], [0.17, 0.5], [0.135, 0.545], [0.085, 0.575], [0.052, 0.59]]
    : [[0.168, -0.04], [0.162, 0.06], [0.168, 0.15], [0.186, 0.26], [0.198, 0.35], [0.205, 0.43], [0.198, 0.49], [0.158, 0.54], [0.095, 0.572], [0.058, 0.59]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24); g.userData.prof = prof; shapes.set(k, g); return g;
}
// how far forward the torso's surface is at height y, x to the side: where buttons, plackets and sashes sit
function frontOf(female) {
  const prof = torsoShape(female).userData.prof;
  return (y, x = 0) => {
    let i = 0; while (i < prof.length - 2 && prof[i + 1][1] < y) i++;
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], r = r0 + (r1 - r0) * Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
    return 0.78 * Math.sqrt(Math.max(0, r * r - x * x));
  };
}
const capsule = (r, l) => { const k = `cap${r}|${l}`; if (!shapes.has(k)) shapes.set(k, new THREE.CapsuleGeometry(r, l, 3, 8)); return shapes.get(k); };
const isFemale = (look) => ['sari', 'ghagra', 'kira'].includes(look.lower) || ['orhni', 'aanchal', 'hijab'].includes(look.head) || ['blouse', 'choli', 'tego'].includes(look.top);
function mesh(g, m, parent, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...pos); o.rotation.set(...rot); if (scale) o.scale.set(...scale);
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o); return o;
}
const group = (parent, pos = [0, 0, 0]) => { const o = new THREE.Group(); o.position.set(...pos); parent.add(o); return o; };

// ---- cloth patterns, drawn once on small canvases ----
const texCache = new Map();
export function canvasTex(key, w, h, draw, rep = [1, 1]) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4;
  texCache.set(key, t); return t;
}
const check = (a, b, n = 8, rep = [3, 2]) => canvasTex(`check${a}${b}${n}${rep}`, 64, 64, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.globalAlpha = 0.55; c.fillStyle = b;
  for (let i = 0; i < n; i += 2) { c.fillRect(i * (w / n), 0, w / n / 1.6, h); c.fillRect(0, i * (h / n), w, h / n / 1.6); }
  c.globalAlpha = 0.3; c.fillStyle = '#ffffff';
  for (let i = 1; i < n; i += 2) { c.fillRect(i * (w / n), 0, 1.5, h); c.fillRect(0, i * (h / n), w, 1.5); }
}, rep);
// horizontal woven bands at the hem (Tharu skirt) or all over (Bhutanese kira)
const bandTex = (base, bands, all) => canvasTex(`band${base}${bands}${all}`, 64, 128, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  if (all) {
    for (let y = 0, k = 0; y < h; y += 10, k++) { c.fillStyle = bands[k % bands.length]; c.fillRect(0, y, w, k % 3 === 0 ? 6 : 3); }
    c.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 4; y < h; y += 20) for (let x = (y / 4) % 8; x < w; x += 8) c.fillRect(x, y, 3, 2);
  } else bands.forEach((col, k) => { c.fillStyle = col; c.fillRect(0, h - 10 - k * 10, w, 6); });
}, [3, 1]);
// Sindhi ajrak: crimson ground with indigo and white block-printed rosettes
const ajrakTex = () => canvasTex('ajrak', 64, 64, (c, w, h) => {
  c.fillStyle = '#8f1d24'; c.fillRect(0, 0, w, h);
  for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) {
    c.fillStyle = '#1d2a5a'; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f2ece0'; c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#121212'; c.fillRect(x + 6, y - 1, 4, 2);
  }
  c.fillStyle = '#1d2a5a'; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
}, [2, 2]);
// the mirror-work band of a Sindhi topi
const topiTex = (a, b) => canvasTex(`topi${a}${b}`, 128, 32, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.fillStyle = b; for (let x = 4; x < w; x += 12) { c.beginPath(); c.moveTo(x, 4); c.lineTo(x + 5, h / 2); c.lineTo(x, h - 4); c.lineTo(x - 5, h / 2); c.fill(); }
  c.fillStyle = '#e8f0f6'; for (let x = 10; x < w; x += 12) { c.beginPath(); c.arc(x, h / 2, 2.6, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#1a6b3a'; c.fillRect(0, 0, w, 2); c.fillRect(0, h - 2, w, 2);
});
const turbanTex = (a, b) => canvasTex(`turban${a}${b}`, 64, 64, (c, w, h) => {
  c.fillStyle = a; c.fillRect(0, 0, w, h);
  c.strokeStyle = b; c.lineWidth = 2;
  for (let k = -h; k < w; k += 9) { c.beginPath(); c.moveTo(k, h); c.lineTo(k + h * 0.6, 0); c.stroke(); }
}, [3, 1]);

// Painted game faces, drawn from a person's photo: Razib's thick straight brows, dark almond eyes, light moustache and
// chin beard. The paint sits on a patch of sphere just over the front of the head; face() turns a point on the head
// (x across, y up, in model units) into a pixel on that patch, so features land where the 3D nose and ears are.
const FACES = { razib: { brow: '#16100d', iris: '#3b2416', lid: '#2a1a12', lip: '#9e5a4c', lipLo: '#b8766a', beard: '#1e1611', shade: '#9c6a4c', goatee: true, browW: 9 } };
// everyone else: a face from their look — brow colour from the hair or beard, softer brows and fuller lashes for women
function faceFor(look) {
  if (look.face) return look.face;
  const female = isFemale(look), k = `auto${female ? 'f' : 'm'}${look.skin}${look.hair}${look.beard ?? ''}`;
  if (!FACES[k]) {
    const sk = new THREE.Color(look.skin), shade = '#' + sk.clone().multiplyScalar(0.78).getHexString();
    FACES[k] = { brow: look.beard ?? look.moustache ?? look.hair, iris: '#2e1c12', lid: '#22150f', lip: female ? '#a55a55' : '#' + sk.clone().lerp(new THREE.Color('#7a3a30'), 0.45).getHexString(), lipLo: female ? '#bd6f68' : '#' + sk.clone().lerp(new THREE.Color('#9a5048'), 0.4).getHexString(), beard: look.hair, shade, female, browW: female ? 5.5 : 8, stubble: !female && !look.beard && !look.moustache };
  }
  return k;
}
const FACE_R = 0.1195, FACE_RX = FACE_R * 0.95, FACE_RY = FACE_R * 1.08, FACE_P = (72 * Math.PI) / 180;
const FACE_T0 = Math.acos(0.064 / FACE_RY), FACE_T1 = Math.acos(-0.112 / FACE_RY);
const faceTex = (k) => canvasTex(`face${k}`, 256, 256, (c, W, H) => {
  const F = FACES[k];
  const px = (x, y) => { const th = Math.acos(Math.max(-1, Math.min(1, y / FACE_RY))); return [((Math.asin(Math.max(-1, Math.min(1, x / (FACE_RX * Math.sin(th))))) + FACE_P) / (2 * FACE_P)) * W, ((th - FACE_T0) / (FACE_T1 - FACE_T0)) * H]; };
  const blob = (x, y, rx, ry, col, a = 1, rot = 0) => { const [u, v] = px(x, y), [u1] = px(x + rx, y), [, v1] = px(x, y - ry); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(u, v, Math.abs(u1 - u), Math.abs(v1 - v), rot, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; };
  const line = (pts, col, w, a = 1) => { c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = w; c.lineCap = c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](...px(x, y))); c.stroke(); c.globalAlpha = 1; };
  // soft shading: under the cap peak, beside the nose, under the lower lip
  const g = c.createLinearGradient(0, 0, 0, H * 0.16); g.addColorStop(0, 'rgba(70,40,25,.35)'); g.addColorStop(1, 'rgba(70,40,25,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H * 0.16);
  blob(0, -0.017, 0.022, 0.008, F.shade, 0.45);
  blob(0, -0.058, 0.016, 0.006, F.shade, 0.35);
  // stubble: a short chin beard and a light moustache, or a day's growth
  if (F.goatee) { blob(0, -0.08, 0.018, 0.016, F.beard, 0.34); blob(0, -0.064, 0.008, 0.006, F.beard, 0.3); line([[-0.021, -0.034], [-0.007, -0.03], [0.007, -0.03], [0.021, -0.034]], F.beard, 5, 0.6); }
  if (F.stubble) { blob(0, -0.075, 0.03, 0.024, F.beard, 0.1); blob(0, -0.035, 0.018, 0.004, F.beard, 0.18); }
  if (F.female) for (const s of [-1, 1]) blob(s * 0.048, -0.02, 0.016, 0.01, '#d9776a', 0.12); // a little colour on the cheeks
  // lips
  blob(0, -0.044, 0.02, 0.0045, F.lip);
  blob(0, -0.05, 0.016, 0.0055, F.lipLo);
  line([[-0.02, -0.045], [0, -0.0465], [0.02, -0.045]], '#5e2f25', 1.6, 0.9);
  // nostrils
  for (const s of [-1, 1]) blob(s * 0.009, -0.021, 0.0045, 0.003, '#4a2a1c', 0.8);
  for (const s of [-1, 1]) {
    // almond eyes: white, a large dark-brown iris, pupil, a catch-light, a heavy upper lid
    const ex = s * 0.039, ey = 0.026;
    blob(ex, ey, 0.019, 0.009, '#f6f1ea');
    blob(ex + s * -0.002, ey - 0.0005, 0.0088, 0.0088, F.iris);
    blob(ex + s * -0.002, ey - 0.0005, 0.0042, 0.0042, '#0b0806');
    blob(ex + s * -0.002 + 0.0035, ey + 0.0035, 0.002, 0.002, '#ffffff');
    line([[ex - s * 0.021, ey - 0.001], [ex - s * 0.009, ey + 0.0095], [ex + s * 0.009, ey + 0.009], [ex + s * 0.021, ey + 0.001]], F.lid, F.female ? 5 : 4);
    if (F.female) line([[ex + s * 0.019, ey + 0.002], [ex + s * 0.025, ey + 0.006]], F.lid, 2.4);
    line([[ex - s * 0.014, ey - 0.006], [ex + s * 0.014, ey - 0.005]], F.shade, 1.2, 0.6);
    // thick, nearly straight brows
    line(F.female ? [[s * 0.016, 0.046], [s * 0.036, 0.052], [s * 0.058, 0.046]] : [[s * 0.015, 0.045], [s * 0.035, 0.049], [s * 0.06, 0.045]], F.brow, F.browW ?? 8);
  }
}, [1, 1]);
// a polo shirt's woven chest stripes: a lattice band under the collar, then a gold line and a dark one
const poloTex = (base, gold, dark, lattice) => canvasTex(`polo${base}${gold}`, 128, 256, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  const y0 = h * 0.13, y1 = h * 0.21;
  c.strokeStyle = lattice; c.lineWidth = 1.4;
  for (let x = -h; x < w + h; x += 8) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (y1 - y0), y1); c.moveTo(x, y1); c.lineTo(x + (y1 - y0), y0); c.stroke(); }
  c.fillStyle = gold; c.fillRect(0, y0 - 2, w, 3); c.fillRect(0, y1 - 1, w, 3);
  c.fillStyle = dark; for (let x = 0; x < w; x += 4) c.fillRect(x, h * 0.27, 2, 1.5);
  c.fillStyle = gold; c.fillRect(0, h * 0.4, w, 3.5);
  c.fillStyle = dark; c.fillRect(0, h * 0.4 + 4, w, 1); c.fillRect(0, h * 0.52, w, 2.5);
  c.fillStyle = gold; c.fillRect(0, h * 0.52 + 3, w, 1);
}, [2, 1]);

// a sari's pallu: the body colour with a broad border down both long edges
const palluTex = (base, border, gold) => canvasTex(`pallu${base}${border}${gold}`, 64, 64, (c, w, h) => {
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (const x of [0, w - 9]) { c.fillStyle = border; c.fillRect(x, 0, 9, h); }
  c.fillStyle = gold; c.fillRect(10, 0, 2, h); c.fillRect(w - 12, 0, 2, h);
  c.fillStyle = 'rgba(255,255,255,.18)'; for (let y = 4; y < h; y += 8) for (let x = 16; x < w - 16; x += 8) c.fillRect(x + ((y / 8) % 2) * 4, y, 2, 2);
}, [1, 3]);
// A strip of cloth between two edge curves (each a few points), smooth and two-sided: a pallu over the shoulder.
function ribbon(edgeA, edgeB, n = 28) {
  const ca = new THREE.CatmullRomCurve3(edgeA.map((p) => new THREE.Vector3(...p))), cb = new THREE.CatmullRomCurve3(edgeB.map((p) => new THREE.Vector3(...p)));
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = ca.getPoint(t), b = cb.getPoint(t);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(0, t, 1, t);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}

// ---- the figure ----
export function buildFarmer(look) {
  const b = look.build ?? 1;
  const root = new THREE.Group();
  const body = group(root); body.scale.setScalar(b);
  const skin = mat(look.skin, { rough: 0.6, sheen: 0.3, sheenRough: 0.55, sheenColor: '#ffe2cf' });
  const female = isFemale(look);
  const hips = group(body, [0, 0.92, 0]);
  const torso = group(hips, [0, 0.02, 0]);
  const P = { root, body, hips, torso, look };
  const lower = look.lower;
  const skirted = lower === 'ghagra' || lower === 'kira' || lower === 'longyi' || lower === 'sari';
  const kneeSkirt = lower === 'lungi' || lower === 'dhoti';
  const longTop = look.top === 'kurta' || look.top === 'kameez';

  // legs: cloth for trousers (wide for the shalwar), skin under a skirt
  const legM = lower === 'pyjama' || lower === 'shalwar' || lower === 'cargo' ? cloth(look.lowA, { rough: 0.95 }) : skin;
  const wide = lower === 'shalwar' ? 1.5 : lower === 'pyjama' ? 1.2 : lower === 'cargo' ? 1.15 : 1;
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = group(hips, [side * 0.092, 0, 0]);
    if (!skirted) mesh(limb(0.076 * wide, 0.056 * wide, 0.44, 1.04), legM, thigh); // a long skirt hides the thigh
    const knee = group(thigh, [0, -0.44, 0]);
    mesh(limb(0.058 * wide, lower === 'shalwar' ? 0.048 : wide > 1 ? 0.046 * wide : 0.036, 0.42, wide > 1 ? 1.02 : 1.12), legM, knee);
    if (lower === 'shalwar') mesh(geo.cyl(0.05, 0.05, 0.05), mat(look.lowB), knee, [0, -0.4, 0]); // gathered cuff
    if (lower === 'cargo') {
      // flapped pockets on the outside of each thigh, and a hem at the ankle
      mesh(geo.box(0.035, 0.13, 0.1), mat(look.lowA), thigh, [side * 0.08, -0.29, 0.005]);
      mesh(geo.box(0.04, 0.035, 0.108), mat(look.lowB), thigh, [side * 0.082, -0.225, 0.005]);
      mesh(geo.cyl(0.06, 0.06, 0.03), mat(look.lowB), knee, [0, -0.4, 0]);
    }
    const foot = group(knee, [0, -0.44, 0.03]);
    const fm = mat(look.feetA);
    if (look.feet === 'jutti') {
      mesh(geo.box(0.1, 0.07, 0.22), fm, foot, [0, 0.0, 0.03]);
      mesh(geo.cyl(0.0, 0.045, 0.1, 6), fm, foot, [0, 0.01, 0.17], [Math.PI / 2, 0, 0]);
      mesh(geo.box(0.08, 0.012, 0.12), mat('#d9a83a', { metal: 0.5, rough: 0.4 }), foot, [0, 0.038, 0.07]);
    } else if (look.feet === 'shoe') {
      mesh(geo.box(0.1, 0.075, 0.23), fm, foot, [0, 0.0, 0.03]);
    } else if (look.feet === 'sneaker') {
      mesh(geo.box(0.1, 0.075, 0.23), fm, foot, [0, 0.005, 0.03]);
      mesh(geo.box(0.108, 0.03, 0.245), mat('#f4f2ec'), foot, [0, -0.035, 0.035]);
      for (const s of [-1, 1]) mesh(geo.box(0.004, 0.025, 0.1), mat(look.feetB ?? '#7b4a2e'), foot, [s * 0.051, 0.01, 0.03], [0, 0, 0]);
    } else {
      mesh(geo.box(0.085, 0.05, 0.2), skin, foot, [0, 0.01, 0.03]);
      mesh(geo.box(0.1, 0.02, 0.23), fm, foot, [0, -0.03, 0.03]);
      mesh(geo.box(0.09, 0.012, 0.03), fm, foot, [0, 0.04, 0.06]);
    }
    legs.push({ thigh, knee, foot });
  }
  P.legs = legs;
  if (lower === 'cargo') mesh(geo.cyl(0.162, 0.16, 0.16, 16), mat(look.lowA, { rough: 0.95 }), hips, [0, -0.05, 0], [0, 0, 0], [1, 1, 0.85]);
  P.skirt = skirted ? 0.45 : longTop || kneeSkirt ? 0.75 : 1;

  // skirts and the hems of long shirts
  if (lower === 'ghagra') {
    mesh(geo.cyl(0.17, 0.3, 0.86, 18), cloth('#fff', { map: bandTex(look.lowA, look.bands, false) }), hips, [0, -0.42, 0]);
  } else if (lower === 'kira') {
    mesh(geo.cyl(0.18, 0.24, 0.88, 18), cloth('#fff', { map: bandTex(look.lowA, look.bands, true) }), hips, [0, -0.42, 0]);
  } else if (lower === 'lungi') {
    // folded up to the knee for field work, with the tuck at the waist
    mesh(geo.cyl(0.17, 0.235, 0.52, 16), cloth('#fff', { map: check(look.lowA, look.lowB) }), hips, [0, -0.25, 0]);
    mesh(geo.cyl(0.175, 0.175, 0.07, 16), cloth(look.lowA), hips, [0, 0.0, 0]);
    mesh(geo.box(0.08, 0.1, 0.04), cloth(look.lowA), hips, [0.03, -0.02, 0.17]);
  } else if (lower === 'dhoti') {
    mesh(geo.cyl(0.17, 0.24, 0.6, 16), cloth(look.lowA), hips, [0, -0.29, 0]);
    mesh(geo.box(0.07, 0.56, 0.03), cloth(look.lowB), hips, [0, -0.28, 0.2], [0.1, 0, 0]); // the front pleats
  } else if (lower === 'sari') {
    mesh(geo.cyl(0.17, 0.27, 0.9, 18), cloth('#fff', { map: bandTex(look.lowA, [look.lowB, look.gold ?? '#e2b84a'], false) }), hips, [0, -0.43, 0]);
    // the front pleats, lying on the skirt's flare
    const pl = cloth(look.lowA, { rough: 0.7 });
    for (let k = -2; k <= 1; k++) mesh(geo.box(0.032, 0.8, 0.012), pl, hips, [k * 0.03 + 0.015, -0.45, 0.226 + (k % 2) * 0.004], [-0.11, 0, 0]);
    mesh(geo.box(0.14, 0.018, 0.012), cloth('#fff', { map: bandTex(look.lowA, [look.lowB, look.gold ?? '#e2b84a'], false) }), hips, [0, -0.84, 0.266], [-0.11, 0, 0]);
  } else if (lower === 'longyi') {
    mesh(geo.cyl(0.175, 0.22, 0.86, 16), cloth('#fff', { map: check(look.lowA, look.lowB, 8, [4, 3]) }), hips, [0, -0.42, 0]);
    mesh(geo.sphere(0.05, 10, 8), cloth(look.lowA), hips, [0.0, -0.02, 0.18], [0, 0, 0], [1, 1.2, 0.8]); // the paso knot
  }
  const topM = look.top === 'polo' ? cloth('#fff', { map: poloTex(look.topA, look.topB, look.topC, look.topD) }) : look.top === 'sweater' ? cloth('#fff', { map: canvasTex(`knit${look.topA}`, 32, 32, (c, w, h) => { c.fillStyle = look.topA; c.fillRect(0, 0, w, h); c.strokeStyle = look.topB; c.lineWidth = 2; for (let x = 0; x < w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }, [6, 3]) }) : look.top === 'shirt' ? cloth('#fff', { map: check(look.topA, look.topB, 10, [3, 2]) }) : cloth(look.topA);
  if (longTop) mesh(geo.cyl(0.2, 0.26, 0.5, 16), topM, hips, [0, -0.24, 0], [0, 0, 0], [1, 1, 0.86]);

  // upper body
  mesh(torsoShape(female), topM, torso, [0, 0, 0], [0, 0, 0], [1, 1, 0.78]);
  const fz = frontOf(female);
  const plainTop = look.top === 'polo' ? cloth(look.topA) : topM;
  if (look.top === 'kurta' || look.top === 'kameez' || look.top === 'eingyi') {
    mesh(geo.box(0.02, 0.16, 0.01), mat(look.topB), torso, [0, 0.45, fz(0.45) + 0.004]);
    for (let k = 0; k < 3; k++) mesh(geo.sphere(0.009, 6, 4), mat('#cfc6b4'), torso, [0.012, 0.5 - k * 0.045, fz(0.5 - k * 0.045, 0.012) + 0.008]);
  }
  if (look.top === 'fotua' || look.top === 'shirt') {
    if (look.top === 'fotua') mesh(geo.cyl(0.19, 0.215, 0.18, 14), topM, torso, [0, -0.04, 0], [0, 0, 0], [1, 1, 0.82]);
    mesh(geo.box(0.02, 0.16, 0.01), mat(look.topB), torso, [0, 0.45, fz(0.45) + 0.004]);
    if (look.top === 'shirt') for (const sd of [-1, 1]) mesh(geo.box(0.09, 0.03, 0.05), topM, torso, [sd * 0.05, 0.54, fz(0.54, 0.05) + 0.012], [0.4, 0, sd * 0.5]);
  }
  if (look.top === 'polo') {
    // worn loose over the trousers: the hem, a ribbed collar, a two-button placket and a small badge on the chest
    mesh(geo.cyl(0.175, 0.2, 0.2, 14), plainTop, torso, [0, -0.06, 0], [0, 0, 0], [1, 1, 0.84]);
    mesh(geo.torus(0.078, 0.022, 8, 18), plainTop, torso, [0, 0.565, 0.005], [Math.PI / 2 + 0.15, 0, 0]);
    for (const sd of [-1, 1]) mesh(geo.box(0.055, 0.01, 0.05), plainTop, torso, [sd * 0.035, 0.545, fz(0.545, 0.035) + 0.012], [1.05, 0, sd * 0.55]);
    mesh(geo.box(0.036, 0.12, 0.008), mat(look.topA, { rough: 0.7 }), torso, [0, 0.47, fz(0.47) + 0.004]);
    for (let k = 0; k < 2; k++) mesh(geo.sphere(0.008, 6, 4), mat('#f5efe6'), torso, [0, 0.505 - k * 0.05, fz(0.505 - k * 0.05) + 0.008]);
    mesh(geo.cyl(0.018, 0.018, 0.004, 12), mat('#f3efe8'), torso, [0.09, 0.38, fz(0.38, 0.09) + 0.002], [Math.PI / 2, 0, 0.45]);
  }
  if (look.sari) {
    // the pallu: from the right hip across the chest, over the left shoulder, and down the back
    const pm = mat('#fff', { map: palluTex(look.lowA, look.lowB, look.gold ?? '#e2b84a'), side: THREE.DoubleSide, rough: 0.75 });
    mesh(ribbon(
      [[0.05, -0.02, fz(-0.02, 0.05) + 0.016], [-0.04, 0.2, fz(0.2, 0.04) + 0.016], [-0.15, 0.45, fz(0.45, 0.15) + 0.03], [-0.19, 0.59, 0.0], [-0.19, 0.42, -0.165], [-0.17, 0.0, -0.19], [-0.15, -0.42, -0.245]],
      [[0.15, 0.04, fz(0.04, 0.15) + 0.03], [0.09, 0.3, fz(0.3, 0.09) + 0.016], [-0.02, 0.53, fz(0.53, 0.02) + 0.02], [-0.05, 0.62, 0.0], [-0.02, 0.44, -0.17], [0.03, 0.0, -0.2], [0.06, -0.42, -0.25]],
    ), pm, torso);
  }
  if (look.chador) {
    const cm = mat(look.chador, { rough: 1 });
    mesh(geo.cyl(0.26, 0.29, 0.5, 16, true), mat(look.chador, { rough: 1, side: THREE.DoubleSide }), torso, [0, 0.3, 0], [0, 0, 0], [1, 1, 0.85]);
    mesh(geo.sphere(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cm, torso, [0, 0.5, 0], [0, 0, 0], [1, 0.5, 0.85]);
  }
  if (look.muffler) {
    const mm = mat(look.muffler, { rough: 1 });
    mesh(geo.torus(0.088, 0.034, 8, 16), mm, torso, [0, 0.57, 0], [Math.PI / 2, 0, 0]);
    mesh(geo.box(0.07, 0.3, 0.03), mm, torso, [0.06, 0.38, fz(0.38, 0.06) + 0.018], [0.06, 0, -0.06]);
  }
  if (look.scarf) {
    const sm = mat('#fff', { map: check(look.scarf, '#f3eee4', 6) });
    mesh(geo.torus(0.085, 0.03, 8, 16), sm, torso, [0, 0.57, 0], [Math.PI / 2, 0, 0]);
    mesh(geo.box(0.06, 0.24, 0.02), sm, torso, [-0.06, 0.38, fz(0.38, 0.06) + 0.014], [0.08, 0, 0.08]);
  }
  if (look.top === 'choli') mesh(geo.cyl(0.152, 0.163, 0.1, 18), skin, torso, [0, 0.05, 0], [0, 0, 0], [1, 1, 0.78]); // bare midriff
  if (look.top === 'tego') {
    // the kira is worn up to the chest; the tego jacket crosses over it, with white wonju showing at the neck
    for (const s of [-1, 1]) mesh(geo.box(0.032, 0.17, 0.01), mat(look.topB), torso, [s * 0.04, 0.48, fz(0.48, 0.04) + 0.005], [0, 0, s * 0.45]);
    mesh(geo.box(0.04, 0.42, 0.01), mat(look.topB), torso, [0.05, 0.3, fz(0.3, 0.05) + 0.006], [0, 0, -0.18]);
    for (const s of [-1, 1]) mesh(geo.sphere(0.022, 8, 6), mat(look.silver, { metal: 0.8, rough: 0.25 }), torso, [s * 0.12, 0.47, fz(0.47, 0.12) + 0.01]);
  }
  if (look.ajrak) {
    const am = mat('#fff', { map: ajrakTex(), side: THREE.DoubleSide });
    mesh(geo.box(0.17, 0.66, 0.02), am, torso, [-0.1, 0.22, fz(0.3, 0.1) + 0.014], [0.05, 0, -0.08]);
    mesh(geo.box(0.17, 0.72, 0.02), am, torso, [-0.1, 0.2, -0.16], [-0.05, 0, -0.08]);
    mesh(geo.box(0.16, 0.05, 0.34), am, torso, [-0.16, 0.52, 0], [0, 0, 0.35]);
  }

  // head
  const neck = group(torso, [0, 0.55, 0]);
  mesh(geo.cyl(0.047, 0.056, 0.12, 14), skin, neck, [0, 0.045, 0]);
  const head = group(neck, [0, 0.18, 0]); head.scale.setScalar(0.94);
  P.neck = neck; P.head = head;
  mesh(geo.sphere(0.118, 18, 14), skin, head, [0, 0, 0], [0, 0, 0], [0.95, 1.08, 1]);
  mesh(geo.sphere(0.02, 6, 4), skin, head, [-0.115, 0, 0]); mesh(geo.sphere(0.02, 6, 4), skin, head, [0.115, 0, 0]);
  // the nose (bridge and tip), the jaw, and the painted face over them
  mesh(geo.sphere(0.017, 10, 8), skin, head, [0, -0.012, 0.112], [0.3, 0, 0], [1.05, 1.15, 1]);
  mesh(geo.box(0.014, 0.034, 0.014), skin, head, [0, 0.008, 0.113], [-0.25, 0, 0]);
  mesh(geo.sphere(0.086, 16, 10), skin, head, [0, -0.052, 0.02], [0, 0, 0], [female ? 0.92 : 1.02, 0.72, 0.95]);
  const faceKey = faceFor(look);
  {
    const ft = faceTex(faceKey); ft.wrapS = ft.wrapT = THREE.ClampToEdgeWrapping;
    const fm = new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    const f = mesh(new THREE.SphereGeometry(FACE_R, 32, 24, Math.PI / 2 - FACE_P, FACE_P * 2, FACE_T0, FACE_T1 - FACE_T0), fm, head, [0, 0, 0], [0, 0, 0], [0.95, 1.08, 1]);
    f.castShadow = false;
  }
  const eyeM = mat('#16100c', { rough: 0.3 });
  const browM = mat(look.beard ?? look.moustache ?? (look.head === 'gaungbaung' ? '#3a3330' : look.hair));
  for (const s of []) {
    mesh(geo.sphere(0.016, 8, 6), mat('#f4efe6'), head, [s * 0.042, 0.022, 0.104], [0, 0, 0], [1, 0.8, 0.5]);
    mesh(geo.sphere(0.0105, 8, 6), eyeM, head, [s * 0.042, 0.022, 0.112]);
    mesh(geo.box(0.04, 0.008, 0.01), browM, head, [s * 0.043, 0.052, 0.108], [0, 0, s * -0.12]);
  }
  if (look.beard) {
    // a full beard that follows the jaw from the cheeks round the chin, and a moustache curving over the lip
    const bm = mat(look.beard, { rough: 1, sheen: 0.4, sheenRough: 0.9, side: THREE.DoubleSide });
    mesh(new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.5), bm, head, [0, -0.012, 0.012], [0, 0, 0], [0.98, 1.12, 1.04]);
    mesh(geo.sphere(0.05, 14, 10), bm, head, [0, -0.115, 0.06], [0.3, 0, 0], [1.25, 1, 0.9]);
    mesh(geo.torus(0.026, 0.009, 6, 14, Math.PI), bm, head, [0, -0.04, 0.113], [0, 0, Math.PI]);
  }
  if (look.moustache) mesh(geo.box(0.085, 0.022, 0.025), mat(look.moustache), head, [0, -0.034, 0.113], [0, 0, 0], [1, 1, 1]);
  if (look.silver) mesh(geo.sphere(0.006, 6, 4), mat(look.silver, { rough: 0.2, metal: 0.8 }), head, [0.017, -0.02, 0.127]);

  // headwear
  const hA = look.headA, hB = look.headB;
  if (look.head === 'turban') {
    const tm = mat('#fff', { map: turbanTex(hA, hB) });
    mesh(geo.sphere(0.135, 18, 12), tm, head, [0, 0.07, -0.012], [0, 0, 0], [1.08, 0.82, 1.12]);
    for (let k = 0; k < 3; k++) mesh(geo.torus(0.122 - k * 0.012, 0.022, 6, 18), tm, head, [0, 0.05 + k * 0.035, 0.005], [Math.PI / 2 - 0.35 + k * 0.08, 0, 0]);
    mesh(geo.box(0.05, 0.08, 0.03), tm, head, [0, 0.12, 0.12], [0.5, 0, 0]);
  } else if (look.head === 'sindhi') {
    // a round cap, open in an arch over the forehead, covered in mirror work
    mesh(geo.cyl(0.126, 0.124, 0.1, 22, false, Math.PI * 0.18, Math.PI * 1.64), mat('#fff', { map: topiTex(hA, hB), side: THREE.DoubleSide }), head, [0, 0.085, 0], [0, Math.PI, 0]);
    mesh(geo.cyl(0.126, 0.126, 0.01, 22), mat(hA), head, [0, 0.135, 0]);
    mesh(geo.sphere(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(look.hair), head, [0, 0.02, -0.004]);
  } else if (look.head === 'orhni') {
    mesh(geo.sphere(0.07, 10, 8), mat(look.hair), head, [0, -0.02, -0.12]);
    const om = mat('#fff', { map: bandTex(hA, [hB, '#f3efe6'], false), side: THREE.DoubleSide });
    mesh(new THREE.SphereGeometry(0.142, 18, 12, Math.PI * 0.1, Math.PI * 1.8, 0, Math.PI * 0.62), om, head, [0, 0.0, -0.004], [0, Math.PI, 0]);
    mesh(geo.box(0.2, 0.6, 0.02), om, torso, [0, 0.3, -0.16], [-0.06, 0, 0]);
    mesh(geo.box(0.12, 0.38, 0.02), om, torso, [0.12, 0.36, 0.16], [0.08, 0, 0.35]);
  } else if (look.head === 'short') {
    mesh(geo.sphere(0.126, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(look.hair), head, [0, 0.01, -0.006]);
    mesh(geo.box(0.22, 0.1, 0.14), mat(look.hair), head, [0, -0.03, -0.06]);
  } else if (look.head === 'gamcha') {
    mesh(geo.sphere(0.122, 16, 10), mat(look.hair), head, [0, 0.01, -0.01]);
    const gm = mat('#fff', { map: check(hA, hB, 6) });
    mesh(geo.torus(0.115, 0.04, 8, 18), gm, head, [0, 0.07, -0.005], [Math.PI / 2 - 0.12, 0, 0]);
    mesh(geo.sphere(0.06, 10, 8), gm, head, [0.02, 0.1, -0.11]);
  } else if (look.head === 'tupi') {
    mesh(geo.sphere(0.122, 16, 10), mat(look.hair), head, [0, 0.0, -0.01]);
    mesh(geo.sphere(0.126, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), mat(hA), head, [0, 0.035, 0]);
  } else if (look.head === 'mathal') {
    // the mathal: a broad conical hat of palm leaf, the Bangladeshi farmer's sunshade
    mesh(geo.sphere(0.122, 16, 10), mat(look.hair), head, [0, 0.0, -0.01]);
    const mm = mat('#fff', { map: canvasTex('mathal', 64, 64, (c, w, h) => { c.fillStyle = '#d8b56a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8833e'; c.lineWidth = 1.5; for (let k = 0; k < w; k += 5) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, h); c.stroke(); } for (let k = 0; k < h; k += 12) { c.beginPath(); c.moveTo(0, k); c.lineTo(w, k); c.stroke(); } }, [6, 1]) });
    mesh(geo.cyl(0.0, 0.34, 0.16, 18), mm, head, [0, 0.14, 0]);
    mesh(geo.cyl(0.34, 0.34, 0.012, 18), mat('#a8833e'), head, [0, 0.06, 0]);
  } else if (look.head === 'monkeycap') {
    // the knitted monkey cap of a northern cold wave, open only at the face
    const km = mat(hA, { rough: 1 });
    mesh(new THREE.SphereGeometry(0.135, 18, 12, Math.PI * 0.7, Math.PI * 1.6, 0, Math.PI * 0.82), mat(hA, { rough: 1, side: THREE.DoubleSide }), head, [0, 0.005, -0.004], [0, Math.PI, 0]);
    mesh(geo.sphere(0.03, 8, 6), mat(hB), head, [0, 0.14, -0.01]);
    mesh(geo.cyl(0.08, 0.1, 0.1, 14), km, head, [0, -0.13, -0.01]);
  } else if (look.head === 'aanchal') {
    mesh(geo.sphere(0.075, 10, 8), mat(look.hair), head, [0, -0.02, -0.12]);
    mesh(new THREE.SphereGeometry(0.142, 18, 12, Math.PI * 0.1, Math.PI * 1.8, 0, Math.PI * 0.62), mat('#fff', { map: bandTex(hA, [hB], false), side: THREE.DoubleSide }), head, [0, 0.0, -0.004], [0, Math.PI, 0]);
  } else if (look.head === 'hijab') {
    // a hijab wraps the head and neck, open at the face, and falls over the shoulders
    const hm = mat(hA, { side: THREE.DoubleSide, rough: 0.9 });
    mesh(new THREE.SphereGeometry(0.142, 24, 16, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.9), hm, head, [0, 0.005, -0.006], [0, Math.PI, 0]);
    // the band framing the face, and the drape that falls from under the chin over the shoulders like a short cape
    mesh(geo.torus(0.128, 0.012, 6, 24, Math.PI * 1.1), mat(look.headB ?? '#' + new THREE.Color(hA).multiplyScalar(0.72).getHexString()), head, [0, 0.0, 0.035], [0, 0, -Math.PI * 0.05 + Math.PI * 1.5 - Math.PI * 0.55]);
    const cape = new THREE.LatheGeometry([[0.11, 0.1], [0.13, 0.03], [0.165, -0.02], [0.215, -0.055], [0.245, -0.1], [0.25, -0.16], [0.236, -0.24]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    mesh(cape, hm, neck, [0, 0, 0.01], [0.1, 0, 0], [1, 1, 0.8]);
    mesh(geo.torus(0.236, 0.007, 5, 32), mat('#' + new THREE.Color(hA).multiplyScalar(0.72).getHexString()), neck, [0, -0.24, 0.034], [Math.PI / 2 + 0.1, 0, 0], [1, 0.8, 1]);
  } else if (look.head === 'cap') {
    // a baseball cap, peak to the front, short hair showing at the sides and back
    // the hair is only round the back and above the ears, so it never covers the face
    mesh(geo.sphere(0.121, 16, 12, Math.PI / 2 + 1.25, Math.PI * 2 - 2.5, 0, Math.PI * 0.56), mat(look.hair), head, [0, 0.0, -0.006], [0, 0, 0], [0.97, 1.06, 1]);
    const cm = mat(hA, { rough: 0.9 });
    mesh(geo.sphere(0.13, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), cm, head, [0, 0.062, -0.006], [-0.08, 0, 0], [0.92, 0.72, 1.0]);
    mesh(geo.cyl(0.125, 0.125, 0.012, 20, false, -Math.PI / 2, Math.PI), cm, head, [0, 0.068, 0.0], [0.06, 0, 0], [0.92, 1, 1.4]);
    mesh(geo.cyl(0.123, 0.123, 0.004, 20, false, -Math.PI / 2, Math.PI), mat(look.headC ?? '#6e3a24'), head, [0, 0.0605, 0.0], [0.06, 0, 0], [0.9, 1, 1.38]);
    mesh(geo.sphere(0.013, 8, 6), cm, head, [0, 0.157, -0.014]);
    const lm = mat(hB, { rough: 0.6 });
    for (const sd of [-1, 1]) mesh(geo.box(0.028, 0.008, 0.004), lm, head, [sd * 0.011, 0.112, 0.113], [-0.6, 0, sd * -0.35]);
  } else if (look.head === 'bare') {
    mesh(geo.sphere(0.124, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(look.hair), head, [0, 0.01, -0.008]);
  } else if (look.head === 'gaungbaung') {
    mesh(geo.sphere(0.122, 16, 10), mat(look.hair), head, [0, 0.01, -0.01]);
    const gm = mat(hA);
    mesh(geo.torus(0.112, 0.042, 8, 18), gm, head, [0, 0.07, 0], [Math.PI / 2 - 0.1, 0, 0]);
    mesh(geo.sphere(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gm, head, [0, 0.08, 0], [0, 0, 0], [1, 0.6, 1]);
    mesh(geo.sphere(0.045, 8, 6), mat(hB), head, [-0.12, 0.1, 0.03]);
    mesh(geo.box(0.02, 0.09, 0.06), mat(hB), head, [-0.15, 0.12, 0.04], [0, 0, 0.5]);
  }
  if (look.silver && look.top === 'choli') {
    mesh(geo.torus(0.1, 0.012, 6, 18), mat(look.silver, { metal: 0.8, rough: 0.25 }), neck, [0, -0.04, 0.02], [Math.PI / 2 - 0.25, 0, 0]);
    mesh(geo.torus(0.12, 0.01, 6, 18), mat(look.silver, { metal: 0.8, rough: 0.25 }), neck, [0, -0.09, 0.03], [Math.PI / 2 - 0.35, 0, 0]);
  }

  // arms: full sleeves for kurta, kameez, tego and eingyi; short for the choli
  const arms = [];
  const sleeve = look.top === 'choli' || look.top === 'shirt' ? 'short' : look.top === 'genji' ? 'none' : 'long';
  for (const side of [-1, 1]) {
    const shoulder = group(torso, [side * (female ? 0.2 : 0.215), 0.47, 0]);
    const upperM = sleeve === 'none' ? skin : look.top === 'polo' ? cloth(look.topA) : topM;
    if (sleeve === 'short') { mesh(limb(0.05, 0.04, 0.28), skin, shoulder); mesh(limb(0.06, 0.054, 0.13, 1), upperM, shoulder); }
    else mesh(limb(sleeve === 'long' ? 0.058 : 0.053, sleeve === 'long' ? 0.048 : 0.04, 0.28), upperM, shoulder);
    const elbow = group(shoulder, [0, -0.28, 0]);
    const lowerM = sleeve === 'long' ? topM : skin;
    mesh(limb(sleeve === 'long' ? 0.048 : 0.041, sleeve === 'long' ? 0.042 : 0.031, 0.25, 1.1), lowerM, elbow);
    if (look.cuff) mesh(geo.cyl(0.052, 0.052, 0.07), mat(look.cuff), elbow, [0, -0.2, 0]);
    const hand = group(elbow, [0, -0.27, 0]);
    // palm, four slightly curled fingers and a thumb
    mesh(geo.sphere(0.04, 12, 8), skin, hand, [0, -0.03, 0.004], [0, 0, 0], [0.52, 1, 0.92]);
    for (let f = 0; f < 4; f++) mesh(capsule(0.0085, 0.04 - Math.abs(f - 1.5) * 0.006), skin, hand, [side * -0.004, -0.083 + Math.abs(f - 1.5) * 0.003, -0.022 + f * 0.0145], [0, 0, side * 0.28]);
    mesh(capsule(0.0095, 0.032), skin, hand, [side * -0.012, -0.045, 0.034], [0.7, 0, side * 0.35]);
    if (look.bangle) for (let k = 0; k < 3; k++) mesh(geo.torus(0.04, 0.007, 6, 14), mat(look.bangle, { rough: 0.25, metal: 0.6 }), elbow, [0, -0.22 - k * 0.015, 0], [Math.PI / 2, 0, 0]);
    if (look.kara && side === 1) mesh(geo.torus(0.042, 0.009, 6, 16), mat('#c9ced3', { rough: 0.2, metal: 0.9 }), elbow, [0, -0.23, 0], [Math.PI / 2, 0, 0]);
    arms.push({ shoulder, elbow, hand });
  }
  P.arms = arms;

  // tools, shown when needed
  const tools = {};
  const handR = arms[1].hand, handL = arms[0].hand;
  tools.can = group(handR, [0, -0.06, 0.04]);
  if (look.lower === 'ghagra' || look.lower === 'kira' || look.lower === 'sari') {
    mesh(geo.sphere(0.13, 14, 10), mat('#b8643c'), tools.can, [0, -0.12, 0.05]);
    mesh(geo.cyl(0.05, 0.07, 0.07, 12), mat('#a65731'), tools.can, [0, 0.0, 0.05]);
  } else {
    const cm = mat('#9aa3a8', { rough: 0.35, metal: 0.6 });
    mesh(geo.cyl(0.08, 0.09, 0.2, 12), cm, tools.can, [0, -0.12, 0.06]);
    mesh(geo.cyl(0.012, 0.018, 0.26, 6), cm, tools.can, [0, -0.08, 0.2], [-1.1, 0, 0]);
    mesh(geo.torus(0.06, 0.01, 6, 12, Math.PI), cm, tools.can, [0, 0.0, 0.06], [0, Math.PI / 2, 0]);
  }
  tools.sickle = group(handR, [0, -0.04, 0.02]);
  mesh(geo.cyl(0.016, 0.016, 0.12, 6), mat('#6b4a2b'), tools.sickle, [0, 0.0, 0]);
  mesh(geo.torus(0.1, 0.012, 4, 14, Math.PI * 1.15), mat('#9aa3a8', { rough: 0.3, metal: 0.8 }), tools.sickle, [0.0, -0.13, 0.08], [Math.PI / 2, 0, 0.4]);
  tools.spray = group(handR, [0, -0.04, 0.02]);
  mesh(geo.cyl(0.008, 0.008, 0.5, 5), mat('#d9d9d9'), tools.spray, [0, -0.05, 0.22], [-1.3, 0, 0]);
  tools.tank = group(torso, [0, 0.3, -0.2]);
  mesh(geo.box(0.26, 0.36, 0.13), mat('#e9c23a'), tools.tank, [0, 0, 0]);
  tools.phone = group(handL, [0.03, -0.05, 0.06]);
  mesh(geo.box(0.07, 0.13, 0.012), mat('#111'), tools.phone, [0, 0, 0], [-0.4, 0, 0]);
  mesh(geo.box(0.06, 0.115, 0.002), mat('#57c46a', { emissive: '#3aa857' }), tools.phone, [0, 0.0, 0.007], [-0.4, 0, 0]);
  tools.sack = group(torso, [0, 0.35, -0.22]);
  mesh(geo.sphere(0.2, 10, 8), mat('#d9c08a', { flat: true }), tools.sack, [0, 0, 0], [0, 0, 0], [1, 1.1, 0.7]);
  for (const t of Object.values(tools)) t.visible = false;
  P.tools = tools;
  P.phase = 0;
  return P;
}

const lerp = (a, b, t) => a + (b - a) * t;

// Pose for this frame. st: { speed, run, act: {type,p,dur} | null, down, t, carrying }
export function animate(P, st, dt) {
  const { hips, torso, head, legs, arms, tools } = P;
  const speed = st.speed ?? 0;
  const a = Math.min(1, speed / 3.2);
  P.phase += dt * (2.4 + speed * 1.55);
  const ph = P.phase, s = Math.sin(ph);
  const sk = P.skirt;
  let hipY = 0.92 + Math.abs(Math.cos(ph)) * 0.045 * a;
  let lean = st.run ? 0.22 * a : 0.05 * a;
  const L = [s * 0.62 * a * sk, -s * 0.62 * a * sk];
  const K = [Math.max(0, -Math.cos(ph)) * a * (0.5 + sk * 0.5), Math.max(0, Math.cos(ph)) * a * (0.5 + sk * 0.5)];
  const A = [-s * 0.55 * a, s * 0.55 * a];
  const E = [-(0.2 + (st.run ? 0.9 : 0.25) * a), -(0.2 + (st.run ? 0.9 : 0.25) * a)];
  let az = [0.08, -0.08];
  let headX = 0, headY = 0, bodyY = 0;
  for (const t of Object.values(tools)) t.visible = false;
  if (st.carrying) tools.sack.visible = true;
  if (a < 0.05 && !st.act) {
    torso.scale.y = 1 + Math.sin(st.t * 2.2) * 0.012;
    headY = Math.sin(st.t * 0.35) * 0.35 * Math.max(0, Math.sin(st.t * 0.21));
  } else torso.scale.y = 1;
  const act = st.act;
  if (act) {
    const p = act.p / act.dur, e = Math.sin(Math.min(1, p) * Math.PI);
    switch (act.type) {
      case 'plant': case 'clear':
        lean = 0.95 * e; hipY -= 0.12 * e; K[0] = K[1] = 0.55 * e; L[0] = L[1] = -0.45 * e;
        A[1] = -1.1 * e; E[1] = -0.25; A[0] = -0.6 * e; break;
      case 'harvest':
        lean = 0.9 * e; hipY -= 0.14 * e; K[0] = K[1] = 0.6 * e; L[0] = L[1] = -0.5 * e;
        tools.sickle.visible = true; A[1] = -1.0 * e; az[1] = -0.2 + Math.sin(p * Math.PI * 4) * 0.6 * e; E[1] = -0.5; A[0] = -0.9 * e; break;
      case 'water':
        tools.can.visible = true; A[1] = -1.15 * e; E[1] = -0.2; lean = 0.25 * e; headX = 0.35 * e;
        tools.can.rotation.x = 0.9 * e; break;
      case 'spray':
        tools.spray.visible = true; tools.tank.visible = true; A[1] = -0.9; E[1] = -0.3; az[1] = Math.sin(p * Math.PI * 5) * 0.4; lean = 0.25 * e; headX = 0.3 * e; break;
      case 'pump':
        tools.can.visible = true; A[1] = -1.5 + Math.sin(p * Math.PI * 8) * 0.45; E[1] = -0.5; A[0] = -0.4; lean = 0.2 * e; break;
      case 'sell':
        A[0] = A[1] = -1.0 * e; E[0] = E[1] = -0.5 * e; lean = 0.3 * e; tools.sack.visible = p < 0.5; break;
      case 'wipe':
        A[1] = -2.5 * e; az[1] = 0.25; E[1] = -1.9 * e; headX = -0.25 * e; break;
      case 'adjust':
        A[0] = -2.6 * e; az[0] = -0.35; E[0] = -1.5 * e; headY = 0.2 * e; break;
      case 'phone':
        tools.phone.visible = true; A[0] = -0.95 * Math.min(1, p * 4, (1 - p) * 4); E[0] = -1.2; A[1] = -0.5 * e; E[1] = -1.0 * e; headX = 0.42 * e; break;
      case 'cheer': {
        const w = Math.sin(st.t * 7);
        A[0] = -2.8 + w * 0.2; A[1] = -2.8 - w * 0.2; E[0] = E[1] = -0.2; az = [0.35, -0.35]; bodyY = Math.abs(Math.sin(st.t * 5)) * 0.16; headX = -0.2; break;
      }
      default:
    }
  }
  if (st.down > 0) { hipY = 0.3; L[0] = L[1] = -1.45; K[0] = K[1] = 1.5; lean = 0.25; A[1] = -2.4; E[1] = -1.8; A[0] = -0.5; headX = 0.35; }
  const k = Math.min(1, dt * 14);
  hips.position.y = lerp(hips.position.y, hipY, k);
  P.body.position.y = lerp(P.body.position.y, bodyY, k);
  torso.rotation.x = lerp(torso.rotation.x, lean, k);
  head.rotation.x = lerp(head.rotation.x, headX - lean * 0.5, k);
  head.rotation.y = lerp(head.rotation.y, headY, k * 0.5);
  // the walk: hips turn with the stepping leg and dip to the standing one, the shoulders turn against them; at rest
  // the weight shifts slowly from foot to foot
  const still = a < 0.05 && !act;
  hips.rotation.y = lerp(hips.rotation.y, act ? 0 : s * 0.11 * a, k);
  hips.rotation.z = lerp(hips.rotation.z, act ? 0 : still ? Math.sin(st.t * 0.5) * 0.025 : Math.cos(ph) * 0.045 * a, k);
  torso.rotation.y = lerp(torso.rotation.y, act ? 0 : -s * 0.2 * a, k);
  torso.rotation.z = lerp(torso.rotation.z, act ? 0 : -hips.rotation.z * 0.8, k);
  for (let i = 0; i < 2; i++) {
    legs[i].thigh.rotation.x = lerp(legs[i].thigh.rotation.x, -L[i], k);
    legs[i].knee.rotation.x = lerp(legs[i].knee.rotation.x, K[i], k);
    legs[i].foot.rotation.x = lerp(legs[i].foot.rotation.x, -K[i] * 0.3, k);
    arms[i].shoulder.rotation.x = lerp(arms[i].shoulder.rotation.x, A[i], k);
    arms[i].shoulder.rotation.z = lerp(arms[i].shoulder.rotation.z, az[i], k);
    arms[i].elbow.rotation.x = lerp(arms[i].elbow.rotation.x, E[i], k);
  }
  if (!act || act.type !== 'water') tools.can.rotation.x = 0;
}
