# Documentation

Start with the project [`README`](../README.md): what FieldShift 360 is, the challenge line by line, how to run it.
Then, by what you need:

## For judges and the submission

| Document | What it covers |
| --- | --- |
| [`SUBMISSION.md`](SUBMISSION.md) | The Space Apps submission kit: project description, impact, validity, datasets, demo video script, slide notes |
| [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | The three-minute demo, shot by shot, with Bangla narration, subtitles and the fallback recording plan |
| [`EVIDENCE.md`](EVIDENCE.md) | One-page evidence sheet: every dataset's kind, years and scale, the model assumptions, and the validation done so far |

## Science and data

| Document | What it covers |
| --- | --- |
| [`DATA_SOURCES.md`](DATA_SOURCES.md) | Every data file in the app: source, dates, whether it is real, rule or sample, and the script that makes it |
| [`DATA.md`](DATA.md) | A short overview of the data: what is real, how the soil is built, how to refresh it |
| [`THRESHOLDS.md`](THRESHOLDS.md) | Every crop limit and assumption the advice rests on, with its source, and the known problems |
| [`REVIEW_LOG.md`](REVIEW_LOG.md) | Who has reviewed the crop rules and soil assumptions, and what a reviewer should check first |
| [`USER_TESTING.md`](USER_TESTING.md) | The protocol for testing with farmers and agriculture officers, and where results are recorded |
| [`SECURITY.md`](SECURITY.md) | Current API boundaries, production fail-closed behavior, AI rate limits, deployment checks and remaining security work |
| [`CHANGELOG.md`](CHANGELOG.md) | Dated, evidence-backed user-visible and operational changes |
| [`RADAR.md`](RADAR.md) | The Aman rain-onset rule and Ropon Radar, and their check against BMD stations |

## The product

| Document | What it covers |
| --- | --- |
| [`VOICE.md`](VOICE.md) | The Bangla voice and SMS assistant for farmers and officers |
| [`STORY_VOICE.md`](STORY_VOICE.md) | The field story's narration: script, voice direction, scene timings and a ready voice prompt |
| [`MERGE.md`](MERGE.md) | How FieldShift 360, Ropon Radar and the voice agent were brought into one repository |

For code: [`AGENTS.md`](../AGENTS.md) (the guide for every developer and coding agent), [`scripts/README.md`](../scripts/README.md)
(every data and photo script) and [`src/data/README.md`](../src/data/README.md) (every data folder).
