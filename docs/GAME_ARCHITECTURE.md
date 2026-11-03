# FieldShift 360: Game Architecture & Technical Systems
**Architecture Version**: 2.4.0  
**Frameworks**: Vite, React 19, Three.js (WebGL 2.0 / WebXR), Web Audio API  
**Target Execution**: 100% In-Browser Client Side, Zero Heavy Asset Downloads

---

## 1. High-Level Architectural Overview

FieldShift 360 enforces a strict architectural decoupling between **Game Rules**, **Three.js WebGL Rendering**, and **React 19 User Experience Layers**.

```mermaid
flowchart TB
    subgraph Engine ["Game Rules and Data (src/game/*.js)"]
        SIM["sim.js (State Machine & Physics)"]
        REG["regions.js (Regional Parameters)"]
        PLC["places.js (Village Coordinates)"]
        FST["fieldshift.js (Agronomic Evaluation)"]
    end

    subgraph Audio ["Procedural Audio Subsystem (src/game/sound.js)"]
        SYNTH["Web Audio Micro-Synthesizer"]
        RAGA["Procedural Ragas (Bhairav/Megh/Yaman)"]
        FX["Dynamic Spatial Sound FX"]
    end

    subgraph Graphics ["3D Graphics Pipeline (src/game/three/*.js)"]
        STAGE["stage.js (Animation Loop & WebXR)"]
        TERRAIN["world.js (Ground & Village)"]
        LIFE["field.js + life.js (Plots & Village Life)"]
        BASEMESH["people.js (Procedural Characters)"]
    end

    subgraph UI ["User Experience (src/pages/public/FarmGame.jsx)"]
        HUD["Heads-Up Display & Soil Gauges"]
        STATION["FieldStation Modal (NASA Data)"]
        END["EndScreen (Agricultural Scorecard)"]
    end

    SIM -->|Immutable Snapshot (snapshot)| HUD
    SIM -->|Event Stream (g.out)| UI
    SIM -->|Position & Plot State| Graphics
    UI -->|Player Inputs (Act / Move / Buy)| SIM
    STAGE -->|Animation Loop Request| SIM
    SIM -->|Event Stream| Audio
```

---

## 2. Directory & Module Separation

| Directory / File | Purity Category | Dependencies | Responsibility |
| :--- | :--- | :--- | :--- |
| `src/game/sim.js` | **Pure JS (Tested)** | Zero external libs | Game loop, plot moisture, crop growth, pest spread, economy, XP progression, and agricultural scoring. |
| `src/game/fieldshift.js` | **Pure JS (Tested)** | App data and engine modules | Builds the FieldShift station view from real location records and summarizes the season. It is separate from the game plot rules. |
| `src/game/sound.js` | **Web Audio (Pure)** | Web Audio API | Web Audio synthesis without separate sound files: wind, rain, thunder, footfalls, hoe impacts, coins, and ambient music. |
| `src/game/three/stage.js` | **WebGL Engine** | Three.js | Orchestrates Three.js scene graph, camera controllers, WebXR AR/VR sessions, and rendering loop. |
| `src/game/three/people.js` | **Procedural Mesh** | Three.js geometry | Builds procedural low-poly farmers and villagers, their regional clothing, and animation poses. |
| `src/pages/public/FarmGame.jsx`| **React 19 Component** | React, Lucide icons | Renders HUD overlays, touch controls, dialogs, satellite panels, and scorecard screens. |

---

## 3. WebGL Rendering Pipeline & Scene Graph

### 3.1 Scene Composition
- **Ground & Village (`src/game/three/world.js`)**: Builds the game world and its terrain from regional layout data.
- **Plots (`src/game/three/field.js`)**: Renders the farm plots and crop states from the game simulation.
- **Village Life (`src/game/three/life.js`, `people.js`, `props.js`)**: Builds villagers, props, and ambient scene details.
- **Instanced Plots & Crops**: Crops transition procedurally through 4 vegetative stages (seedling, vegetative, flowering, ripe) using geometric scaling and leaf unfolding without loading 3D external files.
- **Atmospheric Lighting**:
  - Directional Sun/Moon light following diurnal arc ($\text{clock} \rightarrow \text{yaw/pitch}$).
  - Sky hemilight modulating color temperatures ($5500\text{K}$ midday $\rightarrow 2800\text{K}$ dusk $\rightarrow 12000\text{K}$ night).
  - Volumetric storm fog blending dynamically during Kalbaishakhi / monsoon squalls.

The displayed season and plot scores are game indices based on player actions, not soil laboratory measurements.

### 3.2 WebXR AR & VR Subsystems
- **Augmented Reality (`mode: 'ar'`)**: Uses `sessionInit: { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'] }` to project the smallholder farm onto living room tables or classroom floors.
- **Virtual Reality (`mode: 'vr'`)**: Full 6-DOF immersive view placing the player inside the field at eye level ($y = 1.6\text{m}$).

---

## 4. Game State Synchronization & Event Bus

The game rules in `sim.js` are designed educational abstractions. Real climate, satellite, and soil records used by the FieldShift station are computed by the app data engines and are not inputs to each plot’s growth tick.

The simulation loop advances at a fixed timestep ($\Delta t = 0.05\text{s}$ or dynamic frame delta clamped to $0.1\text{s}$).

1. **State Snapshotting**: Every 110ms, `FarmGame.jsx` calls `snapshot(g)` extracting an immutable view of:
   ```javascript
   {
     money, can, canMax, seeds, sel, basketN,
     soilHealth, carbonScore, xp, level, forecast,
     quest, count, ev, day, night, clock, perks,
     pests, stamina, down, target, won, ripe, inZone
   }
   ```
2. **Reactive Action Dispatch**:
   Actions (`act(g)`, `buy(g, k, n)`, `answerQuiz(g, ok)`) mutate the simulation state atomically and push events to `g.out`:
   - `{ type: 'sound', s: 'coin' }`
   - `{ type: 'float', text: { bn: '+১৫ XP', en: '+15 XP' }, x, z, tone: 'xp' }`
   - `{ type: 'alert', title, body, tone: 'warn' }`

---

## 5. Procedural Audio Synthesis Architecture

To eliminate hundreds of megabytes of audio assets, the game synthesizes every frequency and timbre in real time:

- **Plucked Folk String (Ektara/Dotara)**: Polyphonic oscillator bank with exponential gain decay:
  $$V(t) = A e^{-t/\tau} \sin(2\pi f t + \phi)$$
- **Atmospheric Wind & Storm**: White noise generator filtered through a dynamic `BiquadFilterNode` modulated by storm intensity:
  $$\text{cutoff}(t) = 150\text{Hz} + 1200\text{Hz} \times \text{windIntensity}$$
- **Foley Impacts**: Hoe chopping uses high-pass noise burst coupled with a pitched $180\text{Hz} \rightarrow 120\text{Hz}$ sine transient.

