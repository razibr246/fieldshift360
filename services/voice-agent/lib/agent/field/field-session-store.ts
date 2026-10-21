// In-memory store of the FieldShift snapshot and dialogue state per voice session (same lifetime model as docket-store.ts).
// The web app (or a telephony gateway with a farmer/officer lookup) POSTs a fresh snapshot to /api/field/session; the
// brain answers from it, and any state-changing effects wait here until the client pulls and applies them.
import { createSession } from "./shared/brain";
import type { FieldRole } from "./field-prompt";

type Entry = { snapshot: any; session: ReturnType<typeof createSession>; effects: any[]; updatedAt: number };
const store = new Map<string, Entry>();
const TTL_MS = 60 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) if (now - v.updatedAt > TTL_MS) store.delete(k);
}

export const fieldStore = {
  put(sessionId: string, role: FieldRole, snapshot: any, lang: "bn" | "en" = "bn") {
    sweep();
    const prev = store.get(sessionId);
    const session = prev && prev.session.role === role ? prev.session : createSession({ role, lang });
    store.set(sessionId, { snapshot, session, effects: prev?.effects ?? [], updatedAt: Date.now() });
  },
  get(sessionId: string) {
    return store.get(sessionId) ?? null;
  },
  pushEffects(sessionId: string, effects: any[]) {
    const e = store.get(sessionId);
    if (e && effects.length) e.effects.push(...effects);
  },
  drainEffects(sessionId: string) {
    const e = store.get(sessionId);
    if (!e) return [];
    const out = e.effects;
    e.effects = [];
    return out;
  },
};
