"""Horizon lead-time analysis endpoint router."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from backend.app.data.database import get_db_connection
from backend.app.data.queries import fetch_horizon_forecast_actual_pairs
from backend.app.models.requests import HorizonAnalysisQueryParams
from backend.app.models.responses import HorizonAnalysisResponse
from backend.app.services.horizon_service import calculate_horizon_analysis

router = APIRouter(prefix="/api", tags=["Horizon Analysis"])


@router.get("/horizon-analysis", response_model=HorizonAnalysisResponse)
def get_horizon_analysis(
    query: HorizonAnalysisQueryParams = Depends(),
) -> HorizonAnalysisResponse:
    """Analyze forecast accuracy segmented by lead time horizon buckets.

    Forecasts published after target delivery (negative lead times) are isolated
    in a dedicated 'published_after_target' bucket and excluded from the main forward-looking buckets.
    """
    start_utc = datetime(query.start.year, query.start.month, query.start.day, 0, 0, tzinfo=timezone.utc)
    end_utc = datetime(query.end.year, query.end.month, query.end.day, 23, 0, tzinfo=timezone.utc)

    with get_db_connection() as conn:
        paired_data = fetch_horizon_forecast_actual_pairs(conn, start_utc, end_utc)

    main_buckets, after_target_bucket = calculate_horizon_analysis(paired_data)

    return HorizonAnalysisResponse(
        start_date=query.start,
        end_date=query.end,
        main_buckets=main_buckets,
        after_target_bucket=after_target_bucket,
        buckets=main_buckets,
    )
