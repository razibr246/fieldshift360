// Small Bangla grammar helpers so generated sentences read naturally.
const VOWEL_END = /[া-ৌঅ-ঔ]$/; // ends in a vowel sign or vowel letter
const I_U_END = /[ইউ]$/; // ends in the letter ই or উ, which takes য়: ধামরাই → ধামরাইয়ের, বই → বইয়ে
// Possessive: টমেটো → টমেটোর, ধান → ধানের, ধামরাই → ধামরাইয়ের
export const bnOf = (w) => (I_U_END.test(w) ? `${w}য়ের` : VOWEL_END.test(w) ? `${w}র` : `${w}ের`);
// Locative: টমেটো → টমেটোতে, ধান → ধানে, ধামরাই → ধামরাইয়ে
export const bnIn = (w) => (I_U_END.test(w) ? `${w}য়ে` : VOWEL_END.test(w) ? `${w}তে` : `${w}ে`);

// How a message travels as SMS. Plain English fits the GSM 7-bit alphabet: 160 characters, or 153 per part when
// split. Any Bangla letter switches the whole message to UCS-2: only 70 characters, or 67 per part. Phones count
// UTF-16 units, and the GSM extension characters (^{}[]~|€\\) take two slots.
const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';
export function smsParts(text = '') {
  let gsm = true, units = 0;
  for (const ch of text) {
    if (GSM.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else { gsm = false; break; }
  }
  if (!gsm) units = text.length; // UTF-16 code units
  const [one, per] = gsm ? [160, 153] : [70, 67];
  const parts = units === 0 ? 0 : units <= one ? 1 : Math.ceil(units / per);
  return { unicode: !gsm, units, parts, limit: parts <= 1 ? one : parts * per };
}

// A reply cut into SMS parts at word breaks, each with room for its "(১/৩)" mark within one 67-character Unicode part.
const PART = 67;
export function smsSplit(text) {
  if (smsParts(text).parts <= 1) return [text];
  const out = [];
  let cur = '';
  for (const w of text.split(' ')) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > PART - 6 && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}
