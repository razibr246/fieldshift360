// Answer check: each rule fires on the answer it is meant to catch and stays quiet on a good one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReply, waterStance, statedNumbers, retryNote, repairReply, latinDigits } from './replyCheck.js';

// A farmer snapshot cut down to what the checks read (shape of src/voice/snapshot.js).
const snap = ({ color = 'GREEN', rainNext3 = 0, live = true, climate = 'REAL', sample = false } = {}) => ({
  prov: { climate, soil: 'REAL' },
  farmer: { id: 'F1', areaDec: 33 },
  soil: { ph: 6.1, om: 1.4, sample },
  today: {
    water: { color, reasons: [{ bn: 'শিকড়ের নাগালে মাটির পানি এখন প্রায় ৫৮% (পুরো ভেজা = ১০০%)', en: 'Water within reach of the roots is about 58% (fully wet = 100%)' }, { bn: 'আগামী ৩ দিনে ১২ মিমি বৃষ্টির পূর্বাভাস', en: '12 mm of rain forecast in the next 3 days' }] },
    weather: { rain7: 3.2, rainNext3, tmax: 31.4, live },
  },
  requests: [{ id: 'R-77', status: 'open' }],
});

test('digits: Bangla numbers are read as numbers', () => {
  assert.equal(latinDigits('১২.৫ মিমি'), '12.5 মিমি');
  assert.deepEqual(statedNumbers('আগামী ৩ দিনে ১২ মিমি বৃষ্টি, পানি ৫৮%').map((n) => n.v), [12, 58]);
  assert.deepEqual(statedNumbers('price Tk 1,200 a maund').map((n) => n.v), [1200]);
});

test('water stance: "don\'t" wins, a condition is not an instruction', () => {
  assert.equal(waterStance('আজ সেচ দিন।'), 'irrigate');
  assert.equal(waterStance('আজ সেচ দেবেন না।'), 'hold');
  assert.equal(waterStance('এখন সেচ দেওয়ার দরকার নেই।'), 'hold');
  assert.equal(waterStance('এখন সেচের দরকার নেই।'), 'hold');
  assert.equal(waterStance('পানির প্রয়োজন নাই।'), 'hold');
  assert.equal(waterStance('Irrigate today, about 30 mm.'), 'irrigate');
  assert.equal(waterStance('No need to water the field today.'), 'hold');
  assert.equal(waterStance('Irrigate only when the pipe water is 15 cm down.'), null);
  assert.equal(waterStance('মাটি শুকনো হলে তবেই সেচ দিন।'), null);
});

test('a good answer passes every rule', () => {
  const r = checkReply({ data: snap({ color: 'GREEN', rainNext3: 12 }), reply: 'আচ্ছা, আজ সেচ দেবেন না। মাটিতে এখন প্রায় ৫৮% পানি আছে, আর আগামী ৩ দিনে ১২ মিমি বৃষ্টির পূর্বাভাস।' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
  assert.equal(r.ceiling, 1);
});

test('G1: a number the data does not hold, with and without web sources', () => {
  const data = snap();
  const no = checkReply({ data, reply: 'Your field has 40 mm of water left.' });
  assert.equal(no.ok, false);
  assert.equal(no.problems[0].id, 'G1_UNGROUNDED_NUMBER');
  assert.equal(no.problems[0].level, 'fix');
  const web = checkReply({ data, reply: 'Onions sell at Tk 84 a kg in Rajshahi today.', sources: [{ url: 'https://dam.gov.bd' }] });
  assert.equal(web.ok, true);
  assert.equal(web.problems[0].level, 'note');
  // rounding and shares: 31.4 °C said as 31 °C, 58% as "about 60%", a 0.62 share said as 62%
  assert.equal(checkReply({ data, reply: 'About 60% of the water is left.' }).ok, true);
  assert.equal(checkReply({ data: { ...data, x: 0.62 }, reply: 'It will reach 31 °C; 62% of the water is left.' }).ok, true);
  // a number the person said themselves may be repeated
  assert.equal(checkReply({ data, reply: 'You paid 900 taka for the seed.', message: 'আমি বীজ ৯০০ টাকায় কিনেছি' }).ok, true);
});

test('R1: irrigate while rain is coming, or while the field is GREEN', () => {
  const rain = checkReply({ data: snap({ color: 'YELLOW', rainNext3: 12 }), reply: 'আজই সেচ দিন।' });
  assert.deepEqual(rain.problems.map((p) => p.id), ['R1_RAIN_OFFSET']);
  const green = checkReply({ data: snap({ color: 'GREEN', rainNext3: 0 }), reply: 'Irrigate the field today.' });
  assert.deepEqual(green.problems.map((p) => p.id), ['R1_WATER_ENOUGH']);
  // RED is severe enough that watering before the rain is fair
  assert.equal(checkReply({ data: snap({ color: 'RED', rainNext3: 12 }), reply: 'আজই সেচ দিন।' }).ok, true);
});

test('R2: "no water needed" while the crop is already short', () => {
  const r = checkReply({ data: snap({ color: 'ORANGE' }), reply: 'এখন সেচ লাগবে না।' });
  assert.deepEqual(r.problems.map((p) => p.id), ['R2_STRESS_NOACTION']);
  assert.equal(checkReply({ data: snap({ color: 'GREEN' }), reply: 'এখন সেচ লাগবে না।' }).ok, true);
});

test('R3: a chemical dose of its own, in either order and either language', () => {
  for (const reply of ['প্রতি লিটার পানিতে ২ মিলি মিশিয়ে স্প্রে করুন।', 'Mix 2 ml per litre and spray.', 'Use 10 g per litre of water.', '১০ গ্রাম ওষুধ প্রতি লিটারে দিন।']) {
    assert.ok(checkReply({ data: snap(), reply }).problems.some((p) => p.id === 'R3_OWN_DOSE'), reply);
  }
  assert.equal(checkReply({ data: snap(), reply: 'লেবেল দেখে ওষুধ দিন, আগে কৃষি অফিসারকে জিজ্ঞেস করুন।' }).ok, true);
});

test('P1: proposals pointing nowhere are dropped, good ones kept', () => {
  const r = checkReply({
    data: snap(), reply: 'আমি প্রস্তুত করেছি।',
    proposals: [
      { action: 'follow_up', text: '', target: 'R-77' },
      { action: 'follow_up', text: '', target: 'R-99' },
      { action: 'navigate', text: '', target: '/farmer/doctor' },
      { action: 'navigate', text: '', target: 'https://example.com' },
    ],
  });
  assert.deepEqual(r.proposals.map((p) => p.target), ['R-77', '/farmer/doctor']);
  assert.equal(r.problems.filter((p) => p.id === 'P1_BAD_TARGET').length, 2);
  assert.equal(r.ok, true); // dropping is the fix; no retry needed
});

test('R4: thin evidence caps the confidence and says why', () => {
  assert.equal(checkReply({ data: snap({ live: false }), reply: 'ঠিক আছে।' }).ceiling, 0.7);
  const r = checkReply({ data: snap({ climate: 'PLACEHOLDER', sample: true }), reply: 'ঠিক আছে।' });
  assert.equal(r.ceiling, 0.5);
  assert.equal(r.limits.length, 2);
  assert.equal(checkReply({ data: { prov: { climate: 'REAL' } }, reply: 'ঠিক আছে।' }).ceiling, 0.5); // farmer with no field figures
  assert.equal(checkReply({ role: 'officer', data: { prov: { climate: 'REAL' } }, reply: 'ঠিক আছে।' }).ceiling, 1);
});

test('retry note names each rule; repair removes the dose and adds the water count', () => {
  const data = snap({ color: 'GREEN', rainNext3: 12 });
  const r = checkReply({ data, reply: 'আজই সেচ দিন। প্রতি লিটার পানিতে ২ মিলি স্প্রে করুন।' });
  const note = retryNote(r.problems);
  assert.match(note, /\[R1_RAIN_OFFSET\]/);
  assert.match(note, /\[R3_OWN_DOSE\]/);
  const fixed = repairReply('আজই সেচ দিন। প্রতি লিটার পানিতে ২ মিলি স্প্রে করুন।', r.problems, data, 'bn');
  assert.doesNotMatch(fixed, /মিলি/);
  assert.match(fixed, /অ্যাপের পানির হিসাব বলছে: আগামী ৩ দিনে ১২ মিমি বৃষ্টির পূর্বাভাস/);
  assert.match(fixed, /কৃষি অফিসারকে/);
});
