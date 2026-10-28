// Smoother long pages: a sticky bar of section pills that docks under the header on a solid strip, follows the scroll
// (the current section's pill is highlighted by a sliding thumb and kept in view) and glides to a section on tap; charts that mount only as they near the screen;
// a shimmering placeholder while data loads; and a back-to-top button.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { onScroll, pageTop, scrollToEl, scrollToTop } from './Motion';

// The bar docks right under the layout's sticky header, whatever its height (the farmer header has a second row of
// tabs and is taller than the officer one; on phones it changes again). The height is measured and kept in the CSS
// variable --app-header, which the bar's `top` reads, so it never slides under the header.
let HEADER = 64;
function useHeaderHeight() {
  // The page's sticky or fixed header, found by its class and measured by a ResizeObserver (which reports the size
  // the browser has already worked out), so opening a long page does not force a layout before it first paints.
  useEffect(() => {
    const el = document.querySelector('header.sticky, header.fixed');
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const h = Math.round(e.borderBoxSize?.[0]?.blockSize ?? el.getBoundingClientRect().height);
      if (h !== HEADER) { HEADER = h; document.documentElement.style.setProperty('--app-header', `${h}px`); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
}

export function SectionNav({ sections, label }) {
  useHeaderHeight();
  const [active, setActive] = useState(sections[0]?.id);
  const nav = useRef(null);
  const bar = useRef(null);
  const [thumb, setThumb] = useState(null);
  const [stuck, setStuck] = useState(false);
  // While a tap's scroll is on its way, the highlight stays on the tapped section instead of stepping through every
  // section the page passes; the lock lifts when the scroll ends or the reader takes over.
  const lock = useRef(null);
  const lockHandlers = useRef(null);
  const landAt = () => HEADER + (nav.current?.offsetHeight ?? 64) + 12; // where a section's top lands, under the bar

  // Pages pass a fresh array on every render; the spy only needs to start again when the sections themselves change.
  const secs = useRef(sections);
  secs.current = sections;
  const ids = sections.map((x) => x.id).join('|');
  useEffect(() => {
    const spy = () => {
      const sections = secs.current;
      const docked = !!nav.current && nav.current.getBoundingClientRect().top <= HEADER + 0.5;
      setStuck((p) => (p === docked ? p : docked));
      if (lock.current) return;
      const line = landAt() + 24;
      let cur = sections[0]?.id;
      for (const s of sections) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top - line <= 0) cur = s.id; }
      // At the very bottom the last section is the current one, even when it is too short to reach the line.
      const root = document.documentElement;
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= root.scrollHeight - 2) cur = sections[sections.length - 1]?.id;
      setActive((p) => (p === cur ? p : cur));
    };
    // first look on the next frame, not in the middle of React's commit (measuring here forces a layout of the page)
    const first = requestAnimationFrame(spy);
    const off = onScroll(spy);
    return () => { cancelAnimationFrame(first); off(); };
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lift the lock when the glide ends (or after a moment, where scrollend is not supported). If content that loaded on
  // the way moved the section, glide on to it first (up to three times, as charts mount), keeping the lock throughout.
  // The reader scrolling themselves lifts it straight away.
  useEffect(() => {
    let timer = 0, tries = 0;
    const fallback = 'onscrollend' in window ? 3000 : 1200; // only matters where scrollend never comes
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => release(true), fallback); };
    const release = (correct) => {
      const l = lock.current;
      if (!l) return;
      const el = document.getElementById(l);
      // A section near the end may be unable to reach the line (the page runs out): aim no further than the bottom.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const to = el ? Math.max(0, Math.min(max, pageTop(el) - landAt())) : window.scrollY;
      if (correct && tries < 3 && Math.abs(to - window.scrollY) > 6) {
        tries += 1;
        window.scrollTo({ top: to, behavior: 'smooth' });
        arm();
        return;
      }
      // The tapped section stays highlighted until the reader scrolls on.
      lock.current = null; tries = 0; clearTimeout(timer);
    };
    const onEnd = () => release(true);
    const onUser = () => release(false);
    lockHandlers.current = { start: () => { tries = 0; arm(); } };
    window.addEventListener('scrollend', onEnd);
    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchstart', onUser, { passive: true });
    window.addEventListener('keydown', onUser);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scrollend', onEnd);
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchstart', onUser);
      window.removeEventListener('keydown', onUser);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    lock.current = id;
    lockHandlers.current?.start();
    scrollToEl(el, -landAt() + (parseFloat(getComputedStyle(el).scrollMarginTop) || 0));
  };

  useLayoutEffect(() => {
    const b = bar.current?.querySelector(`[data-id="${active}"]`);
    if (!b) return;
    setThumb((p) => ({ x: b.offsetLeft, w: b.offsetWidth, glide: !!p }));
    const box = bar.current, left = b.offsetLeft - 16, right = b.offsetLeft + b.offsetWidth + 16;
    if (left < box.scrollLeft || right > box.scrollLeft + box.clientWidth) box.scrollTo({ left: left - box.clientWidth / 3, behavior: 'smooth' });
  }, [active]);
  return (
    <nav ref={nav} aria-label={label} data-stuck={stuck || undefined} className="section-nav sticky top-[var(--app-header,64px)] z-[25] -mt-2.5 mb-3.5 py-2.5">
      <div ref={bar} className="section-nav-glass hide-scrollbar flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {thumb && <span aria-hidden="true" className="section-nav-thumb absolute top-1.5 bottom-1.5 rounded-xl" style={{ left: thumb.x, width: thumb.w, transition: thumb.glide ? 'left .35s var(--ease-spring), width .35s var(--ease-spring)' : 'none' }} />}
        {sections.map((s) => (
          <button key={s.id} data-id={s.id} type="button" aria-current={active === s.id ? 'true' : undefined} onClick={() => go(s.id)}
            className={`relative z-10 shrink-0 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-95 ${active === s.id ? 'text-white font-bold' : 'text-ink/75 hover:bg-black/[.05] hover:text-ink'}`}>
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Renders children once they come within ~600 px of the screen; until then holds their height with a placeholder.
// `id`: the id the section inside will carry, put on the placeholder until then, so a SectionNav pill can glide to a
// section that has not mounted yet (the nav re-aims once it has).
// `idle`: for something heavy to start (a WebGL map): also wait until the browser has a quiet moment after the page
// has painted, so opening the page is not held up by it.
export function LazyMount({ height = 200, children, className = '', id, idle = false }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (on) return undefined;
    let io = null, h = 0;
    const go = () => {
      if (!idle) { setOn(true); return; }
      const ric = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 300));
      h = ric(() => setOn(true), { timeout: 1500 });
    };
    if (!('IntersectionObserver' in window)) { go(); return undefined; }
    io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '600px 0px' });
    if (ref.current) io.observe(ref.current);
    return () => { io?.disconnect(); if (h) (window.cancelIdleCallback ?? clearTimeout)(h); };
  }, [on, idle]);
  return <div ref={ref} id={on ? undefined : id} className={`${className} ${on ? '' : 'scroll-mt-40'}`} style={on ? undefined : { minHeight: height }}>{on ? <div className="swap-in">{children}</div> : <Skeleton height={height} className="mt-5" />}</div>;
}

export function Skeleton({ height = 160, className = '' }) {
  return <div aria-hidden="true" className={`skeleton rounded-2xl ${className}`} style={{ height }} />;
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => onScroll((y) => setShow((p) => (p === y > 900 ? p : y > 900))), []);
  return (
    <button type="button" onClick={() => scrollToTop(true)} aria-label="Back to top"
      className={`fixed bottom-24 right-5 z-40 grid h-11 w-11 place-items-center rounded-full bg-primary-800 text-white shadow-[0_12px_28px_-6px_rgba(36,90,40,0.6)] transition-all duration-400 ease-[cubic-bezier(.34,1.4,.64,1)] hover:bg-primary-700 hover:scale-110 active:scale-90 lg:bottom-8 ${show ? 'translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-6 opacity-0 scale-75'}`}>
      <ArrowUp size={18} />
    </button>
  );
}
