# Prompts: the people of the games

Copy-ready prompts for a coding agent working in this repository, one per part of the people in the two games:

- **মাঠের মানুষ (Field Folk)**, the adult 3D farm game (`/farm`, `/saga`): procedural low-poly people built in code.
- **স্বপ্নের মাঠ (The Dream Field)**, the children's game (`/kids`): rigged, animated CC0 models.

How to use: paste **Common rules** first, then one prompt. Run one prompt per session, review the result, then go on.
The order below works well (bodies before faces, faces before clothing, clothing before animation), but each prompt
stands on its own.

---

## Common rules (paste above every prompt)

```text
You are working in the FieldShift 360 repository (Vite + React 19, three.js). Before anything else:

1. Read AGENTS.md and follow it. Run `git status` and `git diff` on every file you plan to touch: other agents edit
   this repo at the same time. Change only the lines you need; never write a whole file back from an older copy;
   never revert someone else's change. If a file you need is mid-edit by another agent, say so and work around it.
2. Keep pure logic (rules, data, choices, text) in plain modules with Node tests (src/game/*.js, src/engine/*.js);
   keep rendering in src/game/three/ and UI in .jsx. Node cannot import .jsx.
3. Bangla first, English complete: every visible string goes through T(bn, en) or L({ bn, en }); numbers through
   num() / bnDigits(). No string in one language only.
4. Truth: the people are sample people; places, weather, soil, prices and yields are real. Never invent a fact about
   a real place, culture or dataset. Clothing and customs must be accurate and respectful; name your source in a
   code comment when you rely on one.
5. Accessibility: respect prefers-reduced-motion; never rely on colour alone; touch targets at least 44 px; text
   readable at 390 px wide.
6. Performance: the games must run on a low-end Android phone. Measure before and after (draw calls via
   renderer.info, frame time); keep "light" graphics mode fast (stage.js lightGraphics()).
7. Work in small, reviewable steps. First trace what exists and list the 3–5 biggest problems for this topic with
   evidence (screenshots, numbers, code lines). Then give a short plan tied to what the player will see. Then build.
8. Validate: `npm test` and `npm run build` must pass. Open the affected screens at desktop (1280×800) and phone
   (390×844) sizes and look at them (Playwright, or headless Chrome over CDP; in dev, window.__fsGame drives the
   adult game). Compare before and after screenshots of the same moment.
9. Report: what changed, which problem each change fixes, what you verified and how, and what is still weak. Do not
   claim it is "the best"; show the evidence.
```

---

# Part A: মাঠের মানুষ, the adult game

Files: `src/game/three/people.js` (bodies, faces, clothes, tools, `animate()`), `src/game/three/life.js`
(villagers), `src/game/three/stage.js` (camera, lights, loop), `src/game/regions.js` and `regions_bd.js` (each
farmer's `look`), `src/pages/public/FarmGame.jsx` (picker, HUD, end screen).

## A1. Bodies and proportions

```text
Goal: every farmer and villager in মাঠের মানুষ reads instantly as a believable adult person at the play camera's
distance (about 5 m, over the shoulder), with a clear silhouette and healthy proportions, in the game's stylised
low-poly look.

Start from src/game/three/people.js buildFarmer(look): the lathe torso (torsoShape), limb(), the shoulder caps, the
head (scale 1), hands with fingers, and the feet. look.build scales the whole body.

Do:
- Check proportions against a real adult (about 7.5 heads tall; shoulder width about 2 heads for men, a little less
  for women; hips, waist, arm length reaching mid-thigh). Fix what is off, gently: stylised, not realistic.
- Make the silhouette readable from behind and the side (the player mostly sees the back): neck, shoulder slope,
  elbow and knee bends at rest, a slight forward lean when walking.
- Distinguish age and build: an older farmer (look.age if present, or beard colour) stands a little stooped; a heavy
  build is broader, not just scaled; women's builds differ by shape, not only by size.
- Hands and feet: big enough to read at 5 m; no fingers poking through tools; feet planted flat on the ground.
- No gaps or seams at the joints in any pose animate() produces (walk, run, act, cheer, fall).
Acceptance: a side-by-side turntable of all 12 farmers before and after; each passes the "who is this at 5 m from
behind" test; no joint gaps in a captured walk cycle; draw calls per person not increased by more than 10%.
```

## A2. Faces and expression

```text
Goal: faces in মাঠের মানুষ that look alive and kind, recognisable per farmer, and that react to what happens.

Start from the painted face in people.js (faceTex, FACES, faceFor: a canvas painted onto a patch of the head
sphere, with brows, almond eyes, lips, stubble or beard) and the 3D nose and jaw.

Do:
- Add a blink (every 3–6 s, randomised, about 120 ms) and let the eyes look toward the camera or the act target
  when idle. Respect reduced motion (keep the blink, drop the look-around).
- Add a small set of expressions driven by game state: calm, focused (acting), worried (heatwave, storm warning,
  pests), happy (harvest, sale, mission done), tired (low stamina), hurt (caught in the storm). Swap or blend face
  textures or offset the brow and mouth shapes; keep it subtle and never comic.
- Each farmer's face should stay theirs: keep FACES.razib's likeness rules; make the automatic faces vary (eye
  shape, brow weight, nose width, wrinkles for age) from look, not random per load.
- The face must never be covered by hair, a head covering or a beard (see the face-opening rule in AGENTS.md:
  phi = π/2 for a SphereGeometry, theta = 0 for a CylinderGeometry).
Acceptance: close-up captures of all 12 faces in calm, worried and happy states; a 10 s idle capture shows blinking;
expressions change on the events above (write a test for the pure part: event → expression).
```

## A3. Clothing and cultural accuracy

```text
Goal: each farmer's clothes in মাঠের মানুষ are accurate to their place, worn correctly, layered cleanly, and
rich enough to look handmade, without hurting performance.

The 12 farmers (regions.js look): Bangladesh: lungi, kurta, fotua, gamcha, tupi, sari, hijab, mathal, dhoti, polo
and cargo trousers; India: dastar (turban) and kurta-pyjama with a kara; Pakistan: Sindhi topi, shalwar kameez,
ajrak; Nepal: Tharu ghagra, choli, orhni, silver jewellery; Bhutan: kira, tego, wonju; Myanmar: longyi, eingyi,
gaung baung.

Do:
- Check each garment against a reliable source (cite it in a comment): how a lungi is folded and tucked for field
  work, how a sari's pallu falls, how a dastar is wound, where a gaung baung's knot sits, how a kira is fastened.
  Fix what is wrong. Never caricature.
- Layering: no garment pokes through another in any animate() pose (hems over waistbands, sleeves over wrists,
  head coverings over hair). Look from the front, back and side, and while walking and bending to sow.
- Fabric: patterns from canvasTex (check, ajrak, bands, pallu) at a sensible scale; a little sheen on cotton, none on
  wool; dust or mud at the hem after field work if cheap to do.
- Respect: a woman's head covering stays on in every action; no immodest gaps.
- Keep materials shared through the mat() cache; no new texture per person per frame.
Acceptance: front, back and side captures of every farmer, still and mid-sow; a short note per farmer with the
source for each garment; zero clipping in those captures.
```

## A4. Animation and movement

```text
Goal: the farmer in মাঠের মানুষ moves with weight and intent: walking, running, turning, stopping, and every farm
action feel physical and satisfying.

Start from animate(P, { speed, run, act, down, t, carrying }) in people.js and the action types the sim emits (sim.js
ACT_TIME: plant, water, harvest, spray, clear, pump, sell, cheer, idles such as wipe, phone, adjust).

Do:
- Walk and run cycles: contact, down, pass and up poses; hips sway and dip; shoulders counter-rotate; arms swing
  with the opposite leg; the head stays steady. Stride length matches speed so feet do not slide (measure: foot world
  position during contact must not move more than 2 cm).
- Starts, stops and turns: a lean into acceleration, a settle on stopping, the body turning before the feet on a
  sharp turn. Blend between states over 0.15–0.25 s instead of snapping.
- Actions: each one reads from behind at 5 m: sowing bends at the hips and scatters seed in an arc; watering tilts
  the can with the water stream; harvesting bends and pulls; spraying pumps the tank; selling hands over the basket.
  Anticipation, action, follow-through. The sim's ACT_TIME stays the same unless you change it on purpose and keep
  the tests passing.
- Carrying a full basket changes the walk. Falling in the storm (down > 0) and getting up look safe, not violent.
- Reduced motion: keep animation, but no camera shake or bounce.
Acceptance: short captures (frame strips) of walk, run, a sharp turn, each action and the fall; the foot-slide
measurement before and after; `npm test` still wins all twelve seasons (sim.test.js).
```

## A5. Control feel through the body

```text
Goal: in মাঠের মানুষ, the player feels in control of the farmer's body on keyboard, mouse, touch and gamepad.

Start from stage.js (inputVector, the camera follow and over-the-shoulder offset, cam.look, the touch joystick in
FarmGame.jsx TouchControls) and sim.js (me.vx/vz, speed, run, stamina, collision via resolve, the "bump").

Do:
- Responsiveness: from key press to visible movement under 100 ms; acceleration and deceleration curves that feel
  quick but not twitchy; turning radius that suits a person (no instant 180° spin while running).
- Camera: follows smoothly, never clips into houses or trees, recentres behind the farmer when moving, gives room to
  see the plot being worked; pinch and wheel zoom limits that keep the farmer readable.
- Touch: the joystick has a dead zone and a run threshold the player can feel; the act button shows what it will do
  (sow, water, harvest) and is reachable with the right thumb; nothing important sits under the thumbs.
- Gamepad: left stick walks, right stick looks, A acts, a trigger runs (the Gamepad API), matching the VR controls.
- Collisions: sliding along walls instead of sticking; the bump sound only on a real hit.
Acceptance: an input-to-motion latency measurement; a recorded touch session on a 390 px viewport showing no
overlap between thumbs and HUD; the sim tests pass.
```

## A6. Light and materials on people

```text
Goal: people in মাঠের মানুষ are always readable against the field, day and night, in heat and storm, on full and
light graphics, without looking flat or plastic.

Start from people.js personMat() (rim light and shade lift, scaled by personLight), the camera fill light in
stage.js, world.js (sun, hemisphere light, sky colours by phase, heatwave and storm tints), and mat() with sheen.

Do:
- Skin: warm, slightly translucent-looking shading (a cheap wrap-light term) for every skin tone in regions.js; check
  dark and light skin both read well in shade and in full sun.
- Rim and fill: tune personLight through dawn, noon, dusk and night so a farmer under a tree or at night is still a
  clear figure; at night a lantern or lamp near the house should light them warmly.
- Clothes: cotton matte with a soft sheen, metal (kara, bangles, phone) small and bright; no fireflies or aliasing on
  thin parts at phone resolution.
- Shadows: a contact shadow under the feet on light graphics (where shadow maps are off) so people never float.
- Colour vision: the player stands out from the green field for players with red-green colour blindness (check with
  a deuteranopia filter).
Acceptance: captures of the same farmer at dawn, noon, dusk, night, heatwave and storm, on full and light graphics,
and one deuteranopia-filtered capture; frame time on light graphics no worse than before.
```

## A7. Villagers and a living village

```text
Goal: the villagers of মাঠের মানুষ make the place feel alive and support the farming story, without distracting
from play.

Start from src/game/three/life.js (villagers built with buildFarmer, names, speech bubbles, routines) and places.js
(each farmer's named places).

Do:
- Routines tied to the season and time of day: neighbours work their own plots, carry harvests to market, gather at
  the tea stall at dusk, go home at night. Use sim state (time, weather, events), not random wandering.
- Reactions: they hurry home before the storm, fan themselves in the heatwave, point at pests, crowd the market
  during the price crash. Never block the player's path to a station or plot.
- Speech: short Bangla-first lines that teach something true about the place or the season (from regions.js and the
  real records in game/fieldshift.js), shown when the player is near; never spam; one line at a time.
- Variety: villagers' faces, builds and clothes vary within the local style; no two neighbours side by side look
  identical.
- Performance: villagers far from the camera update less often and use fewer parts (a simple LOD).
Acceptance: a 2-minute capture showing routines change from morning to dusk and with the storm; a count of villager
draw calls before and after; no villager ever stands on a station or a plot (add a pure test if the logic allows).
```

## A8. Voices, sounds and speech of people

```text
Goal: people in মাঠের মানুষ sound as alive as they look, and everything said is readable and Bangla first.

Start from src/game/sound.js (procedural sounds, ambience, music), the speech bubble and floaters in stage.js, the
farmer's lines in regions.js (R.lines), and the say/toast/alert events in sim.js. Note: another agent works on
natural voice (api/tts.js, src/voice/speech.js); coordinate before using or changing those.

Do:
- Footsteps that match the ground (dry soil, wet soil, grass, path, water edge) and the pace; effort sounds on hard
  actions (pumping, lifting the basket), soft and not repetitive.
- Speech bubbles: readable at 390 px, never off-screen, never covering the act target; long lines split; queue lines
  so two never overlap; respect a "fewer messages" choice if one exists.
- Optional spoken lines: if the natural voice service is available, voice the farmer's key lines in Bangla (or
  English) with captions always shown; if not, fall back silently.
- Volume balance between music, ambience, effects and voice; everything mutes with the existing mute button.
Acceptance: a list of every line a farmer can say with both languages checked; a capture of bubbles at 390 px; an
audio check that nothing clips and repeated sounds vary.
```

## A9. Performance of people on low-end phones

```text
Goal: the people of মাঠের মানুষ cost as little as possible, so the game holds 30+ fps on a low-end phone on light
graphics, without visible loss of quality.

Start from people.js (many small meshes per person, the mat() material cache, personMat clones), life.js (villager
count) and stage.js (lightGraphics, shadow maps, pixel ratio, post-processing).

Do:
- Measure first: renderer.info.render.calls and triangles with one farmer and with all villagers, and frame time in
  a throttled Chrome (4× CPU slowdown) at 390×844.
- Merge static parts of each person that share a material into one geometry per bone group (torso, head, each limb),
  keeping the joints animated; share geometries between people with the same look.
- LOD: villagers beyond a distance switch to a simpler body; beyond that, hide them or show a billboard.
- Keep personMat's compiled program shared (customProgramCacheKey) and avoid per-frame allocations in animate().
Acceptance: before/after table of draw calls, triangles and frame time on full and light graphics; captures showing
no visible loss at play distance.
```

## A10. Choosing a farmer and the character showcase

```text
Goal: picking who to play in মাঠের মানুষ feels like meeting a real person, and the People page shows everyone at
their best.

Start from FarmGame.jsx SelectScreen (portraits from portraits(), the turning Preview from createPreview in
stage.js, the place, hazard and dress chips) and src/pages/public/People.jsx with src/game/three/characterStage.js.

Do:
- Portraits: consistent framing and light for all 12; the face visible; the farmer's clothes and tools recognisable.
- Preview: idle animation with a small personal gesture (Razib checks his phone, Rahima adjusts her hijab), turning
  slowly; respects reduced motion (stop turning, keep idle).
- Each farmer's card says in one line who they are, where, and what threatens their field (from regions.js); text
  readable on a phone; the start button stays reachable.
- The People page and the game show the same person (same look data); fix any mismatch.
Acceptance: captures of the picker at desktop and phone sizes, every portrait checked; the People page and the game
preview of three farmers side by side.
```

---

# Part B: স্বপ্নের মাঠ, the children's game

Files: `src/game/dream.js` (story, the 12 children, rules; pure, tested in `dream.test.js`),
`src/game/three/dreamScene.js` (the 3D world, `bodyFor`, `kidBody`, moods, mini-games, taps),
`src/game/dreamSound.js`, `src/pages/public/KidsDream.jsx`, `public/models/people/` (six Quaternius CC0 GLBs: read
the LICENSE.md; only peaceful animations may be used).

## B1. The grown-ups' bodies and cultural dress

```text
Goal: each grown-up in স্বপ্নের মাঠ is recognisably the same person as in মাঠের মানুষ, dressed correctly for their
place, using the six rigged models.

Now: bodyFor(id, region) picks one of six GLBs and recolours materials by name (Skin, Shirt, Vest, Detail, Pants,
Hair, Hat, Belt) from regions.js look. All three women share Casual3_Female; nobody has a hijab, dastar, gamcha,
sari, longyi, kira or gaung baung.

Do:
- Build small accessory meshes (head coverings, a sari drape and pallu, a gamcha on the shoulder, a longyi wrap, a
  kira, a Sindhi topi, a dastar, a kara) and attach them to the right bones (Head, Spine, Hips, hands) so they move
  with the animation. Reuse the shapes and patterns from people.js where you can (canvasTex patterns).
- Map each farmer's look (regions.js) to accessories; keep one source of truth, so a change in look shows in both
  games.
- Check each outfit against a reliable source; respectful; a woman's head covering stays on in every animation.
- No clipping in the animations the game uses (Idle, Walk, Run, Victory, Defeat, SitDown, StandUp, PickUp,
  Walk_Carry); test each.
Acceptance: all 12 grown-ups captured in Idle and Walk, front and side, next to the same farmer from মাঠের মানুষ;
zero clipping; models still load under 1.5 s on a fast-3G throttle.
```

## B2. The children

```text
Goal: the 12 children of স্বপ্নের মাঠ look like real, distinct children aged 7–10 from their places, not shrunk
adults, and each is memorable.

Now: kidBody(child, region) uses Casual_Male or Casual_Female, scaled down with a bigger head, in fixed shirt and
trouser colours; CHILDREN in dream.js gives name, age, girl, what they call the grown-up, and their land.

Do:
- Child proportions: bigger head relative to body, shorter legs, rounder face, smaller hands; younger (7) clearly
  smaller than older (10). Do it by bone scaling, not only a uniform scale.
- Distinct looks from their place and family: clothes a child there would wear (school uniform colours, a frock, a
  kurta, a kira, a longyi), hair styles (plaits, a bun under an orhni, short hair), skin from their family's look.
- One small personal item each (a kite, a school bag, a toy boat, a notebook) that fits their story line in dream.js.
- Keep CHILDREN the source of truth; add fields there (with a test) rather than hard-coding in the scene.
Acceptance: a line-up of all 12 children at the same scale, captioned with name and age; each passes "could you pick
this child out of the line-up from their description".
```

## B3. Acting: animation, gaze and gesture

```text
Goal: the people in স্বপ্নের মাঠ act the story: they look at who is talking, react to what happens, and never feel
like mannequins.

Now: play(role, name) cross-fades GLB actions (Idle, Walk, Victory, Defeat, SitDown...) by scene and mood.

Do:
- Gaze: the head and eyes turn toward the speaker, Tara the satellite, or the object of the mini-game (a head
  look-at on the Head bone, limited angles, eased).
- Gestures while talking: small hand moves, nods; the child jumps or claps on success; the grown-up hugs or pats
  the child in the morning scene (simple bone poses layered over Idle).
- Reactions: gentle and safe. Replace Defeat (it may read as collapsing) with a sad, slumped Idle for "the season
  without the data"; no fall, hit or death animations ever.
- Timing: cross-fades 0.3–0.5 s; no snapping; walk speed matches the root motion so feet do not slide.
- Reduced motion: keep acting, drop camera swoops.
Acceptance: a capture of each scene (night, space, field, the two doors, morning) showing gaze and gestures; a check
that no unsafe animation is reachable (a pure test over the scene → animation map).
```

## B4. Faces and feelings for children

```text
Goal: children playing স্বপ্নের মাঠ can read every character's feeling at a glance: happy, worried, surprised,
proud, sleepy.

Do:
- Give the GLB faces simple, bold, friendly expressions: eye shapes and brows (a face decal or morph-like texture
  swap on the head), a blink, a mouth that opens while their line is shown or spoken.
- Drive the feeling from the story state in dream.js (add a mood per line with a test), not from timers.
- Keep faces warm and never scary in the night and storm scenes.
Acceptance: close-ups of a grown-up and a child in five feelings; a test that every line in dream.js has a valid
feeling.
```

## B5. Playing it as a child: interaction and accessibility

```text
Goal: a 6–10-year-old in Bangladesh, who may not read well yet and may use a parent's cheap phone, can play
স্বপ্নের মাঠ start to finish alone.

Start from KidsDream.jsx, the taps in dreamScene.js (onTap hit-testing), the mini-games (catch the rain clouds,
cover the bare soil, give just enough water, the two doors) and dreamSound.js.

Do:
- No reading required: every instruction is also shown (an animated hand or arrow) and, if the voice service is
  available, spoken in Bangla; captions always on.
- Big targets (64 px or more), forgiving hit areas, no time pressure that can make a child fail and feel bad;
  success is celebrated, a miss gets a gentle retry.
- Pacing: lines advance on tap; a child can't skip past a mini-game's instructions by accident.
- One hand, portrait phone; works offline after first load; respects reduced motion; colour-blind safe (shapes and
  icons, not only colours).
Acceptance: a timed play-through at 390×844 by script; every mini-game playable with taps only; a list of every
instruction and how it is shown without reading.
```

## B6. Tara the satellite

```text
Goal: Tara, the chatty NASA satellite who guides স্বপ্নের মাঠ, is a lovable character children remember, and
everything she says about the place is true.

Do:
- Design: a friendly face on a recognisable satellite shape (solar panels as "arms"), expressive (bobbing, panels
  waving, eyes), glowing softly in space and visible by day.
- Voice and words: short, warm, Bangla first; the facts she says come from dream.js and the place's real records
  (engine/landsat.js landSummary); never invent a number. Check every fact line against its source.
- She points to what she talks about (a beam or arrow to the cloud, the bare plot, the dry soil).
Acceptance: captures of Tara in each scene; a test that each fact line resolves to a real record for all 12 places.
```

## B7. Loading and performance of the models

```text
Goal: স্বপ্নের মাঠ starts fast and runs smoothly on a low-end phone, and never shows a broken or missing person.

Do:
- Measure first: GLB download sizes, parse time, draw calls and frame time at 390×844 with 4× CPU throttle.
- Load each GLB once and clone with SkeletonUtils (already used); preload the next scene's models during the
  current one; compress (Draco or meshopt) and resize textures if it saves real time, keeping the files licensed and
  credited (update public/models/people/LICENSE.md if files change).
- A friendly loading moment (Tara spinning) instead of a blank screen; if a model fails, fall back to a simple
  stand-in and keep playing.
- Mixers update only for people on screen.
Acceptance: before/after table of load time and frame time; a forced-failure test showing the fallback.
```

---

# Part C: both games

## C1. One person, three places

```text
Goal: every farmer looks like the same person in মাঠের মানুষ (people.js), in স্বপ্নের মাঠ (dreamScene.js bodyFor),
on the People page (characterStage.js) and in the story campaign (saga.js CAST).

Do:
- Keep regions.js look (and saga.js CAST look) as the single source; derive both renderers from it. List every field
  each renderer ignores, and either use it or remove it.
- Add a pure test that every farmer's look has the fields both renderers need (skin, hair, head, top, lower, colours).
- Capture each farmer in all three places side by side and fix mismatches (colour, head covering, beard, build).
Acceptance: a 12-row comparison sheet of captures; the new test passing.
```

## C2. Testing people properly

```text
Goal: changes to the people of either game can't silently break them.

Do:
- Pure tests (Node): looks are complete; every animation or expression name used exists; no unsafe animation in the
  children's game; every visible string has bn and en.
- A visual check script (headless Chrome or Playwright) that opens /farm, /kids and the People page at 1280×800 and
  390×844, drives a few moments (window.__fsGame for the adult game), saves screenshots to a scratch folder and
  reports console errors. Document how to run it in scripts/README.md.
- Never commit the screenshots.
Acceptance: the tests in npm test; the script run once with its output listed.
```

## C3. Final review of the people

```text
Goal: an honest, evidence-based review of the people in both games after the other prompts, and the last fixes.

Do:
- Play both games start to finish at desktop and phone sizes, in Bangla and English, with reduced motion on and off.
- Rate each part (bodies, faces, clothing, animation, control feel, light, villagers, sound, performance, children,
  Tara, consistency) from 1 to 5 with a screenshot or measurement as evidence, and name the single biggest weakness
  of each.
- Fix the three weakest, then re-rate them.
Acceptance: the before/after ratings with evidence; npm test and npm run build passing.
```
