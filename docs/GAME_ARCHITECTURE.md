# FieldShift 360: Game Architecture & Technical Systems
**Architecture Version**: 2.4.0  
**Frameworks**: Vite, React 19, Three.js (WebGL 2.0 / WebXR), Web Audio API  
**Target Execution**: 100% In-Browser Client Side, Zero Heavy Asset Downloads

---

## 1. High-Level Architectural Overview

FieldShift 360 enforces a strict architectural decoupling between **Pure Agronomic Simulation Logic**, **Three.js WebGL Rendering**, and **React 19 User Experience Layers**.

```mermaid
flowchart TB
    subgraph Engine ["Pure Mathematical Engine (src/game/*.js)"]
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
        TERRAIN["stageTerrain.js (Procedural Ground)"]
        LIFE["stageLife.js (Instanced Foliage & Water)"]
        BASEMESH["basemesh.js (Procedural Characters)"]
    end

    subgraph UI ["User Experience (src/pages/public/FarmGame.jsx)"]
        HUD["Heads-Up Display & Soil Gauges"]
        STATION["FieldStation Modal (NASA Data)"]
        END["EndScreen (Agricultural Scorecard)"]
    end

    SIM -->|Immutable Snapshot (snapshot)| HUD
    SIM -->|Event Stream (g.out)| UI
    SIM -->|Event Stream| Audio
    SIM -->|Position & Plot State| Graphics
    UI -->|Player Inputs (Act / Move / Buy)| SIM
    STAGE -->|Animation Loop Request| SIM
```

---

## 2. Directory & Module Separation

| Directory / File | Purity Category | Dependencies | Responsibility |
| :--- | :--- | :--- | :--- |
| `src/game/sim.js` | **Pure JS (Tested)** | Zero external libs | Game loop, plot moisture, crop growth, pest spread, economy, XP progression, and agricultural scoring. |
| `src/game/fieldshift.js` | **Pure JS (Tested)** | JSON data only | Interfaces simulation with real NASA satellite records, FAO-56 crop water baselines, and post-season review. |
| `src/game/sound.js` | **Web Audio (Pure)** | Web Audio API | Zero-byte procedural sound synthesis: wind, rain, thunder, footfalls, hoe impacts, coins, and ambient ragas. |
| `src/game/three/stage.js` | **WebGL Engine** | Three.js | Orchestrates Three.js scene graph, camera controllers, WebXR AR/VR sessions, and rendering loop. |
| `src/game/three/basemesh.js` | **Procedural Mesh** | Three.js geometry | Procedural human character base mesh with quad-dominant topology, deformation joints, and regional garments. |
| `src/pages/public/FarmGame.jsx`| **React 19 Component** | React, Lucide icons | Renders HUD overlays, touch controls, dialogs, satellite panels, and scorecard screens. |

---

## 3. WebGL Rendering Pipeline & Scene Graph

### 3.1 Scene Composition
- **Ground & Terrain (`stageTerrain.js`)**: Dynamic procedural plane displaced by localized elevation maps (`L.ground(x, z)`), textured via multi-stop procedural canvas shaders (alluvial silt, Barind clay, delta sand).
- **Instanced Plots & Crops**: Crops transition procedurally through 4 vegetative stages (seedling, vegetative, flowering, ripe) using geometric scaling and leaf unfolding without loading 3D external files.
- **Atmospheric Lighting**:
  - Directional Sun/Moon light following diurnal arc ($\text{clock} \rightarrow \text{yaw/pitch}$).
  - Sky hemilight modulating color temperatures ($5500\text{K}$ midday $\rightarrow 2800\text{K}$ dusk $\rightarrow 12000\text{K}$ night).
  - Volumetric storm fog blending dynamically during Kalbaishakhi / monsoon squalls.

### 3.2 WebXR AR & VR Subsystems
- **Augmented Reality (`mode: 'ar'`)**: Uses `sessionInit: { requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'] }` to project the smallholder farm onto living room tables or classroom floors.
- **Virtual Reality (`mode: 'vr'`)**: Full 6-DOF immersive view placing the player inside the field at eye level ($y = 1.6\text{m}$).

---

## 4. State Synchronization & Event Bus

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

