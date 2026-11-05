// Moving water on the hero photos: a small WebGL layer laid exactly over the photo (the same object-fit: cover and
// focal point as <Photo fill>), which redraws only the water of that photo with a slow ripple and a soft glint, so the
// river, canal or lake looks alive while the banks, boats and bridges stay still. The water is marked per photo in the
// photo's own coordinates (WATER below), so it stays on the water however the screen crops the picture. It sits inside
// the slide's Ken Burns layer and moves with it. Nothing is drawn with reduced motion, without WebGL, or off screen.
import { useEffect, useRef } from 'react';
import { IMAGES } from '../../assets/images';

// Ellipses over the water, in photo fractions: [centre x, centre y, radius x, radius y, weight]. A negative weight
// cuts a hole (a boat). flow: which way and how fast the water moves; amp: how far it shifts, as a fraction of the photo.
export const WATER = {
  dhamraiBridge: { flow: [0.35, 0.12], amp: 0.0035, e: [[0.46, 0.93, 0.35, 0.1, 1], [0.80, 0.36, 0.17, 0.17, 1]] },
  guavaBoat: { flow: [0.25, 0.1], amp: 0.004, e: [[0.5, 0.92, 0.78, 0.24, 1], [0.57, 0.78, 0.31, 0.07, -1.4]] },
  teestaBarrage: { flow: [0.3, 0.15], amp: 0.003, e: [[0.27, 0.83, 0.3, 0.19, 1]] },
  wetlandBoardwalk: { flow: [0.15, 0.08], amp: 0.0025, e: [[0.5, 0.47, 0.17, 0.11, 1], [0.52, 0.89, 0.4, 0.1, 1]] },
  stonyRiver: { flow: [0.9, 0.5], amp: 0.0045, e: [[0.5, 0.79, 0.62, 0.28, 1]] },
  hillWaterfall: { flow: [0.2, 0.25], amp: 0.004, e: [[0.5, 0.93, 0.42, 0.1, 1]] },
  viewBhutan: { flow: [0.6, 0.3], amp: 0.004, e: [[0.3, 0.76, 0.34, 0.25, 1], [0.62, 0.9, 0.22, 0.1, 1]] },
  viewPakistan: { flow: [0.12, 0.04], amp: 0.0025, e: [[0.6, 0.78, 0.3, 0.06, 1]] },
  viewAfghanistan: { flow: [0.15, 0.06], amp: 0.003, e: [[0.55, 0.62, 0.55, 0.16, 1]] },
};
export const hasWater = (name) => !!WATER[name];

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
// uCover maps a canvas pixel to the photo: uv = (pixel - offset) / (photo size on screen).
const FRAG = `precision mediump float;
uniform sampler2D uImg; uniform vec2 uRes; uniform vec4 uCover; uniform float uT; uniform vec2 uFlow; uniform float uAmp;
uniform vec4 uE[4]; uniform float uW[4];
float lump(vec2 uv, vec4 e){ vec2 d = (uv - e.xy) / e.zw; return 1.0 - smoothstep(0.55, 1.0, length(d)); }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = (px - uCover.zw) / uCover.xy;
  float m = 0.0;
  for (int i = 0; i < 4; i++) m += uW[i] * lump(uv, uE[i]);
  m = clamp(m, 0.0, 1.0);
  if (m < 0.01 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0); return; }
  // Waves stretched sideways (as water seen from the bank) drifting with the flow; three scales so it never repeats.
  vec2 q = uv * vec2(1.0, 3.2);
  float t = uT;
  float w = sin(q.y * 46.0 - t * 1.7 + sin(q.x * 9.0 + t * 0.6) * 1.4)
          + 0.6 * sin(q.y * 83.0 + q.x * 21.0 - t * 2.6)
          + 0.35 * sin((q.x * 31.0 - q.y * 57.0) + t * 1.1);
  vec2 shift = vec2(uFlow.x * w, (0.6 + uFlow.y) * cos(w * 1.3 + t * 0.4)) * uAmp * m;
  vec4 c = texture2D(uImg, uv + shift);
  // A soft moving glint where the wave crests catch the sky.
  float glint = smoothstep(1.55, 1.95, w) * 0.10 * m;
  c.rgb += glint;
  gl_FragColor = vec4(c.rgb * m, m);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export default function RiverWater({ name }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    const spec = WATER[name], img = IMAGES[name];
    if (!host || !spec || !img) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    // A fresh canvas per run: the old one's WebGL context is released on cleanup, and a released context cannot be
    // used again (React runs effects twice in development).
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1600ms]';
    host.appendChild(canvas);
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    const bail = () => { canvas.remove(); return undefined; };
    if (!gl) return bail();
    const vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return bail();
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return bail();
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (k) => gl.getUniformLocation(prog, k);
    const ellipses = [0, 1, 2, 3].map((i) => spec.e[i] ?? [0, 0, 1, 1, 0]);
    gl.uniform4fv(u('uE'), ellipses.flatMap((e) => e.slice(0, 4)));
    gl.uniform1fv(u('uW'), ellipses.map((e) => e[4]));
    gl.uniform2fv(u('uFlow'), spec.flow);
    gl.uniform1f(u('uAmp'), spec.amp);
    const uRes = u('uRes'), uCover = u('uCover'), uT = u('uT');

    // object-fit: cover with the photo's focal point, as <Photo fill> draws it.
    const [fx, fy] = (img.focus ?? '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const s = Math.max(canvas.width / img.width, canvas.height / img.height);
      const dw = img.width * s, dh = img.height * s;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform4f(uCover, dw, dh, (canvas.width - dw) * fx, (canvas.height - dh) * fy);
    };

    let raf = 0, ready = false, visible = true, alive = true;
    const t0 = performance.now();
    const frame = () => {
      raf = 0;
      if (!alive || !ready || !visible || document.hidden) return;
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const photo = new Image();
    photo.decoding = 'async';
    photo.onload = () => {
      if (!alive) return;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
      ready = true;
      fit();
      canvas.style.opacity = '1';
      kick();
    };
    photo.src = img.src;

    const ro = new ResizeObserver(() => { if (ready) fit(); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); });
    io.observe(canvas);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      photo.onload = null;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, [name]);
  return <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
