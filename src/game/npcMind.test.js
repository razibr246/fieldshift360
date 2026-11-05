import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEDULE_PHASES,
  getDayPhaseName,
  createNpcMind,
  updateNpcNeeds,
  getNpcActionGoal,
  recordPlayerInteraction,
  generateContextualDialogue,
} from './npcMind.js';

test('getDayPhaseName maps circadian cycle accurately across 24h dayPhase', () => {
  assert.equal(getDayPhaseName(0.05), SCHEDULE_PHASES.DAWN);
  assert.equal(getDayPhaseName(0.25), SCHEDULE_PHASES.MORNING);
  assert.equal(getDayPhaseName(0.52), SCHEDULE_PHASES.MIDDAY);
  assert.equal(getDayPhaseName(0.68), SCHEDULE_PHASES.AFTERNOON);
  assert.equal(getDayPhaseName(0.80), SCHEDULE_PHASES.DUSK);
  assert.equal(getDayPhaseName(0.95), SCHEDULE_PHASES.NIGHT);
  // handles wrap-around
  assert.equal(getDayPhaseName(1.05), SCHEDULE_PHASES.DAWN);
  assert.equal(getDayPhaseName(-0.05), SCHEDULE_PHASES.NIGHT);
});

test('createNpcMind initializes realistic biological needs, personality, and clean memory', () => {
  const mind = createNpcMind({
    id: 'karim_van',
    name: { bn: 'ভ্যানচালক করিম', en: 'Karim the van driver' },
    does: 'walk',
    warmth: 0.9,
  });

  assert.equal(mind.id, 'karim_van');
  assert.equal(mind.name.bn, 'ভ্যানচালক করিম');
  assert.ok(mind.needs.energy >= 80 && mind.needs.energy <= 100);
  assert.ok(mind.needs.social >= 50 && mind.needs.social <= 100);
  assert.equal(mind.memory.playerInteractions, 0);
  assert.equal(mind.memory.playerBumps, 0);
  assert.equal(mind.memory.affinity, 20);
});

test('updateNpcNeeds accurately depletes energy during work and replenishes in rest', () => {
  let mind = createNpcMind({ does: 'work' });
  mind.needs.energy = 50;

  // Working for 10 seconds drains energy
  mind = updateNpcNeeds(mind, 10, { isWorking: true });
  assert.ok(mind.needs.energy < 50);

  // Resting for 10 seconds restores energy
  const beforeRest = mind.needs.energy;
  mind = updateNpcNeeds(mind, 10, { isResting: true });
  assert.ok(mind.needs.energy > beforeRest);

  // Severe heat accelerates fatigue
  const beforeHeat = mind.needs.energy;
  mind = updateNpcNeeds(mind, 10, { isMoving: true, weather: { heat: 1 } });
  assert.ok(mind.needs.energy < beforeHeat);
});

test('getNpcActionGoal enforces life preservation during storms and circadian rhythm', () => {
  const mind = createNpcMind({ does: 'work' });

  // Storm overrides everything with immediate shelter goal
  const stormGoal = getNpcActionGoal(mind, 0.25, true);
  assert.equal(stormGoal.action, 'shelter');
  assert.ok(stormGoal.priority >= 1.0);

  // Midday triggers rest and eating in shade
  const middayGoal = getNpcActionGoal(mind, 0.52, false);
  assert.equal(middayGoal.action, 'rest_and_eat');

  // Severe exhaustion (<25) triggers emergency rest
  mind.needs.energy = 15;
  const tiredGoal = getNpcActionGoal(mind, 0.25, false);
  assert.equal(tiredGoal.action, 'rest');
});

test('recordPlayerInteraction updates relationship affinity, bump reprimands, and memory', () => {
  let mind = createNpcMind({ does: 'stand' });
  const initialAffinity = mind.memory.affinity;

  // Friendly conversation improves affinity
  mind = recordPlayerInteraction(mind, 'talk', 12.5);
  assert.equal(mind.memory.playerInteractions, 1);
  assert.ok(mind.memory.affinity > initialAffinity);
  assert.equal(mind.memory.lastInteractionTime, 12.5);

  // Repeatedly bumping decreases affinity
  mind = recordPlayerInteraction(mind, 'bump', 15.0);
  mind = recordPlayerInteraction(mind, 'bump', 16.0);
  mind = recordPlayerInteraction(mind, 'bump', 17.0);
  assert.equal(mind.memory.playerBumps, 3);
  assert.ok(mind.memory.affinity < initialAffinity);
});

test('generateContextualDialogue delivers appropriate bilingual text for weather and routines', () => {
  const mind = createNpcMind({ does: 'work' });

  // Storm dialogue warning
  const stormText = generateContextualDialogue(mind, 0.25, { storm: 1 });
  assert.ok(stormText.bn.includes('ঝড়'));
  assert.ok(stormText.en.includes('storm'));

  // Dawn greeting
  const dawnText = generateContextualDialogue(mind, 0.05, {});
  assert.ok(dawnText.bn.length > 0 && dawnText.en.length > 0);

  // Dusk greeting
  const duskText = generateContextualDialogue(mind, 0.80, {});
  assert.ok(duskText.bn.length > 0 && duskText.en.length > 0);
});

