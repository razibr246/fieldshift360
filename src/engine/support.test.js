// The support matcher reads the farmer's real land, crops, water and place, never promises, and keeps every
// programme sourced and dated.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holdingClass, supportProfile, matchOne, matchSupport, askSupport, firstSteps, countFits, KINDS, STATUS } from './support.js';
import { BD_SUPPORT, AREA_TYPE, CHECKED } from '../data/support/bd_support.js';
import { IN_SUPPORT } from '../data/support/in_support.js';

const C = (id, bn, en) => ({ id, name: { bn, en } });
const lentil = C('lentil', 'মসুর ডাল', 'Lentil'), boro = C('boro', 'বোরো ধান', 'Boro rice'), wheat = C('wheat', 'গম', 'Wheat'), rice = C('rice', 'ধান', 'Rice');
const byId = (list, id) => list.find((p) => p.id === id);

test('farm-size classes follow the BBS census', () => {
  assert.equal(holdingClass(3).id, 'landless');
  assert.equal(holdingClass(49).id, 'marginal');
  assert.equal(holdingClass(50).id, 'small');
  assert.equal(holdingClass(249).id, 'small');
  assert.equal(holdingClass(250).id, 'medium');
  assert.equal(holdingClass(5000).id, 'large');
});

test('every programme is sourced, dated, bilingual and of a known kind and status', () => {
  assert.match(CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  for (const p of [...BD_SUPPORT, ...IN_SUPPORT]) {
    assert.match(p.src, /^https:\/\//, p.id);
    assert.ok(KINDS[p.kind], `${p.id} kind`);
    assert.ok(STATUS[p.status], `${p.id} status`);
    for (const k of ['name', 'by', 'benefit', 'who', 'where']) assert.ok(p[k]?.bn && p[k]?.en, `${p.id}.${k}`);
    for (const need of p.rule?.needs ?? []) assert.ok(byId(BD_SUPPORT, need), `${p.id} needs ${need}`);
  }
  assert.equal(new Set(BD_SUPPORT.map((p) => p.id)).size, BD_SUPPORT.length);
  for (const id of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) assert.ok(id in AREA_TYPE, id);
});

test('free seed and fertiliser: small farmers with a listed crop only', () => {
  const p = byId(BD_SUPPORT, 'prono_rabi');
  assert.equal(matchOne(p, supportProfile({ area_dec: 66, crops: [lentil] })).fit, 'yes');
  const big = matchOne(p, supportProfile({ area_dec: 300, crops: [lentil] }));
  assert.equal(big.fit, 'no');
  assert.match(big.why[0].en, /300 decimals/);
  assert.equal(matchOne(p, supportProfile({ area_dec: 66, crops: [boro] })).fit, 'no');
  assert.deepEqual(matchOne(p, supportProfile({ area_dec: 66, crops: [lentil] })).first, ['krishi_card']);
});

test('the 4% loan follows the crop, and names it', () => {
  const p = byId(BD_SUPPORT, 'credit_4pc');
  const m = matchOne(p, supportProfile({ area_dec: 66, crops: [boro, lentil] }));
  assert.equal(m.fit, 'yes');
  assert.match(m.why[0].bn, /মসুর ডাল/);
  assert.equal(matchOne(p, supportProfile({ area_dec: 66, crops: [boro] })).fit, 'no');
});

test('pilots, announcements and ended projects are never a plain yes', () => {
  const wibci = byId(BD_SUPPORT, 'wibci');
  assert.equal(matchOne(wibci, supportProfile({ area_dec: 66, district: 'Rajshahi' })).fit, 'maybe');
  assert.equal(matchOne(wibci, supportProfile({ area_dec: 66, district: 'Khulna' })).fit, 'no');
  assert.equal(matchOne(byId(BD_SUPPORT, 'loan_waiver'), supportProfile({ area_dec: 66 })).fit, 'maybe');
  const mach = matchOne(byId(BD_SUPPORT, 'machinery'), supportProfile({ area_dec: 66, area: 'coastal' }));
  assert.equal(mach.fit, 'maybe');
  assert.match(mach.why.at(-1).en, /70%/);
  assert.match(matchOne(byId(BD_SUPPORT, 'machinery'), supportProfile({ area_dec: 66, area: 'barind' })).why.at(-1).en, /50%/);
});

test('solar pumps only matter where the field lacks cheap water', () => {
  const p = byId(BD_SUPPORT, 'solar_pump');
  assert.equal(matchOne(p, supportProfile({ area_dec: 50, irrigation: 'none' })).fit, 'yes');
  assert.equal(matchOne(p, supportProfile({ area_dec: 50, irrigation: 'dtw' })).fit, 'maybe');
});

test('India: Punjab has not joined PMFBY, and straw machines are for Punjab', () => {
  const punjab = supportProfile({ area_dec: 1000, crops: [rice, wheat], state: 'Punjab' });
  assert.equal(matchOne(byId(IN_SUPPORT, 'pmfby'), punjab).fit, 'no');
  assert.equal(matchOne(byId(IN_SUPPORT, 'crm'), punjab).fit, 'yes');
  assert.equal(matchOne(byId(IN_SUPPORT, 'crm'), { ...punjab, state: 'Maharashtra' }).fit, 'no');
});

test('the list is sorted yes, maybe, no; first steps come from what fits', () => {
  const ms = matchSupport(BD_SUPPORT, supportProfile({ area_dec: 66, crops: [boro, lentil], irrigation: 'dtw', area: 'barind', district: 'Rajshahi' }));
  const rank = { yes: 0, maybe: 1, no: 2 };
  for (let i = 1; i < ms.length; i++) assert.ok(rank[ms[i - 1].fit] <= rank[ms[i].fit]);
  const c = countFits(ms);
  assert.equal(c.yes + c.maybe + c.no, BD_SUPPORT.length);
  assert.deepEqual(firstSteps(ms).map((p) => p.id).sort(), ['krishi_card', 'ten_taka']);
});

test('the question box finds programmes in Bangla, English and Bangla digits', () => {
  assert.equal(askSupport('সারের দাম কত?', BD_SUPPORT)[0].p.id, 'fert_price');
  assert.equal(askSupport('cheap loan for lentil', BD_SUPPORT)[0].p.id, 'credit_4pc');
  assert.equal(askSupport('১৬১২৩', BD_SUPPORT)[0].p.id, 'call_16123');
  assert.equal(askSupport('ধান বিক্রি', BD_SUPPORT)[0].p.id, 'paddy_buy');
  assert.equal(askSupport('বিমা', BD_SUPPORT)[0].p.id, 'wibci');
  assert.deepEqual(askSupport('   ', BD_SUPPORT), []);
  assert.deepEqual(askSupport('xyzzy', BD_SUPPORT), []);
});
