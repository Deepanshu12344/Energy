"""Metadata endpoint router."""

from fastapi import APIRouter
from backend.app.config import settings
from backend.app.data.database import get_db_connection
from backend.app.data.queries import fetch_meta_stats
from backend.app.models.responses import MetaResponse

router = APIRouter(prefix="/api", tags=["Metadata"])


@router.get("/meta", response_model=MetaResponse)
def get_meta() -> MetaResponse:
    """Return system metadata including date scope, defaults, and resolution notes."""
    try:
        with get_db_connection() as conn:
            act_count, fc_count, min_st, max_st = fetch_meta_stats(conn)
    except Exception:
        # Fallback in case of mock/uninitialized DB
        act_count, fc_count = 0, 0

    resolution_notes = {
        "actuals_resolution": "30-minute half-hourly outturns (FUELHH)",
        "forecasts_resolution": "60-minute hourly forecasts (WINDFOR, minute: 0)",
        "matching_strategy": "exact_timestamp_match",
        "chart_behavior": "All 48 half-hour slots returned; :30 slots have forecast null with status 'not_applicable'",
        "metrics_evaluation_scope": "Evaluated strictly on hourly slots (:00) where a forecast was available",
        "mape_guard_threshold_mw": 10.0,
        "percentile_method": "linear_interpolation",
    }

    return MetaResponse(
        available_start_date="2026-01-02",
        available_end_date="2026-02-01",
        default_cutoff_time=settings.DEFAULT_GATE_CLOSURE_TIME,
        actual_rows_count=act_count,
        forecast_rows_count=fc_count,
        timezone=settings.APP_TIMEZONE,
        resolution_notes=resolution_notes,
    )
