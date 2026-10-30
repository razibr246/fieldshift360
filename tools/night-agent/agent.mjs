// The local FS360 agent: Ollama + a RAG index over the code in its scope. No cloud, no API key.
// Which agent (game, project …) comes from the profile run.sh loads: scope, rules file, memory and index folders.
//   node agent.mjs round            one improvement in the current directory (run.sh calls this in the worktree)
//   node agent.mjs done             the round passed every check: move its task to Done
//   node agent.mjs failed "why"     the round was thrown away: count the try, keep the lesson
//   node agent.mjs index            (re)build the index only
//   node agent.mjs ask "question"   show what the index retrieves for a question (to test the RAG)
// Settings come from config.sh through the environment (run.sh exports them).
import { execSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';

const env = process.env;
const AGENT_DIR = env.AGENT_DIR || join(env.HOME, 'fs360-night', 'game');
const MEMORY = env.MEMORY || join(AGENT_DIR, 'memory');
const OLLAMA = env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODEL = env.LOCAL_MODEL || 'qwen3.5:9b';
const EMBED = env.EMBED_MODEL || 'nomic-embed-text';
const CTX = Number(env.LOCAL_CTX || 12288);
const SCOPE = new RegExp(env.SCOPE_RE || '^(src/game/|src/components/game/|src/pages/public/(FarmGame|Saga|Games|Play)\\.jsx$)');
const EXCLUDE = new RegExp(env.EXCLUDE_RE || '^$');
const mine = (f) => SCOPE.test(f) && !EXCLUDE.test(f);
const RULES_FILE = env.RULES_FILE || new URL('./profiles/game.md', import.meta.url).pathname;
const INDEX = join(AGENT_DIR, 'rag', 'index.json');
const STATE = join(AGENT_DIR, 'rag', 'state.json');
const CONTEXT_CHARS = 15000;   // retrieved code per prompt (about 5k tokens; Bangla text costs more)
const say = (...a) => console.log(`[agent ${new Date().toTimeString().slice(0, 8)}]`, ...a);
const read = (p, d = '') => { try { return readFileSync(p, 'utf8'); } catch { return d; } };
const json = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const save = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v)); };

// ---- Ollama
async function ollama(path, body, ms = 20 * 60e3) {
  const r = await fetch(`${OLLAMA}${path}`, { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`ollama ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function up() {
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${OLLAMA}/api/version`)).ok) return; } catch { /* not running */ }
    if (i === 0) { say('starting ollama serve'); spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref(); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Ollama is not running (open the Ollama app or run: ollama serve)');
}
const embed = async (texts) => (await ollama('/api/embed', { model: EMBED, input: texts, truncate: true })).embeddings;
// Ollama silently drops the START of a prompt that is too long (the rules!), so keep the whole talk inside the
// window: about 3 characters a token for code with Bangla in it, and 2.5k tokens left for the answer.
function fit(messages) {
  const room = (CTX - 2500) * 3;
  let size = messages.reduce((n, m) => n + m.content.length, 0);
  for (let i = 1; size > room && i < messages.length - 1; i++) {   // old turns shrink first, the newest stays whole
    const m = messages[i], cut = Math.min(m.content.length - 400, size - room);
    if (cut > 0) { m.content = `${m.content.slice(0, m.content.length - cut)}\n[… cut to fit]`; size -= cut; }
  }
  if (size > room) { const m = messages[messages.length - 1]; m.content = `${m.content.slice(0, Math.max(2000, m.content.length - (size - room)))}\n[… cut to fit]`; }
  return messages;
}
// node:http, not fetch: fetch gives up when the first byte takes more than 5 minutes, and a slow Mac reading a long
// prompt can take that long. Streamed, with one 30-minute cap on the whole answer.
function stream(path, body, onLine) {
  return new Promise((ok, ko) => {
    const u = new URL(path, OLLAMA);
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let rest = '', err = '';
      res.setEncoding('utf8');
      res.on('data', (d) => {
        if (res.statusCode !== 200) { err += d; return; }
        rest += d; const lines = rest.split('\n'); rest = lines.pop();
        try { for (const l of lines) if (l.trim()) onLine(JSON.parse(l)); } catch (e) { req.destroy(e); }
      });
      res.on('end', () => (res.statusCode !== 200 ? ko(new Error(`ollama ${path}: ${res.statusCode} ${err}`)) : ok()));
      res.on('error', ko);
    });
    req.setTimeout(30 * 60e3, () => req.destroy(new Error('ollama: no answer in 30 minutes')));
    req.on('error', ko);
    req.end(JSON.stringify(body));
  });
}
async function chat(messages) {
  fit(messages);
  const body = { model: MODEL, messages, stream: true, keep_alive: '5m', think: false, options: { num_ctx: CTX, temperature: 0.2 } };
  let text = '', end = null;
  const take = (m) => { if (m.error) throw new Error(`ollama: ${m.error}`); text += m.message?.content || ''; if (m.done) end = m; };
  try { await stream('/api/chat', body, take); }
  catch (e) {   // a model without a thinking switch refuses `think`: ask again without it
    if (!/think/i.test(e.message)) throw e;
    delete body.think; text = ''; await stream('/api/chat', body, take);
  }
  if (end) say(`read ${end.prompt_eval_count} tokens in ${(end.prompt_eval_duration / 1e9).toFixed(0)} s, wrote ${end.eval_count} at ${(end.eval_count / (end.eval_duration / 1e9)).toFixed(1)} tokens/s`);
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');   // in case the model still thinks out loud
}
const unload = () => ollama('/api/generate', { model: MODEL, keep_alive: 0 }).catch(() => {});   // free the RAM for build + Chrome

// ---- the RAG index: every game file and the memory, in overlapping 40-line chunks, embedded once per change
function sources() {
  const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => mine(f) && /\.(m?js|jsx)$/.test(f));
  return [...files, 'AGENTS.md', ...['LESSONS.md', 'LOG.md'].map((f) => join(MEMORY, f))];
}
function chunks(text) {
  const lines = text.split('\n'), out = [];
  for (let s = 0; s < lines.length; s += 30) {
    let e = Math.min(lines.length, s + 40);
    while (e > s + 5 && lines.slice(s, e).join('\n').length > 3500) e--;   // dense lines: keep each chunk embeddable
    out.push({ s, e });
    if (e >= lines.length) break;
  }
  return out;
}
async function reindex() {
  const key = `${EMBED}/v2`;   // v2: nomic's search_document / search_query prefixes
  const idx = json(INDEX, { embed: key, files: {} });
  if (idx.embed !== key) { idx.embed = key; idx.files = {}; }
  const seen = new Set();
  for (const f of sources()) {
    seen.add(f);
    const text = read(f);
    const hash = createHash('sha1').update(text).digest('hex');
    if (idx.files[f]?.hash === hash) continue;
    const cs = chunks(text), lines = text.split('\n');
    const vs = [];
    for (let i = 0; i < cs.length; i += 16) vs.push(...await embed(cs.slice(i, i + 16).map((c) => `search_document: file ${f}\n${lines.slice(c.s, c.e).join('\n')}`)));
    idx.files[f] = { hash, chunks: cs.map((c, i) => ({ ...c, v: vs[i].map((x) => Math.round(x * 1e4) / 1e4) })) };
    say(`indexed ${f} (${cs.length} chunks)`);
  }
  for (const f of Object.keys(idx.files)) if (!seen.has(f)) delete idx.files[f];
  save(INDEX, idx);
  return idx;
}
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / Math.sqrt(x * y); };
const STOP = new Set('the and for with that this from into when what where which how does make add find show give each any not are was its can all one two use own new more less than then them they there their about after before only also like just over very your you game app code file'.split(' '));
// Hybrid retrieval: meaning (embedding cosine) plus the exact words of the task (identifiers like water, can, plot)
async function retrieve(idx, query) {
  const [q] = await embed([`search_query: ${query}`]);
  const terms = [...new Set(query.toLowerCase().match(/[a-z\u0980-\u09ff]{3,}/g) || [])].filter((t) => !STOP.has(t)).map((t) => t.replace(/(ing|ed|es|s)$/, '')).filter((t) => t.length >= 3);
  const hits = [];
  for (const [f, { chunks: cs }] of Object.entries(idx.files)) {
    const lines = read(f).toLowerCase().split('\n');
    for (const c of cs) {
      const text = lines.slice(c.s, c.e).join('\n');
      hits.push({ f, s: c.s, e: c.e, cos: cos(q, c.v), tf: terms.map((t) => text.split(t).length - 1), mine: mine(f) });
    }
  }
  // BM25-like: a word found in few chunks counts more; repeats saturate (data tables say "water" 70 times)
  const idf = terms.map((_, i) => Math.log(1 + hits.length / (1 + hits.filter((h) => h.tf[i] > 0).length)));
  for (const h of hits) h.lex = h.tf.reduce((sum, n, i) => sum + idf[i] * (n * 2.2) / (n + 1.2), 0);
  const top = Math.max(1e-9, ...hits.map((h) => h.lex));
  for (const h of hits) h.score = h.cos + 0.15 * (h.lex / top) + (h.mine ? 0.03 : 0);
  hits.sort((a, b) => b.score - a.score);
  const byFile = new Map(); let used = 0;   // take the best chunks, merging neighbours, until the budget is spent
  for (const h of hits.slice(0, 24)) {
    const len = read(h.f).split('\n').slice(h.s, h.e).join('\n').length;
    if (used + len > CONTEXT_CHARS) continue;
    used += len;
    const r = byFile.get(h.f) || []; r.push([h.s, h.e]); byFile.set(h.f, r);
  }
  return [...byFile].map(([f, rs]) => {
    rs.sort((a, b) => a[0] - b[0]);
    const merged = rs.reduce((m, [s, e]) => { const l = m[m.length - 1]; if (l && s <= l[1]) l[1] = Math.max(l[1], e); else m.push([s, e]); return m; }, []);
    const lines = read(f).split('\n');
    return merged.map(([s, e]) => `### ${f} (lines ${s + 1}-${e})\n\`\`\`\n${lines.slice(s, e).join('\n')}\n\`\`\``).join('\n\n');
  }).join('\n\n');
}
function repoMap(first = []) {   // what each file exports, so the model knows where things live (capped)
  const files = sources().filter(mine), order = [...new Set([...first.filter((f) => files.includes(f)), ...files])];
  let out = '';
  for (const f of order) {
    const names = [...read(f).matchAll(/^export (?:default )?(?:async )?(?:function|const|let|class) (\w+)/gm)].map((m) => m[1]);
    const line = `${f}: ${names.slice(0, 14).join(', ')}\n`;
    if (out.length + line.length > 4500) break;
    out += line;
  }
  return out;
}

// ---- tasks from BACKLOG.md
function backlog() {
  const text = read(join(MEMORY, 'BACKLOG.md')), [open] = text.split(/^## Done/m);
  const items = []; let cur = null;
  for (const l of open.split('\n')) {
    if (/^- /.test(l)) { cur && items.push(cur); cur = l.slice(2).trim(); }
    else if (cur && /^\s+\S/.test(l)) cur += ` ${l.trim()}`;
    else if (cur) { items.push(cur); cur = null; }
  }
  cur && items.push(cur);
  return items;
}
async function newIdeas() {
  say('backlog is empty: asking the model for new ideas');
  const out = await chat([{ role: 'user', content: `${read(RULES_FILE)}
Goals:\n${read(join(MEMORY, 'GOALS.md'))}\nRecent work:\n${read(join(MEMORY, 'LOG.md')).split('\n').slice(-40).join('\n')}
Files and exports:\n${repoMap()}
Write 5 new, small, concrete improvements a user would notice (or a missing test), each doable by editing 1-2 of these files in under 60 lines.
Do not repeat recent work. Answer ONLY with 5 lines, each starting with "- ".` }]);
  const ideas = out.split('\n').filter((l) => /^- \S/.test(l)).slice(0, 5);
  const b = read(join(MEMORY, 'BACKLOG.md'));
  writeFileSync(join(MEMORY, 'BACKLOG.md'), b.replace(/^## Done/m, `${ideas.join('\n')}\n\n## Done`));
  return ideas.map((l) => l.slice(2));
}

// ---- edits: SEARCH/REPLACE blocks, the format small models follow most reliably
const FORMAT = `Answer format, exactly:
PLAN: one or two sentences.
Then one or more edit blocks. SEARCH is 1 to 6 lines copied EXACTLY from the code shown (whole lines), unique in the file.
Never copy a whole file. No \`\`\` fences inside a block.
FILE: src/path/to/file.js
<<<<<<< SEARCH
exact existing lines
=======
new lines
>>>>>>> REPLACE
An EMPTY SEARCH adds the new lines at the END of the file (use it to add a test or a new function), or creates
the file if it does not exist. Last line: SUMMARY: one sentence naming what the user will notice.`;
const rules = () => `You are a careful senior developer on FieldShift 360. Project rules for your part of it:\n${read(RULES_FILE)}\n${FORMAT}`;

const unfence = (ls) => { const a = [...ls]; while (a.length && /^\s*```\w*\s*$/.test(a[0])) a.shift(); while (a.length && /^\s*```\s*$/.test(a[a.length - 1])) a.pop(); return a.join('\n'); };
function parse(out) {
  const blocks = []; let file = null, mode = null, s = [], r = [];
  for (const l of out.split('\n')) {
    const fm = l.match(/^(?:FILE:\s*)?[`*]*([\w./[\]-]+\.(?:m?js|jsx))[`*]*\s*$/);
    if (!mode && fm) file = fm[1];
    else if (/^<{5,}\s*(SEARCH)?\s*$/.test(l)) { mode = 's'; s = []; r = []; }   // small models drop the words
    else if (mode === 's' && /^={5,}\s*$/.test(l)) mode = 'r';
    else if (mode === 'r' && /^>{5,}\s*(REPLACE)?\s*$/.test(l)) { blocks.push({ file, search: unfence(s), replace: unfence(r) }); mode = null; }
    else if (mode === 's') s.push(l);
    else if (mode === 'r') r.push(l);
  }
  return { blocks, summary: (out.match(/^SUMMARY:\s*(.+)$/m) || [])[1]?.trim() };
}
// Where `want` (trimmed lines) sits in `lines`: exact after collapsing spaces, else the most similar window of the
// same length (character-bigram Dice ≥ 0.9, and clearly better than the runner-up so it is not a guess).
const squash = (l) => l.replace(/\s+/g, ' ').trim();
function bigrams(t) { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; }
function dice(a, b) {
  if (!a.length || !b.length) return 0;
  const A = bigrams(a), B = bigrams(b); let both = 0, n = 0;
  for (const [k, v] of A) { both += Math.min(v, B.get(k) || 0); n += v; }
  for (const v of B.values()) n += v;
  return (2 * both) / n;
}
function near(lines, want) {
  if (!want.length) return [-1, 0];
  const w = want.map(squash), sq = lines.map(squash);
  for (let k = 0; k + w.length <= sq.length; k++) if (w.every((x, j) => sq[k + j] === x)) return [k, w.length];
  const target = w.join('\n'), cands = [];
  for (const len of [w.length, w.length - 1, w.length + 1]) {
    if (len < 1) continue;
    for (let k = 0; k + len <= sq.length; k++) {
      if (dice(sq[k], w[0]) < 0.5 && dice(sq[k + len - 1], w[w.length - 1]) < 0.5) continue;   // cheap skip
      cands.push([k, len, dice(sq.slice(k, k + len).join('\n'), target)]);
    }
  }
  cands.sort((a, b) => b[2] - a[2]);
  const best = cands[0];
  if (!best || best[2] < 0.9) return [-1, 0];
  // the runner-up elsewhere in the file (not a window overlapping the best one) must be clearly worse
  const other = cands.find((c) => c[0] + c[1] <= best[0] || c[0] >= best[0] + best[1]);
  return !other || best[2] - other[2] >= 0.03 ? [best[0], best[1]] : [-1, 0];
}
function apply(blocks) {
  const failed = [], changed = new Set();
  for (const b of blocks) {
    if (!b.file || !mine(b.file)) { failed.push(`${b.file}: outside the files you may change`); continue; }
    if (!b.search.trim()) {
      if (existsSync(b.file)) {   // an empty SEARCH on an existing file adds to its end
        writeFileSync(b.file, `${read(b.file).replace(/\n*$/, '\n\n')}${b.replace.replace(/\n*$/, '\n')}`); changed.add(b.file); continue;
      }
      mkdirSync(dirname(b.file), { recursive: true }); writeFileSync(b.file, `${b.replace}\n`); changed.add(b.file); continue;
    }
    const text = read(b.file, null);
    if (text === null) { failed.push(`${b.file}: no such file`); continue; }
    let i = text.indexOf(b.search), next;
    if (i >= 0) next = text.slice(0, i) + b.replace + text.slice(i + b.search.length);
    else {   // forgive indentation and spacing, then small copying slips (a long line half remembered)
      const lines = text.split('\n'), want = b.search.split('\n').map((l) => l.trim()).filter(Boolean);
      const [at, len] = near(lines, want);
      if (at < 0) { failed.push(`${b.file}: SEARCH not found:\n${b.search.split('\n').slice(0, 4).join('\n')}`); continue; }
      next = [...lines.slice(0, at), ...b.replace.split('\n'), ...lines.slice(at + len)].join('\n');
    }
    writeFileSync(b.file, next); changed.add(b.file);
  }
  return { failed, changed: [...changed] };
}
function test() {
  try { execSync('npm test', { encoding: 'utf8', stdio: 'pipe', timeout: 10 * 60e3 }); return null; }
  catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`.split('\n');
    return out.filter((l) => /not ok|Error|assert|expected|actual|at .*src\/game/.test(l)).slice(0, 30).join('\n') || out.slice(-30).join('\n');
  }
}

export { parse, apply, chunks, backlog, near };

// ---- commands (only when run, not when imported by a test)
const cmd = import.meta.url === pathToFileURL(process.argv[1] || '').href ? process.argv[2] : null;
if (cmd) await up();
if (cmd === 'index') { await reindex(); say('index ready'); }
else if (cmd === 'ask') { console.log(await retrieve(await reindex(), process.argv.slice(3).join(' '))); }
else if (cmd === 'done' || cmd === 'failed') {
  const st = json(STATE, { tries: {} });
  if (st.task) {
    const b = join(MEMORY, 'BACKLOG.md'), text = read(b);
    if (cmd === 'done') {   // rewrite the open list without the task, and add it under Done
      const [open, done = ''] = text.split(/^## Done.*$/m);
      const head = open.split('\n').filter((l) => /^#/.test(l)).join('\n');
      const left = backlog().filter((t) => t !== st.task).map((t) => `- ${t}`).join('\n');
      writeFileSync(b, `${head}\n\n${left}\n\n## Done\n${done.trim() ? `${done.trim()}\n` : ''}- ${st.task}\n`);
      delete st.tries[st.task];
    } else {
      st.tries[st.task] = (st.tries[st.task] || 0) + 1;
      const why = (process.argv[3] || '').split('\n').filter(Boolean).slice(0, 3).join(' / ').slice(0, 300);
      appendFileSync(join(MEMORY, 'LESSONS.md'), `- Task "${st.task.slice(0, 80)}" failed (try ${st.tries[st.task]}): ${why}\n`);
    }
    st.task = null; save(STATE, st);
  }
}
else if (cmd === 'round') {
  const st = json(STATE, { tries: {} });
  const idx = await reindex();
  let tasks = backlog().filter((t) => (st.tries[t] || 0) < 3);
  if (!tasks.length) tasks = await newIdeas();
  const task = tasks[0];
  if (!task) { say('no task'); process.exit(0); }
  st.task = env.BROKEN ? null : task; save(STATE, st);   // fixing a broken start is not the backlog task
  say(`task: ${task}`);

  const lessons = read(join(MEMORY, 'LESSONS.md')).split('\n').slice(-15).join('\n');
  const context = await retrieve(idx, env.BROKEN ? `${task}\n${env.BROKEN}` : task);
  const near = [...context.matchAll(/^### (\S+)/gm)].map((m) => m[1]);
  const messages = [
    { role: 'system', content: rules() },
    { role: 'user', content: `${env.BROKEN ? `${env.BROKEN}\n\n` : ''}TASK: ${env.BROKEN ? 'make the checks pass again' : task}\n\nLessons from earlier rounds (do not repeat these mistakes):\n${lessons}\n\nFiles and their exports:\n${repoMap(near)}\n\nThe most relevant code (found by search):\n${context}\n\nMake the smallest complete change that does the task. Follow the answer format exactly.` },
  ];
  let summary = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    say(`asking ${MODEL} (attempt ${attempt})`);
    const out = await chat(messages);
    messages.push({ role: 'assistant', content: out });
    console.log(`----- reply ${attempt}\n${out.slice(0, 6000)}\n-----`);   // kept in the round's log, to see what the model tried
    const p = parse(out);
    summary = p.summary || summary;
    if (!p.blocks.length) { messages.push({ role: 'user', content: 'There were no edit blocks. Answer again in the exact format: FILE: line, <<<<<<< SEARCH, =======, >>>>>>> REPLACE.' }); continue; }
    const { failed, changed } = apply(p.blocks);
    say(`applied to ${changed.join(', ') || 'nothing'}${failed.length ? `; ${failed.length} block(s) failed:\n${failed.join('\n')}` : ''}`);
    if (failed.length) {   // show the real code again so the next SEARCH can match
      const again = await retrieve(idx, failed.join('\n'));
      messages.push({ role: 'user', content: `These blocks did not apply (the other blocks DID apply; do not resend them):\n${failed.join('\n\n')}\n\nCurrent code:\n${again}\n\nResend only the failed blocks, with SEARCH copied exactly.` });
      continue;
    }
    say('running npm test');
    const err = test();
    if (!err) { say('npm test passes'); break; }
    say('npm test fails, asking for a fix');
    const diff = execSync('git diff', { encoding: 'utf8' }).slice(0, 8000);
    messages.push({ role: 'user', content: `npm test fails after your change:\n${err}\n\nYour change so far:\n${diff}\n\nFix it with new edit blocks (SEARCH must match the code as it is NOW, after your change).` });
    if (attempt === 4) say('giving up on this task for now');
  }
  await unload();
  writeFileSync('LAST.txt', `${(summary || task).replace(/\s+/g, ' ').slice(0, 120)}\n`);
  appendFileSync(join(MEMORY, 'LOG.md'), `\n- ${new Date().toISOString().slice(0, 16)} agent (${MODEL}): ${task.slice(0, 120)} → ${summary || 'no summary'}\n`);
}
else if (cmd !== null) { console.log(read(new URL(import.meta.url).pathname).split('\n').slice(1, 7).join('\n')); }
