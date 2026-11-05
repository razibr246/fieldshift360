import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJson, normalizeTranscript, normalizeCallNote, parseTime, toAsciiDigits, makeConsent, canRecord,
  canonicalJson, sha256Hex, sealCallNote, verifyCallNote, callNoteToRequest, CONSENT_NOTICE,
} from './callnote.js';

const BN_TRANSCRIPT = 'কৃষক: আমার ৩৩ শতক জমিতে টমেটো, পাতায় কালো দাগ। বীজ কিনেছি ১,২০০ টাকায়। হাটে টমেটো ২৫ টাকা কেজি বলছে।';

test('extractJson finds the object in fenced, chatty or slightly broken answers', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Here it is: {"a":[1,2,],} thanks'), { a: [1, 2] });
  assert.deepEqual(extractJson('{“a”: 2}'), { a: 2 });
  assert.equal(extractJson('no json here'), null);
  assert.equal(extractJson('[1,2]'), null);
  assert.equal(extractJson(null), null);
});

test('times and Bangla digits are read', () => {
  assert.equal(parseTime('1:02:03'), 3723);
  assert.equal(parseTime('০০:১২'), 12);
  assert.equal(parseTime(4.5), 4.5);
  assert.equal(parseTime('junk'), 0);
  assert.equal(toAsciiDigits('১,২০০'), '1,200');
});

test('normalizeTranscript keeps only known speakers and never throws', () => {
  const t = normalizeTranscript({ segments: [{ speaker: 'Farmer', text: 'হ্যালো', start: '0:01', end: 0 }, { speaker: 'x', text: '' }], language: 'xx' });
  assert.deepEqual(t.segments, [{ who: 'farmer', text: 'হ্যালো', start: 1, end: 1 }]);
  assert.equal(t.text, 'হ্যালো');
  assert.equal(t.lang, 'bn');
  assert.deepEqual(normalizeTranscript(undefined), { text: '', lang: 'en', segments: [] });
  assert.equal(normalizeTranscript({ text: 'only text' }).segments[0].text, 'only text');
});

test('items are kept only when their words and amount were said (CN1, CN2)', () => {
  const n = normalizeCallNote({
    crop: 'tomato', symptom: 'leaf_spot', urgency: 'high',
    area: { value: 33, unit: 'শতক', quote: '৩৩ শতক জমিতে' },
    items: [
      { what: 'Seed', kind: 'input_cost', taka: 1200, quote: 'বীজ কিনেছি ১,২০০ টাকায়' },
      { what: 'Tomato price', kind: 'price_heard', taka: '২৫', unit: 'কেজি', quote: 'টমেটো ২৫ টাকা কেজি' },
      { what: 'Fertiliser', kind: 'input_cost', taka: 900, quote: 'সার কিনেছি ৯০০ টাকায়' },
      { what: 'Seed again', kind: 'input_cost', taka: 1500, quote: 'বীজ কিনেছি ১,২০০ টাকায়' },
    ],
  }, BN_TRANSCRIPT);
  assert.equal(n.crop, 'tomato');
  assert.equal(n.urgency, 'high');
  assert.deepEqual(n.area, { value: 33, unit: 'decimal', quote: '৩৩ শতক জমিতে' });
  assert.deepEqual(n.items.map((i) => [i.taka, i.unit, i.kind]), [[1200, null, 'input_cost'], [25, 'kg', 'price_heard']]);
  assert.deepEqual(n.dropped.map((d) => d.rule), ['CN1_UNQUOTED', 'CN2_AMOUNT_NOT_SAID']);
});

test('unknown crops, symptoms and kinds fall back instead of failing', () => {
  const n = normalizeCallNote({ crop: 'banana', symptom: 'alien', urgency: 'now', items: [{ kind: 'bribe', quote: 'পাতায় কালো দাগ' }], area: { value: 5, unit: 'bigha', quote: 'nope' } }, BN_TRANSCRIPT);
  assert.equal(n.crop, null);
  assert.equal(n.symptom, 'question');
  assert.equal(n.urgency, 'medium');
  assert.equal(n.items[0].kind, 'other');
  assert.equal(n.items[0].taka, null);
  assert.equal(n.area, null);
  assert.equal(n.dropped[0].rule, 'CN3_AREA_NOT_SAID');
  assert.deepEqual(normalizeCallNote(null, '').items, []);
});

test('recording needs a logged yes', () => {
  assert.equal(canRecord(makeConsent({ given: true })), true);
  assert.equal(canRecord(makeConsent({ given: false })), false);
  assert.equal(canRecord(makeConsent({ given: 'yes' })), false);
  assert.equal(canRecord(null), false);
  assert.equal(makeConsent({ given: true, lang: 'en' }).notice, CONSENT_NOTICE.en);
});

test('canonical JSON sorts keys at every depth, so the hash covers nested fields', async () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [{ y: 1, x: 2 }], c: 3 } }), '{"a":{"c":3,"d":[{"x":2,"y":1}]},"b":1}');
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('a sealed note verifies, and any edit to it breaks the seal', async () => {
  const consent = makeConsent({ given: true, at: '2026-11-05T04:00:00.000Z' });
  const transcript = normalizeTranscript({ text: BN_TRANSCRIPT });
  const note = normalizeCallNote({ crop: 'tomato', summary_bn: 'টমেটোর পাতায় দাগ', urgency: 'high' }, BN_TRANSCRIPT);
  const sealed = await sealCallNote({ id: 'n1', farmer: { id: 'F1', name: 'Rahim' }, consent, audio: { sha256: 'a'.repeat(64), bytes: 1000, mime: 'audio/webm', seconds: 30 }, transcript, note, engine: 'gemini', model: 'm', created: '2026-11-05T04:01:00.000Z' });
  assert.equal(await verifyCallNote(sealed), true);
  const edited = structuredClone(sealed);
  edited.record.note.items.push({ what: 'x', taka: 1 });
  assert.equal(await verifyCallNote(edited), false);
  assert.equal(await verifyCallNote({ ...sealed, hash: 'nope' }), false);
  await assert.rejects(sealCallNote({ id: 'n2', consent: makeConsent({ given: false }), transcript, note }), /consent/);

  const req = callNoteToRequest(sealed, { id: 'F1', union: 'Deopara', village: 'V', villageBn: 'ভি', lat: 1, lon: 2 }, Date.UTC(2026, 10, 5));
  assert.equal(req.id, 'C-n1');
  assert.equal(req.priority, 'High');
  assert.equal(req.crop, 'tomato');
  assert.equal(req.type, 'call');
  assert.equal(req.text.bn, 'টমেটোর পাতায় দাগ');
  assert.equal(req.created, Date.UTC(2026, 10, 5));
});
