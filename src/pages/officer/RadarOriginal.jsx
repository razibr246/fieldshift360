// The original Ropon Radar (public/radar/): the first prototype, a standalone D3 app on seeded sample data for
// Rangpur, kept as it was. Shown here inside the officer pages; the real-satellite Ropan Radar is /officer/radar.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Radar as RadarIcon, MonitorPlay, MousePointerClick, FileText } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Segmented, Note } from '../../components/ui';

const BASE = `${import.meta.env.BASE_URL || './'}radar/`;
const VIEWS = {
  explore: { src: `${BASE}index.html?mode=explore`, icon: MousePointerClick, bn: 'ঘুরে দেখুন', en: 'Explore' },
  scene: { src: `${BASE}index.html`, icon: MonitorPlay, bn: 'দৃশ্য (রেকর্ডিং)', en: 'Scenes (recording)' },
  text: { src: `${BASE}lowband.html`, icon: FileText, bn: 'শুধু লেখা', en: 'Text only' },
};

export default function RadarOriginal() {
  const { T, L } = useStore();
  const [view, setView] = useState('explore');
  const v = VIEWS[view];
  return (
    <div>
      <PageHeader eyebrow={T('রোপণ রাডার · আসল সংস্করণ', 'Ropon Radar · original version')} title={T('রোপণ রাডার (প্রথম সংস্করণ)', 'Ropon Radar (first version)')}
        subtitle={T('প্রথম তৈরি রোপণ রাডার, যেমন ছিল তেমনই: রংপুর জেলার ৮ উপজেলা, বৃষ্টি শুরুর দিন বনাম রাডারে দেখা আমন রোপণ। এর সব সংখ্যা নমুনা তথ্য থেকে বানানো।', 'The first Ropon Radar, kept as it was: Rangpur district’s 8 upazilas, usable-rain onset against radar-detected Aman transplanting. Every number in it comes from seeded sample data.')}
        tags={['DEMO']}
        action={<a href={v.src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] font-semibold hover:bg-primary-50"><ExternalLink size={16} />{T('পুরো পর্দায় খুলুন', 'Open full screen')}</a>} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={setView} options={Object.entries(VIEWS).map(([k, x]) => ({ value: k, icon: x.icon, label: L(x) }))} />
        <Link to="/officer/radar" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-700 hover:underline"><RadarIcon size={16} />{T('আসল উপগ্রহ তথ্যের রোপণ রাডার →', 'Ropan Radar on real satellite data →')}</Link>
      </div>
      <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-[var(--shadow-card)]">
        <iframe key={view} src={v.src} title={T('রোপণ রাডার, প্রথম সংস্করণ', 'Ropon Radar, first version')} className="block h-[calc(100vh-220px)] min-h-[640px] w-full" loading="lazy" />
      </div>
      {view === 'scene' && <Note className="mt-3">{T('দৃশ্য মোড ১৯২০×১০৮০ মাপের, ভিডিও রেকর্ডের জন্য বানানো; ছোট পর্দায় "পুরো পর্দায় খুলুন" ভালো দেখায়।', 'Scene mode is a fixed 1920×1080 stage made for recording; on a smaller screen, "Open full screen" works better.')}</Note>}
    </div>
  );
}
