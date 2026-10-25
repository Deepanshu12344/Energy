-- Migration: 20260101000000_create_wind_tables.sql
-- Description: Create wind_actuals and wind_forecasts tables with RLS and cutoff lookup indexes

-- 1. Actuals table
CREATE TABLE IF NOT EXISTS wind_actuals (
    start_time TIMESTAMPTZ PRIMARY KEY,
    generation_mw NUMERIC(10, 2) NOT NULL,
    settlement_date DATE,
    settlement_period SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE wind_actuals IS 'Elexon FUELHH actual wind generation half-hourly outturn in Great Britain';
COMMENT ON COLUMN wind_actuals.start_time IS 'UTC start timestamp of the 30-minute settlement period';
COMMENT ON COLUMN wind_actuals.generation_mw IS 'Average half-hourly actual wind generation in Megawatts (MW)';
COMMENT ON COLUMN wind_actuals.settlement_date IS 'GB settlement date (YYYY-MM-DD)';
COMMENT ON COLUMN wind_actuals.settlement_period IS 'GB settlement period (1 to 48/50)';
COMMENT ON COLUMN wind_actuals.created_at IS 'Timestamp when the record was first ingested into the database';
COMMENT ON COLUMN wind_actuals.updated_at IS 'Timestamp when the record was last modified or re-ingested';

-- 2. Forecasts table
CREATE TABLE IF NOT EXISTS wind_forecasts (
    start_time TIMESTAMPTZ NOT NULL,
    publish_time TIMESTAMPTZ NOT NULL,
    generation_mw NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (start_time, publish_time)
);

COMMENT ON TABLE wind_forecasts IS 'Elexon WINDFOR national wind generation forecasts at various publication cadences';
COMMENT ON COLUMN wind_forecasts.start_time IS 'UTC target start timestamp forecasted';
COMMENT ON COLUMN wind_forecasts.publish_time IS 'UTC publication timestamp of the forecast';
COMMENT ON COLUMN wind_forecasts.generation_mw IS 'Forecasted wind generation in Megawatts (MW)';
COMMENT ON COLUMN wind_forecasts.created_at IS 'Timestamp when the forecast was first ingested';
COMMENT ON COLUMN wind_forecasts.updated_at IS 'Timestamp when the forecast was last modified or re-ingested';

-- 3. Composite Index for Decision-Time Cutoff Lookups
-- Optimizes queries filtering by delivery period and selecting latest publish_time <= cutoff
CREATE INDEX IF NOT EXISTS idx_wind_forecasts_cutoff_lookup 
ON wind_forecasts (start_time, publish_time DESC);

-- 4. Enable Row Level Security (RLS)
-- Backend connects using table owner / service-role credentials which bypass RLS.
-- With no public policies defined, anon access is blocked by default.
ALTER TABLE wind_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wind_forecasts ENABLE ROW LEVEL SECURITY;
