import test from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS } from './regions.js';
import { CHILDREN, CHILD_IDS, MOODS } from './dream.js';
import { ageStoop, expressionFromState, idleGaze } from '../engine/motion.js';

test('every one of the twelve farmers has a complete, respectful look definition', () => {
  const ids = Object.keys(REGIONS);
  assert.equal(ids.length, 12, '12 farmers across Bangladesh and South Asia');
  for (const id of ids) {
    const f = REGIONS[id].farmer;
    assert.ok(f.name || f.bn, `farmer ${id} has a name`);
    assert.ok(f.look, `farmer ${id} has a look definition`);
    const l = f.look;
    assert.ok(l.skin && /^#[0-9a-f]{6}$/i.test(l.skin), `${id} has valid hex skin tone`);
    assert.ok(l.hair && /^#[0-9a-f]{6}$/i.test(l.hair), `${id} has valid hex hair`);
    assert.ok(l.top, `${id} has a top garment`);
    assert.ok(l.lower, `${id} has lower attire`);
    assert.ok(l.head, `${id} has headwear or hair style`);
    assert.ok(l.feet, `${id} has footwear`);
  }
});

test('every child has a complete profile, age between 7 and 10, and a personal story item', () => {
  assert.equal(CHILD_IDS.length, 12, '12 children for the 12 regions');
  for (const id of CHILD_IDS) {
    const c = CHILDREN[id];
    assert.ok(c, `child ${id} exists`);
    assert.ok(c.name.bn && c.name.en, `child ${id} has bilingual name`);
    assert.ok(c.calls.bn && c.calls.en, `child ${id} has bilingual call for grown-up`);
    assert.ok(c.rel.bn && c.rel.en, `child ${id} has bilingual relationship`);
    assert.ok(c.age >= 7 && c.age <= 10, `child ${id} age ${c.age} is between 7 and 10`);
    assert.equal(typeof c.girl, 'boolean', `child ${id} specifies girl boolean`);
    assert.ok(c.item, `child ${id} has personal story item`);
    assert.ok(REGIONS[id], `region ${id} matches farmer`);
  }
});

test('child game moods strictly enforce peaceful non-violent animations', () => {
  const forbiddenViolentActions = ['Death', 'Punch', 'RecieveHit', 'SwordSlash', 'Shoot_OneHanded'];
  for (const [moodKey, mood] of Object.entries(MOODS)) {
    assert.ok(!forbiddenViolentActions.includes(mood.anim), `mood ${moodKey} must not use combat/violent action ${mood.anim}`);
    assert.ok(mood.grade, `mood ${moodKey} specifies visual grade`);
    assert.ok(mood.music, `mood ${moodKey} specifies music cue`);
  }
});

test('age stoop creates natural grounded posture calibrated by age', () => {
  assert.equal(ageStoop(25), 0, 'young adult stands upright');
  assert.equal(ageStoop(30), 0, 'adult stands upright');
  assert.equal(ageStoop(46), 0.025, 'middle-aged farmer has subtle grounding');
  assert.equal(ageStoop(58), 0.055, 'senior farmer stands with grounded stoop');
  assert.equal(ageStoop(82), 0.08, 'elder stands with gentle stoop');
});

test('expression from state dynamically responds to farm work and mood', () => {
  const calm = expressionFromState({});
  assert.equal(calm.mood, 'calm');
  assert.equal(calm.browTilt, 0);

  const cheer = expressionFromState({ act: { type: 'cheer' } });
  assert.equal(cheer.mood, 'happy');
  assert.ok(cheer.browTilt > 0, 'happy brows arch upwards');

  const work = expressionFromState({ act: { type: 'water' } });
  assert.equal(work.mood, 'focused');
  assert.ok(work.browTilt < 0, 'focused work lowers brow slightly');

  const strain = expressionFromState({ carrying: true });
  assert.equal(strain.mood, 'effort');
  assert.ok(strain.lidSquint > 0, 'carrying load narrows gaze');

  const distress = expressionFromState({ down: 1 });
  assert.equal(distress.mood, 'hurt');
  assert.ok(distress.lidSquint >= 0.3, 'down narrows eyes');

  const stress = expressionFromState({ worried: true });
  assert.equal(stress.mood, 'worried');
  assert.ok(stress.browTilt < 0, 'worried brows furrow');
});

test('reduced motion disables idle head looking while preserving normal gaze drift', () => {
  assert.deepEqual(idleGaze(10, true), { x: 0, y: 0 });
  const activeGaze = idleGaze(10, false);
  assert.ok(typeof activeGaze.x === 'number' && typeof activeGaze.y === 'number');
});
