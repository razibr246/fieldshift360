import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Swords } from 'lucide-react';
import BrandMark from '../components/brand/BrandMark';
import { LangToggle, PlaceholderBanner } from '../components/chrome';
import { useStore } from '../store';
import { PageOutlet, ScrollProgress, scrollToEl, scrollToTop, useScrollOnNavigate } from '../components/Motion';

export const scrollToId = (id) => scrollToEl(document.getElementById(id), 0); // sections carry their own scroll margin for the header

const SECTIONS = ['how', 'land', 'data', 'officer'];
const GAME_PATHS = ['/games', '/play', '/farm', '/stories'];
const SPY_LINE = 140; // a section counts as "current" once its top passes this far below the top of the window

export default function PublicLayout() {
  const { T } = useStore();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [spy, setSpy] = useState(null);
  const lockUntil = useRef(0); // while a click-scroll glides, the spy holds still so the pill does not hop through sections

  // Header tightening plus scroll-spy: which home-page section is on screen now.
  useEffect(() => {
    const f = () => {
      setSolid(window.scrollY > 40);
      if (loc.pathname !== '/' || Date.now() < lockUntil.current) return;
      let cur = null;
      for (const id of SECTIONS) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= SPY_LINE) cur = id; }
      setSpy(cur);
    };
    // At most once per frame, however fast the scroll events arrive.
    let raf = 0;
    const onScrollEvt = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; f(); }); };
    f();
    window.addEventListener('scroll', onScrollEvt, { passive: true });
    return () => { window.removeEventListener('scroll', onScrollEvt); cancelAnimationFrame(raf); };
  }, [loc.pathname]);

  const nav = [['how', T('কীভাবে কাজ করে', 'How it works')], ['land', T('জমি বাছাই', 'Your field')], ['data', T('তথ্যের উৎস', 'Data')], ['officer', T('কৃষি কর্মকর্তা', 'Officers')]];
  const onGames = GAME_PATHS.some((p) => loc.pathname === p || loc.pathname.startsWith(`${p}/`));
  const active = onGames ? 'games' : loc.pathname === '/' ? spy : null;

  // Section links live on the home page; from another page, go home first and scroll once it has rendered.
  const go = (id) => {
    setOpen(false);
    setSpy(id);
    lockUntil.current = Date.now() + 1200;
    if (loc.pathname === '/') scrollToId(id);
    else navigate('/', { state: { section: id } });
  };
  useScrollOnNavigate({ skip: !!loc.state?.section });
  useEffect(() => {
    setOpen(false);
    const id = loc.state?.section;
    if (!id) return undefined;
    lockUntil.current = Date.now() + 1400;
    const t = setTimeout(() => scrollToId(id), 120); // give the home page a beat to render its sections
    return () => clearTimeout(t);
  }, [loc.pathname, loc.key, loc.state]);

  // The highlight on the glass follows the pointer (mouse and pen only), at most once per frame.
  const barRef = useRef(null);
  const glideRaf = useRef(0);
  const glide = (e) => {
    if (e.pointerType === 'touch') return;
    const el = barRef.current;
    const { clientX, clientY } = e;
    if (!el || glideRaf.current) return;
    glideRaf.current = requestAnimationFrame(() => {
      glideRaf.current = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${clientX - r.left}px`);
      el.style.setProperty('--my', `${clientY - r.top}px`);
      el.style.setProperty('--glow', '1');
    });
  };
  const unglide = () => barRef.current?.style.setProperty('--glow', '0');

  // The sliding pill: measured from the active item, it glides and stretches to the next one.
  const navRef = useRef(null);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => {
      const item = active && el.querySelector(`[data-nav="${active}"]`);
      setPill((p) => (item && item.offsetWidth
        ? { x: item.offsetLeft, y: item.offsetTop, w: item.offsetWidth, h: item.offsetHeight, on: true, glide: !!p?.on }
        : p && { ...p, on: false }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [active, T]);

  // The logo always lands on the top of the home page: from another page the route change scrolls up; on the home
  // page itself (where the address does not change) it glides up and clears the section highlight.
  const toTop = (e) => {
    setOpen(false);
    if (loc.pathname !== '/') return;
    e.preventDefault();
    lockUntil.current = Date.now() + 1200;
    setSpy(null);
    if (window.location.hash !== '#/') window.history.replaceState(null, '', '#/');
    scrollToTop(true);
  };
  // The phone menu closes on a tap outside it or on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!barRef.current?.parentElement?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const playLink = (cls, slide = false) => (
    <NavLink to="/games" data-nav={slide ? 'games' : undefined} onClick={() => setOpen(false)}
      className={`${cls} ${onGames ? (slide ? '!bg-transparent !text-white !ring-transparent' : 'bg-primary-700 !text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3)]') : ''}`}>
      <Swords size={16} />{T('খেলে শিখুন', 'Learn by playing')}
    </NavLink>
  );
  return (
    <div className="min-h-screen">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); scrollToId('main'); }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary-800 focus:px-4 focus:py-2.5 focus:text-white">{T('মূল অংশে যান', 'Skip to main content')}</a>
      {/* Floating Liquid Glass capsule: clear like a mirror at the top, frosted once the page scrolls. It only ever
          moves (transform), never changes size, so the shrink on scroll costs nothing. */}
      <header className="fixed inset-x-0 top-0 z-50 pt-3 sm:pt-4">
        <div className="page-shell">
          <div ref={barRef} onPointerMove={glide} onPointerLeave={unglide}
            className={`lg-bar flex h-[64px] items-center justify-between gap-3 rounded-[26px] pl-2.5 pr-2 sm:pl-3 ${solid || open ? 'is-solid' : ''}`}>
            <Link to="/" aria-label={T('প্রথম পাতা', 'Home')} onClick={toTop} className="shrink-0 whitespace-nowrap rounded-2xl"><BrandMark size={38} /></Link>
            <nav ref={navRef} className="relative hidden items-center gap-0.5 whitespace-nowrap xl:flex" aria-label={T('প্রধান', 'Main')}>
              {pill && (
                <span aria-hidden="true" className="nav-pill pointer-events-none absolute left-0 top-0 rounded-full"
                  style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h, opacity: pill.on ? 1 : 0, transitionProperty: pill.glide ? 'transform, width, height, opacity' : 'opacity' }} />
              )}
              {nav.map(([id, label]) => (
                <button key={id} type="button" data-nav={id} onClick={() => go(id)} aria-current={active === id ? 'true' : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors duration-300 ${active === id ? 'text-white' : 'text-ink/75 hover:bg-white/60 hover:text-primary-800 hover:shadow-[inset_0_1px_0_#fff,0_4px_12px_-6px_rgba(13,38,20,.25)]'}`}>{label}</button>
              ))}
              {playLink('relative ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary-600/10 px-3.5 py-2 text-[15px] font-semibold text-primary-800 ring-1 ring-primary-600/20 transition-colors duration-300 hover:bg-primary-600/20', true)}
            </nav>
            <div className="ml-auto hidden items-center gap-2 whitespace-nowrap sm:flex xl:ml-0">
              <span className="xl:hidden">{playLink('inline-flex items-center gap-1.5 rounded-full bg-primary-600/10 px-3.5 py-2 text-[15px] font-semibold text-primary-800 ring-1 ring-primary-600/20 transition hover:bg-primary-600/20')}</span>
              <LangToggle glass />
              <Link to="/login" className="btn-gloss inline-flex h-10 items-center rounded-full px-5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97] shadow-sm">{T('শুরু করুন', 'Get started')}</Link>
            </div>
            <button type="button" onClick={() => setOpen(!open)} className="glass-pill grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95 xl:hidden" aria-label={T('মেনু', 'Menu')} aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
          <div className={`grid transition-[grid-template-rows,opacity] duration-[500ms] ease-[cubic-bezier(.34,1.4,.64,1)] xl:hidden ${open ? 'mt-2 grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}>
            <div className="-mx-3 overflow-hidden px-3 pb-6">
              <div className="glass ml-auto flex max-w-md flex-col gap-1 rounded-[24px] border border-white/60 !bg-white/90 p-2.5 shadow-xl backdrop-blur-xl">
                {playLink('flex items-center gap-2 rounded-2xl bg-primary-600/10 px-3.5 py-3 text-[15.5px] font-semibold text-primary-800 transition-all active:scale-[0.98]')}
                {nav.map(([id, label], i) => (
                  <button key={id} type="button" onClick={() => go(id)} aria-current={active === id ? 'true' : undefined}
                    style={{ animation: open ? 'page-in 0.35s var(--ease-spring) both' : 'none', animationDelay: `${i * 45}ms` }}
                    className={`rounded-2xl px-3.5 py-3 text-left text-[15.5px] font-semibold transition-all duration-200 active:scale-[0.98] ${active === id ? 'bg-primary-700 text-white shadow-sm' : 'hover:bg-white/80'}`}>{label}</button>
                ))}
                <div className="mt-1 flex gap-2 sm:hidden"><LangToggle glass /><Link to="/login" className="btn-gloss inline-flex h-10 flex-1 items-center justify-center rounded-full text-[15px] font-semibold text-white active:scale-95">{T('শুরু করুন', 'Get started')}</Link></div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <ScrollProgress />
      <main id="main" tabIndex={-1} className="outline-none"><PageOutlet /></main>
      <div className="fixed inset-x-0 bottom-0 z-40"><PlaceholderBanner /></div>
    </div>
  );
}
