# Domain and Technical Assumptions

This document records the operational, technical, and domain assumptions governing the Wind Generation Forecast Monitoring application.

---

## 1. Domain & Scope Assumptions

1. **Delivery Scope (January 2026):**
   - The analysis is scoped strictly to delivery days in January 2026 (`2026-01-01` to `2026-01-31`).
   - Forecast publication records are fetched with a lead margin starting on `2025-12-24T00:00:00Z` to ensure all day-ahead forecasts for early January delivery days (which are published in late December) are available.

2. **Decision Cutoff Time (D-1 Gate Closure):**
   - Day-ahead power purchase decisions for delivery day $D$ occur at a gate closure cutoff time on day $D - 1$.
   - The default gate closure cutoff is **12:00 Europe/London** time.
   - The cutoff time must remain fully configurable via environment variables (`DEFAULT_GATE_CLOSURE_TIME`) and API request query parameters.
   - For each target start time on delivery day $D$, the forecast selected is the latest forecast with `publish_time <= cutoff`.
   - If no forecast exists at or before the cutoff for a given target start time, it is explicitly flagged as missing.

3. **Time Resolution Alignment & Slot Status:**
   - Elexon `FUELHH` actuals are published at 30-minute intervals (half-hourly settlement periods 1..48).
   - Elexon `WINDFOR` forecasts are published at 60-minute intervals (hourly, `:00`).
   - In accordance with the non-fabrication rule ("Do not silently fill, interpolate, or drop missing data"):
     - **Exact Timestamp Matching:** Forecasts are evaluated only against the actual at the matching hourly timestamp (`:00`).
     - **Chart Representation:** The chart endpoint (`/api/forecast`) preserves all 48 half-hour slots. Half-hour slots (`:30`) have actual generation present, but `forecast_mw = null` with status `"not_applicable"`. Hourly slots (`:00`) have status `"forecast_selected"` (or `"missing"` if no forecast was published before the cutoff).
     - **Metrics Scope:** Accuracy metrics (`/api/metrics`, `/api/error-by-hour`) are evaluated exclusively on hourly slots (`:00`). `"not_applicable"` half-hour slots do not count toward missing counts or coverage metrics.
     - **Horizon Analysis Lead Times:** Forecasts with negative lead times (`startTime < publishTime`, i.e. published after target delivery) are segregated into a separate `"published_after_target"` bucket and excluded from the main forward-looking buckets.

4. **Accuracy Metrics & Statistical Methods:**
   - **Error Definition:** $\text{Error} = \text{Forecast} - \text{Actual}$. Positive error indicates over-forecasting; negative indicates under-forecasting.
   - **MAPE Guard & Exclusion Count:** To prevent division by zero or extreme skew from near-zero outturns, any observation with $\text{Actual} < 10.0\text{ MW}$ is excluded from the MAPE calculation. The number of excluded pairs is explicitly reported as `mape_excluded_count`.
   - **Percentile Calculation Method:** Percentiles of absolute error ($P_{50}, P_{90}, P_{95}$) are computed using standard linear interpolation between adjacent data points (equivalent to NumPy/SciPy `method="linear"`, equivalent to type 7 in R/Hyndman & Fan 1996).
   - **Buffer Recommendation:** The P90 absolute error is recommended as the operating reserve buffer (covering 90% of observed forecast deviations).

5. **Timezone Handling:**
   - All timestamps are stored and processed in **UTC** as timezone-aware timestamps (`TIMESTAMPTZ` in PostgreSQL, ISO 8601 with `Z` in JSON).
   - Day boundaries and cutoff definitions are computed in `Europe/London` timezone. In January, UK standard time is UTC (GMT), but time conversions explicitly utilize timezone-aware arithmetic so logic remains robust to Daylight Saving Time (BST).

6. **Python Runtime Pinning:**
   - **Python 3.12** is pinned as the project target runtime for Docker container packaging in Phase 4.

---

## 2. Infrastructure & Data Ingestion Assumptions

1. **Supabase PostgreSQL & Connection Pooling:**
   - The backend service and ingestion script are the sole clients of the database.
   - The application supports both direct connections / session pooler connections (default port `5432`) and Supabase transaction pooler connections (port `6543`, PgBouncer).
   - **Transaction Pooler Note:** When connecting through Supabase's transaction pooler (port `6543`), client prepared statements must be disabled (`prepare_threshold=None` in `psycopg` and `psycopg_pool`) because transaction-mode connection poolers do not preserve named prepared statements across transactions.
   - Row Level Security (RLS) is enabled on all tables. Since the backend service connects using the database owner / service role credentials, it automatically bypasses RLS without requiring public client policies.

2. **Idempotency & Re-runs:**
   - Ingestion is completely idempotent. Re-running `backend/scripts/fetch_data.py` will update records with fresh generation values and touch `updated_at`, without creating duplicate rows or corrupting keys.
   - Natural primary keys are strictly enforced:
     - `wind_actuals`: `start_time`
     - `wind_forecasts`: `(start_time, publish_time)`

3. **Runtime Decoupling:**
   - The deployed FastAPI backend and frontend will never make HTTP requests to Elexon at runtime.
   - All data queries hit the pre-loaded Supabase database.
