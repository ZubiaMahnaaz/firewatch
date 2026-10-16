import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple

def parse_iso_or_firms_datetime(date_str: str, time_str: str) -> datetime:
    """Parses date (YYYY-MM-DD) and time (HHMM or HH:MM) into a timezone-aware UTC datetime."""
    try:
        clean_time = time_str.replace(":", "").zfill(4)
        hour = int(clean_time[:2])
        minute = int(clean_time[2:4])
        dt = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=hour, minute=minute, tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in kilometers."""
    R = 6371.0 # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def normalize_confidence(conf_val: Any) -> float:
    """Normalizes confidence string or numeric to [0.0, 1.0]."""
    if conf_val is None:
        return 0.5
    s = str(conf_val).strip().lower()
    if s in ("h", "high", "crit"):
        return 0.95
    if s in ("n", "nominal", "med", "medium"):
        return 0.65
    if s in ("l", "low", "sub-pixel"):
        return 0.30
    try:
        val = float(conf_val)
        if val > 1.0:
            return max(0.0, min(1.0, val / 100.0))
        return max(0.0, min(1.0, val))
    except (ValueError, TypeError):
        return 0.5

def calculate_priority_score(
    frp: float,
    acq_dt: datetime,
    conf_score: float,
    repeat_count: int,
    reference_now: datetime,
    w_frp: float = 0.35,
    w_recency: float = 0.25,
    w_confidence: float = 0.20,
    w_persistence: float = 0.20,
    half_life_hours: float = 6.0
) -> Tuple[float, str, float, float, float, float]:
    """
    Computes explainable priority score (0-100) and point contributions:
    Priority = 100 * (w1*norm_frp + w2*recency_decay + w3*conf + w4*persistence) / (w1+w2+w3+w4)
    """
    # 1. FRP normalization: non-linear scaling up to 150MW
    safe_frp = max(0.0, frp or 0.0)
    norm_frp = min(1.0, safe_frp / 120.0) if safe_frp <= 120.0 else min(1.0, 0.85 + 0.15 * math.log10(1.0 + (safe_frp - 120.0) / 100.0))

    # 2. Recency exponential decay
    age_seconds = max(0.0, (reference_now - acq_dt).total_seconds())
    age_hours = age_seconds / 3600.0
    recency_decay = math.pow(0.5, age_hours / max(0.5, half_life_hours))

    # 3. Confidence weight
    safe_conf = max(0.0, min(1.0, conf_score))

    # 4. Persistence (repeat-pass multi-detection)
    if repeat_count <= 1:
        persistence = 0.15
    elif repeat_count == 2:
        persistence = 0.50
    elif repeat_count == 3:
        persistence = 0.80
    else:
        persistence = 1.0

    total_weight = w_frp + w_recency + w_confidence + w_persistence
    if total_weight <= 0.0:
        total_weight = 1.0

    frp_contrib = (w_frp * norm_frp / total_weight) * 100.0
    recency_contrib = (w_recency * recency_decay / total_weight) * 100.0
    conf_contrib = (w_confidence * safe_conf / total_weight) * 100.0
    persistence_contrib = (w_persistence * persistence / total_weight) * 100.0

    score = round(frp_contrib + recency_contrib + conf_contrib + persistence_contrib, 1)
    score = max(0.0, min(100.0, score))

    if score >= 80.0:
        tier = "Tier-1 Critical"
    elif score >= 60.0:
        tier = "Tier-2 Priority"
    elif score >= 35.0:
        tier = "Tier-3 Advisory"
    else:
        tier = "Tier-4 Routine"

    return (
        score,
        tier,
        round(frp_contrib, 1),
        round(recency_contrib, 1),
        round(conf_contrib, 1),
        round(persistence_contrib, 1)
    )

def cluster_repeat_detections(records: List[Dict[str, Any]], distance_threshold_km: float = 2.0, time_window_hours: float = 48.0) -> List[Dict[str, Any]]:
    """
    Groups observations into repeat-detection spatial clusters within distance_threshold_km and time_window_hours.
    Adds `is_repeat`, `repeat_cluster_id`, and `repeat_count` to records.
    """
    n = len(records)
    if n == 0:
        return records

    # Sort chronologically
    parsed_dates = []
    for r in records:
        dt = parse_iso_or_firms_datetime(r.get("acq_date", "2026-05-18"), r.get("acq_time", "0000"))
        parsed_dates.append(dt)

    cluster_assignments = [-1] * n
    cluster_sizes: Dict[int, int] = {}
    current_cluster_id = 1

    for i in range(n):
        if cluster_assignments[i] != -1:
            continue
        
        # Start a new cluster
        cid = current_cluster_id
        cluster_assignments[i] = cid
        c_members = [i]

        for j in range(i + 1, n):
            if cluster_assignments[j] != -1:
                continue
            
            # Check temporal window
            time_diff_hours = abs((parsed_dates[j] - parsed_dates[i]).total_seconds()) / 3600.0
            if time_diff_hours > time_window_hours:
                continue

            # Check spatial distance
            dist = haversine_distance_km(
                records[i]["latitude"], records[i]["longitude"],
                records[j]["latitude"], records[j]["longitude"]
            )
            if dist <= distance_threshold_km:
                cluster_assignments[j] = cid
                c_members.append(j)

        cluster_sizes[cid] = len(c_members)
        current_cluster_id += 1

    for idx, r in enumerate(records):
        cid = cluster_assignments[idx]
        size = cluster_sizes.get(cid, 1)
        r["repeat_cluster_id"] = f"CLUST-{cid:04d}" if size > 1 else None
        r["repeat_count"] = size
        r["is_repeat"] = 1 if size > 1 else 0

        flags, expl = detect_anomaly_flags(r)
        r["anomaly_flags"] = flags
        r["anomaly_explanation"] = expl

    return records

def detect_anomaly_flags(record: Dict[str, Any]) -> Tuple[str, str]:
    """
    Evaluates an observation for satellite remote sensing anomaly indicators:
    - extreme_frp: FRP >= 100 MW (extreme pyrocumulonimbus / canopy run)
    - static_heat_source: repeat_count >= 3 (stationary flare / smelter)
    - bow_tie_distortion: scan >= 1.2 or track >= 1.2 (off-nadir pixel smearing)
    - nocturnal_intense: nocturnal pass with FRP >= 60 MW
    - low_confidence_subpixel: confidence score < 0.40
    """
    flags = []
    explanations = []

    frp = float(record.get("frp") or 0.0)
    repeat_count = int(record.get("repeat_count") or 1)
    scan = float(record.get("scan") or 1.0)
    track = float(record.get("track") or 1.0)
    daynight = str(record.get("daynight") or "D").upper()
    conf_score = normalize_confidence(record.get("confidence") or record.get("confidence_score") or 0.5)

    if frp >= 100.0:
        flags.append("extreme_frp")
        explanations.append(f"Radiative output of {frp} MW exceeds 99th regional percentile, indicating extreme crown fire or heavy flaring.")

    if repeat_count >= 3:
        flags.append("static_heat_source")
        explanations.append(f"Stationary thermal anomaly detected across {repeat_count} consecutive orbital passes; check for petrochemical flaring or mining smelter.")

    if scan >= 1.2 or track >= 1.2:
        flags.append("bow_tie_distortion")
        explanations.append(f"Off-nadir scan angle ({scan:.2f}×{track:.2f}) induces optical bow-tie distortion and pixel elongation.")

    if daynight == "N" and frp >= 60.0:
        flags.append("nocturnal_intense")
        explanations.append(f"Vigorous nocturnal thermal emission ({frp} MW) despite overnight relative humidity recovery.")

    if conf_score < 0.40:
        flags.append("low_confidence_subpixel")
        explanations.append("Weak sub-pixel thermal signal near sensor noise floor; possible solar glint or warm soil reflection.")

    flags_str = ",".join(flags)
    explanation_str = " | ".join(explanations)
    return flags_str, explanation_str

