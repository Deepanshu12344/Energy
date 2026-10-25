"""Parameterized SQL queries for wind actuals and forecasts."""

from datetime import datetime
from typing import List, Optional, Tuple
import psycopg
from backend.app.models.internal import ActualRecord, ForecastRecord


def fetch_actuals_by_time_range(
    conn: psycopg.Connection,
    start_utc: datetime,
    end_utc: datetime,
) -> List[ActualRecord]:
    """Fetch actual generation records within [start_utc, end_utc] ordered by start_time."""
    sql = """
        SELECT
            start_time,
            generation_mw,
            settlement_date,
            settlement_period,
            created_at,
            updated_at
        FROM wind_actuals
        WHERE start_time >= %s AND start_time <= %s
        ORDER BY start_time ASC;
    """
    records: List[ActualRecord] = []
    with conn.cursor() as cur:
        cur.execute(sql, (start_utc, end_utc))
        for row in cur.fetchall():
            records.append(
                ActualRecord(
                    start_time=row[0],
                    generation_mw=float(row[1]),
                    settlement_date=row[2],
                    settlement_period=row[3],
                    created_at=row[4],
                    updated_at=row[5],
                )
            )
    return records


def fetch_forecast_candidates(
    conn: psycopg.Connection,
    target_start_min_utc: datetime,
    target_start_max_utc: datetime,
    publish_time_max_utc: Optional[datetime] = None,
) -> List[ForecastRecord]:
    """Fetch forecast candidates for target delivery hours within range.
    
    If publish_time_max_utc is provided, restricts to forecasts published on or before that timestamp.
    """
    if publish_time_max_utc is not None:
        sql = """
            SELECT
                start_time,
                publish_time,
                generation_mw,
                created_at,
                updated_at
            FROM wind_forecasts
            WHERE start_time >= %s AND start_time <= %s AND publish_time <= %s
            ORDER BY start_time ASC, publish_time ASC;
        """
        params = (target_start_min_utc, target_start_max_utc, publish_time_max_utc)
    else:
        sql = """
            SELECT
                start_time,
                publish_time,
                generation_mw,
                created_at,
                updated_at
            FROM wind_forecasts
            WHERE start_time >= %s AND start_time <= %s
            ORDER BY start_time ASC, publish_time ASC;
        """
        params = (target_start_min_utc, target_start_max_utc)

    records: List[ForecastRecord] = []
    with conn.cursor() as cur:
        cur.execute(sql, params)
        for row in cur.fetchall():
            records.append(
                ForecastRecord(
                    start_time=row[0],
                    publish_time=row[1],
                    generation_mw=float(row[2]),
                    created_at=row[3],
                    updated_at=row[4],
                )
            )
    return records


def fetch_horizon_forecast_actual_pairs(
    conn: psycopg.Connection,
    target_start_min_utc: datetime,
    target_start_max_utc: datetime,
) -> List[Tuple[datetime, datetime, float, float]]:
    """Fetch paired forecast-actual records for horizon lead-time analysis.
    
    Returns list of tuples: (start_time, publish_time, forecast_generation_mw, actual_generation_mw)
    """
    sql = """
        SELECT
            f.start_time,
            f.publish_time,
            f.generation_mw AS forecast_mw,
            a.generation_mw AS actual_mw
        FROM wind_forecasts f
        JOIN wind_actuals a ON f.start_time = a.start_time
        WHERE f.start_time >= %s AND f.start_time <= %s
        ORDER BY f.start_time ASC, f.publish_time ASC;
    """
    pairs: List[Tuple[datetime, datetime, float, float]] = []
    with conn.cursor() as cur:
        cur.execute(sql, (target_start_min_utc, target_start_max_utc))
        for row in cur.fetchall():
            pairs.append((row[0], row[1], float(row[2]), float(row[3])))
    return pairs


def fetch_meta_stats(conn: psycopg.Connection) -> Tuple[int, int, Optional[datetime], Optional[datetime]]:
    """Fetch aggregate database counts and available actual date range.
    
    Returns: (actual_rows_count, forecast_rows_count, min_start_time, max_start_time)
    """
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*), MIN(start_time), MAX(start_time) FROM wind_actuals;")
        row_act = cur.fetchone()
        actual_count = row_act[0] if row_act else 0
        min_start = row_act[1] if row_act else None
        max_start = row_act[2] if row_act else None

        cur.execute("SELECT COUNT(*) FROM wind_forecasts;")
        row_fc = cur.fetchone()
        forecast_count = row_fc[0] if row_fc else 0

    return actual_count, forecast_count, min_start, max_start
