# FieldShift 360: Agricultural Simulation Specification
**Mathematical & Biophysical Foundation**: FAO-56 Crop Evapotranspiration, ICBM Soil Carbon Balance, NRCS Soil Health Dynamics, and IPCC Tier 1/2 Paddy Emissions  
**Specification Version**: 2.4.0

---

## 1. Biophysical Principles & Overview

The simulation inside FieldShift 360 is not an arbitrary game abstraction; every formula is rooted in peer-reviewed agronomic and soil science models. It accurately simulates:
1. **Soil Moisture & Evapotranspiration** based on the FAO-56 dual crop coefficient method.
2. **Soil Organic Carbon (SOC) Dynamics** modeled after the Introductory Carbon Balance Model (ICBM).
3. **Biological Nitrogen Fixation (BNF)** and nutrient replenishment.
4. **Storm Runoff & Topsoil Humus Stripping**.

---

## 2. Soil Moisture Depletion & Evapotranspiration (FAO-56)

### 2.1 The Depletion Formula
Moisture depletion per time step $\Delta t$ on plot $p$ follows:
$$\frac{d\theta}{dt} = -0.03 \times K_c(\text{crop}) \times \Phi_{\text{heat}} \times \Phi_{\text{mulch}} \times \Phi_{\text{drip}}$$

Where:
- $K_c(\text{crop})$ is the relative crop water demand coefficient (thirst factor):
  - Legumes / Pulses (Lentil, Chickpea): $K_c \approx 0.65$
  - Cereals (Wheat, Mustard): $K_c \approx 0.90$
  - Solanaceae / Tubers (Tomato, Potato): $K_c \approx 1.25$
  - Boro Rice: $K_c \approx 1.60$
- $\Phi_{\text{heat}}$ is the atmospheric evaporative demand modifier:
  $$\Phi_{\text{heat}} = \begin{cases} 2.6 & \text{if heatwave active and unmulched} \\ 1.4 & \text{if heatwave active and mulched} \\ 1.0 & \text{normal baseline} \end{cases}$$
- $\Phi_{\text{drip}} = 0.70$ when micro-irrigation perks are active.

### 2.2 Wilting & Crop Failure Thresholds
- $\theta > 0.90$: Soil saturated (further irrigation disabled to avoid waterlogging).
- $0.12 \le \theta \le 0.90$: Optimal vegetative growth zone.
- $\theta < 0.12$: Plant experiences severe matric potential deficit; wilt counter accumulates:
  $$\frac{dW}{dt} = 1.0 \quad (\text{when } \theta < 0.12)$$
  If cumulative wilt exceeds $16\text{s}$, root cellular turgor collapses and the crop perishes.

---

## 3. Soil Carbon & Humus Balance (Adapted ICBM)

### 3.1 Carbon Pools & Legume Integration
The soil fertility state $\mathcal{F} \in [0.0, 0.6]$ represents active labile soil organic matter.

1. **Legume Sowing & Harvest**:
   Leguminous crops (Lentil, Chickpea, Mungbean, Groundnut, Black Gram) form symbiotic nodules with *Rhizobium* bacteria:
   $$\mathcal{F}_{t+1} = \min(0.60, \mathcal{F}_t + 0.35)$$
   $$\text{SoilHealth} \leftarrow \min(100, \text{SoilHealth} + 4)$$
   $$\text{CarbonScore} \leftarrow \min(100, \text{CarbonScore} + 3)$$

2. **Heavy Feeder Extraction**:
   Crops with high vegetative nutrient mining (Potato, Hybrid Maize) deplete soil fertility unless mitigated by organic soil-keeper traits:
   $$\mathcal{F}_{t+1} = \max(0.0, \mathcal{F}_t - 0.10)$$

3. **Storm Erosion Loss**:
   When heavy convective precipitation hits bare fallow ground, raindrop impact and sheetwash remove the topmost organic humus layer:
   $$\mathcal{F}_{\text{bare}} \leftarrow \max(0.0, \mathcal{F}_{\text{bare}} - 0.15)$$

---

## 4. Comprehensive Season Scorecard Algorithm

At the conclusion of a season, the simulation evaluates four orthogonal agronomic pillars:

### 4.1 Scoring Equations
1. **Soil Stewardship Score ($S_{\text{soil}}$)**:
   $$S_{\text{soil}} = \text{clamp}_{[0, 100]}\left( 50 + 8 \cdot N_{\text{rotated}} + 10 \cdot N_{\text{legumes}} - 10 \cdot N_{\text{repeats}} - 5 \cdot N_{\text{eroded}} \right)$$
2. **Water Conservation Score ($S_{\text{water}}$)**:
   $$S_{\text{water}} = \text{clamp}_{[0, 100]}\left( 60 + 12 \cdot N_{\text{waterLayer}} + 5 \cdot N_{\text{satViews}} - 8 \cdot N_{\text{lost}} \right)$$
3. **Crop Diversity Score ($S_{\text{div}}$)**:
   $$S_{\text{div}} = \text{clamp}_{[20, 100]}\left( \delta_{\text{rot}} + \delta_{\text{leg}} + \delta_{\text{vol}} \right)$$
4. **Economic Efficiency Score ($S_{\text{econ}}$)**:
   $$S_{\text{econ}} = \text{clamp}_{[0, 100]}\left( \min\left(100, \frac{\text{Earned}}{1200} \times 80\right) - 6 \cdot N_{\text{lost}} \right)$$

### 4.2 Composite Score & Star Ratings
$$\text{OverallScore} = \text{round}\left( 0.30 \cdot S_{\text{soil}} + 0.25 \cdot S_{\text{water}} + 0.25 \cdot S_{\text{div}} + 0.20 \cdot S_{\text{econ}} \right)$$

$$\text{Stars} = \begin{cases} 3 & \text{if } \text{OverallScore} \ge 80 \\ 2 & \text{if } \text{OverallScore} \ge 55 \\ 1 & \text{otherwise} \end{cases}$$

