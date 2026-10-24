// Site-wide motion.
// 1. Scrolling is the browser's own: it follows the wheel, trackpad and finger with no added delay, and runs on the
//    compositor thread even while a page is busy. (A JavaScript smooth-scroller made every scroll trail the input.)
//    Programmatic scrolls use the browser's smooth scrolling.
// 2. Scroll reveals: anything marked data-reveal rises in as it nears the screen; on app pages, cards and sections that
//    start below the fold are marked automatically. Content already on screen when a page opens is never hidden, so
//    nothing flickers, and without JavaScript (or with reduced motion) everything simply shows.
// 3. Page transitions: each routed page eases in quickly when the address changes.
// 4. Back and Forward return to where you were on the page; a new page opens at the top.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const smoothOr = (smooth) => (smooth && !reducedMotion() ? 'smooth' : 'instant');

// Scroll helpers used everywhere instead of window.scrollTo.
export function scrollToTop(smooth = false) {
  window.scrollTo({ top: 0, behavior: smoothOr(smooth) });
}
// An element's place in the page from its layout box, ignoring transforms: a card still waiting to rise into view
// sits a few pixels low, and measuring that would make the glide land short and then nudge.
export function pageTop(el) {
  let y = 0;
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
  return y;
}
export function scrollToEl(el, offset = -96) {
  if (!el) return;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  window.scrollTo({ top: pageTop(el) + offset - margin, behavior: smoothOr(true) });
}
// Subscribe to the scroll position, at most once per frame however fast the events arrive.
export function onScroll(fn) {
  let raf = 0;
  const h = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(window.scrollY); }); };
  window.addEventListener('scroll', h, { passive: true });
  return () => { window.removeEventListener('scroll', h); cancelAnimationFrame(raf); };
}

// Where each visited page was scrolled to, by history entry, so Back and Forward land where you left off. One listener
// files every scroll under the entry on screen; the entry switches in the same commit that swaps the page, before the
// browser can report the jump caused by the new page's height, so an old entry's position is never overwritten.
const SAVED = new Map();
let current = null;
if (typeof window !== 'undefined') {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => { if (current) SAVED.set(current, window.scrollY); }, { passive: true });
}

// Call in a layout: a new page (link, menu) opens at the top; Back and Forward restore the old position once the
// page is tall enough to hold it (lazy pages and their data arrive a moment after the address changes).
// `skip`: the layout scrolls by itself this time (e.g. to a section).
export function useScrollOnNavigate({ skip = false } = {}) {
  const loc = useLocation();
  const type = useNavigationType();
  const path = useRef(null);
  useLayoutEffect(() => {
    current = loc.key;
    const samePage = path.current === loc.pathname;
    path.current = loc.pathname;
    // A filter or tab kept in the address (?y=2025) is the same page: stay put.
    if (skip || (samePage && type !== 'POP')) return undefined;
    const y = type === 'POP' ? SAVED.get(loc.key) : 0;
    if (!y) { window.scrollTo({ top: 0, behavior: 'instant' }); return undefined; }
    let tries = 0, raf = 0;
    const restore = () => {
      if (document.documentElement.scrollHeight - window.innerHeight >= y || tries++ > 60) window.scrollTo({ top: y, behavior: 'instant' });
      else raf = requestAnimationFrame(restore);
    };
    restore();
    return () => cancelAnimationFrame(raf);
  }, [loc.pathname, loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
}

const AUTO = 'main .surface-card, main section, main [data-reveal-children] > *, main [data-stagger] > *, main .stagger-grid > *';

export function MotionManager() {
  const { pathname } = useLocation();

  // Interactive spotlight for cards on mouse movement (compositor-friendly, non-touch only)
  useEffect(() => {
    if (reducedMotion() || (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)) return undefined;
    let hovered = null;
    let raf = 0;
    const onPointerMove = (e) => {
      const card = e.target?.closest?.('.spotlight-card, .lift, .surface-card');
      if (card !== hovered) {
        if (hovered) hovered.style.setProperty('--spotlight-opacity', '0');
        hovered = card;
        if (hovered) hovered.style.setProperty('--spotlight-opacity', '1');
      }
      if (!hovered) return;
      const { clientX, clientY } = e;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!hovered) return;
          const rect = hovered.getBoundingClientRect();
          hovered.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
          hovered.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
        });
      }
    };
    const onPointerLeave = () => {
      if (hovered) {
        hovered.style.setProperty('--spotlight-opacity', '0');
        hovered = null;
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    document.documentElement.classList.add('reveal-ready');
    // Reveal a little before an element reaches the screen, so a fast scroll never lands on empty space.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px 22% 0px', threshold: 0 }); // reveal well ahead of arrival for seamless scrolling
    const seen = new WeakSet(); // checked once each, so later scans do not measure the whole page again
    const scan = () => {
      const fresh = [...document.querySelectorAll(AUTO)].filter((el) => !seen.has(el));
      if (!fresh.length) return;
      const fold = window.innerHeight;
      const tops = fresh.map((el) => el.getBoundingClientRect().top); // all reads first, then writes: one layout pass
      fresh.forEach((el, k) => {
        seen.add(el);
        if (el.hasAttribute('data-reveal') || el.parentElement?.closest('[data-reveal]') || el.closest('[data-no-reveal]')) return;
        if (tops[k] > fold) { el.setAttribute('data-reveal', ''); io.observe(el); }
      });
      // Stagger children of grid groups, [data-reveal-children] and [data-stagger]
      document.querySelectorAll('[data-reveal-children], [data-stagger], .stagger-grid').forEach((g) => {
        [...g.children].forEach((c, k) => {
          if (!c.style.getPropertyValue('--d')) c.style.setProperty('--d', `${(k % 5) * 30}ms`);
        });
      });
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    };
    scan();
    // Pages fill in after data arrives or a tab changes; pick up what appears, when the browser is idle.
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 60));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    let t = 0, h = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => { cancel(h); h = idle(scan, { timeout: 300 }); }, 80);
    });
    mo.observe(document.querySelector('main') ?? document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t); cancel(h); };
  }, [pathname]);
  return null;
}

// The routed page, re-entering with a soft rise and hardware accelerated scale settle each time the address changes.
export function PageOutlet() {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-enter"><Outlet /></div>;
}

// A thin progress line under the header showing how far down the page you are.
// Scroll-driven CSS where the browser supports it (runs off the main thread), otherwise follows the scroll.
export function ScrollProgress() {
  useEffect(() => {
    if (CSS.supports?.('animation-timeline: scroll()')) return undefined;
    const bar = document.querySelector('.scroll-progress');
    return onScroll((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    });
  }, []);
  return <div className="scroll-progress" aria-hidden="true" />;
}

// Hook to animate a whole number up from 0 when it first appears, and from the old value to the new one when it changes
// (a new union, a request answered), instead of starting again from 0.
export function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(reducedMotion() ? target : 0);
  const shown = useRef(val);
  shown.current = val;
  useEffect(() => {
    if (reducedMotion()) {
      setVal(target);
      return undefined;
    }
    const start = shown.current;
    if (start === target) return undefined;
    let raf = 0;
    const startTime = performance.now();
    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // spring-like ease out
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(start + (target - start) * ease));
      if (progress < 1) {
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
