// Pure NPC mind and behavioral simulation for FieldShift 360:
// Simulates human biological needs (energy, social, duty, comfort), daily circadian routines
// (dawn field check, morning trade, midday shaded rest, afternoon work, dusk gathering, night shelter),
// memory of player interactions, social affinity, and context-aware bilingual dialogue generation.
// Pure functions only; testable in Node with zero WebGL/DOM dependencies.

export const SCHEDULE_PHASES = {
  DAWN: 'dawn',           // 0.00 - 0.18: prayer, inspecting land, opening shops
  MORNING: 'morning',     // 0.18 - 0.45: heavy field work, trade at haat, errands
  MIDDAY: 'midday',       // 0.45 - 0.60: shaded rest under tree, courtyard lunch, tea break
  AFTERNOON: 'afternoon', // 0.60 - 0.75: secondary tasks, transport, irrigation checks
  DUSK: 'dusk',           // 0.75 - 0.88: social gathering, evening market, packing tools
  NIGHT: 'night',         // 0.88 - 1.00: home shelter, family time, sleep
};

export function getDayPhaseName(phase) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.18) return SCHEDULE_PHASES.DAWN;
  if (p < 0.45) return SCHEDULE_PHASES.MORNING;
  if (p < 0.60) return SCHEDULE_PHASES.MIDDAY;
  if (p < 0.75) return SCHEDULE_PHASES.AFTERNOON;
  if (p < 0.88) return SCHEDULE_PHASES.DUSK;
  return SCHEDULE_PHASES.NIGHT;
}

export function createNpcMind(npcDef = {}) {
  return {
    id: npcDef.id ?? 'villager',
    name: npcDef.name ?? { bn: 'গ্রামবাসী', en: 'Villager' },
    role: npcDef.does ?? 'walk',
    // Core human biological and social needs (0 to 100)
    needs: {
      energy: 85 + Math.random() * 15,
      social: 60 + Math.random() * 25,
      duty: 70 + Math.random() * 20,
      comfort: 80,
    },
    // Personality traits (-1.0 to 1.0)
    personality: {
      sociability: npcDef.sociability ?? (npcDef.does === 'stand' ? 0.7 : 0.4),
      industriousness: npcDef.industriousness ?? (npcDef.does === 'work' ? 0.85 : 0.6),
      patience: npcDef.patience ?? 0.6,
      warmth: npcDef.warmth ?? 0.75,
    },
    // Memory & relationships
    memory: {
      playerInteractions: 0,
      playerBumps: 0,
      lastInteractionTime: -999,
      affinity: 20, // starts slightly positive in village community (-100 to +100)
      lastTopic: null,
      notes: [],
    },
    currentActivity: 'routine',
    targetFocus: null,
  };
}

export function updateNpcNeeds(mind, dt, context = {}) {
  const { isMoving = false, isWorking = false, isResting = false, weather = {} } = context;
  const n = { ...mind.needs };
  const p = mind.personality;

  // Energy depletion / replenishment
  if (isResting) {
    n.energy = Math.min(100, n.energy + dt * 4.5);
  } else if (isWorking) {
    n.energy = Math.max(10, n.energy - dt * (1.2 * (2 - p.industriousness * 0.5)));
  } else if (isMoving) {
    n.energy = Math.max(15, n.energy - dt * 0.65);
  } else {
    n.energy = Math.min(100, n.energy + dt * 0.8);
  }

  // Social need
  if (context.isSocializing) {
    n.social = Math.min(100, n.social + dt * 6.0);
  } else {
    n.social = Math.max(0, n.social - dt * (0.35 * (1 + p.sociability)));
  }

  // Weather comfort impact
  if (weather.storm > 0) {
    n.comfort = Math.max(10, n.comfort - dt * 3.5);
  } else if (weather.heat > 0) {
    n.comfort = Math.max(20, n.comfort - dt * 2.0);
    n.energy = Math.max(10, n.energy - dt * 0.5); // heat fatigue
  } else {
    n.comfort = Math.min(100, n.comfort + dt * 1.5);
  }

  return { ...mind, needs: n };
}

export function getNpcActionGoal(mind, dayPhase, stormActive = false) {
  if (stormActive) {
    return { action: 'shelter', priority: 1.0, speedMultiplier: 1.35 };
  }

  const phaseName = getDayPhaseName(dayPhase);
  const { energy, social } = mind.needs;

  // Severe exhaustion overrides schedule
  if (energy < 25) {
    return { action: 'rest', spotType: 'shade', priority: 0.9, duration: 8 };
  }

  // Extreme loneliness / desire to talk
  if (social < 20 && mind.personality.sociability > 0.4) {
    return { action: 'socialize', spotType: 'meeting', priority: 0.7, duration: 6 };
  }

  // Circadian schedule
  switch (phaseName) {
    case SCHEDULE_PHASES.DAWN:
      return { action: 'prepare', spotType: 'home', priority: 0.6, gesture: 'wipe' };
    case SCHEDULE_PHASES.MORNING:
      return { action: mind.role === 'work' ? 'work' : 'route', spotType: 'duty', priority: 0.8 };
    case SCHEDULE_PHASES.MIDDAY:
      return { action: 'rest_and_eat', spotType: 'shade', priority: 0.75, gesture: 'adjust' };
    case SCHEDULE_PHASES.AFTERNOON:
      return { action: mind.role === 'work' ? 'work' : 'route', spotType: 'duty', priority: 0.7 };
    case SCHEDULE_PHASES.DUSK:
      return { action: 'gather', spotType: 'market', priority: 0.65, gesture: 'cheer' };
    case SCHEDULE_PHASES.NIGHT:
    default:
      return { action: 'sleep', spotType: 'home', priority: 0.85 };
  }
}

export function recordPlayerInteraction(mind, type = 'talk', currentTime = 0) {
  const mem = { ...mind.memory };
  mem.playerInteractions += 1;
  mem.lastInteractionTime = currentTime;

  if (type === 'talk') {
    mem.affinity = Math.min(100, mem.affinity + 4 + mind.personality.warmth * 3);
  } else if (type === 'bump') {
    mem.playerBumps += 1;
    mem.affinity = Math.max(-100, mem.affinity - 12);
  } else if (type === 'help') {
    mem.affinity = Math.min(100, mem.affinity + 15);
  }

  return { ...mind, memory: mem };
}

export function generateContextualDialogue(mind, dayPhase, weather = {}, defaultHello = null) {
  const phaseName = getDayPhaseName(dayPhase);
  const { affinity, playerBumps } = mind.memory;

  // If player bumped into this NPC repeatedly
  if (playerBumps >= 3 && Math.random() < 0.6) {
    return {
      bn: 'আরে ভাই! একটু সাবধানে হাটো, বারবার ধাক্কা খাচ্ছ কেন?',
      en: 'Hey friend! Watch your steps, why keep bumping into people?',
    };
  }

  // Weather urgency
  if (weather.storm > 0) {
    return {
      bn: 'ঝড় এসে গেছে! জলদি পাকা আশ্রয়ে যাও!',
      en: 'The storm is here! Quick, head to the shelter!',
    };
  }
  if (weather.heat > 0 && Math.random() < 0.5) {
    return {
      bn: 'মাথার উপর কড়া রোদ, গাছের ছায়ায় একটু জিড়িয়ে নাও।',
      en: 'Blazing sun overhead, catch your breath in the shade.',
    };
  }

  // High affinity greeting
  if (affinity >= 50 && Math.random() < 0.5) {
    return {
      bn: 'সুস্বাগতম ভাই! তোমার জমির কাজ কেমন চলছে?',
      en: 'Warm welcome brother! How is work going on your plots?',
    };
  }

  // Circadian greetings
  if (phaseName === SCHEDULE_PHASES.DAWN) {
    return {
      bn: 'শুভ সকাল! ভোরের বাতাসটা বেশ ঠান্ডা, মাঠের দিকে যাচ্ছ?',
      en: 'Good morning! The dawn breeze is cool, heading out to the field?',
    };
  }
  if (phaseName === SCHEDULE_PHASES.MIDDAY) {
    return {
      bn: 'দুপুর গড়িয়ে গেল, একটু পানি খেয়ে ভাত খাওয়ার সময় হয়েছে।',
      en: 'Midday is here, time for a drink of water and lunch.',
    };
  }
  if (phaseName === SCHEDULE_PHASES.DUSK) {
    return {
      bn: 'সন্ধ্যা নামছে ভাই, আজকের মতো কাজ শেষ করে ঘরে ফেরা যাক।',
      en: 'Evening is falling, brother. Time to wrap up and head home.',
    };
  }

  // Default fallback to authored hello
  return defaultHello ?? {
    bn: 'কেমন আছো ভাই? দিনকাল কেমন যাচ্ছে?',
    en: 'How are you brother? How are things going?',
  };
}

