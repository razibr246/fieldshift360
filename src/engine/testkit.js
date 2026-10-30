// The field-test kit's logic (pages/public/TestKit.jsx): one session with one farmer or officer, the four tasks of the
// first path timed, the three questions judged, problems seen, a smiley rating, and the record turned into a CSV and
// into rows for docs/USER_TESTING.md. No names or phone numbers are ever stored. Pure.
export const TASKS = [
  { k: 'field', bn: 'জমি বাছুন', en: 'Choose the field', path: '/farmer/plan' },
  { k: 'prio', bn: 'কী চান বলুন', en: 'Say what matters', path: '/farmer/plan' },
  { k: 'compare', bn: 'ফসলচক্র মিলিয়ে দেখুন', en: 'Compare the rotations', path: '/farmer/future' },
  { k: 'officer', bn: 'কর্মকর্তাকে পাঠান', en: 'Send it to the officer', path: '/farmer/help' },
];
export const QUESTIONS = [
  { k: 'q1', bn: 'কী করতে বলছে?', en: 'What is recommended?', ok: { bn: 'ফসল আর মোটামুটি কবে বুনতে হবে, বলতে পারেন', en: 'Names the crop and roughly when to sow' } },
  { k: 'q2', bn: 'কেন?', en: 'Why?', ok: { bn: 'দেখানো অন্তত একটা আসল কারণ বলেন (আবহাওয়া, পানি, লাভ, মাটি)', en: 'Gives at least one real reason shown (weather, water, profit, soil)' } },
  { k: 'q3', bn: 'কাজের আগে কী যাচাই করবেন?', en: 'What should you check first?', ok: { bn: 'অন্তত একটা যাচাই বলেন (মাটি পরীক্ষা, বীজ, পানি, নালা, কর্মকর্তা)', en: 'Names at least one check (soil test, seed, water, drain, the officer)' } },
];
export const ANSWER = { yes: 2, partly: 1, no: 0 };

// A blank session. role: 'farmer' | 'officer'; reading: 'reads' | 'some' | 'none'; phone: 'smart' | 'low' | 'feature'
export const newSession = (at = Date.now()) => ({ at, place: '', role: 'farmer', woman: false, reading: 'reads', phone: 'smart', tasks: {}, answers: {}, notes: {}, problems: '', rating: null, mode: 'app' });

// A session's summary: tasks done unaided, seconds per task, questions understood (0–6), and whether it passes the
// protocol's bar (all three questions at least partly understood).
export function summarise(s) {
  const done = TASKS.filter((t) => s.tasks[t.k]?.done && !s.tasks[t.k]?.helped).length;
  const secs = TASKS.map((t) => s.tasks[t.k]?.secs ?? null);
  const understood = QUESTIONS.reduce((a, q) => a + (ANSWER[s.answers[q.k]] ?? 0), 0);
  const pass = QUESTIONS.every((q) => (ANSWER[s.answers[q.k]] ?? 0) >= 1);
  return { done, secs, understood, pass };
}

// Across sessions: how many people, how many passed, the share who understood each question, the median task times.
export function overview(sessions) {
  const n = sessions.length;
  const med = (v) => { const x = v.filter((y) => y != null).sort((a, b) => a - b); return x.length ? x[Math.floor(x.length / 2)] : null; };
  return {
    n, passed: sessions.filter((s) => summarise(s).pass).length,
    byQuestion: Object.fromEntries(QUESTIONS.map((q) => [q.k, n ? sessions.filter((s) => (ANSWER[s.answers[q.k]] ?? 0) === 2).length / n : 0])),
    medianSecs: Object.fromEntries(TASKS.map((t) => [t.k, med(sessions.map((s) => s.tasks[t.k]?.secs ?? null))])),
    lowLiteracy: sessions.filter((s) => s.reading !== 'reads').length, lowPhone: sessions.filter((s) => s.phone !== 'smart').length, women: sessions.filter((s) => s.woman).length,
  };
}

const cell = (v) => { const x = String(v ?? ''); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
export function toCsv(sessions) {
  const head = ['date', 'place', 'role', 'woman', 'reading', 'phone', 'mode', ...TASKS.flatMap((t) => [`${t.k}_done`, `${t.k}_helped`, `${t.k}_secs`]), ...QUESTIONS.flatMap((q) => [q.k, `${q.k}_note`]), 'problems', 'rating'];
  const rows = sessions.map((s) => [new Date(s.at).toISOString().slice(0, 10), s.place, s.role, s.woman ? 'yes' : 'no', s.reading, s.phone, s.mode,
    ...TASKS.flatMap((t) => [s.tasks[t.k]?.done ? 'yes' : 'no', s.tasks[t.k]?.helped ? 'yes' : 'no', s.tasks[t.k]?.secs ?? '']),
    ...QUESTIONS.flatMap((q) => [s.answers[q.k] ?? '', s.notes[q.k] ?? '']), s.problems, s.rating ?? '']);
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

// Rows in the results table of docs/USER_TESTING.md: Date | Place | Who | Phone | Q1 | Q2 | Q3 | Problems seen | Fixed in
export function toMarkdownRows(sessions) {
  const who = (s) => `${s.role === 'officer' ? 'officer' : 'farmer'}${s.woman ? ', woman' : ''}${s.reading !== 'reads' ? `, reads ${s.reading === 'some' ? 'a little' : 'no'} Bangla` : ''}`;
  const phone = { smart: 'smartphone', low: 'low-end Android', feature: 'feature phone (SMS)' };
  const ans = (s, k) => `${s.answers[k] ?? '—'}${s.notes[k] ? `: ${s.notes[k]}` : ''}`.replace(/\|/g, '/');
  return sessions.map((s) => `| ${new Date(s.at).toISOString().slice(0, 10)} | ${(s.place || '—').replace(/\|/g, '/')} | ${who(s)} | ${phone[s.phone] ?? s.phone} | ${ans(s, 'q1')} | ${ans(s, 'q2')} | ${ans(s, 'q3')} | ${(s.problems || '—').replace(/\|/g, '/').replace(/\n/g, ' ')} | |`).join('\n');
}
