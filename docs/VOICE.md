# Voice assistant (Bangla, farmer and officer)

## Try it

`npm run dev`, open `/farmer/voice` or `/officer/voice`. Tap the mic (Chrome, Edge or Android Chrome; Bangla listening needs an internet connection because the browser sends audio to its own recogniser). If the device has no Bangla voice the replies stay as text. You can always type instead.

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
