// api/agent.js with Gemini stubbed: an answer that fails the app's checks is asked for again, and one that still
// fails is repaired before it is sent (src/engine/replyCheck.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './agent.js';

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

// A Gemini streamed answer carrying this JSON.
const sse = (out) => new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }], modelVersion: 'stub' })}\n\n`, { status: 200 });

async function withGemini(answers, run) {
  const saved = { key: process.env.GEMINI_API_KEY, fetch: globalThis.fetch };
  process.env.GEMINI_API_KEY = 'test';
  const sent = [];
  globalThis.fetch = async (url, init) => { sent.push(JSON.parse(init.body)); return sse(answers[Math.min(sent.length - 1, answers.length - 1)]); };
  try { return await run(sent); } finally {
    if (saved.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved.key;
    globalThis.fetch = saved.fetch;
  }
}

const data = {
  prov: { climate: 'REAL', soil: 'REAL' },
  today: { water: { color: 'GREEN', reasons: [{ bn: 'আগামী ৩ দিনে ১২ মিমি বৃষ্টির পূর্বাভাস', en: '12 mm of rain forecast in the next 3 days' }] }, weather: { rainNext3: 12, rain7: 2, tmax: 30, live: true } },
  requests: [{ id: 'R-1' }],
};
const ask = (res) => handler({ method: 'POST', headers: {}, body: { role: 'farmer', lang: 'bn', message: 'আজ কি সেচ দেব?', data } }, res);

test('a good first answer goes out as it is, checked once', () => withGemini([{ reply: 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।', proposals: [] }], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(res.body.check.ok, true);
  assert.equal(res.body.check.attempts, 1);
  assert.equal(res.body.check.ceiling, 1);
}));

test('a failed answer is asked for again with the rule ids, and the second one is used', () => withGemini([
  { reply: 'আজই সেচ দিন, মাটিতে ৪০ মিমি ঘাটতি।', proposals: [] },
  { reply: 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।', proposals: [] },
], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(sent.length, 2);
  const note = sent[1].contents.at(-1).parts[0].text;
  assert.match(note, /\[R1_RAIN_OFFSET\]/);
  assert.match(note, /\[G1_UNGROUNDED_NUMBER\]/);
  assert.equal(res.body.reply, 'আজ সেচ দেবেন না, আগামী ৩ দিনে ১২ মিমি বৃষ্টি আসছে।');
  assert.equal(res.body.check.ok, true);
  assert.equal(res.body.check.attempts, 2);
}));

test('an answer that fails twice is repaired, and a proposal pointing nowhere is dropped', () => withGemini([
  { reply: 'প্রতি লিটার পানিতে ২ মিলি মিশিয়ে স্প্রে করুন।', proposals: [{ action: 'follow_up', text: '', target: 'R-404' }] },
], async (sent) => {
  const res = response();
  await ask(res);
  assert.equal(sent.length, 2);
  assert.equal(res.body.check.ok, false);
  assert.equal(res.body.check.repaired, true);
  assert.doesNotMatch(res.body.reply, /মিলি/);
  assert.match(res.body.reply, /কৃষি অফিসারকে/);
  assert.deepEqual(res.body.proposals, []);
}));
