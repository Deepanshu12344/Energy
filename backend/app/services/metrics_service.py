"""Pure functions for evaluating forecast accuracy metrics.

All functions are independent of databases, HTTP handlers, or external I/O.
"""

import math
from typing import List, Optional, Tuple

import numpy as np

from backend.app.models.responses import (
    AccuracyMetrics,
    ComparisonItem,
    ErrorDistributionBin,
    HourlyErrorItem,
)


def calculate_accuracy_metrics(
    actual_forecast_pairs: List[Tuple[float, float]],
    total_slots: int,
    min_actual_threshold_mw: float = 10.0,
) -> AccuracyMetrics:
    """Calculate summary accuracy metrics against paired (actual, forecast) observations.

    Args:
        actual_forecast_pairs: List of (actual_mw, forecast_mw) tuples.
        total_slots: Total expected candidate slots across the evaluated range.
        min_actual_threshold_mw: Threshold below which actual generation is excluded
            from MAPE to avoid zero or near-zero division explosion.

    Returns:
        AccuracyMetrics object containing MAE, RMSE, bias, MAPE, P50/P90/P95, and buffer recommendation.
    """
    valid_pairs = [
        (a, f) for a, f in actual_forecast_pairs
        if a is not None and f is not None
    ]
    evaluated_slots = len(valid_pairs)
    missing_slots = max(0, total_slots - evaluated_slots)

    if evaluated_slots == 0:
        return AccuracyMetrics(
            mae=None,
            rmse=None,
            bias=None,
            mape=None,
            mape_excluded_count=0,
            p50_abs_error=None,
            p90_abs_error=None,
            p95_abs_error=None,
            buffer_recommendation_mw_p90=None,
            total_slots=total_slots,
            evaluated_slots=0,
            missing_slots=total_slots,
        )

    errors = [f - a for a, f in valid_pairs]
    abs_errors = [abs(e) for e in errors]

    # 1. MAE
    mae = float(np.mean(abs_errors))

    # 2. RMSE
    rmse = float(math.sqrt(float(np.mean([e ** 2 for e in errors]))))

    # 3. Bias (mean error: forecast - actual; positive means over-forecasting)
    bias = float(np.mean(errors))

    # 4. MAPE (excluding near-zero actuals < min_actual_threshold_mw)
    mape_pairs = [(a, f) for a, f in valid_pairs if a >= min_actual_threshold_mw]
    mape_excluded_count = len(valid_pairs) - len(mape_pairs)

    if mape_pairs:
        mape_percentages = [abs(f - a) / a * 100.0 for a, f in mape_pairs]
        mape = float(np.mean(mape_percentages))
    else:
        mape = None

    # 5. Percentiles using standard linear interpolation
    p50 = float(np.percentile(abs_errors, 50, method="linear"))
    p90 = float(np.percentile(abs_errors, 90, method="linear"))
    p95 = float(np.percentile(abs_errors, 95, method="linear"))

    # Buffer recommendation: P90 absolute error
    buffer_p90 = p90

    return AccuracyMetrics(
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        bias=round(bias, 2),
        mape=round(mape, 2) if mape is not None else None,
        mape_excluded_count=mape_excluded_count,
        p50_abs_error=round(p50, 2),
        p90_abs_error=round(p90, 2),
        p95_abs_error=round(p95, 2),
        buffer_recommendation_mw_p90=round(buffer_p90, 2),
        total_slots=total_slots,
        evaluated_slots=evaluated_slots,
        missing_slots=missing_slots,
    )


def calculate_error_by_hour(
    comparison_items: List[ComparisonItem],
) -> List[HourlyErrorItem]:
    """Group paired forecast-actual items by delivery hour of day (0..23) and calculate metrics."""
    hourly_items: List[HourlyErrorItem] = []

    for h in range(24):
        slot_pairs = [
            (item.actual_mw, item.forecast_mw)
            for item in comparison_items
            if item.start_time.hour == h
            and item.status == "forecast_selected"
            and item.actual_mw is not None
            and item.forecast_mw is not None
        ]

        if not slot_pairs:
            hourly_items.append(
                HourlyErrorItem(
                    hour=h,
                    count=0,
                    mae=None,
                    rmse=None,
                    bias=None,
                )
            )
            continue

        errors = [f - a for a, f in slot_pairs]
        abs_errors = [abs(e) for e in errors]

        mae = float(np.mean(abs_errors))
        rmse = float(math.sqrt(float(np.mean([e ** 2 for e in errors]))))
        bias = float(np.mean(errors))

        hourly_items.append(
            HourlyErrorItem(
                hour=h,
                count=len(slot_pairs),
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                bias=round(bias, 2),
            )
        )

    return hourly_items


def calculate_error_distribution(
    errors: List[float],
    num_bins: int = 10,
) -> Tuple[Optional[float], Optional[float], int, Optional[float], List[ErrorDistributionBin]]:
    """Compute dynamic histogram bins, over-forecast count, and over-forecast share from errors.

    Bins are dynamically computed between min(errors) and max(errors).

    Returns:
        (min_error, max_error, over_forecast_count, over_forecast_share, bins)
    """
    if not errors:
        return None, None, 0, None, []

    min_err = float(min(errors))
    max_err = float(max(errors))
    total_count = len(errors)

    over_forecast_count = sum(1 for e in errors if e > 0)
    over_forecast_share = round(over_forecast_count / total_count, 4)

    # Edge case: all errors identical
    if math.isclose(min_err, max_err, abs_tol=1e-5):
        single_bin = ErrorDistributionBin(
            bin_min=round(min_err, 2),
            bin_max=round(max_err, 2),
            bin_label=f"{min_err:+.0f} MW",
            count=total_count,
        )
        return round(min_err, 2), round(max_err, 2), over_forecast_count, over_forecast_share, [single_bin]

    bin_edges = np.linspace(min_err, max_err, num_bins + 1)
    counts, _ = np.histogram(errors, bins=bin_edges)

    bins: List[ErrorDistributionBin] = []
    for i in range(num_bins):
        b_min = float(bin_edges[i])
        b_max = float(bin_edges[i + 1])
        c = int(counts[i])
        bins.append(
            ErrorDistributionBin(
                bin_min=round(b_min, 2),
                bin_max=round(b_max, 2),
                bin_label=f"{b_min:+.0f} to {b_max:+.0f} MW",
                count=c,
            )
        )

    return round(min_err, 2), round(max_err, 2), over_forecast_count, over_forecast_share, bins

