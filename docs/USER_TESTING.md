# Testing with farmers and officers

A protocol and record for testing the main flow with Bangladeshi farmers and agriculture officers. **The team
reports that farmer and officer validation has been completed.** The date, place, participant counts, tasks,
findings and resulting fixes have not yet been added to this record; do not infer them from the protocol below.

**Run it with the kit in the app: `/testkit`.** It reads the consent, times the four tasks, records the three
questions and the problems seen (never a name), and exports a CSV and ready-made rows for the results table below.

## Who

- 6–8 farmers across two upazilas, including at least two who read little or no Bangla, at least two women, and at
  least two using a low-end Android phone (2 GB RAM or less, a slow 3G/4G connection).
- 2–3 Sub-Assistant Agriculture Officers (SAAO) and one Upazila Agriculture Officer.
- Consent read aloud in Bangla; no names or phone numbers recorded; the farmer may stop at any time.

## The task (farmers, 15 minutes, no help)

Start on the farmer home page. The four-step path on it is the whole task:

1. Choose your field (on the map).
2. Say what matters this season.
3. Compare the options.
4. Send it to your officer.

Then ask, without showing the screen, the three questions. Record the answer in their words:

| Question | Counts as understood when the farmer… |
| --- | --- |
| **What is recommended?** | names the crop and roughly when to sow |
| **Why?** | gives at least one real reason shown (weather in past seasons, water, profit, soil) |
| **What should you check before acting?** | names at least one check (soil test, seed, water turn, drain, talk to the officer) |

Repeat the three questions once by **voice** (`/farmer/voice`, "বিকল্পগুলোর তুলনা") and once by **SMS mode**
(`/farmer/sms`) for the farmers who prefer them.

## What to watch

- Bangla wording a farmer does not use or misreads; Bangla numerals read correctly; dates in Bangla months.
- Touch targets missed (the app aims for 44 px), text too small outdoors, glare.
- Loading time on the slow phone (first page, the plan, Field Future); what happens offline (airplane mode after load).
- Screen reader (TalkBack in Bangla) on the plan page: are the score rings, the "why" bar and the checklist read out?
- Whether "a close call" and "estimate, not a soil test" are understood, and whether anyone takes a ranking as a promise.

## Officers (20 minutes)

Open a farmer's sent comparison in the officer view and answer it; then review the crop rules at `/science#rules`
(record anything they would change in `docs/REVIEW_LOG.md`).

## Results

| Date | Place | Who (role, no names) | Phone | Q1 recommended | Q2 why | Q3 check | Problems seen | Fixed in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Team reports validation complete; session date not recorded | Not recorded | Farmers and agriculture officers; counts not recorded | Not recorded | Results not recorded | Results not recorded | Results not recorded | Findings not recorded | Add actual findings and fixes from the team record |
