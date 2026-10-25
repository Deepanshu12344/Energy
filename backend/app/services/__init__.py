"""Services layer providing pure analytical functions."""

from .forecast_service import (
    compute_day_ahead_cutoff,
    generate_delivery_day_half_hours,
    select_latest_forecasts_for_delivery_day,
)
from .horizon_service import calculate_horizon_analysis
from .metrics_service import (
    calculate_accuracy_metrics,
    calculate_error_by_hour,
    calculate_error_distribution,
)

__all__ = [
    "compute_day_ahead_cutoff",
    "generate_delivery_day_half_hours",
    "select_latest_forecasts_for_delivery_day",
    "calculate_accuracy_metrics",
    "calculate_error_by_hour",
    "calculate_error_distribution",
    "calculate_horizon_analysis",
]
