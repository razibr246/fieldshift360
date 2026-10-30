// Ten years of soil under a few rotation options on each neighbouring-country farm: the same ICBM soil-carbon model,
// crop carbon coefficients, legume nitrogen and IPCC paddy methane as Field Future (engine/soilfuture.js), on the
// farm's own SoilGrids soil and its country's FAOSTAT yields (src/data/soil/abroad_soil_yields.json). [REAL in, RULE]
// The options are each region's common cycles of a monsoon (kharif) crop and a winter (rabi) crop, compared with and
// without the straw kept; they are options to compare, not a local recommendation. The farm's current cycle is
// taken as the one that holds today's soil carbon (the same calibration as Bangladesh). Chickpea has no coefficients
// of its own in the model, so it uses lentil's (both cool-season grain legumes); this is said on the page.
// Water and money, when the farm's monthly normals and prices are given: each crop's irrigation need by the FAO-56
// single crop coefficient method (the same stage shares and Kc as Bangladesh, engine/cropwater.js) on the farm's
// ERA5 ET₀ and NASA GPM IMERG rain (ERA5's where IMERG is missing), at the usual sowing date; rice adds 200 mm to soak and puddle the field, and seepage is not
// counted. Under a change, rain scales by the change and ET₀ by the Hargreaves temperature term (FAO-56 eq. 52). The
// money is the gross value of the harvests, FAOSTAT yield × FAOSTAT producer price (src/data/market/abroad_prices.json):
// no production costs are known for these countries, so it is not profit.
import { CARBON, ICBM, CH4, cropCarbon, socStock, omPctOf } from './soilfuture.js';
import { FAO56 } from './cropwater.js';

export const YEARS = 10;
const CROP = {
  rice: { model: 'aman', family: 'Poaceae', name: { bn: 'ধান', en: 'Rice' } },
  wheat: { model: 'wheat', family: 'Poaceae', name: { bn: 'গম', en: 'Wheat' } },
  lentil: { model: 'lentil', family: 'Fabaceae', name: { bn: 'মসুর', en: 'Lentil' }, legume: true },
  chickpea: { model: 'lentil', family: 'Fabaceae', name: { bn: 'ছোলা', en: 'Chickpea' }, legume: true, proxy: 'lentil' },
  mustard: { model: 'mustard', family: 'Brassicaceae', name: { bn: 'সরিষা', en: 'Mustard' } },
  sesame: { model: 'sesame', family: 'Pedaliaceae', name: { bn: 'তিল', en: 'Sesame' } },
  fallow: { model: null, family: null, name: { bn: 'পতিত', en: 'Fallow' } },
};
export const cropAbroad = (id) => CROP[id];
// Paddy water regime for methane (IPCC 2019 Table 5.12): irrigated and kept flooded, or regular rainfed.
const RICE_WATER = { india: 'flooded', pakistan: 'flooded', nepal: 'rainfed', bhutan: 'flooded', myanmar: 'rainfed' };

// [kharif, rabi] each year; `habit` is the farm's cycle as it is now.
export const OPTIONS = {
  india: [
    { cycle: [['rice', 'wheat']], residue: 'habit', habit: true },
    { cycle: [['rice', 'wheat']], residue: 'retain' },
    { cycle: [['rice', 'mustard']], residue: 'retain' },
    { cycle: [['rice', 'wheat'], ['rice', 'chickpea']], residue: 'retain' },
  ],
  pakistan: [
    { cycle: [['rice', 'wheat']], residue: 'habit', habit: true },
    { cycle: [['rice', 'wheat']], residue: 'retain' },
    { cycle: [['rice', 'mustard']], residue: 'retain' },
    { cycle: [['rice', 'wheat'], ['rice', 'lentil']], residue: 'retain' },
  ],
  nepal: [
    { cycle: [['rice', 'lentil']], residue: 'habit', habit: true },
    { cycle: [['rice', 'lentil']], residue: 'retain' },
    { cycle: [['rice', 'wheat']], residue: 'habit' },
    { cycle: [['rice', 'fallow']], residue: 'habit' },
    { cycle: [['rice', 'wheat'], ['rice', 'lentil']], residue: 'retain' },
  ],
  bhutan: [
    { cycle: [['rice', 'fallow']], residue: 'habit', habit: true },
    { cycle: [['rice', 'fallow']], residue: 'retain' },
    { cycle: [['rice', 'wheat']], residue: 'retain' },
    { cycle: [['rice', 'mustard']], residue: 'retain' },
  ],
  myanmar: [
    { cycle: [['sesame', 'chickpea']], residue: 'habit', habit: true },
    { cycle: [['sesame', 'chickpea']], residue: 'retain' },
    { cycle: [['sesame', 'fallow']], residue: 'habit' },
    { cycle: [['sesame', 'mustard']], residue: 'retain' },
  ],
};

// When each crop goes in, by country: [kharif sowing or transplanting, rabi sowing] as 'MM-DD'. The rabi dates are
// the season plans' (engine/abroad.js PLANS); the kharif ones the usual transplanting (sesame sowing in Myanmar's dry
// zone) of each region's crop calendar. Each crop's days in the field follow FAO-56 Table 11 and the season plans.
export const SOW = { india: ['06-20', '11-08'], pakistan: ['06-25', '11-10'], nepal: ['06-25', '11-10'], bhutan: ['06-20', '11-20'], myanmar: ['05-15', '10-28'] };
const DAYS = { rice: 120, wheat: 155, lentil: 150, chickpea: 110, mustard: 110, sesame: 110 };
// FAO-56 chickpea: stages 20/30/35/25 days (Table 11), Kc 0.4 / 1.0 / 0.35 (Table 12)
const KC = { rice: FAO56.boro, wheat: FAO56.wheat, lentil: FAO56.lentil, mustard: FAO56.mustard, sesame: FAO56.sesame, chickpea: { stages: [0.18, 0.27, 0.32, 0.23], kc: [0.4, 1.0, 0.35] } };
const DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function kcAt(f, d, days) {
  const [a, b, c] = f.stages.map((x) => x * days), [ini, mid, end] = f.kc;
  if (d < a) return ini;
  if (d < a + b) return ini + ((mid - ini) * (d - a)) / b;
  if (d < a + b + c) return mid;
  return mid + ((end - mid) * (d - a - b - c)) / (days - a - b - c);
}
// Irrigation (mm) for one crop sown on 'MM-DD': Σ max(0, Kc·ET₀ − 80% of the day's rain), plus puddling for rice.
export function cropIrrigation(id, sow, normals, change = null) {
  const f = KC[id], days = DAYS[id];
  if (!f || !days || !normals?.length) return null;
  const [mm, dd] = sow.split('-').map(Number), t0 = Date.UTC(2021, mm - 1, dd);
  let need = 0;
  for (let d = 0; d < days; d++) {
    const m = new Date(t0 + d * 864e5).getUTCMonth(), n = normals[m];
    const tMean = (n.tmax + n.tmin) / 2, dT = change ? (change.dTmax[m] + change.dTmin[m]) / 2 : 0;
    const et0 = ((n.et0 ?? 0) / DIM[m]) * ((tMean + dT + 17.8) / (tMean + 17.8));
    const rain = ((n.rainImerg ?? n.rain ?? 0) / DIM[m]) * (change ? change.rain[m] : 1);
    need += Math.max(0, kcAt(f, d, days) * et0 - 0.8 * rain);
  }
  return need + (id === 'rice' ? 200 : 0);
}

const rT = (t) => (t <= ICBM.tMin ? 0 : ((t - ICBM.tMin) / (30 - ICBM.tMin)) ** 2);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function yearInput(y, residue, tHa) {
  const parts = y.filter((id) => CROP[id].model).map((id) => cropCarbon(CROP[id].model, tHa(id), residue));
  const total = parts.reduce((a, p) => a + p.total, 0);
  const h = total ? parts.reduce((a, p) => a + p.total * p.h, 0) / total : ICBM.hAbove;
  const floodDays = y.reduce((a, id) => a + (CARBON[CROP[id].model]?.flood ?? 0), 0);
  return { total, h, flood: 1 - (1 - ICBM.floodRate) * Math.min(1, floodDays / 365) };
}

// opts: { country, soil, yields, normals (monthly tmax/tmin, and et0 and rain for water), change (CMIP6 monthly
// deltas or null), prices (abroad_prices.json countries[country], or null) }
export function abroadRotations({ country, soil, yields, normals, change, prices = null }) {
  const list = OPTIONS[country];
  if (!list || !soil) return null;
  const tHa = (id) => yields[id]?.tHa ?? 0;
  const soc0 = socStock(soil);
  const habit = list.find((o) => o.habit);
  // Calibrate the decay rate so the farm's current cycle holds today's carbon.
  const hi = habit.cycle.map((y) => yearInput(y, habit.residue, tHa));
  const I = mean(hi.map((x) => x.total)), h = mean(hi.map((x) => x.h)), f = mean(hi.map((x) => x.flood));
  const r0 = (I * (1 / ICBM.k1 + h / ICBM.k2)) / soc0 / f, Y0 = I / (ICBM.k1 * r0 * f);
  const mT = normals.map((n) => (n.tmax + n.tmin) / 2);
  const tf = change ? mean(mT.map((t, m) => rT(t + (change.dTmax[m] + change.dTmin[m]) / 2))) / mean(mT.map(rT)) : null;
  const run = (o, factor) => {
    let Y = Y0, O = soc0 - Y0;
    for (let k = 0; k < YEARS; k++) {
      const inp = yearInput(o.cycle[k % o.cycle.length], o.residue, tHa), r = r0 * inp.flood * factor;
      for (let m = 0; m < 12; m++) {
        const dt = 1 / 12, dY = inp.total * dt - ICBM.k1 * r * Y * dt, dO = inp.h * ICBM.k1 * r * Y * dt - ICBM.k2 * r * O * dt;
        Y += dY; O += dO;
      }
    }
    return Y + O;
  };
  return {
    soc0, tf, om0: omPctOf(soc0, soil), proxy: list.some((o) => o.cycle.flat().some((id) => CROP[id].proxy)),
    options: list.map((o) => {
      const socEnd = run(o, 1), socFut = tf ? run(o, tf) : null;
      const crops = o.cycle.flat();
      const nFix = mean(o.cycle.map((y) => y.reduce((a, id) => a + (CROP[id].legume ? CARBON[CROP[id].model].nFix[o.residue === 'retain' ? 1 : 0] : 0), 0)));
      // Paddy methane per year, with the straw of the crop before each rice season (IPCC 2019 Tier 1, South Asia).
      let prev = o.cycle[o.cycle.length - 1][1], kg = 0;
      o.cycle.forEach(([kh, rb]) => {
        if (kh === 'rice') {
          const c = CARBON[CROP[prev]?.model], t = tHa(prev);
          const roa = c && t ? t * c.dm * (1 / c.hi - 1) * c.keep[o.residue === 'retain' ? 1 : 0] : 0;
          kg += CH4.ef * CH4.sfw[RICE_WATER[country]] * CH4.sfp * (1 + roa * CH4.cfoa) ** CH4.exp * 120;
        }
        prev = rb === 'fallow' ? kh : rb;
      });
      const ch4 = kg / o.cycle.length, soilCo2 = (((socEnd - soc0) / YEARS) * 44) / 12;
      // a year's irrigation and harvest value, averaged over the cycle
      const water = (ch) => mean(o.cycle.map((y) => y.reduce((a, id, k) => a + (id === 'fallow' ? 0 : cropIrrigation(id, SOW[country][k], normals, ch) ?? 0), 0)));
      const sown = crops.filter((id) => id !== 'fallow');
      const unpriced = prices ? [...new Set(sown.filter((id) => !prices.crops[id]))] : null;
      const gross = prices ? mean(o.cycle.map((y) => y.reduce((a, id) => a + (prices.crops[id] ? tHa(id) * prices.crops[id].perTonne : 0), 0))) : null;
      return {
        ...o, crops, socEnd, socFut, gross, unpriced,
        waterMm: normals?.[0]?.et0 != null ? water(null) : null, waterFut: normals?.[0]?.et0 != null && change ? water(change) : null, dSoc: (socEnd / soc0 - 1) * 100, dSocFut: socFut != null ? (socFut / soc0 - 1) * 100 : null,
        om: omPctOf(socEnd, soil), nFix, families: new Set(crops.map((id) => CROP[id].family).filter(Boolean)).size,
        ch4, net: (ch4 * CH4.gwp) / 1000 - soilCo2,
      };
    }),
  };
}
