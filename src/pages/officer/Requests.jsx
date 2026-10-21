import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, LifeBuoy, ChevronRight, Inbox } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Badge, Segmented, Tags, EmptyState } from '../../components/ui';
import { SYMPTOMS, DISEASES, aiLabel } from '../../data/demo';
import { cropName } from '../../engine/crops';
import { num } from '../../engine/dates';
import { sortRequests, PRIORITY, REQ_STATUS, ageLabel } from './shared';

export default function Requests() {
  const { s, T, L, farmerOf } = useStore();
  const lang = s.lang;
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const all = sortRequests(s.requests.filter((r) => r.union === s.officerUnion));
  const isOpen = (r) => r.status === 'open' || r.status === 'need_info';
  const list = all.filter((r) => (tab === 'all' ? true : tab === 'open' ? isOpen(r) : !isOpen(r)))
    .filter((r) => { if (!q.trim()) return true; const f = farmerOf(r.farmerId); const hay = `${f?.name.bn} ${f?.name.en} ${r.village} ${r.villageBn} ${SYMPTOMS[r.symptom].bn} ${SYMPTOMS[r.symptom].en}`.toLowerCase(); return hay.includes(q.trim().toLowerCase()); });
  const count = (fn) => num(all.filter(fn).length, lang);
  return (
    <div>
      <PageHeader eyebrow={T('কৃষকের অনুরোধ', 'Farmer requests')} title={T('কে কী জানতে চেয়েছেন', 'Who needs what')} subtitle={T('জরুরিগুলো ওপরে, তারপর নতুনগুলো। কোনোটায় চাপ দিলে পুরো বিবরণ আর উত্তর দেওয়ার জায়গা খুলবে।', 'Urgent first, then newest. Open one to see everything and reply.')} tags={['RULE', 'DEMO']} />
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'open', label: T(`খোলা (${count(isOpen)})`, `Open (${count(isOpen)})`) },
            { value: 'done', label: T(`উত্তর দেওয়া (${count((r) => !isOpen(r))})`, `Done (${count((r) => !isOpen(r))})`) },
            { value: 'all', label: T(`সব (${num(all.length, lang)})`, `All (${all.length})`) },
          ]} />
          <label className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-black/[.05] px-3 focus-within:ring-2 focus-within:ring-primary-200 lg:flex-1">
            <Search size={17} className="text-muted" />
            <span className="sr-only">{T('খুঁজুন', 'Search')}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent text-[15px] outline-none" placeholder={T('কৃষক, গ্রাম বা সমস্যার নাম', 'Farmer, village or problem')} />
          </label>
        </div>
        <div className="mt-4 divide-y divide-border">
          {list.length === 0 && <EmptyState icon={Inbox} title={tab === 'open' ? T('সব অনুরোধের উত্তর দেওয়া হয়েছে', 'Every request has been answered') : T('কিছু পাওয়া যায়নি', 'Nothing found')} text={T('অন্য তালিকা বা অন্য নাম দিয়ে দেখুন।', 'Try the other list or another name.')} />}
          {list.map((r) => {
            const f = farmerOf(r.farmerId);
            return (
              <Link key={r.id} to={`/officer/requests/${r.id}`} className={`flex items-center gap-3 rounded-lg px-1.5 py-3.5 transition hover:bg-primary-50/50 ${r.mine ? 'bg-sky-50/50' : ''}`}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><LifeBuoy size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="text-[15.5px] font-bold">{L(f?.name)}</span><Badge tone={PRIORITY[r.priority].tone}>{L(PRIORITY[r.priority])}</Badge>{r.status !== 'open' && <Badge tone={REQ_STATUS[r.status].tone}>{L(REQ_STATUS[r.status])}</Badge>}{r.mine && <Badge tone="blue">{T('নতুন', 'New')}</Badge>}{r.visit && <Badge tone="violet">{T('জমিতে যাবেন', 'Visit')}</Badge>}</div>
                  <p className="mt-0.5 text-[13px] text-muted">{cropName(r.crop, lang)}, {lang === 'bn' ? r.villageBn : r.village}, {ageLabel(r.created, T)}</p>
                  <p className="mt-1 truncate text-[14.5px] text-ink/80">{L(SYMPTOMS[r.symptom])}: {L(r.text)}</p>
                  {r.ai && <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-violet-700">{T(`ছবি দেখে: ${aiLabel(r.ai[0]).bn}, ${num(r.ai[0].p * 100, 'bn')}%`, `Photo suggests: ${aiLabel(r.ai[0]).en.toLowerCase()}, ${num(r.ai[0].p * 100, 'en')}%`)} <Tags list={[r.doctor ? 'AI' : 'DEMO']} /></p>}
                </div>
                <ChevronRight size={18} className="shrink-0 text-muted" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
