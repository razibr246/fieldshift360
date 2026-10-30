// Shell for the neighbouring countries, built like the Bangladesh app: one sample farmer and one local agriculture
// officer per country, each with their own tabs. The country's data file and the farm's live forecast are loaded
// once here and handed to every tab (useAbroad()).
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams, Navigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, UserRound, Building2, Home, MapPinned, Sprout, ShieldAlert, Telescope, LifeBuoy, LayoutDashboard, BellRing, UsersRound, Globe2, Map as MapIcon, CalendarRange } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import { LangToggle, SkipToMain } from '../components/chrome';
import { useStore } from '../store';
import { ABROAD, ABROAD_ORDER } from '../data/abroad';
import { useScrollOnNavigate } from '../components/Motion';
import { useCountry, useLiveForecast, useBoard } from '../pages/abroad/parts';
import { localAlerts, localNow } from '../engine/abroad';

export const useAbroad = () => useOutletContext();

// A row of tabs whose white highlight glides to the active tab on a spring (like a macOS segmented control),
// rather than jumping. The highlight is measured from the active link after every route change.
function SlidingTabs({ tabs, label, lang }) {
  const nav = useRef(null);
  const { pathname } = useLocation();
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = nav.current?.querySelector('[aria-current="page"]');
      if (!el) { setPill(null); return; }
      setPill({ x: el.offsetLeft, w: el.offsetWidth });
      el.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (nav.current) ro.observe(nav.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [pathname, lang, tabs.length]);
  return (
    <nav ref={nav} className="hide-scrollbar relative flex min-w-0 flex-1 gap-0.5 overflow-x-auto [mask-image:linear-gradient(90deg,transparent_0,#000_8px,#000_calc(100%-8px),transparent_100%)] sm:[mask-image:none]" aria-label={label}>
      {pill && <span aria-hidden="true" className="pointer-events-none absolute top-0 h-8 rounded-full bg-white shadow-[0_4px_12px_-2px_rgba(13,38,20,.2),inset_0_1px_0_rgba(255,255,255,.95)] ring-1 ring-black/5 transition-[transform,width] duration-[400ms] ease-[cubic-bezier(.34,1.4,.64,1)] motion-reduce:transition-none" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />}
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `relative z-10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-all duration-250 active:scale-95 ${isActive ? 'text-ink' : 'text-muted hover:text-ink hover:bg-white/40'}`}>
          <t.icon size={14} className="transition-transform duration-200 group-hover:scale-110" />{t.label}
          {t.badge > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-clay-500 px-1 text-[10.5px] font-bold text-white tabular shadow-sm">{lang === 'bn' ? String(t.badge).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : t.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AbroadLayout() {
  const { cc } = useParams();
  const c = ABROAD[cc];
  if (!c) return <Navigate to="/login" replace />;
  return <Shell key={cc} c={c} />;
}

function Shell({ c }) {
  const { T, L, s } = useStore();
  const { pathname } = useLocation();
  useScrollOnNavigate();
  const { data, error } = useCountry(c.id);
  const farm = data?.points.farm;
  const tz = data?.provenance.tz;
  const { fc, status } = useLiveForecast(farm?.lat, farm?.lon, tz);
  const board = useBoard(c.id);
  const { req, notices } = board;
  const officer = pathname.includes('/officer');
  const base = `/abroad/${c.id}`;
  const now = tz ? localNow(tz) : null;
  const alerts = data && now ? localAlerts(c.id, data, fc, now.date, c.local.sms) : [];
  const open = req.list.filter((r) => !r.reply).length;
  const tabs = officer
    ? [
      { to: `${base}/officer`, end: true, icon: LayoutDashboard, label: T('আজকের চিত্র', 'Overview') },
      { to: `${base}/officer/alerts`, icon: BellRing, label: T('এলাকার সতর্কতা', 'Area alerts'), badge: alerts.filter((a) => a.level !== 'info').length },
      { to: `${base}/officer/requests`, icon: LifeBuoy, label: T('কৃষকের অনুরোধ', 'Farmer requests'), badge: open },
      { to: `${base}/officer/farmer`, icon: UsersRound, label: T('কৃষক ও জমি', 'Farmer and field') },
      { to: `${base}/officer/map`, icon: MapIcon, label: T('এলাকার মানচিত্র', 'Area map') },
      { to: `${base}/officer/planting`, icon: CalendarRange, label: T('লাগানোর সময়', 'Planting calendar') },
      { to: `${base}/officer/country`, icon: Globe2, label: T('সারা দেশ', 'Whole country'), heading: true },
    ]
    : [
      { to: base, end: true, icon: Home, label: T('হোম', 'Home') },
      { to: `${base}/field`, icon: MapPinned, label: T('আমার জমি', 'My field') },
      { to: `${base}/plan`, icon: Sprout, label: T('মৌসুমের পরিকল্পনা', 'Season plan') },
      { to: `${base}/risks`, icon: ShieldAlert, label: T('বিপদ ও আগুন', 'Risks and fires') },
      { to: `${base}/future`, icon: Telescope, label: T('জমির ভবিষ্যৎ', 'Field future') },
      { to: `${base}/help`, icon: LifeBuoy, label: T('সাহায্য', 'Help'), badge: req.list.filter((r) => r.reply && !r.seen).length },
    ];
  const here = tabs.find((t) => (t.end ? pathname === t.to : pathname.startsWith(t.to)));
  return (
    <div className="relative min-h-screen overflow-x-clip bg-canvas">
      <SkipToMain />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-70 blur-3xl transition-colors duration-700" style={{ background: c.soft }} />
        <div className="absolute -right-32 top-1/3 h-[460px] w-[460px] rounded-full bg-primary-100/60 blur-3xl" />
      </div>
      <header className="glass-bar sticky top-0 z-40 border-b border-white/60 bg-white/60">
        <div className="page-shell flex h-[60px] items-center gap-2">
          <Link to="/login" className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-2.5 text-[14px] font-semibold text-muted transition hover:bg-white/70 hover:text-ink" aria-label={T('ফিরে যান', 'Back')}><ChevronLeft size={18} /><span className="hidden lg:inline">{T('বাংলাদেশ', 'Bangladesh')}</span></Link>
          <Link to="/" className="hidden xl:block" aria-label={T('প্রথম পাতা', 'Home')}><BrandMark /></Link>
          <nav className="hide-scrollbar mx-auto flex min-w-0 gap-0.5 overflow-x-auto rounded-full bg-white/55 p-1 ring-1 ring-white/70" aria-label={T('দেশ', 'Countries')}>
            {ABROAD_ORDER.map((id) => {
              const here = id === c.id;
              const suffix = pathname.replace(base, ''); // same tab in the other country
              return (
                <Link key={id} to={`/abroad/${id}${suffix}`} aria-current={here ? 'page' : undefined} className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold transition-all duration-250 active:scale-95 ${here ? 'bg-white text-ink shadow-[0_4px_14px_-3px_rgba(13,38,20,.25),inset_0_1px_0_rgba(255,255,255,.95)] scale-[1.02]' : 'text-muted hover:text-ink hover:bg-white/60 hover:scale-[1.01]'}`}>
                  <span aria-hidden="true">{ABROAD[id].flag}</span><span className="hidden sm:inline">{L(ABROAD[id].name)}</span>
                </Link>
              );
            })}
          </nav>
          <LangToggle glass />
        </div>
        <div className="page-shell flex items-center gap-2 pb-2">
          <div className="inline-flex shrink-0 rounded-full bg-white/55 p-1 ring-1 ring-white/70">
            {[[base, UserRound, T('কৃষক', 'Farmer'), !officer], [`${base}/officer`, Building2, T('কৃষি কর্মকর্তা', 'Officer'), officer]].map(([to, Icon, label, on]) => (
              <Link key={to} to={to} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-all duration-250 active:scale-95 ${on ? 'text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-white/50'}`} style={on ? { background: c.tone } : undefined}>
                <Icon size={14} />{label}
              </Link>
            ))}
          </div>
          <SlidingTabs tabs={tabs} lang={s.lang} label={officer ? T('কর্মকর্তার পাতা', 'Officer pages') : T('কৃষকের পাতা', 'Farmer pages')} />
        </div>
      </header>
      <main id="main" tabIndex={-1} key={pathname} className="page-enter relative z-10 scroll-mt-32 pb-16 pt-6 outline-none">
        <div>
          {error ? (
            <div className="page-shell rounded-2xl bg-white/70 p-6 text-[15px]">{T('এই দেশের তথ্য খোলা গেল না।', 'This country’s data could not be opened.')} <span className="text-muted">{String(error.message)}</span></div>
          ) : !data ? (
            <div className="page-shell animate-pulse space-y-4" aria-busy="true"><div className="h-56 rounded-[28px] bg-white/60" /><div className="h-32 rounded-[22px] bg-white/50" /><div className="h-64 rounded-[22px] bg-white/40" /></div>
          ) : (
            <>
              {/* The overview and whole-country pages carry their own big heading; every other tab gets one for screen readers. */}
              {here && here !== tabs[0] && !here.heading && <h1 className="sr-only">{L(c.name)} · {here.label}</h1>}
              <Outlet context={{ c, data, fc, status, now, alerts, req, notices, boardMode: board.mode }} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
