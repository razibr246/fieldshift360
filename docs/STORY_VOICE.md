# "My field's ten years": narration and video kit

The story player on Field Future ("আমার জমির ১০ বছরের গল্প") speaks its narration in the most natural voice the
device has and saves the animation as a silent video. This kit is for making a version with a high-quality voice in
an outside tool and joining it to that video. The example is the sample farmer Razib Miah (Chauhat, Dhamrai); for
any other farmer, open their story and press **Copy the script**: the app writes the same six lines with their own
numbers.

No reference recording was provided, so nothing here imitates a real person's voice. The direction below is a target
style (warm, conversational Bangladeshi Bangla), and the voices named are stock synthetic voices.

## A. Final narration script

Bangla (the app's default). "…" marks a held pause.

1. এটা রাজিব মিয়ার জমি, ধামরাইয়ের চৌহাট। … নাসার পঁচিশ বছরের আবহাওয়া আর জমির নিজের মাটি দিয়ে দেখি, আগামী দশ বছরে এর মাটির কী হয়।
2. আগে দেখি এখনকার চাষ: বোরো ধান আর রোপা আমন। এভাবে চললে, দশ বছরে মাটির জৈব পদার্থ প্রায় একই থাকে।
3. এবার সেরা ফসলচক্র: টমেটো, পাট আর রোপা আমন; পরের বছর টমেটো, আউশ ধান আর রোপা আমন; আর খড় জমিতেই মিশিয়ে দেওয়া। এতে দশ বছরে জৈব পদার্থ ০.৬ শতাংশ বাড়ে… মানে মাটি ধীরে ধীরে আরও উর্বর হয়।
4. শুধু মাটি নয়, পানিও বাঁচে। প্রতি বিঘায় বছরে প্রায় ১৯৮ ঘনমিটার কম সেচ লাগে। আর জমি থেকে নিট গ্রিনহাউস গ্যাস কমে ৬২ শতাংশ।
5. আবহাওয়া আরও গরম হলে কী হবে? নাসার জলবায়ু মডেলে, দুই হাজার চল্লিশের দশকে… সেরা ফসলচক্রে মাটির জৈব পদার্থ ০.৪ শতাংশ কমে, আর এখনকার চাষে ০.৮ শতাংশ কমে।
6. সিদ্ধান্ত অবশ্যই আপনার। … শুরু করার আগে একবার উপজেলা কৃষি অফিসার মোঃ ওমর ফারুকের সঙ্গে কথা বলে নিন।

English:

1. This is Razib Miah's field, in Chauhat, Dhamrai. … With twenty-five years of NASA weather and the field's own soil, let's see what happens to it over the next ten years.
2. First, farming as now: Boro rice and T. Aman. Carry on like this, and in ten years the soil's organic matter stays about the same.
3. Now the best rotation: Tomato, Jute and T. Aman; the next year, Tomato, Aus rice and T. Aman, with the straw ploughed back in. With this, in ten years organic matter rises by 0.6 per cent… so the soil slowly grows richer.
4. It saves water as well as soil: about 198 cubic metres less irrigation per bigha, every year. And the field's net greenhouse gas falls by 62 per cent.
5. And if it gets hotter? In NASA's climate models, in the twenty-forties… with the best rotation, the soil's organic matter falls by 0.4 per cent; farming as now, it falls by 0.8 per cent.
6. The decision is, of course, yours. … Before you start, have a word with your upazila agriculture officer, Md. Omar Faruk.

The numbers are the engine's (Field Future, today's weather; the 2040s from NEX-GDDP-CMIP6, middle pathway). Keep
them exactly as written; if the field or the farmer's priorities change, copy the script again.

## B. Voice direction

- **Who:** a calm, friendly extension worker talking to one farmer, not an announcer. Standard Bangladeshi Bangla.
- **Pace:** unhurried, about 130–140 words a minute (Bangla neural voices: rate about −8%).
- **Pitch and energy:** mid pitch, warm, steady; a little lift on questions (line 5).
- **Pauses:** about 0.4 s after each sentence, 0.7 s at each "…".
- **Emphasis:** the result in each line: "প্রায় একই থাকে", "০.৬ শতাংশ বাড়ে", "পানিও বাঁচে", "১৯৮ ঘনমিটার", "৬২ শতাংশ", and
  "সিদ্ধান্ত অবশ্যই আপনার".
- **Avoid:** drama, a sales tone, rushing the numbers, reading "+" or "%" as symbols.

## C. Scene-by-scene plan

The saved video (1080 × 1350, portrait) gives each scene at least the time its words take, so a voice made from
script A lines up with it. Bangla timings; English runs about 10% longer.

| Scene | Time (Bangla) | On screen | Line |
| --- | --- | --- | --- |
| 1 | 0.0 – 10.6 s | Title "আমার জমির ১০ বছর", the farmer's name, village and upazila, the three NASA and soil sources | 1 |
| 2 | 10.6 – 18.0 s | "Farming as now", its crops, a grey line of soil organic matter over ten years, the change | 2 |
| 3 | 18.0 – 32.5 s | "The best rotation", its crops, the green line drawn over the grey, the change | 3 |
| 4 | 32.5 – 41.9 s | Two cards counting up: irrigation saved per bigha a year, and the cut in net greenhouse gas | 4 |
| 5 | 41.9 – 53.9 s | "In the 2040s, in NASA's climate models": two bars, as now against the best rotation | 5 |
| 6 | 53.9 – 62.3 s | "The decision is yours", the officer's name, FieldShift 360, the sources and "a sample farmer" | 6 |

## D. Generation prompt

For any text-to-speech service with a Bangladeshi Bangla (bn-BD) neural voice. With Azure AI Speech, the stock
voices are `bn-BD-NabanitaNeural` (female) and `bn-BD-PradeepNeural` (male); this SSML speaks script A as directed:

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="bn-BD">
  <voice name="bn-BD-NabanitaNeural">
    <prosody rate="-8%">
      এটা রাজিব মিয়ার জমি, ধামরাইয়ের চৌহাট। <break time="700ms"/> নাসার পঁচিশ বছরের আবহাওয়া আর জমির নিজের মাটি দিয়ে দেখি, আগামী দশ বছরে এর মাটির কী হয়। <break time="900ms"/>
      আগে দেখি এখনকার চাষ: বোরো ধান আর রোপা আমন। <break time="400ms"/> এভাবে চললে, দশ বছরে মাটির জৈব পদার্থ <emphasis level="moderate">প্রায় একই থাকে</emphasis>। <break time="900ms"/>
      এবার সেরা ফসলচক্র: টমেটো, পাট আর রোপা আমন; পরের বছর টমেটো, আউশ ধান আর রোপা আমন; আর খড় জমিতেই মিশিয়ে দেওয়া। <break time="400ms"/> এতে দশ বছরে জৈব পদার্থ <emphasis level="moderate">০.৬ শতাংশ বাড়ে</emphasis>। <break time="700ms"/> মানে মাটি ধীরে ধীরে আরও উর্বর হয়। <break time="900ms"/>
      শুধু মাটি নয়, <emphasis level="moderate">পানিও বাঁচে</emphasis>। <break time="400ms"/> প্রতি বিঘায় বছরে প্রায় ১৯৮ ঘনমিটার কম সেচ লাগে। <break time="400ms"/> আর জমি থেকে নিট গ্রিনহাউস গ্যাস কমে ৬২ শতাংশ। <break time="900ms"/>
      আবহাওয়া আরও গরম হলে কী হবে? <break time="400ms"/> নাসার জলবায়ু মডেলে, দুই হাজার চল্লিশের দশকে <break time="700ms"/> সেরা ফসলচক্রে মাটির জৈব পদার্থ ০.৪ শতাংশ কমে, আর এখনকার চাষে ০.৮ শতাংশ কমে। <break time="900ms"/>
      <emphasis level="moderate">সিদ্ধান্ত অবশ্যই আপনার</emphasis>। <break time="700ms"/> শুরু করার আগে একবার উপজেলা কৃষি অফিসার মোঃ ওমর ফারুকের সঙ্গে কথা বলে নিন।
    </prosody>
  </voice>
</speak>
```

For a tool that takes plain instructions instead of SSML:

> Read this Bangla script as a calm, friendly agriculture extension worker speaking to one farmer in standard
> Bangladeshi Bangla. Unhurried pace (about 130–140 words a minute), mid pitch, warm and steady. Pause about 0.4
> seconds after each sentence and 0.7 seconds at each "…". Stress the result in each line (প্রায় একই থাকে,
> ০.৬ শতাংশ বাড়ে, পানিও বাঁচে, ১৯৮ ঘনমিটার, ৬২ শতাংশ). No dramatic or sales tone. Say every number in full, in Bangla.

Joining the voice to the saved video (the file "ভিডিও নামান" downloads):

```bash
ffmpeg -i fieldshift-razib-10-years.webm -i narration.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest razib-story.mp4
```

## E. Quality checklist

- [ ] Every number and name matches script A (copy it again from the app if the field or priorities changed).
- [ ] Place names are said correctly: ধামরাই, চৌহাট, রোপা আমন, আউশ; "দুই হাজার চল্লিশের দশক" is said in words.
- [ ] "০.৬", "১৯৮", "৬২" are read as numbers, not digit by digit; "শতাংশ" is said, not "percent sign".
- [ ] Pauses fall at the sentence ends and the "…"; nothing is rushed or clipped.
- [ ] Each line starts as its scene appears (table C); the last line ends before the video does.
- [ ] Audio is clean: no clipping, no background hiss, even loudness from line to line.
- [ ] The closing scene still shows "a sample farmer" and "model estimates, not forecasts".
- [ ] The voice is a stock synthetic voice (or the farmer's own, with their consent); it imitates no real person.
