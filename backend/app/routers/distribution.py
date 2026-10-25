"""Error distribution histogram endpoint router."""

from fastapi import APIRouter, Depends, Query
from backend.app.models.requests import MetricsQueryParams
from backend.app.models.responses import ErrorDistributionResponse
from backend.app.routers.metrics import _evaluate_range_comparison_items
from backend.app.services.metrics_service import calculate_error_distribution

router = APIRouter(prefix="/api", tags=["Metrics"])


@router.get("/error-distribution", response_model=ErrorDistributionResponse)
def get_error_distribution(
    query: MetricsQueryParams = Depends(),
    bins: int = Query(default=10, ge=3, le=50, description="Number of histogram bins (default: 10)"),
) -> ErrorDistributionResponse:
    """Compute dynamic histogram of forecast errors and over-forecast share over a date range.

    Bins are dynamically spaced between min and max error across evaluated hourly slots.
    """
    all_items, _ = _evaluate_range_comparison_items(
        start_date=query.start,
        end_date=query.end,
        cutoff_str=query.cutoff,
    )

    # Collect errors for valid forecast_selected slots
    errors = [
        item.error_mw
        for item in all_items
        if item.status == "forecast_selected" and item.error_mw is not None
    ]

    min_err, max_err, over_count, over_share, dist_bins = calculate_error_distribution(
        errors=errors,
        num_bins=bins,
    )

    return ErrorDistributionResponse(
        start_date=query.start,
        end_date=query.end,
        cutoff_time=query.cutoff,
        total_samples=len(errors),
        min_error_mw=min_err,
        max_error_mw=max_err,
        over_forecast_count=over_count,
        over_forecast_share=over_share,
        bins=dist_bins,
    )
