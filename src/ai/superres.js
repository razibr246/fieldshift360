// AI super-resolution in the browser: Real-ESRGAN "realesr-general-x4v3" (Xintao Wang et al., BSD-3-Clause), its
// weights blended 50/50 with the keep-detail twin "realesr-general-wdn-x4v3" (the project's own denoise-strength
// knob), converted to ONNX from the official release (public/models/realesr-general-x4v3-dn50.onnx, 4.9 MB).
// Runs with ONNX Runtime Web: WebGPU when the device has it, WebAssembly otherwise. Nothing leaves the browser.
// It makes a photo four times larger with crisper edges (bunds, field corners, paths). Fine texture in the output is
// the model's estimate, not a measurement; analysis in the app never uses it.
const ORT_VERSION = '1.29.0';
const MODEL = `${import.meta.env.BASE_URL}models/realesr-general-x4v3-dn50.onnx`;
let ready = null;

async function session() {
  if (!ready) {
    ready = (async () => {
      // Fetched only when the AI is first used (about 66 kB of script, then its WebAssembly), so the app itself stays small.
      const cdn = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      const ort = await import(/* @vite-ignore */ `${cdn}ort.webgpu.min.mjs`);
      ort.env.wasm.wasmPaths = cdn;
      const gpu = typeof navigator !== 'undefined' && 'gpu' in navigator && (await navigator.gpu.requestAdapter().catch(() => null));
      for (const eps of gpu ? [['webgpu'], ['wasm']] : [['wasm']]) {
        try { return { ort, s: await ort.InferenceSession.create(MODEL, { executionProviders: eps }), gpu: eps[0] === 'webgpu' }; } catch { /* try the next one */ }
      }
      throw new Error('AI model could not start');
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}
export const aiUsesGpu = async () => (await session()).gpu;

// 4× a canvas, in overlapping tiles so memory stays small. onProgress(0..1).
export async function upscale4(src, { tile = 128, pad = 10, onProgress, signal } = {}) {
  const { ort, s } = await session();
  const W = src.width, H = src.height;
  const out = document.createElement('canvas');
  out.width = W * 4; out.height = H * 4;
  const octx = out.getContext('2d');
  const sctx = src.getContext('2d', { willReadFrequently: true });
  const jobs = [];
  for (let y = 0; y < H; y += tile) for (let x = 0; x < W; x += tile) jobs.push([x, y]);
  let done = 0;
  for (const [x, y] of jobs) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const x0 = Math.max(0, x - pad), y0 = Math.max(0, y - pad), x1 = Math.min(W, x + tile + pad), y1 = Math.min(H, y + tile + pad);
    const w = x1 - x0, h = y1 - y0, n = w * h;
    const px = sctx.getImageData(x0, y0, w, h).data;
    const f = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) { f[i] = px[i * 4] / 255; f[n + i] = px[i * 4 + 1] / 255; f[2 * n + i] = px[i * 4 + 2] / 255; }
    const input = new ort.Tensor('float32', f, [1, 3, h, w]);
    const { output } = await s.run({ input });
    const o = output.data, w4 = w * 4, h4 = h * 4, m = w4 * h4;
    const img = octx.createImageData(w4, h4);
    for (let i = 0; i < m; i++) {
      img.data[i * 4] = o[i] * 255; img.data[i * 4 + 1] = o[m + i] * 255; img.data[i * 4 + 2] = o[2 * m + i] * 255; img.data[i * 4 + 3] = 255;
    }
    // Keep only this tile's own part; the padding was there to give the model context at the edges.
    octx.putImageData(img, x0 * 4, y0 * 4, (x - x0) * 4, (y - y0) * 4, Math.min(tile, W - x) * 4, Math.min(tile, H - y) * 4);
    input.dispose?.(); output.dispose?.();
    onProgress?.(++done / jobs.length);
  }
  return out;
}

// ---- Web Mercator tiles -> one canvas over a lat/lon box ----
const worldPx = (lat, lon, z) => {
  const n = 256 * 2 ** z, r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n];
};
const toLatLon = (x, y, z) => {
  const n = 256 * 2 ** z;
  return [(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI, (x / n) * 360 - 180];
};
const loadImg = (url, signal) => new Promise((ok, fail) => {
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => ok(im); im.onerror = () => fail(new Error(`tile ${url}`));
  signal?.addEventListener('abort', () => { im.src = ''; fail(new DOMException('Aborted', 'AbortError')); });
  im.src = url;
});

// url(z, x, y) -> tile address. bounds [[s, w], [n, e]]. Returns the canvas and the exact box it covers.
export async function stitch(url, z, [[s, w], [n, e]], { signal, maxPx = 1400 } = {}) {
  let [x0, y0] = worldPx(n, w, z), [x1, y1] = worldPx(s, e, z);
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const cw = x1 - x0, ch = y1 - y0;
  if (cw > maxPx || ch > maxPx) throw new Error('area too large');
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const jobs = [];
  for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y1 - 1) / 256); ty++) {
    for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x1 - 1) / 256); tx++) {
      jobs.push(loadImg(url(z, tx, ty), signal).then((im) => ctx.drawImage(im, tx * 256 - x0, ty * 256 - y0, 256, 256)));
    }
  }
  const res = await Promise.allSettled(jobs);
  if (res.every((r) => r.status === 'rejected')) throw new Error('no tiles');
  const [nn, ww] = toLatLon(x0, y0, z), [ss, ee] = toLatLon(x1, y1, z);
  return { canvas: c, bounds: [[ss, ww], [nn, ee]] };
}

// The deepest zoom Esri has a real photo for at a point (its tilemap service says, tile by tile).
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
export const esriTile = (z, x, y) => `${ESRI}/tile/${z}/${y}/${x}`;
export async function esriDepthAt(lat, lon) {
  for (let z = 20; z >= 15; z--) {
    const [px, py] = worldPx(lat, lon, z);
    try {
      const j = await (await fetch(`${ESRI}/tilemap/${z}/${Math.floor(py / 256)}/${Math.floor(px / 256)}/1/1`)).json();
      if (j.valid !== false && j.data?.[0] === 1) return z;
    } catch { /* try shallower */ }
  }
  return 17;
}
