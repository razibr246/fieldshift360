// Ties চক্র এজেন্ট (engine/chakra.js) to the app: the tasks it sees from the store, the actions it takes on its own in
// agent mode, the officer's verdict queue, and the conversation (Claude through api/agent.js when it is switched on,
// otherwise the app's own voice brain), spoken both ways through the browser.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, soilData, demo } from '../../store';
import { runCrew } from '../../engine/crew';
import { cases as problemCases, checkBackTasks } from '../../engine/path';
import { runGoal, understand } from '../../engine/goal';
import { farmerTasks, officerTasks, problemTask, gateFor, authorize, autoCountToday, sanitize, DAILY_AUTO_LIMIT, verifyAudit } from '../../engine/chakra';
import { weatherAlerts } from '../../engine/water';
import { harvestPriceHistory } from '../../engine/glut';
import { daysBetween } from '../../engine/dates';
import { replyTemplate, advisoryText } from '../../engine/advice';
import { unionsOf } from '../../data/demo';
import { createSession, greeting, respond } from '../../voice/brain';
import { farmerSnapshot, officerSnapshot } from '../../voice/snapshot';
import { createRecognizer, sttSupported, speakNatural, stopSpeaking } from '../../voice/speech';

let uid = 0;
const mk = (who, text, extra = {}) => ({ id: `c${++uid}`, who, text, ...extra });
// "What should I do today?" and the like: the crew answers at once from the app's own numbers (no AI call, no quota).
// A season goal is said with a wish word: "... চাই", "... লাগুক", "... হোক".
const GOAL_Q = /চাই|লাগুক|হোক|লক্ষ্য|কীভাবে|কিভাবে|i want|goal|how can i|how do i/i;
const both = (bn, en) => ({ bn, en });
const BRIEF_Q = /আজ(কে)? কী (কী )?কর|কী করা (উচিত|দরকার)|কী করতে হবে|আজকের কাজ|সব (ঠিক|ভালো) আছে|কী অবস্থা|পরামর্শ দি|what should i do|what to do|today|briefing|how is my field/i;
const YES = /^(হ্যাঁ|হা|জি|ঠিক আছে|পাঠান|পাঠাও|yes|ok|send)/i;
const NO = /^(না|থাক|no|cancel)/i;
// Problems advice.js answers with field practice the farmer can follow today (the rest are the officer's own words).
const PRACTICE = new Set(['bph', 'stem_borer', 'blast', 'sheath_blight', 'rodent', 'aphid', 'leaf_spot', 'cold']);
const adviceFn = (r) => (PRACTICE.has(r.symptom) ? { bn: replyTemplate(r, (b) => b), en: replyTemplate(r, (b, e) => e) } : null);

export function useChakra(role) {
  const store = useStore();
  const { s, dispatch, T, toast } = store;
  const ref = useRef(store);
  ref.current = store;
  const mode = s.chakra?.mode?.[role] ?? 'manual';
  const handled = useMemo(() => new Set(s.chakra?.handled ?? []), [s.chakra?.handled]);
  const audit = s.chakra?.audit ?? [];

  // ── what the agent sees ──
  const officerUnions = useMemo(() => unionsOf(store.officerUpazila.id).map((u) => u.id), [store.officerUpazila.id]);
  // The farmer's context, shared by চক্র এজেন্ট's tasks and the crew (engine/crew.js), which also reads the weather numbers.
  const fctx = useMemo(() => {
    if (role !== 'farmer') return null;
    const { farmer: f, chosen, weather, water, today, daysAfter, confirmedPlan, upazila, unreadAdvisories } = store;
    const hw = chosen.hw;
    return {
      farmer: f, today, officer: upazila.officer, water, alerts: weatherAlerts({ tmax: weather.tmax, rainNext3: weather.rainNext3 }),
      weather: { rain7: weather.rain7, rainNext3: weather.rainNext3, tmax: weather.tmax },
      plan: { crop: { id: chosen.crop.id, ...chosen.crop.name }, confirmed: !!confirmedPlan, daysToPlant: -daysAfter },
      harvest: hw ? { daysTo: daysBetween(today, hw.start), glut: chosen.glut?.level, hold: harvestPriceHistory(chosen.crop.id, hw)?.hold ?? null, crop: { id: chosen.crop.id, ...chosen.crop.name } } : null,
      requests: s.requests.filter((r) => r.farmerId === f.id), unread: unreadAdvisories,
    };
  }, [role, store, s.requests]);
  // চক্র পথ: every problem of this farmer (or of the officer's unions) on its path, replayed from the saved data.
  const caseList = useMemo(() => {
    const mine = role === 'farmer' ? s.requests.filter((r) => r.farmerId === store.farmer.id) : s.requests.filter((r) => officerUnions.includes(r.union));
    const advisories = role === 'farmer' ? [...(store.myAdvisories ?? []), ...s.advisories] : s.advisories;
    return problemCases(mine, { advisories, escalations: s.escalations, today: store.today });
  }, [role, s.requests, s.advisories, s.escalations, store.farmer.id, store.myAdvisories, store.today, officerUnions]);
  const all = useMemo(() => {
    if (role === 'farmer') return [...farmerTasks(fctx), ...checkBackTasks(caseList, { farmer: fctx.farmer, today: fctx.today })];
    const mine = new Set(officerUnions);
    const hotspots = store.hotspots.flatMap((h) => {
      const members = h.members.filter((m) => mine.has(m.union));
      if (members.length < 2) return [];
      const memberUnions = [...new Set(members.map((m) => m.union))];
      const metas = memberUnions.map((id) => store.unionsAll[id]?.meta).filter(Boolean);
      if (!metas.length) return [];
      const local = { ...h, members, villages: [...new Set(members.map((m) => m.village))] };
      const meta = { ...metas[0], bn: metas.map((x) => x.bn).join(' ও '), en: metas.map((x) => x.en).join(' and ') };
      return [{ ...local, recipients: [...new Set(members.map((m) => m.farmerId))], draft: { bn: advisoryText(local, meta, 'bn'), en: advisoryText(local, meta, 'en') }, sent: s.advisories.some((a) => a.cluster === h.id) }];
    });
    return officerTasks({
      unions: officerUnions, today: store.today, requests: s.requests, hotspots,
      replyFn: (r) => ({ bn: replyTemplate(r, (b) => b), en: replyTemplate(r, (b, e) => e) }), farmerName: (id) => store.farmerOf(id)?.name,
    });
  }, [role, store, fctx, caseList, s.requests, s.advisories, officerUnions]);
  const tasks = useMemo(() => all.filter((t) => !handled.has(t.id)).map((t) => ({ ...t, gate: gateFor(role, mode, t) })), [all, handled, role, mode]);
  // চক্র দল: the whole crew's briefing on the current state (questions run it again with only the members they need).
  const crew = useMemo(() => runCrew(role, fctx ?? { today: store.today }, { tasks }), [role, fctx, store.today, tasks]);
  const verdicts = tasks.filter((t) => t.gate === 'verdict');

  // ── doing things ──
  const scope = useCallback(() => {
    const c = ref.current;
    return role === 'farmer'
      ? { farmerId: c.farmer.id, union: c.farmer.union, requestOf: (id) => c.s.requests.find((r) => r.id === id) }
      : { unions: officerUnions, unionOf: (id) => c.s.requests.find((r) => r.id === id)?.union, farmerUnionOf: (id) => c.farmerOf(id)?.union };
  }, [role, officerUnions]);
  const who = role === 'farmer' ? store.farmer.id : `UAO-${store.officerUpazila.id}`;
  const log = useCallback((task, action, gate, result) => dispatch({ type: 'chakraLog', task, entry: { at: Date.now(), role, who, task, action, gate, result } }), [dispatch, role, who]);

  // Every effect passes authorize() first; one refused effect stops the whole task.
  const run = useCallback((task, gate, edited) => {
    const effects = task.effects.filter((e) => e.type !== 'notify').map((e) => (edited && e.type === 'addAdvisory' ? { ...e, adv: { ...e.adv, text: edited } } : e));
    for (const e of effects) {
      const ok = authorize(role, e, scope());
      if (!ok.ok) { log(task.id, e.type, gate, `refused: ${ok.reason}`); toast('চক্র এজেন্ট: অনুমতি নেই, কাজটি হয়নি', `Chakra Agent: not allowed (${ok.reason})`); return false; }
    }
    for (const e of effects) {
      if (e.type === 'addRequest') dispatch({ type: 'addRequest', req: e.req });
      else if (e.type === 'addAdvisory') dispatch({ type: 'addAdvisory', adv: { ...e.adv, from: who } });
      else if (e.type === 'updateRequest') dispatch({ type: 'updateRequest', ids: e.ids, patch: e.patch });
      else if (e.type === 'escalate' || e.type === 'followUp') dispatch({ type: 'escalate', esc: e.esc });
      else if (e.type === 'closeRequest') dispatch({ type: 'updateRequest', ids: [e.id], patch: { status: 'resolved', resolvedAt: Date.now() } });
      else if (e.type === 'setPriority' && !ref.current.s.priorities.includes(e.id)) dispatch({ type: 'togglePriority', id: e.id });
    }
    log(task.id, effects.map((e) => e.type).join('+') || 'notify', gate, 'done');
    return true;
  }, [dispatch, log, role, scope, toast, who]);
  const approve = useCallback((task, edited) => { if (run(task, 'verdict', edited)) toast('অনুমোদন দিয়ে পাঠানো হয়েছে', 'Approved and sent'); }, [run, toast]);
  const act = useCallback((task) => { if (run(task, task.gate ?? 'confirm')) toast('পাঠানো হয়েছে', 'Sent'); }, [run, toast]);
  const reject = useCallback((task, why = '') => log(task.id, 'reject', task.gate, `rejected${why ? `: ${sanitize(why, 120)}` : ''}`), [log]);
  const dismiss = useCallback((task) => log(task.id, 'dismiss', task.gate, 'seen'), [log]);
  const setMode = useCallback((m) => { dispatch({ type: 'chakraMode', role, mode: m }); log(null, `mode:${m}`, 'person', 'set'); }, [dispatch, log, role]);

  // Agent mode: the farmer's agent reports and chases on its own, within the daily limit; each step is logged.
  useEffect(() => {
    if (mode !== 'agent') return;
    const t = tasks.find((x) => x.gate === 'auto' && x.effects.some((e) => e.type !== 'notify'));
    if (!t) return;
    if (autoCountToday(audit, role, store.today) >= DAILY_AUTO_LIMIT) return;
    if (run(t, 'auto')) toast(`চক্র এজেন্ট: ${t.title.bn}`, `Chakra Agent: ${t.title.en}`);
  }, [mode, tasks, audit, role, run, toast, store.today]);

  // ── conversation ──
  const brainRole = role === 'farmer' ? 'farmer' : 'uao'; // the voice brain's name for the upazila officer
  const session = useRef(null);
  if (!session.current || session.current.role !== brainRole) session.current = createSession({ role: brainRole, lang: s.lang });
  const [messages, setMessages] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | listening | thinking | speaking
  const [interim, setInterim] = useState('');
  const [voiceOn, setVoiceOn] = useState(true); // speak answers aloud and listen again: the hands-free mode
  const [voiceNote, setVoiceNote] = useState(null); // why the natural voice is off this visit ('quota' | 'no-key'), shown under the orb
  const [ai, setAi] = useState('unknown'); // unknown | on | off (api/agent.js not switched on)
  const pending = useRef(null); // a problem report waiting for the farmer's yes
  const rec = useRef(null);
  const flags = useRef({});
  flags.current = { voiceOn, mode };

  const snap = useCallback(() => {
    const c = ref.current;
    return role === 'farmer'
      ? farmerSnapshot(c, { clim: c.clim, soilData, unions: demo.unions })
      : officerSnapshot(c, 'uao', { clim: c.officerClim, soilData, templateFn: replyTemplate, advisoryFn: advisoryText, radar: null });
  }, [role]);

  const listen = useCallback(() => {
    if (!sttSupported()) { setMessages((m) => [...m, mk('bot', T('এই ব্রাউজারে কথা শোনা যায় না, লিখে বলুন।', 'This browser cannot listen; please type.'))]); return; }
    stopSpeaking();
    const r = createRecognizer({
      lang: ref.current.s.lang,
      onStart: () => setPhase('listening'),
      onInterim: setInterim,
      onFinal: (t) => { setInterim(''); sendRef.current(t, true); },
      onEnd: (got) => { setInterim(''); if (!got) setPhase('idle'); },
      onError: () => setPhase('idle'),
    });
    rec.current = r;
    try { r.start(); } catch { setPhase('idle'); }
  }, [T]);
  const say = useCallback(async (text) => {
    if (!flags.current.voiceOn || !text) { setPhase('idle'); return; }
    setPhase('speaking');
    const r = await speakNatural(text, ref.current.s.lang, { onEnd: () => { setPhase('idle'); if (flags.current.voiceOn) listen(); } });
    if (r.fallback === 'quota' || r.fallback === 'no-key') setVoiceNote(r.fallback);
    if (!r.ok) setPhase('idle');
  }, [listen]);
  const reply = useCallback((text, extra = {}) => { setMessages((m) => [...m, mk('bot', text, extra)]); say(text); }, [say]);

  // A proposal from Claude becomes a task, and goes through the same gates and checks as the agent's own.
  const fromProposal = useCallback((p) => {
    const c = ref.current;
    if (p.action === 'navigate') return /^\/(farmer|officer)\//.test(p.target) ? { nav: p.target } : null;
    if (role === 'farmer' && p.action === 'report_problem') return problemTask(p.text, { farmer: c.farmer, cropNow: c.daysAfter >= 0 ? c.chosen.crop.id : 'aman', today: c.today, now: Date.now(), weather: c.weather, lang: c.s.lang, adviceFn });
    if (role === 'farmer' && p.action === 'follow_up') return all.find((t) => t.id === `follow-${p.target}`) ?? null;
    if (role === 'officer' && p.action === 'reply_farmer') {
      const t = all.find((x) => x.id === `reply-${p.target}`);
      return t && { ...t, id: `${t.id}-ai`, tags: [...t.tags, 'AI'], body: { bn: p.text, en: p.text }, effects: t.effects.map((e) => (e.type === 'addAdvisory' ? { ...e, adv: { ...e.adv, text: p.text } } : e)) };
    }
    if (role === 'officer' && p.action === 'area_advice') {
      const t = all.find((x) => x.id === `area-${p.target}`);
      return t && { ...t, id: `${t.id}-ai`, body: { bn: p.text, en: p.text }, effects: t.effects.map((e) => (e.type === 'addAdvisory' ? { ...e, adv: { ...e.adv, text: p.text } } : e)) };
    }
    return null;
  }, [all, role]);

  // A task in the chat: done at once when the gate allows, else it waits for the yes (farmer) or the verdict (officer).
  const offer = useCallback((task) => {
    const gate = gateFor(role, flags.current.mode, task);
    if (gate === 'auto') { run(task, 'auto'); return T('পাঠিয়ে দিয়েছি।', 'Done, it has been sent.'); }
    if (gate === 'verdict') { setMessages((m) => [...m, mk('task', '', { task: { ...task, gate } })]); return T('খসড়া তৈরি, আপনার অনুমোদনের অপেক্ষায়।', 'Draft ready; it waits for your approval.'); }
    pending.current = task;
    return T('পাঠাব? "হ্যাঁ" বা "না" বলুন।', 'Shall I send it? Say yes or no.');
  }, [T, role, run]);

  const send = useCallback(async (raw, spoken = false) => {
    const text = sanitize(raw);
    if (!text) return;
    const c = ref.current;
    const lang = c.s.lang;
    session.current.lang = lang;
    setMessages((m) => [...m, mk('user', text, { spoken })]);
    // A yes or no to a report the agent prepared.
    if (pending.current) {
      const p = pending.current;
      if (YES.test(text) && p.kind === 'goal') { pending.current = null; run(p, 'confirm'); return reply(T('পরিকল্পনাটা এই লক্ষ্যের দিকে ঝুঁকিয়ে দিয়েছি। পরিকল্পনা পাতায় নতুন সুপারিশ দেখুন।', 'I have weighted the plan towards this goal. See the new recommendation on the plan page.'), { nav: '/farmer/plan' }); }
      if (YES.test(text)) { pending.current = null; run(p, 'confirm'); return reply(T(`পাঠিয়ে দিয়েছি। উপজেলা কৃষি অফিসার ${c.upazila.officer.bn} দেখে উত্তর দেবেন।`, `Sent. The upazila agriculture officer, ${c.upazila.officer.en}, will reply.`)); }
      if (NO.test(text)) { pending.current = null; log(p.id, 'decline', 'confirm', 'not sent'); return reply(p.kind === 'goal' ? T('ঠিক আছে, পরিকল্পনা যেমন ছিল তেমনই থাকল।', 'Okay, the plan stays as it was.') : T('ঠিক আছে, পাঠাইনি।', 'Okay, I did not send it.')); }
    }
    // The farmer describes a field problem: the agent looks first and reports it (on its own in agent mode).
    if (role === 'farmer' && !session.current.state) {
      const t = problemTask(text, { farmer: c.farmer, cropNow: c.daysAfter >= 0 ? c.chosen.crop.id : 'aman', today: c.today, now: Date.now(), weather: c.weather, lang, adviceFn });
      if (t) {
        const top = t.look.findings[0];
        const head = T(`মনে হচ্ছে ${top.name_bn}। এখনই করুন: ${t.advice.bn}`, `It looks like ${top.name_en}. Do this now: ${t.advice.en}`);
        setMessages((m) => [...m, mk('task', '', { task: { ...t, gate: gateFor(role, flags.current.mode, t) } })]);
        return reply(`${head} ${offer(t)}`);
      }
    }
    // A briefing question, or one about weather, water, prices, planting or the office, goes to the crew members it is
    // about; an answer with nothing to say falls through to the AI or the brain.
    // A goal for the season ("বেশি লাভ চাই"): the goal loop plans and runs its checks, then asks before changing the plan.
    if (role === 'farmer' && understand(text) && GOAL_Q.test(text)) {
      const g = runGoal(text, { options: c.decision.options, chosen: c.chosen, priorities: c.s.priorities });
      if (g) {
        setMessages((m) => [...m, mk('goal', '', { goal: g })]);
        if (g.proposal) {
          const task = { id: `goal-${g.goal.id}-${Date.now().toString(36)}`, kind: 'goal', risk: 'low', tags: ['MODEL', 'RULE'], title: both(`পরিকল্পনায় ${g.goal.name.bn} আগে`, `Weight the plan to ${g.goal.name.en}`), body: g.say, why: both('আপনার বলা লক্ষ্য থেকে', 'From the goal you gave'), nav: '/farmer/plan', effects: [g.proposal] };
          offer(task); // always a "yes" from the farmer (POLICY.confirm); g.say already asks for it
        }
        return reply(lang === 'bn' ? g.say.bn : g.say.en, { tags: ['MODEL', 'RULE'], nav: g.proposal ? undefined : '/farmer/plan' });
      }
    }
    if (BRIEF_Q.test(text)) {
      const q = runCrew(role, role === 'farmer' ? fctx : { today: c.today }, { question: text, tasks });
      if (q.top.length) {
        const nav = q.top.find((n) => n.nav)?.nav;
        setMessages((m) => [...m, mk('crew', '', { crew: q })]);
        return reply(lang === 'bn' ? q.say.bn : q.say.en, { nav, tags: [...new Set(q.top.flatMap((n) => n.tags))] });
      }
    }
    // Gemini (or Claude) when api/agent.js is on; the app's own brain otherwise (and whenever the network or the key fails).
    if (ai !== 'off' && navigator.onLine !== false) {
      setPhase('thinking');
      try {
        const sn = snap();
        const data = role === 'farmer'
          ? { farmer: sn.farmer, plan: sn.plan, today: sn.today, soil: sn.soil, rotation: sn.rotation, requests: sn.requests, advisories: sn.advisories, compare: sn.compare, crew_findings: crew.top.map((n) => ({ by: n.member, text: n.text })), agent_tasks: tasks.map((t) => ({ id: t.id, kind: t.kind, title: t.title, body: t.body })) }
          : { area: sn.area, upazila: sn.upazila, crew_findings: crew.top.map((n) => ({ by: n.member, text: n.text })), agent_tasks: tasks.map((t) => ({ id: t.id, kind: t.kind, request: t.request, title: t.title, body: t.body })) };
        // Gemini can be slow to start; after half a minute the app's own engine answers instead of keeping the farmer waiting.
        const r = await fetch('/api/agent', { signal: AbortSignal.timeout(32000), method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role, lang, message: text, history: messages.filter((m) => m.who === 'user' || m.who === 'bot').slice(-8), data }) });
        if (r.status === 503 || r.status === 404) setAi('off');
        else if (r.ok) {
          const j = await r.json();
          setAi('on');
          const made = (j.proposals ?? []).map(fromProposal).filter(Boolean);
          const nav = made.find((x) => x.nav)?.nav;
          const extra = made.filter((x) => !x.nav).map(offer);
          for (const t of made.filter((x) => x.effects && gateFor(role, flags.current.mode, x) !== 'verdict')) setMessages((m) => [...m, mk('task', '', { task: { ...t, gate: gateFor(role, flags.current.mode, t) } })]);
          return reply([j.reply, ...extra].filter(Boolean).join(' '), { nav, sources: j.sources, tags: ['AI'] });
        }
      } catch { /* offline or unreachable: the local brain answers below */ }
    }
    const res = respond(text, snap(), session.current);
    for (const e of res.effects) {
      if (e.type === 'setLang') dispatch({ type: 'set', patch: { lang: e.lang } });
      // the brain only returns these after the person said yes, so they count as confirmed
      else if (e.type !== 'stop' && authorize(role, e, scope()).ok) {
        if (e.type === 'addRequest') dispatch({ type: 'addRequest', req: e.req });
        else if (e.type === 'addAdvisory') dispatch({ type: 'addAdvisory', adv: e.adv });
        else if (e.type === 'updateRequest') dispatch({ type: 'updateRequest', ids: e.ids, patch: e.patch });
        else if (e.type === 'escalate') dispatch({ type: 'escalate', esc: e.esc });
        log(null, e.type, 'confirm', 'done');
      }
    }
    return reply(res.say, { chips: res.chips, nav: res.nav });
  }, [T, ai, crew, dispatch, fctx, fromProposal, log, messages, offer, reply, role, run, scope, snap, tasks]);
  const sendRef = useRef(send);
  sendRef.current = send;

  // Opening the panel: the greeting, then a short spoken briefing of what is waiting (the tap that opened it lets the
  // browser play sound).
  const start = useCallback(() => {
    if (messages.length) return;
    const g = greeting(snap(), session.current);
    // The crew's three most important points, with a word on the agent when it is on.
    const brief = crew.top.length ? T(`${crew.say.bn}${flags.current.mode === 'agent' && role === 'farmer' ? ' এজেন্ট চালু আছে, জরুরি কিছু হলে আমি নিজেই অফিসে জানাব।' : ''}`,
      `${crew.say.en}${flags.current.mode === 'agent' && role === 'farmer' ? ' The agent is on: I will tell the office myself if something is urgent.' : ''}`) : null;
    setMessages([mk('bot', g.say, { chips: g.chips }), ...(brief ? [mk('bot', brief)] : [])]);
    say(brief ?? g.say);
  }, [T, crew, messages.length, role, say, snap]);
  const stopAll = useCallback(() => { stopSpeaking(); try { rec.current?.abort(); } catch { /* idle */ } setPhase('idle'); }, []);
  useEffect(() => () => stopAll(), [stopAll]);

  return {
    role, mode, setMode, tasks, verdicts, crew, caseList, approve, act, reject, dismiss, audit, auditOk: verifyAudit(audit),
    messages, phase, interim, voiceOn, setVoiceOn, voiceNote, ai, send, listen, stopAll, start,
  };
}
