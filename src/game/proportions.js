// Body proportions of the people of মাঠের মানুষ: stylised semi-chibi, like a premium designer toy. A head larger than
// life, broad shoulders, a medium torso, shorter thick and sturdy legs, large hands and feet. Pure numbers, so the
// figure's height, its head count and its feet on the ground can be tested without three.js; people.js builds the
// body from them. Lengths are metres in the figure's own space (before look.build scales a farmer).

export const STYLE = {
  head: 1.55, // the head and everything on it (hair, cap, turban, face)
  neckY: 0.22, // head centre above the base of the neck: room for the larger head's jaw
  thigh: 0.35, // hip to knee (a realistic adult: 0.44)
  shin: 0.33, // knee to ankle (0.42)
  legThick: 1.36, // leg radii
  armThick: 1.22, // arm radii
  shoulder: 1.14, // shoulder joints further out
  torsoWide: 1.1, // the torso's width
  hand: 1.36, // hands, uniformly
  foot: 1.32, // feet and shoes, uniformly
  stance: 0.075, // radians each leg turns outward when standing: a slightly wide-legged stance
};

// Where things sit, derived from STYLE so the figure always stands on the ground.
const TORSO_TOP = 0.57; // hips to the base of the neck (torso at +0.02, neck at +0.55)
const HEAD_UP = 0.127, HEAD_DOWN = 0.114; // unscaled head: crown above its centre, chin below it
const SOLE = 0.05; // unscaled: the lowest point of a shoe below the ankle joint
export const SHIN_POS = STYLE.shin + 0.02; // knee to ankle joint (the shin's rounded end overlaps the foot)
export const HIP_Y = STYLE.thigh + SHIN_POS + SOLE * STYLE.foot - 0.01; // shoes sink a centimetre into the soil
export const DOWN_HIP_Y = HIP_Y * (0.3 / 0.92); // sitting on the heels, as the realistic body did at 0.3 of 0.92

export function figure(style = STYLE) {
  const headH = (HEAD_UP + HEAD_DOWN) * style.head;
  const height = HIP_Y + TORSO_TOP + style.neckY + HEAD_UP * style.head;
  return { height, headH, heads: height / headH, legShare: HIP_Y / height, neckGap: style.neckY - HEAD_DOWN * style.head };
}

// Standing still with both hands in the trouser pockets: upper arms a little back and in, elbows bent, so the wrist
// lands on the front pocket of the hip, at (±0.16, −0.02, 0.105) m from the hip joint (on the cloth of the thick legs). The angles were solved for
// that point on this arm (shoulder 0.234 m out and 0.485 m up, upper arm 0.28, forearm 0.27) and are checked in the
// test; the hand then shrinks to `handIn` of its size, into the pocket.
export const POCKET = { shoulderX: 0.12, shoulderZ: 0.15, elbowX: -0.66, handIn: 0.3, at: [0.16, -0.02, 0.105] };
export const ARM = { shoulderUp: 0.485, upper: 0.28, fore: 0.27 };
// Trousers have pockets (under a kurta, reached through its side slit); a lungi or dhoti has the fold at the waist,
// where the hands tuck in the same way. Skirts, saris and the longyi have neither: those figures rest their hands
// loosely at their sides.
export const hasPockets = (look) => ['pyjama', 'shalwar', 'cargo', 'lungi', 'dhoti'].includes(look?.lower);
