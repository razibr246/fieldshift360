// What machine learning on NASA data can and cannot tell about Rabi crop stress here, from the models trained and
// tested in scripts/build/train_stress_model.mjs (src/data/models/stress_model.json). Pure: it only reads the scores
// and puts them into words; it does not predict a farmer's season.
import MODEL from '../data/models/stress_model.json' with { type: 'json' };

export { MODEL };
// Skill against always guessing the normal, on seasons the model never saw: above 0.1 the weather explains part of the
// crop's year; around 0 it adds nothing; below it, the place's crops follow something else.
export function placeVerdict(id) {
  const p = MODEL.perPlace?.[id];
  if (!p) return null;
  const kind = p.skill >= 0.1 && p.r > 0.3 ? 'explains' : p.skill > -0.05 ? 'little' : 'other';
  return { ...p, kind };
}
// Which approach did best at telling stressed seasons apart, on held-out seasons (AUC; 0.5 is chance).
export function bestApproach(which = 'area') {
  const s = MODEL[which]?.stressed ?? {};
  return Object.entries(s).filter(([k]) => k !== 'base').sort((a, b) => (b[1].auc ?? 0) - (a[1].auc ?? 0))[0] ?? null;
}
// The decision tree as plain questions, top split first.
export function treeQuestions(node = MODEL.tree, depth = 0, out = []) {
  if (!node || node.p != null) return out;
  const f = MODEL.features.find((x) => x.k === node.feature);
  out.push({ depth, feature: f, below: node.below, n: node.n });
  treeQuestions(node.left, depth + 1, out); treeQuestions(node.right, depth + 1, out);
  return out;
}
