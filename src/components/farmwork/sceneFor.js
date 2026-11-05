// Which farm-work scene each crop's bar opens: a Rabi crop shows its harvest, the next crop its sowing. Kept apart from
// scenes.jsx so the season ribbon can know which scene to show without loading every scene's artwork up front.
export const RABI_SCENE = { tomato: 'tomato', wheat: 'wheat', mustard: 'mustard' };
export const NEXT_SCENE = { mungbean: 'mungbean', sesame: 'sesame' };
