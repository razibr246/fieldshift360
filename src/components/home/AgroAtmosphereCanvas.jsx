// Ambient Agro-Atmospheric Canvas for Home Hero Backdrop.
// Renders ultra-lightweight, GPU-friendly floating micro-motes simulating dawn mist
// and sunlight scatter over the Ganges delta. Respects prefers-reduced-motion.
import { useEffect, useRef } from 'react';

const MOTE_COUNT = 16;

export default function AgroAtmosphereCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let animId = 0;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || 600);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || 600;
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Initialize 16 gentle motes with golden/emerald hues
    const motes = Array.from({ length: MOTE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.2 + 1.2,
      vx: (Math.random() - 0.45) * 0.22,
      vy: -(Math.random() * 0.28 + 0.12),
      alpha: Math.random() * 0.24 + 0.12,
      baseAlpha: Math.random() * 0.24 + 0.12,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? 'rgba(237, 192, 103,' : 'rgba(141, 190, 120,', // Gold or paddy green
    }));

    let mouseX = -1000;
    let mouseY = -1000;
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    let lastTime = performance.now();

    const loop = (now) => {
      if (document.visibilityState !== 'visible') {
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.phase += dt * 0.8;
        m.x += m.vx + Math.sin(m.phase) * 0.18;
        m.y += m.vy;

        // Subtle mouse deflection
        const dx = m.x - mouseX;
        const dy = m.y - mouseY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 10000 && distSq > 0) {
          const force = (1 - Math.sqrt(distSq) / 100) * 0.5;
          m.x += (dx / Math.sqrt(distSq)) * force;
          m.y += (dy / Math.sqrt(distSq)) * force;
        }

        // Wrap edges smoothly
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        const pulseAlpha = m.baseAlpha * (0.8 + 0.2 * Math.sin(m.phase * 1.5));

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `${m.color}${pulseAlpha.toFixed(3)})`;
        ctx.shadowColor = m.color.includes('237') ? 'rgba(237, 192, 103, 0.4)' : 'rgba(141, 190, 120, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70 mix-blend-screen"
      aria-hidden="true"
    />
  );
}
