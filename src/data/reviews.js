// Who has reviewed the crop rules and soil assumptions, when, and what changed. Empty until a local agronomist or
// agriculture officer reviews them: nothing here may be filled in by guesswork. docs/REVIEW_LOG.md is the same record
// in prose; add a row there and here together.
//   { crop: 'lentil' | 'all', who: 'name, role, office', when: 'YYYY-MM-DD', what: 'rules or assumptions reviewed',
//     changed: 'what was changed, or "no change"' }
export const REVIEWS = [];
export const reviewOf = (crop) => REVIEWS.filter((r) => r.crop === crop || r.crop === 'all');
