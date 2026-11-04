// চক্র পথ (Chakra Path): each farmer problem as a case moving along a fixed path of steps, from the report to the
// answer to the farmer's own word that it is solved. Pure functions, no React.
//
// The path is a small graph: steps that happen, waits where a person must act (the officer to answer, the farmer to
// say whether it helped), and edges that choose the next step from what is known. Nothing extra is stored: the case is
// replayed from the saved request, messages and escalations every time, so it picks up where it left off after a
// reload or on another device, and its trail is the history of how it got there.
// Stateful agent graphs with human interrupts were popularised by frameworks such as LangGraph; this is its own design.

const DAY = 86400000;
const both = (bn, en) => ({ bn, en });
const bnN = (n) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
export const CHECK_BACK_DAYS = 3; // days after the answer before the agent asks the farmer whether it helped

// ───────────────────────── the runner ─────────────────────────
// graph: { start, nodes: { id: { name, kind: 'step'|'wait'|'end', who?, passed(f) -> time|null, next(f) -> id, ask?(f) } } }
// A step or wait whose `passed` returns a time has happened; a wait that has not is where the case stops (an interrupt).
export function walk(graph, facts, maxSteps = 20) {
  const trail = [];
  let at = graph.start;
  for (let i = 0; i < maxSteps; i++) {
    const n = graph.nodes[at];
    if (!n) return { at, trail, error: `no step ${at}` };
    if (n.kind === 'end') { trail.push({ node: at, name: n.name, at: n.passed?.(facts) ?? null }); return { at, trail, done: true, waiting: null }; }
    const t = n.passed(facts);
    if (t == null) {
      if (n.kind === 'wait') return { at, trail, done: false, waiting: { node: at, who: n.who, name: n.name, ask: n.ask?.(facts) ?? null, since: trail[trail.length - 1]?.at ?? null } };
      at = n.next(facts); // a step that did not happen (no photo, so no first look) is passed by
      continue;
    }
    trail.push({ node: at, name: n.name, at: t, note: n.note?.(facts) ?? null });
    at = n.next(facts);
  }
  return { at, trail, error: 'path too long' };
}

// ───────────────────────── the farmer-problem path ─────────────────────────
export const PROBLEM_PATH = {
  start: 'reported',
  nodes: {
    reported: { kind: 'step', name: both('সমস্যা জানানো', 'Problem reported'), passed: (f) => f.created, next: () => 'first_look' },
    first_look: { kind: 'step', name: both('ফসলের ডাক্তারের প্রথম দেখা', 'Crop doctor’s first look'), passed: (f) => (f.firstLook ? f.created : null), next: () => 'officer' },
    officer: {
      kind: 'wait', who: 'officer', name: both('কর্মকর্তা দেখছেন', 'With the officer'),
      passed: (f) => f.replyAt ?? (f.status === 'need_info' || f.status === 'answered' || f.status === 'resolved' ? f.created : null),
      note: (f) => (f.raisedAt ? both('উপজেলায় জানানো হয়েছে', 'Raised to the upazila') : null),
      ask: (f) => both(`উত্তরের অপেক্ষা, ${bnN(Math.floor((f.today - f.created) / DAY))} দিন${f.raisedAt ? '; উপজেলায় জানানো হয়েছে' : ''}`, `Waiting for a reply, ${Math.floor((f.today - f.created) / DAY)} day(s)${f.raisedAt ? '; raised to the upazila' : ''}`),
      next: (f) => (f.status === 'need_info' ? 'more_info' : 'advised'),
    },
    more_info: {
      kind: 'wait', who: 'farmer', name: both('আরও ছবি চাওয়া হয়েছে', 'More photos asked for'),
      passed: (f) => f.newPhotoAt, ask: () => both('কর্মকর্তা আরও ছবি চেয়েছেন। "ফসলের ডাক্তার" পাতা থেকে পাঠান।', 'The officer asked for more photos. Send them from the Crop doctor page.'),
      next: () => 'advised',
    },
    advised: { kind: 'step', name: both('পরামর্শ এসেছে', 'Advice received'), passed: (f) => f.replyAt ?? (f.status === 'answered' || f.status === 'resolved' ? f.created : null), next: () => 'check_back' },
    check_back: {
      kind: 'wait', who: 'farmer', name: both('উপকার হলো কি না', 'Did it help?'),
      passed: (f) => (f.status === 'resolved' ? f.resolvedAt ?? f.today : null),
      ask: (f) => {
        const since = f.replyAt ?? f.created;
        const due = since + CHECK_BACK_DAYS * DAY;
        return f.today >= due ? both('পরামর্শে উপকার হয়েছে? সমস্যা মিটে গেলে জানান।', 'Did the advice help? Tell me if the problem is solved.') : both(`${bnN(Math.ceil((due - f.today) / DAY))} দিন পরে জিজ্ঞেস করব, পরামর্শে উপকার হলো কি না।`, `In ${Math.ceil((due - f.today) / DAY)} day(s) I will ask whether the advice helped.`);
      },
      next: () => 'solved',
    },
    solved: { kind: 'end', name: both('সমস্যা মিটেছে', 'Solved'), passed: (f) => f.resolvedAt ?? null },
  },
};

// The facts of one request, from what the app already saves.
export function caseFacts(r, { advisories = [], escalations = [], today }) {
  const replies = advisories.filter((a) => a.request === r.id).map((a) => a.sent ?? a.at).filter(Number.isFinite).sort((a, b) => a - b);
  const raised = escalations.find((e) => e.id === `REQ-${r.id}` || e.id === `FU-${r.id}` || e.request === r.id);
  return {
    id: r.id, created: r.created, status: r.status, firstLook: !!(r.ai?.length || r.doctor), replyAt: replies[0] ?? null,
    raisedAt: raised?.at ?? null, newPhotoAt: r.photoAgainAt ?? null, resolvedAt: r.resolvedAt ?? null, today,
  };
}

export function cases(requests, ctx) {
  return (requests ?? []).map((r) => {
    const f = caseFacts(r, ctx);
    return { id: r.id, crop: r.crop, symptom: r.symptom, text: r.text, created: r.created, ...walk(PROBLEM_PATH, f), facts: f };
  }).sort((a, b) => Number(a.done) - Number(b.done) || b.created - a.created);
}

// Where a case waits for the farmer after the check-back day: চক্র এজেন্ট asks, and either answer is a task that goes
// through the usual gates. "Solved" closes the farmer's own request (always the farmer's yes, see POLICY.confirm);
// "not yet" chases the office.
export function checkBackTasks(list, { farmer, today }) {
  const out = [];
  for (const c of list) {
    if (c.waiting?.node !== 'check_back' || today < (c.facts.replyAt ?? c.created) + CHECK_BACK_DAYS * DAY) continue;
    out.push({ id: `solved-${c.id}`, kind: 'checkBack', risk: 'low', tags: ['RULE'], title: both('সমস্যা কি মিটেছে?', 'Is the problem solved?'),
      body: both('কর্মকর্তার পরামর্শে উপকার হলে "হ্যাঁ" দিন, অনুরোধটি মিটে গেছে বলে লেখা হবে।', 'If the officer’s advice worked, say yes and the request is marked solved.'),
      why: both(`পরামর্শ আসার ${bnN(CHECK_BACK_DAYS)} দিন পার হয়েছে`, `${CHECK_BACK_DAYS} days since the advice`), effects: [{ type: 'closeRequest', id: c.id }] });
    out.push({ id: `notyet-${c.id}`, kind: 'checkBack', risk: 'medium', tags: ['RULE'], title: both('এখনো মেটেনি?', 'Not solved yet?'),
      body: both('উপকার না হলে কর্মকর্তাকে আবার জানিয়ে দিই।', 'If it did not help, I tell the officer again.'),
      why: both('পরামর্শের পরেও সমস্যা থাকলে', 'If the problem stays after the advice'),
      effects: [{ type: 'followUp', esc: { id: `FU2-${c.id}`, union: farmer.union, kind: 'followup', request: c.id, text: both(`${farmer.name.bn}: পরামর্শের পরেও সমস্যা মেটেনি`, `${farmer.name.en}: still not solved after the advice`), at: today } }] });
  }
  return out;
}
