# AGENTS.md: Guidelines for the AI Coding Agent

Read this file fully before doing anything. Follow it for the whole project.

---

## 1. Project Summary

We are building a **wind generation forecast monitoring web app** for a UK energy utility's day-ahead power buying team.

The buyers must decide, one day before delivery (D-1), how much electricity to buy on the day-ahead market. Wind output is weather-dependent, so they rely on wind forecasts. The app must let them:

1. **See the latest wind forecast that was available at decision time** (D-1 gate closure).
2. **Quantify forecast accuracy** (forecast vs. actual) so they can factor the error into decisions.

**Data scope (Elexon BMRS only, national level, wind only):**

| Dataset | Purpose | Key fields |
|---|---|---|
| `FUELHH` (filter `fuelType = WIND`) | Actual generation | `startTime` (30 min), `generation` |
| `WINDFOR` | Forecast generation | `startTime`, `publishTime`, `generation` |

Only purchase decisions for **delivery days in January 2026** are in scope. Fetch a margin of data before January (for example from 2025-12-25) because forecasts for early-January target times are published in late December.

**Stack:**
- Frontend: React
- Backend: Python (FastAPI preferred)
- Database: **Supabase (managed PostgreSQL)**
- Packaging and deployment: Docker, deployed on Vercel or Heroku

---

## 2. How You Must Work (Phase Gates)

Work in **strict phases**. At the end of each phase:

1. Summarize what you built, the files changed, and any assumptions made.
2. **STOP and wait for my explicit approval** ("approved, go to Phase N") before starting the next phase.

| Phase | Name | Stops after? |
|---|---|---|
| 1 | Schema building (includes data exploration) | **YES, stop** |
| 2 | API building (includes automated tests) | **YES, stop** |
| 3 | Frontend building | Yes, stop |
| 4 | Docker, deployment, README | Yes, stop |

Never start frontend work until I approve the API phase.

Rules for every phase:

- Make a short plan first and show it to me before writing code.
- Keep changes small and focused. No unrelated refactors.
- If something is ambiguous, ask me. Do not guess silently. If you must assume, write the assumption in `docs/ASSUMPTIONS.md`.
- Do not invent data, endpoints, or field names. Verify them against the Elexon API docs or real responses.

---

## 3. Domain Rules (Critical, Get These Right)

### 3.1 Latest forecast at decision time

WINDFOR contains **multiple forecasts for the same `startTime`**, each with a different `publishTime`.

For a delivery day `D`:

- `cutoff = (D - 1 day) at GATE_CLOSURE_TIME`
- Default `GATE_CLOSURE_TIME = 12:00` in **Europe/London** time. It must be **configurable** (env var and API parameter).
- For each half-hour `startTime` on day `D`, select the forecast row with the **greatest `publishTime` that is `<= cutoff`**.
- If no forecast exists at or before the cutoff for a given `startTime`, mark it as missing. Do not fill it silently.

### 3.2 Time handling

- Store and process all timestamps in **UTC** (timezone-aware, use `timestamptz` in Postgres).
- Convert to Europe/London only for the cutoff calculation and for display.
- Delivery day `D` is defined in Europe/London local time. (In January, UK local time equals UTC, but write the code correctly anyway.)
- Never use naive datetimes.

### 3.3 Accuracy metrics

Compute against the selected forecast (error = forecast - actual):

- MAE
- RMSE
- Bias (mean error)
- MAPE (guard against division by zero or near-zero actuals; document how)
- Percentiles of absolute error: P50, P90, P95
- Coverage count: number of half-hours with both a forecast and an actual

Optional extras (only after the core is approved):

- Error by hour of day
- Error by forecast horizon (`startTime - publishTime`)
- Buffer recommendation, for example "forecast error was within X MW for 90% of half-hours"

### 3.4 Data quality

- Handle gaps, duplicates, and missing values explicitly.
- Deduplicate on the natural key (`startTime` + `publishTime` for forecasts, `startTime` for actuals).
- Log counts of dropped or missing rows.

---

## 4. Phase Details

### Phase 1: Schema Building  (STOP after this phase)

Goal: define all data structures and load the data before any API code.

**Step 1: Data exploration**
- Call both Elexon endpoints for a small date range and inspect the raw responses.
- Confirm exact endpoint URLs, query parameters, stream behavior, and response shapes from the official docs.
- Write findings to `docs/DATA_NOTES.md` (shapes, time zones, gaps, forecast horizon range, anything surprising).

**Step 2: Supabase database schema**
- Write the schema as **SQL migration files** in `supabase/migrations/` (version controlled, re-runnable).
- Suggested tables (adjust with justification):
  - `wind_actuals`: `start_time timestamptz` (primary key), `generation_mw numeric`, plus ingestion metadata
  - `wind_forecasts`: `start_time timestamptz`, `publish_time timestamptz`, `generation_mw numeric`, primary key (`start_time`, `publish_time`)
- Add indexes that support the main query: "for a `start_time`, the latest `publish_time` <= cutoff" (for example an index on `wind_forecasts (start_time, publish_time DESC)`).
- Enable Row Level Security on the tables. The backend is the only client and connects with server-side credentials.
- Tell me exactly how to apply the migrations (Supabase SQL editor or CLI) and let me run them. Do not ask me for secrets in chat.

**Step 3: Pydantic models**
- Raw Elexon records, cleaned internal records, API request parameters, API response bodies (forecast comparison, metrics, horizon analysis, errors).

**Step 4: Ingestion script**
- `backend/scripts/fetch_data.py` downloads Dec 2025 margin plus Jan 2026 data, cleans it, and upserts into Supabase (idempotent, safe to re-run).
- Print row counts and date coverage after loading.
- The deployed app must NOT depend on the live Elexon API at runtime. Data is loaded once into Supabase.

**Step 5: Documentation**
- `docs/SCHEMA.md`: tables, columns, types, indexes, and example JSON for each response model.

Deliverable: migrations, models, ingestion script that ran successfully, schema doc. **STOP and wait for approval.**

### Phase 2: API Building  (STOP after this phase)

- Framework: FastAPI. Routers, services, and data-access in separate modules.
- Business logic (forecast selection, metrics) lives in **pure functions in a services layer**, not inside route handlers.
- The data-access layer reads from Supabase Postgres. Business logic must not know about the database.
- Minimum endpoints (rename only with my approval):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check (include DB connectivity) |
| GET | `/api/meta` | Available date range, default cutoff, data coverage |
| GET | `/api/forecast?date=YYYY-MM-DD&cutoff=HH:MM` | Selected forecast vs. actual for delivery day `date` |
| GET | `/api/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD&cutoff=HH:MM` | Accuracy metrics over a date range |
| GET | `/api/horizon-analysis?start=...&end=...` | Error by forecast lead time (optional) |

- Validate inputs: dates within January 2026, `start <= end`, valid cutoff format. Return clear 4xx errors with a consistent error body.
- Enable CORS (configurable origins).
- Auto-generated docs at `/docs` must be accurate, so I can try each endpoint there.
- All config (DB URL, CORS origins, default cutoff) from environment variables, documented in `.env.example`.

**Automated tests (you run these, part of this phase):**
- Use `pytest` and FastAPI's `TestClient`. Unit tests must not need a live database (use fixtures or an in-memory dataframe).
- **Forecast selection unit tests are mandatory.** Cover at least:
  - Picks the latest `publishTime` at or before the cutoff
  - Ignores forecasts published after the cutoff
  - A forecast published exactly at the cutoff is included
  - A missing forecast for a `startTime` is flagged, not filled
  - Multiple forecasts per `startTime`
  - Timezone and DST edge cases (use a non-January date in a unit test to prove the logic)
- Unit tests for each metric using small hand-calculated examples (state the expected numbers in the test).
- API tests per endpoint: happy path, invalid date, out-of-range date, missing params, bad cutoff.
- Run the full suite, fix bugs, and report results including coverage. Never weaken tests to make them pass.

Deliverable: running API, list of endpoints with example calls, passing test suite. **STOP and wait for approval.**

### Phase 3: Frontend Building

Only start after I approve Phase 2.

- React (Vite), TypeScript preferred. Charts via Recharts or Plotly.
- **The frontend talks only to the backend API.** It never connects to Supabase directly and never holds database keys.
- No analysis logic in the frontend.
- Required views:
  - **Controls:** delivery date picker (limited to January 2026) and decision cutoff time input
  - **Main chart:** actual vs. latest forecast at decision time, 30-minute resolution, clear axis labels and units (MW)
  - **KPI cards:** MAE, RMSE, bias, P95 absolute error, coverage
  - **Error analysis:** error distribution (histogram) and error by hour of day
  - **Assumptions panel:** show the cutoff time and data source on screen
- Handle loading, empty, and error states properly.
- Responsive, professional design (this is shown to a client). Consistent colors, readable typography, no clutter.
- API base URL from an environment variable.

Deliverable: working UI against the real API. **STOP and wait for approval.**

### Phase 4: Docker, Deployment, README

- `backend/Dockerfile`, `frontend/Dockerfile`, and a root `docker-compose.yml` so `docker compose up` runs the app (the database is remote Supabase, configured through `.env`).
- For serverless hosting use Supabase's **connection pooler** URL, and note this in the docs.
- Provide deployment steps for Vercel or Heroku (ask me which one). Secrets go in the platform's environment settings, never in the repo.
- Write `README.md` containing:
  - Project overview
  - Directory and file structure with a one-line description of each
  - How to run locally (with and without Docker)
  - How to set up Supabase and run migrations and the ingestion script
  - How to run tests
  - Live app link (placeholder until deployed)
  - **An explicit statement that AI tools were used to assist development**
  - Assumptions and limitations

Deliverable: working containers, deployment guide, README. **STOP.**

---

## 5. Target Repo Structure

```
.
├── AGENTS.md
├── README.md
├── docker-compose.yml
├── .env.example
├── docs/
│   ├── ASSUMPTIONS.md
│   ├── DATA_NOTES.md
│   └── SCHEMA.md
├── supabase/
│   └── migrations/        # SQL schema files
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/        # Pydantic schemas
│   │   ├── routers/       # Route handlers (thin)
│   │   ├── services/      # Selection and metrics logic (pure functions)
│   │   └── data/          # Supabase/Postgres access layer
│   ├── scripts/
│   │   └── fetch_data.py
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
```

Propose any deviation before making it.

---

## 6. Coding Standards

**Python**
- Type hints everywhere. Format with `black`, lint with `ruff`.
- Docstrings on public functions, especially selection and metric logic.
- No business logic in route handlers. No hardcoded paths, URLs, or secrets.
- Use parameterized queries only. Never build SQL with string formatting.
- Use `pandas` for transformations, but keep functions pure and testable.

**React**
- Functional components and hooks. Keep components small.
- Separate API client code from UI components.
- No hardcoded API URLs.

**General**
- Never commit secrets, `.env`, `node_modules`, or virtual environments. Maintain `.gitignore`.
- Prefer simple, readable solutions over clever ones. A tech lead will review this code.

---

## 7. Things You Must NOT Do

- Do not skip a phase gate or continue without my approval.
- Do not use data beyond Elexon FUELHH and WINDFOR wind data.
- Do not build your own forecasting model. We only evaluate existing forecasts.
- Do not call the live Elexon API from the deployed app at request time.
- Do not expose Supabase keys or the database URL to the frontend or the repo.
- Do not silently fill, interpolate, or drop missing data.
- Do not weaken or delete tests to get a green result.
- Do not fabricate API behavior. If unsure, check the docs or ask me.

---

## 8. Definition of Done (Whole Project)

- [ ] Supabase schema applied through version-controlled migrations, data loaded
- [ ] Forecast selection logic is correct and unit tested
- [ ] All endpoints validated, documented at `/docs`, and tested with pytest
- [ ] Frontend shows actual vs. latest forecast and the accuracy metrics clearly
- [ ] `docker compose up` works from a clean clone with a filled `.env`
- [ ] App deployed and reachable via public link
- [ ] README complete, including the AI-usage disclosure
- [ ] Assumptions (for example the 12:00 gate closure) documented and visible in the UI