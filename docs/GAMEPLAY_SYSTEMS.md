# FieldShift 360: Gameplay Systems & Mechanics Specification
**System Domain**: Interactive Economy, Hazard Evasion, XP & Progression, and IPM Dynamics  
**Specification Version**: 2.4.0

> **Implementation note:** This is a design draft; some numbers and mechanics below are planned or may be out of date. `src/game/sim.js` is the source of truth for current behavior. Game outcomes are simulated, not field forecasts or measured soil properties.

---

## 1. Agricultural Economy & Market Mechanics

### 1.1 Capitalization & Cashflow
- **Initial Working Capital**: Each farmer begins with $150\text{ BDT}$ (or equivalent regional currency).
- **Cost of Certified Seeds**:
  - Legumes / Pulses (Lentil, Mungbean, Chickpea): Low entry cost ($6–10\text{ BDT}$/plot), moderate yield, high soil fertility dividends.
  - High-Value Cash Crops (Potato, Tomato): Higher investment ($12–25\text{ BDT}$/plot), high yield potential, high water and pest vulnerability.
  - Staple Cereals (Rice, Wheat): Balanced investment ($8–15\text{ BDT}$/plot), foundational food security.

### 1.2 Price Dynamics & Market Gluts
Market prices are not static; they simulate real-world post-harvest wholesale collapses (*haat glut*):
$$P_{\text{sale}}(k) = \text{round}\left( P_{\text{base}}(k) \times (1 + \text{sellBonus}) \times \gamma_{\text{glut}} \right)$$
where:
$$\gamma_{\text{glut}} = \begin{cases} 0.35 & \text{if } \text{glut active and } k = \text{glutCrop} \\ 1.0 & \text{otherwise} \end{cases}$$

Players who check FieldShift's market intelligence avoid selling during gluts or plant diverse crop portfolios to buffer economic shocks.

---

## 2. XP Progression & Agronomic Mastery

### 2.1 Mastery Levels
The player accumulates Experience Points (XP) through ecologically sound farm management:

| Level | Title (Bangla / English) | XP Required | Unlocks & Recognition |
| :---: | :--- | :---: | :--- |
| **1** | **শিক্ষানবিস চাষি** / Apprentice Cultivator | $0\text{ XP}$ | Base toolkit, 4-plot starter guidance. |
| **2** | **দক্ষ চাষি** / Skilled Cultivator | $80\text{ XP}$ | Enhanced stamina recovery ($+15\%$), faster harvesting. |
| **3** | **মৃত্তিকা সাধক** / Soil Master | $180\text{ XP}$ | Resilient soil humus buffer against drought. |
| **4** | **মাস্টার এগ্রোনমিস্ট** / Master Agronomist | $320\text{ XP}$ | Peak status, 3-star season certification eligibility. |

### 2.2 XP Award Rules
- **Crop Rotation**: $+15\text{ XP}$ when sowing a different crop family from the previous plot occupant.
- **Legume Bonus**: $+25\text{ XP}$ upon harvesting a nitrogen-fixing pulse.
- **Integrated Pest Control**: $+20\text{ XP}$ when successfully treating pest outbreaks before transmission.
- **Agronomic Knowledge Mastery**: $+35\text{ XP}$ for correct answers to regional agro-climate quizzes.
- **Standard Harvest**: $+10\text{ XP}$ for timely reaping without crop rot.

---

## 3. Climate Hazard Evasion Mechanics

### 3.1 The Kalbaishakhi / Monsoon Squall (Closing Safe Zone)
- **Warning Phase**: FieldShift early warning siren activates $30\text{s}$ before storm strike. A circular safe zone appears centered around the village brick school or reinforced cyclone shelter.
- **Evasion Objective**: Player must sprint into the safe circle ($\text{dist}(\text{me}, \text{shelter}) \le R_{\text{safe}}$) before the countdown reaches zero.
- **Consequences of Failure**:
  - Farmer is knocked down for $3.2\text{s}$ ($\text{act} = \text{null}$).
  - Medical/recovery fine: $\min(\text{money}, 60\text{ BDT})$.
  - Loss of 3-star rating for the season.
- **Soil Impact on Fields**:
  - Any ripe unharvested crops in open fields are stripped and destroyed.
  - **Bare Soil Erosion**: Any plot left without vegetation loses active topsoil fertility ($\Delta \text{fert} = -0.15$).

### 3.2 Heatwave & Evaporative Stress
- Thermal radiation increases ambient plot moisture loss rate by up to $2.6\times$.
- Unmulched plots dry within seconds, causing rapid wilting ($\text{wilt} > 16\text{s} \rightarrow \text{crop death}$).
- Applying organic straw mulch reduces heatwave transpiration multiplier from $2.6\times$ down to $1.4\times$.

---

## 4. Integrated Pest Management (IPM) & Biological Dynamics

### 4.1 Monoculture Vulnerability Vector
Repetitive sowing of identical crop species on the same plot creates biological compounding:
- Plots marked with `repeat = true` harbor resident pest pupae.
- When a regional pest outbreak occurs, all repeated plots are guaranteed to be targeted first:
  $$\text{HitList} = \text{RandomFreePlots} \cup \{ p \in \text{Plots} \mid p.\text{repeat} = \text{true} \}$$

### 4.2 Spatial Pest Spread
- Unchecked pests multiply; every $13\text{s}$ ($22\text{s}$ with organic Neem spray unlocked), pests spread to adjacent orthogonal plots:
  $$\Delta \text{Neighbor} \in \{ (0, 1), (0, -1), (1, 0), (-1, 0) \}$$
- Crop health decays continuously ($\Delta h = -0.045 \times \text{pests} \times \Delta t$). When health hits zero, the crop perishes.

