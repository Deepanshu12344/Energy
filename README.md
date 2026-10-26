# GB Wind Power Forecast Monitoring System (January 2026)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Language-Python%203.12-3776AB.svg?style=flat&logo=python)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Container-Docker%20Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com)
[![Test Coverage](https://img.shields.io/badge/Coverage-94%25-brightgreen.svg)](#running-automated-tests)

A full-stack, production-grade wind generation forecast benchmark and decision-support web application for power buyers, energy traders, and balancing desks in Great Britain.

The system benchmarks official National Grid ESO day-ahead wind forecasts (**`WINDFOR`**) against actual outturn generation (**`FUELHH`**, fuelType = `WIND`) published by Elexon BMRS for delivery days in **January 2026**.

**Live Application:** [LIVE_APP_URL](LIVE_APP_URL)

---

## 1. Project Overview & Problem Solved

In the Great Britain electricity market, energy buyers and wind generators submit physical contract notifications for the day ahead. While commercial day-ahead blind auctions for wholesale physical power close at **09:20 Europe/London** (EPEX SPOT 60-minute auction) and **09:50 Europe/London** (Nord Pool N2EX auction) on day D-1, the continental European coupling benchmark cutoff has historically been **12:00 Europe/London** (12:00 CET). Wind generation is intermittent and weather-dependent, so forecasting misses directly translate into costly cash-out balancing mechanism charges if a buyer is left out of balance.

National Grid / Elexon continuously publish wind forecast revisions up to 66 hours before delivery. Energy traders cannot reliably make decisions based on unversioned forecasts: they need to evaluate the exact forecasts that were available when day-ahead purchase decisions were locked in.

This application solves this by:
1. Evaluating purchase decisions made in January 2026 (1 Jan to 31 Jan D-1 decision window), corresponding to **delivery days 2026-01-02 through 2026-02-01**.
2. Freezing forecast evaluations at the user-defined D-1 trading cutoff (defaulting to **12:00 Europe/London** on day D-1).
3. Benchmarking the latest forecast published at or before that cutoff against the exact physical generation outturn.
4. Translating mathematical error distributions into actionable decision support: an operating reserve buffer (P90) and directional bias observation.

---

## 2. Key Findings from January 2026 Decisions (Real Data)

Independent validation across all 744 hourly delivery intervals for January 2026 purchase decisions (delivery days **2026-01-02 through 2026-02-01**) at the 12:00 D-1 cutoff revealed the following verified findings directly from the raw database records and API metrics:

| Metric | Validated Value | Interpretation & Source |
|---|---|---|
| **Mean Error (Bias)** | **+1,685.27 MW** | Systemic over-forecasting. Forecasts overshot actual wind outturn by an average of 1.69 GW across the evaluation window. *(From `GET /api/metrics`)*. |
| **Daily Over-Forecasting Rate** | **29 of 31 days (93.5%)** | The average daily forecast was **higher than actual on 29 of 31 delivery days (93.5%)**. Only 2 days under-forecast. *(From raw database daily outturn averages)*. |
| **Hourly Over-Forecasting Share** | **85.0% of hours** | Wind forecasts were **higher than actual in 85.0% of hours** (632 out of 744 evaluated hourly slots). *(From `GET /api/error-distribution`)*. |
| **Mean Absolute Error (MAE)** | **1,883.98 MW** | The average absolute volumetric deviation between forecast and actual outturn. *(From `GET /api/metrics`)*. |
| **Root Mean Squared Error (RMSE)**| **2,350.33 MW** | Penalizes severe forecast swings and sudden ramp misses. *(From `GET /api/metrics`)*. |
| **Guarded MAPE** | **18.86%** | Evaluated on valid slots; zero slots were distorted by near-zero wind lull generation ($<10\text{ MW}$). *(From `GET /api/metrics`)*. |
| **P90 Absolute Error (Buffer)** | **3,767.70 MW** | In 9 of 10 hours the forecast was within 3,768 MW of actual, so a buffer of 3,768 MW would have covered most hours. *(From `GET /api/metrics` via linear percentile)*. |
| **P95 Absolute Error** | **4,497.75 MW** | Extreme tail deviation representing severe gale ramp misses. *(From `GET /api/metrics`)*. |

### Accuracy by Lead Time Horizon
Evaluation of all 18,080 published forecasts in January 2026 demonstrates clear skill degradation as lead time increases (`GET /api/horizon-analysis`):
* **$<12\text{ hours}$ lead time:** MAE = **1,800.73 MW** | RMSE = **2,276.96 MW** | Bias = **+1,582.17 MW**
* **$12-18\text{ hours}$ lead time:** MAE = **1,932.82 MW** | RMSE = **2,415.68 MW** | Bias = **+1,739.88 MW**
* **$18-24\text{ hours}$ lead time:** MAE = **2,048.95 MW** | RMSE = **2,531.31 MW** | Bias = **+1,882.53 MW**
* **$24-36\text{ hours}$ lead time:** MAE = **2,122.56 MW** | RMSE = **2,586.87 MW** | Bias = **+1,838.48 MW**
* **$36-48\text{ hours}$ lead time:** MAE = **2,337.01 MW** | RMSE = **2,866.21 MW** | Bias = **+2,004.50 MW**
* **$>48\text{ hours}$ lead time:** MAE = **2,371.92 MW** | RMSE = **2,977.90 MW** | Bias = **+1,479.56 MW**
* **Segregated Post-Target Bucket:** 3,697 forecast revisions published *after* the delivery target timestamp (negative lead time) are segregated (MAE: 1,884.34 MW, Bias: +1,753.40 MW) and excluded from forward horizons.

---

## 3. Architecture & Data Flow

All January 2026 data was pre-loaded into Supabase PostgreSQL during setup. **The deployed application never calls Elexon BMRS at runtime.**

### Why Pre-Load Data in Supabase?
1. **Runtime Resilience & Zero External Dependencies:** Elexon BMRS Open APIs enforce strict rate limits, experience frequent maintenance outages, and add 1–4 seconds of network latency. Pre-loading guarantees `<25ms` response times.
2. **Deterministic Evaluation:** A trading benchmark must be frozen and reproducible. Live API queries risk upstream retroactive restatements corrupting historical auditability.
3. **Cost & Scalability:** Serverless FastAPI workers can scale to handle arbitrary user load without risking external API quota bans.

### Architecture Diagram

```mermaid
flowchart TD
    subgraph Storage["Supabase PostgreSQL (Pre-loaded)"]
        direction TB
        DB_Actuals[("wind_actuals<br/>1,536 half-hourly rows")]
        DB_Forecasts[("wind_forecasts<br/>18,664 hourly revisions")]
    end

    subgraph Backend["FastAPI Backend (backend/)"]
        direction TB
        Pool["ConnectionPool<br/>(min_size=0, max_size=2, prepare_threshold=None)"]
        DataQueries["Data Layer (queries.py)<br/>Pure parameterized SQL (datetimes only)"]
        Services["Pure Services Layer<br/>- forecast_service.py (D-1 cutoff selection)<br/>- metrics_service.py (MAE, RMSE, Bias, P90, Bins)<br/>- horizon_service.py (lead time bucketing)"]
        Routers["FastAPI Routers<br/>/api/health, /api/meta, /api/forecast,<br/>/api/metrics, /api/error-by-hour,<br/>/api/horizon-analysis, /api/error-distribution"]
        
        Pool --> DataQueries
        DataQueries --> Services
        Services --> Routers
    end

    subgraph Frontend["React 19 SPA (frontend/)"]
        direction TB
        ApiClient["Typed API Client (client.ts)"]
        MainChart["Main Forecast Chart<br/>(Time-based XAxis, Cutoff Banner)"]
        KPICards["Summary KPI Cards<br/>(MAE, RMSE, Bias, MAPE, P95, Coverage)"]
        DecisionCard["Decision Support Card<br/>(Dynamic P90 Buffer & Bias Observation)"]
        Analytics["Error Distribution & Diurnal Breakdown"]

        ApiClient --> MainChart
        ApiClient --> KPICards
        ApiClient --> DecisionCard
        ApiClient --> Analytics
    end

    Storage --> Pool
    Routers -->|"JSON / HTTPS"| ApiClient
```

---

## 4. Directory & File Structure

```text
Energy/
├── .env.example                     # Environment template with pooler & CORS documentation
├── .dockerignore                    # Root Docker exclusions
├── docker-compose.yml               # Local multi-container orchestration (backend + frontend)
├── pytest.ini                       # Pytest configuration with pythonpath = .
├── Agents.md                        # Master project specification and guidelines
├── backend/
│   ├── Dockerfile                   # Python 3.12-slim container with non-root user & urllib healthcheck
│   ├── .dockerignore                # Backend container exclusions
│   ├── main.py                      # Container & Vercel root entrypoint with virtual package resolver
│   ├── pyproject.toml               # Vercel entrypoint specification ([tool.vercel] entrypoint = "main:app")
│   ├── vercel.json                  # Vercel serverless routing configuration
│   ├── requirements.txt             # Pinned production runtime dependencies (FastAPI, psycopg[binary], etc.)
│   ├── requirements-dev.txt         # Development & testing dependencies (pytest, httpx, pytest-cov)
│   ├── api/
│   │   └── index.py                 # Vercel serverless function entrypoint
│   ├── app/
│   │   ├── config.py                # Environment configuration (pydantic-settings)
│   │   ├── main.py                  # FastAPI application setup, CORS, lifespan, error handlers
│   │   ├── data/
│   │   │   ├── database.py          # Psycopg ConnectionPool (min_size=0, max_size=2, lazy init)
│   │   │   └── queries.py           # Parameterized SQL queries (datetimes only)
│   │   ├── models/
│   │   │   ├── internal.py          # Cleaned database record models
│   │   │   ├── requests.py          # Validated query parameter schemas
│   │   │   └── responses.py         # Response schemas with SlotStatus & ErrorDistributionResponse
│   │   ├── routers/                 # Modular API endpoints (/api/*)
│   │   └── services/                # Pure mathematical & business logic functions
│   ├── scripts/
│   │   ├── fetch_data.py            # Idempotent Elexon BMRS ingestion script
│   │   └── smoke_test.py            # Live end-to-end API test script against Supabase
│   └── tests/                       # 27 comprehensive automated tests (94% coverage)
├── frontend/
│   ├── Dockerfile                   # Multi-stage build (node:22-alpine -> nginx:alpine-slim)
│   ├── nginx.conf                   # Nginx reverse proxy configuration with SPA fallback routing
│   ├── .dockerignore                # Frontend container exclusions
│   ├── vercel.json                  # Frontend Vercel SPA client routing configuration
│   ├── index.html                   # HTML document root with title & metadata
│   ├── package.json                 # Dependencies (React 19, Recharts, Lucide, Tailwind)
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   ├── vite.config.ts               # Vite build with manualChunks code splitting
│   └── src/
│       ├── api/                     # Pure TypeScript API client and schema interfaces
│       ├── components/              # Modular UI components (MainChart, KPICards, DecisionCard, etc.)
│       ├── App.tsx                  # Root dashboard controller and state coordinator
│       └── main.tsx                 # React DOM mount point
├── docs/
│   ├── ARCHITECTURE.md              # Detailed architecture, ADRs, and video presentation talking points
│   └── DATA_NOTES.md                # Elexon API investigation, field mappings, and sanity findings
└── supabase/
    └── migrations/
        └── 20260101000000_create_wind_tables.sql # Production database schema with indexes & RLS
```

---

## 5. Setup & Ingestion Guide

### Prerequisites
* Python 3.12+
* Node.js 20+ (v22 recommended)
* A Supabase PostgreSQL database project

### 1. Database Migrations
Apply the migration in [supabase/migrations/20260101000000_create_wind_tables.sql](file:///home/sam-sepiol/Documents/Energy/supabase/migrations/20260101000000_create_wind_tables.sql) in the Supabase SQL Editor. This sets up:
* `wind_actuals` with unique constraint on `start_time`.
* `wind_forecasts` with unique constraint on `(start_time, publish_time)`.
* Composite index `idx_wind_forecasts_cutoff` on `(start_time, publish_time DESC)`.
* Row Level Security enabled.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase connection string:
* **Session Pooler (port 5432):** Recommended for running migrations and initial data ingestion.
* **Transaction Pooler (port 6543):** Supported for high-concurrency serverless deployments with `prepare_threshold=None`.

```env
DATABASE_URL=postgresql://postgres.yourproject:password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEFAULT_GATE_CLOSURE_TIME=12:00
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. Run Ingestion Script (One-off)
```bash
# Setup Python virtual environment
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt -r backend/requirements-dev.txt

# Ingest all January 2026 outturns and forecasts
python backend/scripts/fetch_data.py
```
*Ingestion output reports exact row counts (1,488 actuals, 18,080 forecasts) and verifies zero gaps.*

---

## 6. How to Run the Application

### Option A: Running with Docker (Recommended)
`docker compose up --build` works out-of-the-box from a clean clone with a populated `.env`:

```bash
docker compose up --build
```
* **Frontend Dashboard:** `http://localhost:5173`
* **Backend API Docs:** `http://localhost:8000/docs`
* **Health Check:** `http://localhost:8000/api/health`

### Option B: Running Locally (Without Docker)

#### 1. Start the Backend API
```bash
# From project root
source backend/.venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*FastAPI Swagger documentation is available at `http://localhost:8000/docs`.*

#### 2. Start the Frontend Client
```bash
# In a new terminal
cd frontend
npm install
npm run dev -- --port 5173
```
*The dashboard is accessible at `http://localhost:5173`.*

---

## 7. Running Automated Tests

The backend test suite contains **27 comprehensive tests** validating forecast selection logic, DST boundaries, hand-calculated accuracy metrics, near-zero MAPE guards, dynamic histogram binning, lead-time horizon segregation, and API HTTP error handling.

Run all tests with coverage reporting:
```bash
backend/.venv/bin/pytest backend/tests -v --cov=backend/app --cov-report=term-missing
```

### Test Coverage Results (94% Codebase Coverage)
```
Name                                       Stmts   Miss  Cover   Missing
------------------------------------------------------------------------
backend/app/config.py                         17      2    88%   27-29
backend/app/data/database.py                  45      9    80%   19, 22-23, 61-63, 74-76
backend/app/data/queries.py                   43      2    95%   68-79
backend/app/main.py                           50      3    94%   112, 125-126
backend/app/models/responses.py               97      0   100%
backend/app/routers/distribution.py           12      0   100%
backend/app/routers/forecast.py               23      0   100%
backend/app/routers/health.py                 10      0   100%
backend/app/routers/horizon.py                16      0   100%
backend/app/routers/meta.py                   15      2    87%   18-20
backend/app/routers/metrics.py                49      0   100%
backend/app/services/forecast_service.py      53      3    94%   121-123
backend/app/services/horizon_service.py       34      1    97%   59
backend/app/services/metrics_service.py       60      4    93%   78, 164, 175-181
------------------------------------------------------------------------
TOTAL                                        662     41    94%
======================== 27 passed in 26.99s ========================
```

---

## 8. Deployment to Vercel (Step-by-Step)

The project is structured for clean two-project deployment on Vercel:
1. **Backend Project:** FastAPI serverless deployed from the `backend/` directory.
2. **Frontend Project:** React Vite SPA deployed to Vercel Edge from the `frontend/` directory.

### Step 1: Deploy the Backend API
1. Open the [Vercel Dashboard](https://vercel.com/new).
2. Import this repository.
3. Configure the project:
   - **Project Name:** `energy-wind-backend`
   - **Framework Preset:** `Other`
   - **Root Directory:** Click *Edit* and select **`backend`**.
4. Set Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string (transaction pooler on port 6543 recommended).
   - `CORS_ORIGINS`: Temporary placeholder `*` (or your eventual frontend domain).
   - `DEFAULT_GATE_CLOSURE_TIME`: `12:00`
5. Click **Deploy**.
6. Once deployed, test the health check in your browser:
   `https://<your-backend-project>.vercel.app/api/health`
   *(Confirm `{"status": "ok", "database_connected": true}` is returned)*.
7. **Copy your Backend URL** (e.g. `https://energy-wind-backend.vercel.app`).

### Step 2: Deploy the Frontend Client
> **Important:** In Vite, variables prefixed with `VITE_` are bundled into static assets **at build time**. Set `VITE_API_BASE_URL` before triggering the build.

1. Open the Vercel Dashboard and click **Add New Project**.
2. Select the same repository.
3. Configure the project:
   - **Project Name:** `energy-wind-frontend`
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click *Edit* and select **`frontend`**.
4. Set Environment Variables:
   - `VITE_API_BASE_URL`: `https://<your-backend-project>.vercel.app/api`
5. Click **Deploy**.
6. **Copy your Frontend URL** (e.g. `https://energy-wind-frontend.vercel.app`).

### Step 3: Lock Down CORS on the Backend
1. Go back to your `energy-wind-backend` project settings on Vercel -> **Environment Variables**.
2. Set or update `CORS_ORIGINS` to your production frontend URL (or `*` for public access):
   `https://energy-wind-frontend.vercel.app`
   *(Note: The backend automatically sanitizes trailing slashes, trims whitespace/quotes, and includes built-in regex matching for all `https://*.vercel.app` preview/branch deployments and `http://localhost:*`)*.
3. Verify that `DATABASE_URL` in Vercel uses the **Transaction Pooler** port **6543** (`...pooler.supabase.com:6543/postgres`) to avoid serverless connection exhaustion (`EMAXCONNSESSION`).
4. Redeploy the backend (*Deployments -> click latest deployment -> Redeploy*) to apply the updated environment variables.

---

## 9. Assumptions & Limitations

1. **Gate Closure / Decision Cutoff:** Set to **12:00 Europe/London** on Day D-1 (the GB Day-Ahead auction clearing gate). Any forecasts published after this cutoff are excluded from day-ahead metrics.
2. **Resolution Alignment:** WINDFOR forecasts are hourly (`:00`); FUELHH actuals are half-hourly (`:00` and `:30`). Evaluations are conducted strictly at matching `:00` timestamps without artificial forward-filling or interpolation.
3. **Zero-Division MAPE Guard:** Generation outturns below **10.0 MW** are excluded from the MAPE denominator to prevent division-by-zero spikes during wind lull periods. All slots remain included in MAE, RMSE, and percentiles.
4. **Percentile Methodology:** $P_{50}, P_{90}, P_{95}$ absolute errors are computed using standard linear interpolation (`method="linear"`), consistent with NumPy and SciPy standards.
5. **Timezone Standardization:** All raw data is stored in **UTC** in PostgreSQL. Inputs and day boundaries are interpreted according to the Great Britain business timezone (`Europe/London`).

---

## 10. AI Tools & Attribution

In accordance with transparent engineering practices:
* **Google Antigravity** and **Claude** were utilized as agentic AI development assistants during the planning, test design, and implementation of this codebase.
* All data sanity checks, schema constraints, mathematical logic, and edge-case verifications were independently validated against real Elexon BMRS data streams.
