// The story game's real numbers come out of the data, and the season totals add up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate } from './climate.js';
import { chapterFacts, seasonTotals } from './play.js';
import { SCENES, START } from '../data/story.js';

test('every chapter of the story game has its real fact, in a sensible range', () => {
  const c = makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_godagari.json', import.meta.url))));
  const f = chapterFacts(c);
  for (const sc of SCENES) assert.ok(f[sc.id], `no fact for ${sc.id}`);
  assert.ok(f.choose.share > 0.1 && f.choose.share < 0.4, 'mustard needs a small share of Boro’s water');
  assert.ok(f.dry.dryYears >= 0 && f.dry.dryYears <= 25 && f.storm.wetYears <= 25);
  assert.ok(f.glut.ratio > 1);
});

test('old habits all season lose money; the right tool every time ends ahead', () => {
  const habit = seasonTotals(SCENES, START, SCENES.map(() => 'habit'));
  const tool = seasonTotals(SCENES, START, SCENES.map(() => 'tool'));
  assert.ok(habit.money < 0 && tool.money > 0 && tool.crop > habit.crop && tool.water > habit.water);
});
