import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { wav } from './tts.js';

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function withEnv(values, run) {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = originalFetch;
  }
}

test('wraps headerless PCM as a playable WAV', () => {
  const pcm = Buffer.from([1, 2, 3, 4]);
  const output = wav(pcm, 16000);
  assert.equal(output.toString('ascii', 0, 4), 'RIFF');
  assert.equal(output.readUInt32LE(24), 16000);
  assert.deepEqual(output.subarray(44), pcm);
});

test('returns a clear unavailable response when no Gemini key is configured', async () => {
  await withEnv({ GEMINI_API_KEY: '' }, async () => {
    const res = response();
    await handler({ method: 'POST', body: { text: 'শুভ সকাল', lang: 'bn' } }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'voice not configured' });
  });
});

test('speaks Bangla in the designed Bangladeshi voice, English through generateContent, and keeps model WAV output', async () => {
  const modelWav = wav(Buffer.from([9, 8, 7, 6]));
  await withEnv({ GEMINI_API_KEY: 'test-key', GEMINI_TTS_MODEL: undefined, GEMINI_TTS_VOICE: undefined, GEMINI_TTS_VOICE_BN: undefined }, async () => {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: modelWav.toString('base64') } }] } }] }),
      };
    };
    const res = response();
    await handler({ method: 'POST', body: { text: '  শুভ   সকাল। ', lang: 'bn' } }, res);
    const sent = JSON.parse(request.options.body);
    const content = sent.input[0].content[0];
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.match(sent.generation_config.speech_config[0].voice, /^voice_/);
    assert.equal(content.text, 'শুভ সকাল।');
    assert.equal(content.annotations, undefined); // the designed voice carries its own accent: no style line
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.mime, 'audio/wav');
    assert.deepEqual(Buffer.from(res.body.audio, 'base64'), modelWav);

    const english = response();
    await handler({ method: 'POST', body: { text: 'Good morning', lang: 'en' } }, english);
    const englishPart = JSON.parse(request.options.body).contents[0].parts[0];
    assert.equal(englishPart.text, 'Good morning');
    assert.match(englishPart.speech_metadata.style, /fluent British English/i);
  });
});

test('wraps legacy PCM TTS output using the returned sample rate', async () => {
  const pcm = Buffer.from([5, 6, 7, 8]);
  await withEnv({ GEMINI_API_KEY: 'test-key', GEMINI_TTS_MODEL: 'gemini-3.1-flash-tts-preview' }, async () => {
    let requestBody;
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=16000', data: pcm.toString('base64') } }] } }] }),
      };
    };
    const res = response();
    await handler({ method: 'POST', body: { text: 'Good morning', lang: 'en' } }, res);
    assert.match(requestBody.contents[0].parts[0].text, /British English.*Good morning/);
    assert.equal(requestBody.contents[0].parts[0].speech_metadata, undefined);
    const audio = Buffer.from(res.body.audio, 'base64');
    assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
    assert.equal(audio.readUInt32LE(24), 16000);
    assert.deepEqual(audio.subarray(44), pcm);
  });
});

test('uses the designed Bangladeshi female voice through the Interactions API', async () => {
  await withEnv({
    GEMINI_API_KEY: 'test-key',
    GEMINI_TTS_MODEL: undefined,
    GEMINI_TTS_VOICE: undefined,
    GEMINI_TTS_VOICE_BN: 'voice_fieldshift_bangla_female',
  }, async () => {
    let request;
    const modelWav = Buffer.from('RIFFdesigned voice sample');
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ output_audio: { mime_type: 'audio/wav', data: modelWav.toString('base64') } }),
      };
    };
    const res = response();
    await handler({ method: 'POST', body: { text: 'শুভ সকাল', lang: 'bn' } }, res);

    const payload = JSON.parse(request.options.body);
    assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(payload.model, 'gemini-3.8-flash-tts');
    assert.deepEqual(payload.generation_config.speech_config, [{ voice: 'voice_fieldshift_bangla_female' }]);
    assert.equal(payload.input[0].content[0].text, 'শুভ সকাল');
    assert.equal(payload.input[0].content[0].annotations, undefined);
    assert.deepEqual(Buffer.from(res.body.audio, 'base64'), modelWav);
  });
});

test('moves to the Lite model when the day\'s quota is used, and to the prebuilt voice when the designed one is missing', async () => {
  await withEnv({ GEMINI_API_KEY: 'test-key', GEMINI_TTS_MODEL: undefined, GEMINI_TTS_VOICE: undefined, GEMINI_TTS_VOICE_BN: undefined }, async () => {
    const calls = [];
    const ok = (data) => ({ ok: true, status: 200, json: async () => data });
    const wavB64 = wav(Buffer.from([1, 2])).toString('base64');
    // the full model is out of quota; on Lite the designed voice is unknown to this key, the prebuilt one answers
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      const model = body.model ?? /models\/([^:]+):/.exec(url)?.[1];
      const voice = body.generation_config?.speech_config?.[0]?.voice ?? body.generationConfig?.speechConfig?.voiceConfig?.voice;
      calls.push(`${model}|${voice}`);
      if (model === 'gemini-3.8-flash-tts') return { ok: false, status: 429, json: async () => ({}) };
      if (/^voice_/.test(voice)) return { ok: false, status: 404, json: async () => ({}) };
      return ok({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/wav', data: wavB64 } }] } }] });
    };
    const res = response();
    await handler({ method: 'POST', body: { text: 'শুভ সকাল', lang: 'bn' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.voice, 'Sulafat');
    assert.deepEqual(calls.map((c) => c.split('|')[0]), ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']);

    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
    const out = response();
    await handler({ method: 'POST', body: { text: 'শুভ সকাল', lang: 'bn' } }, out);
    assert.equal(out.statusCode, 429);
  });
});
