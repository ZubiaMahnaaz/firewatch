import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_root_and_health_endpoints(client):
    """Verify platform health probes on /, /health, and /api/health."""
    r_root = client.get("/")
    assert r_root.status_code == 200
    assert r_root.json()["status"] == "online"

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_api_health = client.get("/api/health")
    assert r_api_health.status_code == 200
    assert r_api_health.json()["status"] == "healthy"
    assert r_api_health.json()["observations_loaded"] > 0

def test_synthetic_demo_data_integrity(client):
    """Ensure all pre-seeded demo observations are clearly labeled as synthetic demo."""
    resp = client.get("/api/observations?limit=50")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) > 0
    for item in items:
        # None of the demo records should falsely claim to be verified live NASA data
        if item["source_type"] != "LIVE_FIRMS":
            assert item["source_type"] in ("SYNTHETIC_DEMO", "synthetic_sample", "csv_upload")

def test_csv_upload_valid_file(client):
    """Verify CSV ingestion with standard FIRMS headers."""
    valid_csv = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
38.2510,-120.4510,345.5,0.4,0.4,2026-10-15,1420,Suomi-NPP,VIIRS,high,2.0NRT,305.2,55.0,D
38.2520,-120.4520,350.1,0.4,0.4,2026-10-15,1420,Suomi-NPP,VIIRS,high,2.0NRT,310.0,62.5,D
"""
    resp = client.post(
        "/api/import/csv",
        files={"file": ("test_valid_import.csv", valid_csv, "text/csv")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["valid_rows"] == 2
    assert data["summary"]["invalid_rows"] == 0

def test_csv_upload_invalid_and_empty_files(client):
    """Verify graceful handling of malformed and empty CSV uploads."""
    # Completely empty file
    resp_empty = client.post(
        "/api/import/csv",
        files={"file": ("empty.csv", "", "text/csv")}
    )
    assert resp_empty.status_code == 200
    data_empty = resp_empty.json()
    assert data_empty["summary"]["valid_rows"] == 0
    assert data_empty["summary"]["invalid_rows"] > 0

    # Missing mandatory columns
    bad_csv = "temperature,sensor_id\n450,SAT-1\n"
    resp_bad = client.post(
        "/api/import/csv",
        files={"file": ("missing_cols.csv", bad_csv, "text/csv")}
    )
    assert resp_bad.status_code == 200
    data_bad = resp_bad.json()
    assert data_bad["summary"]["valid_rows"] == 0
    assert data_bad["summary"]["invalid_rows"] > 0

def test_queue_and_caveat_filters(client):
    """Test observation queue filtering across multiple criteria."""
    # Priority tier filter
    resp_tier = client.get("/api/observations?priority_tier=Tier-1 Critical&limit=5")
    assert resp_tier.status_code == 200
    for it in resp_tier.json()["items"]:
        assert it["priority_tier"] == "Tier-1 Critical"

    # Repeat only filter
    resp_repeat = client.get("/api/observations?repeat_only=true&limit=5")
    assert resp_repeat.status_code == 200
    for it in resp_repeat.json()["items"]:
        assert it["repeat_count"] >= 2 or it["is_repeat"] == 1

def test_firms_demo_mode_safety(client):
    """Verify that FIRMS endpoints remain completely safe in demo mode without crashing."""
    status_resp = client.get("/api/firms/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "configured" in data
    # Masked key format check
    if data["configured"] and data.get("masked_key"):
        assert "..." in data["masked_key"]
        assert len(data["masked_key"]) <= 12

    # Verification endpoint must return structured status without leaking secret
    verify_resp = client.get("/api/firms/verify-key")
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert "status" in verify_data
    assert "success" in verify_data
