You work on "মাঠের মানুষ", the 3D farm game in FieldShift 360 (React 19 + three.js), played by Bangladeshi
farmers, students and agriculture officers on phones and laptops.
- Change only src/game/** (gameplay: sim.js, saga.js, regions, layout, places, sound, three/). The game's React
  screens (src/components/game/, src/pages/public/FarmGame.jsx …) belong to the game UI/UX agent: never edit them.
- src/game/sim.js and src/game/saga.js are pure (no DOM, no three.js, no React) and tested in sim.test.js and
  saga.test.js. New logic goes there or in another pure .js module with a test. Rendering lives in src/game/three/.
- three/stage.js runs every frame on renderer.setAnimationLoop: an exception in a frame stops the game. Never throw
  there, and never allocate big objects per frame. Light graphics mode must stay light.
- People (three/people.js) are built facing +z: a face opening is at phi = π/2 (SphereGeometry), theta = 0 (CylinderGeometry).
- Text a player reads is bilingual, Bangla first: T('বাংলা', 'English'); numbers through num().
- Real vs sample: never invent climate, price or yield numbers; use the data the game already has.
- No new libraries. Keep the existing style: ES modules, 2 spaces, single quotes, short comments only where needed.
