// Motion for the People-page turntable. A reduced-motion frame stays still but remains renderable.
export function previewFrame({ dt, t, angle, spin, reduced = false }) {
  if (reduced) {
    return { angle, spin: 0, cameraY: 1.45, ringIntensity: 2, dustDelta: 0, animateCharacters: false };
  }
  const nextSpin = spin * 0.97;
  return {
    angle: angle + dt * 0.12 + nextSpin * dt,
    spin: nextSpin,
    cameraY: 1.45 + Math.sin(t * 0.3) * 0.08,
    ringIntensity: 2 + Math.sin(t * 2) * 0.6,
    dustDelta: dt * 0.03,
    animateCharacters: true,
  };
}
