// The 3D stage: renderer, third-person camera, input (keys, mouse drag, touch joystick and look), the opening drop
// from satellite height, the game loop that steps the simulation, particles, and the HTML overlay that follows the
// 3D world (station names, speech bubble, floating numbers, the quest marker's distance tag), and the village's
// neighbours and signboards (life.js). It also draws the
// minimap and turns the compass. React owns the HUD and talks to the stage through the object returned here.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createWorld } from './world';
import { createField } from './field';
import { buildFarmer, animate } from './people';
import { createLife } from './life';
import { update as step, act as simAct, target, plotAt, dayPhase, ripeAt, STATIONS } from '../sim';
import { QUESTS, FIELD_W, FIELD_D } from '../regions';

const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
// Asked once before any renderer is made: when WebGL is off, three.js fills the console with errors on its way to
// failing, so fail quietly here instead (the page shows its own message).
let glOK;
const needWebGL = () => {
  glOK ??= (() => { try { const c = document.createElement('canvas'); const x = c.getContext('webgl2') || c.getContext('webgl'); x?.getExtension('WEBGL_lose_context')?.loseContext(); return !!x; } catch { return false; } })();
  if (!glOK) throw new Error('WebGL is not available');
};

// The cinematic grade, after tone mapping: a little more colour, a gentle S-curve, warm light and cooler shadows,
// and a soft vignette.
const GRADE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.14);
      c = c + (c - 0.5) * 0.08 * (1.0 - abs(c - 0.5) * 2.0);
      c += mix(vec3(-0.012, 0.0, 0.025), vec3(0.03, 0.012, -0.02), smoothstep(0.2, 0.8, l));
      vec2 d = vUv - 0.5; c *= 1.0 - dot(d, d) * 0.55;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function createStage({ canvas, overlay, minimap, compass, g, lang, onEvent }) {
  needWebGL();
  const touch = isTouch();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
  // on computers: ambient occlusion (contact shadows where things meet), a soft glow on bright light, the grade
  let composer = null, gtao = null;
  if (!touch) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, 2, 2);
      gtao.blendIntensity = 0.85; gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1 });
      composer.addPass(gtao);
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(2, 2), 0.22, 0.45, 0.92));
      composer.addPass(new OutputPass());
      composer.addPass(new ShaderPass(GRADE));
    } catch { composer = null; }
  }
  const world = createWorld(scene, g);
  const field = createField(scene, g);
  const P = buildFarmer(g.F.look);
  P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(P.root);
  const L = g.L;

  // ---- particles: water, soil, sparks, coins ----
  const MAXP = 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
  const parts = [];
  const FXCOL = { water: '#8fd3f0', pump: '#8fd3f0', plant: '#6b4a2b', dust: '#a08060', harvest: '#ffe27a', spray: '#bfe8a0', coin: '#f2c94c' };
  function burst(kind, x, z) {
    const y = L.ground(x, z), n = kind === 'harvest' || kind === 'coin' ? 30 : 22, c = new THREE.Color(FXCOL[kind] ?? '#ffffff');
    for (let k = 0; k < n && parts.length < MAXP; k++) {
      const a = Math.random() * Math.PI * 2, s = Math.random();
      const up = kind === 'water' || kind === 'pump' ? -1 : 1;
      parts.push({ x: x + Math.cos(a) * s * 0.6, y: y + (up < 0 ? 1.1 : 0.3), z: z + Math.sin(a) * s * 0.6, vx: Math.cos(a) * (1 + s * 2), vy: up < 0 ? -1 - s : 2 + s * 3, vz: Math.sin(a) * (1 + s * 2), life: 0.8 + s * 0.5, c });
    }
  }

  // ---- overlay: names, bubble, floaters, marker tag ----
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; overlay.appendChild(d); return d; };
  const labels = STATIONS.concat('safe').map((id) => ({ id, d: el('g3-label') }));
  const bubble = el('g3-bubble'); bubble.style.display = 'none';
  const life = createLife(scene, g, overlay, lang);
  const tag = el('g3-tag'); tag.style.display = 'none';
  const floats = [];
  let bubbleT = 0;
  const T = (o) => (o ? o[lang] ?? o.bn : '');
  const setNames = () => { for (const l of labels) l.d.textContent = T(g.R.names[l.id]); };
  setNames();

  // ---- camera and input ----
  // over the shoulder: close, low, and a little to the side so the farmer stands left of centre
  const cam = { yaw: -2.4, pitch: 0.32, dist: 6.2, look: 0, sat: false, intro: 1, introT: 0, side: 0 };
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  let runHeld = false, runToggle = false;
  const onKey = (e, down) => {
    if (e.target.closest?.('input, textarea, select')) return;
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'].includes(k)) e.preventDefault();
    if (down) keys.add(k); else keys.delete(k);
    if (k === 'ShiftLeft' || k === 'ShiftRight') runHeld = down;
  };
  const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  const drags = new Map();
  const pd = (e) => { canvas.setPointerCapture?.(e.pointerId); drags.set(e.pointerId, [e.clientX, e.clientY]); cam.look = 1.5; };
  const pm = (e) => {
    const d = drags.get(e.pointerId); if (!d) return;
    if (drags.size === 2) { // pinch to zoom
      const [a, b] = [...drags.values()]; const before = Math.hypot(a[0] - b[0], a[1] - b[1]);
      drags.set(e.pointerId, [e.clientX, e.clientY]);
      const [c2, d2] = [...drags.values()]; const after = Math.hypot(c2[0] - d2[0], c2[1] - d2[1]);
      cam.dist = Math.min(14, Math.max(3.5, cam.dist * (before / Math.max(1, after))));
      return;
    }
    const s = touch ? 0.006 : 0.0045;
    cam.yaw -= (e.clientX - d[0]) * s; cam.pitch = Math.min(1.25, Math.max(0.08, cam.pitch + (e.clientY - d[1]) * s));
    drags.set(e.pointerId, [e.clientX, e.clientY]); cam.look = 1.5;
  };
  const pu = (e) => drags.delete(e.pointerId);
  const wheel = (e) => { e.preventDefault(); cam.dist = Math.min(14, Math.max(3.5, cam.dist * (1 + Math.sign(e.deltaY) * 0.1))); };
  canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { const pr = renderer.getPixelRatio(); composer.setPixelRatio(pr); composer.setSize(w, h); }
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  // ---- where the quest wants the farmer next ----
  let hint = null, hintT = 0;
  function goal() {
    if (hintT > 0 && hint) return hint;
    const q = QUESTS[g.quest];
    if (!q || g.won) return null;
    if (g.ev.zone && g.ev.zone.left > 0) return [g.ev.zone.x, g.ev.zone.z];
    const station = (id) => [g.S[id].x, g.S[id].z];
    const ripe = g.plots.find((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const pick = (fn) => { const p = g.plots.filter(fn).sort((a, b) => Math.hypot(a.x - g.me.x, a.z - g.me.z) - Math.hypot(b.x - g.me.x, b.z - g.me.z))[0]; return p ? [p.x, p.z] : null; };
    if (q.id === 'buy' || (!Object.values(g.seeds).some(Boolean) && !g.plots.some((p) => p.crop && !p.dead) && ['plant', 'water', 'harvest'].includes(q.id))) return station('shed');
    if (q.go === 'market' && Object.values(g.basket).some(Boolean) && (q.id === 'sell' || !ripe)) return station('market');
    if (g.can <= 0 && g.plots.some((p) => p.crop && !p.dead && p.moist < 0.5)) return station('water');
    if (g.plots.some((p) => p.pests)) return pick((p) => p.pests);
    if (q.id === 'plant') return pick((p) => !p.crop);
    if (ripe && ['harvest', 'sell', 'storm', 'profit'].includes(q.id)) return pick((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const thirsty = pick((p) => p.crop && !p.dead && p.moist < 0.35 && p.g < ripeAt(g));
    if (thirsty) return thirsty;
    if (q.id === 'plant' || q.id === 'heat' || q.id === 'pests' || q.id === 'storm' || q.id === 'profit') { const e = pick((p) => !p.crop); if (e && Object.values(g.seeds).some(Boolean)) return e; }
    if (!Object.values(g.seeds).some(Boolean) && g.plots.some((p) => !p.crop)) return station('shed');
    return null;
  }

  // ---- minimap: a static picture of the farm, with the farmer, the zone and the goal drawn over it ----
  const MAP_R = 46;
  let mapBg = null;
  function paintMap() {
    const c = minimap; if (!c) return;
    const S = c.width;
    const bg = document.createElement('canvas'); bg.width = bg.height = S; const x = bg.getContext('2d');
    const k = S / (MAP_R * 2), X = (v) => (v + MAP_R) * k;
    x.fillStyle = L.grass; x.fillRect(0, 0, S, S);
    if (L.patches) for (const [x0, x1, z0, z1, kind] of L.patches) { x.fillStyle = { wheat: '#7fa84a', stubble: '#c9b06a', mustard: '#e3c93a', paddy: '#a9b44a', bare: '#b39466', sunflower: '#d9b43a', sesame: '#9aa45a', groundnut: '#7c9a4a' }[kind]; x.fillRect(X(x0), X(z0), (x1 - x0) * k, (z1 - z0) * k); }
    x.strokeStyle = L.path; x.lineWidth = 2.4 * k; x.lineCap = 'round';
    for (const p of L.paths) { x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(X(a), X(b)) : x.moveTo(X(a), X(b)))); x.stroke(); }
    for (const w of L.water) { x.fillStyle = '#5f9fc0'; if (w.r) { x.beginPath(); x.arc(X(w.cx), X(w.cz), w.r * k, 0, Math.PI * 2); x.fill(); } else x.fillRect(X(Math.max(-MAP_R, w.x0)), X(Math.max(-MAP_R, w.z0)), (Math.min(MAP_R, w.x1) - Math.max(-MAP_R, w.x0)) * k, (Math.min(MAP_R, w.z1) - Math.max(-MAP_R, w.z0)) * k); }
    x.fillStyle = L.soil; x.fillRect(X(-FIELD_W / 2), X(-FIELD_D / 2), FIELD_W * k, FIELD_D * k);
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; for (const p of g.plots) x.strokeRect(X(p.x - 1.6), X(p.z - 1.6), 3.2 * k, 3.2 * k);
    for (const b of L.blockers) if (b.hw) { x.save(); x.translate(X(b.x), X(b.z)); x.rotate(-Math.atan2(b.s, b.c)); x.fillStyle = 'rgba(60,40,30,.55)'; x.fillRect(-b.hw * k, -b.hd * k, b.hw * 2 * k, b.hd * 2 * k); x.restore(); }
    else { x.fillStyle = 'rgba(30,70,30,.45)'; x.beginPath(); x.arc(X(b.x), X(b.z), Math.max(1.2, b.r * k), 0, Math.PI * 2); x.fill(); }
    const icon = { shed: '#f2c94c', water: '#5fb8f0', market: '#f08a4a', kiosk: '#7fd36b' };
    for (const id of STATIONS) { x.fillStyle = '#fff'; x.beginPath(); x.arc(X(g.S[id].x), X(g.S[id].z), 5.5, 0, Math.PI * 2); x.fill(); x.fillStyle = icon[id]; x.beginPath(); x.arc(X(g.S[id].x), X(g.S[id].z), 4, 0, Math.PI * 2); x.fill(); }
    mapBg = bg;
  }
  function drawMap(t, goalPos) {
    const c = minimap; if (!c || !mapBg) return;
    const x = c.getContext('2d'), S = c.width, k = S / (MAP_R * 2), X = (v) => (v + MAP_R) * k;
    x.clearRect(0, 0, S, S); x.drawImage(mapBg, 0, 0);
    // pest and ripe dots
    for (const p of g.plots) {
      if (p.pests) { x.fillStyle = '#e04a3a'; x.beginPath(); x.arc(X(p.x), X(p.z), 2.4, 0, Math.PI * 2); x.fill(); }
      else if (p.crop && !p.dead && p.g >= ripeAt(g)) { x.fillStyle = '#ffe27a'; x.beginPath(); x.arc(X(p.x), X(p.z), 2, 0, Math.PI * 2); x.fill(); }
    }
    const z = g.ev.zone;
    if (z) {
      x.save(); x.fillStyle = 'rgba(30,60,120,.32)'; x.beginPath(); x.rect(0, 0, S, S); x.arc(X(z.x), X(z.z), z.r * k, 0, Math.PI * 2, true); x.fill('evenodd');
      x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.setLineDash([5, 4]); x.beginPath(); x.arc(X(z.x), X(z.z), z.r * k, 0, Math.PI * 2); x.stroke(); x.restore();
      x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(X(g.me.x), X(g.me.z)); x.lineTo(X(z.x), X(z.z)); x.stroke();
    }
    x.fillStyle = '#f4efe2'; for (const [a, b] of life.dots()) { x.beginPath(); x.arc(X(a), X(b), 2.6, 0, Math.PI * 2); x.fill(); }
    if (goalPos) { const r = 5 + Math.sin(t * 5) * 1.5; x.strokeStyle = '#ffd24a'; x.lineWidth = 2.2; x.beginPath(); x.arc(X(goalPos[0]), X(goalPos[1]), r, 0, Math.PI * 2); x.stroke(); }
    // the farmer: an arrow pointing the way they face, and the camera's view cone
    x.save(); x.translate(X(g.me.x), X(g.me.z));
    const va = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
    x.fillStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 28, va - 0.5, va + 0.5); x.closePath(); x.fill();
    x.rotate(-g.me.yaw + Math.PI); x.fillStyle = '#ffffff'; x.strokeStyle = '#123d24'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(0, 2.5); x.lineTo(-5, 5); x.closePath(); x.fill(); x.stroke(); x.restore();
  }
  paintMap();

  // ---- the loop ----
  const tmpV = new THREE.Vector3(), focus = new THREE.Vector3(), camPos = new THREE.Vector3();
  let raf = 0, last = performance.now(), mapT = 0, paused = false, alive = true;
  const project = (x, y, z) => { tmpV.set(x, y, z).project(camera); return [(tmpV.x * 0.5 + 0.5) * canvas.clientWidth, (-tmpV.y * 0.5 + 0.5) * canvas.clientHeight, tmpV.z < 1]; };

  function inputVector() {
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) fz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) fz -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) fx += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) fx -= 1;
    fx += joy.x; fz += joy.y;
    const l = Math.hypot(fx, fz); if (l > 1) { fx /= l; fz /= l; }
    const s = Math.sin(cam.yaw), c = Math.cos(cam.yaw);
    // forward is from the camera towards the farmer; right is forward × up
    return { mx: -s * fz + c * fx, mz: -c * fz - s * fx, run: runHeld || runToggle || Math.hypot(joy.x, joy.y) > 0.95 };
  }

  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    const inp = inputVector();
    if (cam.intro > 0) { cam.introT += dt; if (cam.introT > 4.6) { cam.intro = 0; onEvent({ type: 'introDone' }); } }
    if (!paused && cam.intro === 0) {
      if (keys.has('Space') || keys.has('KeyE') || keys.has('KeyF')) { keys.delete('Space'); keys.delete('KeyE'); keys.delete('KeyF'); simAct(g); }
      step(g, dt, inp);
    }
    for (const e of g.out.splice(0)) {
      if (e.type === 'fx') burst(e.kind, e.x, e.z);
      else if (e.type === 'flash') world.flash();
      else if (e.type === 'say') { bubble.textContent = T(e.text); bubble.style.display = ''; bubble.classList.remove('g3-pop'); void bubble.offsetWidth; bubble.classList.add('g3-pop'); bubbleT = e.long ? 6.5 : 3.4; }
      else if (e.type === 'float') { const d = el(`g3-float g3-${e.tone}`); d.textContent = T(e.text); floats.push({ d, x: e.x, z: e.z, t: 0 }); }
      else if (e.type === 'hint') { const s = g.S[e.what]; if (s) { hint = [s.x, s.z]; hintT = 6; } onEvent(e); }
      else onEvent(e);
    }
    hintT -= dt;
    // the farmer
    const me = g.me, gy = L.ground(me.x, me.z) + (g.ev.flood > 0.3 && Math.abs(me.x) < FIELD_W / 2 + 4 && Math.abs(me.z) < FIELD_D / 2 + 4 ? -0.15 : 0);
    P.root.position.set(me.x, gy, me.z); P.root.rotation.y = me.yaw;
    animate(P, { speed: me.speed, run: me.run, act: me.act, down: me.down, t, carrying: Object.values(g.basket).reduce((a, b) => a + b, 0) > 0 }, dt);
    // camera: the drop from orbit, then over the shoulder
    focus.set(me.x, gy + 1.45, me.z);
    if (cam.look > 0) cam.look -= dt;
    else if (me.speed > 1 && !cam.sat) { let d = (me.yaw + Math.PI) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < 2.2) cam.yaw += d * Math.min(1, dt * 0.9); }
    const dist = cam.sat ? 46 : cam.dist, pitch = cam.sat ? 1.35 : cam.pitch;
    cam.side += ((cam.sat ? 0 : 0.55) - cam.side) * Math.min(1, dt * 3);
    const rx = Math.cos(cam.yaw) * cam.side, rz = -Math.sin(cam.yaw) * cam.side;
    focus.x += rx; focus.z += rz;
    camPos.set(focus.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, gy + 1.45 + Math.sin(pitch) * dist, focus.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist);
    if (cam.intro > 0) {
      const k = ease((cam.introT - 0.6) / 3.8);
      const top = tmpV.set(0, 170, 30);
      camera.position.copy(top).lerp(camPos, k);
      camera.up.set(0, 1, 0); camera.lookAt(focus.x * k, focus.y * k, focus.z * k);
    } else {
      camPos.y = Math.max(camPos.y, L.ground(camPos.x, camPos.z) + 0.6);
      camera.position.lerp(camPos, Math.min(1, dt * (cam.sat ? 4 : 10)));
      camera.lookAt(focus);
    }
    const goalPos = cam.intro ? null : goal();
    const onIt = goalPos && Math.hypot(goalPos[0] - me.x, goalPos[1] - me.z) < 1.8;
    world.marker(onIt ? null : goalPos);
    const { wind } = world.update(t, dt, dayPhase(g), g.ev, camera.position, focus);
    field.update(t, wind, g.ndvi || cam.sat, g.F.scanner);
    life.update(t, paused || cam.intro ? 0 : dt, project, camera.position);
    // particles
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.life <= 0 || p.y < -1) parts.splice(i, 1); }
    for (let i = 0; i < MAXP; i++) { const p = parts[i]; if (p) { pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z; pCol[i * 3] = p.c.r; pCol[i * 3 + 1] = p.c.g; pCol[i * 3 + 2] = p.c.b; } else pPos[i * 3 + 1] = -999; }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    // overlay
    for (const l of labels) {
      const s = g.S[l.id], d = Math.hypot(s.x - me.x, s.z - me.z);
      const show = !cam.intro && d < 16 && (l.id !== 'safe' || g.ev.zone);
      if (!show) { l.d.style.display = 'none'; continue; }
      const [x, y, vis] = project(s.x, L.ground(s.x, s.z) + (l.id === 'safe' ? 7 : 3.6), s.z);
      l.d.style.display = vis ? '' : 'none'; l.d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`; l.d.style.opacity = String(Math.min(1, (16 - d) / 5));
    }
    if (bubbleT > 0) {
      bubbleT -= dt; const [x, y, vis] = project(me.x, gy + 2.15, me.z);
      bubble.style.display = vis && !cam.intro ? '' : 'none'; bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      if (bubbleT <= 0) bubble.style.display = 'none';
    }
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt;
      const [x, y, vis] = project(f.x, L.ground(f.x, f.z) + 1.6 + f.t * 0.9, f.z);
      f.d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; f.d.style.opacity = String(Math.max(0, 1 - Math.max(0, f.t - 0.9) / 0.6)); f.d.style.display = vis ? '' : 'none';
      if (f.t > 1.5) { f.d.remove(); floats.splice(i, 1); }
    }
    if (goalPos && !onIt && !cam.sat) {
      const gyy = L.ground(goalPos[0], goalPos[1]) + 4.6;
      let [x, y, vis] = project(goalPos[0], gyy, goalPos[1]);
      const W = canvas.clientWidth, H = canvas.clientHeight, m = 36;
      if (!vis) { x = W - x; y = H - y; }
      const off = !vis || x < m || x > W - m || y < m || y > H - m;
      x = Math.min(W - m, Math.max(m, x)); y = Math.min(H - m, Math.max(m + 40, y));
      tag.style.display = ''; tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      tag.classList.toggle('g3-edge', off);
      const dm = Math.round(Math.hypot(goalPos[0] - me.x, goalPos[1] - me.z));
      tag.textContent = lang === 'bn' ? `${String(dm).replace(/\d/g, (n) => '০১২৩৪৫৬৭৮৯'[n])} মি` : `${dm} m`;
    } else tag.style.display = 'none';
    if (compass) compass.style.setProperty('--heading', String((((-cam.yaw * 180) / Math.PI) % 360 + 540) % 360 - 180));
    mapT -= dt; if (mapT <= 0) { mapT = 0.08; drawMap(t, goalPos); }
  }
  raf = requestAnimationFrame(frame);

  return {
    setJoy(x, y) { joy.x = x; joy.y = y; },
    setRun(on) { runToggle = on; },
    act() { if (cam.intro === 0) simAct(g); },
    toggleSat() { cam.sat = !cam.sat; g.ndvi = cam.sat; return cam.sat; },
    get sat() { return cam.sat; },
    skipIntro() { if (cam.intro) cam.introT = Math.max(cam.introT, 4.6); },
    setPaused(p) { paused = p; },
    setLang(l) { lang = l; setNames(); life.setLang(l); },
    target: () => target(g),
    onPlot: () => plotAt(g.me.x, g.me.z) !== null,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); life.dispose(); composer?.dispose(); gtao?.dispose?.();
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      overlay.replaceChildren();
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      renderer.dispose();
    },
  };
}

// Small renders of each farmer for the choosing screen, and a turning preview of the chosen one.
export function createPreview(canvas, look) {
  needWebGL();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight('#fff6e8', '#5a6a3a', 1.4));
  const key = new THREE.DirectionalLight('#fff1d6', 2.4); key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  // a tight shadow box round the figure, with bias, so cloth shows no shadow speckle
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 2.4, bottom: -0.4, near: 1, far: 12 }); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; scene.add(key);
  const rim = new THREE.DirectionalLight('#bfe0ff', 1.2); rim.position.set(-3, 2, -3); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.25 })); ground.receiveShadow = true; scene.add(ground);
  let P = null, raf = 0, alive = true, last = performance.now(), mode = 'idle', spin = 0.35;
  const set = (lk) => { if (P) scene.remove(P.root); P = buildFarmer(lk); P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(P.root); };
  set(look);
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (w && h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const loop = (now) => {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    spin += dt * 0.5; P.root.rotation.y = Math.sin(spin) * 0.7;
    const cycle = t % 7;
    animate(P, { speed: mode === 'walk' ? 2.2 : 0, act: mode === 'cheer' ? { type: 'cheer', p: 0, dur: 9 } : cycle > 4.5 ? { type: P.look.head === 'short' || P.look.head === 'cap' ? 'phone' : P.look.lower === 'ghagra' ? 'adjust' : 'wipe', p: cycle - 4.5, dur: 2.5 } : null, t }, dt);
    camera.position.set(0, 1.2, 4.6); camera.lookAt(0, 0.95, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);
  const renderOnce = () => { resize(); P.root.rotation.y = 0.35; for (let k = 0; k < 20; k++) animate(P, { speed: 0, act: null, t: 0 }, 0.05); camera.position.set(0, 1.2, 4.6); camera.lookAt(0, 0.95, 0); renderer.render(scene, camera); };
  return {
    set, renderOnce, mode(m) { mode = m; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); },
  };
}

// Still pictures of several farmers (for the cards), rendered once on one hidden canvas.
export function portraits(looks, size = 220) {
  needWebGL();
  const cv = document.createElement('canvas'); cv.width = size; cv.height = Math.round(size * 1.15);
  cv.style.cssText = `position:fixed;left:-9999px;width:${size}px;height:${Math.round(size * 1.15)}px`; document.body.appendChild(cv);
  const pv = createPreview(cv, looks[0]);
  const out = [];
  try {
    for (const lk of looks) { pv.set(lk); pv.renderOnce(); out.push(cv.toDataURL('image/png')); }
  } finally { pv.dispose(); cv.remove(); }
  return out;
}
