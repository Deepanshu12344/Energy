#!/usr/bin/env python3
"""Live Smoke Test against real Supabase dataset for January 2026.

Calls all API endpoints for 2026-01-15 with cutoff 12:00, displays outputs,
and verifies sanity check that selected publish_time is always <= cutoff.
"""

from datetime import datetime
import json
from pathlib import Path
import sys

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def run_smoke_test():
    print("=" * 80)
    print("LIVE SMOKE TEST: Wind Forecast Monitoring API (Supabase Dataset)")
    print("=" * 80)

    # 1. GET /api/health
    print("\n--- 1. GET /api/health ---")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    health_data = resp.json()
    print(json.dumps(health_data, indent=2))
    assert health_data["database_connected"] is True, "Database is not connected!"

    # 2. GET /api/meta
    print("\n--- 2. GET /api/meta ---")
    resp = client.get("/api/meta")
    assert resp.status_code == 200
    meta_data = resp.json()
    print(json.dumps(meta_data, indent=2))

    # 3. GET /api/forecast?date=2026-01-15&cutoff=12:00
    print("\n--- 3. GET /api/forecast?date=2026-01-15&cutoff=12:00 ---")
    resp = client.get("/api/forecast?date=2026-01-15&cutoff=12:00")
    assert resp.status_code == 200
    fc_data = resp.json()
    print(f"Delivery Date: {fc_data['delivery_date']}")
    print(f"Cutoff Time: {fc_data['cutoff_time']} Europe/London")
    print(f"Cutoff UTC Timestamp: {fc_data['cutoff_timestamp_utc']}")
    print(f"Total Slots: {fc_data['total_slots']} | Hourly Slots: {fc_data['hourly_slots']}")
    print(f"Matched Slots: {fc_data['matched_slots']} | Missing Slots: {fc_data['missing_slots']} | Not Applicable (:30): {fc_data['not_applicable_slots']}")

    # SANITY CHECK: Verify publish_time <= cutoff for every selected forecast
    cutoff_dt = datetime.fromisoformat(fc_data["cutoff_timestamp_utc"])
    violations = []
    selected_count = 0

    for item in fc_data["data"]:
        if item["status"] == "forecast_selected":
            selected_count += 1
            pub_dt = datetime.fromisoformat(item["publish_time"])
            if pub_dt > cutoff_dt:
                violations.append((item["start_time"], item["publish_time"]))

    print(f"\n[SANITY CHECK] Checked {selected_count} selected forecasts against cutoff ({cutoff_dt.isoformat()})...")
    if violations:
        print(f"FAILED: Found {len(violations)} cutoff violations: {violations}")
        sys.exit(1)
    else:
        print("PASSED: 100% of selected forecasts have publish_time <= cutoff timestamp!")

    print("\nFirst 6 Slots (showing :00 selected and :30 not_applicable):")
    for item in fc_data["data"][:6]:
        print(f"  Slot {item['start_time']} | Actual: {item['actual_mw']} MW | Forecast: {item['forecast_mw']} MW | Pub: {item['publish_time']} | Lead: {item['lead_time_hours']}h | Error: {item['error_mw']} MW | Status: {item['status']}")

    # 4. GET /api/metrics?start=2026-01-02&end=2026-02-01&cutoff=12:00
    print("\n--- 4. GET /api/metrics (Full January Decisions: 2026-01-02 to 2026-02-01, Cutoff 12:00) ---")
    resp = client.get("/api/metrics?start=2026-01-02&end=2026-02-01&cutoff=12:00")
    assert resp.status_code == 200
    metrics_data = resp.json()
    print(json.dumps(metrics_data, indent=2))

    # 5. GET /api/error-by-hour?start=2026-01-02&end=2026-02-01&cutoff=12:00
    print("\n--- 5. GET /api/error-by-hour (Sample Hours 0, 6, 12, 18, 23) ---")
    resp = client.get("/api/error-by-hour?start=2026-01-02&end=2026-02-01&cutoff=12:00")
    assert resp.status_code == 200
    ebh_data = resp.json()
    sample_hours = [h for h in ebh_data["hourly_errors"] if h["hour"] in (0, 6, 12, 18, 23)]
    for h in sample_hours:
        print(f"  Hour {h['hour']:02d}:00 | Observations: {h['count']} | MAE: {h['mae']} MW | RMSE: {h['rmse']} MW | Bias: {h['bias']} MW")

    # 6. GET /api/horizon-analysis?start=2026-01-02&end=2026-02-01
    print("\n--- 6. GET /api/horizon-analysis (Full January Decisions: 2026-01-02 to 2026-02-01) ---")
    resp = client.get("/api/horizon-analysis?start=2026-01-02&end=2026-02-01")
    assert resp.status_code == 200
    horizon_data = resp.json()
    print("Forward-looking Buckets:")
    for b in horizon_data["main_buckets"]:
        print(f"  Bucket {b['horizon_bucket']:<10} | Count: {b['count']:<5} | MAE: {b['mae']} MW | RMSE: {b['rmse']} MW | Bias: {b['bias']} MW")
    if horizon_data.get("after_target_bucket"):
        ab = horizon_data["after_target_bucket"]
        print(f"Segregated Bucket: {ab['horizon_bucket']} | Count: {ab['count']} | MAE: {ab['mae']} MW | Bias: {ab['bias']} MW")

    print("\n" + "=" * 80)
    print("ALL SMOKE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    from backend.app.data.database import close_pool
    close_pool()


if __name__ == "__main__":
    run_smoke_test()
