# Voice assistant (Bangla, farmer and officer)

## Try it

`npm run dev`, open `/farmer/voice` or `/officer/voice`. Tap the mic (Chrome, Edge or Android Chrome; Bangla listening needs an internet connection because the browser sends audio to its own recogniser). You can always type instead.

Spoken replies first try `api/tts.js` (Gemini 3.8 Flash TTS). Bangla uses a designed Bangladeshi woman's voice (below; `GEMINI_TTS_VOICE_BN` overrides it); British English filters the catalogue for a female `en-GB` voice. Replies use Bengali digits and localize “NASA POWER” pronunciation while leaving the on-screen transcript unchanged. Set the server-side `GEMINI_API_KEY` to enable it; optional model and voice overrides are in `.env.example`. Spoken reply text is sent to Gemini for audio generation. If the service is unavailable, unconfigured or playback fails, replies fall back to the best matching installed device voice; where the device labels a feminine voice, it is preferred, with a small pause between sentences. The same service is used by the narrated field story.

## Natural Bangladeshi female voice

Google's voice catalogue has only West Bengal (Kolkata) Bangla voices, so the Bangla voice is designed with Gemini voice
design (`language_code: bn-BD`). In October 2026 six Bangladeshi women's voices were designed from short descriptions
(Google's guide: one or two sentences with the permanent traits) and each read the same farmer message. A panel of
Gemini audio judges, asked to listen as native Dhaka listeners, rated each for Bangladeshi accent, human naturalness,
pronunciation and warmth. The winner, `voice_zajpkutxwrdt` ("a cheerful, expressive young Bangladeshi woman of
twenty-four … from Dhaka"), scored 9–10 of 10 in every round with no Kolkata or robotic features heard, and is the
default in `api/tts.js`. Voices described as older, Sylheti or Rajshahi were heard as Kolkata-leaning or flat. A
judge model is not a person: ask Bangladeshi listeners before a launch.

A designed voice lives in the Google project of the key that made it and expires after a year (this one 2027-10-30).
With another key, run `npm run design:voice` (it uses the winning description) and set the printed
`GEMINI_TTS_VOICE_BN=voice_...` in `.env.local` and the Vercel environment; until then the prebuilt `Sulafat` voice
speaks, steered towards Bangladeshi Bangla by a style line. A designed voice carries its accent itself, so its style
stays empty. The free Gemini tier allows each TTS model 10 requests a day (and Flash-Lite 3 a minute): the full model
is tried first, then `gemini-3.8-flash-lite-tts`, then the device voice, where Edge's Nabanita (Bangladesh) is
preferred. A paid tier lifts the limit.

The voice is generated from a general description, not copied from a real speaker. Replies are sent to Gemini for speech generation.

## What farmers can ask

| Say | Answer comes from |
| --- | --- |
| কী লাগাব? / কবে লাগাব? / কেন? | `decide()` Keep / Adjust / Shift on 25 seasons of NASA POWER backtest, soil, water source, harvest-glut |
| আজ সেচ লাগবে? / আবহাওয়া | `waterAdvice()` colour and reasons; live Open-Meteo weather or the sample scenario (the voice says which) |
| ফসল কবে উঠবে, কত মণ? | `harvestWindow()` (growing-degree days) and `yieldRange()` for the saved field size |
| দাম পড়বে? | harvest-glut level. It never forecasts prices |
| পরের ফসল কী? | `recommendRotation()` |
| মাটি কেমন? | union soil values and notes |
| সমস্যা জানাতে চাই | multi-turn report, read back, sent on "yes" to the SAAO as a normal request |
| অফিসার, আমার অনুরোধ, তথ্য কোথা থেকে এল | contacts, request status and advice received, data provenance |

## What officers can do

Briefing, list and read requests, send the drafted or a dictated reply, ask for more photos, mark resolved, area alerts, advise everyone in a cluster, tell the UAO, harvest timing per crop, tomato planting slots, crop share. UAO only: union ranking, what field officers sent up (mark seen), advice to the whole upazila. The Aman radar summary is available to both.

## Safety rules built in

1. Nothing that changes data is done without a spoken yes. Tests assert zero effects before confirmation.
2. Danger-to-life words (snake bite, poison, fire, electric shock) get 999 immediately.
3. The assistant never gives pesticide or fertiliser doses and never forecasts prices; it routes to the SAAO and the Krishi Call Centre (16123, verify before launch).
4. If climate data is the placeholder, the first plan, harvest or briefing answer says so.
5. A SAAO cannot send whole-upazila advice; that is the UAO's action.

## Phone line (services/voice-agent)

The preserved legal voice agent already does phone-grade Bangla: Soniox speech-to-text and text-to-speech, barge-in, DTMF, a Groq-hosted model. Switch it to farming with `AGENT_DOMAIN=field` (or `domain: "field"` and `fieldRole` in the `/api/llm` body). The model has one tool, `askFieldAssistant`, which runs the same brain on a snapshot the app POSTs to `/api/field/session`; effects the brain queues are fetched with `GET /api/field/session?sessionId=...` and applied by the app. Keys 1-6 per role are in `lib/agent/field/field-prompt.ts`.

Re-sync after editing the brain: `npm run sync:voice`.

## Extending the vocabulary

Add everyday phrases to `src/voice/lexicon.js` (Bangla script, as speech recognisers return it) and a test in `src/voice/voice.test.js`. Keywords of three characters or fewer match only at the start of a word, so "দাম" does not fire inside "বাদামি". Ask farmers and SAAOs how they actually say things; the lists here are a starting point.
