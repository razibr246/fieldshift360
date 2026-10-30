// The people of মাঠের মানুষ on a studio turntable, in the style of an open-world game's character screen: a dark
// stage, a warm key light and a cold rim light, a slow orbiting camera. Each farmer stands in a rigged, animated body
// (public/models/people, CC0) dressed in their own colours, with their child beside them. Bodies come from
// dreamScene.js (bodyFor, kidBody) so the two pages show the same people.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = `${import.meta.env.BASE_URL || './'}models/people/`;

export function createCharacterStage(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1712);
  scene.fog = new THREE.Fog(0x0d1712, 8, 22);
  const camera = new THREE.PerspectiveCamera(32, host.clientWidth / host.clientHeight, 0.1, 100);

  // light: warm key from the front left, cold rim from behind, a soft fill, a floor spot
  const key = new THREE.SpotLight(0xffd9a8, 60, 20, 0.5, 0.6, 1.4); key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; // no striping on skin
  const rim = new THREE.DirectionalLight(0x7fd4ff, 2.6); rim.position.set(2, 3, -4);
  const rim2 = new THREE.DirectionalLight(0xff9a6a, 1.2); rim2.position.set(-3, 2, -3);
  const fill = new THREE.HemisphereLight(0x9fb8a8, 0x1a1410, 0.6);
  scene.add(key, key.target, rim, rim2, fill);

  // the stage: a dark disc with a glowing ring, and a field of paddy-gold dust in the air
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1d2a22, roughness: 0.4, metalness: 0.3 }));
  disc.position.y = -0.06; disc.receiveShadow = true; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.025, 8, 96), new THREE.MeshStandardMaterial({ color: 0x8be08a, emissive: 0x4caf50, emissiveIntensity: 2.5 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0x0f1a14, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.12; floor.receiveShadow = true; scene.add(floor);
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => (i % 3 === 1 ? Math.random() * 5 : (Math.random() - 0.5) * 12)), 3)), new THREE.PointsMaterial({ color: 0xffd98a, size: 0.025, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  const loader = new GLTFLoader(), cache = new Map();
  const load = (n) => { if (!cache.has(n)) cache.set(n, loader.loadAsync(`${BASE}${n}.glb`)); return cache.get(n); };
  const cast = [];
  async function person(spec, x) {
    const gltf = await load(spec.model);
    const root = cloneSkinned(gltf.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; // they cast onto the stage; self-shadowing on low-poly bodies only draws stripes
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      o.material = ms.map((m) => { const n = m.clone(); const c = spec.colors[m.name]; if (c) n.color.set(c); n.roughness = m.name === 'Skin' ? 0.55 : 0.75; return n; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    if (spec.kid) { root.scale.setScalar(0.62); root.traverse((o) => { if (o.isBone && /^Head$/i.test(o.name)) o.scale.setScalar(1.3); }); }
    root.position.x = x;
    const mixer = new THREE.AnimationMixer(root);
    const actions = Object.fromEntries(gltf.animations.map((a) => [a.name, mixer.clipAction(a)]));
    return { root, mixer, actions, now: null };
  }
  function play(p, name, once = false) {
    const a = p.actions[name] ?? p.actions.Idle;
    if (!a || p.now === a) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    if (p.now) p.now.crossFadeTo(a, 0.3, false);
    a.play(); p.now = a;
    if (once) setTimeout(() => play(p, 'Idle'), (a.getClip().duration * 1000) | 0);
  }
  let token = 0;
  async function show(adult, kid) {
    const my = ++token;
    const [a, k] = await Promise.all([person(adult, -0.35), person(kid, 0.75)]);
    if (my !== token) return; // a newer pick came in while these loaded
    for (const p of cast.splice(0)) scene.remove(p.root);
    cast.push(a, k);
    scene.add(a.root, k.root);
    play(a, 'Victory', true); play(k, 'Jump', true);
    spin = -0.6;
  }

  const clock = new THREE.Clock();
  let spin = 0, angle = 0.35;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    for (const p of cast) p.mixer.update(dt);
    spin *= 0.97; angle += dt * 0.12 + spin * dt;
    const r = camera.aspect < 1 ? 9.2 : 5.6;
    camera.position.set(Math.sin(angle) * r, 1.45 + Math.sin(t * 0.3) * 0.08, Math.cos(angle) * r);
    camera.lookAt(0.15, camera.aspect < 1 ? 1.75 : 1.05, 0); // on a phone the people stand low, under the name
    ring.material.emissiveIntensity = 2 + Math.sin(t * 2) * 0.6;
    dust.rotation.y += dt * 0.03;
    renderer.render(scene, camera);
  });
  const onResize = () => { camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); };
  window.addEventListener('resize', onResize);
  return {
    show,
    cheer() { if (cast[0]) play(cast[0], 'Victory', true); if (cast[1]) play(cast[1], 'Jump', true); },
    dispose() { renderer.setAnimationLoop(null); window.removeEventListener('resize', onResize); renderer.dispose(); renderer.domElement.remove(); },
  };
}
