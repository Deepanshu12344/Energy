"""Unit tests for accuracy metrics, percentiles, error-by-hour, and horizon analysis.

All tests use hand-calculated examples with stated expected numbers.
"""

from datetime import datetime, timezone
import math
import numpy as np
from backend.app.models.responses import ComparisonItem
from backend.app.services.horizon_service import calculate_horizon_analysis
from backend.app.services.metrics_service import (
    calculate_accuracy_metrics,
    calculate_error_by_hour,
)


def test_hand_calculated_accuracy_metrics():
    """Verify metrics calculation against hand-calculated values.
    
    Test Data:
    Pair 1: actual=100.0, forecast=110.0 -> error=+10.0, abs_error=10.0, error^2=100.0, pct=10.0%
    Pair 2: actual=200.0, forecast=190.0 -> error=-10.0, abs_error=10.0, error^2=100.0, pct=5.0%
    Pair 3: actual=300.0, forecast=330.0 -> error=+30.0, abs_error=30.0, error^2=900.0, pct=10.0%
    Pair 4: actual=400.0, forecast=360.0 -> error=-40.0, abs_error=40.0, error^2=1600.0, pct=10.0%

    Expected Values:
    - N = 4
    - MAE = (10 + 10 + 30 + 40) / 4 = 22.50 MW
    - MSE = (100 + 100 + 900 + 1600) / 4 = 2700 / 4 = 675.0 -> RMSE = sqrt(675) = 25.98 MW
    - Bias = (10 - 10 + 30 - 40) / 4 = -10 / 4 = -2.50 MW
    - MAPE = (10% + 5% + 10% + 10%) / 4 = 35% / 4 = 8.75%
    - Sorted abs errors: [10.0, 10.0, 30.0, 40.0]
      - P50 (median) = (10 + 30) / 2 = 20.00 MW
      - P90 (linear) = 30 + 0.7 * (40 - 30) = 37.00 MW
      - P95 (linear) = 30 + 0.85 * (40 - 30) = 38.50 MW
    - Buffer recommendation = P90 = 37.00 MW
    - MAPE excluded count = 0
    """
    pairs = [
        (100.0, 110.0),
        (200.0, 190.0),
        (300.0, 330.0),
        (400.0, 360.0),
    ]

    metrics = calculate_accuracy_metrics(pairs, total_slots=4)

    assert metrics.evaluated_slots == 4
    assert metrics.missing_slots == 0
    assert metrics.mae == 22.50
    assert metrics.rmse == 25.98
    assert metrics.bias == -2.50
    assert metrics.mape == 8.75
    assert metrics.mape_excluded_count == 0
    assert metrics.p50_abs_error == 20.00
    assert metrics.p90_abs_error == 37.00
    assert metrics.p95_abs_error == 38.50
    assert metrics.buffer_recommendation_mw_p90 == 37.00


def test_mape_near_zero_guard_and_exclusion_count():
    """Verify that actuals < 10.0 MW are excluded from MAPE and counted in mape_excluded_count."""
    pairs = [
        (5.0, 15.0),     # actual < 10.0 MW -> excluded from MAPE
        (100.0, 110.0),  # actual >= 10.0 MW -> error = 10.0%
        (200.0, 220.0),  # actual >= 10.0 MW -> error = 10.0%
    ]

    metrics = calculate_accuracy_metrics(pairs, total_slots=3, min_actual_threshold_mw=10.0)

    assert metrics.evaluated_slots == 3
    assert metrics.mape_excluded_count == 1
    # Only pairs 2 and 3 are in MAPE: (10% + 10%) / 2 = 10.0%
    assert metrics.mape == 10.00
    # MAE and RMSE still include all 3 pairs:
    # errors: [+10, +10, +20] -> MAE = 40/3 = 13.33
    assert metrics.mae == 13.33


def test_empty_metrics_handling():
    """Verify metrics calculation returns None values gracefully when no valid pairs exist."""
    metrics = calculate_accuracy_metrics([], total_slots=24)

    assert metrics.evaluated_slots == 0
    assert metrics.missing_slots == 24
    assert metrics.mae is None
    assert metrics.rmse is None
    assert metrics.bias is None
    assert metrics.mape is None
    assert metrics.mape_excluded_count == 0
    assert metrics.p50_abs_error is None


def test_calculate_error_by_hour():
    """Verify error by hour groups into 24 bins and evaluates accurately."""
    items = [
        # Hour 0 items
        ComparisonItem(
            start_time=datetime(2026, 1, 15, 0, 0, tzinfo=timezone.utc),
            actual_mw=100.0,
            forecast_mw=120.0,
            status="forecast_selected",
        ),
        # Hour 1 items
        ComparisonItem(
            start_time=datetime(2026, 1, 15, 1, 0, tzinfo=timezone.utc),
            actual_mw=200.0,
            forecast_mw=190.0,
            status="forecast_selected",
        ),
    ]

    hourly = calculate_error_by_hour(items)
    assert len(hourly) == 24

    # Hour 0
    assert hourly[0].hour == 0
    assert hourly[0].count == 1
    assert hourly[0].mae == 20.0
    assert hourly[0].bias == 20.0

    # Hour 1
    assert hourly[1].hour == 1
    assert hourly[1].count == 1
    assert hourly[1].mae == 10.0
    assert hourly[1].bias == -10.0

    # Empty hour (e.g. Hour 2)
    assert hourly[2].hour == 2
    assert hourly[2].count == 0
    assert hourly[2].mae is None


def test_horizon_analysis_with_negative_lead_time_segregation():
    """Verify negative lead times (published after target) are segregated into after_target_bucket."""
    target_st = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    paired_data = [
        # 1. Forward-looking: 14h lead time (falls in 12-18h bucket)
        (target_st, datetime(2026, 1, 14, 22, 0, tzinfo=timezone.utc), 1000.0, 900.0),  # lead = 14h, error = +100
        # 2. Forward-looking: 2h lead time (falls in <12h bucket)
        (target_st, datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc), 950.0, 900.0),   # lead = 2h, error = +50
        # 3. Retrospective/Late: -3h lead time (published after target delivery)
        (target_st, datetime(2026, 1, 15, 15, 0, tzinfo=timezone.utc), 900.0, 900.0),   # lead = -3h, error = 0
    ]

    main_buckets, after_target = calculate_horizon_analysis(paired_data)

    # Main buckets must NOT contain the negative lead time item
    bucket_less_12 = next(b for b in main_buckets if b.horizon_bucket == "<12h")
    assert bucket_less_12.count == 1
    assert bucket_less_12.mae == 50.0

    bucket_12_18 = next(b for b in main_buckets if b.horizon_bucket == "12-18h")
    assert bucket_12_18.count == 1
    assert bucket_12_18.mae == 100.0

    # after_target bucket must isolate the negative lead time
    assert after_target is not None
    assert after_target.horizon_bucket == "published_after_target"
    assert after_target.count == 1
    assert after_target.mae == 0.0


def test_calculate_error_distribution():
    """Verify dynamic error distribution histogram calculation and over_forecast_share."""
    from backend.app.services.metrics_service import calculate_error_distribution

    # 10 errors: 7 positive (over-forecast), 3 negative
    errors = [-100.0, -50.0, -20.0, 10.0, 50.0, 100.0, 150.0, 200.0, 250.0, 300.0]
    min_e, max_e, over_count, over_share, bins = calculate_error_distribution(errors, num_bins=5)

    assert min_e == -100.0
    assert max_e == 300.0
    assert over_count == 7
    assert over_share == 0.7  # 7 / 10 = 0.70
    assert len(bins) == 5
    assert bins[0].bin_min == -100.0
    assert bins[-1].bin_max == 300.0
    assert sum(b.count for b in bins) == 10

