# Video Scripts & Demo Protocols (NASA Space Apps 2026)

**Challenge:** Field Shift: Adapting Farms with NASA Data  
**Project:** FieldShift 360  
**Live Application:** https://nasa-field-shift-360.vercel.app  
**Repository:** https://github.com/razibr246/nasa-field-shift-360  

---

## 1. 240-Second (4-Minute) Local Judging Video: "240 Seconds of Glory"

*Built strictly according to the official Space Apps Bangladesh Participants Guide: 45s Who, 60s Why, 60s What, 75s So What Next. 16:9 Screen Capture & Studio Voiceover (Rural Bangla narration with burned-in high-contrast English subtitles).*

| Time | Structure & Screen Action | Bangla Narration (কথা) | English Subtitle & On-Screen Proof |
| :--- | :--- | :--- | :--- |
| **0:00–0:45** (45s) | **PART 1: WHO WE ARE & OUR MISSION**<br>• Drone flyover of Barind & Rupganj (NASA Images/ISS).<br>• Team introduction & multidisciplinary roles.<br>• Split screen: Smallholder farmer holding Android phone beside cracked paddy field. | আমরা টিম ফিল্ডশিফ্ট ৩৬০। বাংলাদেশের সাড়ে ১৬ মিলিয়ন ক্ষুদ্র কৃষকের জন্য নাসার মহাকাশ গবেষণাকে মাটির সিদ্ধান্তে রূপান্তর করাই আমাদের লক্ষ্য। আমাদের দলে রয়েছেন সফটওয়্যার আর্কিটেক্ট, কৃষি তথ্য বিশেষজ্ঞ, গেম ডেভেলপার এবং প্রান্তিক কৃষক প্রতিনিধি। আমরা দেখেছি, পূর্বপুরুষদের কাছ থেকে পাওয়া ফসলি ক্যালেন্ডার এখন জলবায়ু পরিবর্তনের কারণে ভেঙে পড়েছে। কিন্তু মহাকাশে ঘুরতে থাকা নাসার স্যাটেলাইটগুলোর কাছে এই মাটির ভবিষ্যৎ স্পষ্ট। আমাদের কাজ—জটিল সায়েন্সকে কৃষকের হাতের তালুতে নিয়ে আসা। | We are Team FieldShift 360. Our mission is translating NASA Earth observations into actionable decisions for Bangladesh’s 16.88 million smallholder farmers. Our multidisciplinary team combines software engineering, agronomy, game design, and rural advocacy. The crop calendar our farmers inherited no longer fits changing rains. But NASA satellites see what is coming. We bridge satellite physics to the farmer’s palm. |
| **0:45–1:45** (60s) | **PART 2: WHY IT MATTERS (THE CRISIS)**<br>• NASA GRACE map: Deep red groundwater depletion over Godagari (-8.9 cm/decade).<br>• GPM IMERG vs BMD station onset graph showing monsoon erratic shift (±18 days).<br>• NASA POWER 25-yr heatwave trend crossing 35°C flowering threshold during Boro.<br>• Pan across Godagari demo field with SoilGrids 250m profile badge. | কেন এটি জাতীয় সংকট? দেখুন—নাসার গ্রেস (GRACE) স্যাটেলাইটের তথ্য বলছে বরেন্দ্র অঞ্চলে ভূগর্ভস্থ পানির স্তর প্রতি দশকে প্রায় ৯ সেন্টিমিটার নেমে যাচ্ছে। জিলে-পিপিএম (GPM IMERG) দেখাচ্ছে বর্ষা শুরু হওয়ার দিন ১৮ দিন পর্যন্ত এদিক-সেদিক হয়ে যাচ্ছে। আর বোরো ধান যখন ফোটে, তখন নাসার পাওয়ার (NASA POWER) ডেটাসেটে দেখা যাচ্ছে তাপপ্রবাহ বারবার ৩৫ ডিগ্রি সেলসিয়াস অতিক্রম করছে। এক মৌসুমের ভুল সিদ্ধান্তে একটি কৃষক পরিবার ঋণের জালে আটকে যায়। প্রচলিত আবহাওয়া পূর্বাভাস শুধু আজকের কথা বলে; কিন্তু মাটির স্বাস্থ্য রক্ষা করে দশ বছরের টেকসই ফসলচক্র পরিকল্পনার কোনো সহজ ব্যবস্থা এত দিন ছিল না। | Why is this critical? NASA GRACE data reveals groundwater under northwest Bangladesh is plummeting ~8.9 cm per decade. GPM IMERG shows monsoon rains shifting by up to 18 days, making traditional sowing disastrous. NASA POWER temperature series prove terminal heat during Boro flowering routinely breaches 35°C. Single-season advice is not enough. Smallholders need a 10-year rotational roadmap that restores soil organic matter and protects water without sacrificing household income. |
| **1:45–2:45** (60s) | **PART 3: WHAT WE BUILT (LIVE ENGINE DEMO)**<br>• Open `/farmer/plan` on Godagari field.<br>• Show 3 strategies (KEEP / ADJUST / SHIFT).<br>• Tap priorities: switch from "Maximum Profit" to "Water Conservation". Watch rankings re-weight instantly.<br>• Click `/farmer/future`: 10-year ICBM soil carbon simulation & 40-Future CMIP6 ensemble running in browser in 300ms.<br>• Trigger Chakra Agent: Natural voice question in rural Bangla: *"এবার জমিতে কি দিমু?"* with verified evidence tags (`SAT`, `MODEL`, `RULE`). | আমরা তৈরি করেছি ফিল্ডশিফ্ট ৩৬০—পুরো সিস্টেমটি সরাসরি ওয়েব ব্রাউজারে সেকেন্ডের ভগ্নাংশে চলে। এখানে রহিম মিয়ার জমি নির্বাচন করলেই নাসার ৮টি উপগ্রহ ডেটা ও সয়েলগ্রিডস মাটির মডেল একত্রিত হয়। কৃষক তাঁর অগ্রাধিকার বেছে নেন—বেশি লাভ নাকি পানি সাশ্রয়? নিমিষেই ইন-ব্রাউজার এফএও-৫৬ (FAO-56) ও আইসিবিএম (ICBM) কার্বন ইঞ্জিন শত শত ফসলচক্রের মধ্যে সেরা তিনটি পথ বের করে দেয়: বর্তমান চক্র, সমন্বয়, অথবা পরিবর্তন। এরপর সেরা চক্রটিকে নাসা সিএমআইপি-৬ (NEX-GDDP-CMIP6) এর ৮টি জলবায়ু মডেল ও ৫টি ফলন বছর মিলিয়ে ৪০টি ভবিষ্যতের ওপর চাপ পরীক্ষা করা হয়। সাথে রয়েছে অফলাইন চক্র ভয়েস এজেন্ট, যা গ্রামীণ বাংলায় কথা বলে। | What we engineered: FieldShift 360 executes pure physical and agronomic models client-side in sub-second time. Selecting Rahim’s field in Godagari instantly fuses 8 NASA satellite feeds with SoilGrids pedotransfer data. The farmer tunes priorities—water conservation, soil carbon, or yield. The FAO-56 and ICBM engine evaluates hundreds of rotations into three transparent strategies: KEEP, ADJUST, or SHIFT. The top rotation is stress-tested against 40 futures across 8 NEX-GDDP-CMIP6 climate models and 5 yield years. Offline rural Bangla voice intelligence ensures zero barrier to entry. |
| **2:45–4:00** (75s) | **PART 4: SO WHAT & WHAT NEXT (IMPACT & SCALE)**<br>• Open `/officer/supply`: Upazila-scale Boro water savings calculator (showing 28M m³ groundwater saved if 20% shift to mustard-mung).<br>• Open `/officer/radar`: Ropon Radar transplanting progress tracking Sentinel-1 radar vs GPM rain onset.<br>• Show bilingual testkit protocol (`/testkit`) and honest provenance tags on every metric.<br>• Global scalability: show abroad tabs (India, Pakistan, Nepal, Bhutan, Myanmar running same engine).<br>• End slide: Live URL, GitHub repo, open scientific provenance. | এর প্রভাব কতটুকু? উপসহকারী কৃষি কর্মকর্তার ড্যাশবোর্ডে দেখুন—গোয়াইনঘাট বা গোদাগাড়ীর ২০ শতাংশ কৃষক যদি বোরোর বদলে সরিষা-মুগডাল চক্রে যায়, তবে কোটি কোটি লিটার ভূগর্ভস্থ পানি বাঁচে এবং মিথেন গ্যাস নিঃসরণ কমে। অফিসার দেখতে পান 'রোপণ রাডার'—কোথায় আমন রোপণ পিছিয়ে গেছে। আমাদের প্রতিটি তথ্যে স্বচ্ছ লেবেল—স্যাটেলাইট, স্টেশন নাকি মডেল অনুমান। কোনো মনগড়া ফলাফল নেই। সিস্টেমটি বৈশ্বিকভাবে স্কেলযোগ্য—একই নাসা আর্কিটেকচারে ভারত, পাকিস্তান, নেপাল ও ভুটানের ৫টি দেশে কাজ করছে। ফিল্ডশিফ্ট ৩৬০ কৃষকের হাতে মহাকাশ বিজ্ঞানের শক্তি তুলে দিচ্ছে—মাটি বাঁচবে, বাঁচবে কৃষক। ধন্যবাদ। | Real-world impact: On the Upazila Agriculture Officer dashboard, simulating a 20% shift from high-water Boro to Mustard-Mung豆 saves over 28 million m³ of aquifer water while reducing paddy methane. SAAOs monitor live transplanting lag with Sentinel-1 Ropon Radar. Every single metric displays strict provenance tags (`SAT`, `STATION`, `MODEL`, `RULE`). No black boxes, no invented claims. Completely scalable globally: already operating across 5 neighboring countries with identical NASA inputs. FieldShift 360 brings the full power of NASA Earth science to safeguard our soils and farmers. |

---

## 2. 30-Second Global Judging Video Script

*Designed for high-tempo global review: Hook (5s) → Problem (7s) → Working Product (10s) → Impact & Scalability (8s).*

| Seconds | Beat | Screen Visual | Spoken Audio / Subtitle |
| :---: | :--- | :--- | :--- |
| **0:00–0:05** | **The Hook** | Close-up of parched Barind soil cracking, transitioning to ISS nighttime Earth view. | "A smallholder farmer in Bangladesh loses 40% of his yield to an erratic monsoon he cannot predict." |
| **0:05–0:12** | **The Problem** | NASA NetCDF climate grids and complex GRACE/SMAP data streams stuck behind academic portals. | "NASA has the answers in orbit, but petabytes of satellite data never reach the muddy fields where food is grown." |
| **0:12–0:22** | **The Solution** | Fast-paced UI capture: FieldShift 360 computing 10-year soil carbon, FAO-56 irrigation, and 40 CMIP6 climate futures right inside mobile Safari. | "Meet FieldShift 360. In 300 milliseconds directly in the browser, 8 NASA Earth observation feeds turn into three simple choices: KEEP, ADJUST, or SHIFT—spoken aloud in rural Bangla." |
| **0:22–0:30** | **Impact & Scale** | Officer dashboard saving 28M m³ groundwater; interactive map expanding across Bangladesh, India, Nepal, and beyond. | "Empowering 16.8 million farming families, restoring soil carbon, and ready to scale to every delta on Earth. FieldShift 360." |

---

## 3. Three-Minute Submission Demo Script (Interactive Walkthrough)

**Format:** Bangla narration with English subtitles · 16:9 screen capture · 3:00 total  
**Story:** One sample farmer faces one seasonal choice; compare options, show the evidence and limits, then end with a practical next step.  
**On screen:** Use the live app and the demo account. Rahim and his field are sample data; say so before the first recommendation is shown.  

| Time | Screen and action | Bangla narration | English subtitle |
| --- | --- | --- | --- |
| 0:00–0:20 | Open `/farmer/plan` at `season-compare`. Hold on the three strategies and their labels. | রহিমের এই জমি আর তাঁর হিসাবটি নমুনা। কিন্তু প্রশ্নটি বাস্তব: এই রবিতে কী লাগালে মাটি, পানি আর আয়ের মধ্যে ভালো ভারসাম্য হবে? | Rahim and this field are part of the demo. The question is real: what should he plant this Rabi to balance soil, water and income? |
| 0:20–0:43 | Point to the current rotation and two alternatives. Show the score breakdown; do not zoom past the crop names or labels. | পাশাপাশি দেখুন—এখনকার ফসলচক্র, আর দুটি বিকল্প। একই এলাকার আবহাওয়া ও দাম ধরে প্রতিটির মাটি, সেচ, লাভ আর ঝুঁকি হিসাব করা হয়েছে। | Compare the current rotation with two alternatives. Each is assessed for soil, irrigation, income and risk using the same area weather and prices. |
| 0:43–1:05 | Move to the priorities and crop constraints, then return to the ranking. Change one priority once. | কৃষক ঠিক করেন কোনটা তাঁর কাছে জরুরি—কম পানি, বেশি আয়, ভালো মাটি, আগাম ফসল বা গবাদিপশুর খাবার। যা চাষ করা সম্ভব নয়, সেটিও বাদ দিতে পারেন। | The farmer chooses what matters: less water, more income, healthier soil, an early harvest or fodder. Crops they cannot grow can be ruled out. |
| 1:05–1:30 | Open `how-made`, then `/science#coverage`. Pause on provenance labels and scale. | প্রতিটি সংখ্যার পাশে তার উৎস। আবহাওয়া এলাকার মডেল হিসাব; মাটির তথ্য ২৫০ মিটারের SoilGrids অনুমান—জমির মাটি পরীক্ষা নয়। কৃষক ও জমির বিবরণ নমুনা। | Every number carries its source. Weather is an area-scale model estimate; soil is a 250-metre SoilGrids estimate, not a field test. The farmer and field record are samples. |
| 1:30–1:52 | Show the three strategy briefs and soil comparison in `/farmer/future`. Pause on evidence, unknowns and checks. | প্রতিটি বিকল্পে আছে কেন প্রস্তাব করা হয়েছে, কী সুবিধা হতে পারে, কী জানা নেই, ঝুঁকি কী, আর সিদ্ধান্তের আগে মাঠে কী যাচাই দরকার। | Each option explains why it was suggested, possible benefits, what remains unknown, its risks and what to check in the field before acting. |
| 1:52–2:15 | Show the eight-model test. Keep the model count and uncertainty language visible. | এরপর সেরা বিকল্পগুলো ৮টি জলবায়ু মডেল ও ৫টি ফলন বছরের সঙ্গে আবার চালানো হয়। কোন ফল কত সম্ভাব্য ভবিষ্যতে টেকে, সেটিও দেখা যায়। | The leading options are then replayed with eight climate models and five yield years. We can see how often each holds across those possible futures. |
| 2:15–2:38 | Return to `/farmer/plan#first-step`. Show the crop, timing and first checks; do not imply the plan has been field-tested. | পরামর্শ মানেই নির্দেশ নয়। এখানে প্রথম ধাপ, বীজ, সেচ আর মাটি পরীক্ষা করার কথা আছে—তারপর কৃষক ও কৃষি কর্মকর্তার সঙ্গে মিলিয়ে সিদ্ধান্ত। | A recommendation is not an instruction. The plan shows the first step and checks for seed, water and soil, so the farmer can decide with an agriculture officer. |
| 2:38–3:00 | End on the farmer/officer connection or the Science page. Leave the project name and live-site URL on screen for the final 4 seconds. | FieldShift 360—নাসার পৃথিবী পর্যবেক্ষণ আর স্থানীয় কৃষি তথ্য দিয়ে ফসলচক্রের সম্ভাবনা তুলনা করে। বাস্তব মাঠে কৃষক ও কৃষি কর্মকর্তার যাচাই এখনো দরকার। | FieldShift 360 uses NASA Earth observations and local agricultural information to compare rotation options. Farmers and agriculture officers still need to validate them in real fields. |

---

## 4. Recording & Video Production Protocol

1. **Resolution & Capture:**
   - Record in native 1920×1080 (1080p) or 3840×2160 (4K), 60 or 30 fps, with browser address bar and devtools hidden.
   - Smooth mouse movement with 500ms easing or clean jump cuts synced to voice pauses.
2. **Subtitles & Typography:**
   - Burn-in dual-language or high-contrast English subtitles (Inter/Roboto, 42pt, yellow `#FACC15` or crisp white `#FFFFFF` with `#000000` 80% box or drop shadow).
   - Keep subtitles inside the title-safe area (bottom 15% margin).
3. **Audio Quality:**
   - Clear vocal isolation recorded on cardioid condenser microphone with gentle compression and -14 LUFS integrated loudness.
   - Ambient delta soundscape (crickets, flowing water, morning birds) mixed at -26 dB under voiceover.
4. **Data Honesty on Camera:**
   - Never blur or edit out the `<Tags list={[...]} />` provenance chips (`SAT`, `MODEL`, `RULE`, `DEMO`).
   - Highlight the verification status honestly in narration.
