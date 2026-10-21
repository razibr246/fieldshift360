// Green cover (NDVI) of one field through the seasons: every clear Sentinel-2 pass as a dot on a line, and the
// typical curve the AI matched for this season, dashed, so the farmer sees whether the crop is ahead or behind.
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from 'recharts';
import { useStore } from '../../store';
import { num, fmtDate, parseISO } from '../../engine/dates';

const FIELD = '#2f6e2f', TYPICAL = '#8a9a8f', WATER = '#237479';
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

function Tip({ active, payload, lang, T }) {
  if (!active || !payload?.length) return null;
  const o = payload.find((p) => p.dataKey === 'ndvi')?.payload ?? payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-lift)] ring-1 ring-border">
      <div className="font-semibold">{fmtDate(o.t, lang)}</div>
      {o.ndvi != null && <div>{T('সবুজ', 'Green cover')}: <b className="tabular">{num(Math.round(o.ndvi * 100), lang)}</b>{o.water >= 0.3 ? T(' · জমিতে পানি', ' · water on the field') : ''}</div>}
      {o.v != null && <div className="text-muted">{T('সাধারণ ফসলে', 'Typical crop')}: <span className="tabular">{num(Math.round(o.v * 100), lang)}</span></div>}
    </div>
  );
}

export default function NdviChart({ series, expected = [], season }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const obs = series.map((o) => ({ ...o, t: parseISO(o.d) }));
  const typ = expected.map((p) => ({ t: parseISO(p.d), v: p.v }));
  const t0 = obs[0]?.t ?? Date.now(), t1 = Math.max(obs[obs.length - 1]?.t ?? Date.now(), typ[typ.length - 1]?.t ?? 0);
  // A tick on the 1st of every other month.
  const ticks = [];
  for (let d = new Date(t0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    if (m >= t0 && d.getUTCMonth() % 2 === 0) ticks.push(m);
  }
  const fmtTick = (t) => { const d = new Date(t); return lang === 'bn' ? `${MONTHS_BN[d.getUTCMonth()]} ${num(String(d.getUTCFullYear()).slice(2), 'bn')}` : `${MONTHS_EN[d.getUTCMonth()]} ’${String(d.getUTCFullYear()).slice(2)}`; };
  const dot = (p) => {
    const { cx, cy, payload } = p;
    if (cx == null || cy == null) return null;
    return <circle key={payload.d} cx={cx} cy={cy} r={4} fill={payload.water >= 0.3 ? WATER : FIELD} stroke="#fff" strokeWidth={2} />;
  };
  return (
    <figure>
      <div className="h-[230px] w-full" role="img" aria-label={T('জমির সবুজের রেখাচিত্র', 'Chart of the field’s green cover over time')}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e7ece4" vertical={false} />
            {season && <ReferenceArea x1={Math.max(season.start, t0)} x2={Math.min(season.end, t1)} fill="#edc067" fillOpacity={0.12} ifOverflow="hidden" />}
            <XAxis dataKey="t" type="number" scale="time" domain={[t0, t1]} ticks={ticks} tickFormatter={fmtTick} allowDuplicatedCategory={false}
              tick={{ fontSize: 11, fill: '#566a5e' }} tickLine={false} axisLine={{ stroke: '#d5ddd1' }} />
            <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => num(Math.round(v * 100), lang)} tick={{ fontSize: 11, fill: '#566a5e' }} tickLine={false} axisLine={false} />
            <Tooltip content={<Tip lang={lang} T={T} />} cursor={{ stroke: '#8a9a8f', strokeDasharray: '3 3' }} />
            <Line data={typ} dataKey="v" type="monotone" stroke={TYPICAL} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={false} />
            <Line data={obs} dataKey="ndvi" type="monotone" stroke={FIELD} strokeWidth={2} dot={dot} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: FIELD }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 rounded" style={{ background: FIELD }} />{T('এই জমি (প্রতিটি পরিষ্কার ছবি একটি বিন্দু)', 'This field (one dot per clear picture)')}</span>
        {typ.length > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: TYPICAL }} />{T('এই মৌসুমে সাধারণ ফসল', 'A typical crop this season')}</span>}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: WATER }} />{T('জমিতে পানি', 'Water on the field')}</span>
        {season && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-4 rounded-sm bg-[#edc067]/30" />{T('এই মৌসুম', 'This season')}</span>}
      </figcaption>
    </figure>
  );
}
