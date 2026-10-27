# Data Exploration Notes: Elexon BMRS API

This document details findings from inspecting the official Elexon BMRS API (Insights Solution) stream endpoints for wind generation actuals (`FUELHH`) and wind generation forecasts (`WINDFOR`).

---

## 1. Endpoints & Query Parameters

All endpoints are part of Elexon's open public API (`https://data.elexon.co.uk/bmrs/api/v1`) and do not require API keys.

### 1.1 Actuals: FUELHH Stream Endpoint
- **URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
- **Supported Query Parameters:**
  - `fuelType` (string): Filter by generation fuel type. Must be set to `WIND`.
  - `settlementDateFrom` (string, `YYYY-MM-DD`): Start date for settlement day filtering.
  - `settlementDateTo` (string, `YYYY-MM-DD`): End date for settlement day filtering.
  - `settlementPeriod` (integer, 1..48): Optional filter for specific half-hour settlement periods.
  - `publishDateTimeFrom` (string, ISO 8601 UTC): Optional filter by publish timestamp.
  - `publishDateTimeTo` (string, ISO 8601 UTC): Optional filter by publish timestamp.
- **Important Parameter Constraints:**
  - The Elexon API specifies that `settlementDate` parameters and `publishDateTime` parameters cannot be combined in the same query.
  - For actuals over a calendar month, querying with `settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31&fuelType=WIND` directly targets all settlement periods of January 2026.

### 1.2 Forecasts: WINDFOR Stream Endpoint
- **URL:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
- **Supported Query Parameters:**
  - `publishDateTimeFrom` (string, ISO 8601 UTC format: `YYYY-MM-DDTHH:MM:SSZ`): Start of publish time window.
  - `publishDateTimeTo` (string, ISO 8601 UTC format: `YYYY-MM-DDTHH:MM:SSZ`): End of publish time window.
- **Important Parameter Constraints:**
  - Date filtering on WINDFOR is strictly by **`publishTime`**, not target `startTime`.
  - To retrieve forecasts for target delivery dates in January 2026, queries must include a publish time margin (e.g. from `2025-12-24T00:00:00Z` to `2026-02-01T00:00:00Z`), and the ingestion logic filters target `startTime` for January 2026.
  - The stream endpoint returns an array of JSON objects directly.

---

## 2. Response Fields & Data Types

### 2.1 FUELHH Sample & Field Schema

```json
{
  "dataset": "FUELHH",
  "publishTime": "2026-01-01T00:30:00Z",
  "startTime": "2026-01-01T00:00:00Z",
  "settlementDate": "2026-01-01",
  "settlementPeriod": 1,
  "fuelType": "WIND",
  "generation": 13756
}
```

| Field Name | Raw Type | Description | Target DB Column |
|---|---|---|---|
| `dataset` | string | Constant identifier (`"FUELHH"`) | Omitted / Ingestion metadata |
| `publishTime` | string (ISO 8601 UTC) | Time record was published | Omitted (or ingestion metadata) |
| `startTime` | string (ISO 8601 UTC) | Half-hour start timestamp | `start_time TIMESTAMPTZ PRIMARY KEY` |
| `settlementDate` | string (`YYYY-MM-DD`) | GB settlement date | `settlement_date DATE` |
| `settlementPeriod` | integer (1..50) | GB settlement period (1 to 48 standard) | `settlement_period SMALLINT` |
| `fuelType` | string | Fuel category (`"WIND"`) | Verified during ingestion |
| `generation` | integer / float | Half-hour average generation in MW | `generation_mw NUMERIC(10, 2)` |

### 2.2 WINDFOR Sample & Field Schema

```json
{
  "dataset": "WINDFOR",
  "publishTime": "2026-01-01T02:30:00Z",
  "startTime": "2026-01-01T00:00:00Z",
  "generation": 19960
}
```

| Field Name | Raw Type | Description | Target DB Column |
|---|---|---|---|
| `dataset` | string | Constant identifier (`"WINDFOR"`) | Omitted / Ingestion metadata |
| `publishTime` | string (ISO 8601 UTC) | Forecast publication timestamp | `publish_time TIMESTAMPTZ` |
| `startTime` | string (ISO 8601 UTC) | Target forecast start timestamp | `start_time TIMESTAMPTZ` |
| `generation` | integer / float | Forecasted generation in MW | `generation_mw NUMERIC(10, 2)` |

*Primary Key for `wind_forecasts`:* `(start_time, publish_time)`.

---

## 3. Time Resolution & Lead Times

### 3.1 Time Resolution
- **FUELHH (Actuals):** Half-hourly (30-minute interval). Every hour contains two settlement periods (e.g. `00:00:00Z` for period 1, `00:30:00Z` for period 2).
- **WINDFOR (Forecasts):** **Hourly (60-minute interval)**. Inspection of all 22,776 records confirmed that `startTime.minute == 0` for all records. Elexon WINDFOR forecasts are provided on an hourly basis.

### 3.2 Publish Cadence & Batch Structure
- Forecasts are published in batches approximately every 2 to 4 hours (average ~3 hours between publications; typically 8 publish batches per day).
- Each publish batch contains 73 hourly forecast points covering a window from ~25 hours in the past up to ~66 hours into the future.

### 3.3 Forecast Horizon & Lead Time (`startTime - publishTime`)
- **Maximum Lead Time:** **66.5 hours** (~2.77 days ahead).
- **Minimum Lead Time:** **-25.5 hours** (retrospective outturns/re-forecasts included in publication files).
- For day-ahead decision making at D-1 12:00 Europe/London, the forecast lead time for day D delivery (starting D 00:00 to D 23:00) ranges from 12 hours to 35 hours ahead, comfortably within WINDFOR's 66.5-hour maximum horizon.

---

## 4. Gaps and Duplicates Analysis (January Purchase Decisions Scope)

Decisions made in January 2026 (1 Jan to 31 Jan on D-1) correspond to **delivery days 2026-01-02 through 2026-02-01** (31 delivery days).

### 4.1 Actuals (`FUELHH`)
- **Total records loaded in Supabase (2026-01-01 to 2026-02-01):** 1,536 half-hour periods (32 days × 48 periods/day).
- **Unique start timestamps:** 1,536.
- **Duplicates:** 0.
- **Gaps / Missing periods:** 0 (complete 100% continuous coverage).

### 4.2 Forecasts (`WINDFOR`)
- **Total records loaded in Supabase (publish window 2025-12-24 to 2026-02-02):** 18,664 clean records predicting 1 Jan through 1 Feb target times.
- **Unique `(startTime, publishTime)` pairs:** 18,664.
- **Duplicates:** 0.
- **Distinct January decision delivery target hours covered (2 Jan through 1 Feb):** 744 (out of 744 expected; 100% coverage).
- **Gaps in hourly target forecasts:** 0.

---

## 5. Findings from Data Sanity Checks (January 2026 Decisions: 2026-01-02 to 2026-02-01)

Independent validation directly on raw PostgreSQL records for decision cutoff at 12:00 London on D-1 yielded the following verified findings:

### 5.1 Time Shift Alignment Check
Evaluating Pearson correlation between actual generation at $t$ and selected forecast generation at $t + \text{shift}$ confirms that UTC timestamps in `wind_actuals` and `wind_forecasts` are synchronized with high correlation ($r \approx 0.95$).

### 5.2 Bias & Over-Forecasting Check
- **Mean Error (Bias):** **+1,685.27 MW** (evaluating `forecast - actual` across all 744 hourly delivery slots).
- **Directional Tendency:** Wind generation forecasts exhibited a systemic positive bias (over-forecasting) throughout the January purchase decision window.
- **Hourly Over-Forecasting Share:** Wind generation forecasts exceeded actuals in **84.95% of evaluated hours** (632 out of 744 hourly slots).

### 5.3 Volumetric Accuracy Metrics
- **Mean Absolute Error (MAE):** **1,883.98 MW**.
- **Root Mean Squared Error (RMSE):** **2,350.33 MW**.
- **Guarded MAPE:** **18.86%** (with 0 hours excluded due to $<10\text{ MW}$ low-actual threshold).

### 5.4 Error Percentiles & Operating Reserve Buffer
- **P50 Absolute Error:** **1,606.50 MW**.
- **P90 Absolute Error:** **3,767.70 MW** (computed via linear interpolation on raw deviations $|f - a|$).
- **P95 Absolute Error:** **4,497.75 MW**.
- **Interpretation for Power Buyers:** In 9 out of 10 hourly delivery intervals, the forecast deviation was within 3,768 MW, meaning a buffer of 3,768 MW would have covered volumetric risk for 90% of hours.

### 5.5 Market Auction Context
- Commercial physical day-ahead auctions in Great Britain close at:
  - **[EPEX SPOT GB Day-Ahead (60-minute auction)](https://www.epexspot.com/en/market-data?market_area=GB&trading_hub=GB&delivery_date=&underlying_market=Auction&modality=Day-Ahead&sub_modality=60min):** Order book closes daily at **09:20 Europe/London** (D-1).
  - **[Nord Pool (N2EX) GB Day-Ahead](https://www.nordpoolgroup.com/en/trading/Day-ahead-trading/Auction-Trading/):** Order book closes daily at **09:50 Europe/London** (D-1).
- Elexon BSC physical notifications (FPNs) and balancing bids close 1 hour ahead of each half-hour settlement period on day D.
- The application defaults to a **12:00 Europe/London** D-1 cutoff time while allowing energy buyers to configure earlier cutoffs (such as 09:20 or 09:50) to evaluate forecast availability at exchange auction closures.

