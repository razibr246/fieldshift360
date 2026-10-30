// The headless browser check run.sh does after every round: starts the Vite dev server, opens Chrome, and
// fails if the app breaks. Exit 0 = whole; 1 = broken (reason printed).
// node smoke.mjs <repo dir> <port> <screenshot prefix> [chrome path] [game|pages]
//   game:  picks a farmer, skips the story, plays the farm game for a few seconds (window.__fsGame, dev only)
//   pages: opens the main public, farmer, officer and abroad pages; each must render without an error
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [dir, port = '5299', shot = 'smoke', chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', mode = 'game'] = process.argv.slice(2);
const CDP_PORT = Number(port) + 40;
const PAGES = ['/', '/science', '/stories', '/farmer', '/farmer/plan', '/farmer/today', '/farmer/future', '/farmer/harvest',
  '/officer', '/officer/requests', '/officer/farmers', '/officer/map', '/officer/radar', '/abroad/india', '/abroad/india/plan'];
const BROKEN_TEXT = ['এই পাতাটি খোলা গেল না', 'This page could not be opened', 'Something went wrong'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const kids = [];
let profile;

async function until(what, fn, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch { /* not ready */ } await wait(400); }
  throw new Error(`timed out waiting for ${what}`);
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl), pending = new Map(), listeners = [];
  let id = 0;
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const { ok, ko } = pending.get(msg.id); pending.delete(msg.id); msg.error ? ko(new Error(msg.error.message)) : ok(msg.result); }
    else listeners.forEach((f) => f(msg));
  };
  const send = (method, params = {}) => new Promise((ok, ko) => { pending.set(++id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
  return new Promise((ok, ko) => { ws.onopen = () => ok({ send, on: (f) => listeners.push(f), close: () => ws.close() }); ws.onerror = ko; });
}

async function open() {
  const base = `http://127.0.0.1:${port}`;
  kids.push(spawn(join(dir, 'node_modules/.bin/vite'), ['--port', port, '--strictPort', '--host', '127.0.0.1'], { cwd: dir, stdio: 'ignore', detached: true }));
  await until('the dev server', async () => (await fetch(base)).ok, 90000);
  profile = mkdtempSync(join(tmpdir(), 'fs360-smoke-'));
  kids.push(spawn(chrome, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--window-size=1280,800', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--mute-audio', 'about:blank'], { stdio: 'ignore', detached: true }));
  const pages = await until('Chrome', async () => (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json());
  const c = await cdp(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  const errors = [];
  c.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errors.push(d.exception?.description || d.text); }
    // React reports errors its boundaries caught through console.error; failed fetches (api/* is 503 in dev) are fine
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      const err = m.params.args.find((a) => a.subtype === 'error');
      const text = err ? err.description : m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
      if (/stopped|The above error|Uncaught|is not defined|Cannot read|is not a function|Maximum update depth/.test(text)) errors.push(text);
    }
  });
  await c.send('Runtime.enable');
  await c.send('Page.enable');
  const js = async (expression) => (await c.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
  const snap = async (file) => writeFileSync(file, Buffer.from((await c.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  return { base, c, js, errors, snap };
}
const short = (e) => e.split('\n').slice(0, 3).join(' | ').slice(0, 300);

async function game({ base, js, errors, snap }) {
  const click = (...texts) => js(`(() => { const b = [...document.querySelectorAll('button')].find((b) => ${JSON.stringify(texts)}.some((t) => b.textContent.includes(t))); if (b) b.click(); return !!b; })()`);
  await js(`location.href = '${base}/#/farm'`);
  await until('the farmer pick', () => click('মাঠে চলুন', "'s field"));
  await until('the story', () => click('গল্প বাদ দিন', 'Skip story'));
  await until('the game (window.__fsGame)', () => js('!!(window.__fsGame && window.__fsGame.stage())'), 60000);
  // the camera intro (about 5 s) holds the clock; after it the season must run unless a panel paused it
  await until('the end of the intro', () => js("!document.querySelector('.g3-intro')"), 45000);
  const t0 = await js('window.__fsGame.g.t');
  await wait(6000);
  const t1 = await js('window.__fsGame.g.t');
  const paused = await js('!!window.__fsGame.g.paused');
  const canvas = await js("(() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })()");
  await snap(`${shot}.png`);
  const problems = errors.map((e) => `exception: ${short(e)}`);
  if (!canvas || !canvas[0]) problems.push('no game canvas on the page');
  if (!(Number.isFinite(t0) && Number.isFinite(t1))) problems.push(`game clock is not a number (${t0} → ${t1})`);
  else if (!(t1 > t0) && !paused) problems.push(`game clock stuck at ${t1} with no panel open: the frame loop stopped`);
  console.log(`game clock ${t0?.toFixed?.(2)} → ${t1?.toFixed?.(2)}${paused ? ' (a panel paused it)' : ''}; canvas ${canvas}`);
  return problems;
}

async function pages({ base, c, js, errors, snap }) {
  const problems = [];
  for (const [i, path] of PAGES.entries()) {
    errors.length = 0;
    await c.send('Page.navigate', { url: `${base}/#${path}` });
    let text = '';
    try { text = await until(`${path} to render`, async () => { const t = await js("document.querySelector('#root')?.innerText || ''"); return t.length > 80 && !/^\s*$/.test(t) ? t : null; }, 30000); }
    catch (e) { problems.push(`${path}: ${e.message}`); }
    await wait(1500);   // let lazy charts and maps mount and throw if they will
    text = (await js("document.querySelector('#root')?.innerText || ''")) || text;
    const broke = BROKEN_TEXT.find((b) => text.includes(b));
    if (broke) problems.push(`${path}: the page shows "${broke}"`);
    errors.forEach((e) => problems.push(`${path}: ${short(e)}`));
    if (i === 0 || broke || errors.length) await snap(`${shot}-${path.replace(/\W+/g, '_') || 'home'}.png`);
  }
  console.log(`${PAGES.length} pages opened`);
  return problems;
}

let code = 1;
try {
  const s = await open();
  const problems = await (mode === 'pages' ? pages(s) : game(s));
  s.c.close();
  if (problems.length) console.log(`SMOKE FAIL\n${problems.join('\n')}`);
  else { console.log('SMOKE OK'); code = 0; }
} catch (e) {
  console.log(`SMOKE FAIL\n${e.message}`);
} finally {
  kids.forEach((k) => { try { process.kill(-k.pid, 'SIGTERM'); } catch { /* gone */ } });   // whole groups: vite and chrome fork
  if (profile) { await wait(500); try { rmSync(profile, { recursive: true, force: true }); } catch { /* left in tmp */ } }
  process.exit(code);
}
