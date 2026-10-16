# FireWatch — Satellite-Derived Active Fire Intelligence & Triage Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Design-TailwindCSS_Dark_Console-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-14_Passed-success.svg)]()

> **Mission Objective:** FireWatch is an academic decision-support and rapid-triage analytical console designed for the **VYOM AI/ML Hackathon Challenge: Satellite-Derived Active Fire Triage**. It aggregates satellite-derived thermal anomaly vectors from NASA FIRMS (VIIRS 375m & MODIS 1km), enforces schema and boundary validation, computes deterministic explainable priority scores, clusters repeat multi-pass detections, and visualizes tactical corridors without ever presenting unverified thermal detections as confirmed wildfires.

---

## 🛰️ Visual Fidelity & Google Stitch Implementation

FireWatch faithfully implements the three exported Google Stitch consoles as dedicated, interactive operational screens while maintaining a unified dark console design system (`#15191D` base, Space Grotesk, Manrope, JetBrains Mono, `#FFB547` thermal amber, `#F04438` thermal red, and `#68B5E8` analytical blue):

| Stitch Export | Screen Name | Functional Implementation |
| :--- | :--- | :--- |
| **Screen 3** | **Overview & Triage Console** (`overview-triage`) | Live stream ribbon with pass sync, 2x2 KPI matrix (Total Obs, Priority >80, Repeat Detections, Rejected Raw), interactive dark tactical Leaflet map with pulsating fire markers, explainable triage detail card for observation `FW-8842-VIIRS` (score 94), contributing factor point stacked bars, analyst review controls (*Mark Verified*, *Flag False/Flare*), and Top 3 critical queue preview. |
| **Screen 2** | **Temporal Analytics & Telemetry** (`analytics-trends`) | Executive analytics rolling header, filter pill deck, 24h diurnal curve with satellite pass overpass sync (S-NPP 13:30 LT, Aqua 14:30 LT), FRP distribution histogram with median & peak callouts, sensor source attribution donut ring (VIIRS 375m vs MODIS 1km), algorithmic confidence ratings, **What-If Priority Simulator** with real-time weight sliders, and ranked incident corridors. |
| **Screen 1** | **Scientific Limitations & Bias Matrix** (`evaluation-limitations`) | Non-tactical operational directive disclaimer, NASA EOS-TR-44 matrix header, 4 systematic limitation cards (clouds/smoke obscuration, orbit latency, pixel footprint distortion, industrial flare confounders), SVG sensor footprint comparison diagram (MODIS 1000m vs VIIRS 375m), 3-stage false-positive mitigation pipeline, explainable formula specification, and scenario normalizer simulator. |
| **Screen 4** | **Observation Queue Explorer** (`priority-queue`) | Multi-column sortable and filterable observations data table with full text search, priority tier filters, FRP sliders, satellite selectors, multi-pass badges, pagination, and inspection drawer. |
| **Screen 5** | **Data Ingestion & Validation** (`data-validation`) | Drag-and-drop CSV uploader, strict boundary checking, row-by-row error reporting with row indices, duplicate detector, sample CSV template download, ingestion audit history, and NASA FIRMS live API synchronization. |

---

## 📐 Technology Stack

- **Backend:** Python 3.14+, FastAPI, SQLite 3 (persistent local database `backend/firewatch.db`), Uvicorn, Pandas, NumPy.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Leaflet, Recharts, Lucide React.
- **Testing:** Pytest, HTTPX TestClient (14 automated unit/integration tests).
- **Mapping:** Leaflet with high-contrast CartoDB Dark basemap tiles.

---

## 🧮 Explainable Priority-Scoring Engine

The priority engine calculates a deterministic heuristic score ($0 - 100$) for every active fire observation based strictly on available sensor fields:

$$\text{Priority} = 100 \times \frac{w_1 \cdot \text{Norm\_FRP} + w_2 \cdot \text{Recency\_Decay} + w_3 \cdot \text{Conf\_Weight} + w_4 \cdot \text{Persistence}}{w_1 + w_2 + w_3 + w_4}$$

### Default Parameter Weights:
1. **$w_1$ (Norm_FRP = 0.35):** Scaled Fire Radiative Power (MW). Non-linear scaling up to 150+ MW radiant energy.
2. **$w_2$ (Recency_Decay = 0.25):** Exponential decay with $t_{1/2} = 6.0\text{h}$ based on observation age relative to the latest overpass.
3. **$w_3$ (Conf_Weight = 0.20):** Algorithmic confidence score ($0.0 - 1.0$) provided by NASA sensor masks.
4. **$w_4$ (Persistence = 0.20):** Multi-pass repeat detection factor within $2.0\text{ km}$ and $48\text{ hours}$.

### Triage Tiers:
- **Tier-1 Critical:** $\ge 80.0$ points (Immediate analyst review required)
- **Tier-2 Priority:** $60.0 - 79.9$ points (Elevated anomaly front)
- **Tier-3 Advisory:** $35.0 - 59.9$ points (Nominal observation)
- **Tier-4 Routine:** $< 35.0$ points (Low intensity / static source)

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 2. Clone and Install Dependencies

```bash
# Clone the repository
cd firewatch

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm.cmd install
cd ..
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: add your NASA FIRMS key under `FIRMS_MAP_KEY`. If left empty, FireWatch automatically operates with full synthetic demonstration data.)*

### 4. Run the Application

In **Terminal 1** (Start the FastAPI Backend):
```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*The database `backend/firewatch.db` will initialize and seed 1,248 synthetic demonstration observations automatically.*

In **Terminal 2** (Start the Vite Frontend):
```powershell
cd frontend
npm.cmd run dev
```

Open your browser to: **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

---

## 🧪 Running Automated Tests

Run the full Pytest test suite covering CSV validation, boundary checks, duplicate detection, scoring formulas, and API endpoints:

```powershell
python -m pytest backend/tests
```

**Test Coverage Summary:**
- `test_validation.py`: Tests clean CSV ingestion, invalid coordinate detection ($>90^\circ$ / $>180^\circ$), missing headers, and duplicate record rejection.
- `test_scoring.py`: Tests confidence normalization, exponential recency decay, point contributions, and repeat-pass spatio-temporal clustering.
- `test_api.py`: Tests `/api/health`, `/api/dashboard/overview`, `/api/observations`, review updates, weight updates, simulation, and exports.

---

## 📥 Testing CSV Validation & Ingestion

We include sample datasets in `data/`:
1. `data/sample_firms_observations.csv`: Clean, realistic test data (downloadable from `/api/sample/download` as well).
2. `data/invalid_sample_test.csv`: Contains intentional errors to test and demonstrate the validation engine:
   - Latitude $= 195.421^\circ$ (Out of bounds)
   - Invalid acquisition date `INVALID-DATE`
   - Malformed time `9999`
   - Negative FRP `-15.0 MW`
   - Duplicate records with matching coordinates and timestamps.

Upload `data/invalid_sample_test.csv` in the **Validation** screen to see detailed row-by-row error reporting with offending values.

---

## 📡 NASA FIRMS Live Integration

To enable live ingestion:
1. Request a free MAP KEY from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/map_key).
2. Set `FIRMS_MAP_KEY=your_key_here` in `.env`.
3. Open the **Validation** screen and click **Sync Live Satellite Feed**.

---

## ⚠️ Scientific Integrity & Limitations Disclaimer

- **Analyst Decision-Support Only:** FireWatch is an analytical triage heuristic tool. It does **not** confirm real wildfires from satellite detections alone or function as an emergency dispatch system.
- **Centroid vs Perimeter:** Satellite coordinate pins signify the **pixel centroid** ($375\text{m}$ for VIIRS, $1\text{km}$ for MODIS), not the active flame-front perimeter.
- **Cloud & Smoke Attenuation:** Dense cloud decks or heavy smoke plumes completely attenuate mid-infrared radiation ($3.9 - 4.0\ \mu\text{m}$), causing potential false negatives.
- **Orbital Latency:** Polar-orbiting spacecraft overpass 2 to 4 times per 24h diurnal cycle; rapid daytime spread between passes remains unobserved until the next transit.
- **Industrial Confounders:** Persistent thermal sources such as natural gas flaring, petrochemical refineries, and metal smelters may produce high thermal signatures and are flagged for analyst review.
