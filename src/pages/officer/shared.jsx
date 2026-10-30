// Helpers shared by the officer pages.
import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Button, Note, SmsMeter } from '../../components/ui';
import { SYMPTOMS, DEMO_TODAY } from '../../data/demo';
import { cropName } from '../../engine/crops';
import { num, daysBetween, todayDhaka } from '../../engine/dates';
import { supplyCurve, normalWeekly, riskForWeeks } from '../../engine/glut';
import { bnOf } from '../../engine/text';
import { advisoryText } from '../../engine/advice';

export const CROP_COLOR = { tomato: '#c8463d', boro: '#43863a', aman: '#8a9a2b', wheat: '#d08f26', lentil: '#7a5bb8', mustard: '#c9b320' };
export const PR_ORDER = { High: 0, Medium: 1, Low: 2 };
export const PRIORITY = {
  High: { tone: 'red', bn: 'জরুরি', en: 'Urgent' },
  Medium: { tone: 'amber', bn: 'মাঝারি', en: 'Medium' },
  Low: { tone: 'slate', bn: 'সাধারণ', en: 'Routine' },
};
export const REQ_STATUS = {
  open: { tone: 'amber', bn: 'খোলা', en: 'Open' },
  need_info: { tone: 'blue', bn: 'আরও ছবি চাওয়া হয়েছে', en: 'Asked for more' },
  answered: { tone: 'green', bn: 'উত্তর দেওয়া', en: 'Answered' },
  resolved: { tone: 'slate', bn: 'মিটে গেছে', en: 'Resolved' },
};

export const sortRequests = (list) => [...list].sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || PR_ORDER[a.priority] - PR_ORDER[b.priority] || b.created - a.created);

export function useOfficerUnion() {
  const { s, unionsAll } = useStore();
  return unionsAll[s.officerUnion];
}

export function ageLabel(created, T) {
  const d = daysBetween(created, todayDhaka()); // real date: a request sent today reads "today"
  return d <= 0 ? T('আজ', 'today') : T(`${num(d, 'bn')} দিন আগে`, `${d} day${d > 1 ? 's' : ''} ago`);
}

// Rabi crops by planned area across the given unions, largest first (only crops someone plans to grow).
export function cropsByArea(unions) {
  const area = {};
  for (const u of unions) for (const p of u.plans) area[p.crop] = (area[p.crop] ?? 0) + p.area_dec;
  return Object.entries(area).filter(([, a]) => a > 0).sort((a, b) => b[1] - a[1]).map(([k, a]) => ({ k, area: a }));
}

export function unionGlut(u, crop = 'tomato') {
  const bins = supplyCurve(null, u.plans, crop);
  const normal = normalWeekly(u.area_dec, crop);
  const risk = riskForWeeks(bins, [...bins.keys()], normal, crop);
  const peak = bins.size ? Math.max(...bins.values()) / normal : 0;
  return { bins, normal, risk, peak };
}

export { advisoryText };

export function ClusterCard({ h, union, compact = false }) {
  const { s, dispatch, T, L, toast, farmerOf, unionsAll } = useStore();
  const lang = s.lang;
  const members = h.members.filter((m) => unionsAll[m.union]);
  const scoped = { ...h, members };
  const villages = [...new Set(members.map((m) => m.village))];
  const recipients = union.plans.filter((p) => p.crop === h.crop && farmerOf(p.plot_id)?.union === union.id && villages.includes(farmerOf(p.plot_id)?.village)).map((p) => p.plot_id);
  const to = [...new Set([...recipients, ...members.map((m) => m.farmerId)])];
  const metas = [...new Set(members.map((m) => m.union))].map((id) => unionsAll[id]?.meta).filter(Boolean);
  const adviceMeta = { ...union.meta, bn: metas.map((m) => m.bn).join(' ও '), en: metas.map((m) => m.en).join(' and ') };
  const [text, setText] = useState(null);
  const draft = text ?? advisoryText(scoped, adviceMeta, lang);
  const sent = s.advisories.some((a) => a.cluster === h.id);
  const send = () => {
    dispatch({ type: 'addAdvisory', adv: { id: `ADV-${h.id}`, cluster: h.id, text: draft, to, at: todayDhaka() } });
    dispatch({ type: 'updateRequest', ids: members.map((m) => m.id), patch: { status: 'answered' } });
    toast(`${num(to.length, 'bn')} জন কৃষকের কাছে পরামর্শ গেছে`, `Advice sent to ${to.length} farmers`);
  };
  const villageNames = villages.map((v) => (lang === 'bn' ? members.find((m) => m.village === v).villageBn : v)).join(T(' ও ', ' and '));
  return (
    <Card className="border-l-4 !border-l-red-500 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle size={19} className="text-red-600" />
        <h2 className="text-[18px] font-bold">{T(`কাছাকাছি ${num(members.length, 'bn')}টি জমি থেকে একই সমস্যা`, `${members.length} nearby fields report the same problem`)}</h2>
        <Tags list={['AI', 'DEMO']} />
      </div>
      <p className="mt-1 text-[14px] text-muted">{T(`${bnOf(cropName(h.crop, 'bn'))} ${SYMPTOMS[h.symptom].bn}, ${villageNames}। সাত দিনের মধ্যে, দেড় কিলোমিটারের ভেতরে।`, `${SYMPTOMS[h.symptom].en} on ${cropName(h.crop, 'en').toLowerCase()} in ${villageNames}, within seven days and 1.5 km.`)}</p>
      {!compact && <p className="mt-1 text-[13px] text-muted">{T('একই ফসলে একই লক্ষণ, কাছাকাছি জায়গা আর সময়ে অন্তত পাঁচটি খবর এলে AI (DBSCAN পদ্ধতি) সেগুলো এক গুচ্ছে ধরে।', 'AI (DBSCAN clustering) groups at least five reports with the same crop and symptom that are close in place and time.')}</p>}
      {compact ? (
        <div className="mt-3"><Button to="/officer/alerts" className="!py-2">{sent ? T('পাঠানো পরামর্শ দেখুন', 'View the advice sent') : T('সবাইকে পরামর্শ পাঠান', 'Advise them all')}</Button></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block" htmlFor={`adv-${h.id}`}>
            <span className="mb-1 flex items-center gap-2 text-[13.5px] font-semibold text-muted">{T('পরামর্শের খসড়া — দরকারমতো বদলে নিন', 'Draft advice — edit as needed')} <Tags list={['RULE']} /></span>
            <textarea id={`adv-${h.id}`} value={draft} onChange={(e) => setText(e.target.value)} rows={7} disabled={sent} className="w-full rounded-xl border border-border p-3 text-[15px] leading-7 outline-none focus:border-primary-400 disabled:bg-canvas" />
            <SmsMeter text={draft} className="mt-1" />
          </label>
          <div className="flex flex-col gap-2 md:w-64">
            <Button disabled={sent} onClick={send} className="py-3">{sent ? <><CheckCircle2 size={16} />{T(`${num(to.length, 'bn')} জনকে পাঠানো হয়েছে`, `Sent to ${to.length} farmers`)}</> : <><Send size={16} />{T(`${num(to.length, 'bn')} জন কৃষককে পাঠান`, `Send to ${to.length} farmers`)}</>}</Button>
            <p className="text-[12.5px] leading-5 text-muted">{T('কারা পাবেন: ওই গ্রামগুলোতে এই ফসল করেন এমন সব কৃষক, আর যাঁরা খবর দিয়েছেন।', 'Who gets it: everyone growing this crop in those villages, plus everyone who reported.')}</p>
          </div>
        </div>
      )}
      {sent && !compact && <Note tone="ok" className="mt-3">{T('কৃষকেরা এটা তাঁদের "সাহায্য" পাতায় আর ঘণ্টার চিহ্নে দেখতে পাবেন।', 'Farmers see this on their Help page and as a bell notification.')}</Note>}
    </Card>
  );
}
