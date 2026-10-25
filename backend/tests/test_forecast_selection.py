"""Mandatory unit tests for forecast selection logic (pure functions, no database required)."""

from datetime import date, datetime, timedelta, timezone
from backend.app.models.internal import ActualRecord, ForecastRecord
from backend.app.services.forecast_service import (
    compute_day_ahead_cutoff,
    select_latest_forecasts_for_delivery_day,
)


def test_picks_latest_publish_time_before_cutoff():
    """Verify selection picks greatest publish_time <= cutoff when multiple forecasts exist."""
    delivery_date = date(2026, 1, 15)
    target_time = datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)
    cutoff_utc = datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)

    actuals = [
        ActualRecord(start_time=target_time, generation_mw=15000.0)
    ]
    candidates = [
        # Candidate 1: Early forecast
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 1, 14, 6, 0, tzinfo=timezone.utc), generation_mw=14000.0),
        # Candidate 2: Later forecast before cutoff (should be picked)
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 1, 14, 11, 30, tzinfo=timezone.utc), generation_mw=14800.0),
        # Candidate 3: Forecast published after cutoff (must be ignored)
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 1, 14, 12, 30, tzinfo=timezone.utc), generation_mw=16000.0),
    ]

    items = select_latest_forecasts_for_delivery_day(delivery_date, cutoff_utc, actuals, candidates)
    hourly_item = next(it for it in items if it.start_time == target_time)

    assert hourly_item.status == "forecast_selected"
    assert hourly_item.forecast_mw == 14800.0
    assert hourly_item.publish_time == datetime(2026, 1, 14, 11, 30, tzinfo=timezone.utc)
    assert hourly_item.error_mw == -200.0  # 14800 - 15000


def test_ignores_forecasts_published_after_cutoff():
    """Verify that if all available forecasts are published after cutoff, the slot is marked missing."""
    delivery_date = date(2026, 1, 15)
    target_time = datetime(2026, 1, 15, 14, 0, tzinfo=timezone.utc)
    cutoff_utc = datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)

    actuals = [ActualRecord(start_time=target_time, generation_mw=10000.0)]
    candidates = [
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 1, 14, 12, 1, tzinfo=timezone.utc), generation_mw=10500.0),
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 1, 14, 15, 0, tzinfo=timezone.utc), generation_mw=11000.0),
    ]

    items = select_latest_forecasts_for_delivery_day(delivery_date, cutoff_utc, actuals, candidates)
    item = next(it for it in items if it.start_time == target_time)

    assert item.status == "missing"
    assert item.forecast_mw is None
    assert item.publish_time is None
    assert item.error_mw is None


def test_forecast_published_exactly_at_cutoff_is_included():
    """Verify that a forecast with publish_time == cutoff_utc is eligible and selected."""
    delivery_date = date(2026, 1, 15)
    target_time = datetime(2026, 1, 15, 8, 0, tzinfo=timezone.utc)
    cutoff_utc = datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)

    actuals = [ActualRecord(start_time=target_time, generation_mw=12000.0)]
    candidates = [
        ForecastRecord(start_time=target_time, publish_time=cutoff_utc, generation_mw=12100.0),
    ]

    items = select_latest_forecasts_for_delivery_day(delivery_date, cutoff_utc, actuals, candidates)
    item = next(it for it in items if it.start_time == target_time)

    assert item.status == "forecast_selected"
    assert item.forecast_mw == 12100.0
    assert item.publish_time == cutoff_utc


def test_missing_forecast_for_start_time_is_flagged_not_filled():
    """Verify that a slot with no forecasts is explicitly flagged with status 'missing' and never filled."""
    delivery_date = date(2026, 1, 15)
    target_time_empty = datetime(2026, 1, 15, 5, 0, tzinfo=timezone.utc)
    target_time_filled = datetime(2026, 1, 15, 4, 0, tzinfo=timezone.utc)
    cutoff_utc = datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)

    actuals = [
        ActualRecord(start_time=target_time_empty, generation_mw=8000.0),
        ActualRecord(start_time=target_time_filled, generation_mw=8500.0),
    ]
    candidates = [
        ForecastRecord(start_time=target_time_filled, publish_time=datetime(2026, 1, 14, 10, 0, tzinfo=timezone.utc), generation_mw=8400.0),
        # Notice: NO forecast is provided for target_time_empty (05:00)
    ]

    items = select_latest_forecasts_for_delivery_day(delivery_date, cutoff_utc, actuals, candidates)
    empty_item = next(it for it in items if it.start_time == target_time_empty)

    assert empty_item.status == "missing"
    assert empty_item.forecast_mw is None
    assert empty_item.actual_mw == 8000.0
    assert empty_item.error_mw is None


def test_half_hour_slots_marked_not_applicable():
    """Verify all :30 slots have status 'not_applicable' and forecast_mw is None."""
    delivery_date = date(2026, 1, 15)
    cutoff_utc = datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)

    items = select_latest_forecasts_for_delivery_day(delivery_date, cutoff_utc, [], [])
    assert len(items) == 48

    half_hour_items = [it for it in items if it.start_time.minute == 30]
    assert len(half_hour_items) == 24
    for it in half_hour_items:
        assert it.status == "not_applicable"
        assert it.forecast_mw is None


def test_dst_timezone_edge_case():
    """Test cutoff conversion and selection under British Summer Time (BST, UTC+1).
    
    Using a non-January date (2026-06-15) to prove daylight saving time conversion:
    Delivery Date: 2026-06-15
    Decision Cutoff: 12:00 Europe/London on 2026-06-14
    In June, London is in BST (UTC+1). Therefore, 12:00 BST = 11:00 UTC!
    """
    summer_delivery = date(2026, 6, 15)
    cutoff_utc = compute_day_ahead_cutoff(summer_delivery, "12:00", tz_name="Europe/London")

    # In June BST, 12:00 BST is strictly 11:00 UTC
    expected_cutoff_utc = datetime(2026, 6, 14, 11, 0, tzinfo=timezone.utc)
    assert cutoff_utc == expected_cutoff_utc

    target_time = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)
    actuals = [ActualRecord(start_time=target_time, generation_mw=5000.0)]
    candidates = [
        # Exactly at 11:00 UTC (12:00 BST) -> Eligible
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 6, 14, 11, 0, tzinfo=timezone.utc), generation_mw=5200.0),
        # At 11:01 UTC (12:01 BST) -> Ineligible, should be ignored
        ForecastRecord(start_time=target_time, publish_time=datetime(2026, 6, 14, 11, 1, tzinfo=timezone.utc), generation_mw=6000.0),
    ]

    items = select_latest_forecasts_for_delivery_day(summer_delivery, cutoff_utc, actuals, candidates)
    item = next(it for it in items if it.start_time == target_time)

    assert item.status == "forecast_selected"
    assert item.forecast_mw == 5200.0
    assert item.publish_time == datetime(2026, 6, 14, 11, 0, tzinfo=timezone.utc)


def test_january_first_cutoff_matches_december_margin():
    """Verify that delivery day 2026-01-01 uses D-1 cutoff on 2025-12-31 and matches December forecasts."""
    jan_one = date(2026, 1, 1)
    cutoff_utc = compute_day_ahead_cutoff(jan_one, "12:00", tz_name="Europe/London")

    # In January (GMT), 12:00 London = 12:00 UTC on 2025-12-31
    assert cutoff_utc == datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)

    target_st = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)
    actuals = [ActualRecord(start_time=target_st, generation_mw=13756.0)]
    candidates = [
        ForecastRecord(
            start_time=target_st,
            publish_time=datetime(2025, 12, 31, 11, 30, tzinfo=timezone.utc),
            generation_mw=13500.0,
        )
    ]

    items = select_latest_forecasts_for_delivery_day(jan_one, cutoff_utc, actuals, candidates)
    item = next(it for it in items if it.start_time == target_st)

    assert item.status == "forecast_selected"
    assert item.forecast_mw == 13500.0
    assert item.publish_time == datetime(2025, 12, 31, 11, 30, tzinfo=timezone.utc)
