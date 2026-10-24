import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PageOutlet, ScrollProgress, useScrollOnNavigate } from '../components/Motion';
import { BackToTop } from '../components/SectionNav';
import { Bell, Menu, Search, X, LayoutDashboard, LifeBuoy, UsersRound, Map as MapIcon, BellRing, CalendarRange, Building2, Truck, UserRound, Mic, Radar as RadarIcon } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import { LangToggle, PlaceholderBanner, DataStatusChips, ResetDemo, BackButton } from '../components/chrome';
import { useStore } from '../store';
import { num } from '../engine/dates';
import { unionsOf } from '../data/demo';

// The white highlight behind the current page's link glides from item to item instead of jumping.
function useNavThumb(navRef, deps) {
  const [thumb, setThumb] = useState(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const measure = () => {
      const a = nav.querySelector('a[aria-current="page"]');
      if (!a) { setThumb(null); return; }
      const top = a.getBoundingClientRect().top - nav.getBoundingClientRect().top;
      setThumb((p) => ({ top, h: a.offsetHeight, glide: !!p }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return thumb;
}

function Sidebar({ onNavigate }) {
  const { s, dispatch, T, L, hotspots, officerUpazila: upz } = useStore();
  const navRef = useRef(null);
  const { pathname } = useLocation();
  const thumb = useNavThumb(navRef, [pathname, s.lang]);
  const areas = unionsOf(upz.id);
  const open = s.requests.filter((r) => r.status === 'open' && r.union === s.officerUnion).length;
  const alerts = hotspots.filter((h) => h.members.some((m) => m.union === s.officerUnion)).length;
  // Ordered by the officer's day: today's tasks, the selected union, then the season's planning in crop-cycle order
  // (Ropan Radar: rain and Aman planting, then Rabi planting and prices, then harvest), and the whole-upazila overview last.
  const groups = [
    { title: T('আজকের কাজ', 'Today’s work'), items: [
      { to: '/officer', end: true, icon: LayoutDashboard, label: T('আজকের চিত্র', 'Overview') },
      { to: '/officer/alerts', icon: BellRing, label: T('এলাকার সতর্কতা', 'Area alerts'), badge: alerts, hot: true },
      { to: '/officer/requests', icon: LifeBuoy, label: T('কৃষকের অনুরোধ', 'Farmer requests'), badge: open },
    ] },
    { title: T('আমার এলাকা', 'My area'), items: [
      { to: '/officer/farmers', icon: UsersRound, label: T('কৃষক ও জমি', 'Farmers and fields') },
      { to: '/officer/map', icon: MapIcon, label: T('এলাকার মানচিত্র', 'Area map') },
    ] },
    { title: T('মৌসুমের পরিকল্পনা', 'Season planning'), items: [
      { to: '/officer/radar', icon: RadarIcon, label: T('রোপণ রাডার', 'Ropan Radar') },
      { to: '/officer/planting', icon: CalendarRange, label: T('লাগানোর সময় ও দাম', 'Planting and prices') },
      { to: '/officer/supply', icon: Truck, label: T('কবে কত ফসল উঠবে', 'Harvest timing') },
    ] },
    { title: T('পুরো উপজেলা', 'Whole upazila'), items: [
      { to: '/officer/upazila', icon: Building2, label: T('উপজেলার সার্বিক চিত্র', 'Upazila overview') },
    ] },
    { title: T('সহায়তা', 'Help'), items: [
      { to: '/officer/voice', icon: Mic, label: T('ভয়েস সহকারী', 'Voice assistant') },
    ] },
  ];
  return (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain bg-[#163020] text-white shadow-[inset_-1px_0_0_rgba(255,255,255,.08)]">
      <div className="border-b border-white/10 p-5"><Link to="/" onClick={onNavigate}><BrandMark inverse /></Link></div>
      <div className="p-4">
        <div className="rounded-2xl bg-white/[.07] p-4">
          <div className="text-[12.5px] text-primary-200">{T('উপজেলা কৃষি অফিসার', 'Upazila agriculture officer')}</div>
          <div className="mt-0.5 text-[16px] font-bold">{L(upz.officer)}</div>
          <div className="mt-0.5 text-[13px] text-primary-200">{T(`${upz.name.bn} উপজেলা, ${upz.district.bn} জেলা, ${upz.division.bn} বিভাগ`, `${upz.name.en} upazila, ${upz.district.en} district, ${upz.division.en} division`)}</div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[12px] text-primary-300">{T('কোন ইউনিয়ন বা পৌরসভা দেখবেন', 'Union or municipality to look at')}</span>
            <select value={s.officerUnion} onChange={(e) => dispatch({ type: 'set', patch: { officerUnion: e.target.value } })}
              className="w-full rounded-xl border border-white/15 bg-primary-950 px-2.5 py-2 text-[14px] font-semibold text-white">
              <optgroup label={T(`ইউনিয়ন (${num(areas.filter((u) => u.kind === 'union').length, 'bn')})`, 'Unions')}>
                {areas.filter((u) => u.kind === 'union').map((u) => <option key={u.id} value={u.id}>{T(u.full.bn, u.full.en)}</option>)}
              </optgroup>
              <optgroup label={T('পৌরসভা (ওয়ার্ডে ভাগ)', 'Municipalities (in wards)')}>
                {areas.filter((u) => u.kind === 'pourashava').map((u) => <option key={u.id} value={u.id}>{T(u.full.bn, u.full.en)}</option>)}
              </optgroup>
            </select>
          </label>
          <div className="mt-2 text-[12px] text-primary-300">{T('নমুনা অ্যাকাউন্ট', 'Sample account')}</div>
        </div>
      </div>
      <nav ref={navRef} className="relative space-y-4 px-3 pb-4" aria-label={T('কর্মকর্তার পাতা', 'Officer pages')}>
        {thumb && <span aria-hidden="true" className="nav-thumb pointer-events-none absolute inset-x-3 top-0 rounded-xl bg-white shadow-[inset_0_1px_0_#fff,0_6px_18px_-8px_rgba(0,0,0,.5)]" style={{ transform: `translateY(${thumb.top}px)`, height: thumb.h, transitionDuration: thumb.glide ? undefined : '0s' }} />}
        {groups.map((g) => (
          <div key={g.title} className="space-y-0.5">
            <div className="px-3 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-primary-300">{g.title}</div>
            {g.items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate}
                className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold transition-all duration-200 active:scale-[0.98] ${isActive ? `text-primary-950 font-bold ${thumb ? '' : 'bg-white shadow-sm'}` : 'text-primary-100 hover:bg-white/[.08] hover:text-white'}`}>
                <n.icon size={18} className="transition-transform duration-200 group-hover:scale-110" /><span className="flex-1">{n.label}</span>
                {n.badge > 0 && <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${n.hot ? 'pulse-ring bg-red-600 text-white shadow-sm' : 'bg-paddy-700 text-white'}`}>{n.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-1 border-t border-white/10 p-3">
        <Link to="/farmer" onClick={onNavigate} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-semibold text-primary-100 hover:bg-white/[.07]"><UserRound size={16} />{T('কৃষকের পাতায় যান', 'Go to the farmer view')}</Link>
        <ResetDemo dark className="w-full" />
        <div className="px-1 pt-1"><DataStatusChips dark /></div>
      </div>
    </div>
  );
}

export default function OfficerLayout() {
  const { s, T, L, officerUpazila: upz } = useStore();
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const loc = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  useScrollOnNavigate();
  useEffect(() => { setDrawer(false); }, [loc.pathname]);
  // "/" jumps to the farmer search from anywhere (unless you are already typing).
  useEffect(() => {
    const k = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (!searchRef.current?.offsetParent) return;
      e.preventDefault(); searchRef.current.focus();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    if (!drawer) return undefined;
    const k = (e) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [drawer]);
  const open = s.requests.filter((r) => r.status === 'open' && r.union === s.officerUnion).length;
  const name = L(upz.officer);
  const search = (e) => { e.preventDefault(); navigate(`/officer/farmers?q=${encodeURIComponent(q.trim())}`); };
  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 lg:block"><Sidebar /></aside>
      {drawer && (
        <div className="fixed inset-0 z-[1500] lg:hidden" role="dialog" aria-modal="true" aria-label={T('মেনু', 'Menu')}>
          <div className="sheet-fade absolute inset-0 bg-primary-950/50 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div className="drawer-in absolute inset-y-0 left-0 w-[290px] max-w-[86vw] shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} className="absolute right-3 top-5 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white" aria-label={T('বন্ধ করুন', 'Close')}><X size={18} /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="glass-bar sticky top-0 z-30">
          <div className="flex h-[64px] items-center gap-2.5 px-4 sm:px-6">
            <button type="button" onClick={() => setDrawer(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden" aria-label={T('মেনু খুলুন', 'Open menu')}><Menu size={19} /></button>
            <BackButton />
            <form onSubmit={search} className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-black/[.05] px-3 transition-all duration-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/25 focus-within:shadow-sm md:flex" role="search">
              <Search size={17} className="text-muted transition-colors duration-200 group-focus-within:text-primary-600" />
              <input ref={searchRef} type="search" aria-label={T('কৃষক বা গ্রামের নাম খুঁজুন', 'Search a farmer or village')} value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full bg-transparent text-[14.5px] outline-none" placeholder={T('কৃষক বা গ্রামের নাম খুঁজুন', 'Search a farmer or village')} aria-label={T('খুঁজুন', 'Search')} aria-keyshortcuts="/" />
              <kbd className="hidden shrink-0 rounded-md border border-border bg-white/70 px-1.5 text-[11.5px] font-semibold text-muted shadow-2xs lg:inline" aria-hidden="true">/</kbd>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => navigate('/officer/requests')}
                className={`relative grid h-10 w-10 place-items-center rounded-xl border bg-white transition-all duration-200 hover:scale-105 active:scale-95 ${open > 0 ? 'border-amber-200 text-amber-700 shadow-[0_0_12px_rgba(208,143,38,0.25)] hover:bg-amber-50/50' : 'border-border text-ink hover:bg-primary-50'}`}
                aria-label={T(`খোলা অনুরোধ ${open}টি`, `${open} open requests`)}>
                <Bell size={18} />
                {open > 0 && <span className="pulse-ring absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-600 px-1 text-[11px] font-bold text-white shadow-sm">{open}</span>}
              </button>
              <LangToggle />
              <div className="hidden text-right sm:block">
                <div className="text-[14px] font-bold">{name}</div>
                <div className="text-[12px] text-muted">{T(`উপজেলা কৃষি অফিসার, ${upz.name.bn}`, `Upazila agriculture officer, ${upz.name.en}`)}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-100 font-bold text-primary-800">{name.slice(0, 1)}</div>
            </div>
          </div>
        </header>
        <PlaceholderBanner />
        {/* Switching union re-plays a soft fade, so the change of data reads as a change, not a flicker. */}
        <main className="mx-auto max-w-[1280px] p-4 sm:p-6 lg:p-8"><div key={s.officerUnion} className="union-fade"><PageOutlet /></div></main>
        <ScrollProgress />
        <BackToTop />
      </div>
    </div>
  );
}
