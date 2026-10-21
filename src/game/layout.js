// Where everything stands in each farmer's world, with no 3D code: the simulation uses it for collisions and the
// ground height, the renderer (three/world.js) for what to draw. Positions are metres; x east, z south.
// The field is always at the middle, but each place is laid out the way that place is: where the house stands, which
// way the road runs, where the water comes from, where people run to in a storm — Dhamrai's shops on a paved road
// under the kiln smoke, Punjab's straight farm roads, Dadu's houses below the raised road, Kailali's longhouse at the
// forest edge, Punakha's house up the terraces, Singu's village strung along a sandy road. `air` is the haze, dust or
// fog of the place, and `smoke` where smoke rises. Randomness is seeded so a world looks the same every time.
import { SPOTS, FIELD_W, FIELD_D, WORLD_R } from './regions.js';

export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const smooth = (t) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const bump = (x, z, cx, cz, r, h) => { const d = Math.hypot(x - cx, z - cz); return d >= r ? 0 : h * smooth(1 - d / r); };
const ridge = (v, c, half, h) => { const d = Math.abs(v - c); return d >= half ? 0 : h * smooth(1 - d / half); };
// Gentle rolling ground, flat where the field is.
const roll = (x, z) => (Math.sin(x * 0.11) * Math.cos(z * 0.09) + Math.sin((x + z) * 0.05)) * 0.18;
const nearField = (x, z) => smooth((Math.max(Math.abs(x) - FIELD_W / 2, Math.abs(z) - FIELD_D / 2) - 2) / 8);
// turned to face a point (the field's middle unless told)
const face = (x, z, tx = 0, tz = 0) => Math.atan2(tx - x, tz - z);

// A world's stations: the shared radii, at the places this world puts them.
function stations(at) {
  const S = {};
  for (const [k, v] of Object.entries(at)) S[k] = { x: v[0], z: v[1], r: SPOTS[k]?.r ?? 0 };
  return S;
}
// d metres beyond a station, away from the field, turned to face the field: where its building or pump stands.
const behind = (S, id, d) => { const s = S[id], l = Math.hypot(s.x, s.z) || 1; const x = s.x + (s.x / l) * d, z = s.z + (s.z / l) * d; return [x, z, face(x, z)]; };

function maker(seed, S) {
  const r = seeded(seed), props = [];
  const add = (type, x, z, o = {}) => props.push({ type, x, z, rot: o.rot ?? r() * Math.PI * 2, s: o.s ?? 0.85 + r() * 0.3, ...o });
  const addBehind = (type, id, d, o = {}) => { const [x, z, rot] = behind(S, id, d); add(type, x, z, { rot, s: 1, ...o }); };
  // the home, the shop and the kiosk every world has, in its own style
  const common = (o) => {
    add(o.house, S.house.x, S.house.z, { rot: face(S.house.x, S.house.z, S.start.x, S.start.z), s: 1, main: true });
    for (const [x, z] of o.neighbours ?? []) add(o.house, x, z, { rot: face(x, z, S.house.x, S.house.z) + (r() - 0.5) * 0.8, s: 0.85 });
    add('shed', S.shed.x, S.shed.z, { rot: face(S.shed.x, S.shed.z, ...(o.shedFaces ?? [0, 0])), s: 1, style: o.shed });
    addBehind('kiosk', 'kiosk', 2.2, { style: o.kiosk });
    for (let k = 0; k < (o.hens ?? 6); k++) add('chicken', S.house.x + (r() - 0.5) * 6, S.house.z + 3 + r() * 3, { s: 1 });
  };
  return { r, props, add, addBehind, common };
}

// Neighbouring fields stretching away beyond the farm: [x0, x1, z0, z1, kind].
const patchwork = (r, kinds, n = 26) => {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, d = 50 + r() * 70, w = 14 + r() * 16, h = 10 + r() * 14;
    out.push([Math.cos(a) * d - w / 2, Math.cos(a) * d + w / 2, Math.sin(a) * d - h / 2, Math.sin(a) * d + h / 2, kinds[Math.floor(r() * kinds.length)]]);
  }
  return out;
};
// trees in a row from a to b, every `step` metres, leaving a gap round any of the given points
const row = (add, type, [ax, az], [bx, bz], step, gaps = [], o = {}) => {
  const n = Math.floor(Math.hypot(bx - ax, bz - az) / step);
  for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n; if (!gaps.some(([gx, gz, gr = 4]) => Math.hypot(x - gx, z - gz) < gr)) add(type, x, z, o); }
};

const WORLDS = {
  // ---- Bangladesh ----
  // Dhamrai, on Dhaka's edge: a paved road north of the field with the shop and the digital centre on it, the van
  // stand at its east end, the school beyond; the home on its raised plinth to the west; brick kilns smoking on the
  // skyline; the Bangshi to the south.
  dhamrai: () => {
    const S = stations({ start: [-17, -4], house: [-26, -2], shed: [-8, -19], kiosk: [9, -19], water: [17, 5], market: [31, -12], safe: [-3, -33] });
    const { r, props, add, addBehind, common } = maker(61, S);
    common({ house: 'tinhouse', shed: 'brick', kiosk: 'udc', neighbours: [[-31, 8], [-20, -22], [20, -22]], shedFaces: [-8, -10] });
    [[-34, -8], [-32, 3], [-14, -26], [14, -27], [36, -22]].forEach(([x, z]) => add('bamboo', x, z));
    [[-22, 8], [-36, -1], [24, -26], [-36, -19]].forEach(([x, z]) => add('banana', x, z));
    [[30, 14], [-26, 16], [8, 24], [-8, 24], [22, 22]].forEach(([x, z]) => add('mango', x, z));
    add('kup', -30, 2.5, { s: 0.9 }); add('cow', -31, -5, { rot: 1.2, s: 1 });
    addBehind('stw', 'water', 1.8);
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.6, s: 1 });
    addBehind('school', 'safe', 4.6);
    [[-30, -14], [-22, -14], [14, -14], [24, -14]].forEach(([x, z]) => add('pole', x, z - 1.6, { rot: 0, s: 1 }));
    for (let k = 0; k < 3; k++) add('kiln', -60 + k * 42, -70 - k * 8, { rot: 0, s: 1 });
    for (let k = 0; k < 4; k++) add('duck', -4 + r() * 8, 40 + r() * 3, { s: 1 });
    return {
      spots: S, grass: '#7fae4c', soil: '#7a6248', path: '#a08868', sky: 'hazy',
      paths: [[[-44, -14], [44, -14]], [[-26, -2], [-17, -4], [-13, -14]], [[-3, -14], [-3, -28]], [[11.7, 3], [17, 5]], [[0, 5.7], [0, 32]], [[-11.7, -3], [-17, -4]], [[-8, -14], [-8, -17]], [[9, -14], [9, -17]], [[31, -14], [31, -12]], [[0, -5.7], [0, -14]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 38, z1: 160, y: -0.5, color: '#6f9a9a' }],
      sandbank: { z0: 33, z1: 38 }, far: 'dhaka',
      air: { fog: '#c9c0aa', near: 34, far: 170 },
      smoke: [[-60, 18.5, -70, 1.4], [-18, 18.5, -78, 1.4], [24, 18.5, -86, 1.4], [S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['mustard', 'paddy', 'mustard', 'wheat']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.house.x, S.house.z, 8, 0.9) + ridge(z, -14, 1.6, 0.3) + (z > 33 ? -0.5 * smooth((z - 33) / 5) : 0),
    };
  },
  // Godagari, on the Barind: red undulating land, a deep tube well north of the field with a concrete channel down to
  // it, the house on the high ground to the east, mango orchards west and south, the road south to Kakanhat, palmyras
  // along the bunds, the Padma beyond the char to the north.
  barind: () => {
    const S = stations({ start: [16, -10], house: [25, -17], shed: [27, 6], kiosk: [-21, 12], water: [-3, -17], market: [-8, 24], safe: [-27, -20] });
    const { r, props, add, addBehind, common } = maker(11, S);
    common({ house: 'tinhouse', shed: 'brick', kiosk: 'udc', neighbours: [[34, -8]] });
    props.forEach((p) => { if (p.type === 'tinhouse') p.mud = true; });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) add('mango', -43 + j * 5 + r() * 1.2, 0 + i * 5 + r() * 1.2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add('mango', 10 + j * 6 + r() * 1.5, 26 + i * 5 + r() * 1.5);
    [[-14, -9], [14, -9], [-15, 9], [15, 9], [36, -2], [-14, -32], [22, -31], [8, -28], [36, 17], [-28, 34]].forEach(([x, z]) => add('toddy', x, z, { s: 0.8 }));
    add('kup', 30, -12, { s: 1 }); add('kup', 32.5, -14.5, { s: 0.8 }); add('cow', 31, -21, { rot: 2.2, s: 1 });
    addBehind('pumphouse', 'water', 2);
    add('channel', -3, -10.6, { len: 9, rot: 0 });
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.5, s: 1 });
    addBehind('school', 'safe', 4.6);
    [[-8, 30], [-8, 37], [20, -10], [28, 0]].forEach(([x, z]) => add('pole', x + 1.6, z, { rot: 0, s: 1 }));
    return {
      spots: S, grass: '#a8a456', soil: '#b9693d', path: '#c47a48', sand: '#e3cf9f', sky: 'dusty',
      paths: [[[16, -10], [25, -14]], [[11.7, -3], [16, -10]], [[11.7, 3], [27, 6]], [[-3, -5.7], [-3, -15]], [[0, 5.7], [-8, 22], [-8, 44]], [[-11.7, 3], [-21, 12]], [[-11.7, -4], [-24, -17]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: -160, z1: -52, y: -0.6, color: '#5d8fa6' }],
      sandbank: { z0: -52, z1: -44 }, far: 'plain',
      air: { fog: '#dcc7a0', near: 55, far: 230 },
      smoke: [[S.house.x - 2, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['wheat', 'bare', 'mustard', 'stubble']),
      props, height: (x, z) => roll(x, z) * 1.6 * nearField(x, z) + (x > 16 ? Math.min(1.4, (x - 16) * 0.12) * nearField(x, z) : 0) + (z < -44 ? -0.5 * smooth((-44 - z) / 8) : 0),
    };
  },
  // Sitakunda: a strip between the hills and the sea. The Dhaka–Chattogram highway runs north–south west of the
  // field with the shop and the wholesalers' depot on it; the house sits at the foot of the hills to the east with the
  // bean trellises below it; the cyclone shelter stands to the south.
  sitakunda: () => {
    const S = stations({ start: [14, -9], house: [22, -15], shed: [-25, -5], kiosk: [-12, -21], water: [7, -13], market: [-25, 15], safe: [2, 30] });
    const { r, props, add, addBehind, common } = maker(67, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[30, -24], [-33, 22]], shedFaces: [-22, -5] });
    [[16, -22], [28, -8], [-31, 6], [-31, -14], [10, 24], [-14, 26], [26, 24], [-31, 28]].forEach(([x, z]) => add('coconut', x, z));
    [[19, -26], [31, -18], [-14, -30], [16, 30]].forEach(([x, z]) => add('betelnut', x, z));
    for (let k = 0; k < 3; k++) add('trellis', 20 + k * 4.2, 2 + (k % 2) * 4, { rot: 0, s: 1 });
    add('trellis', 22, 12, { rot: 0.3, s: 1 });
    add('cow', 27, -12, { rot: 1.2, s: 1 }); add('goat', 26, -10, { rot: 0.4, s: 1 });
    addBehind('stw', 'water', 1.8);
    add('truck', -28.5, 15, { rot: 0, s: 1 }); add('van', S.market.x + 2, S.market.z - 3, { rot: 1.2, s: 1 });
    addBehind('shelter', 'safe', 1);
    [[-28, -30], [-28, -16], [-28, 2], [-28, 28]].forEach(([x, z]) => add('pole', x, z, { rot: 0, s: 1 }));
    return {
      spots: S, grass: '#79aa4a', soil: '#7a5e44', path: '#9c8462', sky: 'clear',
      paths: [[[-25, -44], [-25, 44]], [[-11.7, 0], [-25, 0]], [[14, -9], [22, -12]], [[11.7, -3], [14, -9]], [[7, -5.7], [7, -11]], [[0, 5.7], [2, 25]], [[-11.7, -4], [-12, -18]]],
      water: [{ kind: 'river', x0: -170, x1: -54, z0: -170, z1: 170, y: -0.6, color: '#5f8fa8' }],
      far: 'chittagong',
      air: { fog: '#d3e3ea', near: 80, far: 320 },
      smoke: [[S.house.x - 1, 2.6, S.house.z - 1, 0.5]],
      patches: patchwork(r, ['paddy', 'paddy', 'mustard']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + (x > 18 ? Math.min(2.2, (x - 18) * 0.25) * nearField(x, z) : 0) + (x > 32 ? Math.min(9, (x - 32) * 0.7) : 0) + ridge(x, -25, 1.8, 0.35) + (x < -46 ? -0.6 : 0),
    };
  },
  // Dacope, inside the embankment: the market is the ghat on the Pasur, over the embankment to the north, where the
  // boats leave for Chalna; the sweet-water pond and the shrimp ghers lie east; the cyclone shelter south; the
  // golpata house west, and the canal along the south with its bamboo bridge.
  coast: () => {
    const S = stations({ start: [-16, -8], house: [-25, -10], shed: [-26, 6], kiosk: [-8, 15], water: [18, -5], market: [-14, -38], safe: [16, 24] });
    const { r, props, add, addBehind, common } = maker(23, S);
    common({ house: 'thatchhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-34, -2], [-30, -22]] });
    [[-30, -16], [-20, -17], [-34, 4], [-20, 2], [6, 26], [28, 18], [-24, 14], [-38, 12], [2, -24], [-30, -30]].forEach(([x, z]) => add('coconut', x, z));
    for (let k = 0; k < 12; k++) add('nipa', -44 + k * 3 + r(), 25.6 + r() * 0.8);
    add('kup', -30, -6, { s: 0.85 }); add('goat', -21, -14, { rot: 0.4, s: 1 }); add('goat', -23, -15.5, { rot: 2, s: 0.8 });
    add('pond', S.water.x + 6.5, S.water.z - 1, { rot: 0, s: 1 });
    add('ghat', S.water.x + 1.6, S.water.z - 0.4, { rot: -Math.PI / 2, s: 1 });
    add('ghat', S.market.x, S.market.z - 4.2, { rot: Math.PI, s: 1 });
    add('boat', S.market.x + 1, S.market.z - 9.5, { rot: Math.PI / 2 + 0.1, s: 1.1, cargo: '#3f8a34' });
    add('boat', S.market.x + 12, S.market.z - 11, { rot: Math.PI / 2 - 0.2, s: 1, cargo: false });
    add('bamboobridge', -32, 21, { rot: 0, s: 1 });
    add('boat', -20, 22, { rot: Math.PI / 2, s: 0.9, cargo: '#3f8a34' });
    addBehind('shelter', 'safe', 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) add('gher', 30 + j * 9, -24 + i * 9, { rot: 0, s: 1 });
    add('stilthut', 34.5, 2.5, { rot: -0.6, s: 1 });
    for (let k = 0; k < 6; k++) add('duck', S.water.x + 4 + r() * 5, S.water.z - 3 + r() * 4, { s: 1 });
    for (let k = 0; k < 60; k++) add('mangrove', -120 + k * 4 + r() * 3, -88 - r() * 14, { s: 1.3 + r() * 0.9 });
    return {
      spots: S, grass: '#7aa84c', soil: '#76604a', path: '#9a8566', sand: '#8d8a66', sky: 'clear',
      paths: [[[-44, -39], [44, -39]], [[-16, -8], [-25, -8]], [[-11.7, -3], [-16, -8]], [[-11.7, 2], [-26, 6]], [[-4, -5.7], [-14, -36]], [[11.7, -3], [18, -5]], [[0, 5.7], [-8, 15]], [[11.7, 4], [16, 20]]],
      water: [
        { kind: 'river', x0: -160, x1: 160, z0: -150, z1: -46, y: -0.5, color: '#6f8a7d' },
        { kind: 'canal', x0: -70, x1: -6, z0: 19.4, z1: 24.2, y: -0.35, color: '#5f8c7c' },
        { kind: 'pond', cx: S.water.x + 6.5, cz: S.water.z - 1, r: 5.2, y: -0.25, color: '#4f8d86' },
        ...[0, 1, 2].flatMap((i) => [0, 1].map((j) => ({ kind: 'gher', x0: 26.4 + j * 9, x1: 33.6 + j * 9, z0: -27.6 + i * 9, z1: -20.4 + i * 9, y: -0.15, color: '#7c9c8a' }))),
      ],
      far: 'mangrove',
      air: { fog: '#d5e0d8', near: 60, far: 260 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props, height: (x, z) => roll(x, z) * 0.6 * nearField(x, z) + ridge(z, -39, 5, 2.4) + bump(x, z, S.house.x, S.house.z, 8, 0.8) + (z < -44 ? -0.6 : 0),
    };
  },
  // Bakerganj: the canals are the roads. The market is a boat ghat on the east canal, the low-lift pump draws from it,
  // the raised embankment road runs along the north, the house stands on its plinth between the canals in the south-
  // west, and a guava garden grows south of the west canal.
  tidal: () => {
    const S = stations({ start: [-14, 9], house: [-22, 11], shed: [-24, -6], kiosk: [6, 15], water: [19, 4], market: [19, -16], safe: [-6, -29] });
    const { r, props, add, addBehind, common } = maker(71, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-32, 6], [-14, 16]] });
    [[-28, 2], [-16, 4], [-32, 14], [-26, -16], [-36, -6], [10, -22], [12, 24], [-14, -18]].forEach(([x, z]) => add('coconut', x, z));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add('guava', -2 + j * 5 + r(), 28 + i * 4.5 + r());
    for (let k = 0; k < 14; k++) add('nipa', -44 + k * 3 + r(), 25.8 + r() * 0.8);
    add('kup', -27, 7, { s: 0.85 }); add('cow', -17, 6, { rot: 1.2, s: 1 });
    addBehind('llp', 'water', 2.1);
    add('ghat', 21.5, S.market.z, { rot: Math.PI / 2, s: 1 });
    add('boat', 24.1, S.market.z + 3, { rot: 0.05, s: 1, cargo: '#b5d06a' });
    add('boat', 24.1, S.market.z - 7, { rot: -0.05, s: 0.9, cargo: '#b5d06a' });
    for (let k = 0; k < 3; k++) add('boat', -40 + k * 9, 22 + r() * 1.5, { rot: Math.PI / 2 + r() * 0.3, s: 0.9, cargo: '#b5d06a' });
    add('bamboobridge', -32, 21, { rot: 0, s: 1 });
    addBehind('tilashed', 'safe', 1, { s: 1.2 });
    for (let k = 0; k < 8; k++) add('duck', 23 + r() * 2, -20 + r() * 30, { s: 1 });
    return {
      spots: S, grass: '#76aa48', soil: '#6e5a44', path: '#9a8566', sky: 'clear',
      paths: [[[-44, -29], [22, -29]], [[-14, 9], [-22, 9]], [[-11.7, 3], [-14, 9]], [[-11.7, -2], [-24, -6]], [[11.7, 3], [19, 4]], [[11.7, -4], [19, -16]], [[0, 5.7], [6, 15]], [[-3, -5.7], [-6, -25]]],
      water: [
        { kind: 'canal', x0: -70, x1: -6, z0: 19.4, z1: 24.2, y: -0.35, color: '#5f8c84' },
        { kind: 'canal', x0: 22.6, x1: 25.6, z0: -60, z1: 60, y: -0.35, color: '#5f8c84' },
        { kind: 'river', x0: -160, x1: 160, z0: -160, z1: -48, y: -0.5, color: '#6a9590' },
      ],
      far: 'rivers',
      air: { fog: '#d3e2d9', near: 60, far: 260 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props, height: (x, z) => roll(x, z) * 0.5 * nearField(x, z) + ridge(z, S.safe.z, 4.2, 2.2) * (x < 22 ? 1 : 0) + bump(x, z, S.house.x, S.house.z, 7, 0.8) + (z < -44 ? -0.5 : 0),
    };
  },
  // Gangachara, on a Teesta char: everything is sand and wind. The house sits on its plinth out towards the river, the
  // mainland bazar and the Union Parishad are north, the market road leaves west, and winter fog lies thick.
  char: () => {
    const S = stations({ start: [8, 12], house: [15, 21], shed: [-8, -21], kiosk: [21, -17], water: [-18, -6], market: [-29, 10], safe: [-25, -28] });
    const { r, props, add, addBehind, common } = maker(73, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[25, 17], [4, 24]] });
    [[22, 26], [8, 28], [-30, -12], [-14, -30], [30, -26], [-36, 20]].forEach(([x, z]) => add('bamboo', x, z));
    [[30, 4], [-30, 22], [-4, -30], [24, -6], [-36, -6], [10, -28]].forEach(([x, z]) => add('mango', x, z));
    add('kup', 20, 16, { s: 0.9 }); add('kup', 10, 18, { s: 0.75 }); add('cow', 22, 22, { rot: 1.2, s: 1 });
    addBehind('stw', 'water', 1.8);
    add('van', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.5, s: 1 });
    addBehind('school', 'safe', 4.6);
    return {
      spots: S, grass: '#8fae58', soil: '#9a8462', path: '#c2ad84', sand: '#e6dcc0', sky: 'foggy',
      paths: [[[8, 12], [15, 18]], [[2, 5.7], [8, 12]], [[-4, -5.7], [-8, -18]], [[-11.7, -3], [-18, -6]], [[-11.7, 4], [-29, 10]], [[11.7, -3], [21, -14]], [[-8, -21], [-22, -26]], [[15, 22], [15, 40]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 44, z1: 160, y: -0.5, color: '#7aa0a6' }],
      sandbank: { z0: 26, z1: 44 }, far: 'char',
      air: { fog: '#e1e5e2', near: 12, far: 80 },
      smoke: [[S.house.x - 2, 2.4, S.house.z - 1, 0.6]],
      patches: patchwork(r, ['bare', 'mustard', 'wheat', 'bare']),
      props, height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.house.x, S.house.z, 8, 1.1) + (z > 36 ? -0.5 * smooth((z - 36) / 8) : 0),
    };
  },
  // Gowainghat: the homestead stands on its own raised mound at the haor's edge to the south, the market is a boat
  // ghat on the haor, the pump draws from the canal to the east, the shelter hillock with its tea bushes rises to the
  // north-west, and the stony Piyain runs under the Meghalaya hills to the north.
  haor: () => {
    const S = stations({ start: [-4, 12], house: [-9, 21], shed: [-26, -4], kiosk: [-22, 13], water: [19, 6], market: [14, 25], safe: [-22, -27] });
    const { r, props, add, addBehind, common } = maker(37, S);
    common({ house: 'tinhouse', shed: 'thatch', kiosk: 'udc', neighbours: [[-17, 24]] });
    [[-28, -12], [-12, -20], [-32, 2], [-32, 18], [10, -18], [4, 22]].forEach(([x, z]) => add('bamboo', x, z));
    [[-15, 16], [-3, 25], [-34, -16], [8, -26]].forEach(([x, z]) => add('betelnut', x, z));
    for (let k = 0; k < 10; k++) add('hijal', -30 + k * 7 + r() * 3, 36 + r() * 8, { s: 1 + r() * 0.4 });
    add('kup', -14, 22.5, { s: 0.9 }); add('cow', -2, 17, { rot: 2.2, s: 0.95 });
    addBehind('llp', 'water', 2.1);
    add('ghat', S.market.x, 28, { rot: 0, s: 1 });
    add('boat', S.market.x + 0.5, 32.5, { rot: Math.PI / 2, s: 1.1, cargo: '#e2c23a' });
    for (let k = 0; k < 4; k++) add('boat', -20 + k * 12 + r() * 4, 42 + r() * 6, { rot: r() * 3, s: 1, cargo: false });
    addBehind('tilashed', 'safe', 1.5);
    for (let k = 0; k < 4; k++) add('stoneboat', -30 + k * 16 + r() * 5, -51 + r() * 2, { rot: 0.2 + r() * 0.3, s: 1 });
    for (let k = 0; k < 7; k++) add('duck', -10 + r() * 12, 34 + r() * 4, { s: 1 });
    for (let k = 0; k < 120; k++) add('stone', -60 + r() * 120, -45 - r() * 4, { s: 0.3 + r() * 0.7 });
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) add('tea', 30 + j * 2.2, -26 + i * 4.4 + (j % 2) * 1.1, { s: 1 });
    for (let a = 0; a < 26; a++) { const ang = (a / 26) * Math.PI * 2, d = 7.6 + (a % 2) * 1.6; add('tea', S.safe.x + Math.cos(ang) * d, S.safe.z + Math.sin(ang) * d, { s: 0.95 }); }
    return {
      spots: S, grass: '#6aa646', soil: '#5c4632', path: '#8b7655', sand: '#b8b3a0', sky: 'clear',
      paths: [[[-4, 12], [-8, 18]], [[0, 5.7], [-4, 12]], [[-11.7, -2], [-26, -4]], [[11.7, 3], [19, 6]], [[8, 5.7], [14, 23]], [[-11.7, 4], [-22, 13]], [[-11.7, -4], [-19, -21]], [[0, -5.7], [0, -42]]],
      water: [
        { kind: 'canal', x0: 22.6, x1: 25.4, z0: -44, z1: 30, y: -0.4, color: '#5e93a0' },
        { kind: 'haor', x0: -160, x1: 160, z0: 30, z1: 160, y: -0.3, color: '#6ca2b0' },
        { kind: 'river', x0: -160, x1: 160, z0: -150, z1: -48, y: -0.55, color: '#6fa9ad' },
      ],
      far: 'meghalaya',
      air: { fog: '#c9d6dc', near: 45, far: 220 },
      smoke: [[S.house.x + 2, 2.6, S.house.z - 1, 0.5]],
      props,
      height: (x, z) => roll(x, z) * nearField(x, z) + bump(x, z, S.safe.x, S.safe.z, 11, 3.2) + bump(x, z, S.house.x, S.house.z, 9, 1.2) + (x > 27 ? Math.min(4, (x - 27) * 0.25) * smooth((z + 32) / 6) * smooth((28 - z) / 6) : 0) + (z > 30 ? -0.5 : 0) + (z < -45 ? -0.5 : 0),
    };
  },

  // Sangrur: straight farm roads on a grid, lined with eucalyptus. The brick kothi stands at the crossroads, the
  // tubewell room north of the field with its channel, the trolley leaves south for the mandi, the gurdwara north, and
  // the smoke of burning straw rises from the neighbours' fields.
  punjab: () => {
    const S = stations({ start: [-17, -13], house: [-25, -19], shed: [-21, 3], kiosk: [21, -14], water: [7, -13], market: [-17, 25], safe: [4, -30] });
    const { r, props, add, addBehind, common } = maker(11, S);
    common({ house: 'brickhouse', shed: 'brick', kiosk: 'csc', neighbours: [[-33, -27]], shedFaces: [-16, 3] });
    row(add, 'eucalyptus', [-42, -12.4], [42, -12.4], 6, [[S.water.x, S.water.z, 4], [S.kiosk.x, S.kiosk.z, 5], [-16, -12.4, 3], [S.safe.x - 1, -12.4, 3]]);
    row(add, 'eucalyptus', [-19, -40], [-19, 40], 6, [[-19, -12, 4], [-19, 3, 4], [-19, 25, 5]]);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) add('poplar', 28 + j * 3.2, 0 + i * 3.4, { s: 1 });
    add('kup', -31, -15, { s: 1 }); add('kup', -29, -24.5, { s: 0.85 });
    add('buffalo', -31, -20, { rot: 1.1, s: 1 }); add('buffalo', -32.5, -17.5, { rot: 1.5, s: 0.95 });
    add('tractor', -22, -12.2, { rot: Math.PI / 2, s: 1 });
    addBehind('pumphouse', 'water', 2.2);
    add('channel', 7, -8.6, { len: 5.4, rot: 0 });
    add('trolley', S.market.x + 2.4, S.market.z, { rot: 0, s: 1 });
    addBehind('gurdwara', 'safe', 5);
    [[-10, -8.6], [0, -8.6], [14, -8.6], [28, -8.6], [-15.1, 10], [-15.1, 18]].forEach(([x, z]) => add('pole', x, z, { rot: 0, s: 1 }));
    return {
      spots: S, grass: '#9fb15a', soil: '#8a6b4b', path: '#b59b74', sky: 'hazy',
      paths: [[[-44, -10], [44, -10]], [[-16.5, -44], [-16.5, 44]], [[-16.5, -13], [-25, -16]], [[-16.5, 3], [-21, 3]], [[7, -10], [7, -11]], [[21, -10], [21, -12]], [[4, -10], [4, -25]], [[-16.5, 25], [-17, 25]], [[-11.7, 0], [-16.5, 0]]],
      water: [], far: 'plain',
      air: { fog: '#d6cdb6', near: 38, far: 190 },
      smoke: [[62, 0.6, 40, 2.6], [-70, 0.6, 55, 2.6], [48, 0.6, -64, 2.6], [S.house.x + 2, 4.5, S.house.z, 0.5]],
      patches: patchwork(r, ['wheat', 'stubble', 'wheat', 'mustard', 'stubble']),
      props,
      height: (x, z) => roll(x, z) * 0.4 * nearField(x, z),
    };
  },
  // Dadu: the mud houses huddle below the raised road on the north, where the dhaba and the trucks stand and where
  // everyone camped through the 2022 flood; the canal outlet is on the east; the donkey cart goes west to the mandi past
  // the date grove; the Kirthar range on the western skyline; dust in the air.
  sindh: () => {
    const S = stations({ start: [-18, -10], house: [-26, -15], shed: [-14, -21], kiosk: [6, 18], water: [19, 10], market: [-28, 12], safe: [8, -29] });
    const { r, props, add, addBehind, common } = maker(23, S);
    common({ house: 'mudhouse', shed: 'mud', kiosk: 'office', neighbours: [[-34, -8], [-33, -22], [-20, -24]], shedFaces: [-14, -10] });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) add('date', -43 + j * 5 + r() * 1.5, 16 + i * 5 + r() * 1.5);
    [[-8, -15], [9, -14], [-26, 2], [32, -18], [-6, 23], [14, 26], [34, 20], [-18, 32]].forEach(([x, z]) => add('kikar', x, z));
    add('charpai', -22, -7.8, { rot: 0.3, s: 1 }); add('pots', -29.5, -11.5, { s: 1 });
    add('buffalo', -31, -13, { rot: 1.1, s: 1 }); add('buffalo', -22, -19, { rot: 2.4, s: 0.9 });
    add('kup', -36, -16, { s: 0.8 });
    addBehind('mogha', 'water', 2.6);
    add('donkeycart', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z) + 0.5, s: 1 });
    add('truck', S.safe.x + 8.5, S.safe.z - 0.4, { rot: Math.PI / 2, s: 1 });
    add('dhaba', S.safe.x - 4.5, S.safe.z - 2.6, { rot: 0, s: 1 });
    return {
      spots: S, grass: '#b6ab78', soil: '#8b7255', path: '#c9b58c', sky: 'dusty',
      paths: [[[-44, -29], [22, -29]], [[-18, -10], [-26, -12]], [[-11.7, -3], [-18, -10]], [[-14, -12], [-14, -19]], [[-14, -23], [-14, -27]], [[11.7, 4], [19, 10]], [[-11.7, 4], [-28, 12]], [[4, 5.7], [6, 16]], [[4, -5.7], [8, -25]]],
      water: [{ kind: 'canal', x0: 22.6, x1: 25.6, z0: -60, z1: 60, y: -0.45, color: '#6f9a8f' }],
      far: 'kirthar',
      air: { fog: '#e2cfa6', near: 45, far: 210 },
      smoke: [[S.safe.x - 4.5, 3.4, S.safe.z - 3, 0.6], [S.house.x + 2, 2.4, S.house.z, 0.5]],
      patches: patchwork(r, ['wheat', 'bare', 'stubble', 'sunflower']),
      bund: { z: S.safe.z, half: 4.2, h: 2.4 },
      props,
      height: (x, z) => roll(x, z) * 0.4 * nearField(x, z) + ridge(z, S.safe.z, 4.2, 2.4) * (x < 22 ? 1 : 0),
    };
  },
  // Kailali: the painted Tharu longhouse at the edge of the sal forest in the north-west, the women's group tubewell
  // west of the field, the watch machan at its corner, the cooperative shop and the ward office along the road to the
  // east, the vegetable collection centre south, and the river beyond.
  terai: () => {
    const S = stations({ start: [-15, -13], house: [-23, -22], shed: [23, -17], kiosk: [-4, 20], water: [-19, 4], market: [19, 16], safe: [31, 1] });
    const { r, props, add, addBehind, common } = maker(37, S);
    common({ house: 'tharuhouse', shed: 'thatch', kiosk: 'office', neighbours: [[-34, -14]] });
    for (let k = 0; k < 24; k++) add('sal', -42 + k * 3.6 + r() * 2, -36 - r() * 6, { s: 1 + r() * 0.3 });
    for (let k = 0; k < 9; k++) add('sal', -40 - r() * 3, -28 + k * 6 + r() * 2, { s: 1 + r() * 0.3 });
    [[-29, -24], [-14, -26], [-30, 4]].forEach(([x, z]) => add('banana', x, z));
    [[-8, -15], [10, -15], [30, 18], [-26, 14], [26, -26]].forEach(([x, z]) => add('mango', x, z));
    add('dehari', -19, -18.6, { s: 1 }); add('dehari', -18, -18.4, { s: 0.85 }); add('dehari', -20, -18.5, { s: 0.9 });
    add('machan', 14.5, -9, { rot: 0.3, s: 1 });
    add('kup', -27, -17, { s: 0.85 });
    add('cow', -29, -19, { rot: 1.2, s: 1 }); add('goat', -27, -21.5, { rot: 0.4, s: 1 });
    addBehind('stw', 'water', 1.8);
    add('stall', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z), s: 1, crates: '#d6402e' });
    addBehind('wardoffice', 'safe', 4.6);
    return {
      spots: S, grass: '#7cab4c', soil: '#6b5238', path: '#9c8360', sky: 'clear',
      paths: [[[-15, -13], [-23, -19]], [[-11.7, -4], [-15, -13]], [[27, -44], [27, 44]], [[11.7, -4], [23, -14]], [[-11.7, 3], [-19, 4]], [[11.7, 4], [19, 14]], [[0, 5.7], [-4, 18]], [[11.7, 0], [27, 1]], [[0, 6], [0, 32]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 38, z1: 160, y: -0.55, color: '#7fa9a6' }],
      sandbank: { z0: 33, z1: 38 },
      far: 'churia',
      air: { fog: '#d6e4da', near: 70, far: 280 },
      smoke: [[S.house.x + 2, 3, S.house.z, 0.5]],
      patches: patchwork(r, ['paddy', 'wheat', 'mustard', 'paddy']),
      props,
      height: (x, z) => roll(x, z) * nearField(x, z) + (z > 33 ? -0.5 * smooth((z - 33) / 5) : 0),
    };
  },
  // Lobesa: the farmhouse up the terraces to the north-west, the stream-fed channel coming down from the hills, Chimi
  // Lhakhang on its hill to the north-east, the RNR centre east, the potato auction yard on the river road to the
  // south, blue pine all round, the snow peaks behind, Punakha Dzong down the valley.
  punakha: () => {
    const S = stations({ start: [-20, -12], house: [-30, -22], shed: [-25, 6], kiosk: [25, -3], water: [-6, -20], market: [16, 22], safe: [27, -27] });
    const { r, props, add, addBehind, common } = maker(41, S);
    common({ house: 'bhutanhouse', shed: 'bhutan', kiosk: 'rnr', neighbours: [[-36, -10]] });
    add('chorten', -12, -10, { rot: 0, s: 1 }); add('chorten', 6, 22, { rot: 0.3, s: 0.8 });
    for (let k = 0; k < 7; k++) add('lungdar', 20 + k * 1.1, -20 + (k % 2) * 0.6, { rot: 0, s: 0.9 + r() * 0.3 });
    add('flagline', -18, -4, { rot: 0.4, len: 9, s: 1 });
    addBehind('lhakhang', 'safe', 1.5);
    for (let k = 0; k < 30; k++) { const a = r() * Math.PI * 2, d = 36 + r() * 8; const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.9 - 4; if (Math.hypot(x - S.safe.x, z - S.safe.z) < 10 || Math.hypot(x - S.house.x, z - S.house.z) < 7 || Math.abs(z - 28) < 2.5) continue; add('bluepine', x, z, { s: 0.9 + r() * 0.5 }); }
    [[-24, -26], [-34, -18]].forEach(([x, z]) => add('banana', x, z));
    add('cow', -24, -17, { rot: 1.4, s: 0.95 });
    addBehind('stream', 'water', 2.2);
    add('stall', S.market.x, S.market.z, { rot: face(S.market.x, S.market.z), s: 1, crates: '#c8a46a' });
    // terrace steps rise north, east and west of the field
    const terr = (x, z) => {
      const d = Math.max(0, Math.abs(x) - 26, -z - 18);
      return Math.floor(d / 3.2) * 0.9 + smooth(((d % 3.2) - 2.7) / 0.5) * 0.9;
    };
    return {
      spots: S, grass: '#86b25a', soil: '#7a5a40', path: '#a08a6a', sky: 'clear',
      paths: [[[-20, -12], [-30, -19]], [[-11.7, -4], [-20, -12]], [[-4, -5.7], [-6, -18]], [[-11.7, 3], [-25, 6]], [[8, 5.7], [16, 20]], [[11.7, -2], [25, -3]], [[11.7, -5], [22, -22]], [[-40, 28], [40, 28]]],
      water: [{ kind: 'river', x0: -160, x1: 160, z0: 34, z1: 160, y: -0.6, color: '#3fa6a0' }],
      sandbank: { z0: 30, z1: 34 },
      far: 'himalaya',
      terraces: true,
      air: { fog: '#e1ecf4', near: 110, far: 420 },
      smoke: [[S.house.x + 2, 5, S.house.z, 0.5]],
      props,
      height: (x, z) => terr(x, z) + roll(x, z) * 0.5 * nearField(x, z) + bump(x, z, S.safe.x, S.safe.z, 11, 3.4) + (z > 30 ? -0.5 * smooth((z - 30) / 4) : 0),
    };
  },
  // Singu: the village strung along a sandy road south of the field, toddy palms all along it, water pots for
  // passers-by, the stilt house and the seed shop on the road, the ox cart east to Chauk, the pond west, the township
  // office north-east, the monastery on its mound north, a white zedi, the Ayeyarwady to the west, hot orange air.
  dryzone: () => {
    const S = stations({ start: [-14, 10], house: [-21, 18], shed: [8, 19], kiosk: [22, -13], water: [-17, -10], market: [31, 14], safe: [4, -28] });
    const { r, props, add, addBehind, common } = maker(53, S);
    common({ house: 'stilthouse', shed: 'thatch', kiosk: 'office', neighbours: [[-33, 17], [20, 19]], shedFaces: [8, 12] });
    row(add, 'toddy', [-42, 15.5], [42, 15.5], 5.5, [[S.house.x, S.house.z, 5], [S.shed.x, S.shed.z, 4.5], [S.market.x, S.market.z, 4], [20, 19, 4.5], [-33, 17, 4.5], [-4, 14, 2.5]], { s: 0.95 });
    for (let k = 0; k < 10; k++) { const a = r() * Math.PI * 2, d = 26 + r() * 16; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > 8 || Math.hypot(x - S.safe.x, z - S.safe.z) < 10 || Math.hypot(x - S.kiosk.x, z - S.kiosk.z) < 5 || Math.hypot(x - S.water.x, z - S.water.z) < 10) continue; add('toddy', x, z, { s: 0.9 + r() * 0.3 }); }
    [[-8, -15], [-30, 0], [28, -24], [-6, 28]].forEach(([x, z]) => add('tamarind', x, z));
    add('waterpots', -4, 13.6, { rot: 0, s: 1 });
    add('zedi', 12, 30, { rot: 0, s: 1 });
    add('ox', -25.5, 22, { rot: 1.2, s: 1 }); add('ox', -27.6, 23.2, { rot: 1.5, s: 0.95 }); add('goat', -17, 23.5, { rot: 0.4, s: 1 });
    add('kup', -28, 26, { s: 0.8 });
    add('pond', S.water.x - 6.5, S.water.z - 1, { rot: 0, s: 1, rad: 5.2 });
    add('oxcart', S.market.x, S.market.z, { rot: Math.PI / 2, s: 1 });
    addBehind('kyaung', 'safe', 1.2);
    return {
      spots: S, grass: '#c4a56c', soil: '#a7744b', path: '#d4b886', sky: 'hot',
      paths: [[[-44, 12], [44, 12]], [[0, 5.7], [0, 12]], [[-14, 12], [-20, 15]], [[-11.7, -3], [-17, -10]], [[11.7, -3], [22, -11]], [[3, -5.7], [4, -23]], [[8, 12], [8, 17]], [[31, 12], [31, 14]]],
      water: [
        { kind: 'pond', cx: S.water.x - 6.5, cz: S.water.z - 1, r: 5.2, y: -0.3, color: '#6f9c94' },
        { kind: 'river', x0: -170, x1: -56, z0: -170, z1: 170, y: -0.6, color: '#8aa39a' },
      ],
      far: 'bagan',
      air: { fog: '#e8d2a8', near: 55, far: 240 },
      smoke: [[S.house.x + 2, 3.4, S.house.z, 0.5], [36, 1, -30, 1.2]],
      patches: patchwork(r, ['bare', 'sesame', 'groundnut', 'bare']),
      props,
      height: (x, z) => roll(x, z) * 0.6 * nearField(x, z) + bump(x, z, S.safe.x, S.safe.z, 10, 2.6) + ridge(z, 12, 1.6, 0.25),
    };
  },
};

// Things the farmer walks round: houses, sheds, trees. Water is handled separately (it is never walked into).
const SOLID = {
  brickhouse: (p) => ({ box: [3.4 * p.s, 2.6 * p.s] }), mudhouse: (p) => ({ box: [3.2 * p.s, 2.4 * p.s] }), tharuhouse: (p) => ({ box: [4 * p.s, 2.2 * p.s] }),
  bhutanhouse: (p) => ({ box: [3.2 * p.s, 2.6 * p.s] }), stilthouse: (p) => ({ box: [3 * p.s, 2.4 * p.s] }),
  shed: () => ({ box: [2.2, 2.6] }), kiosk: () => ({ box: [1.5, 1.3] }),
  gurdwara: () => ({ box: [4.2, 3] }), wardoffice: () => ({ box: [5, 1.9] }), lhakhang: () => ({ box: [2.4, 2] }), kyaung: () => ({ box: [3.2, 2.4] }), dhaba: () => ({ box: [1.6, 1.4] }),
  tinhouse: (p) => ({ box: [3.5 * p.s, 2.7 * p.s] }), thatchhouse: (p) => ({ box: [3.5 * p.s, 2.7 * p.s] }), school: () => ({ box: [7, 1.9] }), shelter: () => ({ pillars: true }), tilashed: () => ({ circle: 1.6 }), van: () => ({ circle: 1.1 }), llp: () => ({ circle: 0.9 }), trellis: () => ({ box: [1.5, 1.5] }), stilthut: () => ({ circle: 1.4 }),
  coconut: () => ({ circle: 0.4 }), betelnut: () => ({ circle: 0.25 }), bamboo: () => ({ circle: 1 }), guava: () => ({ circle: 0.4 }),
  pumphouse: () => ({ box: [1.4, 1.4] }), stw: () => ({ circle: 0.8 }), mogha: () => ({ circle: 0.6 }), stream: () => ({ circle: 0.6 }),
  trolley: () => ({ box: [1.3, 3] }), donkeycart: () => ({ circle: 1.3 }), oxcart: () => ({ circle: 1.5 }), stall: () => ({ box: [1.6, 1.2] }), truck: () => ({ box: [1.4, 3.6] }), tractor: () => ({ circle: 1.5 }),
  kup: (p) => ({ circle: 1.4 * p.s }), dehari: () => ({ circle: 0.35 }), machan: () => ({ circle: 1.2 }), chorten: (p) => ({ circle: 1.2 * p.s }), zedi: () => ({ circle: 2.2 }), waterpots: () => ({ box: [0.9, 0.4] }), charpai: () => ({ box: [1, 0.5] }),
  eucalyptus: () => ({ circle: 0.3 }), poplar: () => ({ circle: 0.25 }), date: () => ({ circle: 0.35 }), kikar: () => ({ circle: 0.35 }), sal: () => ({ circle: 0.45 }),
  mango: (p) => ({ circle: 0.55 * p.s }), banana: () => ({ circle: 0.4 }), bluepine: () => ({ circle: 0.4 }), toddy: () => ({ circle: 0.35 }), tamarind: () => ({ circle: 0.6 }),
  buffalo: () => ({ circle: 1 }), cow: () => ({ circle: 0.9 }), ox: () => ({ circle: 0.9 }), goat: () => ({ circle: 0.5 }), pole: () => ({ circle: 0.2 }),
};

const cache = {};
export function layoutFor(world) {
  if (cache[world]) return cache[world];
  const L = WORLDS[world]();
  L.S = L.spots;
  L.blockers = [];
  for (const p of L.props) {
    const s = SOLID[p.type]?.(p);
    if (!s) continue;
    if (s.circle) L.blockers.push({ x: p.x, z: p.z, r: s.circle });
    else if (s.pillars) { for (const dx of [-5, 0, 5]) for (const dz of [-2.6, 2.6]) L.blockers.push({ x: p.x + dx, z: p.z + dz, r: 0.4 }); }
    else { const c = Math.cos(p.rot), sn = Math.sin(p.rot); L.blockers.push({ x: p.x, z: p.z, hw: s.box[0], hd: s.box[1], c, s: sn }); }
  }
  // The ground dips under every pond, canal and river, so their water lies in a bed.
  const base = L.height;
  L.ground = (x, z) => {
    let h = base(x, z);
    for (const w of L.water) {
      const d = w.r ? w.r - Math.hypot(x - w.cx, z - w.cz) : Math.min(x - w.x0, w.x1 - x, z - w.z0, w.z1 - z);
      if (d > -1.2) { const t = smooth((d + 1.2) / 2.7); h = h * (1 - t) + (w.y - 0.6) * t; }
    }
    return h;
  };
  cache[world] = L;
  return L;
}
export const WORLD_IDS = Object.keys(WORLDS);

export function inWater(L, x, z) {
  for (const w of L.water) {
    if (w.r) { if (Math.hypot(x - w.cx, z - w.cz) < w.r - 0.3) return w; }
    else if (x > w.x0 + 0.3 && x < w.x1 - 0.3 && z > w.z0 + 0.3 && z < w.z1 - 0.3) return w;
  }
  return null;
}

// Push a point out of every blocker; keep it inside the walkable circle.
export function resolve(L, x, z, rad = 0.35) {
  for (const b of L.blockers) {
    if (b.r) {
      const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz), m = b.r + rad;
      if (d < m && d > 1e-4) { x = b.x + (dx / d) * m; z = b.z + (dz / d) * m; }
    } else {
      // into the box's own frame (a rotation `rot` about the vertical axis), out to the nearest side, and back
      const dx = x - b.x, dz = z - b.z;
      let u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c;
      const hw = b.hw + rad, hd = b.hd + rad;
      if (Math.abs(u) < hw && Math.abs(v) < hd) {
        if (hw - Math.abs(u) < hd - Math.abs(v)) u = Math.sign(u || 1) * hw; else v = Math.sign(v || 1) * hd;
        x = b.x + u * b.c + v * b.s; z = b.z - u * b.s + v * b.c;
      }
    }
  }
  const d = Math.hypot(x, z);
  if (d > WORLD_R) { x *= WORLD_R / d; z *= WORLD_R / d; }
  return [x, z];
}
