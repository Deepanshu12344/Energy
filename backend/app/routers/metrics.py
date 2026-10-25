"""Accuracy metrics and error-by-hour endpoint routers."""

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Tuple
from fastapi import APIRouter, Depends
from backend.app.config import settings
from backend.app.data.database import get_db_connection
from backend.app.data.queries import fetch_actuals_by_time_range, fetch_forecast_candidates
from backend.app.models.internal import ActualRecord, ForecastRecord
from backend.app.models.requests import MetricsQueryParams
from backend.app.models.responses import (
    ComparisonItem,
    ErrorByHourResponse,
    MetricsResponse,
)
from backend.app.services.forecast_service import (
    compute_day_ahead_cutoff,
    select_latest_forecasts_for_delivery_day,
)
from backend.app.services.metrics_service import (
    calculate_accuracy_metrics,
    calculate_error_by_hour,
)

router = APIRouter(prefix="/api", tags=["Metrics"])


def _evaluate_range_comparison_items(
    start_date: date,
    end_date: date,
    cutoff_str: str,
) -> Tuple[List[ComparisonItem], int]:
    """Single-pass data fetch and day-by-day forecast selection in Python.
    
    Returns:
        (all_comparison_items, total_expected_hourly_slots)
    """
    range_start_utc = datetime(start_date.year, start_date.month, start_date.day, 0, 0, tzinfo=timezone.utc)
    range_end_actuals_utc = datetime(end_date.year, end_date.month, end_date.day, 23, 30, tzinfo=timezone.utc)
    range_end_forecasts_utc = datetime(end_date.year, end_date.month, end_date.day, 23, 0, tzinfo=timezone.utc)

    # Latest cutoff among all delivery days in range
    latest_cutoff_utc = compute_day_ahead_cutoff(end_date, cutoff_str, settings.APP_TIMEZONE)

    # 1. Fetch data from Supabase once using parameterized datetimes
    with get_db_connection() as conn:
        all_actuals = fetch_actuals_by_time_range(
            conn,
            start_utc=range_start_utc,
            end_utc=range_end_actuals_utc,
        )
        all_candidates = fetch_forecast_candidates(
            conn,
            target_start_min_utc=range_start_utc,
            target_start_max_utc=range_end_forecasts_utc,
            publish_time_max_utc=latest_cutoff_utc,
        )

    # 2. Group records by target delivery date
    actuals_by_date: Dict[date, List[ActualRecord]] = {}
    for act in all_actuals:
        actuals_by_date.setdefault(act.start_time.date(), []).append(act)

    candidates_by_date: Dict[date, List[ForecastRecord]] = {}
    for fc in all_candidates:
        candidates_by_date.setdefault(fc.start_time.date(), []).append(fc)

    # 3. Iterate each delivery day and perform pure cutoff selection in Python
    all_items: List[ComparisonItem] = []
    num_days = (end_date - start_date).days + 1
    total_expected_hourly_slots = num_days * 24

    curr = start_date
    while curr <= end_date:
        day_cutoff_utc = compute_day_ahead_cutoff(curr, cutoff_str, settings.APP_TIMEZONE)
        day_actuals = actuals_by_date.get(curr, [])
        day_candidates = candidates_by_date.get(curr, [])

        day_items = select_latest_forecasts_for_delivery_day(
            delivery_date=curr,
            cutoff_utc=day_cutoff_utc,
            actuals=day_actuals,
            forecast_candidates=day_candidates,
        )
        all_items.extend(day_items)
        curr += timedelta(days=1)

    return all_items, total_expected_hourly_slots


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(
    query: MetricsQueryParams = Depends(),
) -> MetricsResponse:
    """Calculate forecast accuracy metrics over a date range and cutoff time."""
    all_items, total_expected_hourly_slots = _evaluate_range_comparison_items(
        start_date=query.start,
        end_date=query.end,
        cutoff_str=query.cutoff,
    )

    # Extract paired actual-forecast generation for valid hourly slots
    pairs = [
        (item.actual_mw, item.forecast_mw)
        for item in all_items
        if item.status == "forecast_selected"
        and item.actual_mw is not None
        and item.forecast_mw is not None
    ]

    metrics = calculate_accuracy_metrics(
        actual_forecast_pairs=pairs,
        total_slots=total_expected_hourly_slots,
    )

    return MetricsResponse(
        start_date=query.start,
        end_date=query.end,
        cutoff_time=query.cutoff,
        metrics=metrics,
    )


@router.get("/error-by-hour", response_model=ErrorByHourResponse)
def get_error_by_hour(
    query: MetricsQueryParams = Depends(),
) -> ErrorByHourResponse:
    """Calculate forecast accuracy metrics aggregated by hour of the delivery day (0 to 23)."""
    all_items, _ = _evaluate_range_comparison_items(
        start_date=query.start,
        end_date=query.end,
        cutoff_str=query.cutoff,
    )

    hourly_errors = calculate_error_by_hour(all_items)

    return ErrorByHourResponse(
        start_date=query.start,
        end_date=query.end,
        cutoff_time=query.cutoff,
        hourly_errors=hourly_errors,
    )
