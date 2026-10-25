"""Forecast comparison endpoint router."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from backend.app.config import settings
from backend.app.data.database import get_db_connection
from backend.app.data.queries import fetch_actuals_by_time_range, fetch_forecast_candidates
from backend.app.models.requests import ForecastQueryParams
from backend.app.models.responses import ForecastComparisonResponse
from backend.app.services.forecast_service import (
    compute_day_ahead_cutoff,
    select_latest_forecasts_for_delivery_day,
)

router = APIRouter(prefix="/api", tags=["Forecast"])


@router.get("/forecast", response_model=ForecastComparisonResponse)
def get_forecast_comparison(
    query: ForecastQueryParams = Depends(),
) -> ForecastComparisonResponse:
    """Return selected forecast vs actual generation for the given delivery day and D-1 cutoff time."""
    # 1. Compute D-1 gate closure cutoff timestamp in UTC
    cutoff_utc = compute_day_ahead_cutoff(
        delivery_date=query.date,
        cutoff_time_str=query.cutoff,
        tz_name=settings.APP_TIMEZONE,
    )

    # 2. Delivery day UTC boundaries
    day_start_utc = datetime(query.date.year, query.date.month, query.date.day, 0, 0, tzinfo=timezone.utc)
    day_end_actuals_utc = day_start_utc + timedelta(hours=23, minutes=30)
    day_end_forecasts_utc = day_start_utc + timedelta(hours=23)

    # 3. Fetch data via parameterized queries with datetimes
    with get_db_connection() as conn:
        actuals = fetch_actuals_by_time_range(
            conn,
            start_utc=day_start_utc,
            end_utc=day_end_actuals_utc,
        )
        candidates = fetch_forecast_candidates(
            conn,
            target_start_min_utc=day_start_utc,
            target_start_max_utc=day_end_forecasts_utc,
            publish_time_max_utc=cutoff_utc,
        )

    # 4. Pure selection logic
    comparison_items = select_latest_forecasts_for_delivery_day(
        delivery_date=query.date,
        cutoff_utc=cutoff_utc,
        actuals=actuals,
        forecast_candidates=candidates,
    )

    # 5. Calculate slot summary metrics
    matched = sum(1 for item in comparison_items if item.status == "forecast_selected" and not item.is_actual_missing)
    missing = sum(1 for item in comparison_items if item.status == "missing")
    not_applicable = sum(1 for item in comparison_items if item.status == "not_applicable")

    return ForecastComparisonResponse(
        delivery_date=query.date,
        cutoff_time=query.cutoff,
        cutoff_timestamp_utc=cutoff_utc,
        total_slots=len(comparison_items),
        hourly_slots=24,
        matched_slots=matched,
        missing_slots=missing,
        not_applicable_slots=not_applicable,
        data=comparison_items,
    )
