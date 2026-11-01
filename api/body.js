// Vercel may provide an already-parsed body or the raw JSON string. Keep malformed
// request JSON separate from downstream service errors so callers get a useful 400.
export function parseBody(body) {
  if (typeof body !== 'string') return { ok: true, value: body ?? {} };
  try {
    return { ok: true, value: JSON.parse(body || '{}') ?? {} };
  } catch {
    return { ok: false, value: null };
  }
}
