// Crop doctor: a first look at a farmer's crop photo by Google Gemini (vision), with the field's live context and
// Google Search grounding, so advice follows current Bangladesh recommendations. Vercel serverless function. Needs
// GEMINI_API_KEY in the project's environment (GEMINI_MODEL optionally picks the model); without it, Claude is used
// if ANTHROPIC_API_KEY is set (web search limited to official and scientific sources), and with neither the endpoint
// answers 503 and the app says the AI doctor is not switched on. Keys never reach the browser.
//   POST /api/doctor  { image: <base64 JPEG, already shrunk in the browser>, crop, lang, context }
//   → { report, sources, model, at }
// The result is a first look, not a diagnosis: the prompt keeps it to likely causes with the evidence seen, what to do
// now without chemicals, and when to involve the agriculture officer; chemical advice only as DAE/BARI recommend it.
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-opus-5-5';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_B64 = 3_000_000; // ~2.2 MB JPEG; the browser sends ~1568 px, usually 200–500 KB
const CROPS = new Set(['boro', 'tomato', 'wheat', 'lentil', 'mustard', 'mungbean', 'sesame', 'jute', 'aus', 'aman']);
// Where the doctor may look things up: Bangladesh's agriculture institutes and extension, FAO, CABI.
const SOURCES = ['dae.gov.bd', 'bari.gov.bd', 'brri.gov.bd', 'bjri.gov.bd', 'ais.gov.bd', 'krishi.gov.bd', 'fao.org', 'plantwiseplus.cabi.org', 'cabidigitallibrary.org', 'plantvillage.psu.edu'];

const REPORT_TOOL = {
  name: 'report_crop_check',
  description: 'Report what the photo shows to the farmer. Call this exactly once, at the end, after looking at the photo and any searches.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['is_crop_photo', 'crop_seen', 'image_quality', 'retake_tip', 'findings', 'urgency', 'summary', 'actions_now', 'treatment_note', 'call_officer_if'],
    properties: {
      is_crop_photo: { type: 'boolean', description: 'False if the photo is not of a crop plant (or is too unclear to tell).' },
      crop_seen: { type: 'string', description: 'The crop you see, in the farmer language; say if it differs from the crop the farmer named.' },
      image_quality: { type: 'string', enum: ['good', 'poor', 'unusable'] },
      retake_tip: { type: 'string', description: 'If quality is not good: how to take a better photo. Else an empty string.' },
      findings: {
        type: 'array',
        description: 'Up to 3 likely causes, most likely first. Use a key from the known-problems list when it fits, else "other". Use "healthy" if nothing is wrong.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['key', 'name_bn', 'name_en', 'likelihood', 'evidence'],
          properties: {
            key: { type: 'string' },
            name_bn: { type: 'string' },
            name_en: { type: 'string' },
            likelihood: { type: 'number', description: '0 to 1, honest: under 0.7 unless the signs are distinctive.' },
            evidence: { type: 'string', description: 'What in the photo (and context) points to this, in the farmer language.' },
          },
        },
      },
      urgency: { type: 'string', enum: ['low', 'medium', 'high'], description: 'high = spreads fast or can lose the crop within days.' },
      summary: { type: 'string', description: 'Two or three plain sentences for the farmer, in the farmer language.' },
      actions_now: { type: 'array', items: { type: 'string' }, description: '2–4 things to do today without chemicals, in the farmer language.' },
      treatment_note: { type: 'string', description: 'If a chemical is normally recommended in Bangladesh (DAE/BARI/BRRI), name the active ingredient group, say to follow the label dose and safety, and to confirm with the agriculture officer first. Else an empty string.' },
      call_officer_if: { type: 'string', description: 'When the farmer should call or send this to the agriculture officer, in the farmer language.' },
    },
  },
};

function systemPrompt() {
  return `You are the crop doctor in FieldShift 360, an app for smallholder farmers in Bangladesh (Rajshahi and Dhaka divisions). A farmer sends one photo of their crop.

Give a careful first look, the way an experienced Sub-Assistant Agriculture Officer of the Department of Agricultural Extension (DAE) would at the field edge:
- Look closely at the photo first: which plant part, the pattern of spots or damage, colour, margins, insects or eggs, wilting, the field around it.
- Weigh it against the field context you are given (crop, days since planting, recent weather, the satellite reading). Humid, foggy or wet spells favour fungal and bacterial disease; hot dry spells favour mites, aphid build-up and water stress.
- Be honest about uncertainty. A photo alone rarely settles a diagnosis; keep likelihoods under 0.7 unless the signs are distinctive. Nutrient deficiency, herbicide damage, water stress and disease can look alike - say so when they do.
- Use web search only when it helps: to check a current DAE, BARI, BRRI or BJRI recommendation, or a current outbreak warning in Bangladesh. Do not search for things you are already sure of.
- Non-chemical steps first (remove and bury affected leaves, drainage, spacing, water at the base, traps). Mention a chemical only as Bangladesh's institutes recommend it, by active ingredient group, with "follow the label and ask your agriculture officer first". Never give a dose of your own. Never suggest a banned pesticide.
- If the photo is not a crop, or too blurred or dark to judge, say so kindly and explain how to retake it.
- Write everything the farmer reads in the language you are told, in plain words a farmer uses (no Latin names unless also given in plain words).

Finish by calling the report_crop_check tool exactly once with your answer.`;
}

// Gemini: one request with Google Search grounding; the answer is the report as JSON in the report tool's schema.
// A key whose plan has no search quota (free keys) is refused with 429: the request then runs once more without search.
async function geminiReport({ image, crop, lang, context, known }) {
  const ask = (search) => fetch(`${GEMINI_API}/${GEMINI_MODEL}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt().replace('Use web search only when it helps', 'Use Google Search only when it helps').replace('Finish by calling the report_crop_check tool exactly once with your answer.', 'Answer only with the JSON report.') }] },
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: userText({ crop, lang, context, known }) }] }],
      ...(search ? { tools: [{ googleSearch: {} }] } : {}),
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: REPORT_TOOL.input_schema, temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(search ? 140_000 : 280_000),
  });
  let r = await ask(true);
  if (r.status === 429) r = await ask(false);
  const js = await r.json().catch(() => ({}));
  if (!r.ok) return { status: r.status === 429 ? 429 : r.status === 400 ? 400 : r.status === 401 || r.status === 403 ? 503 : 502, error: r.status === 429 ? 'busy, try again in a minute' : r.status === 401 || r.status === 403 ? 'doctor not configured' : `AI service error ${r.status}` };
  const cand = js.candidates?.[0];
  if (!cand || cand.finishReason === 'SAFETY' || js.promptFeedback?.blockReason) return { status: 422, error: 'declined', category: js.promptFeedback?.blockReason ?? cand?.finishReason ?? null };
  const text = (cand.content?.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  let report;
  try { report = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { return { status: 502, error: 'no report' }; }
  const sources = (cand.groundingMetadata?.groundingChunks ?? []).map((c) => c.web).filter((w) => w?.uri).slice(0, 6).map((w) => ({ url: w.uri, title: w.title || w.uri }));
  return { report, sources, model: js.modelVersion || GEMINI_MODEL };
}

function userText({ crop, lang, context = {}, known = [] }) {
  const c = context;
  const lines = [
    `Farmer language: ${lang === 'en' ? 'English' : 'Bangla (বাংলা)'}.`,
    `Crop the farmer says this is: ${crop}.`,
    c.place && `Place: ${c.place}.`,
    c.daysAfter != null && (c.daysAfter >= 0 ? `Days since planting: ${c.daysAfter} (${c.stage ?? ''}).` : `Not planted yet according to the plan (planting in ${-c.daysAfter} days) - the photo may be a seedbed or a previous crop.`),
    c.weather && `Weather at the field: ${c.weather.rain7 ?? '?'} mm rain in the last 7 days, ${c.weather.rainNext3 ?? '?'} mm forecast for the next 3, high today ${c.weather.tmax ?? '?'} °C, nights around ${c.weather.tmin ?? '?'} °C.`,
    c.sat && `Latest Sentinel-2 satellite reading of the field (${c.sat.d}): NDVI ${c.sat.ndvi}, NDMI ${c.sat.ndmi}${c.sat.finding ? `; note: ${c.sat.finding}` : ''}.`,
    c.soil && `Soil (SoilGrids model): pH ${c.soil.ph}, organic matter ${c.soil.om_pct}%, ${c.soil.texture}, drainage ${c.soil.drainage}.`,
    known.length && `Known problems of this crop in Bangladesh (keys you may use): ${known.map((k) => `${k.key} = ${k.en}`).join('; ')}.`,
    c.note && `What the farmer wrote: "${c.note}"`,
  ].filter(Boolean);
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  const gemini = !!process.env.GEMINI_API_KEY;
  if (!gemini && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return res.status(503).json({ error: 'doctor not configured' });
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'bad json' }); }
  const image = String(body?.image ?? '');
  const crop = String(body?.crop ?? '');
  const lang = body?.lang === 'en' ? 'en' : 'bn';
  if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length < 1000 || image.length > MAX_IMAGE_B64) return res.status(400).json({ error: 'image missing or too large' });
  if (!CROPS.has(crop)) return res.status(400).json({ error: 'unknown crop' });
  const known = Array.isArray(body?.known) ? body.known.slice(0, 12).map((k) => ({ key: String(k.key).slice(0, 30), en: String(k.en).slice(0, 60) })) : [];
  const context = typeof body?.context === 'object' && body.context ? body.context : {};
  if (context.note) context.note = String(context.note).slice(0, 500);

  if (gemini) {
    try {
      const g = await geminiReport({ image, crop, lang, context, known });
      if (g.error) return res.status(g.status).json({ error: g.error, ...(g.category !== undefined ? { category: g.category } : {}) });
      return res.status(200).json({ ...g, at: Date.now() });
    } catch { return res.status(502).json({ error: 'AI service unreachable' }); }
  }

  const client = new Anthropic();
  const messages = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
      { type: 'text', text: userText({ crop, lang, context, known }) },
    ],
  }];
  const params = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' }, // looking at a plant photo and weighing it against the field is careful work
    system: systemPrompt(),
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 3, allowed_domains: SOURCES, user_location: { type: 'approximate', country: 'BD', timezone: 'Asia/Dhaka' } },
      REPORT_TOOL,
    ],
    // On a safety decline the request re-runs on Anthropic's recommended fallback model instead of failing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  };
  try {
    let report = null, response = null;
    const sources = new Map();
    for (let turn = 0; turn < 4 && !report; turn++) {
      response = await client.beta.messages.create({ ...params, messages });
      if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'declined', category: response.stop_details?.category ?? null });
      for (const b of response.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) if (r.url) sources.set(r.url, r.title || r.url);
        if (b.type === 'tool_use' && b.name === REPORT_TOOL.name) report = b.input;
      }
      if (report) break;
      messages.push({ role: 'assistant', content: response.content });
      // pause_turn: a long server-tool turn; send it back to continue. Otherwise ask for the report explicitly.
      if (response.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Please give your answer now by calling report_crop_check.' });
    }
    if (!report) return res.status(502).json({ error: 'no report' });
    return res.status(200).json({ report, sources: [...sources].slice(0, 6).map(([url, title]) => ({ url, title })), model: response.model, at: Date.now() });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'busy, try again in a minute' });
    if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ error: 'request rejected', detail: e.message });
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'doctor not configured' });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: `AI service error ${e.status}` });
    return res.status(502).json({ error: 'AI service unreachable' });
  }
}
