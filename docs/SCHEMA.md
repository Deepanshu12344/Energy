# Database Schema & Data Models Documentation

This document describes the PostgreSQL schema hosted on Supabase, database indexes, Row Level Security (RLS), connection pooling guidance, and representative JSON schemas for all API response models.

---

## 1. Database Schema

### 1.1 `wind_actuals` Table

Stores half-hourly national wind generation outturns sourced from Elexon BMRS `FUELHH` (where `fuelType = 'WIND'`).

| Column Name | PostgreSQL Data Type | Constraints | Description |
|---|---|---|---|
| `start_time` | `TIMESTAMPTZ` | `PRIMARY KEY` | UTC start timestamp of the 30-minute settlement period |
| `generation_mw` | `NUMERIC(10, 2)` | `NOT NULL` | Actual wind generation outturn in Megawatts (MW) |
| `settlement_date` | `DATE` | `NULLABLE` | GB settlement date (`YYYY-MM-DD`) |
| `settlement_period` | `SMALLINT` | `NULLABLE` | GB settlement period (1 to 48 standard; up to 50 on clock change) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Ingestion timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Ingestion update timestamp |

### 1.2 `wind_forecasts` Table

Stores national wind generation forecasts sourced from Elexon BMRS `WINDFOR` published at varying publication cadences.

| Column Name | PostgreSQL Data Type | Constraints | Description |
|---|---|---|---|
| `start_time` | `TIMESTAMPTZ` | `NOT NULL` | UTC target forecasted start timestamp |
| `publish_time` | `TIMESTAMPTZ` | `NOT NULL` | UTC publication timestamp of the forecast |
| `generation_mw` | `NUMERIC(10, 2)` | `NOT NULL` | Forecasted wind generation in Megawatts (MW) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Ingestion timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Ingestion update timestamp |

**Primary Key:** `(start_time, publish_time)`

---

## 2. Indexes & Performance Optimization

### 2.1 Cutoff Lookup Index
```sql
CREATE INDEX idx_wind_forecasts_cutoff_lookup 
ON wind_forecasts (start_time, publish_time DESC);
```

#### Query Pattern Accelerated
At decision time (D-1 gate closure), buyers require the latest available forecast published on or before the cutoff time for each delivery interval on day D:

```sql
-- Selecting latest forecast at or before cutoff for a given delivery interval
SELECT DISTINCT ON (start_time)
    start_time,
    publish_time,
    generation_mw
FROM wind_forecasts
WHERE start_time >= :day_start 
  AND start_time < :day_end
  AND publish_time <= :cutoff_utc
ORDER BY start_time, publish_time DESC;
```
With the index `(start_time, publish_time DESC)`, PostgreSQL can perform index range scans and immediately identify the leading row for each `start_time` satisfying `publish_time <= :cutoff_utc`.

---

## 3. Row Level Security (RLS) & Connection Pooling

### 3.1 Row Level Security (RLS)
- Both `wind_actuals` and `wind_forecasts` have Row Level Security enabled:
  ```sql
  ALTER TABLE wind_actuals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE wind_forecasts ENABLE ROW LEVEL SECURITY;
  ```
- No public policies (`FOR SELECT USING (...)`) are defined.
- The FastAPI backend service and the data ingestion script connect using the PostgreSQL owner / service role credentials (via `DATABASE_URL`), which bypasses RLS automatically. Anonymous and unauthenticated access via Supabase's public PostgREST API is completely blocked.

### 3.2 Supabase Connection Pooler Support
Supabase offers two connection pooling endpoints:
1. **Session Pooler (Port 5432):**
   - Connects through Supabase pooler with 1:1 session persistence.
   - Recommended for database migrations and initial batch data ingestion.
2. **Transaction Pooler (Port 6543 - PgBouncer mode):**
   - Recommended for serverless hosting environments (e.g. Vercel) where connection counts must remain lean.
   - **Important:** Transaction-mode pooling does not support PostgreSQL prepared statements across pooled connections.
   - When using `psycopg` (v3), prepared statements must be disabled by setting `prepare_threshold=None`:
     ```python
     conn = psycopg.connect(database_url, prepare_threshold=None)
     ```
     `backend/scripts/fetch_data.py` is configured with `prepare_threshold=None` out-of-the-box, ensuring full compatibility with both session (5432) and transaction (6543) poolers.

---

## 4. How to Apply the Migrations

You can apply the migration file (`supabase/migrations/20260101000000_create_wind_tables.sql`) using either of the following two methods:

### Method A: Via Supabase Dashboard (Recommended & Easiest)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project.
3. In the left navigation bar, click on **SQL Editor**.
4. Click **New query**.
5. Copy and paste the entire contents of `supabase/migrations/20260101000000_create_wind_tables.sql`.
6. Click **Run** (or press `Ctrl+Enter`).
7. Confirm that `wind_actuals` and `wind_forecasts` appear under **Table Editor** with RLS active and the index `idx_wind_forecasts_cutoff_lookup` listed under **Database > Indexes**.

### Method B: Via Supabase CLI
If you have the Supabase CLI linked to your remote project:
```bash
# Link project (if not linked already)
supabase link --project-ref your-project-ref

# Push migrations to remote database
supabase db push
```

---

## 5. API Response Models & Example JSON Payloads

### 5.1 `GET /api/forecast` (`ForecastComparisonResponse`)
Returns the selected forecast at or before cutoff compared with actuals for each interval of the specified delivery day. All 48 half-hour slots are returned: `:00` slots have status `"forecast_selected"` (or `"missing"` if no forecast before cutoff), and `:30` slots have status `"not_applicable"` with `forecast_mw: null`.

```json
{
  "delivery_date": "2026-01-15",
  "cutoff_time": "12:00",
  "cutoff_timestamp_utc": "2026-01-14T12:00:00Z",
  "total_slots": 48,
  "hourly_slots": 24,
  "matched_slots": 24,
  "missing_slots": 0,
  "not_applicable_slots": 24,
  "data": [
    {
      "start_time": "2026-01-15T00:00:00Z",
      "actual_mw": 14602.0,
      "forecast_mw": 15813.0,
      "publish_time": "2026-01-14T11:30:00Z",
      "lead_time_hours": 12.5,
      "error_mw": 1211.0,
      "abs_error_mw": 1211.0,
      "error_pct": 8.29,
      "status": "forecast_selected",
      "is_actual_missing": false
    },
    {
      "start_time": "2026-01-15T00:30:00Z",
      "actual_mw": 14311.0,
      "forecast_mw": null,
      "publish_time": null,
      "lead_time_hours": null,
      "error_mw": null,
      "abs_error_mw": null,
      "error_pct": null,
      "status": "not_applicable",
      "is_actual_missing": false
    }
  ]
}
```

### 5.2 `GET /api/metrics` (`MetricsResponse`)
Returns summary evaluation metrics over a delivery date range evaluated on hourly timestamps.

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "cutoff_time": "12:00",
  "metrics": {
    "mae": 2002.91,
    "rmse": 2470.08,
    "bias": 1805.86,
    "mape": 19.5,
    "mape_excluded_count": 0,
    "p50_abs_error": 1709.5,
    "p90_abs_error": 4000.0,
    "p95_abs_error": 4686.1,
    "buffer_recommendation_mw_p90": 4000.0,
    "total_slots": 744,
    "evaluated_slots": 744,
    "missing_slots": 0
  }
}
```

### 5.3 `GET /api/error-by-hour` (`ErrorByHourResponse`)
Returns accuracy metrics aggregated across the 24 hours of the delivery day (0 to 23).

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "cutoff_time": "12:00",
  "hourly_errors": [
    {
      "hour": 0,
      "count": 31,
      "mae": 2078.0,
      "rmse": 2660.04,
      "bias": 2016.06
    },
    {
      "hour": 12,
      "count": 31,
      "mae": 1800.65,
      "rmse": 2174.53,
      "bias": 1436.77
    }
  ]
}
```

### 5.4 `GET /api/horizon-analysis` (`HorizonAnalysisResponse`)
Returns forecast accuracy segmented by lead time horizon bucket. Negative lead times (published after target) are segregated into `after_target_bucket`.

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "main_buckets": [
    {
      "horizon_bucket": "<12h",
      "count": 2976,
      "mae": 1800.73,
      "rmse": 2276.96,
      "bias": 1582.17
    },
    {
      "horizon_bucket": "12-18h",
      "count": 1488,
      "mae": 1932.82,
      "rmse": 2415.68,
      "bias": 1739.88
    }
  ],
  "after_target_bucket": {
    "horizon_bucket": "published_after_target",
    "count": 3697,
    "mae": 1884.34,
    "rmse": 2341.20,
    "bias": 1753.40
  },
  "buckets": [ ... ]
}
```

### 5.5 `GET /api/meta` (`MetaResponse`)
Returns available date ranges, default cutoff time, database record counts, and resolution matching notes.

```json
{
  "available_start_date": "2026-01-01",
  "available_end_date": "2026-01-31",
  "default_cutoff_time": "12:00",
  "actual_rows_count": 1488,
  "forecast_rows_count": 18080,
  "timezone": "Europe/London",
  "resolution_notes": {
    "actuals_resolution": "30-minute half-hourly outturns (FUELHH)",
    "forecasts_resolution": "60-minute hourly forecasts (WINDFOR, minute: 0)",
    "matching_strategy": "exact_timestamp_match",
    "chart_behavior": "All 48 half-hour slots returned; :30 slots have forecast null with status 'not_applicable'",
    "metrics_evaluation_scope": "Evaluated strictly on hourly slots (:00) where a forecast was available",
    "mape_guard_threshold_mw": 10.0,
    "percentile_method": "linear_interpolation"
  }
}
```

### 5.6 `GET /api/health` (`HealthResponse`)
Returns backend service and database connectivity health.

```json
{
  "status": "ok",
  "database_connected": true,
  "timestamp": "2026-01-20T12:00:00Z"
}
```

### 5.7 Error Response (`ErrorResponse`)
Returned for all 4xx client errors (e.g. invalid date ranges, bad cutoff formats) and 5xx errors.

```json
{
  "error": "VALIDATION_ERROR",
  "detail": "start date (2026-01-25) must be before or equal to end date (2026-01-10)",
  "status_code": 400
}
```
