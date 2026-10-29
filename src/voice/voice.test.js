// Run with: npm test. Drives the voice brain end to end on the real engine, the real demo data and the real climate file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate } from '../engine/climate.js';
import { decide } from '../engine/decision.js';
import { recommendRotation } from '../engine/rotation.js';
import { cropStage, waterAdvice, DEMO_SCENARIOS } from '../engine/water.js';
import { findHotspots } from '../engine/cluster.js';
import { makeUnion } from '../engine/world.js';
import { buildDemo, DEMO_TODAY, upazilaOfUnion } from '../data/demo.js';
import { radarSummary } from '../radar/radarModel.js';
import { onsetSummary } from '../radar/onset.js';
import { farmerSnapshot, officerSnapshot } from './snapshot.js';
import { createSession, respond, greeting, classify } from './brain.js';
import { KEY_MENU } from './keymenu.js';
import { fold, speakable } from './bn.js';
import { replyTemplate as template, advisoryText } from '../engine/advice.js';

const readJson = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const climates = { godagari: makeClimate(readJson('climate/climate_godagari.json')), dhamrai: makeClimate(readJson('climate/climate_dhamrai.json')) };
const clim = climates.godagari;
const soilG = readJson('soil/soil_godagari.json');
const soilData = { provenance: soilG.provenance, unions: { ...soilG.unions, ...readJson('soil/soil_dhamrai.json').unions } };
const demo = buildDemo();

function ctxFor(farmerId = 'RAHIM', officerUnion = 'Deopara', extra = {}) {
  const farmer = demo.farmers.find((f) => f.id === farmerId);
  const clim = climates[upazilaOfUnion(farmer.union).id];
  const world = { ...demo };
  const unionsAll = Object.fromEntries(demo.unions.map((u) => [u.id, makeUnion(clim, world, u.id, [])]));
  const unions = Object.fromEntries(demo.unions.map((u) => [u.id, makeUnion(clim, world, u.id, [])]));
  const soil = soilData.unions[farmer.union];
  const decision = decide({ clim, soil, plot: farmer, union: unions[farmer.union], priorities: [] });
  const chosen = decision.rec;
  const rotation = recommendRotation({ clim, soil, plot: farmer, chosen, priorities: [] });
  const weather = DEMO_SCENARIOS.dry;
  const stage = cropStage(chosen.crop, 30);
  const water = waterAdvice({ crop: chosen.crop, stage, rain7: weather.rain7, rainNext3: weather.rainNext3, tmax: weather.tmax, fieldCheck: null });
  const s = { priorities: [], pick: null, requests: demo.requests, advisories: [], escalations: [], officerUnion, ...extra };
  return { s, farmer, farmers: demo.farmers, farmerOf: (id) => demo.farmers.find((f) => f.id === id), decision, chosen, rotation, soil, water, weather, stage, daysAfter: 30, liveWeather: false, myAdvisories: [], confirmedPlan: null, today: DEMO_TODAY, unionsAll, hotspots: findHotspots(s.requests) };
}
const fsnap = (id) => farmerSnapshot(ctxFor(id), { clim: climates[upazilaOfUnion(demo.farmers.find((f) => f.id === id).union).id], soilData, unions: demo.unions });
const osnap = (role, extra) => officerSnapshot(ctxFor('RAHIM', 'Deopara', extra), role, { clim, soilData, templateFn: template, advisoryFn: advisoryText, radar: null });
const ask = (text, snap, session) => respond(text, snap, session);

test('folding makes Bangla spellings comparable', () => {
  assert.equal(fold('সেচ লাগবে?'), fold('সেচ লাগবে'));
  assert.equal(fold('১২ মণ'), '12 মণ'.normalize('NFD'));
  assert.ok(!/[*#_`]/.test(speakable('**ঠিক** আছে #1')));
});

test('farmer: plan answer names the crop, date and honest data status', () => {
  const snap = fsnap('RAHIM');
  const s = createSession({ role: 'farmer' });
  const r = ask('এই রবিতে কী লাগাব?', snap, s);
  assert.ok(r.say.includes(snap.plan.crop.bn), r.say);
  assert.ok(r.say.includes('তারিখে'));
  assert.match(r.say, /নমুনা|নাসা পাওয়ার/); // provenance line present on first answer
  const again = ask('কী লাগাব', snap, s);
  assert.ok(!/নমুনা, আসল/.test(again.say), 'provenance is said once, not every time');
});

test('farmer: comparing the options names each crop, says how sure the order is and how to reach a person', () => {
  const snap = fsnap('RAHIM');
  for (const [q, lang] of [['বিকল্পগুলোর তুলনা', 'bn'], ['compare the options', 'en']]) {
    const s = createSession({ role: 'farmer', lang });
    const r = ask(q, snap, s);
    assert.ok(snap.compare.cols.length >= 3, 'the crop grown now and two alternatives at least');
    for (const c of snap.compare.cols) assert.ok(r.say.includes(c.crop[lang]), `${c.crop.en} named: ${r.say}`);
    assert.match(r.say, lang === 'bn' ? /নম্বর এগিয়ে|কার্যত সমান/ : /leads by|practically a tie/);
    assert.match(r.say, /16123|১৬১২৩/);
  }
  const nasa = ask('তথ্য কোথা থেকে এল?', snap, createSession({ role: 'farmer' }));
  assert.match(nasa.say, /মাটি পরীক্ষা নয়/);
  assert.ok(!/মাটি, দাম আর খরচ এখনো নমুনা/.test(nasa.say), 'prices and soil are not called samples');
});

test('farmer: water, weather, harvest, price, next crop all answer', () => {
  const snap = fsnap('RAHIM');
  const s = createSession({ role: 'farmer' });
  for (const q of ['আজ সেচ লাগবে?', 'আবহাওয়া কেমন', 'ফসল কবে উঠবে', 'দাম পড়বে কি', 'পরের ফসল কী', 'মাটি কেমন', 'কৃষি অফিসারের সঙ্গে কথা বলব']) {
    const r = ask(q, snap, s);
    assert.ok(r.say.length > 20, `${q} -> ${r.say}`);
    assert.ok(!/ঠিক বুঝতে পারিনি/.test(r.say), `${q} fell through`);
  }
});

test('farmer: problem report needs a yes, then creates a request for the SAAO', () => {
  const snap = fsnap('RAHIM');
  const s = createSession({ role: 'farmer' });
  const r1 = ask('টমেটোর পাতায় বাদামি দাগ পড়ছে, দুই দিনে ছড়িয়ে পড়ছে', snap, s);
  assert.equal(r1.effects.length, 0, 'nothing is sent before confirmation');
  assert.match(r1.say, /পাঠাব/);
  const r2 = ask('হ্যাঁ', snap, s);
  const add = r2.effects.find((e) => e.type === 'addRequest');
  assert.ok(add, 'request created after yes');
  assert.equal(add.req.symptom, 'leaf_spot');
  assert.equal(add.req.crop, 'tomato');
  assert.equal(add.req.priority, 'High'); // "spreading" raises urgency
  assert.equal(add.req.farmerId, 'RAHIM');
  assert.equal(add.req.union, 'Deopara');
});

test('farmer: saying no sends nothing', () => {
  const snap = fsnap('RAHIM');
  const s = createSession({ role: 'farmer' });
  ask('পোকা ধরেছে সরিষায়', snap, s);
  const r = ask('না', snap, s);
  assert.equal(r.effects.length, 0);
});

test('danger to life goes to 999, not crop logic', () => {
  const r = ask('সাপে কেটেছে', fsnap('RAHIM'), createSession({ role: 'farmer' }));
  assert.match(r.say, /৯৯৯/);
});

test('English switch works and sets the app language', () => {
  const s = createSession({ role: 'farmer' });
  const r = ask('speak english please', fsnap('RAHIM'), s);
  assert.ok(r.effects.some((e) => e.type === 'setLang' && e.lang === 'en'));
  const p = ask('what should i plant', fsnap('RAHIM'), s);
  assert.match(p.say, /Rabi|plant|Keep|shift/i);
});

test('officer: briefing counts match the data and spot the seeded Deopara outbreak', () => {
  const snap = osnap('saao');
  const s = createSession({ role: 'saao' });
  const r = ask('আজকের অবস্থা', snap, s);
  assert.ok(snap.area.hotspots.length >= 1, 'seeded cluster present');
  assert.ok(r.say.includes('একই সমস্যা'), r.say);
});

test('officer: read a request, edit the reply, send only after yes', () => {
  const snap = osnap('saao');
  const s = createSession({ role: 'saao' });
  const list = ask('অনুরোধগুলো কী কী', snap, s);
  assert.ok(list.say.includes('খোলা অনুরোধ'));
  const open = ask('প্রথমটা পড়ুন', snap, s);
  assert.ok(open.say.includes('খসড়া উত্তর'));
  assert.equal(open.effects.length, 0);
  const edited = ask('আগামীকাল সকালে আমি জমিতে আসব, ততক্ষণ ছবি তুলে রাখুন', snap, s);
  assert.equal(edited.effects.length, 0);
  assert.ok(edited.say.includes('আগামীকাল'));
  const sent = ask('হ্যাঁ', snap, s);
  assert.ok(sent.effects.some((e) => e.type === 'addAdvisory' && e.adv.text.includes('আগামীকাল')));
  assert.ok(sent.effects.some((e) => e.type === 'updateRequest' && e.patch.status === 'answered'));
});

test('officer: advise-everyone and escalate both wait for yes and use the same payloads as the buttons', () => {
  const snap = osnap('saao');
  const s = createSession({ role: 'saao' });
  const a = ask('সবাইকে পরামর্শ পাঠান', snap, s);
  assert.equal(a.effects.length, 0);
  const y = ask('হ্যাঁ', snap, s);
  const adv = y.effects.find((e) => e.type === 'addAdvisory');
  assert.ok(adv && adv.adv.cluster && adv.adv.to.length >= 5);
  const e1 = ask('উপজেলা অফিসারকে জানান', snap, s);
  const e2 = ask('হ্যাঁ', snap, s);
  assert.ok(e2.effects.some((e) => e.type === 'escalate' && e.esc.kind === 'cluster'), e1.say);
});

test('UAO only: whole-upazila advice; a SAAO is told it is not theirs', () => {
  const snapU = osnap('uao');
  const u = createSession({ role: 'uao' });
  assert.match(ask('পুরো উপজেলায় পরামর্শ পাঠান', snapU, u).say, /খসড়া/);
  const y = ask('হ্যাঁ', snapU, u);
  assert.ok(y.effects.some((e) => e.type === 'addAdvisory' && e.adv.upazila && e.adv.to.length > 100));
  const s = createSession({ role: 'saao' });
  assert.match(ask('পুরো উপজেলায় পরামর্শ পাঠান', osnap('saao'), s).say, /উপজেলা কৃষি অফিসারের কাজ/);
});

test('radar answer uses the real district data and leads with the officer’s upazila', () => {
  const s = createSession({ role: 'saao' });
  assert.match(ask('আমন রাডার', osnap('saao'), s).say, /এখনো আসেনি/);
  const snap = osnap('saao');
  snap.radar = radarSummary(readJson('radar/aman_radar.json'), 'rajshahi');
  const r = ask('আমন রাডার', snap, createSession({ role: 'saao' }));
  assert.match(r.say, /আসল উপগ্রহ তথ্য/);
  assert.match(r.say, /রাজশাহী জেলা/);
  assert.match(r.say, /আপনার গোদাগাড়ী উপজেলায়/);
  assert.equal(r.rows.length, 9);
});

test('the renamed radar chips still reach the radar answer', () => {
  for (const q of ['রোপণ রাডার', 'Ropan Radar', 'আমন রাডার', 'বৃষ্টি ও আমন রোপণ', 'Rain and Aman planting']) {
    assert.match(ask(q, osnap('saao'), createSession({ role: 'saao' })).say, /এখনো আসেনি|has not loaded/, q);
  }
});

test('greetings differ by role and use the person’s name', () => {
  assert.ok(greeting(fsnap('SELINA'), createSession({ role: 'farmer' })).say.includes('সেলিনা'));
  assert.ok(greeting(osnap('uao'), createSession({ role: 'uao' })).say.includes('মরিয়ম'));
});

test('Dhamrai: Razib Miah is told his own officer and upazila', () => {
  const snap = fsnap('RAZIB');
  assert.equal(snap.farmer.uao.en, 'Md. Omar Faruk');
  assert.equal(snap.farmer.upazila.bn, 'ধামরাই');
  assert.equal(snap.requests.length, 3);
  const r = ask('আমার কৃষি কর্মকর্তা কে?', snap, createSession({ role: 'farmer' }));
  assert.match(r.say, /ধামরাই উপজেলা কৃষি অফিসার মোঃ ওমর ফারুক/);
});

test('Dhamrai officer: Chauhat aphid alert, and upazila figures stay inside Dhamrai', () => {
  const snap = officerSnapshot(ctxFor('RAZIB', 'Chauhat'), 'uao', { clim: climates.dhamrai, soilData, templateFn: template, advisoryFn: advisoryText, radar: null });
  assert.equal(snap.officer.name.en, 'Md. Omar Faruk');
  const aphid = snap.area.hotspots.find((h) => h.crop.en === 'Mustard');
  assert.ok(aphid && aphid.size >= 7, 'six neighbours and Razib make one mustard-aphid alert');
  assert.match(aphid.draft.bn, /— উপজেলা কৃষি অফিসার, ধামরাই$/);
  assert.equal(snap.upazila.ranking.length, 17); // 16 unions + the municipality
  const godagariIds = new Set(demo.farmers.filter((f) => upazilaOfUnion(f.union).id === 'godagari').map((f) => f.id));
  assert.ok(snap.upazila.allFarmerIds.length > 300 && snap.upazila.allFarmerIds.every((id) => !godagariIds.has(id)));
  assert.match(snap.upazila.advice.draft.bn, /^ধামরাই উপজেলা কৃষি অফিস/);
});

test('every phone keypad key gets a real answer, in Bangla and English', () => {
  const snap = fsnap('RAHIM');
  for (const lang of ['bn', 'en']) {
    for (const [k, item] of Object.entries(KEY_MENU)) {
      const session = createSession({ role: 'farmer', lang });
      if (k === '0') ask(lang === 'bn' ? 'আজ সেচ লাগবে?' : 'Do I need to water today?', snap, session); // "again" needs something to repeat
      const res = ask(item.ask[lang], snap, session);
      assert.ok(res.say && !/ঠিক বুঝতে পারিনি|did not quite get/.test(res.say), `key ${k} (${lang}) fell through: ${res.say}`);
    }
  }
});

test('the officer’s radar answer says when the rains set in, from the real onset data', () => {
  const snap = osnap('saao');
  snap.radar = radarSummary(readJson('radar/aman_radar.json'), 'rajshahi', onsetSummary('godagari'));
  const r = ask('আমন রাডার', snap, createSession({ role: 'saao' }));
  assert.match(r.say, /বৃষ্টি টানা শুরু হয় সাধারণত/);
  assert.match(r.say, /ধরে নেওয়া নিয়মে/);
  const en = ask('Ropan Radar', snap, createSession({ role: 'saao', lang: 'en' }));
  assert.ok(/rains usually set in|বৃষ্টি টানা/.test(en.say));
});

test('a sample request’s photo guess is called a sample, never a real AI result', () => {
  const snap = osnap('saao');
  const r = Object.values(snap).flatMap((v) => (v && Array.isArray(v.open) ? v.open : [])).find((x) => x.aiGuess);
  assert.ok(r, 'a sample request with a guess exists');
  assert.equal(r.aiGuess.sample, true);
});

// How farmers in Rajshahi and Dhaka actually ask, regional forms included: each must reach the right answer.
const EVERYDAY = [
  ['এবার জমিতে কি দিমু', 'plan'], ['এই শীতে কোন ফসল ভালো হইব', 'plan'], ['টমেটো লাগামু না আলু', 'plan'],
  ['বীজতলা কবে করুম', 'when'], ['চারা রোয়া কবে দিমু', 'when'],
  ['আইজ জমিতে পানি দেওন লাগবো', 'water'], ['শ্যালো মেশিন কয় ঘণ্টা চালামু', 'water'], ['আইজ কি সেচ দেওয়া লাগবো', 'water'],
  ['কাইল বৃষ্টি হইব নি', 'weather'],
  ['ধান পাকতে আর কয়দিন', 'harvest'], ['কয় মণ ধান হইব', 'harvest'],
  ['হাটে এখন টমেটোর দাম কত', 'price'], ['আলু হিমাগারে রাখমু না বেচমু', 'price'],
  ['পাতা হলুদ হইয়া যাইতেছে', 'problem'], ['গাছে পোকা ধরছে কী করমু', 'problem'], ['পাতায় কালো কালো দাগ', 'problem'], ['গাছ মইরা যাইতেছে', 'problem'],
  ['জমিতে কোন সার কতটুকু দিমু', 'soil'], ['ইউরিয়া কয় কেজি দিমু', 'soil'],
  ['উপসহকারী স্যারের নম্বর দেন', 'officer'], ['আমার প্রশ্নের জবাব আইছে', 'myreq'], ['এই ধান কাটার পর কী লাগামু', 'next'],
];
for (const [phrase, intent] of EVERYDAY) {
  test(`everyday Bangla: "${phrase}" is understood as ${intent}`, () => {
    assert.equal(classify(fold(phrase), 'farmer'), intent);
    assert.ok(ask(phrase, fsnap('RAHIM'), createSession({ role: 'farmer' })).say.length > 10);
  });
}

test('the same question gets each farmer’s own region: Godagari for Rahim, Dhamrai for Razib', () => {
  const rahim = ask('এবার কী লাগাব', fsnap('RAHIM'), createSession({ role: 'farmer' })).say;
  const razib = ask('এবার কী লাগাব', fsnap('RAZIB'), createSession({ role: 'farmer' })).say;
  assert.notEqual(rahim, razib);
  assert.notEqual(fsnap('RAHIM').prov, undefined);
});

test('SMS mode cuts a Bangla reply into numbered parts that each fit one Unicode SMS part, at word breaks', async () => {
  const { smsSplit, smsParts } = await import('../engine/text.js');
  const reply = 'এবার রবিতে: সরিষা। দশ বছরের সেরা ফসলচক্র: মসুর ডাল-পাট-রোপা আমন, পরের বছর টমেটো-পাট-রোপা আমন, খড় জমিতে রাখুন। ১০ বছরে মাটির জৈব পদার্থ +২.৩%।';
  const parts = smsSplit(reply);
  assert.ok(parts.length > 1);
  assert.equal(parts.join(' '), reply, 'nothing lost or reordered');
  for (const p of parts) assert.ok(`${p} (১/৩)`.length <= 67, `part fits with its mark: ${p}`);
  assert.deepEqual(smsSplit('আজ সেচ লাগবে না।'), ['আজ সেচ লাগবে না।']);
  assert.equal(smsParts('আজ সেচ লাগবে না।').parts, 1);
});
