// Living ground cover and sky for the world of মাঠের মানুষ: grass tufts that bend in the wind, wildflowers in clumps,
// the neighbours' crops standing in their patches (wheat in ear, paddy, mustard in flower, sunflowers, low sesame and
// groundnut, cut stubble), and clouds drifting overhead. Each kind is one InstancedMesh, so thousands of plants cost a
// few draw calls; the sway runs in the vertex shader from the weather's wind (a breeze most days, a gale in the
// storm). Planting avoids the farm's plots, paths, water, buildings, trees and stations, and is seeded from the
// layout so a place looks the same every visit. 'light' graphics plants about a quarter as much and no flowers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD_W, FIELD_D } from '../regions';

const C = (h) => new THREE.Color(h);
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

// One geometry from triangles given as flat position and colour arrays; normals point up so blades light like a lawn
// seen from above, not like paper cards edge-on.
function soup(pos, col, up = true) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (up) g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  else g.computeVertexNormals();
  return g;
}
// a closed shape (flower, ear, head) as a non-indexed geometry with a flat colour, ready to merge with blades
function part(geo, color, at = [0, 0, 0], scale = [1, 1, 1]) {
  const g = geo.toNonIndexed(); g.deleteAttribute('uv');
  g.scale(...scale); g.translate(...at);
  const c = C(color), n = g.attributes.position.count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
  return g;
}
// A tuft of tapered blades round the origin: n blades, heights hMin..hMax, darker at the base than the tip.
function tuft(rng, n, hMin, hMax, w, spread, base, tip) {
  const pos = [], col = [], b = C(base), t = C(tip);
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2, r = rng() * spread, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const rot = rng() * Math.PI, h = hMin + rng() * (hMax - hMin), lean = (rng() - 0.3) * h * 0.35;
    const c = Math.cos(rot), s = Math.sin(rot);
    pos.push(x - (c * w) / 2, 0, z - (s * w) / 2, x + (c * w) / 2, 0, z + (s * w) / 2, x - s * lean, h, z + c * lean);
    col.push(b.r, b.g, b.b, b.r, b.g, b.b, t.r, t.g, t.b);
  }
  return soup(pos, col);
}

// The shapes: grass, a wildflower, and each crop of the neighbours' patches.
function shapes(rng) {
  const grass = tuft(rng, 11, 0.08, 0.22, 0.05, 0.14, '#5f8a34', '#c4dc74');
  const flower = mergeGeometries([
    tuft(rng, 3, 0.1, 0.16, 0.03, 0.03, '#5f8a34', '#9fc45a'),
    part(new THREE.CircleGeometry(0.05, 6).rotateX(-Math.PI / 2), '#ffffff', [0, 0.16, 0]),
    part(new THREE.CircleGeometry(0.02, 5).rotateX(-Math.PI / 2), '#f2c230', [0, 0.165, 0]),
  ]);
  const ear = (h) => part(new THREE.CylinderGeometry(0.018, 0.028, 0.16, 5), '#e2c25a', [0, h + 0.08, 0]);
  const wheatBlades = tuft(rng, 9, 0.75, 1.0, 0.035, 0.1, '#6f8f3a', '#d8c060');
  const wheat = mergeGeometries([wheatBlades, ...[[0.04, 0.95], [-0.05, 0.9], [0.01, 1.02]].map(([x, h]) => { const e = ear(h); e.translate(x, 0, x * 0.6); return e; })]);
  const paddy = tuft(rng, 12, 0.55, 0.85, 0.04, 0.08, '#4f7a2a', '#b9c45a');
  const mustard = mergeGeometries([
    tuft(rng, 6, 0.7, 1.05, 0.05, 0.08, '#4f7a2a', '#7fa84a'),
    ...[[0, 1.02, 0], [0.07, 0.94, 0.04], [-0.06, 0.97, -0.03]].map((at) => part(new THREE.IcosahedronGeometry(0.075, 0), '#f2d020', at, [1, 0.8, 1])),
  ]);
  const sunflower = mergeGeometries([
    part(new THREE.CylinderGeometry(0.018, 0.026, 1.5, 5), '#4f7a2a', [0, 0.75, 0]),
    part(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12).rotateX(Math.PI / 2 - 0.35), '#f2b818', [0, 1.52, 0.05]),
    part(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10).rotateX(Math.PI / 2 - 0.35), '#5a3a1a', [0, 1.53, 0.07]),
    tuft(rng, 4, 0.3, 0.6, 0.12, 0.05, '#4f7a2a', '#6f9a3a'),
  ]);
  const bush = mergeGeometries([tuft(rng, 10, 0.25, 0.45, 0.09, 0.14, '#3f6a24', '#7fa84a')]);
  const stubble = tuft(rng, 10, 0.08, 0.16, 0.03, 0.12, '#a08a4a', '#d9c27a');
  return { grass, flower, wheat, paddy, mustard, sunflower, sesame: bush, groundnut: bush, stubble };
}

function makeButterflyGeo() {
  const g = new THREE.BufferGeometry();
  const pos = [
    // left wing
    0, 0, 0,  -0.12, 0.04, 0.09,  -0.14, 0.02, -0.07,
    0, 0, 0,  -0.14, 0.02, -0.07,  -0.06, 0.01, -0.11,
    // right wing
    0, 0, 0,   0.14, 0.02, -0.07,   0.12, 0.04, 0.09,
    0, 0, 0,   0.06, 0.01, -0.11,   0.14, 0.02, -0.07,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function makeBirdGeo() {
  const body = new THREE.ConeGeometry(0.065, 0.22, 5).rotateX(Math.PI / 2);
  const head = new THREE.SphereGeometry(0.048, 6, 5).translate(0, 0.035, 0.12);
  const beak = new THREE.ConeGeometry(0.016, 0.06, 4).rotateX(Math.PI / 2).translate(0, 0.02, 0.175);
  const tail = new THREE.BufferGeometry();
  tail.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0.01, -0.1,  -0.05, 0.02, -0.22,  0.05, 0.02, -0.22
  ], 3));
  return mergeGeometries([body, head, beak, tail.toNonIndexed()]);
}

export function createNature(scene, L, { light = false } = {}) {
  const seed = Math.floor(Math.abs((L.patches?.[0]?.[0] ?? 1) * 1e4)) + L.props.length;
  const rng = mulberry(seed);
  const time = { value: 0 }, wind = { value: 0.8 };
  const geos = shapes(rng);
  const group = new THREE.Group(); scene.add(group);
  const mats = [];
  // the sway: the higher a vertex, the further it bends; a slow gust and a quick flutter that travel across the land
  const swayMat = (amp) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
    const ampU = { value: amp };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time; sh.uniforms.uWind = wind; sh.uniforms.uAmp = ampU;
      sh.vertexShader = `uniform float uTime; uniform float uWind; uniform float uAmp;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 ip = vec2(0.0);
        #endif
        float bend = transformed.y * transformed.y;
        float gust = sin(uTime * 1.3 - ip.x * 0.09 - ip.y * 0.05) * 0.65 + sin(uTime * 3.4 + ip.x * 1.1 + ip.y * 0.7) * 0.35;
        transformed.x += gust * uWind * uAmp * bend;
        transformed.z += gust * uWind * uAmp * 0.45 * bend;`);
      // a two-sided material flips the normal on the back face; blades keep their up-facing normal on both sides,
      // or half of every tuft is lit from below and turns black
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n        normal = normalize(vNormal);');
    };
    m.customProgramCacheKey = () => 'fs-sway';
    mats.push(m);
    return m;
  };

  // where a plant may stand
  const fieldX = FIELD_W / 2 + 1.4, fieldZ = FIELD_D / 2 + 1.4;
  const stations = Object.values(L.S ?? {});
  const inPatch = (x, z) => L.patches?.find(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  const free = (x, z, margin = 0.5) => {
    if (Math.abs(x) < fieldX && Math.abs(z) < fieldZ) return false;
    for (const w of L.water) { if (w.r ? Math.hypot(x - w.cx, z - w.cz) < w.r + 1.2 : x > w.x0 - 1.2 && x < w.x1 + 1.2 && z > w.z0 - 1.2 && z < w.z1 + 1.2) return false; }
    for (const p of L.paths) for (let k = 1; k < p.length; k++) if (segDist(x, z, p[k - 1], p[k]) < 1.6) return false;
    for (const b of L.blockers) {
      if (b.r) { if (Math.hypot(x - b.x, z - b.z) < b.r + margin) return false; }
      else { const dx = x - b.x, dz = z - b.z, u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c; if (Math.abs(u) < b.hw + margin && Math.abs(v) < b.hd + margin) return false; }
    }
    for (const s of stations) if (s && Math.hypot(x - s.x, z - s.z) < (s.r ?? 2) + 1.5) return false;
    return true;
  };
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  const plant = (geo, mat, spots, color) => {
    if (!spots.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([x, z, s, rot, j], i) => {
      dummy.position.set(x, L.ground(x, z) - 0.02, z); dummy.rotation.set(0, rot, 0); dummy.scale.set(s, s * (0.85 + j * 0.3), s); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.set(color(j)); mesh.setColorAt(i, tint);
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = !light; mesh.castShadow = false; mesh.frustumCulled = false;
    group.add(mesh); return mesh;
  };

  // grass over the walkable land, thinning towards the edge of the world
  const grassN = light ? 3500 : 16000, grass = [];
  for (let tries = 0; grass.length < grassN && tries < grassN * 6; tries++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 78, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (inPatch(x, z) || !free(x, z)) continue;
    grass.push([x, z, 0.6 + rng() * 0.4, rng() * Math.PI * 2, rng()]);
  }
  const hue = C('#ffffff').lerp(C(L.grass), 0.25);
  plant(geos.grass, swayMat(0.6), grass, (j) => tint.copy(hue).multiplyScalar(0.92 + j * 0.2).offsetHSL((j - 0.5) * 0.03, 0, 0));

  // wildflowers in clumps of a single colour
  if (!light) {
    const palette = ['#ffffff', '#ffd23a', '#c77dff', '#ff8a5c', '#9ad0ff'], flowers = [], colors = [];
    for (let c = 0; c < 70; c++) {
      const a = rng() * Math.PI * 2, d = 10 + Math.sqrt(rng()) * 64, cx = Math.cos(a) * d, cz = Math.sin(a) * d, col = palette[Math.floor(rng() * palette.length)];
      for (let k = 0; k < 14; k++) {
        const x = cx + (rng() - 0.5) * 3, z = cz + (rng() - 0.5) * 3;
        if (inPatch(x, z) || !free(x, z)) continue;
        flowers.push([x, z, 0.8 + rng() * 0.6, rng() * Math.PI * 2, rng()]); colors.push(col);
      }
    }
    let n = 0;
    plant(geos.flower, swayMat(0.5), flowers, () => colors[n++]);
  }

  // the neighbours' crops, in rows across each patch, as dense as the budget allows
  const KIND = { wheat: 'wheat', paddy: 'paddy', mustard: 'mustard', sunflower: 'sunflower', sesame: 'sesame', groundnut: 'groundnut', stubble: 'stubble' };
  const patches = (L.patches ?? []).filter(([, , , , k]) => KIND[k]);
  const area = patches.reduce((a, [x0, x1, z0, z1]) => a + (x1 - x0) * (z1 - z0), 0) || 1;
  const budget = light ? 4000 : 16000, step = Math.max(0.55, Math.sqrt(area / budget));
  const crops = {};
  for (const [x0, x1, z0, z1, k] of patches) {
    const rowAlongX = x1 - x0 > z1 - z0;
    for (let u = x0 + step / 2; u < x1; u += rowAlongX ? step * 0.7 : step * 1.25) {
      for (let v = z0 + step / 2; v < z1; v += rowAlongX ? step * 1.25 : step * 0.7) {
        const x = u + (rng() - 0.5) * step * 0.3, z = v + (rng() - 0.5) * step * 0.3;
        if (Math.hypot(x, z) > 135 || !free(x, z, 0.3)) continue;
        (crops[KIND[k]] ??= []).push([x, z, 0.85 + rng() * 0.3, rng() * Math.PI * 2, rng()]);
      }
    }
  }
  const AMP = { wheat: 0.12, paddy: 0.16, mustard: 0.12, sunflower: 0.05, sesame: 0.3, groundnut: 0.3, stubble: 0 };
  for (const [k, spots] of Object.entries(crops)) plant(geos[k], swayMat(AMP[k]), spots, (j) => tint.setRGB(0.88 + j * 0.24, 0.88 + j * 0.24, 0.88 + j * 0.2));

  // clouds: soft clusters high over the land, drifting with the wind, coloured by the sky
  const puff = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cloudMat = new THREE.SpriteMaterial({ map: puff, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let c = 0; c < (light ? 7 : 16); c++) {
    const a = rng() * Math.PI * 2, d = 150 + rng() * 140, cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = 70 + rng() * 45, w = 30 + rng() * 40;
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(cloudMat); const r = (rng() - 0.5) * w;
      s.position.set(cx + r, cy + Math.abs(r) * -0.15 + rng() * 6, cz + (rng() - 0.5) * w * 0.5);
      s.scale.setScalar(w * (0.45 + rng() * 0.35)); s.renderOrder = -1; clouds.add(s);
    }
  }
  const cloudCol = new THREE.Color();
  let gustWind = 0.8;

  // ---- ambient butterflies hovering over flowers & crops ----
  const BFLY_COUNT = light ? 6 : 16;
  const bflyGeo = makeButterflyGeo();
  const bflyMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
  const bflyMesh = new THREE.InstancedMesh(bflyGeo, bflyMat, BFLY_COUNT);
  bflyMesh.castShadow = false; bflyMesh.receiveShadow = false; bflyMesh.frustumCulled = false;
  scene.add(bflyMesh);

  const bflyDummy = new THREE.Object3D();
  const bflyPalette = ['#f4a226', '#fcd34d', '#38bdf8', '#4ade80', '#fb7185', '#e879f9'];
  const butterflies = Array.from({ length: BFLY_COUNT }, (_, i) => {
    const a = rng() * Math.PI * 2, r = 8 + rng() * 45;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const col = C(bflyPalette[i % bflyPalette.length]);
    bflyMesh.setColorAt(i, col);
    return {
      cx, cz,
      rx: 2.5 + rng() * 2.5, rz: 2.5 + rng() * 2.5,
      speed: 0.8 + rng() * 0.7,
      offset: rng() * 20,
      flapSpeed: 16 + rng() * 6,
    };
  });
  if (bflyMesh.instanceColor) bflyMesh.instanceColor.needsUpdate = true;

  // ---- ambient perching & scattering birds ----
  const BIRD_COUNT = light ? 4 : 9;
  const birdGeo = makeBirdGeo();
  const birdMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1, color: '#4a3828' });
  const birdMesh = new THREE.InstancedMesh(birdGeo, birdMat, BIRD_COUNT);
  birdMesh.castShadow = true; birdMesh.receiveShadow = false; birdMesh.frustumCulled = false;
  scene.add(birdMesh);

  const birdDummy = new THREE.Object3D();
  const perches = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, d = 16 + (i % 3) * 12;
    const px = Math.cos(a) * d, pz = Math.sin(a) * d;
    if (free(px, pz, 0.4)) perches.push([px, L.ground(px, pz) + 1.25, pz]);
  }
  if (!perches.length) perches.push([10, L.ground(10, 10) + 1.25, 10]);

  const birds = Array.from({ length: BIRD_COUNT }, (_, i) => {
    const p = perches[i % perches.length];
    return {
      x: p[0], y: p[1], z: p[2],
      yaw: rng() * Math.PI * 2,
      target: [...p],
      state: 'perch',
      timer: 2 + rng() * 4,
      flap: 0,
    };
  });

  return {
    // w: the weather's wind (0.8 breeze, 2.4 storm); sky: the sky's middle colour; storm 0–1; day: is the sun up; focus: player position
    update(t, dt, w, sky, storm, day, focus) {
      time.value = t;
      gustWind += (w - gustWind) * Math.min(1, dt * 0.8); wind.value = gustWind;
      clouds.rotation.y += dt * 0.002 * gustWind;
      cloudCol.set(day ? '#ffffff' : '#3a4566').lerp(sky, day ? 0.25 : 0.5).lerp(C('#59636e'), storm * 0.85);
      cloudMat.color.copy(cloudCol); cloudMat.opacity = day ? 0.85 + storm * 0.1 : 0.45;

      // Butterflies update
      if (bflyMesh) {
        butterflies.forEach((b, i) => {
          if (storm > 0.4 || !day) {
            bflyDummy.scale.set(0, 0, 0);
          } else {
            const angle = t * b.speed + b.offset;
            const bx = b.cx + Math.cos(angle) * b.rx + Math.sin(angle * 1.6) * 0.4;
            const bz = b.cz + Math.sin(angle * 1.2) * b.rz + Math.cos(angle * 0.9) * 0.4;
            const gy = L.ground(bx, bz);
            const by = gy + 0.35 + Math.sin(t * 3.2 + b.offset) * 0.22;
            const flap = Math.sin(t * b.flapSpeed + b.offset);
            const yaw = Math.atan2(-Math.sin(angle), Math.cos(angle));

            bflyDummy.position.set(bx, by, bz);
            bflyDummy.rotation.set(Math.sin(t * 2) * 0.2, yaw, 0);
            bflyDummy.scale.set((0.4 + Math.abs(flap) * 0.6) * 0.8, 0.8, 0.8);
          }
          bflyDummy.updateMatrix();
          bflyMesh.setMatrixAt(i, bflyDummy.matrix);
        });
        bflyMesh.instanceMatrix.needsUpdate = true;
      }

      // Birds update: idle perch with scattering response to player proximity
      if (birdMesh) {
        const px = focus ? focus.x : 0, pz = focus ? focus.z : 0;
        birds.forEach((bd) => {
          const dPlayer = Math.hypot(bd.x - px, bd.z - pz);
          if (bd.state === 'perch') {
            bd.timer -= dt;
            if (dPlayer < 4.8 || bd.timer <= 0) {
              bd.state = 'fly';
              bd.timer = 4 + Math.random() * 4;
              const nextP = perches[Math.floor(Math.random() * perches.length)];
              bd.target = [nextP[0], nextP[1] + (dPlayer < 4.8 ? 0.3 : 0), nextP[2]];
            }
          } else {
            const dx = bd.target[0] - bd.x, dz = bd.target[2] - bd.z;
            const dist = Math.hypot(dx, dz);
            bd.flap += dt * 18;
            if (dist < 0.6 || bd.timer <= 0) {
              bd.state = 'perch';
              bd.x = bd.target[0]; bd.y = bd.target[1]; bd.z = bd.target[2];
              bd.timer = 5 + Math.random() * 8;
            } else {
              const sp = 4.6;
              const wantYaw = Math.atan2(dx, dz);
              let dy = wantYaw - bd.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
              bd.yaw += dy * Math.min(1, dt * 7);
              bd.x += Math.sin(bd.yaw) * sp * dt;
              bd.z += Math.cos(bd.yaw) * sp * dt;
              const cruiseY = Math.max(bd.target[1], L.ground(bd.x, bd.z)) + 2.4;
              bd.y += (cruiseY - bd.y) * Math.min(1, dt * 5);
            }
          }

          birdDummy.position.set(bd.x, bd.y, bd.z);
          birdDummy.rotation.set(bd.state === 'fly' ? 0.15 : 0, bd.yaw, bd.state === 'fly' ? Math.sin(bd.flap) * 0.12 : 0);
          birdDummy.scale.set(0.9, 0.9, 0.9);
          birdDummy.updateMatrix();
          birdMesh.setMatrixAt(i, birdDummy.matrix);
        });
        birdMesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
      Object.values(geos).forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); cloudMat.dispose(); puff.dispose();
      if (bflyMesh) { bflyMesh.dispose(); bflyGeo.dispose(); bflyMat.dispose(); scene.remove(bflyMesh); }
      if (birdMesh) { birdMesh.dispose(); birdGeo.dispose(); birdMat.dispose(); scene.remove(birdMesh); }
      scene.remove(group); scene.remove(clouds);
    },
  };
}
