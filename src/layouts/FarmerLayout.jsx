import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { PageOutlet, useScrollOnNavigate } from '../components/Motion';
import { Bell, ChevronDown, Home, ScanLine, Sprout, Droplets, LifeBuoy, Wheat, Telescope, MapPinned, Ellipsis, X, Mic, UserRound, LogOut, MessageSquareText } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import { LangToggle, PlaceholderBanner, ResetDemo, BackButton } from '../components/chrome';
import MessagePopup from '../components/MessagePopup';
import { useStore, demo } from '../store';
import { IRRIGATION, cropName } from '../engine/crops';
import { num, bnDigits } from '../engine/dates';
import FarmerAvatar from '../components/brand/FarmerAvatar';

export function useFarmerNav() {
  const { T } = useStore();
  return [
    { to: '/farmer', end: true, icon: Home, label: T('হোম', 'Home') },
    { to: '/farmer/farm', icon: MapPinned, label: T('আমার জমি', 'My field') },
    { to: '/farmer/plan', icon: Sprout, label: T('মৌসুমের পরিকল্পনা', 'Season plan'), mid: T('পরিকল্পনা', 'Season plan'), short: T('পরিকল্পনা', 'Plan') },
    { to: '/farmer/future', icon: Telescope, label: T('জমির ভবিষ্যৎ', 'Field future'), short: T('ভবিষ্যৎ', 'Future') },
    { to: '/farmer/today', icon: Droplets, label: T('আজকের কাজ', 'Today'), short: T('আজ', 'Today') },
    { to: '/farmer/voice', icon: Mic, label: T('কথা বলে জানুন', 'Ask by voice'), short: T('ভয়েস', 'Voice') },
    { to: '/farmer/sms', icon: MessageSquareText, label: T('এসএমএসে', 'By SMS'), short: T('এসএমএস', 'SMS') },
    { to: '/farmer/doctor', icon: ScanLine, label: T('ফসলের ডাক্তার', 'Crop doctor'), short: T('ডাক্তার', 'Doctor') },
    { to: '/farmer/help', icon: LifeBuoy, label: T('সাহায্য', 'Help') },
    { to: '/farmer/harvest', icon: Wheat, label: T('ফসল তোলা ও বিক্রি', 'Harvest'), mid: T('ফসল তোলা', 'Harvest'), short: T('ফসল তোলা', 'Harvest') },
  ];
}

// The signed-in farmer's own account: who they are, where, their land and officer, and links to their pages.
function AccountMenu() {
  const { s, L, T, farmer, profile, upazila } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const loc = useLocation();
  const u = demo.unions.find((x) => x.id === farmer.union);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const k = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, []);
  const facts = [
    [T('জমি', 'Field'), T(`${num(farmer.area_dec / 33, 'bn', { dp: 1 })} বিঘা`, `${num(farmer.area_dec / 33, 'en', { dp: 1 })} bigha`)],
    [T('গতবার', 'Last Rabi'), cropName(farmer.last_crop, s.lang)],
    [T('সেচ', 'Water'), L(IRRIGATION[farmer.irrigation])],
    [T('কর্মকর্তা', 'Officer'), L(upazila.officer)],
  ];
  const links = [
    { to: '/farmer/profile', icon: UserRound, label: T('আমার প্রোফাইল', 'My profile') },
    { to: '/farmer/farm', icon: MapPinned, label: T('আমার জমি', 'My field') },
    { to: '/farmer/help', icon: LifeBuoy, label: T('আমার অনুরোধ', 'My requests') },
  ];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-2 text-left hover:bg-primary-50" aria-haspopup="menu" aria-expanded={open} aria-label={T('আমার অ্যাকাউন্ট', 'My account')}>
        <FarmerAvatar id={farmer.id} size={28} rounded="rounded-lg" fallback={<span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-100 text-[14px] font-bold text-primary-800">{L(farmer.name).slice(0, 1)}</span>} />
        <span className="hidden leading-tight md:block">
          <span className="block max-w-[130px] truncate text-[14px] font-bold">{L(farmer.name)}</span>
          <span className="block text-[11.5px] text-muted">{L(u)}, {L(upazila.name)}</span>
        </span>
        <ChevronDown size={15} className="text-muted" />
      </button>
      {open && (
        <div className="menu-pop absolute right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-white p-2 shadow-[var(--shadow-lift)]" role="menu">
          <div className="flex items-start gap-3 rounded-xl bg-primary-50 p-3">
            <FarmerAvatar id={farmer.id} size={44} fallback={<span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-[18px] font-bold text-primary-800">{L(farmer.name).slice(0, 1)}</span>} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold leading-tight">{L(farmer.name)}</span>
              <span className="mt-0.5 block text-[12.5px] text-muted">{profile.mobile ? (s.lang === 'bn' ? bnDigits(profile.mobile) : profile.mobile) : T('মোবাইল নম্বর দেওয়া হয়নি', 'No mobile number yet')}</span>
              <span className="mt-1 block text-[12.5px] leading-5 text-primary-800">{T(`গ্রাম ${farmer.villageBn}, ${u.full.bn}, ${upazila.name.bn} উপজেলা, ${upazila.district.bn} জেলা, ${upazila.division.bn} বিভাগ`, `${farmer.village} village, ${u.full.en}, ${upazila.name.en} upazila, ${upazila.district.en} district, ${upazila.division.en} division`)}</span>
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-3 text-[13px]">
            {facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-muted">{k}</dt><dd className="truncate font-semibold text-ink">{v}</dd></div>)}
          </dl>
          <div className="border-t border-border pt-1.5">
            {links.map((n) => (
              <Link key={n.to} to={n.to} role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold text-ink hover:bg-primary-50"><n.icon size={17} className="text-primary-600" />{n.label}</Link>
            ))}
          </div>
          <div className="mt-1 border-t border-border pt-1.5">
            <Link to="/login" role="menuitem" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-muted hover:bg-primary-50 hover:text-ink"><LogOut size={17} />{T('অন্য অ্যাকাউন্টে ঢুকুন', 'Switch account')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MoreSheet({ items, onClose }) {
  const { T } = useStore();
  return (
    <div className="fixed inset-0 z-[1500] lg:hidden" role="dialog" aria-modal="true" aria-label={T('আরও', 'More')}>
      <div className="sheet-fade absolute inset-0 bg-primary-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-up glass absolute inset-x-2 bottom-2 rounded-[28px] !bg-white/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center justify-between"><span className="font-display text-[18px] font-bold">{T('আরও', 'More')}</span><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-black/5" aria-label={T('বন্ধ করুন', 'Close')}><X size={18} /></button></div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl border px-3 py-3 text-[15px] font-semibold ${isActive ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-border'}`}><n.icon size={19} />{n.label}</NavLink>
          ))}
          <Link to="/farmer/profile" onClick={onClose} className="col-span-2 flex items-center gap-2.5 rounded-xl bg-primary-950 px-3 py-3 text-[15px] font-semibold text-white"><UserRound size={19} />{T('আমার প্রোফাইল', 'My profile')}</Link>
        </div>
        <div className="mt-3 flex justify-center"><ResetDemo /></div>
      </div>
    </div>
  );
}

export default function FarmerLayout() {
  const { s, T, unreadAdvisories } = useStore();
  const nav = useFarmerNav();
  const loc = useLocation();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  useScrollOnNavigate();
  // The current page's tab sits on a glossy green pill that glides to the next tab on a spring (as on the home page).
  const tabs = useRef(null);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = tabs.current?.querySelector('a[aria-current="page"]');
      setPill((p) => (a ? { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight, glide: !!p?.on, on: true } : p && { ...p, on: false }));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [loc.pathname, s.lang]);
  useEffect(() => { setMore(false); }, [loc.pathname]);
  const bottom = [nav[0], nav[2], nav[3], nav[4]];
  const rest = nav.filter((n) => !bottom.some((b) => b.to === n.to));
  const restActive = rest.some((n) => loc.pathname.startsWith(n.to));
  return (
    <div className="min-h-screen">
      <MessagePopup />
      <header className="glass-bar sticky top-0 z-40">
        <div className="page-shell flex h-[64px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <BackButton />
            <Link to="/" aria-label={T('প্রথম পাতা', 'Home page')} className="shrink-0"><span className="hidden sm:block"><BrandMark /></span><span className="sm:hidden"><BrandMark compact size={38} /></span></Link>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/farmer/help')}
              className={`relative grid h-10 w-10 place-items-center rounded-xl border bg-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs ${unreadAdvisories > 0 ? 'border-red-200 text-red-600 shadow-[0_0_14px_rgba(220,38,38,0.25)] hover:bg-red-50/50' : 'border-border text-ink/75 hover:bg-primary-50'}`}
              aria-label={unreadAdvisories ? T(`কর্মকর্তার ${num(unreadAdvisories, 'bn')}টি নতুন বার্তা`, `${unreadAdvisories} new messages from your officer`) : T('কর্মকর্তার বার্তা', 'Messages from your officer')}>
              <Bell size={18} className={unreadAdvisories > 0 ? 'animate-[drift_3s_ease-in-out_infinite]' : ''} />
              {unreadAdvisories > 0 && (
                <span className="pulse-ring absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-sm">
                  {T(num(unreadAdvisories, 'bn'), String(unreadAdvisories))}
                </span>
              )}
            </button>
            <AccountMenu />
            <LangToggle />
            <NavLink to="/farmer/profile" className={({ isActive }) => `hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[14px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] lg:inline-flex ${isActive ? 'bg-primary-700 shadow-sm' : 'bg-primary-950 hover:bg-primary-900 shadow-2xs'}`}><UserRound size={16} />{T('আমার প্রোফাইল', 'My profile')}</NavLink>
          </div>
        </div>
        <nav className="hidden border-t border-border lg:block" aria-label={T('কৃষকের পাতা', 'Farmer pages')}>
          <div ref={tabs} className="page-shell hide-scrollbar relative flex gap-1 overflow-x-auto py-1">
            {pill && (
              <span aria-hidden="true" className="nav-pill pointer-events-none absolute left-0 top-0 rounded-xl"
                style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h, opacity: pill.on ? 1 : 0, transitionProperty: pill.glide ? 'transform, width, height, opacity' : 'opacity' }} />
            )}
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `group relative isolate flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[14px] font-semibold transition-[background-color,color,box-shadow,transform] duration-250 ease-[var(--ease-smooth)] active:scale-[.98] ${isActive ? 'text-white' : 'text-ink/70 hover:bg-primary-50/65 hover:text-primary-800'}`}>
                {({ isActive }) => (
                  <>
                    <n.icon size={16} className={`transition-transform duration-300 ease-[var(--ease-spring)] ${isActive ? 'text-paddy-300' : 'group-hover:scale-110'}`} />
                    {/* ten pages in a 1200 px row: the short names on smaller laptops, the two longest shortened above */}
                    <span className="xl:hidden">{n.short ?? n.label}</span>
                    <span className="hidden xl:inline">{n.mid ?? n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <PlaceholderBanner />
      <main className="page-shell relative py-6 pb-32 lg:py-8 lg:pb-14"><PageOutlet /></main>
      <footer className="hidden border-t border-border lg:block">
        <div className="page-shell flex items-center justify-between py-4 text-[13px] text-muted">
          <span>{T('সব সুপারিশ সিদ্ধান্ত নিতে সাহায্যের জন্য। চূড়ান্ত সিদ্ধান্তের আগে কৃষি কর্মকর্তার সঙ্গে কথা বলুন।', 'Recommendations help you decide. Talk to your agriculture officer before you commit.')}</span>
          <ResetDemo />
        </div>
      </footer>
      <nav className="fixed inset-x-3 bottom-0 z-50 lg:hidden" style={{ paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))' }} aria-label={T('কৃষকের পাতা', 'Farmer pages')}>
        <div className="glass mx-auto grid max-w-lg grid-cols-5 rounded-[28px] border border-white/70 px-1.5 py-1.5 shadow-[0_16px_40px_-10px_rgba(13,38,20,0.38)] backdrop-blur-xl">
          {bottom.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-[22px] py-1 text-[11.5px] font-semibold transition-all duration-200 active:scale-95 ${isActive ? 'text-primary-950 font-bold' : 'text-ink/70 hover:text-ink'}`}>
              {({ isActive }) => (<><span className={`grid h-7 w-12 place-items-center rounded-full transition-all duration-350 ease-[cubic-bezier(.34,1.4,.64,1)] ${isActive ? 'scale-110 bg-primary-600/20 text-primary-800 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_8px_-2px_rgba(67,134,58,0.35)]' : 'scale-100'}`}><n.icon size={19} /></span><span>{n.short ?? n.label}</span></>)}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMore(true)} className={`relative flex flex-col items-center gap-0.5 rounded-[22px] py-1 text-[11.5px] font-semibold transition-all duration-200 active:scale-95 ${restActive ? 'text-primary-950 font-bold' : 'text-ink/70 hover:text-ink'}`} aria-haspopup="dialog">
            <span className={`grid h-7 w-12 place-items-center rounded-full transition-all duration-350 ease-[cubic-bezier(.34,1.4,.64,1)] ${restActive ? 'scale-110 bg-primary-600/20 text-primary-800 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_2px_8px_-2px_rgba(67,134,58,0.35)]' : 'scale-100'}`}><Ellipsis size={19} /></span>
            <span>{T('আরও', 'More')}</span>
            {unreadAdvisories > 0 && <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />}
          </button>
        </div>
      </nav>
      {more && <MoreSheet items={rest} onClose={() => setMore(false)} />}
    </div>
  );
}
