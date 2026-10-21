import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, Cell, CartesianGrid } from 'recharts';
import { weekStart, HIGH_FACTOR } from '../../engine/glut.js';
import { fmtDate, fmtRange, num, addDays } from '../../engine/dates.js';
import { useStore } from '../../store.jsx';

const OVER = '#c8463d';
const LIMIT = '#b42318';
const DIP = '#c9932b';
const REAL = '#2f6fae'; // confirmed plans of other users (shared board)

// a "nice" axis: 4–5 ticks on round steps (1, 2, 2.5, 5 × 10^n) so labels never read 0.6 / 1.1 / 2.1
function niceTicks(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(+v.toFixed(6));
  return { ticks, top, dp: step < 1 ? (step < 0.1 ? 2 : 1) : 0 };
}

function Swatch({ children, style, line }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {line ? <i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: LIMIT }} /> : <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={style} />}
      {children}
    </span>
  );
}

// bins: Map(week -> tonnes); real: other users' confirmed plans (optional, blue); mine: this field (optional, gold on top)
export default function SupplyChart({ bins, real, mine, normal, dip, highlight = [], height = 200, color = '#1b9872', legend = false }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const weeks = [...bins.keys(), ...(real ? [...real.keys()] : []), ...(mine ? [...mine.keys()] : [])];
  if (!weeks.length) return <div className="text-sm text-ink/50 p-4">{T('এই ফসলের কোনো পরিকল্পনা নেই', 'No plans for this crop')}</div>;
  const lo = Math.min(...weeks) - 1, hi = Math.max(...weeks) + 1;
  const limit = normal * HIGH_FACTOR;
  const data = [];
  for (let w = lo; w <= hi; w++) {
    const others = +(bins.get(w) || 0).toFixed(2), r = real ? +(real.get(w) || 0).toFixed(2) : 0, m = mine ? +(mine.get(w) || 0).toFixed(2) : 0;
    data.push({ w, label: fmtDate(weekStart(w), lang), others, real: r, mine: m, over: others + r + m > limit });
  }
  const labelOf = (w) => fmtDate(weekStart(w), lang);
  const { ticks, top, dp } = niceTicks(Math.max(...data.map((d) => d.others + d.real + d.mine), limit) * 1.08);
  const anyOver = data.some((d) => d.over);
  const tipRow = (c, label, value) => (
    <div className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-muted"><i className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />{label}</span><b className="tabular text-ink">{value}</b></div>
  );
  const tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const total = d.others + d.real + d.mine;
    return (
      <div className="min-w-[180px] rounded-xl border border-border bg-white px-3 py-2.5 text-[12.5px] leading-6 shadow-lg">
        <p className="font-semibold text-ink">{fmtRange(weekStart(d.w), addDays(weekStart(d.w), 6), lang)}</p>
        {mine && tipRow(DIP, T('আপনার জমি', 'Your plot'), `${num(d.mine, lang, { dp: 1 })} ${T('টন', 't')}`)}
        {real && tipRow(REAL, T('অন্যদের পাকা পরিকল্পনা', 'Others’ confirmed plans'), `${num(d.real, lang, { dp: 1 })} ${T('টন', 't')}`)}
        {tipRow(d.over ? OVER : color, real ? T('নমুনা প্রতিবেশী', 'Sample neighbours') : mine ? T('ইউনিয়নের অন্যরা', 'Rest of union') : T('মোট ফসল', 'Total harvest'), `${num(d.others, lang, { dp: 1 })} ${T('টন', 't')}`)}
        <p className={`mt-1 border-t border-border pt-1 font-semibold ${d.over ? 'text-red-700' : 'text-muted'}`}>
          {total ? T(`স্বাভাবিকের ${num(total / normal, 'bn', { dp: 1 })} গুণ`, `${num(total / normal, 'en', { dp: 1 })}× normal`) : T('এই সপ্তাহে কিছু উঠবে না', 'Nothing comes in this week')}
          {d.over && T(' · সীমার ওপরে', ' · above the line')}
        </p>
      </div>
    );
  };
  return (
    <div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 22, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eef0ec" />
            {dip && <ReferenceArea x1={labelOf(Math.max(dip[0], lo))} x2={labelOf(Math.min(dip[1], hi))} fill={DIP} fillOpacity={0.12} />}
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5d6a63' }} interval="preserveStartEnd" minTickGap={14} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} />
            <YAxis tick={{ fontSize: 11, fill: '#5d6a63' }} domain={[0, top]} ticks={ticks} tickFormatter={(v) => num(v, lang, { dp })} tickLine={false} axisLine={false}
              label={{ value: T('টন', 't'), position: 'insideTopLeft', offset: 0, dx: 14, dy: -20, fontSize: 11, fill: '#5d6a63' }} />
            <Tooltip content={tip} cursor={{ fill: 'rgba(19,38,27,.05)' }} />
            <ReferenceLine y={limit} stroke={LIMIT} strokeDasharray="5 4" ifOverflow="extendDomain"
              label={legend ? undefined : { value: T('অতিরিক্ত সরবরাহের সীমা', 'Oversupply line'), position: 'insideTopRight', fontSize: 10.5, fill: LIMIT }} />
            <Bar dataKey="others" stackId="a" fill={color} maxBarSize={56} radius={mine || real ? [0, 0, 0, 0] : [5, 5, 0, 0]}>
              {data.map((d) => <Cell key={d.w} fill={d.over ? OVER : color} fillOpacity={highlight.length && !highlight.includes(d.w) ? 0.45 : 0.9} />)}
            </Bar>
            {real && <Bar dataKey="real" stackId="a" fill={REAL} fillOpacity={0.9} maxBarSize={56} radius={mine ? [0, 0, 0, 0] : [5, 5, 0, 0]} />}
            {mine && <Bar dataKey="mine" stackId="a" fill={DIP} maxBarSize={56} radius={[5, 5, 0, 0]} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-1 text-[12.5px] text-muted">
          <Swatch style={{ background: color, opacity: 0.9 }}>{T('স্বাভাবিক সীমার মধ্যে', 'Within the normal range')}</Swatch>
          {anyOver && <Swatch style={{ background: OVER, opacity: 0.9 }}>{T('সীমার ওপরে', 'Above the line')}</Swatch>}
          <Swatch line>{T(`অতিরিক্ত সরবরাহের সীমা (স্বাভাবিকের ${num(HIGH_FACTOR, 'bn', { dp: 1 })} গুণ)`, `Oversupply line (${HIGH_FACTOR}× normal)`)}</Swatch>
          {dip && <Swatch style={{ background: DIP, opacity: 0.35 }}>{T('যে সপ্তাহে দাম সাধারণত কমে', 'Weeks prices usually fall')}</Swatch>}
          {mine && <Swatch style={{ background: DIP }}>{T('আপনার জমি', 'Your plot')}</Swatch>}
        </div>
      )}
    </div>
  );
}
