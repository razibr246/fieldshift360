// SRDI fertilizer recommendations for every union -> src/data/soil/srdi_frs.json
//
// Source: the Soil Resource Development Institute's Fertilizer Recommendation System (frs-bd.com, "সার সুপারিশ
// নির্দেশিকা"), which turns SRDI's own union-level soil test data into a dose for each crop, land type and soil
// physiography. The site is an ASP.NET form whose lists fill in one after another, so it is driven in headless Chrome
// (needs Google Chrome installed) exactly as a person would: division, district, upazila, union, soil, season, land
// type, crop, then "search". Results are for 33 decimal (one bigha). Answers are cached in .cache/data/srdi/.
//   node scripts/build/build_srdi_frs.mjs              # every upazila
//   node scripts/build/build_srdi_frs.mjs dhamrai
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(REPO, '.cache', 'data', 'srdi');
const OUT = join(REPO, 'src', 'data', 'soil', 'srdi_frs.json');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://frs-bd.com/';

// The app's union ids -> how the SRDI site spells them.
const UPAZILAS = {
  godagari: { division: 'রাজশাহী', district: 'রাজশাহী', upazila: 'গোদাগাড়ী', unions: {
    Deopara: 'দেওপাড়া', Pakri: 'পাকড়ী', Rishikul: 'ঋষিকুল', 'Char Ashariadaha': 'আষাড়িয়াদহ', Mohanpur: 'মোহনপুর', Gogram: 'গোগ্রাম',
    Matikata: 'মাটিকাটা', Godagari: 'গোদাগাড়ী', Basudebpur: 'বাসুদেবপুর', 'Godagari Municipality': 'গোদাগাড়ী পৌরসভা', 'Kakanhat Municipality': 'কাঁকনহাট পৌরসভা' } },
  dhamrai: { division: 'ঢাকা', district: 'ঢাকা', upazila: 'ধামরাই', unions: {
    Chauhat: 'চৌহাট', Amta: 'আমতা', Balia: 'বালিয়া', Gangutia: 'গাংগুটিয়া', Jadabpur: 'যাদবপুর', Baisakanda: 'বাইশাকান্দা', Kushura: 'কুসুরা',
    Sanora: 'শানরা', 'Suti Para': 'সুতীপাড়া', Suapur: 'সুয়াপুর', Nannar: 'নান্নার', Bhararia: 'ভাড়ারিয়া', Sombhag: 'সোমবাগ', Dhamrai: 'ধামরাই',
    Kulla: 'কুল্লা', Rowail: 'রোয়াইল', 'Dhamrai Municipality': 'পৌরসভা' } },
  // The five division story upazilas, spelt as the SRDI site lists them (read off its own drop-downs, 19 Oct 2026).
  // Left out where the site's entry cannot be matched for certain: the paurashavas of Sitakunda and Dacope, and
  // Gangachara's Alam Biditar and Nohali (not on the site).
  sitakunda: { division: 'চট্টগ্রাম', district: 'চট্রগ্রাম', upazila: 'সীতাকুন্ড', unions: {
    Banshbaria: 'বাঁশবারিয়া', Barabkunda: 'বারবকুন্ড', Bariadyala: 'বারিয়াঢালা', Bhatiari: 'ভাটিয়ারী', Kumira: 'কুমিরা', Muradpur: 'মুরাদপুর',
    Saidpur: 'সৈয়দপুর', Salimpur: 'সলিমপুর', Sonaichhari: 'সোনাইছড়ি' } },
  dacope: { division: 'খুলনা', district: 'খুলনা', upazila: 'দাকোপ', unions: {
    Bajua: 'বাজোয়া', Banishanta: 'বানীসান্তা', Dacope: 'দাকোপ', Kailasganj: 'কৈলাশগঞ্জ', Kamarkhola: 'কামারখোলা', Laudubi: 'লাউডুবি',
    Pankhali: 'পানখালী', Sutarkhali: 'সুতারাখালী', Tildanga: 'তিলডাংগা' } },
  bakerganj: { division: 'বরিশাল', district: 'বরিশাল', upazila: 'বাকেরগঞ্জ', unions: {
    'Char Amaddi': 'চরামদ্দি-০১', Charadi: 'চরাদী-০২', Darial: 'দাড়িয়াল-০৩', Dudhal: 'দুধাল-০৪', Faridpur: 'ফরিদপুর-০৬', Kabai: 'কবাই-০৭',
    Nalua: 'নলুয়া-০৮', Kalaskati: 'কলসকাটী-০৯', Garuria: 'গারুরিয়া-১০', 'Bhar Pasha': 'ভরপাশা-১১', Rangasree: 'রঙ্গঁশ্রী-১২',
    'Padri Shibpur': 'পাদ্রীশিবপুর-১৩', Niamati: 'নিয়ামতি-১৪', 'Bakerganj Municipality': 'পৌরসভা' } },
  gangachara: { division: 'রংপুর', district: 'রংপুর', upazila: 'গংগাচড়া', unions: {
    Barabil: 'বড়বিল', Betgari: 'বেতগাড়ী', Gajaghanta: 'গজঘন্টা', Gangachara: 'গংগাচড়া', Khaleya: 'খলেয়া', Kolkanda: 'কোলকোন্দ',
    Lakshmitari: 'লক্ষীতরী', Marania: 'মরনিয়া' } },
  gowainghat: { division: 'সিলেট', district: 'সিলেট', upazila: 'গোয়াইনঘাট', unions: {
    Alirgaon: 'আলীর গাঁও', Fatehpur: 'ফতেপুর', Lengura: 'লেংগুড়া', Nandirgaon: 'নান্দিরগাঁও', 'Paschim Jaflong': 'পশ্চিম জাফলং',
    'Purba Jaflong': 'পূর্ব জাফলং', Rustampur: 'রুস্তমপুর', Towakul: 'তোয়াকুল' } },
};
// The app's Rabi crops -> SRDI crop category and the variety group (by its first words).
const CROPS = {
  mustard: { cat: 'তৈল', match: /^সরিষা \(টরি-৭/ }, // short-duration group (BARI Sarisha-14 etc.), the one sown before Boro
  boro: { cat: 'শস্য', match: /^বোরো \(বি আর-১৪/ }, // BRRI dhan28 group
  wheat: { cat: 'শস্য', match: /^গম/ },
  lentil: { cat: 'ডাল', match: /^মসুর/ },
  tomato: { cat: 'শাক সবজি', match: /^টমেটো/ },
};
const LAND = { LT000001: 'high', LT000002: 'medium_high', LT000003: 'medium_low' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bnNum = (s) => s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
// "২১ কেজি ৮৯০ গ্রাম" -> 21.89 (kg); "প্রয়োজন নেই" -> 0; "প্রয়োজন মত" -> null
function kg(raw) {
  const text = raw.normalize('NFD'), t = bnNum(text);
  if (text.includes('প্রয়োজন নেই'.normalize('NFD'))) return 0;
  const k = t.match(/([\d.]+)\s*কেজি/), g = t.match(/([\d.]+)\s*গ্রাম/);
  if (!k && !g) return null;
  return Math.round(((k ? +k[1] : 0) + (g ? +g[1] / 1000 : 0)) * 1000) / 1000;
}

async function browser() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(CACHE, `chrome-${port}`)}`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 60 && !ws; i++) {
    try { const pg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === 'page'); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch { /* not up yet */ }
    await sleep(250);
  }
  if (ws.readyState !== WebSocket.OPEN) await new Promise((r) => ws.addEventListener('open', r)); // it may already be open
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Page.enable');
  // The throwaway Chrome profile is removed on close (each one grows to tens of MB).
  const profile = join(CACHE, `chrome-${port}`);
  return { ev, nav: async (u) => { await send('Page.navigate', { url: u }); await sleep(3500); }, close: async () => { ws.close(); chrome.kill(); await new Promise((r) => chrome.once('exit', r)); rmSync(profile, { recursive: true, force: true }); } };
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const only = process.argv[2];
  const b = await browser();
  const F = (n) => `document.querySelector('[name="ctl00$ContentPlaceHolder1$${n}"]')`;
  const opts = (n) => b.ev(`[...${F(n)}.options].map(o=>[o.value,o.text.trim()]).filter(o=>o[0])`);
  const pick = async (n, v, wait = 3000) => { await b.ev(`(()=>{const s=${F(n)}; s.value='${v}'; s.dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(wait); };
  // Bangla ড়/য় can be one character or a letter plus nukta; compare in one form.
  const nf = (x) => x.normalize('NFD');
  const find = async (n, re) => (await opts(n)).find(([, t]) => (re instanceof RegExp ? re.test(nf(t)) || re.test(t) : nf(t).includes(nf(re))));
  // The lists fill in after each choice; under load that can take longer than the usual pause, so wait for it.
  const waitFind = async (n, re) => {
    for (let i = 0; i < 20; i++) { const o = await find(n, re); if (o) return o; await sleep(1000); }
    throw new Error(`SRDI list ${n} never offered ${re}`);
  };
  const geo = async (z, unionBn) => {
    await b.nav(URL);
    await pick('ddlDivision', (await waitFind('ddlDivision', z.division))[0]);
    await pick('ddlDistrict', (await waitFind('ddlDistrict', z.district))[0]);
    await pick('ddlUpazila', (await waitFind('ddlUpazila', z.upazila))[0]);
    for (let i = 0; i < 20 && !(await opts('ddlUnion')).length; i++) await sleep(1000);
    const all = await opts('ddlUnion'), want = nf(unionBn);
    const u = all.find(([, t]) => nf(t) === want) ?? all.find(([, t]) => nf(t).startsWith(want) || want.startsWith(nf(t)));
    if (!u) return null;
    await pick('ddlUnion', u[0]);
    return u;
  };
  const out = { unions: {}, source: 'Soil Resource Development Institute (SRDI), Fertilizer Recommendation System, frs-bd.com', url: URL, per: '33 decimal (1 bigha)', season: 'Rabi', retrieved: new Date().toISOString().slice(0, 10) };
  // Every cached union goes into the file; only the asked-for upazila is fetched.
  for (const [upz, z] of Object.entries(UPAZILAS)) {
    for (const [unionId, unionBn] of Object.entries(z.unions)) {
      const cacheFile = join(CACHE, `${upz}-${unionId}.json`);
      if (existsSync(cacheFile)) { out.unions[unionId] = JSON.parse(readFileSync(cacheFile, 'utf8')); console.log('  cached', unionId); continue; }
      if (only && only !== upz) continue;
      const u = await geo(z, unionBn);
      if (!u) { console.log('  not on the SRDI site:', unionId); continue; }
      const phys = await opts('ddlSoilPhysiography');
      const rec = { upazila: upz, frsName: u[1], physiography: phys.map(([, t]) => t), recs: {} };
      for (const [i, [physId, physName]] of phys.entries()) {
        // The form keeps every choice after a search, so the place is set once per soil and only land and crop change.
        if (i > 0) await geo(z, unionBn);
        await pick('ddlSoilPhysiography', physId, 2000);
        await pick('ddlSeason', '3', 2500);
        for (const [lt, ltKey] of Object.entries(LAND)) {
          await pick('ddlLandType', lt, 2000);
          for (const [crop, c] of Object.entries(CROPS)) {
            const cat = await find('ddlCropCategory', c.cat);
            if (!cat) continue;
            await pick('ddlCropCategory', cat[0], 2500);
            const cr = await find('ddlCrop', c.match);
            if (!cr) continue; // not grown on this land type here
            await pick('ddlCrop', cr[0], 2000);
            await b.ev(`${F('txtDecimal')}.value='33'`);
            await b.ev(`__doPostBack('ctl00$ContentPlaceHolder1$btnSearch','')`);
            await sleep(4500);
            const rows = await b.ev(`[...document.querySelectorAll('table tr')].map(tr=>[...tr.cells].map(td=>td.innerText.trim())).filter(r=>r.length>=4 && (/^\\d+$/.test(r[0])||r[0]==='') && r[2] && r[3])`);
            const items = [];
            let n = null;
            for (const r of rows || []) {
              if (/^\d+$/.test(r[0])) n = { nutrient: r[1], options: [] };
              if (!n) continue;
              if (/^\d+$/.test(r[0])) items.push(n);
              n.options.push({ fertilizer: r[2], kg: kg(r[3]), text: r[3], how: r[4] ?? '' });
            }
            if (items.length) {
              ((rec.recs[physName] ??= {})[ltKey] ??= {})[crop] = { variety: cr[1], items };
              console.log(`  ${unionId} · ${physName} · ${ltKey} · ${crop}: ${items.map((i) => `${i.options[0].fertilizer.split(' ')[0]} ${i.options[0].kg}`).join(', ')}`);
            }
          }
        }
      }
      writeFileSync(cacheFile, JSON.stringify(rec));
      out.unions[unionId] = rec;
    }
  }
  await b.close();
  // Every amount is read again from SRDI's own words, so a parsing fix reaches cached unions too.
  for (const u of Object.values(out.unions)) for (const byLand of Object.values(u.recs ?? {})) for (const byCrop of Object.values(byLand))
    for (const r of Object.values(byCrop)) for (const it of r.items) for (const o of it.options) o.kg = kg(o.text);
  // Compact form for the app: repeated sentences (when to apply, variety lists, fertiliser names) stored once in `words`
  // and referred to by number; SRDI's own wording is kept only where the amount is not a number.
  const words = [], ix = new Map();
  const w = (t) => { if (!ix.has(t)) { ix.set(t, words.length); words.push(t); } return ix.get(t); };
  const unions = {};
  for (const [id, u] of Object.entries(out.unions)) {
    const recs = {};
    for (const [phys, byLand] of Object.entries(u.recs ?? {})) for (const [land, byCrop] of Object.entries(byLand)) for (const [crop, r] of Object.entries(byCrop)) {
      ((recs[phys] ??= {})[land] ??= {})[crop] = { v: w(r.variety), items: r.items.map((it) => [w(it.nutrient), it.options.map((o) => [w(o.fertilizer), o.kg, o.kg == null ? w(o.text) : -1, w(o.how)])]) };
    }
    unions[id] = { upazila: u.upazila, frsName: u.frsName, physiography: u.physiography, recs };
  }
  const { unions: _full, ...meta } = out;
  writeFileSync(OUT, JSON.stringify({ ...meta, format: 'compact: items = [nutrient, [[fertilizer, kg, text|-1, how], …alternatives]] as indexes into words', words, unions }));
  console.log(`  wrote ${OUT.replace(REPO + '/', '')}`);
}
main();
