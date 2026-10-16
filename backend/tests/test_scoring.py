import pytest
from datetime import datetime, timezone, timedelta
from backend.scoring import calculate_priority_score, cluster_repeat_detections, normalize_confidence

def test_confidence_normalization():
    assert normalize_confidence("high") == 0.95
    assert normalize_confidence("nominal") == 0.65
    assert normalize_confidence("low") == 0.30
    assert normalize_confidence("85") == 0.85
    assert normalize_confidence(None) == 0.50

def test_priority_score_calculation():
    ref_now = datetime(2026, 5, 18, 14, 30, tzinfo=timezone.utc)
    # High FRP, recent, high confidence, multi-pass
    recent_dt = ref_now - timedelta(minutes=15)
    score, tier, f_pts, r_pts, c_pts, p_pts = calculate_priority_score(
        frp=140.0,
        acq_dt=recent_dt,
        conf_score=0.95,
        repeat_count=4,
        reference_now=ref_now,
        w_frp=0.35,
        w_recency=0.25,
        w_confidence=0.20,
        w_persistence=0.20
    )
    assert score >= 80.0
    assert tier == "Tier-1 Critical"
    assert f_pts > 0
    assert r_pts > 0

    # Low FRP, old (36h ago), low confidence, 1 detection
    old_dt = ref_now - timedelta(hours=36)
    score_low, tier_low, _, _, _, _ = calculate_priority_score(
        frp=5.0,
        acq_dt=old_dt,
        conf_score=0.30,
        repeat_count=1,
        reference_now=ref_now
    )
    assert score_low < 35.0
    assert tier_low == "Tier-4 Routine"

def test_repeat_detection_clustering():
    records = [
        {"latitude": 39.8240, "longitude": -121.4420, "acq_date": "2026-05-18", "acq_time": "1000"},
        {"latitude": 39.8245, "longitude": -121.4425, "acq_date": "2026-05-18", "acq_time": "1400"}, # ~60m away, 4h later -> should cluster
        {"latitude": 48.0000, "longitude": -120.0000, "acq_date": "2026-05-18", "acq_time": "1400"}  # far away -> separate
    ]
    clustered = cluster_repeat_detections(records, distance_threshold_km=2.0, time_window_hours=48.0)
    assert clustered[0]["repeat_count"] == 2
    assert clustered[1]["repeat_count"] == 2
    assert clustered[0]["repeat_cluster_id"] == clustered[1]["repeat_cluster_id"]
    assert clustered[2]["repeat_count"] == 1
    assert clustered[2]["repeat_cluster_id"] is None
