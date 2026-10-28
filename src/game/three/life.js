// The village around the farm (from places.js): neighbours in the clothes of the place going about their day —
// walking the paths, bent over their own plots, waiting at the market — who greet the farmer as they pass and hurry
// to the safe ground when the storm comes; and signboards on the shop, the market, the kiosk and the shelter,
// written in the local script.
import * as THREE from 'three';
import { buildFarmer, animate, canvasTex, mat } from './people';
import { resolve, inWater } from '../layout';
import { spot } from '../places';

const FONT = '"Hind Siliguri", "Noto Sans Bengali", "Noto Sans Gurmukhi", "Noto Naskh Arabic", "Noto Sans Devanagari", "Noto Sans Myanmar", system-ui, sans-serif';
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

function signTex(key, sign, rtl) {
  return canvasTex(key, 512, 160, (c, w, h) => {
    c.fillStyle = '#f6f1e3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1f5a34'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = sign.sub ? 56 : 64;
    const fit = () => { c.font = `700 ${size}px ${FONT}`; while (c.measureText(sign.t).width > w - 44 && size > 20) { size -= 2; c.font = `700 ${size}px ${FONT}`; } };
    c.direction = rtl ? 'rtl' : 'ltr'; fit();
    c.fillStyle = '#17321f'; c.fillText(sign.t, w / 2, sign.sub ? h * 0.42 : h / 2 + 3);
    if (sign.sub) { c.direction = 'ltr'; c.font = `600 26px system-ui, sans-serif`; c.fillStyle = '#56645a'; c.fillText(sign.sub, w / 2, h * 0.79); }
  });
}

// A board on two posts beside each station, turned to face the field, on whichever side keeps it off the path.
function signs(scene, g) {
  const H = g.home, L = g.L, out = [];
  const wood = mat('#6b4a2b'), back = mat('#e9e2cf');
  for (const id of ['shed', 'market', 'kiosk', 'safe']) {
    const sign = H.signs[id]; if (!sign) continue;
    const s = g.S[id], l = Math.hypot(s.x, s.z), dx = -s.x / l, dz = -s.z / l;
    const cand = [1, -1].map((side) => {
      const x = s.x + dx * (s.r + 0.9) + -dz * 2.1 * side, z = s.z + dz * (s.r + 0.9) + dx * 2.1 * side;
      let clear = 99; for (const p of L.paths) for (let k = 1; k < p.length; k++) clear = Math.min(clear, segDist(x, z, p[k - 1], p[k]));
      for (const b of L.blockers) clear = Math.min(clear, Math.hypot(x - b.x, z - b.z) - (b.r ?? Math.max(b.hw, b.hd)));
      return { x, z, clear: inWater(L, x, z) ? -99 : clear };
    }).sort((a, b) => b.clear - a.clear)[0];
    const grp = new THREE.Group(); grp.position.set(cand.x, L.ground(cand.x, cand.z), cand.z); grp.rotation.y = Math.atan2(dx, dz);
    for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.3, 6), wood); p.position.set(sx, 1.15, 0); p.castShadow = true; grp.add(p); }
    const face = mat('#fff', { map: signTex(`sign${g.id}${id}`, sign, H.signs.rtl) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 0.06), [wood, wood, wood, wood, face, back]);
    board.position.set(0, 1.95, 0.04); board.castShadow = true; grp.add(board);
    scene.add(grp); out.push(grp);
  }
  return out;
}

export function createLife(scene, g, overlay, lang = 'bn') {
  const H = g.home, L = g.L;
  if (!H) return { update() {}, dots: () => [], setLang() {}, dispose() {} };
  const boards = signs(scene, g);
  const T = (o) => (o ? o[lang] ?? o.bn : '');
  const el = (cls) => { const d = document.createElement('div'); d.className = cls; d.style.display = 'none'; overlay.appendChild(d); return d; };
  const folk = H.folk.map((f, i) => {
    const P = buildFarmer(f.look);
    P.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(P.root);
    const at = f.at && spot(g.S, f.at), route = f.route?.map((p) => spot(g.S, p));
    const [x, z] = at ?? route[0];
    return { f, at, route, P, x, z, yaw: Math.atan2(-x, -z), seg: 1, dir: 1, wait: 1 + i * 1.3, act: null, next: 1 + Math.random() * 3, cool: 3 + i * 2, hold: 0, away: false, speed: 0, run: false, label: el('g3-label g3-npc'), bubble: el('g3-bubble g3-npc'), bubT: 0 };
  });
  const setNames = () => { for (const n of folk) n.label.textContent = T(n.f.name); };
  setNames();
  const home = (n) => n.at ?? n.route[0];

  function walkTo(n, gx, gz, dt, fast) {
    const dx = gx - n.x, dz = gz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { n.speed = 0; return true; }
    const sp = Math.min(d / dt, fast ? 3.4 : 1.25);
    const want = Math.atan2(dx, dz); let dy = want - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); n.yaw += dy * Math.min(1, dt * 8);
    const nx = n.x + (dx / d) * sp * dt, nz = n.z + (dz / d) * sp * dt;
    if (!inWater(L, nx, nz)) [n.x, n.z] = resolve(L, nx, nz, 0.3);
    n.speed = sp; n.run = fast;
    return false;
  }

  // Bodies, not ghosts: the farmer and the villagers push each other apart (the villager gives way more), a run
  // into someone knocks the farmer back and staggers them, with a word and a thud, and villagers keep apart too.
  const BODY = 0.36;
  const OUCH = [{ bn: 'আস্তে, ভাই!', en: 'Easy there!' }, { bn: 'দেখে চলো!', en: 'Watch where you go!' }, { bn: 'উফ্‌, ধাক্কা!', en: 'Oof!' }];
  function bodies(dt) {
    const me = g.me;
    for (const n of folk) {
      n.stag = Math.max(0, (n.stag ?? 0) - dt); n.bumpT = Math.max(0, (n.bumpT ?? 0) - dt);
      const dx = n.x - me.x, dz = n.z - me.z, d = Math.hypot(dx, dz), m = BODY * 2;
      if (d >= m || d < 1e-4) continue;
      const push = m - d, ux = dx / d, uz = dz / d;
      const nx = n.x + ux * push * 0.75, nz = n.z + uz * push * 0.75;
      if (!inWater(L, nx, nz)) [n.x, n.z] = resolve(L, nx, nz, 0.3);
      [me.x, me.z] = resolve(L, me.x - ux * push * 0.25, me.z - uz * push * 0.25);
      const into = me.vx * ux + me.vz * uz; // speed straight at them
      if (into > 2.6 && n.bumpT <= 0 && !(me.down > 0)) {
        n.bumpT = 1.2; n.stag = 0.6; n.hold = 1.8; n.act = null; n.yaw = Math.atan2(-ux, -uz);
        // the farmer is thrown back a step and loses the run; the villager rocks back
        [me.x, me.z] = resolve(L, me.x - ux * 0.45, me.z - uz * 0.45); me.vx = me.vz = 0;
        [n.x, n.z] = resolve(L, n.x + ux * 0.25, n.z + uz * 0.25, 0.3);
        n.bubT = 2.4; n.bubble.textContent = T(OUCH[Math.floor(Math.random() * OUCH.length)]); n.bubble.style.display = ''; n.bubble.classList.remove('g3-pop'); void n.bubble.offsetWidth; n.bubble.classList.add('g3-pop');
        g.out.push({ type: 'sound', s: 'bump' });
      }
    }
    for (let i = 0; i < folk.length; i++) for (let j = i + 1; j < folk.length; j++) {
      const a = folk[i], b = folk[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = BODY * 2;
      if (d >= m || d < 1e-4) continue;
      const p = (m - d) / 2, ux = dx / d, uz = dz / d;
      [a.x, a.z] = resolve(L, a.x - ux * p, a.z - uz * p, 0.3); [b.x, b.z] = resolve(L, b.x + ux * p, b.z + uz * p, 0.3);
    }
  }

  function update(t, dt, project, camPos) {
    const me = g.me, storm = !!(g.ev.zone && (g.ev.zone.left > 0 || g.ev.storm > 0));
    if (dt > 0) bodies(dt);
    folk.forEach((n, i) => {
      n.cool -= dt; n.hold -= dt; n.speed = 0;
      const dMe = Math.hypot(me.x - n.x, me.z - n.z);
      if (storm) {
        // to the safe ground, each to their own spot inside the circle
        const z = g.ev.zone, a = i * 2.1 + 0.6;
        walkTo(n, z.x + Math.cos(a) * z.r * 0.45, z.z + Math.sin(a) * z.r * 0.45, dt, true);
        n.away = true; n.act = null;
      } else if (n.hold > 0) {
        let dy = Math.atan2(me.x - n.x, me.z - n.z) - n.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); n.yaw += dy * Math.min(1, dt * 6);
      } else if (n.away) {
        const [hx, hz] = home(n); if (walkTo(n, hx, hz, dt, false)) { n.away = false; n.seg = 1; n.dir = 1; }
      } else if (n.f.does === 'walk') {
        if (n.wait > 0) n.wait -= dt;
        else {
          const r = n.route, [gx, gz] = r[n.seg];
          if (walkTo(n, gx, gz, dt, false)) {
            if (n.seg + n.dir >= r.length || n.seg + n.dir < 0) { n.dir *= -1; n.wait = 2 + Math.random() * 4; }
            n.seg += n.dir;
          }
        }
      } else {
        // working a plot of their own, or busy where they stand
        n.next -= dt;
        if (!n.act && n.next <= 0) { n.act = { type: n.f.does === 'work' ? (Math.random() < 0.6 ? 'plant' : 'harvest') : Math.random() < 0.5 ? 'wipe' : 'adjust', p: 0, dur: n.f.does === 'work' ? 1.8 : 2.2 }; }
        if (n.act) { n.act.p += dt; if (n.act.p >= n.act.dur) { n.act = null; n.next = n.f.does === 'work' ? 0.6 + Math.random() * 1.6 : 4 + Math.random() * 6; } }
      }
      // a greeting when the farmer comes close
      if (!storm && dMe < 3.2 && n.cool <= 0 && !g.won) {
        n.cool = 40; n.hold = 2.6; n.act = null; n.bubT = 4.2;
        n.bubble.textContent = T(n.f.hello); n.bubble.style.display = ''; n.bubble.classList.remove('g3-pop'); void n.bubble.offsetWidth; n.bubble.classList.add('g3-pop');
      }
      const gy = L.ground(n.x, n.z);
      n.P.root.position.set(n.x, gy, n.z); n.P.root.rotation.y = n.yaw;
      n.P.root.rotation.x = n.stag > 0 ? -Math.sin((n.stag / 0.6) * Math.PI) * 0.22 : 0; // knocked back a step
      n.P.root.visible = Math.hypot(camPos.x - n.x, camPos.z - n.z) < 70;
      animate(n.P, { speed: n.speed, run: n.run, act: n.hold > 0 ? null : n.act, t: t + i * 7, down: 0 }, dt);
      // name when near, words when speaking
      const showName = dMe < 7 && n.bubT <= 0;
      if (showName || n.bubT > 0) {
        const [x, y, vis] = project(n.x, gy + (n.bubT > 0 ? 2.05 : 2.0) * (n.f.look.build ?? 1), n.z);
        const d = n.bubT > 0 ? n.bubble : n.label;
        d.style.display = vis ? '' : 'none'; d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        (n.bubT > 0 ? n.label : n.bubble).style.display = 'none';
      } else { n.label.style.display = 'none'; n.bubble.style.display = 'none'; }
      if (n.bubT > 0) { n.bubT -= dt; if (n.bubT <= 0) n.bubble.style.display = 'none'; }
    });
  }

  return {
    update,
    dots: () => folk.map((n) => [n.x, n.z]),
    setLang(l) { lang = l; setNames(); },
    dispose() { for (const n of folk) { n.label.remove(); n.bubble.remove(); } boards.length = 0; },
  };
}
