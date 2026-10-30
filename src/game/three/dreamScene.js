// The 3D world of "স্বপ্নের মাঠ", the children's dream (story and rules in game/dream.js). One renderer, three places:
// the courtyard at night, space with the Earth, and the family's field by day. People are rigged, animated models
// (public/models/people, Quaternius, CC0) dressed in each character's own colours from regions.js; children are the
// same bodies scaled down with a bigger head. The light, the sky and the people's animation follow the mood.
// Taps (mouse, touch, or a VR/AR controller's trigger) hit the objects of the mini-games. Runs through
// renderer.setAnimationLoop so WebXR works; keep frame code free of exceptions.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env.BASE_URL || './'}models/people/`;
const GRADES = {
  night: { sky: 0x14224a, fog: 0x14224a, sun: 0xa9bcff, sunI: 0.9, amb: 0x6a7ab0, ambI: 1.25, lamp: 3.2 },
  space: { sky: 0x02030a, fog: 0x02030a, sun: 0xffffff, sunI: 1.6, amb: 0x223355, ambI: 0.35, lamp: 0 },
  day: { sky: 0x9fd3f2, fog: 0xc9e6f5, sun: 0xfff2d6, sunI: 2.2, amb: 0xbfd8ff, ambI: 0.8, lamp: 0 },
  grey: { sky: 0x6f7882, fog: 0x6a747e, sun: 0xb4bcc4, sunI: 1.3, amb: 0x8d97a1, ambI: 1.15, lamp: 0 },
  gold: { sky: 0xffc985, fog: 0xffd9a8, sun: 0xffd08a, sunI: 2.6, amb: 0xffe3c0, ambI: 0.9, lamp: 0 },
  dawn: { sky: 0xf7b9a0, fog: 0xf9d2bd, sun: 0xffc9a0, sunI: 1.9, amb: 0xf3d8ff, ambI: 0.85, lamp: 0 },
};

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
const sphere = (r, c, o) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(c, o));

// Which body each grown-up wears, and the colours of their clothes.
export function bodyFor(id, region) {
  const look = region?.farmer?.look ?? {};
  const age = region?.farmer?.age ?? 40;
  const model = ['rahima', 'rampyari', 'kinley'].includes(id) ? 'Casual3_Female' : id === 'razib' ? 'Casual2_Male' : age >= 55 ? 'OldClassy_Male' : 'Worker_Male';
  return { model, colors: { Skin: look.skin, Shirt: look.topA, Vest: look.topB ?? look.topA, Detail: look.topB, Pants: look.lowA, Hair: look.hair, Hat: look.headA ?? look.hair, Belt: '#3a2a1e' } };
}
export function kidBody(child, region) {
  const skin = region?.farmer?.look?.skin ?? '#b77b52';
  return child.girl
    ? { model: 'Casual_Female', colors: { Skin: skin, Shirt: '#f2a7c3', Pants: '#7b5cd6', Hair: '#1a1411', Belt: '#e2b84a' }, kid: true }
    : { model: 'Casual_Male', colors: { Skin: skin, Shirt: '#4fb3e8', Pants: '#2f4f7f', Hair: '#1a1411', Belt: '#e2b84a' }, kid: true };
}

export function createDreamScene(host, { onTap = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.05, 400);
  const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(6, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const amb = new THREE.HemisphereLight(0xbfd8ff, 0x3a2f20, 0.8);
  const lamp = new THREE.PointLight(0xffb45a, 0, 9, 1.6); lamp.position.set(1.3, 1.6, 0.6);
  scene.add(sun, amb, lamp);
  scene.fog = new THREE.Fog(0x9fd3f2, 18, 70);

  // ── places ──
  const places = { night: new THREE.Group(), space: new THREE.Group(), field: new THREE.Group() };
  Object.values(places).forEach((g) => scene.add(g));
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 2400 }, () => (Math.random() - 0.5) * 300), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.35 }));
  scene.add(stars);

  // night courtyard: a mud-and-tin house, a lantern, a cot
  {
    const g = places.night;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 40), mat(0x5a4632)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const wall = box(5, 2.4, 3, 0xb38b5d); wall.position.set(0, 1.2, -3.2); g.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.4, 4), mat(0x8a9198, { metalness: 0.4, roughness: 0.5 })); roof.position.set(0, 3.1, -3.2); roof.rotation.y = Math.PI / 4; g.add(roof);
    const door = box(1, 1.7, 0.05, 0x5b3a22); door.position.set(0, 0.85, -1.68); g.add(door);
    const cot = box(2, 0.25, 1, 0x7a5532); cot.position.set(-1.8, 0.45, 0.3); g.add(cot);
    const lantern = sphere(0.12, 0xffd08a, { emissive: 0xffa040, emissiveIntensity: 2 }); lantern.position.copy(lamp.position); g.add(lantern);
  }
  // space: the Earth with the home dot, Tara orbiting
  const earth = new THREE.Group();
  const home = sphere(0.09, 0xfff07a, { emissive: 0xffd400, emissiveIntensity: 3 });
  {
    const globe = sphere(3, 0x1f5fb8, { roughness: 0.6 });
    globe.geometry = new THREE.SphereGeometry(3, 64, 48);
    globe.userData.onTap = () => onTap({ kind: 'home' }); // little fingers: anywhere on the Earth finds home
    earth.add(globe);
    for (let i = 0; i < 26; i++) { // land blobs and clouds
      const blob = sphere(0.35 + Math.random() * 0.5, i % 3 ? 0x3f8f3a : 0xffffff, { roughness: 1 });
      const v = new THREE.Vector3().randomDirection().multiplyScalar(2.82);
      blob.position.copy(v); blob.scale.set(1, 0.25, 1); blob.lookAt(0, 0, 0); blob.rotateX(Math.PI / 2); earth.add(blob);
    }
    home.geometry = new THREE.SphereGeometry(0.16, 20, 14);
    home.position.set(0, 0.6, 1).normalize().multiplyScalar(3.02); earth.add(home);
    home.userData.onTap = () => onTap({ kind: 'home' });
    earth.position.set(0, 0, -9);
    places.space.add(earth);
  }
  // field: plots, a river, palms, a pump, the house far off
  const plots = [];
  {
    const g = places.field;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(0x6d8f3f)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(90, 6), mat(0x3d7fb3, { roughness: 0.2, metalness: 0.1 })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, -22); g.add(river);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const p = box(2.6, 0.18, 2.2, 0x8a6a45); p.position.set(-4.2 + c * 2.8, 0.09, -2.5 - r * 2.4); p.receiveShadow = true;
      p.userData = { bare: true, plants: null };
      g.add(p); plots.push(p);
    }
    for (let i = 0; i < 9; i++) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 4, 8), mat(0x7a5b3a)); trunk.position.y = 2; palm.add(trunk);
      for (let k = 0; k < 6; k++) { const leaf = box(0.25, 0.05, 1.8, 0x2f7a35); leaf.position.set(0, 4, 0); leaf.rotation.set(0.5, (k / 6) * Math.PI * 2, 0); leaf.translateZ(0.8); palm.add(leaf); }
      palm.position.set(-14 + i * 3.6, 0, -15 - (i % 2) * 3); g.add(palm);
    }
    const hut = box(3, 2, 2.4, 0xb38b5d); hut.position.set(9, 1, -8); g.add(hut);
  }

  // ── Tara the satellite, Bhola the goat, the frog ──
  const tara = new THREE.Group();
  {
    const body = box(0.5, 0.5, 0.5, 0xf2c14e); body.material.metalness = 0.6; body.material.roughness = 0.3; tara.add(body);
    for (const s of [-1, 1]) { const panel = box(0.9, 0.04, 0.42, 0x2457c5); panel.material.metalness = 0.5; panel.position.x = s * 0.72; tara.add(panel); }
    for (const s of [-1, 1]) { const eye = sphere(0.07, 0xffffff); eye.position.set(s * 0.12, 0.06, 0.26); const pupil = sphere(0.035, 0x111111); pupil.position.set(s * 0.12, 0.06, 0.32); tara.add(eye, pupil); }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 16, Math.PI), mat(0x5b2b10)); smile.position.set(0, -0.08, 0.26); smile.rotation.z = Math.PI; tara.add(smile);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), mat(0xcccccc)); ant.position.y = 0.45; tara.add(ant);
    const tip = sphere(0.05, 0xff5a5a, { emissive: 0xff2a2a, emissiveIntensity: 2 }); tip.position.y = 0.66; tara.add(tip);
    tara.userData.tip = tip;
    scene.add(tara);
  }
  const goat = new THREE.Group();
  {
    const b = box(0.9, 0.45, 0.4, 0xf1ece2); b.position.y = 0.6; goat.add(b);
    const h = box(0.3, 0.3, 0.28, 0xe6dfd2); h.position.set(0.55, 0.85, 0); goat.add(h);
    for (const [x, z] of [[-0.3, -0.12], [-0.3, 0.12], [0.3, -0.12], [0.3, 0.12]]) { const l = box(0.08, 0.4, 0.08, 0x3a2f28); l.position.set(x, 0.2, z); goat.add(l); }
    for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 6), mat(0x8a7a62)); horn.position.set(0.55, 1.05, s * 0.08); goat.add(horn); }
    goat.visible = false; goat.userData.onTap = () => onTap({ kind: 'goat' }); places.field.add(goat);
  }
  const frog = new THREE.Group();
  {
    const b = sphere(0.22, 0x4caf50); b.scale.set(1, 0.7, 1); frog.add(b);
    for (const s of [-1, 1]) { const e = sphere(0.07, 0xffffff); e.position.set(s * 0.1, 0.15, 0.1); frog.add(e); }
    frog.visible = false; frog.position.set(0.6, 0.25, -2.5); places.field.add(frog);
  }

  // ── people ──
  const loader = new GLTFLoader();
  const cache = new Map();
  const load = (name) => { if (!cache.has(name)) cache.set(name, loader.loadAsync(`${BASE}${name}.glb`)); return cache.get(name); };
  const people = {}; // role → { root, mixer, actions, now }
  async function addPerson(role, spec) {
    const gltf = await load(spec.model);
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      o.material = ms.map((m) => { const n = m.clone(); const c = spec.colors[m.name]; if (c) n.color.set(c); return n; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    if (spec.kid) {
      root.scale.setScalar(0.62);
      root.traverse((o) => { if (o.isBone && /^Head$/i.test(o.name)) o.scale.setScalar(1.3); });
    }
    const mixer = new THREE.AnimationMixer(root);
    const actions = Object.fromEntries(gltf.animations.map((a) => [a.name, mixer.clipAction(a)]));
    if (people[role]) { scene.remove(people[role].root); }
    people[role] = { root, mixer, actions, now: null };
    scene.add(root);
    play(role, 'Idle');
    return people[role];
  }
  function play(role, name, { once = false } = {}) {
    const p = people[role];
    if (!p) return;
    const next = p.actions[name] ?? p.actions.Idle;
    if (!next || p.now === next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    if (p.now) p.now.crossFadeTo(next, 0.35, false);
    next.play();
    p.now = next;
  }
  const place = (role, x, z, ry = 0) => { const p = people[role]; if (p) { p.root.position.set(x, 0, z); p.root.rotation.y = ry; p.root.visible = true; } };
  const hide = (role) => { if (people[role]) people[role].root.visible = false; };

  // ── weather: rain, fireflies ──
  const rainGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 3000 }, (_, i) => (i % 3 === 1 ? Math.random() * 14 : (Math.random() - 0.5) * 24)), 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaecbe8, size: 0.06, transparent: true, opacity: 0.8 }));
  rain.visible = false; scene.add(rain);
  const flies = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 300 }, (_, i) => (i % 3 === 1 ? Math.random() * 3 + 0.3 : (Math.random() - 0.5) * 10)), 3)), new THREE.PointsMaterial({ color: 0xfff1a0, size: 0.09 }));
  flies.visible = false; scene.add(flies);

  // ── mini-game objects ──
  const clouds = [];
  const sprouts = new THREE.Group(); places.field.add(sprouts);
  let soilLevel = 50;
  function cloudMesh(dark) {
    const g = new THREE.Group();
    for (let k = 0; k < 5; k++) { const s = sphere(0.45 + Math.random() * 0.3, dark ? 0x55606e : 0xffffff, { roughness: 1 }); s.position.set((k - 2) * 0.5, Math.random() * 0.25, Math.random() * 0.2); g.add(s); }
    g.userData = { dark, onTap: () => { if (!g.userData.gone) { g.userData.gone = true; onTap({ kind: 'cloud', dark }); } } };
    return g;
  }
  function cover(p) {
    if (!p.userData.bare) return;
    p.userData.bare = false;
    p.material.color.set(0x5d8a3a);
    const g = new THREE.Group();
    for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 5), mat(0x4caf50)); s.position.set((Math.random() - 0.5) * 2.2, 0.3, (Math.random() - 0.5) * 1.8); s.scale.setScalar(0.01); g.add(s); }
    g.position.copy(p.position); g.userData.grow = 0; p.userData.plants = g; sprouts.add(g);
  }
  function uncover(p) {
    if (p.userData.bare) return;
    p.userData.bare = true; p.material.color.set(0x8a6a45);
    if (p.userData.plants) { sprouts.remove(p.userData.plants); p.userData.plants = null; }
  }
  const game = { kind: null, t: 0, goatTarget: null, goatT: 0 };

  // ── scenes ──
  let mood = 'calm';
  function grade(name) {
    const g = GRADES[name] ?? GRADES.day;
    scene.background = new THREE.Color(g.sky); scene.fog.color.set(g.fog);
    sun.color.set(g.sun); sun.intensity = g.sunI; amb.color.set(g.amb); amb.intensity = g.ambI; lamp.intensity = g.lamp;
    stars.visible = name === 'night' || name === 'space';
  }
  function show(placeName) { for (const [k, g] of Object.entries(places)) g.visible = k === placeName; }
  const camTo = new THREE.Vector3(), lookTo = new THREE.Vector3(), look = new THREE.Vector3();
  function frame(pos, at) { camTo.set(...pos); lookTo.set(...at); }

  function setScene(id, m) {
    mood = m ?? mood;
    rain.visible = false; flies.visible = false; frog.visible = false; goat.visible = false;
    for (const c of clouds) places.field.remove(c); clouds.length = 0;
    game.kind = null;
    if (id === 'night') {
      show('night'); grade('night');
      place('parent', -1.6, 0.4, 0.5); place('child', 0.4, 1.2, -0.6); tara.visible = false;
      frame([0.5, 1.6, 4.6], [-0.6, 0.9, 0]);
    } else if (id === 'tara') {
      show('space'); grade('space'); hide('parent'); hide('child');
      tara.visible = true; tara.position.set(1.4, 0.2, -3.5);
      frame([0, 0, 2.5], [0, 0, -9]);
    } else {
      show('field'); grade(id === 'without' ? 'grey' : id === 'with' ? 'gold' : id === 'morning' ? 'dawn' : 'day');
      tara.visible = id !== 'morning'; tara.position.set(2.6, 3.2, -1.5);
      place('child', 1.4, 1.6, -0.4); place('parent', -1.2, 1.2, 0.5);
      frame([0.2, 3.4, 8.5], [0, 0.6, -2.5]);
      if (id === 'without') { rain.visible = true; plots.forEach(uncover); plots.forEach((p) => p.material.color.set(0x5b4a38)); }
      if (id === 'with') { flies.visible = true; plots.forEach(cover); }
      if (id === 'morning') { plots.forEach(cover); frame([0.5, 1.8, 6], [0, 1, 0]); }
    }
    play('parent', id === 'without' ? 'Defeat' : id === 'with' ? 'Victory' : id === 'night' ? 'SitDown' : 'Idle', { once: id === 'night' || id === 'without' });
    play('child', id === 'with' ? 'Victory' : id === 'without' ? 'Defeat' : 'Idle', { once: id === 'without' });
  }

  function startGame(kind) {
    game.kind = kind; game.t = 0;
    if (kind === 'clouds') {
      for (let i = 0; i < 12; i++) { const c = cloudMesh([1, 3, 6, 8, 10].includes(i)); c.scale.setScalar(1.25); c.position.set(-12 - i * 3, 2.6 + Math.random() * 1.4, -3 - Math.random() * 3); places.field.add(c); clouds.push(c); }
    }
    if (kind === 'blanket') {
      plots.forEach((p, i) => (i % 3 === 1 ? cover(p) : uncover(p)));
      plots.forEach((p) => { p.userData.onTap = () => { if (p.userData.bare) { cover(p); onTap({ kind: 'plant' }); } }; });
      goat.visible = true; goat.position.set(7, 0, -3); game.goatT = 0;
    }
    if (kind === 'water') { soilLevel = 20; setWater(20); }
  }
  function stopGame() { plots.forEach((p) => { p.userData.onTap = null; }); goat.visible = false; game.kind = null; }
  function setWater(level) {
    soilLevel = level;
    const dry = new THREE.Color(0xb08a5a), moist = new THREE.Color(0x5a4028), wet = new THREE.Color(0x4a6f8a);
    const c = level < 50 ? dry.clone().lerp(moist, level / 50) : moist.clone().lerp(wet, (level - 50) / 50);
    plots.forEach((p) => { if (p.userData.bare) p.material.color.copy(c); });
    frog.visible = level > 72;
  }
  const blanketState = () => ({ covered: plots.filter((p) => !p.userData.bare).length, total: plots.length });

  // ── input: mouse, touch, XR controllers ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(objects) {
    const hits = ray.intersectObjects(objects, true);
    for (const h of hits) { let o = h.object; while (o && !o.userData.onTap) o = o.parent; if (o?.userData.onTap && o.visible !== false) { o.userData.onTap(); return true; } }
    return false;
  }
  const tappables = () => [earth, goat, ...clouds, ...plots];
  function onPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    hit(tappables());
  }
  renderer.domElement.addEventListener('pointerdown', onPointer);
  const tmp = new THREE.Matrix4();
  for (let i = 0; i < 2; i++) {
    const ctl = renderer.xr.getController(i);
    ctl.addEventListener('select', () => { tmp.identity().extractRotation(ctl.matrixWorld); ray.ray.origin.setFromMatrixPosition(ctl.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(tmp); if (!hit(tappables())) onTap({ kind: 'next' }); });
    rig.add(ctl);
  }

  // ── the loop ──
  const clock = new THREE.Clock();
  look.set(0, 1, 0);
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    for (const p of Object.values(people)) p.mixer.update(dt);
    if (!renderer.xr.isPresenting) {
      // a tall phone screen sees less from side to side: step back so everyone stays in the picture
      const back = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1;
      const want = lookTo.clone().add(camTo.clone().sub(lookTo).multiplyScalar(back));
      camera.position.lerp(want.add(new THREE.Vector3(Math.sin(t * 0.3) * 0.15, Math.sin(t * 0.4) * 0.06, 0)), 0.04);
      look.lerp(lookTo, 0.05); camera.lookAt(look);
    }
    tara.position.y += Math.sin(t * 2) * 0.004; tara.rotation.z = Math.sin(t * 1.3) * 0.12; tara.userData.tip.material.emissiveIntensity = 1.5 + Math.sin(t * 6);
    if (!earth.userData.hold) earth.rotation.y += dt * 0.05; else earth.rotation.y += (0 - earth.rotation.y) * 0.05;
    home.scale.setScalar(earth.userData.hold ? 1.4 + Math.sin(t * 5) * 0.4 : 1); home.material.emissiveIntensity = 2 + Math.sin(t * 5) * 1.5;
    if (rain.visible) { const a = rainGeo.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] -= dt * 14; if (a[i] < 0) a[i] = 14; } rainGeo.attributes.position.needsUpdate = true; }
    if (flies.visible) flies.rotation.y += dt * 0.2;
    sprouts.children.forEach((g) => { if (g.userData.grow < 1) { g.userData.grow = Math.min(1, g.userData.grow + dt * 2.5); g.children.forEach((s) => s.scale.setScalar(g.userData.grow)); } });
    frog.position.y = 0.25 + Math.abs(Math.sin(t * 4)) * 0.25;
    if (game.kind === 'clouds') {
      game.t += dt;
      clouds.forEach((c) => { c.position.x += dt * (1.6 + (c.userData.dark ? 0.6 : 0)); if (c.userData.gone) { c.scale.multiplyScalar(0.85); } });
    }
    if (game.kind === 'blanket') {
      game.goatT += dt;
      if (!game.goatTarget || game.goatT > 4.5) { const covered = plots.filter((p) => !p.userData.bare); game.goatTarget = covered[Math.floor(Math.random() * covered.length)] ?? null; game.goatT = 0; }
      if (game.goatTarget) {
        const to = game.goatTarget.position.clone().setY(0), d = to.clone().sub(goat.position);
        if (d.length() > 0.3) { goat.position.addScaledVector(d.normalize(), dt * 1.3); goat.lookAt(to.x, 0, to.z); goat.rotateY(-Math.PI / 2); }
        else if (game.goatT > 2.5) { uncover(game.goatTarget); onTap({ kind: 'eaten' }); game.goatTarget = null; game.goatT = 0; }
      }
      goat.position.y = Math.abs(Math.sin(t * 8)) * 0.05;
    }
    renderer.render(scene, camera);
  });

  const onResize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
  window.addEventListener('resize', onResize);

  return {
    renderer,
    async cast(parentSpec, kidSpec) { await Promise.all([addPerson('parent', parentSpec), addPerson('child', kidSpec)]); },
    setScene, startGame, stopGame, setWater, blanketState, play,
    holdEarth(on) { earth.userData.hold = on; if (on) earth.rotation.y %= Math.PI * 2; },
    shooGoat() { if (game.kind === 'blanket') { goat.position.set(8, 0, -3); game.goatTarget = null; game.goatT = 0; } },
    cloudsLeft() { return clouds.filter((c) => !c.userData.gone && c.position.x < 14).length; },
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointer);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
