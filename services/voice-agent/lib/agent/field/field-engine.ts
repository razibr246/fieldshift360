// FieldShift voice agent engine: the farming counterpart of runLegalAgentSession in core/agent-engine.ts.
// Select it with AGENT_DOMAIN=field. Same Groq/OpenAI-compatible model, same streaming, different persona and tool.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, isStepCount, type ModelMessage } from "ai";
import { FIELD_AGENT_PROMPT, type FieldRole } from "./field-prompt";
import { createFieldTools } from "./field-tools";
import { fieldStore } from "./field-session-store";

const client = createOpenAI({
  baseURL: process.env.LLM_PROVIDER_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function runFieldAgentSession({ sessionId, messages, role = "farmer" }: { sessionId: string; messages: ModelMessage[]; role?: FieldRole }) {
  const entry = fieldStore.get(sessionId);
  const who = entry
    ? `\n[কথোপকথনের ব্যক্তি]: ভূমিকা: ${role === "farmer" ? "কৃষক" : role === "saao" ? "উপসহকারী কৃষি কর্মকর্তা" : "উপজেলা কৃষি অফিসার"}। তাঁর মাঠের তথ্য টুলে আছে।`
    : "\n[মাঠের তথ্য এখনো পাওয়া যায়নি; টুল বলবে অ্যাপ থেকে সংযোগ করতে।]";
  return streamText({
    model: client.chat(process.env.LLM_MODEL || "openai/gpt-oss-120b"),
    system: `${FIELD_AGENT_PROMPT}${who}`,
    messages,
    tools: createFieldTools(sessionId),
    stopWhen: isStepCount(3),
    temperature: 0.1,
    maxOutputTokens: 250,
  });
}
