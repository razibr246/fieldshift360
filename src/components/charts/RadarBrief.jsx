// The top of Ropon Radar for an upazila officer: this season in one line, the hazard that comes most often here, when
// the rains set in, the calendar for the next Aman, what fits the hazard, and the same as a message for the
// upazila's farmers (src/radar/brief.js). Everything is read from the data the sections below show in full.
import { Sprout, ShieldAlert, CloudRain, CalendarDays, Send, CheckCircle2, MessageSquareText } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Button, Tags, Badge } from '../ui';
import { fmtDate, num, todayDhaka } from '../../engine/dates';
import { smsParts } from '../../engine/text';
import { AMAN, CAT, LATEST, catOf, doyToMs } from '../../radar/aman';
import { hazardGroups, hazardYears, amanCalendar, farmerMessage, FIT } from '../../radar/brief';
import { onsetSummary } from '../../radar/onset';
import { LEVEL } from './AmanHazards';

export default function RadarBrief({ view, row, year, mine, district }) {
  const { s, T, L, dispatch, toast, upazilaFarmers } = useStore();
  const lang = s.lang;
  const se = row.seasons[year];
  const cat = CAT[catOf(se.shift)];
  const groups = hazardGroups(view);
  const top = groups?.find((g) => g.level > 0) ?? null;
  const [y0, y1] = hazardYears();
  const nYears = y1 - y0 + 1;
  const onset = onsetSummary(view, row);
  const next = LATEST + 1;
  const cal = amanCalendar(row.transplantNormal, next, AMAN.shiftDays);
  const day = (t, l = lang) => fmtDate(t, l);
  const span = ([a, b]) => `${day(a)} – ${day(b)}`;
  const yr = (y) => num(y, lang).replace(/,/g, '');
  const msg = cal ? farmerMessage({ cal, groups, place: { bn: `${row.bn} উপজেলা`, en: `${row.en} upazila` }, fmt: fmtDate }) : null;
  const advId = `RADAR-${view}-${next}`;
  const sent = s.advisories.find((a) => a.id === advId);
  const to = upazilaFarmers.map((f) => f.id);
  const send = () => {
    dispatch({ type: 'addAdvisory', adv: { id: advId, upazila: view, text: L(msg), to, at: todayDhaka() } });
    toast(`${num(to.length, 'bn')} জন কৃষককে পাঠানো হয়েছে`, `Sent to ${to.length} farmers`);
  };

  const tiles = [
    {
      icon: Sprout, color: cat.color, label: T(`${yr(year)} সালের আমন`, `Aman ${year}`),
      value: se.transplantDoy === null || !se.reliable ? L(CAT.none) : L(cat),
      note: se.transplantDoy === null ? T('রাডারে রোপণ ধরা পড়েনি', 'No transplanting seen by radar')
        : !se.reliable ? T('যথেষ্ট নমুনা জমিতে ধরা পড়েনি', 'Seen in too few sample fields')
          : T(`রোপণ ${day(doyToMs(year, se.transplantDoy))}${se.shift ? `, স্বাভাবিকের ${num(Math.abs(se.shift), 'bn')} দিন ${se.shift < 0 ? 'আগে' : 'পরে'}` : ', ঠিক স্বাভাবিক দিনে'}`,
            `Transplanted ${day(doyToMs(year, se.transplantDoy))}${se.shift ? `, ${Math.abs(se.shift)} days ${se.shift < 0 ? 'earlier' : 'later'} than usual` : ', on the usual day'}`),
    },
    groups ? {
      icon: ShieldAlert, color: top?.color ?? '#43863a', label: T('এখানে সবচেয়ে বেশি আসে', 'Comes most often here'),
      value: top ? L(top) : T('বড় কোনো ঝুঁকি নেই', 'No major hazard'),
      note: top ? T(`${yr(y0)}–${yr(y1)}-এর ${num(nYears, 'bn')} বছরে ${num(top.years.length, 'bn')} বছর${top.lastHit ? `, ${yr(y1)}-এও` : ''}${top.worsening.length ? '; ধারা খারাপের দিকে' : ''}`, `${top.years.length} of ${nYears} years, ${y0}–${y1}${top.lastHit ? `, ${y1} too` : ''}${top.worsening.length ? '; trending worse' : ''}`)
        : T(`${yr(y0)}–${yr(y1)}-এ খরা, বন্যা, গরম বা ঠান্ডার বছর দেখা যায়নি`, `No drought, flood, heat or cold years in ${y0}–${y1}`),
      badge: top && LEVEL[top.level],
    } : {
      icon: ShieldAlert, color: '#9aa79f', label: T('আবহাওয়া-ঝুঁকি', 'Weather hazards'),
      value: '—', note: T('এই উপজেলার ঝুঁকির হিসাব এখনো তৈরি হয়নি', 'Hazards are not built for this upazila yet'),
    },
    {
      icon: CloudRain, color: '#2f8a8f', label: T('বর্ষার বৃষ্টি শুরু', 'Monsoon rain sets in'),
      value: onset?.usual ? T(`সাধারণত ${day(doyToMs(next, onset.usual))}`, `Usually ${day(doyToMs(next, onset.usual))}`) : '—',
      note: onset?.trend ? T(`প্রতি দশকে ${num(Math.abs(onset.trend.perDecade), 'bn', { dp: 1 })} দিন ${onset.trend.perDecade > 0 ? 'দেরিতে' : 'আগে'}${onset.trend.significant ? ' (জোরালো ধারা)' : ' (জোরালো নয়)'}`, `${Math.abs(onset.trend.perDecade)} days a decade ${onset.trend.perDecade > 0 ? 'later' : 'earlier'}${onset.trend.significant ? ' (a firm trend)' : ' (not a firm trend)'}`) : T('বৃষ্টি শুরুর হিসাব নেই', 'No onset record'),
    },
  ];
  const steps = cal && [
    { k: 'seedbed', bn: 'বীজতলা', en: 'Seedbed', at: cal.seedbed, color: '#d9a93b' },
    { k: 'transplant', bn: 'রোপণ', en: 'Transplanting', at: cal.transplant, color: '#43863a' },
    { k: 'flowering', bn: 'ফুল আসা', en: 'Flowering', at: cal.flowering, color: '#c98a4b' },
    { k: 'harvest', bn: 'ধান কাটা', en: 'Harvest', at: cal.harvest, color: '#a8552a' },
  ];

  return (
    <Card id="rd-brief" className="scroll-mt-40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[21px] font-bold leading-tight">{T('এক নজরে: কৃষকদের কী বলবেন', 'At a glance: what to tell the farmers')}</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">{T(`${row.bn} উপজেলা, ${district.bn} জেলা। নিচের অংশগুলোর আসল উপগ্রহ তথ্য থেকে।`, `${row.en} upazila, ${district.en} district. From the real satellite data in the sections below.`)}</p>
        </div>
        <Tags list={['SAT', 'RULE']} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-muted"><x.icon size={15} style={{ color: x.color }} />{x.label}</span>
              {x.badge && <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${x.badge.cls}`}>{L(x.badge)}</span>}
            </div>
            <div className="mt-1.5 text-[19px] font-bold leading-tight" style={{ color: x.color }}>{x.value}</div>
            <p className="mt-1 text-[12.5px] leading-5 text-muted">{x.note}</p>
          </div>
        ))}
      </div>

      {steps && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-[15px] font-bold"><CalendarDays size={16} className="text-primary-700" />{T(`আগামী আমন, ${yr(next)}: কবে কী`, `The next Aman, ${next}: what, when`)}</h3>
          <ol className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((x, i) => (
              <li key={x.k} className="relative rounded-xl bg-canvas px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold"><span className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: x.color }}>{num(i + 1, lang)}</span>{L(x)}</span>
                <span className="mt-1 block text-[14px] font-bold tabular">{span(x.at)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-1.5 text-[12px] leading-5 text-muted">{T(`রাডারে মাপা এখানকার স্বাভাবিক রোপণের দিন (${day(doyToMs(next, row.transplantNormal))}, ২০১৭–২০২৫-এর মধ্যমা) ধরে: চারার বয়স ২৫–৩০ দিন, রোপণ ±${num(AMAN.shiftDays, 'bn')} দিন, ধান কাটা রোপণের ৯৫–১২০ দিন পরে (জাত অনুযায়ী)।`, `Hung on the usual transplanting day measured here by radar (${day(doyToMs(next, row.transplantNormal), 'en')}, 2017–2025 median): seedlings 25–30 days old, transplanting ±${AMAN.shiftDays} days, harvest 95–120 days after (by variety).`)}</p>
        </div>
      )}

      {top && (
        <div className="mt-4">
          <h3 className="text-[15px] font-bold">{T(`${top.bn} সামলাতে`, `For ${top.en.toLowerCase()}`)}</h3>
          <ul className="mt-1.5 space-y-1 text-[14px] leading-6">{L(FIT[top.key]).slice(0, 2).map((t) => <li key={t} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: top.color }} />{t}</li>)}</ul>
        </div>
      )}

      {msg && (
        <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-primary-900"><MessageSquareText size={15} />{T('কৃষকদের বার্তা', 'Message for the farmers')}</span>
            <span className="text-[12px] text-muted">{T(`${num(smsParts(L(msg)).parts, 'bn')}টি এসএমএস`, `${smsParts(L(msg)).parts} SMS`)}</span>
          </div>
          <p className="mt-1.5 text-[14.5px] leading-6">{L(msg)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {mine ? (
              sent ? <Badge tone="green"><CheckCircle2 size={13} />{T(`${num(sent.to.length, 'bn')} জন কৃষককে পাঠানো হয়েছে`, `Sent to ${sent.to.length} farmers`)}</Badge>
                : <Button onClick={send} disabled={!to.length}><Send size={16} />{T(`উপজেলার ${num(to.length, 'bn')} জন কৃষককে পাঠান`, `Send to the upazila's ${to.length} farmers`)}</Button>
            ) : <span className="text-[13px] text-muted">{T('শুধু নিজের উপজেলার কৃষকদের বার্তা পাঠানো যায়।', 'Messages go only to your own upazila’s farmers.')}</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
