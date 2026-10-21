// Officer → farmer messages through api/messages.js. When the store cannot be reached the app keeps working with
// the messages in this browser.
const BASE = `${import.meta.env?.BASE_URL || './'}api/messages`;

export async function loadMessages(farmerId) {
  try {
    const r = await fetch(`${BASE}?to=${encodeURIComponent(farmerId)}`, { cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    const j = await r.json();
    return Array.isArray(j.messages) ? j.messages : null;
  } catch { return null; }
}

export async function postMessage(adv) {
  try {
    const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adv }) });
    return r.ok;
  } catch { return false; }
}
