import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from backend.scoring import calculate_priority_score, cluster_repeat_detections, normalize_confidence

def generate_synthetic_firms_dataset() -> List[Dict[str, Any]]:
    """
    Generates a realistic, clearly labelled synthetic demonstration dataset
    mirroring the Google Stitch telemetry profiles and distributions.
    """
    random.seed(42) # Deterministic for reproducibility
    records = []

    # Reference "now": May 18, 2026, 14:45 UTC
    ref_now = datetime(2026, 5, 18, 14, 45, 0, tzinfo=timezone.utc)

    # Corridors / Cluster Hubs
    corridors = [
        {
            "name": "Sierra Nevada Foothills, CA",
            "lat_center": 39.8241,
            "lon_center": -121.4429,
            "spread": 0.35,
            "count": 420,
            "frp_mean": 42.1,
            "frp_scale": 35.0
        },
        {
            "name": "Willamette National Forest, OR",
            "lat_center": 44.1523,
            "lon_center": -122.1892,
            "spread": 0.40,
            "count": 280,
            "frp_mean": 31.8,
            "frp_scale": 25.0
        },
        {
            "name": "Northern Cascades, WA",
            "lat_center": 48.4592,
            "lon_center": -121.1345,
            "spread": 0.30,
            "count": 180,
            "frp_mean": 18.2,
            "frp_scale": 15.0
        },
        {
            "name": "Gila Wilderness, NM",
            "lat_center": 33.3421,
            "lon_center": -108.4521,
            "spread": 0.45,
            "count": 140,
            "frp_mean": 54.0,
            "frp_scale": 45.0
        },
        {
            "name": "Trinity Basin, CA",
            "lat_center": 40.7512,
            "lon_center": -123.1145,
            "spread": 0.35,
            "count": 120,
            "frp_mean": 48.0,
            "frp_scale": 30.0
        },
        {
            "name": "Klamath Ridge, CA",
            "lat_center": 41.6521,
            "lon_center": -122.8412,
            "spread": 0.30,
            "count": 108,
            "frp_mean": 36.0,
            "frp_scale": 24.0
        }
    ]

    obs_counter = 1000

    # Explicit flagship observations from Stitch designs:
    flagship_obs = [
        {
            "obs_id": "FW-8842-VIIRS",
            "latitude": 39.8241,
            "longitude": -121.4429,
            "brightness": 384.2,
            "scan": 0.38,
            "track": 0.36,
            "acq_date": "2026-05-18",
            "acq_time": "1427",
            "acq_datetime": "2026-05-18T14:27:00Z",
            "satellite": "Suomi-NPP",
            "instrument": "VIIRS",
            "confidence": "high",
            "confidence_score": 0.96,
            "version": "2.0NRT",
            "bright_t31": 312.4,
            "frp": 142.6,
            "daynight": "D",
            "region": "Sierra Nevada Foothills, CA",
            "source_type": "synthetic_sample",
            "validation_status": "valid",
            "review_status": "needs_review",
            "review_notes": "Tier-1 rapid escalation candidate. Elevated thermal radiance above 99th regional percentile.",
            "is_repeat": 1,
            "repeat_cluster_id": "CLUST-0001",
            "repeat_count": 4,
            "created_at": ref_now.isoformat()
        },
        {
            "obs_id": "FW-8840-MODIS",
            "latitude": 40.7512,
            "longitude": -123.1145,
            "brightness": 362.8,
            "scan": 1.0,
            "track": 1.0,
            "acq_date": "2026-05-18",
            "acq_time": "1411",
            "acq_datetime": "2026-05-18T14:11:00Z",
            "satellite": "Terra",
            "instrument": "MODIS",
            "confidence": "high",
            "confidence_score": 0.91,
            "version": "6.1NRT",
            "bright_t31": 305.2,
            "frp": 88.4,
            "daynight": "D",
            "region": "Trinity Basin, CA",
            "source_type": "synthetic_sample",
            "validation_status": "valid",
            "review_status": "unreviewed",
            "review_notes": "",
            "is_repeat": 1,
            "repeat_cluster_id": "CLUST-0002",
            "repeat_count": 3,
            "created_at": ref_now.isoformat()
        },
        {
            "obs_id": "FW-8837-VIIRS",
            "latitude": 41.6521,
            "longitude": -122.8412,
            "brightness": 348.5,
            "scan": 0.40,
            "track": 0.38,
            "acq_date": "2026-05-18",
            "acq_time": "1357",
            "acq_datetime": "2026-05-18T13:57:00Z",
            "satellite": "NOAA-20",
            "instrument": "VIIRS",
            "confidence": "high",
            "confidence_score": 0.88,
            "version": "2.0NRT",
            "bright_t31": 298.6,
            "frp": 61.2,
            "daynight": "D",
            "region": "Klamath Ridge, CA",
            "source_type": "synthetic_sample",
            "validation_status": "valid",
            "review_status": "unreviewed",
            "review_notes": "",
            "is_repeat": 1,
            "repeat_cluster_id": "CLUST-0003",
            "repeat_count": 3,
            "created_at": ref_now.isoformat()
        },
        {
            "obs_id": "FW-8819-VIIRS",
            "latitude": 44.1523,
            "longitude": -122.1892,
            "brightness": 328.1,
            "scan": 0.39,
            "track": 0.37,
            "acq_date": "2026-05-18",
            "acq_time": "1332",
            "acq_datetime": "2026-05-18T13:32:00Z",
            "satellite": "Suomi-NPP",
            "instrument": "VIIRS",
            "confidence": "nominal",
            "confidence_score": 0.72,
            "version": "2.0NRT",
            "bright_t31": 294.1,
            "frp": 38.4,
            "daynight": "D",
            "region": "Willamette National Forest, OR",
            "source_type": "synthetic_sample",
            "validation_status": "valid",
            "review_status": "unreviewed",
            "review_notes": "",
            "is_repeat": 1,
            "repeat_cluster_id": "CLUST-0004",
            "repeat_count": 2,
            "created_at": ref_now.isoformat()
        },
        {
            "obs_id": "FW-8790-VIIRS",
            "latitude": 33.3421,
            "longitude": -108.4521,
            "brightness": 308.0,
            "scan": 0.42,
            "track": 0.40,
            "acq_date": "2026-05-18",
            "acq_time": "1015",
            "acq_datetime": "2026-05-18T10:15:00Z",
            "satellite": "NOAA-20",
            "instrument": "VIIRS",
            "confidence": "low",
            "confidence_score": 0.35,
            "version": "2.0NRT",
            "bright_t31": 288.4,
            "frp": 8.5,
            "daynight": "N",
            "region": "Gila Wilderness, NM",
            "source_type": "synthetic_sample",
            "validation_status": "valid",
            "review_status": "flagged_false_positive",
            "review_notes": "Static flare signature candidate located near industrial sector.",
            "is_repeat": 0,
            "repeat_cluster_id": None,
            "repeat_count": 1,
            "created_at": ref_now.isoformat()
        }
    ]

    records.extend(flagship_obs)

    # Generate remaining records across the corridors
    for corridor in corridors:
        target_count = corridor["count"] - 1 # account for flagships
        for _ in range(target_count):
            obs_counter += 1
            # Diurnal distribution: peak at 13:00 - 15:00 UTC (solar noon / pass sync)
            r_hour = random.random()
            if r_hour < 0.45:
                # Peak window 12:00 - 15:30
                hour = random.randint(12, 15)
                minute = random.randint(0, 59)
            elif r_hour < 0.70:
                # Nocturnal pass 08:00 - 11:30
                hour = random.randint(8, 11)
                minute = random.randint(0, 59)
            else:
                # Other hours
                hour = random.choice([0, 1, 2, 3, 4, 5, 6, 7, 16, 17, 18, 19, 20, 21, 22, 23])
                minute = random.randint(0, 59)

            # Age within last 48h
            days_ago = random.choices([0, 1, 2], weights=[0.55, 0.30, 0.15])[0]
            obs_dt = ref_now - timedelta(days=days_ago, hours=(ref_now.hour - hour) % 24, minutes=minute)
            date_str = obs_dt.strftime("%Y-%m-%d")
            time_str = obs_dt.strftime("%H%M")
            iso_str = obs_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            # Satellite & Instrument attribution (54% S-NPP, 38% NOAA-20, 8% MODIS)
            sat_roll = random.random()
            if sat_roll < 0.54:
                satellite = "Suomi-NPP"
                instrument = "VIIRS"
                scan, track = 0.38, 0.36
            elif sat_roll < 0.92:
                satellite = "NOAA-20"
                instrument = "VIIRS"
                scan, track = 0.39, 0.37
            else:
                satellite = random.choice(["Terra", "Aqua"])
                instrument = "MODIS"
                scan, track = 1.0, 1.0

            # FRP distribution: 42% <10, 38% 10-50, 14% 50-100, 6% >100
            frp_roll = random.random()
            if frp_roll < 0.42:
                frp = round(random.uniform(2.5, 9.9), 1)
            elif frp_roll < 0.80:
                frp = round(random.uniform(10.0, 49.9), 1)
            elif frp_roll < 0.94:
                frp = round(random.uniform(50.0, 99.5), 1)
            else:
                frp = round(random.uniform(100.0, 342.1), 1)

            # Spatial jitter around corridor center
            lat = round(corridor["lat_center"] + random.gauss(0, corridor["spread"] / 2.5), 4)
            lon = round(corridor["lon_center"] + random.gauss(0, corridor["spread"] / 2.5), 4)

            # Confidence: 58% high, 34% nominal, 8% low
            conf_roll = random.random()
            if conf_roll < 0.58:
                confidence = "high"
                conf_score = round(random.uniform(0.85, 0.98), 2)
            elif conf_roll < 0.92:
                confidence = "nominal"
                conf_score = round(random.uniform(0.55, 0.84), 2)
            else:
                confidence = "low"
                conf_score = round(random.uniform(0.20, 0.54), 2)

            daynight = "D" if 11 <= hour <= 22 else "N"
            brightness = round(290.0 + (frp * 0.45) + random.uniform(0, 15), 1)
            bright_t31 = round(280.0 + random.uniform(0, 25), 1)

            rec = {
                "obs_id": f"FW-{obs_counter:04d}-{instrument}",
                "latitude": lat,
                "longitude": lon,
                "brightness": brightness,
                "scan": scan,
                "track": track,
                "acq_date": date_str,
                "acq_time": time_str,
                "acq_datetime": iso_str,
                "satellite": satellite,
                "instrument": instrument,
                "confidence": confidence,
                "confidence_score": conf_score,
                "version": "2.0NRT",
                "bright_t31": bright_t31,
                "frp": frp,
                "daynight": daynight,
                "region": corridor["name"],
                "source_type": "synthetic_sample",
                "validation_status": "valid",
                "review_status": "unreviewed",
                "review_notes": "",
                "is_repeat": 0,
                "repeat_cluster_id": None,
                "repeat_count": 1,
                "created_at": ref_now.isoformat()
            }
            records.append(rec)

    # Compute clusters
    records = cluster_repeat_detections(records, distance_threshold_km=2.0, time_window_hours=48.0)

    # Compute priority scores
    for r in records:
        dt = datetime.strptime(r["acq_datetime"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        score, tier, f_pts, r_pts, c_pts, p_pts = calculate_priority_score(
            frp=r["frp"],
            acq_dt=dt,
            conf_score=r["confidence_score"],
            repeat_count=r["repeat_count"],
            reference_now=ref_now,
            w_frp=0.35,
            w_recency=0.25,
            w_confidence=0.20,
            w_persistence=0.20,
            half_life_hours=6.0
        )
        r["priority_score"] = score
        r["priority_tier"] = tier
        r["frp_points"] = f_pts
        r["recency_points"] = r_pts
        r["conf_points"] = c_pts
        r["persistence_points"] = p_pts

    return records
