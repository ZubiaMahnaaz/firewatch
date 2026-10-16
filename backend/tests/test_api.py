import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["observations_loaded"] > 0

def test_dashboard_overview(client):
    response = client.get("/api/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_observations" in data
    assert "high_priority_count" in data
    assert "diurnal_curve" in data
    assert "frp_distribution" in data

def test_observations_filtering(client):
    response = client.get("/api/observations?limit=10&min_frp=50.0")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) <= 10
    for it in data["items"]:
        assert it["frp"] >= 50.0

def test_observation_detail_and_review(client):
    obs_list = client.get("/api/observations?limit=1").json()
    assert len(obs_list["items"]) > 0
    obs_id = obs_list["items"][0]["obs_id"]

    detail_res = client.get(f"/api/observations/{obs_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["observation"]["obs_id"] == obs_id
    assert "contributing_factors" in detail

    # Update review status
    review_res = client.post(f"/api/observations/{obs_id}/review", json={
        "review_status": "verified_fire",
        "review_notes": "Ground spotter confirms active crown fire in sector 4."
    })
    assert review_res.status_code == 200
    assert review_res.json()["review_status"] == "verified_fire"

    # Verify persistent in detail
    updated = client.get(f"/api/observations/{obs_id}").json()
    assert updated["observation"]["review_status"] == "verified_fire"

def test_scoring_weights_update(client):
    get_res = client.get("/api/scoring/weights")
    assert get_res.status_code == 200

    put_res = client.put("/api/scoring/weights", json={
        "w_frp": 0.40,
        "w_recency": 0.20,
        "w_confidence": 0.20,
        "w_persistence": 0.20,
        "half_life_hours": 8.0
    })
    assert put_res.status_code == 200
    assert put_res.json()["weights"]["w_frp"] == 0.40

def test_what_if_simulator(client):
    sim_res = client.post("/api/scoring/simulate", json={
        "frp": 120.0,
        "age_hours": 0.5,
        "confidence": "high",
        "repeat_count": 4,
        "w_frp": 0.35,
        "w_recency": 0.25,
        "w_confidence": 0.20,
        "w_persistence": 0.20
    })
    assert sim_res.status_code == 200
    data = sim_res.json()
    assert data["simulated_score"] >= 80.0
    assert data["simulated_tier"] == "Tier-1 Critical"

def test_export_endpoints(client):
    csv_res = client.get("/api/export/csv?limit=5")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    geo_res = client.get("/api/export/geojson")
    assert geo_res.status_code == 200
    assert geo_res.json()["type"] == "FeatureCollection"

    sum_res = client.get("/api/export/summary-report")
    assert sum_res.status_code == 200
    assert "# FireWatch" in sum_res.text

def test_api_csv_preview(client):
    valid_csv = "latitude,longitude,brightness,acq_date,acq_time,satellite,confidence,frp\n37.5,-119.5,330.5,2026-10-15,1330,VIIRS,high,45.2\n"
    res = client.post(
        "/api/import/preview",
        files={"file": ("test_preview.csv", valid_csv, "text/csv")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["filename"] == "test_preview.csv"
    assert data["is_valid_header"] is True
    assert len(data["preview_rows"]) == 1
    assert len(data["missing_required_columns"]) == 0

    invalid_csv = "brightness,temperature\n300,400\n"
    res_inv = client.post(
        "/api/import/preview",
        files={"file": ("invalid.csv", invalid_csv, "text/csv")}
    )
    assert res_inv.status_code == 200
    data_inv = res_inv.json()
    assert data_inv["is_valid_header"] is False
    assert len(data_inv["missing_required_columns"]) > 0

def test_provenance_and_anomaly_filtering(client):
    # Test provenance filtering
    res_prov = client.get("/api/observations?source_type=SYNTHETIC_DEMO&limit=10")
    assert res_prov.status_code == 200
    prov_data = res_prov.json()
    for it in prov_data["items"]:
        assert it["source_type"] == "SYNTHETIC_DEMO"

    # Test anomaly filtering
    res_anom = client.get("/api/observations?anomaly_type=any&limit=10")
    assert res_anom.status_code == 200
    anom_data = res_anom.json()
    for it in anom_data["items"]:
        assert it["anomaly_flags"] is not None

def test_clear_anomaly_review(client):
    # Find an observation with an anomaly
    anom_res = client.get("/api/observations?anomaly_type=any&limit=1").json()
    if anom_res["items"]:
        obs_id = anom_res["items"][0]["obs_id"]
        res = client.post(f"/api/observations/{obs_id}/review", json={
            "review_status": "verified_fire",
            "review_notes": "Confirmed active wildfire front; clearing false anomaly tag.",
            "clear_anomaly": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("anomaly_flags") in ("", None)
        assert data["review_status"] == "verified_fire"

        # Verify persistent in database
        obs_detail = client.get(f"/api/observations/{obs_id}").json()
        assert obs_detail["observation"]["anomaly_flags"] in ("", None)

def test_firms_status(client):
    res = client.get("/api/firms/status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "message" in data
