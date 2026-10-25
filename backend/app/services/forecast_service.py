"""Pure functions for forecast cutoff resolution and forecast selection.

This module contains zero database or HTTP dependencies.
"""

from datetime import date, datetime, time, timedelta, timezone
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
from backend.app.models.internal import ActualRecord, ForecastRecord
from backend.app.models.responses import ComparisonItem, SlotStatus


def compute_day_ahead_cutoff(
    delivery_date: date,
    cutoff_time_str: str = "12:00",
    tz_name: str = "Europe/London",
) -> datetime:
    """Compute D-1 decision gate closure cutoff timestamp in UTC.

    For delivery day D, cutoff is (D - 1 day) at cutoff_time in Europe/London,
    converted to timezone-aware UTC. Handles Daylight Saving Time (BST/GMT) accurately.
    """
    parts = cutoff_time_str.strip().split(":")
    hour = int(parts[0])
    minute = int(parts[1])

    decision_day = delivery_date - timedelta(days=1)
    local_tz = ZoneInfo(tz_name)
    local_dt = datetime.combine(decision_day, time(hour, minute), tzinfo=local_tz)
    return local_dt.astimezone(timezone.utc)


def generate_delivery_day_half_hours(delivery_date: date) -> List[datetime]:
    """Generate all 48 UTC half-hour start timestamps for a given delivery day."""
    start_utc = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 0, 0, tzinfo=timezone.utc)
    slots: List[datetime] = []
    for i in range(48):
        slots.append(start_utc + timedelta(minutes=30 * i))
    return slots


def select_latest_forecasts_for_delivery_day(
    delivery_date: date,
    cutoff_utc: datetime,
    actuals: List[ActualRecord],
    forecast_candidates: List[ForecastRecord],
) -> List[ComparisonItem]:
    """Select the latest available forecast at or before cutoff for each slot of delivery day.

    Rules:
    - Filters forecast candidates to those with publish_time <= cutoff_utc.
    - If multiple forecasts exist for a target start_time, selects the one with the greatest publish_time.
    - Forecasts published strictly after cutoff_utc are ignored.
    - A forecast published exactly at cutoff_utc is included.
    - For half-hour slots (:30), status is 'not_applicable', forecast_mw is None.
    - For hourly slots (:00):
      - If a forecast is selected, status is 'forecast_selected'.
      - If no forecast exists at or before cutoff, status is 'missing'.
    - Never forward-fills, interpolates, or drops missing slots.
    """
    # Index actuals by start_time
    actuals_by_slot: Dict[datetime, ActualRecord] = {
        act.start_time: act for act in actuals
    }

    # Filter forecast candidates: target must match delivery_date and publish_time <= cutoff_utc
    day_start = datetime(delivery_date.year, delivery_date.month, delivery_date.day, 0, 0, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    eligible_forecasts = [
        fc for fc in forecast_candidates
        if (day_start <= fc.start_time < day_end) and (fc.publish_time <= cutoff_utc)
    ]

    # For each start_time, pick candidate with greatest publish_time
    selected_by_start: Dict[datetime, ForecastRecord] = {}
    for fc in eligible_forecasts:
        current = selected_by_start.get(fc.start_time)
        if current is None or fc.publish_time > current.publish_time:
            selected_by_start[fc.start_time] = fc

    # Build 48 comparison slots
    slots = generate_delivery_day_half_hours(delivery_date)
    comparison_items: List[ComparisonItem] = []

    for slot_time in slots:
        actual_rec = actuals_by_slot.get(slot_time)
        actual_mw = actual_rec.generation_mw if actual_rec else None
        is_actual_missing = actual_rec is None

        # Half-hourly slot (:30) -> WINDFOR is hourly, so status is 'not_applicable'
        if slot_time.minute != 0:
            comparison_items.append(
                ComparisonItem(
                    start_time=slot_time,
                    actual_mw=actual_mw,
                    forecast_mw=None,
                    publish_time=None,
                    lead_time_hours=None,
                    error_mw=None,
                    abs_error_mw=None,
                    error_pct=None,
                    status="not_applicable",
                    is_actual_missing=is_actual_missing,
                )
            )
            continue

        # Hourly slot (:00)
        selected_fc = selected_by_start.get(slot_time)
        if selected_fc is not None:
            fc_mw = selected_fc.generation_mw
            pub_time = selected_fc.publish_time
            lead_hours = (slot_time - pub_time).total_seconds() / 3600.0

            if actual_mw is not None:
                err = round(fc_mw - actual_mw, 2)
                abs_err = round(abs(err), 2)
                pct_err = round((abs_err / actual_mw * 100.0), 2) if actual_mw > 0 else None
            else:
                err = None
                abs_err = None
                pct_err = None

            comparison_items.append(
                ComparisonItem(
                    start_time=slot_time,
                    actual_mw=actual_mw,
                    forecast_mw=fc_mw,
                    publish_time=pub_time,
                    lead_time_hours=round(lead_hours, 2),
                    error_mw=err,
                    abs_error_mw=abs_err,
                    error_pct=pct_err,
                    status="forecast_selected",
                    is_actual_missing=is_actual_missing,
                )
            )
        else:
            # Hourly slot with missing forecast before cutoff
            comparison_items.append(
                ComparisonItem(
                    start_time=slot_time,
                    actual_mw=actual_mw,
                    forecast_mw=None,
                    publish_time=None,
                    lead_time_hours=None,
                    error_mw=None,
                    abs_error_mw=None,
                    error_pct=None,
                    status="missing",
                    is_actual_missing=is_actual_missing,
                )
            )

    return comparison_items
