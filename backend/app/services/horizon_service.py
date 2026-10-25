"""Pure functions for horizon lead-time analysis.

Categorizes forecast-actual pairs into lead time buckets and calculates error metrics.
Negative lead times (published after target) are segregated into a separate bucket.
"""

from datetime import datetime
import math
from typing import List, Optional, Tuple
import numpy as np
from backend.app.models.responses import HorizonBucket


MAIN_BUCKET_DEFINITIONS: List[Tuple[str, float, float]] = [
    ("<12h", 0.0, 12.0),
    ("12-18h", 12.0, 18.0),
    ("18-24h", 18.0, 24.0),
    ("24-36h", 24.0, 36.0),
    ("36-48h", 36.0, 48.0),
    (">48h", 48.0, float("inf")),
]


def calculate_horizon_analysis(
    paired_data: List[Tuple[datetime, datetime, float, float]],
) -> Tuple[List[HorizonBucket], Optional[HorizonBucket]]:
    """Group forecast-actual pairs by lead time into buckets and evaluate accuracy.

    Args:
        paired_data: List of (start_time, publish_time, forecast_mw, actual_mw) tuples.

    Returns:
        Tuple containing:
        - main_buckets: List of forward-looking HorizonBucket objects (lead time >= 0).
        - after_target_bucket: HorizonBucket for negative lead times (published after target delivery).
    """
    # Group observations
    main_bucket_values: dict[str, List[Tuple[float, float]]] = {
        name: [] for name, _, _ in MAIN_BUCKET_DEFINITIONS
    }
    after_target_values: List[Tuple[float, float]] = []

    for start_time, publish_time, fc_mw, act_mw in paired_data:
        lead_hours = (start_time - publish_time).total_seconds() / 3600.0

        if lead_hours < 0.0:
            after_target_values.append((fc_mw, act_mw))
            continue

        assigned = False
        for name, lower, upper in MAIN_BUCKET_DEFINITIONS:
            if lower <= lead_hours < upper or (upper == float("inf") and lead_hours >= lower):
                main_bucket_values[name].append((fc_mw, act_mw))
                assigned = True
                break

        if not assigned:
            # Fallback to last bucket if edge case
            main_bucket_values[">48h"].append((fc_mw, act_mw))

    def evaluate_bucket(name: str, values: List[Tuple[float, float]]) -> HorizonBucket:
        if not values:
            return HorizonBucket(
                horizon_bucket=name,
                count=0,
                mae=None,
                rmse=None,
                bias=None,
            )

        errors = [f - a for f, a in values]
        abs_errors = [abs(e) for e in errors]

        mae = float(np.mean(abs_errors))
        rmse = float(math.sqrt(float(np.mean([e ** 2 for e in errors]))))
        bias = float(np.mean(errors))

        return HorizonBucket(
            horizon_bucket=name,
            count=len(values),
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            bias=round(bias, 2),
        )

    main_buckets = [
        evaluate_bucket(name, main_bucket_values[name])
        for name, _, _ in MAIN_BUCKET_DEFINITIONS
    ]

    after_target_bucket = (
        evaluate_bucket("published_after_target", after_target_values)
        if after_target_values
        else None
    )

    return main_buckets, after_target_bucket
