// POST  { sessionId, role, lang, snapshot }  -> stores the farmer/officer snapshot built by the FieldShift app.
// GET   ?sessionId=...                      -> returns (and clears) effects the voice agent queued, for the app to apply
//                                              through its normal reducer actions after the person said "yes".
import { NextResponse } from "next/server";
import { fieldStore } from "@/lib/agent/field/field-session-store";

export async function POST(req: Request) {
  const { sessionId, role, lang, snapshot } = await req.json().catch(() => ({}));
  if (!sessionId || !snapshot || !["farmer", "saao", "uao"].includes(role)) {
    return NextResponse.json({ error: "sessionId, role (farmer|saao|uao) and snapshot are required" }, { status: 400 });
  }
  fieldStore.put(String(sessionId), role, snapshot, lang === "en" ? "en" : "bn");
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  return NextResponse.json({ effects: fieldStore.drainEffects(sessionId) });
}
