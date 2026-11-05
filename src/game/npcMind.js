// Pure NPC mind and behavioral simulation for FieldShift 360:
// Simulates human biological needs (energy, hunger, thirst, social, duty, comfort), daily circadian routines
// (dawn field check, morning trade, midday shaded rest, afternoon work, dusk gathering, night shelter),
// memory of player interactions, social affinity, emotional states, proactive obstacle avoidance,
// and context-aware bilingual dialogue generation.
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
      hunger: 20 + Math.random() * 25,
      thirst: 20 + Math.random() * 20,
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
      curiosity: npcDef.curiosity ?? 0.5,
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

export function getNpcEmotionalState(mind, weather = {}) {
  const { energy, hunger, social, comfort } = mind.needs;
  const { playerBumps, affinity } = mind.memory;

  if (weather.storm > 0) {
    return { state: 'alarmed', label: { bn: 'উদ্বিগ্ন', en: 'Alarmed' } };
  }
  if (playerBumps >= 3 && affinity < 0) {
    return { state: 'irritated', label: { bn: 'বিরক্ত', en: 'Irritated' } };
  }
  if (energy < 25) {
    return { state: 'exhausted', label: { bn: 'ক্লান্ত', en: 'Exhausted' } };
  }
  if (hunger > 75) {
    return { state: 'hungry', label: { bn: 'ক্ষুধার্ত', en: 'Hungry' } };
  }
  if (social < 25) {
    return { state: 'lonely', label: { bn: 'একাকী', en: 'Lonely' } };
  }
  if (affinity > 50) {
    return { state: 'friendly', label: { bn: 'বন্ধুভাবাপন্ন', en: 'Friendly' } };
  }
  return { state: 'content', label: { bn: 'স্বাভাবিক', en: 'Content' } };
}

export function updateNpcNeeds(mind, dt, context = {}) {
  const { isMoving = false, isWorking = false, isResting = false, weather = {} } = context;
  const n = { ...mind.needs };
  const p = mind.personality;

  // Hunger & thirst increase over time, faster in heat and manual labor
  const workMultiplier = isWorking ? 1.6 : isMoving ? 1.2 : 0.8;
  const heatMultiplier = weather.heat > 0 ? 2.0 : 1.0;
  n.hunger = Math.min(100, (n.hunger ?? 20) + dt * 0.4 * workMultiplier);
  n.thirst = Math.min(100, (n.thirst ?? 20) + dt * 0.5 * workMultiplier * heatMultiplier);

  // Energy depletion / replenishment
  if (isResting) {
    n.energy = Math.min(100, n.energy + dt * 4.5);
    n.hunger = Math.max(0, n.hunger - dt * 2.0); // eating during designated rest
    n.thirst = Math.max(0, n.thirst - dt * 3.0);
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

// Proactive obstacle avoidance steering (Reynolds separation force)
// Computes lateral evasion vector when an entity is directly in path
export function computeObstacleAvoidance(pos, headingYaw, obstacles, radius = 2.4) {
  const [px, pz] = pos;
  const fwdX = Math.sin(headingYaw), fwdZ = Math.cos(headingYaw);
  const rightX = fwdZ, rightZ = -fwdX; // perpendicular right vector

  let closestDist = 999;
  let steerDir = 0; // -1 for left, +1 for right

  for (const obs of obstacles) {
    if (!obs) continue;
    const ox = obs.x ?? obs[0], oz = obs.z ?? obs[1];
    const dx = ox - px, dz = oz - pz;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1 || dist > radius) continue;

    // Project onto forward and right vectors
    const fwdProj = dx * fwdX + dz * fwdZ;
    const rightProj = dx * rightX + dz * rightZ;

    // Obstacle is ahead and laterally obstructing path
    if (fwdProj > 0.1 && Math.abs(rightProj) < 1.3) {
      if (dist < closestDist) {
        closestDist = dist;
        // Steer away from obstacle side
        steerDir = rightProj >= 0 ? -1 : 1;
      }
    }
  }

  if (closestDist < 999) {
    const strength = (1 - closestDist / radius) * 1.6;
    return {
      avoidX: rightX * steerDir * strength,
      avoidZ: rightZ * steerDir * strength,
      mustSteer: true,
    };
  }

  return { avoidX: 0, avoidZ: 0, mustSteer: false };
}

export function generateContextualDialogue(mind, dayPhase, weather = {}, defaultHello = null) {
  const phaseName = getDayPhaseName(dayPhase);
  const { affinity, playerBumps } = mind.memory;
  const emo = getNpcEmotionalState(mind, weather);

  // If player repeatedly bumped into this NPC
  if (playerBumps >= 3 && Math.random() < 0.7) {
    return {
      bn: 'আরে ভাই! একটু সাবধানে চলো, বারবার ধাক্কা লাগাচ্ছ কেন?',
      en: 'Hey friend! Watch your steps, why keep bumping into people?',
    };
  }

  // Extreme weather urgency
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
  if (affinity >= 50 && Math.random() < 0.55) {
    return {
      bn: 'সুস্বাগতম ভাই! তোমার জমির কাজ কেমন চলছে? এবার ভালো ফলন হোক!',
      en: 'Warm welcome brother! How is work on your land? Wishing you a bountiful harvest!',
    };
  }

  // Hunger or thirst remarks
  if (emo.state === 'hungry' && Math.random() < 0.4) {
    return {
      bn: 'কাজের চাপে নাওয়া-খাওয়া ভুলেছি, একটু ভাত খাওয়ার সময় হলো।',
      en: 'Lost track of time with field chores, finally time for some food.',
    };
  }

  // Circadian greetings
  if (phaseName === SCHEDULE_PHASES.DAWN) {
    return {
      bn: 'শুভ সকাল! ভোরের বাতাসটা বেশ ঠান্ডা, আজ কোন জমিতে সেচ দেবে?',
      en: 'Good morning! The dawn breeze is refreshing, which plot are you irrigating today?',
    };
  }
  if (phaseName === SCHEDULE_PHASES.MIDDAY) {
    return {
      bn: 'দুপুর গড়িয়ে গেল, বটের ছায়ায় একটু বিশ্রাম নিয়ে ভাত খেয়ে নাও।',
      en: 'Midday is here, catch some shade under the banyan and enjoy your meal.',
    };
  }
  if (phaseName === SCHEDULE_PHASES.DUSK) {
    return {
      bn: 'সন্ধ্যা নামছে ভাই, হাটে এক কাপ গরম চা খেয়ে ঘরে ফিরব।',
      en: 'Dusk is settling in, brother. Having a warm cup of tea at the market before heading home.',
    };
  }
  if (phaseName === SCHEDULE_PHASES.NIGHT) {
    return {
      bn: 'রাত হয়ে এলো ভাই, কুপি জ্বালিয়ে এবার বিশ্রামের সময়।',
      en: 'Night has fallen, brother. Time to light the lantern and rest.',
    };
  }

  // Default fallback to authored hello
  return defaultHello ?? {
    bn: 'কেমন আছো ভাই? দিনকাল কেমন যাচ্ছে?',
    en: 'How are you brother? How are things going?',
  };
}
