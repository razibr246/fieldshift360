import test from 'node:test';
import assert from 'node:assert/strict';
import { FARMER_IDS, REGIONS } from './regions.js';

const LOOK_FIELDS = ['skin', 'hair', 'build', 'head', 'top', 'topA', 'lower', 'lowA', 'feet', 'feetA'];
const COLORS = ['skin', 'hair', 'topA', 'lowA', 'feetA'];
const HEADS = new Set(['bare', 'cap', 'gamcha', 'gaungbaung', 'hijab', 'orhni', 'short', 'sindhi', 'tupi', 'turban']);
const TOPS = new Set(['blouse', 'choli', 'eingyi', 'fotua', 'kameez', 'kurta', 'polo', 'sweater', 'tego']);
const LOWERS = new Set(['cargo', 'dhoti', 'ghagra', 'kira', 'longyi', 'lungi', 'pyjama', 'sari', 'shalwar']);
const FEET = new Set(['jutti', 'sandal', 'shoe', 'sneaker']);

test('all twelve game farmers have complete, renderable regional looks', () => {
  assert.equal(FARMER_IDS.length, 12);
  for (const id of FARMER_IDS) {
    const farmer = REGIONS[id]?.farmer;
    assert.ok(farmer, `${id} has farmer data`);
    assert.ok(farmer.bn && farmer.en, `${id} has a bilingual name`);

    const look = farmer.look;
    assert.ok(look, `${id} has a look`);
    for (const field of LOOK_FIELDS) assert.ok(look[field] != null, `${id} look.${field} is required`);
    for (const color of COLORS) assert.match(look[color], /^#[\da-f]{6}$/i, `${id} look.${color} must be a hex color`);
    if (look.headA != null) assert.match(look.headA, /^#[\da-f]{6}$/i, `${id} look.headA must be a hex color`);
    assert.ok(Number.isFinite(look.build) && look.build >= 0.8 && look.build <= 1.2, `${id} build is in range`);
    assert.ok(HEADS.has(look.head), `${id} headwear is supported by the renderer`);
    assert.ok(TOPS.has(look.top), `${id} top is supported by the renderer`);
    assert.ok(LOWERS.has(look.lower), `${id} lower garment is supported by the renderer`);
    assert.ok(FEET.has(look.feet), `${id} footwear is supported by the renderer`);
  }
});
