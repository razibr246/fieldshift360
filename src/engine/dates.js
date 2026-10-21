// UTC day helpers. All dates in the engine are UTC midnight timestamps (ms).
export const DAY = 864e5;
export const ymd = (y, m, d) => Date.UTC(y, m - 1, d);
export const addDays = (t, n) => t + n * DAY;
export const iso = (t) => new Date(t).toISOString().slice(0, 10);
export const parseISO = (s) => Date.parse(s + 'T00:00:00Z');
// Today's date in Bangladesh, as a UTC-midnight timestamp like every other engine date.
export const todayDhaka = () => parseISO(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date()));
export const daysBetween = (a, b) => Math.round((b - a) / DAY);
export const monthOf = (t) => new Date(t).getUTCMonth() + 1;
export const dayOf = (t) => new Date(t).getUTCDate();
export const yearOf = (t) => new Date(t).getUTCFullYear();

export const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export const bnDigits = (s) => String(s).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
export const num = (n, lang, opts = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  const s = Number(n).toLocaleString('en-IN', { maximumFractionDigits: opts.dp ?? 0, minimumFractionDigits: opts.min ?? 0 });
  return lang === 'bn' ? bnDigits(s) : s;
};
export const fmtDate = (t, lang) => {
  const d = new Date(t);
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return lang === 'bn' ? `${bnDigits(day)} ${MONTHS_BN[m]}` : `${day} ${MONTHS_EN[m]}`;
};
export const fmtRange = (a, b, lang) => `${fmtDate(a, lang)} – ${fmtDate(b, lang)}`;

// ---- Bangla calendar (Bangladesh, revised 2019) ----
// 1 Boishakh = 14 April. Boishakh–Ashwin have 31 days; Kartik, Agrahayan, Poush, Magh and Chaitra 30;
// Falgun 29 (30 when the following February is in a leap year). So 1 Kartik = 17 Oct, 1 Poush = 16 Dec, 1 Falgun = 14 Feb.
export const BN_MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
export const BN_MONTHS_EN = ['Boishakh', 'Joishtho', 'Asharh', 'Shrabon', 'Bhadro', 'Ashwin', 'Kartik', 'Agrahayan', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const monthLengths = (gYear) => [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeap(gYear + 1) ? 30 : 29, 30];

export function banglaDate(t) {
  let y = yearOf(t);
  if (t < ymd(y, 4, 14)) y -= 1;
  let rest = daysBetween(ymd(y, 4, 14), t);
  const lens = monthLengths(y);
  let m = 0;
  while (rest >= lens[m]) { rest -= lens[m]; m += 1; }
  return { day: rest + 1, month: m, year: y - 593 };
}
// Start (Gregorian timestamp) of Bangla month `m` (0 = Boishakh) in the Bangla year beginning on 14 April of gYear.
export function banglaMonthStart(gYear, m) {
  const lens = monthLengths(gYear);
  return addDays(ymd(gYear, 4, 14), lens.slice(0, m).reduce((a, b) => a + b, 0));
}
export const fmtBangla = (t, lang) => {
  const b = banglaDate(t);
  return lang === 'bn' ? `${bnDigits(b.day)} ${BN_MONTHS[b.month]}` : `${b.day} ${BN_MONTHS_EN[b.month]}`;
};
// "15 Nov (30 Kartik)" style — used where farmers plan by the Bangla month.
export const fmtDateBoth = (t, lang) => `${fmtDate(t, lang)} (${fmtBangla(t, lang)})`;
