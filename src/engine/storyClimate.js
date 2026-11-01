// Keep only story-engine inputs in the production story bundle. The committed source data remains complete for
// provenance, offline analysis and the full Node tests.
const STORY_FIELDS = {
  sohra: ['imerg'],
  gowainghat: ['tmax', 'tmin', 'rh', 'soil'],
  gangachara: ['tmax', 'tmin', 'rh'],
  dacope: ['lat', 'tmax', 'tmin', 'prec'],
  bakerganj: ['tmax', 'tmin', 'rh', 'prec'],
  sitakunda: ['tmax', 'tmin', 'rh', 'imerg'],
};

export function slimStoriesClimate(data) {
  const places = Object.fromEntries(Object.entries(STORY_FIELDS).map(([id, fields]) => {
    const source = data.places[id];
    const place = Object.fromEntries(fields.filter((key) => source[key] != null).map((key) => [key, source[key]]));
    if (place.soil) place.soil = { clay: place.soil.clay };
    return [id, place];
  }));
  return { provenance: data.provenance, start: data.start, places };
}
