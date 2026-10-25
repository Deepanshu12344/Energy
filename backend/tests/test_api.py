"""Integration tests for FastAPI endpoints using TestClient."""

from fastapi.testclient import TestClient


def test_root_redirect_to_docs(test_client: TestClient):
    """GET / redirects to /docs."""
    resp = test_client.get("/", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "/docs"


def test_favicon(test_client: TestClient):
    """GET /favicon.ico returns 204 No Content."""
    resp = test_client.get("/favicon.ico")
    assert resp.status_code == 204


def test_api_health(test_client: TestClient):
    """GET /api/health returns 200 with status and database connection info."""
    resp = test_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "database_connected" in data
    assert "timestamp" in data


def test_api_meta(test_client: TestClient):
    """GET /api/meta returns 200 with configuration and resolution notes."""
    resp = test_client.get("/api/meta")
    assert resp.status_code == 200
    data = resp.json()
    assert data["available_start_date"] == "2026-01-01"
    assert data["available_end_date"] == "2026-01-31"
    assert data["default_cutoff_time"] == "12:00"
    assert data["timezone"] == "Europe/London"
    assert "resolution_notes" in data
    assert data["resolution_notes"]["matching_strategy"] == "exact_timestamp_match"


def test_api_forecast_happy_path(test_client: TestClient):
    """GET /api/forecast returns 48 slots with status 'forecast_selected' and 'not_applicable'."""
    resp = test_client.get("/api/forecast?date=2026-01-15&cutoff=12:00")
    assert resp.status_code == 200
    data = resp.json()
    assert data["delivery_date"] == "2026-01-15"
    assert data["cutoff_time"] == "12:00"
    assert data["total_slots"] == 48
    assert data["not_applicable_slots"] == 24
    assert len(data["data"]) == 48

    # Verify hourly items have status forecast_selected or missing
    hourly_items = [item for item in data["data"] if item["start_time"].endswith(":00:00Z")]
    assert len(hourly_items) == 24
    for it in hourly_items:
        assert it["status"] in ("forecast_selected", "missing")

    # Verify half-hourly items have status not_applicable and null forecast
    half_hourly_items = [item for item in data["data"] if item["start_time"].endswith(":30:00Z")]
    assert len(half_hourly_items) == 24
    for it in half_hourly_items:
        assert it["status"] == "not_applicable"
        assert it["forecast_mw"] is None


def test_api_metrics_happy_path(test_client: TestClient):
    """GET /api/metrics returns accuracy metrics with P90 buffer and MAPE exclusion count."""
    resp = test_client.get("/api/metrics?start=2026-01-01&end=2026-01-15&cutoff=12:00")
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_date"] == "2026-01-01"
    assert data["end_date"] == "2026-01-15"
    assert "metrics" in data
    metrics = data["metrics"]
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "bias" in metrics
    assert "mape" in metrics
    assert "mape_excluded_count" in metrics
    assert "buffer_recommendation_mw_p90" in metrics
    assert metrics["total_slots"] == 15 * 24  # 15 days * 24 hours


def test_api_error_by_hour_happy_path(test_client: TestClient):
    """GET /api/error-by-hour returns 24 hours (0..23) of aggregated accuracy metrics."""
    resp = test_client.get("/api/error-by-hour?start=2026-01-01&end=2026-01-05&cutoff=12:00")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["hourly_errors"]) == 24
    assert [h["hour"] for h in data["hourly_errors"]] == list(range(24))


def test_api_horizon_analysis_happy_path(test_client: TestClient):
    """GET /api/horizon-analysis returns forward buckets and after_target_bucket."""
    resp = test_client.get("/api/horizon-analysis?start=2026-01-01&end=2026-01-05")
    assert resp.status_code == 200
    data = resp.json()
    assert "main_buckets" in data
    assert len(data["main_buckets"]) == 6
    assert [b["horizon_bucket"] for b in data["main_buckets"]] == [
        "<12h", "12-18h", "18-24h", "24-36h", "36-48h", ">48h"
    ]
    assert "after_target_bucket" in data


def test_api_error_distribution_happy_path(test_client: TestClient):
    """GET /api/error-distribution returns dynamic histogram bins and over_forecast_share."""
    resp = test_client.get("/api/error-distribution?start=2026-01-01&end=2026-01-05&cutoff=12:00&bins=8")
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_date"] == "2026-01-01"
    assert data["end_date"] == "2026-01-05"
    assert "total_samples" in data
    assert "over_forecast_share" in data
    assert 0.0 <= data["over_forecast_share"] <= 1.0
    assert len(data["bins"]) == 8
    assert data["bins"][0]["bin_min"] == data["min_error_mw"]
    assert data["bins"][-1]["bin_max"] == data["max_error_mw"]


# Error Handling & Validation Tests
def test_invalid_date_format(test_client: TestClient):
    """Test invalid calendar date format returns 400 with ErrorResponse."""
    resp = test_client.get("/api/forecast?date=2026-01-35&cutoff=12:00")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "VALIDATION_ERROR"
    assert data["status_code"] == 400


def test_out_of_range_date(test_client: TestClient):
    """Test date outside January 2026 returns 400 with ErrorResponse."""
    resp = test_client.get("/api/forecast?date=2025-12-31&cutoff=12:00")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "VALIDATION_ERROR"
    assert "out of scope" in data["detail"]


def test_start_greater_than_end(test_client: TestClient):
    """Test start date after end date returns 400 with ErrorResponse."""
    resp = test_client.get("/api/metrics?start=2026-01-20&end=2026-01-10&cutoff=12:00")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "VALIDATION_ERROR"
    assert "start date" in data["detail"]


def test_bad_cutoff_format(test_client: TestClient):
    """Test invalid cutoff format returns 400 with ErrorResponse."""
    resp = test_client.get("/api/forecast?date=2026-01-15&cutoff=25:00")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "VALIDATION_ERROR"
    assert "Invalid cutoff format" in data["detail"]


def test_missing_required_params(test_client: TestClient):
    """Test missing required date parameter returns 400 with ErrorResponse."""
    resp = test_client.get("/api/forecast")
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "VALIDATION_ERROR"


def test_cors_preflight_and_simple_request_for_vercel_and_localhost(test_client: TestClient):
    """Test that Vercel preview/production domains and localhost pass CORS preflight and get allow-origin headers."""
    # Test Vercel domain preflight
    res_opt = test_client.options(
        "/api/health",
        headers={
            "Origin": "https://energy-wind-frontend.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_opt.status_code == 200
    assert res_opt.headers.get("access-control-allow-origin") == "https://energy-wind-frontend.vercel.app"

    # Test Vercel domain simple GET
    res_get = test_client.get(
        "/api/health",
        headers={"Origin": "https://energy-wind-frontend.vercel.app"},
    )
    assert res_get.status_code == 200
    assert res_get.headers.get("access-control-allow-origin") == "https://energy-wind-frontend.vercel.app"

    # Test Localhost simple GET
    res_local = test_client.get(
        "/api/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert res_local.status_code == 200
    assert res_local.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Test disallowed origin preflight returns 400
    res_bad = test_client.options(
        "/api/health",
        headers={
            "Origin": "https://unauthorized-domain.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_bad.status_code == 400
