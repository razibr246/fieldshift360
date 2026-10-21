// App-wide state: the selected farmer, their field, choices, requests and officer actions.
// All data is local demo data. Each "service" this store calls (weather, places, the engine) is a plain function,
// so swapping in a backend later means replacing those calls, not the components.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import climGodagari from './data/climate_godagari.json';
import climDhamrai from './data/climate_dhamrai.json';
import soilGodagari from './data/soil_godagari.json';
import soilDhamrai from './data/soil_dhamrai.json';
import climSitakunda from './data/climate_sitakunda.json';
import climDacope from './data/climate_dacope.json';
import climBakerganj from './data/climate_bakerganj.json';
import climGangachara from './data/climate_gangachara.json';
import climGowainghat from './data/climate_gowainghat.json';
import soilSitakunda from './data/soil_sitakunda.json';
import soilDacope from './data/soil_dacope.json';
import soilBakerganj from './data/soil_bakerganj.json';
import soilGangachara from './data/soil_gangachara.json';
import soilGowainghat from './data/soil_gowainghat.json';
import soilFields from './data/soil_fields.json';
import srdiFrs from './data/srdi_frs.json';
import priceSeasons from './data/price_seasons.json';
import cropEconomics from './data/crop_economics.json';
import { buildDemo, unionsOf, upazilaOfUnion } from './data/demo.js';
import { UPAZILAS } from './data/upazilas.js';
import { PARCELS } from './data/parcels.js';
import { makeClimate, timeMachine, whatIf, stationCorrect } from './engine/climate.js';
import normals from './data/station_normals.json';
import { makeUnion } from './engine/world.js';
import { decide } from './engine/decision.js';
import { recommendRotation } from './engine/rotation.js';
import { fetchLiveWeather, cropStage } from './engine/water.js';
import { fieldWater } from './engine/fieldwater.js';
import { findHotspots } from './engine/cluster.js';
import { daysBetween, todayDhaka, bnDigits as bnDigitsOf } from './engine/dates.js';
import { STORAGE_PREFIX } from './config/brand.js';
import { srdiUnionOf, has } from './engine/soil.js';
import { upazilaRow, doyToMs } from './radar/aman.js';
import { loadSharedPlans, sendSharedPlan } from './engine/sharedPlans.js';
import { loadMessages, postMessage } from './engine/sharedMessages.js';
import { PLAN_SEASON } from './engine/climate.js';

// One NASA POWER record per upazila. `clim` and `tm` (Godagari) stay for the public pages; farmer and officer screens
// read their own upazila's from the store (useStore().clim / .tm / .officerClim).
// Temperatures are corrected to the nearest BMD station's normals first (see stationCorrect in engine/climate.js).
export const climates = {
  godagari: makeClimate(stationCorrect(climGodagari, normals.stations.godagari)),
  dhamrai: makeClimate(stationCorrect(climDhamrai, normals.stations.dhamrai)),
  sitakunda: makeClimate(stationCorrect(climSitakunda, normals.stations.sitakunda)),
  dacope: makeClimate(stationCorrect(climDacope, normals.stations.dacope)),
  bakerganj: makeClimate(stationCorrect(climBakerganj, normals.stations.bakerganj)),
  gangachara: makeClimate(stationCorrect(climGangachara, normals.stations.gangachara)),
  gowainghat: makeClimate(stationCorrect(climGowainghat, normals.stations.gowainghat)),
};
export const clim = climates.godagari;
export const tm = timeMachine(clim);
// Each upazila's 25-season summary is worked out the first time a page asks for it, not for every upazila on start.
const tmCache = { godagari: tm };
export const tms = new Proxy(tmCache, { get: (o, k) => (k in o || typeof k !== 'string' || !climates[k] ? o[k] : (o[k] = timeMachine(climates[k]))) });
// Soil for every union of every upazila (union ids are unique across upazilas); both tables are DEMO so far.
// Soil: ISRIC SoilGrids at every union centre and registered field, and SRDI's fertilizer advice per union (all REAL).
export const soilData = { provenance: soilGodagari.provenance, unions: Object.assign({}, ...[soilGodagari, soilDhamrai, soilSitakunda, soilDacope, soilBakerganj, soilGangachara, soilGowainghat].map((x) => x.unions)) };
export const fieldSoil = soilFields.fields;
export const srdi = srdiFrs;
export const demo = buildDemo();

const Ctx = createContext(null);

// ---- saved demo state (per browser; safe to lose) ----
const STATE_KEY = `${STORAGE_PREFIX}.demo.v5`; // v5: every farmer's fields from the upazila office registry
const LANG_KEY = `${STORAGE_PREFIX}.lang`;
const SAVED_KEYS = ['seenMsgs', 'irrigated', 'farmerId', 'profiles', 'priorities', 'pick', 'confirmed', 'fields', 'requests', 'advisories', 'escalations', 'seenAdvisories', 'officerUpazila', 'officerUnion', 'step', 'fieldCheck', 'scenario', 'harvests', 'parcelEdits', 'activeParcel'];
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const savedLang = () => { try { return localStorage.getItem(LANG_KEY) || 'bn'; } catch { return 'bn'; } };

const fresh = () => ({
  lang: savedLang(),
  step: 0, // season planner step
  farmerId: 'RAHIM',
  fields: {}, // farmerId -> { lat, lon, union, village, villageBn, area_dec, last_crop, irrigation, confirmed }
  parcelEdits: {}, // parcelId -> changes to a registered field, or a whole field the farmer added ({ added: true, … })
  activeParcel: {}, // farmerId -> the parcel the season plan is for (default: the registry's main field)
  profiles: {}, // farmerId -> what the farmer saved on their profile page (see pages/farmer/Profile.jsx)
  priorities: [],
  pick: null, // {crop, shift} chosen by the farmer; null = follow the recommendation
  confirmed: [], // plans confirmed by demo farmers -> added to union supply
  harvests: {}, // farmerId -> { qty, price }
  fieldCheck: null,
  irrigated: {}, // farmerId -> 'YYYY-MM-DD' the farmer last irrigated (restarts the field water balance)
  whatIf: 'normal', // what-if season for the recommendation: normal | dry | hot1 | hot2 (not saved)
  live: null,
  shared: { status: 'connecting', plans: [], at: null }, // the shared plan board (api/plans.js); not saved
  daysAfter: null,
  requests: demo.requests,
  advisories: [], // {id, text, to:[farmerIds], at, cluster?, request?, upazila?}
  escalations: [],
  seenAdvisories: 0,
  seenMsgs: {}, // farmerId -> ids of officer messages the farmer has seen (pop-up and bell)
  remoteMsgs: [], // the current farmer's messages from api/messages.js; not saved
  officerUpazila: 'godagari', // which upazila office the officer is signed in to
  officerUnion: 'Deopara',
  why: null,
  dataInfo: false,
  toast: null,
});

function initial() {
  const base = fresh();
  const saved = readJSON(STATE_KEY);
  if (!saved) return base;
  for (const k of SAVED_KEYS) if (saved[k] !== undefined) base[k] = saved[k];
  // The officer's union must be one of their own upazila's.
  const upz = UPAZILAS[base.officerUpazila] ?? UPAZILAS.godagari;
  base.officerUpazila = upz.id;
  if (!unionsOf(upz.id).some((u) => u.id === base.officerUnion)) base.officerUnion = upz.defaultUnion;
  return base;
}

function reducer(s, a) {
  switch (a.type) {
    case 'set': return { ...s, ...a.patch };
    case 'togglePriority': {
      const has = s.priorities.includes(a.id);
      let p = has ? s.priorities.filter((x) => x !== a.id) : [...s.priorities, a.id];
      if (p.length > 2) p = p.slice(-2);
      return { ...s, priorities: p, pick: null };
    }
    case 'chooseFarmer': return { ...s, farmerId: a.id, step: 0, pick: null, priorities: [], fieldCheck: null, daysAfter: null, seenAdvisories: 0, remoteMsgs: [] };
    case 'markSeen': return { ...s, seenMsgs: { ...s.seenMsgs, [a.id]: [...new Set([...(s.seenMsgs[a.id] ?? []), ...a.ids])].slice(-300) } };
    case 'confirmPlan': return { ...s, confirmed: s.confirmed.filter((p) => p.plot_id !== a.plan.plot_id).concat(a.plan) };
    case 'setField': {
      // Saving the land also moves an already-confirmed plan to the new union/area.
      const f = a.field;
      const confirmed = s.confirmed.map((p) => (p.plot_id === a.id ? { ...p, union: f.union, area_dec: f.area_dec } : p));
      return { ...s, fields: { ...s.fields, [a.id]: { ...f, confirmed: true } }, confirmed, pick: null };
    }
    // A field marked or moved by the farmer waits for the upazila office (pending); the office verifies it or puts
    // it back where the registry has it.
    case 'saveParcel': return { ...s, parcelEdits: { ...s.parcelEdits, [a.parcel.id]: { ...s.parcelEdits[a.parcel.id], ...a.parcel } } };
    case 'verifyParcel': return { ...s, parcelEdits: { ...s.parcelEdits, [a.id]: { ...s.parcelEdits[a.id], pending: false, source: 'office', verified: a.date } } };
    case 'resetParcel': {
      const { [a.id]: _gone, ...rest } = s.parcelEdits;
      return { ...s, parcelEdits: rest };
    }
    // Plan the season for one of the farmer's fields: it becomes the field every screen works from.
    case 'useParcel': {
      const p = a.parcel;
      const f = { lat: p.lat, lon: p.lon, union: p.union, village: p.village, villageBn: p.villageBn, area_dec: p.area_dec, last_crop: p.last_crop, irrigation: p.irrigation, confirmed: true };
      const confirmed = s.confirmed.map((c) => (c.plot_id === a.id ? { ...c, union: f.union, area_dec: f.area_dec } : c));
      return { ...s, fields: { ...s.fields, [a.id]: f }, activeParcel: { ...s.activeParcel, [a.id]: p.id }, confirmed, pick: null };
    }
    case 'setProfile': return { ...s, profiles: { ...s.profiles, [a.id]: { ...s.profiles[a.id], ...a.profile, savedAt: Date.now() } } };
    case 'addRequest': return { ...s, requests: [a.req, ...s.requests.filter((r) => r.id !== a.req.id)] };
    case 'updateRequest': return { ...s, requests: s.requests.map((r) => (a.ids.includes(r.id) ? { ...r, ...a.patch } : r)) };
    case 'addAdvisory': return { ...s, advisories: [a.adv, ...s.advisories.filter((x) => x.id !== a.adv.id)] };
    case 'escalate': return { ...s, escalations: [a.esc, ...s.escalations.filter((e) => e.id !== a.esc.id)] };
    case 'recordHarvest': return { ...s, harvests: { ...s.harvests, [a.id]: a.value } };
    case 'toast': return { ...s, toast: a.toast ? { ...a.toast, at: Date.now() } : null };
    case 'reset': return { ...fresh(), lang: s.lang, live: s.live, toast: { bn: 'নমুনা তথ্য শুরুর অবস্থায় ফেরানো হয়েছে', en: 'Demo data reset to the start', at: Date.now() } };
    default: return s;
  }
}

export function StoreProvider({ children }) {
  const [s, dispatch] = useReducer(reducer, undefined, initial);

  // Save the demo state (photos are dropped to stay within browser storage limits).
  useEffect(() => {
    const out = {};
    for (const k of SAVED_KEYS) out[k] = s[k];
    out.requests = s.requests.map((r) => (r.image && r.image.length > 150000 ? { ...r, image: null, imageDropped: true } : r));
    try { localStorage.setItem(STATE_KEY, JSON.stringify(out)); } catch { /* storage full or blocked: keep going without saving */ }
  }, [s]);
  useEffect(() => { try { localStorage.setItem(LANG_KEY, s.lang); } catch { /* storage unavailable */ } document.documentElement.lang = s.lang; }, [s.lang]);
  useEffect(() => {
    if (!s.toast) return undefined;
    const t = setTimeout(() => dispatch({ type: 'toast', toast: null }), 3400);
    return () => clearTimeout(t);
  }, [s.toast]);

  // Demo farmers with any land the user has marked on the map, and the name they saved on their profile, applied on top.
  const farmers = useMemo(() => demo.farmers.map((f) => {
    const p = s.profiles[f.id];
    const name = p?.nameBn || p?.nameEn ? { bn: p.nameBn || f.name.bn, en: p.nameEn || f.name.en } : f.name;
    return s.fields[f.id] || p ? { ...f, ...s.fields[f.id], name } : f;
  }), [s.fields, s.profiles]);
  const farmerById = useMemo(() => new Map(farmers.map((f) => [f.id, f])), [farmers]);
  const world = useMemo(() => ({ ...demo, farmers }), [farmers]);
  const farmer = farmerById.get(s.farmerId) ?? farmers[0];
  const unionSoil = soilData.unions[farmer.union];
  // Every registered field with the farmers' and officers' changes on top, and the fields farmers added.
  const parcels = useMemo(() => [
    ...PARCELS.map((p) => (s.parcelEdits[p.id] ? { ...p, ...s.parcelEdits[p.id] } : p)),
    ...Object.values(s.parcelEdits).filter((p) => p.added),
  ], [s.parcelEdits]);
  const myParcels = useMemo(() => parcels.filter((p) => p.owner === farmer.id), [parcels, farmer.id]);
  const activeParcel = myParcels.find((p) => p.id === s.activeParcel[farmer.id]) ?? myParcels.find((p) => p.main) ?? myParcels[0] ?? null;
  const srdiUnion = useMemo(() => srdiUnionOf(srdi, farmer.union), [farmer.union]);
  // The field's own SoilGrids cell when it is a registered field still where it was read; otherwise the union's centre.
  const soil = useMemo(() => {
    const fs = activeParcel && fieldSoil[activeParcel.id];
    const here = fs && Math.abs(fs.at[0] - farmer.lat) < 0.0005 && Math.abs(fs.at[1] - farmer.lon) < 0.0005;
    const phys = (srdiUnion?.physiography ?? []).filter(Boolean);
    // SRDI's soil types: river silt (পলি মাটি) everywhere, and khiyar soil (খিয়ার মাটি) on Godagari's Barind uplands.
    const landform = upazilaOfUnion(farmer.union).id === 'godagari' && phys.some((x) => has(x, 'খিয়ার')) ? 'barind' : phys.length ? 'floodplain' : null;
    return { ...unionSoil, ...(here ? fs : {}), scope: here ? 'field' : 'union', landform, physiography: phys };
  }, [unionSoil, activeParcel, farmer.lat, farmer.lon, farmer.union, srdiUnion]);
  // The farmer's upazila (from their union) sets the climate and neighbours they are planned against.
  const upazila = upazilaOfUnion(farmer.union);
  const fclim = climates[upazila.id];
  const officerUpazila = UPAZILAS[s.officerUpazila] ?? UPAZILAS.godagari;
  const officerClim = climates[officerUpazila.id];

  // Every confirmed plan: all users' from the shared board, with this browser's own on top (it may not have synced yet).
  const confirmedAll = useMemo(() => {
    const byPlot = new Map(s.shared.plans.map((p) => [p.plot_id, { ...p, src: 'shared' }]));
    for (const p of s.confirmed) byPlot.set(p.plot_id, { ...p, src: byPlot.has(p.plot_id) ? 'shared' : 'local' });
    return [...byPlot.values()];
  }, [s.shared.plans, s.confirmed]);
  const unions = useMemo(() => Object.fromEntries(unionsOf(upazila.id).map((u) => [u.id, makeUnion(fclim, world, u.id, confirmedAll.filter((p) => p.plot_id !== s.farmerId))])), [world, confirmedAll, s.farmerId, upazila.id, fclim]);
  // The officer's upazila only: every "whole upazila" figure, ranking and broadcast is scoped to it.
  const unionsAll = useMemo(() => Object.fromEntries(unionsOf(officerUpazila.id).map((u) => [u.id, makeUnion(officerClim, world, u.id, confirmedAll)])), [world, confirmedAll, officerUpazila.id, officerClim]);
  const upazilaFarmers = useMemo(() => farmers.filter((f) => unionsAll[f.union]), [farmers, unionsAll]);
  const union = unions[farmer.union];
  const climW = useMemo(() => whatIf(fclim, s.whatIf), [fclim, s.whatIf]);
  const econ = useMemo(() => ({ prices: priceSeasons, costs: cropEconomics, srdiUnion, landform: soil.landform }), [srdiUnion, soil.landform]);
  const decision = useMemo(() => decide({ clim: climW, soil, plot: farmer, union, priorities: s.priorities, econ }), [climW, farmer, soil, union, s.priorities, econ]);
  // The as-measured answer, kept alongside so a what-if can show what changed.
  const decisionBase = useMemo(() => (climW === fclim ? decision : decide({ clim: fclim, soil, plot: farmer, union, priorities: s.priorities, econ })), [climW, fclim, decision, farmer, soil, union, s.priorities, econ]);
  const chosen = useMemo(() => {
    if (!s.pick) return decision.rec;
    return decision.all.find((r) => r.crop.id === s.pick.crop && r.shift === s.pick.shift) ?? decision.rec;
  }, [decision, s.pick]);
  // The upazila's usual T. Aman transplanting day, from Sentinel-1 radar (2017–2025 median): the next crop must be off by then.
  const amanRow = upazilaRow(upazila.id);
  const amanT = amanRow?.transplantNormal ? doyToMs(PLAN_SEASON, amanRow.transplantNormal) : null;
  const rotation = useMemo(() => recommendRotation({ clim: climW, soil, plot: farmer, chosen, priorities: s.priorities, amanT }), [climW, farmer, soil, chosen, s.priorities, amanT]);
  const hotspots = useMemo(() => findHotspots(s.requests), [s.requests]);

  // Every message an officer sends from this browser goes to the message store, so it reaches the farmer's own phone.
  const synced = useRef(null);
  useEffect(() => {
    if (!synced.current) { synced.current = new Set(s.advisories.map((a) => a.id)); return; } // what was there at start is not resent
    for (const a of s.advisories) if (!synced.current.has(a.id)) { synced.current.add(a.id); postMessage({ ...a, from: a.from }); }
  }, [s.advisories]);
  // The farmer's own messages: read on start, every 30 seconds and on coming back; a new one raises a phone
  // notification when the farmer has allowed them.
  const known = useRef(null);
  const refreshMessages = useCallback(async () => {
    const list = await loadMessages(farmer.id);
    if (!list) return;
    if (known.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      for (const m of list) if (!known.current.has(m.id)) { try { new Notification('কৃষি কর্মকর্তার নতুন বার্তা', { body: m.text.slice(0, 140), tag: m.id }); } catch { /* not allowed here */ } }
    }
    known.current = new Set(list.map((m) => m.id));
    dispatch({ type: 'set', patch: { remoteMsgs: list } });
  }, [farmer.id]);
  useEffect(() => {
    known.current = null;
    refreshMessages();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshMessages(); }, 30000);
    const back = () => document.visibilityState === 'visible' && refreshMessages();
    document.addEventListener('visibilitychange', back);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', back); };
  }, [refreshMessages]);

  // The shared plan board: read on start, every 30 seconds, and whenever the app comes back to the screen.
  const refreshShared = useCallback(async () => {
    const r = await loadSharedPlans();
    dispatch({ type: 'set', patch: { shared: r.status === 'live' ? r : { status: 'offline', reason: r.reason, plans: [], at: null } } });
  }, []);
  useEffect(() => {
    refreshShared();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refreshShared(); }, 30000);
    const back = () => document.visibilityState === 'visible' && refreshShared();
    document.addEventListener('visibilitychange', back);
    window.addEventListener('focus', back);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); };
  }, [refreshShared]);
  // Confirm a plan here and on the shared board, then read the board again so every count is current.
  const confirmPlan = useCallback(async (plan) => {
    dispatch({ type: 'confirmPlan', plan });
    const ok = await sendSharedPlan(plan);
    if (ok) await refreshShared();
    return ok;
  }, [refreshShared]);

  useEffect(() => {
    let alive = true;
    dispatch({ type: 'set', patch: { live: null } });
    fetchLiveWeather(farmer.lat, farmer.lon).then((w) => { if (alive) dispatch({ type: 'set', patch: { live: w || false } }); });
    return () => { alive = false; };
  }, [farmer.lat, farmer.lon]);

  // Today's work runs on the real date: days since this crop's planting day (negative before it goes in),
  // live weather at the field, and the FAO-56 water balance of this field's own soil.
  const today = todayDhaka();
  const daysAfter = daysBetween(chosen.t0, today);
  const live = s.live || null;
  const weather = live ?? { rain7: null, rainNext3: null, tmax: null, unavailable: true, loading: s.live === null };
  const stage = cropStage(chosen.crop, daysAfter);
  const fw = useMemo(() => fieldWater({ crop: chosen.crop, plantT: chosen.t0, soil, area_dec: farmer.area_dec, wx: live, today, reset: s.irrigated[farmer.id] ?? null, fieldCheck: s.fieldCheck }),
    [chosen.crop, chosen.t0, soil, farmer.area_dec, live, today, s.irrigated, farmer.id, s.fieldCheck]);
  const water = fw?.reasons ? { color: fw.color, reasons: fw.reasons, fw }
    : fw?.mode === 'before' ? { color: 'GREEN', fw, reasons: [{ bn: `${chosen.crop.name.bn} ${chosen.crop.action.bn} ${bnDigitsOf(-fw.dToday)} দিন পরে; এখন সেচের প্রশ্ন নেই`, en: `${chosen.crop.action.en} the ${chosen.crop.name.en.toLowerCase()} in ${-fw.dToday} days; no watering question yet` }] }
      : fw?.mode === 'after' ? { color: 'GREEN', fw, reasons: [{ bn: 'এই ফসলের মৌসুম শেষ', en: 'This crop’s season is over' }] }
        : { color: 'YELLOW', fw: null, reasons: [{ bn: s.live === null ? 'আবহাওয়া আনা হচ্ছে…' : 'আবহাওয়া আনা যায়নি, তাই জমির মাটি হাতে নিয়ে দেখে ঠিক করুন', en: s.live === null ? 'Fetching the weather…' : 'Could not fetch the weather, so feel the soil in the field to decide' }] };
  // This farmer's messages: those delivered through the message store, plus any sent from this same browser.
  const myAdvisories = useMemo(() => {
    const byId = new Map(s.remoteMsgs.map((m) => [m.id, m]));
    for (const a of s.advisories) if (a.to.includes(farmer.id) && !byId.has(a.id)) byId.set(a.id, a);
    // The same words sent twice about the same request or topic are one message to the farmer.
    const seen = new Set();
    return [...byId.values()].sort((a, b) => (b.sent ?? b.at) - (a.sent ?? a.at))
      .filter((m) => { const k = `${m.request ?? m.cluster ?? m.weather ?? m.upazila ?? ''}|${m.text.trim()}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [s.remoteMsgs, s.advisories, farmer.id]);
  const seenIds = s.seenMsgs[farmer.id] ?? [];
  const unreadMsgs = myAdvisories.filter((a) => !seenIds.includes(a.id));
  const confirmedPlan = s.confirmed.find((p) => p.plot_id === farmer.id) ?? null;
  // A field the upazila office has registered is known before the farmer ever opens the app.
  const landConfirmed = !!s.fields[farmer.id]?.confirmed || (!!activeParcel && !activeParcel.pending);

  const T = useCallback((bn, en) => (s.lang === 'bn' ? bn : en), [s.lang]);
  const L = useCallback((o) => (o ? (s.lang === 'bn' ? o.bn : o.en) : ''), [s.lang]);
  const toast = useCallback((bn, en) => dispatch({ type: 'toast', toast: { bn, en } }), []);
  const farmerOf = useCallback((id) => farmerById.get(id), [farmerById]);

  const value = {
    s, dispatch, T, L, toast, farmer, farmers, farmerOf, soil, union, unions, unionsAll, decision, decisionBase, chosen, rotation, hotspots,
    profile: s.profiles[farmer.id] ?? {}, upazila, clim: fclim, tm: tms[upazila.id], officerUpazila, officerClim, upazilaFarmers,
    today, daysAfter, demoNow: today, weather, liveWeather: !!live, stage, water,
    myAdvisories, unreadMsgs, unreadAdvisories: unreadMsgs.length, markSeen: (ids) => dispatch({ type: 'markSeen', id: farmer.id, ids: ids ?? myAdvisories.map((a) => a.id) }), confirmedPlan, landConfirmed,
    parcels, myParcels, activeParcel, srdiUnion, econ, shared: s.shared, refreshShared, confirmPlan, confirmedAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
