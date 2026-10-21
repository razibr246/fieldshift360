import { useEffect, useRef } from 'react';
import { X, Database, CheckCircle2, Terminal } from 'lucide-react';
import { useStore, clim, soilData } from '../store.jsx';
import { Tags } from './ui.jsx';

const txt = (L, x) => (x == null ? '' : typeof x === 'string' || typeof x === 'number' ? x : L(x));

function Sheet({ onClose, children, wide, label }) {
  const ref = useRef();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.activeElement;
    ref.current?.focus();
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-primary-950/45 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div ref={ref} tabIndex={-1} className={`max-h-[88vh] w-full overflow-auto scroll-thin rounded-t-[24px] bg-white p-5 shadow-2xl outline-none sm:rounded-[24px] sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-xl'}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function WhyDrawer() {
  const { s, dispatch, L, T } = useStore();
  const p = s.why;
  if (!p) return null;
  const close = () => dispatch({ type: 'set', patch: { why: null } });
  return (
    <Sheet onClose={close} label={txt(L, p.title)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-primary-700">{T('এই হিসাব কোথা থেকে এল', 'How this was worked out')}</div>
          <h3 className="mt-0.5 text-[22px] font-bold">{txt(L, p.title)}</h3>
          {p.tags && <div className="mt-2"><Tags list={p.tags} /></div>}
        </div>
        <button type="button" onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/5 hover:bg-black/10" aria-label={T('বন্ধ করুন', 'Close')}><X size={18} /></button>
      </div>
      <div className="mt-4 space-y-5">
        {(p.blocks || []).map((b, i) => (
          <div key={i}>
            {b.h && <div className="mb-1.5 text-[15px] font-bold">{txt(L, b.h)}</div>}
            {b.lines && <ul className="space-y-1.5">{b.lines.filter(Boolean).map((l, j) => <li key={j} className="flex gap-2 text-[14.5px] leading-6 text-ink/85"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" /><span>{txt(L, l)}</span></li>)}</ul>}
            {b.table && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-[13.5px] tabular">
                  <thead className="bg-canvas"><tr>{b.table.head.map((h, j) => <th key={j} className="px-3 py-2 text-left font-semibold text-muted">{txt(L, h)}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border">{b.table.rows.map((r, j) => <tr key={j} className={j === b.table.rows.length - 1 && b.table.totalRow ? 'font-bold' : ''}>{r.map((c, k) => <td key={k} className="px-3 py-2 align-top">{txt(L, c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {p.sources && (
          <div className="rounded-xl bg-canvas p-3.5">
            <div className="mb-1 flex items-center gap-1.5 text-[14px] font-bold"><Database size={15} />{T('তথ্যের উৎস', 'Sources')}</div>
            <ul className="space-y-1">{p.sources.map((x, i) => <li key={i} className="break-words text-[13px] leading-5 text-muted">{txt(L, x)}</li>)}</ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}

export function DataInfo() {
  const { s, dispatch, T } = useStore();
  if (!s.dataInfo) return null;
  const cp = clim.prov, sp = soilData.provenance;
  const close = () => dispatch({ type: 'set', patch: { dataInfo: false } });
  const Row = ({ k, v }) => <tr><td className="whitespace-nowrap py-1.5 pr-3 align-top text-muted">{k}</td><td className="break-all py-1.5">{v ?? '–'}</td></tr>;
  return (
    <Sheet onClose={close} wide label={T('তথ্যের অবস্থা', 'Data status')}>
      <div className="flex items-start justify-between">
        <h3 className="text-[22px] font-bold">{T('কোন তথ্য আসল, কোনটা নমুনা', 'Which data is real and which is sample')}</h3>
        <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full bg-black/5" aria-label={T('বন্ধ করুন', 'Close')}><X size={18} /></button>
      </div>
      <h4 className="mt-4 font-bold">{T('আবহাওয়ার ইতিহাস', 'Weather history')} — <span className={cp.status === 'REAL' ? 'text-sky-700' : 'text-red-700'}>{cp.status === 'REAL' ? T('নাসার আসল তথ্য', 'real NASA data') : T('অস্থায়ী তথ্য', 'placeholder')}</span></h4>
      <table className="mt-1 w-full text-[13px]"><tbody className="divide-y divide-border">
        <Row k={T('উৎস', 'Dataset')} v={cp.dataset} /><Row k={T('সংস্করণ', 'Version')} v={cp.version} /><Row k={T('স্থান', 'Lat, lon')} v={`${cp.lat}, ${cp.lon}`} />
        <Row k={T('সময়কাল', 'Period')} v={`${cp.start} → ${cp.end}`} /><Row k={T('সংগ্রহ', 'Retrieved')} v={cp.retrieved} /><Row k="URL" v={cp.url} /><Row k={T('নোট', 'Notes')} v={cp.notes} />
      </tbody></table>
      {cp.status !== 'REAL' && (
        <div className="mt-3 rounded-xl bg-primary-950 p-3.5 text-[13px] text-primary-100">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-white"><Terminal size={14} />{T('নাসার আসল তথ্য আনতে (ইন্টারনেট লাগবে)', 'To load real NASA data (needs internet)')}</div>
          <pre className="overflow-x-auto font-mono text-[12.5px]">{`npm run fetch:power   # NASA POWER, no login
npm run build`}</pre>
        </div>
      )}
      <h4 className="mt-5 font-bold">{T('মাটি', 'Soil')} — <span className={sp.status === 'REAL' ? 'text-sky-700' : 'text-amber-700'}>{sp.status === 'REAL' ? T('আসল তথ্য', 'real data') : T('নমুনা মান', 'sample values')}</span></h4>
      <table className="mt-1 w-full text-[13px]"><tbody className="divide-y divide-border"><Row k={T('উৎস', 'Dataset')} v={sp.dataset} /><Row k={T('নোট', 'Notes')} v={sp.notes} /></tbody></table>
      <p className="mt-4 text-[14px] leading-6 text-muted">{T(
        'কৃষক, জমি, ফসলের পরিকল্পনা, সাহায্যের অনুরোধ, কর্মকর্তা, দাম আর খরচ — সবই দেখানোর জন্য বানানো নমুনা তথ্য, পর্দায় "নমুনা তথ্য" লেখা থাকে। ইউনিয়নের নাম আসল, তবে মানচিত্রে অবস্থান আনুমানিক।',
        'Farmers, fields, crop plans, help requests, officers, prices and costs are all made-up sample data and are marked "Demo data" on screen. Union names are real; their map positions are approximate.')}</p>
    </Sheet>
  );
}

export function Toast() {
  const { s, L } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[2100] flex justify-center px-4 lg:bottom-8" role="status" aria-live="polite">
      {s.toast && (
        <div key={s.toast.at} className="flex items-center gap-2 rounded-xl bg-primary-950 px-4 py-3 text-[14.5px] font-semibold text-white shadow-2xl">
          <CheckCircle2 size={18} className="text-primary-300" />{L(s.toast)}
        </div>
      )}
    </div>
  );
}
