// Function-calling tool for the FieldShift voice agent (Vercel AI SDK, Zod), the farming counterpart of legal-tools.ts.
// One tool on purpose: the brain already routes farmer and officer intents, handles yes/no confirmation and returns
// the exact reducer actions the screens use. The LLM's job is to listen, call this, and speak the result.
import { tool } from "ai";
import { z } from "zod";
import { fieldStore } from "./field-session-store";
import { respond } from "./shared/brain";

export function createFieldTools(sessionId: string) {
  return {
    askFieldAssistant: tool({
      description:
        "Answer a farmer's or agriculture officer's spoken request from the FieldShift snapshot: what to plant, planting date, water today, weather, harvest, price-drop risk, next crop, soil, problem reports, officer briefings, area alerts, replies, escalation, radar. Always call this for anything about crops or the officer's work, then speak the returned text.",
      inputSchema: z.object({
        utterance: z.string().describe("The person's words exactly as transcribed, in Bangla or English"),
      }),
      execute: async ({ utterance }) => {
        const entry = fieldStore.get(sessionId);
        if (!entry) {
          return { say: "এখনো আপনার মাঠের তথ্য পাইনি। অ্যাপ থেকে সংযোগ করে আবার চেষ্টা করুন।", needsSnapshot: true };
        }
        const res = respond(utterance, entry.snapshot, entry.session);
        fieldStore.pushEffects(sessionId, res.effects);
        return { say: res.say, pendingConfirmation: !!entry.session.state, sentSomething: res.effects.length > 0 };
      },
    }),
  };
}
