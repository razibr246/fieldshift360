// Single source of truth for the product's name and brand copy.
// Change PROJECT_NAME here and every logo, title, footer, page heading and the HTML <title>/meta update.
// (vite.config.js reads this file to fill %PROJECT_NAME% and %PROJECT_DESCRIPTION% in index.html.)

export const PROJECT_NAME = 'FieldShift 360';

// The logo sets the last word of the name in the accent colour ("FieldShift" + "360").
// If the name is a single word, the whole name is shown in one colour.
const parts = PROJECT_NAME.trim().split(/\s+/);
export const PROJECT_NAME_PARTS = parts.length > 1
  ? { main: parts.slice(0, -1).join(' '), accent: parts.at(-1) }
  : { main: PROJECT_NAME, accent: '' };

export const PROJECT_TAGLINE = {
  bn: 'এই রবিতে কী লাগাবেন, পরের মৌসুমে কী — জমির পাশে থেকে হিসাব',
  en: 'What to plant this Rabi and what comes next — worked out for your own field',
};

export const PROJECT_DESCRIPTION =
  `${PROJECT_NAME} helps smallholder farmers in Godagari (Rajshahi) and Dhamrai (Dhaka) decide whether to keep, adjust or shift their crop, using 25 seasons of NASA climate history, local soil, crop needs and the farmer's own priorities.`;

export const PROJECT_REGION = { bn: 'গোদাগাড়ী (রাজশাহী) ও ধামরাই (ঢাকা)', en: 'Godagari (Rajshahi) and Dhamrai (Dhaka)' };
export const PROJECT_EVENT = { bn: 'নাসা স্পেস অ্যাপস ২০২৬ · ফিল্ড শিফট চ্যালেঞ্জ', en: 'NASA Space Apps 2026 · Field Shift challenge' };

// Storage key prefix derived from the name, so a rename does not mix old saved demo state.
export const STORAGE_PREFIX = PROJECT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');
