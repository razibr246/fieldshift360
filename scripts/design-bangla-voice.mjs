#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = path.join(ROOT, '.cache', 'voice', 'bangladeshi-female-voice.wav');
// The description that won a listening comparison of six designed Bangladeshi voices (see docs/VOICE.md). Google's
// voice design guide: one or two clear sentences with the permanent traits (age, accent, timbre) work best.
const VOICE_PROMPT = 'A cheerful, expressive young Bangladeshi woman of twenty-four, a university graduate from Dhaka, speaking natural modern Bangladeshi Bangla with a gentle smile in her voice and lively, flowing rhythm.';

async function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const env = await readFile(path.join(ROOT, '.env.local'), 'utf8').catch(() => '');
  const match = env.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (!key) throw new Error('Set GEMINI_API_KEY in .env.local before designing the voice.');
  return key;
}

const key = await loadApiKey();
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/voices', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify({
    store: true,
    voice: {
      model: 'gemini-3.8-flash-tts',
      type: 'prompted',
      display_name: 'FieldShift Bangladesh Female Bangla',
      gender: 'female',
      language_code: 'bn-BD',
      region_code: 'BD',
      accent: 'Bangladeshi',
      persona: 'Warm, friendly, conversational field adviser',
      context: 'Conversational',
      prompted: { input: VOICE_PROMPT },
    },
  }),
  signal: AbortSignal.timeout(60_000),
});

const result = await response.json();
if (!response.ok) throw new Error(`Voice design failed (${response.status}): ${result.error?.message ?? 'Gemini API error'}`);
if (!result.id) throw new Error('Voice design succeeded but Gemini did not return a voice ID.');

if (result.sample_audio?.data) {
  await mkdir(path.dirname(PREVIEW), { recursive: true });
  await writeFile(PREVIEW, Buffer.from(result.sample_audio.data, 'base64'));
}

console.log(`Designed voice ID: ${result.id}`);
console.log(`Set GEMINI_TTS_VOICE_BN=${result.id} in .env.local and your Vercel environment.`);
if (result.sample_audio?.data) console.log(`Preview: ${path.relative(ROOT, PREVIEW)}`);
