#!/usr/bin/env python3
"""Elexon BMRS Wind Data Ingestion Script.

Fetches actuals (FUELHH, WIND) and forecasts (WINDFOR) for January 2026 delivery
and upserts them into Supabase PostgreSQL.

Features:
- Parameterized SQL batch upsert (idempotent, safe to re-run).
- Updates `updated_at` on conflict.
- Supports Supabase session pooler (port 5432) and transaction pooler (port 6543)
  by disabling client prepared statements (prepare_threshold=None).
- Validates data with Pydantic schemas.
- Dynamically analyzes date coverage and lists any missing intervals/gaps.
- Never prints or commits secrets.
- Supports --dry-run flag for validation without database access.
"""

import argparse
from datetime import datetime, timedelta, timezone
import json
import logging
import os
from pathlib import Path
import sys
from typing import Dict, List, Optional, Set, Tuple
import urllib.parse
import urllib.request

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
except ImportError:
    pass

import psycopg
from backend.app.models.elexon import RawFuelHHRecord, RawWindforRecord
from backend.app.models.internal import ActualRecord, ForecastRecord

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fetch_data")

ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
DEFAULT_BATCH_SIZE = 1000


def fetch_json_stream(url: str) -> List[dict]:
    """Fetch and parse JSON records from an Elexon stream endpoint."""
    logger.info("Requesting Elexon endpoint: %s", url)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "EnergyForecastMonitorIngestion/1.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP request failed with status {resp.status}")
        raw_bytes = resp.read()
        return json.loads(raw_bytes)


def fetch_fuelhh_actuals(start_date: str = "2026-01-01", end_date: str = "2026-02-01") -> List[ActualRecord]:
    """Fetch half-hourly wind actual generation records from FUELHH for a settlement date range."""
    params = {
        "settlementDateFrom": start_date,
        "settlementDateTo": end_date,
        "fuelType": "WIND",
    }
    query_str = urllib.parse.urlencode(params)
    url = f"{ELEXON_BASE_URL}/FUELHH/stream?{query_str}"
    
    raw_records = fetch_json_stream(url)
    logger.info("Received %d raw FUELHH records from Elexon", len(raw_records))
    
    clean_records: List[ActualRecord] = []
    seen_start_times: Set[datetime] = set()
    dropped_duplicates = 0
    validation_errors = 0

    for raw in raw_records:
        try:
            parsed = RawFuelHHRecord.model_validate(raw)
            if parsed.fuelType != "WIND":
                continue
            
            # UTC normalization
            st_utc = parsed.startTime.astimezone(timezone.utc)
            if st_utc in seen_start_times:
                dropped_duplicates += 1
                continue
            seen_start_times.add(st_utc)
            
            clean_records.append(
                ActualRecord(
                    start_time=st_utc,
                    generation_mw=parsed.generation,
                    settlement_date=datetime.strptime(parsed.settlementDate, "%Y-%m-%d").date() if parsed.settlementDate else None,
                    settlement_period=parsed.settlementPeriod,
                )
            )
        except Exception as exc:
            validation_errors += 1
            logger.warning("Dropped invalid FUELHH row: %s | Error: %s", raw, exc)

    logger.info(
        "FUELHH processing: %d clean records, %d duplicate rows dropped, %d validation errors",
        len(clean_records),
        dropped_duplicates,
        validation_errors,
    )
    return clean_records


def fetch_windfor_forecasts(
    pub_from: str = "2025-12-24T00:00:00Z",
    pub_to: str = "2026-02-02T00:00:00Z",
    target_start_min: str = "2026-01-01T00:00:00Z",
    target_start_max: str = "2026-02-01T23:30:00Z",
) -> List[ForecastRecord]:
    """Fetch wind forecasts from WINDFOR published within margin predicting target delivery days."""
    params = {
        "publishDateTimeFrom": pub_from,
        "publishDateTimeTo": pub_to,
    }
    query_str = urllib.parse.urlencode(params)
    url = f"{ELEXON_BASE_URL}/WINDFOR/stream?{query_str}"

    raw_records = fetch_json_stream(url)
    logger.info("Received %d raw WINDFOR records from Elexon", len(raw_records))

    min_target = datetime.fromisoformat(target_start_min.replace("Z", "+00:00"))
    max_target = datetime.fromisoformat(target_start_max.replace("Z", "+00:00"))

    clean_records: List[ForecastRecord] = []
    seen_natural_keys: Set[Tuple[datetime, datetime]] = set()
    dropped_out_of_target = 0
    dropped_duplicates = 0
    validation_errors = 0

    for raw in raw_records:
        try:
            parsed = RawWindforRecord.model_validate(raw)
            st_utc = parsed.startTime.astimezone(timezone.utc)
            pub_utc = parsed.publishTime.astimezone(timezone.utc)

            # Filter target delivery start times within January 2026
            if not (min_target <= st_utc <= max_target):
                dropped_out_of_target += 1
                continue

            natural_key = (st_utc, pub_utc)
            if natural_key in seen_natural_keys:
                dropped_duplicates += 1
                continue
            seen_natural_keys.add(natural_key)

            clean_records.append(
                ForecastRecord(
                    start_time=st_utc,
                    publish_time=pub_utc,
                    generation_mw=parsed.generation,
                )
            )
        except Exception as exc:
            validation_errors += 1
            logger.warning("Dropped invalid WINDFOR row: %s | Error: %s", raw, exc)

    logger.info(
        "WINDFOR processing: %d clean records in January target range, %d out-of-target forecasts ignored, %d duplicates dropped, %d validation errors",
        len(clean_records),
        dropped_out_of_target,
        dropped_duplicates,
        validation_errors,
    )
    return clean_records


def analyze_actuals_gaps(
    records: List[ActualRecord],
    expected_start: datetime,
    expected_end: datetime,
) -> Tuple[int, List[datetime]]:
    """Dynamically evaluate half-hour time series continuity and identify any gaps."""
    present_times = set(r.start_time for r in records)
    missing: List[datetime] = []
    
    curr = expected_start
    while curr <= expected_end:
        if curr not in present_times:
            missing.append(curr)
        curr += timedelta(minutes=30)
        
    return len(present_times), missing


def analyze_forecasts_coverage(
    records: List[ForecastRecord],
    expected_start: datetime,
    expected_end: datetime,
) -> Tuple[int, List[datetime]]:
    """Dynamically evaluate hourly target coverage for forecasts and identify any uncovered target hours."""
    present_target_hours = set(r.start_time for r in records)
    missing_hours: List[datetime] = []

    curr = expected_start
    while curr <= expected_end:
        if curr not in present_target_hours:
            missing_hours.append(curr)
        curr += timedelta(hours=1)

    return len(present_target_hours), missing_hours


def get_db_connection(database_url: str) -> psycopg.Connection:
    """Connect to PostgreSQL with prepare_threshold=None to support Supabase transaction poolers."""
    # When connecting to Supabase transaction pooler (port 6543) or session pooler (5432),
    # setting prepare_threshold=None ensures compatibility with PgBouncer.
    return psycopg.connect(
        database_url,
        prepare_threshold=None,
        autocommit=False,
    )


def upsert_actuals(conn: psycopg.Connection, records: List[ActualRecord]) -> int:
    """Upsert actual records into wind_actuals with updated_at timestamp."""
    if not records:
        return 0

    sql = """
        INSERT INTO wind_actuals (
            start_time,
            generation_mw,
            settlement_date,
            settlement_period,
            updated_at
        )
        VALUES (%s, %s, %s, %s, now())
        ON CONFLICT (start_time)
        DO UPDATE SET
            generation_mw = EXCLUDED.generation_mw,
            settlement_date = EXCLUDED.settlement_date,
            settlement_period = EXCLUDED.settlement_period,
            updated_at = now();
    """

    data = [
        (r.start_time, r.generation_mw, r.settlement_date, r.settlement_period)
        for r in records
    ]

    total_upserted = 0
    with conn.cursor() as cur:
        for i in range(0, len(data), DEFAULT_BATCH_SIZE):
            chunk = data[i : i + DEFAULT_BATCH_SIZE]
            cur.executemany(sql, chunk)
            total_upserted += len(chunk)
    conn.commit()
    return total_upserted


def upsert_forecasts(conn: psycopg.Connection, records: List[ForecastRecord]) -> int:
    """Upsert forecast records into wind_forecasts with updated_at timestamp."""
    if not records:
        return 0

    sql = """
        INSERT INTO wind_forecasts (
            start_time,
            publish_time,
            generation_mw,
            updated_at
        )
        VALUES (%s, %s, %s, now())
        ON CONFLICT (start_time, publish_time)
        DO UPDATE SET
            generation_mw = EXCLUDED.generation_mw,
            updated_at = now();
    """

    data = [
        (r.start_time, r.publish_time, r.generation_mw)
        for r in records
    ]

    total_upserted = 0
    with conn.cursor() as cur:
        for i in range(0, len(data), DEFAULT_BATCH_SIZE):
            chunk = data[i : i + DEFAULT_BATCH_SIZE]
            cur.executemany(sql, chunk)
            total_upserted += len(chunk)
    conn.commit()
    return total_upserted


def main() -> None:
    """Run data ingestion pipeline."""
    parser = argparse.ArgumentParser(description="Ingest Elexon wind actuals and forecasts into Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and validate data from Elexon and report coverage without modifying the database.",
    )
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL"),
        help="PostgreSQL connection string (defaults to DATABASE_URL in .env).",
    )
    args = parser.parse_args()

    logger.info("=== Starting Wind Data Ingestion Pipeline ===")
    
    # Define delivery bounds: decisions in Jan 2026 cover delivery through 2026-02-01
    jan_start_actuals = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    jan_end_actuals = datetime(2026, 2, 1, 23, 30, tzinfo=timezone.utc)

    jan_start_forecasts = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    jan_end_forecasts = datetime(2026, 2, 1, 23, 0, tzinfo=timezone.utc)

    # 1. Fetch Actuals
    actuals = fetch_fuelhh_actuals("2026-01-01", "2026-02-01")
    actual_count, actual_missing = analyze_actuals_gaps(
        actuals, jan_start_actuals, jan_end_actuals
    )

    logger.info("--- Actuals (FUELHH) Coverage Summary ---")
    logger.info("Actual unique start times found: %d", actual_count)
    if actual_missing:
        logger.warning(
            "Found %d missing half-hour intervals in actuals! Examples: %s",
            len(actual_missing),
            [ts.isoformat() for ts in actual_missing[:5]],
        )
    else:
        logger.info("Gaps in actuals: 0 (Continuous 30-minute coverage across all requested slots)")

    # 2. Fetch Forecasts
    forecasts = fetch_windfor_forecasts()
    target_hours_covered, forecast_missing_hours = analyze_forecasts_coverage(
        forecasts, jan_start_forecasts, jan_end_forecasts
    )

    logger.info("--- Forecasts (WINDFOR) Coverage Summary ---")
    logger.info("Total forecast rows prepared: %d", len(forecasts))
    logger.info("Distinct January target hours covered: %d", target_hours_covered)
    if forecast_missing_hours:
        logger.warning(
            "Found %d target hours in January without forecasts! Examples: %s",
            len(forecast_missing_hours),
            [ts.isoformat() for ts in forecast_missing_hours[:5]],
        )
    else:
        logger.info("Gaps in target hourly forecasts: 0 (All hourly targets in January have forecasts)")

    # 3. Upsert to Supabase
    if args.dry_run:
        logger.info("Dry-run mode active: Skipping database upsert.")
        logger.info("=== Dry-Run Completed Successfully ===")
        return

    db_url = args.db_url
    if not db_url:
        logger.error(
            "DATABASE_URL not set in .env or provided via --db-url. "
            "Use --dry-run to validate ingestion without a database, or configure DATABASE_URL in .env."
        )
        sys.exit(1)

    logger.info("Connecting to Supabase PostgreSQL (prepared statements disabled for pooler compatibility)...")
    try:
        with get_db_connection(db_url) as conn:
            actuals_upserted = upsert_actuals(conn, actuals)
            logger.info("Successfully upserted %d actuals into wind_actuals", actuals_upserted)

            forecasts_upserted = upsert_forecasts(conn, forecasts)
            logger.info("Successfully upserted %d forecasts into wind_forecasts", forecasts_forecasts := forecasts_upserted)

        logger.info("=== Data Ingestion Completed Successfully ===")
        logger.info(
            "Final Loaded Database Stats:\n"
            "  - wind_actuals: %d rows (settlement period range: %s to %s)\n"
            "  - wind_forecasts: %d rows (target range: %s to %s)",
            len(actuals),
            actuals[0].start_time.isoformat() if actuals else "N/A",
            actuals[-1].start_time.isoformat() if actuals else "N/A",
            len(forecasts),
            min(r.start_time for r in forecasts).isoformat() if forecasts else "N/A",
            max(r.start_time for r in forecasts).isoformat() if forecasts else "N/A",
        )
    except Exception as exc:
        logger.error("Database upsert failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
