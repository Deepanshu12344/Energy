"""Pytest fixtures for unit and API tests."""

from datetime import date, datetime, timedelta, timezone
from typing import Generator, List
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.internal import ActualRecord, ForecastRecord


@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """TestClient fixture with connection pool bypassed or using test app."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_delivery_day() -> date:
    """Standard test delivery date in January 2026."""
    return date(2026, 1, 15)


@pytest.fixture
def sample_actuals_day(sample_delivery_day: date) -> List[ActualRecord]:
    """Generate 48 half-hour actual generation records for sample delivery day."""
    actuals = []
    base_dt = datetime(sample_delivery_day.year, sample_delivery_day.month, sample_delivery_day.day, 0, 0, tzinfo=timezone.utc)
    for i in range(48):
        st = base_dt + timedelta(minutes=30 * i)
        # Predictable generation curve around 10,000 MW + variations
        gen = 10000.0 + (i * 100.0)
        actuals.append(
            ActualRecord(
                start_time=st,
                generation_mw=gen,
                settlement_date=sample_delivery_day,
                settlement_period=i + 1,
            )
        )
    return actuals


@pytest.fixture
def sample_forecast_candidates(sample_delivery_day: date) -> List[ForecastRecord]:
    """Generate candidate forecast records with varying publish times."""
    candidates = []
    base_dt = datetime(sample_delivery_day.year, sample_delivery_day.month, sample_delivery_day.day, 0, 0, tzinfo=timezone.utc)
    cutoff_dt = datetime(sample_delivery_day.year, sample_delivery_day.month, sample_delivery_day.day - 1, 12, 0, tzinfo=timezone.utc)

    # For each hourly slot (24 hours)
    for h in range(24):
        target_st = base_dt + timedelta(hours=h)

        # Early forecast published at D-1 06:00
        candidates.append(
            ForecastRecord(
                start_time=target_st,
                publish_time=cutoff_dt - timedelta(hours=6),
                generation_mw=9500.0 + (h * 200.0),
            )
        )

        # Latest eligible forecast published at D-1 11:30 (before 12:00 cutoff)
        candidates.append(
            ForecastRecord(
                start_time=target_st,
                publish_time=cutoff_dt - timedelta(minutes=30),
                generation_mw=9800.0 + (h * 200.0),
            )
        )

        # Ineligible forecast published at D-1 14:00 (after 12:00 cutoff)
        candidates.append(
            ForecastRecord(
                start_time=target_st,
                publish_time=cutoff_dt + timedelta(hours=2),
                generation_mw=12000.0 + (h * 200.0),
            )
        )

    return candidates
