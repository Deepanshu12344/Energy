"""Database connection pool and query access layer."""

from .database import check_connection, close_pool, get_db_connection, get_pool, init_pool
from .queries import (
    fetch_actuals_by_time_range,
    fetch_forecast_candidates,
    fetch_horizon_forecast_actual_pairs,
    fetch_meta_stats,
)

__all__ = [
    "init_pool",
    "close_pool",
    "get_pool",
    "get_db_connection",
    "check_connection",
    "fetch_actuals_by_time_range",
    "fetch_forecast_candidates",
    "fetch_horizon_forecast_actual_pairs",
    "fetch_meta_stats",
]
