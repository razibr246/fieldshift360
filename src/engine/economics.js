// What a bigha of each crop earns, from published figures only. [REAL in, RULE]
//   yield: FAOSTAT 2024, Bangladesh national average (price_seasons.json)
//   price and full cost per kg: crop_economics.json (government procurement prices, DAM notices, ministry and field
//   cost studies, each with its year)
//   fertiliser: SRDI's dose for the union at the official price, shown for information (it is already inside the cost)
// profit per bigha = yield × (price − cost). The years of the sources differ, and the screen says so.
import { BIGHA_HA } from './crops.js';
import { fertilizerPlan } from './soil.js';

export function cropMoney(econ, crop) {
  const fao = econ?.prices?.crops?.[crop.id], ce = econ?.costs?.crops?.[crop.id];
  if (!fao || !ce) return null;
  const kg = Math.round(fao.yieldTHa * BIGHA_HA * 1000);
  const value = Math.round(kg * ce.price.tk), cost = Math.round(kg * ce.cost.tk);
  const fp = fertilizerPlan(econ.srdiUnion, crop.id, { areaDec: 33, landform: econ.landform });
  return {
    kg, yieldTHa: fao.yieldTHa, faoYear: econ.prices.faoYear, priceKg: ce.price.tk, costKg: ce.cost.tk, price: ce.price, costSrc: ce.cost,
    value, cost, net: value - cost, fert: fp && !fp.none ? fp.cost : null,
  };
}

export const ECON_SOURCES = [
  { label: 'FAOSTAT, crop yields, Bangladesh 2024', url: 'https://www.fao.org/faostat/en/#data/QCL' },
  { label: 'Prices and costs per crop: see crop_economics.json (DAM, food and agriculture ministries, field studies)', url: 'https://market.dam.gov.bd/price_graphical_report' },
];
