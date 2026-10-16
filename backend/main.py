import os
import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load root .env relative to project root before any other local imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOTENV_PATH = PROJECT_ROOT / ".env"
if DOTENV_PATH.is_file():
    load_dotenv(dotenv_path=DOTENV_PATH, override=True)
else:
    load_dotenv(override=True)

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
import io
import csv

from backend.database import get_db_connection, init_db, DB_PATH

from backend.models import (
    ScoringWeights,
    ObservationReviewUpdate,
    ObservationFilterParams,
    ObservationItem,
    ObservationDetailResponse,
    DashboardOverviewResponse,
    ValidationReportSummary
)
from backend.scoring import (
    calculate_priority_score,
    cluster_repeat_detections,
    normalize_confidence,
    parse_iso_or_firms_datetime
)
from backend.csv_validator import validate_and_parse_csv, EXPECTED_COLUMNS, preview_csv_content
from backend.sample_data import generate_synthetic_firms_dataset
from backend.firms_client import (
    fetch_firms_nrt_data,
    is_firms_configured,
    get_masked_firms_key,
    verify_firms_connection
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM observations;")
    count = cursor.fetchone()[0]
    if count == 0:
        print("[FireWatch] Empty database detected. Seeding synthetic demonstration dataset...")
        seed_data = generate_synthetic_firms_dataset()
        insert_records_to_db(conn, seed_data, source_type="synthetic_sample")
        cursor.execute("""
            INSERT INTO validation_reports (batch_id, filename, total_rows, valid_rows, invalid_rows, duplicate_rows, status, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            "batch-seed-001",
            "synthetic_firms_may2026.csv",
            len(seed_data),
            len(seed_data),
            0,
            0,
            "completed",
            json.dumps({"info": "Initial synthetic demonstration dataset seeded successfully."})
        ))
        conn.commit()
    conn.close()
    yield

app = FastAPI(
    title="FireWatch API",
    description="Satellite-Derived Active Fire Intelligence & Triage Engine",
    version="1.0.0",
    lifespan=lifespan
)

cors_env = os.environ.get("CORS_ORIGINS", "*")
if cors_env.strip() == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row)

def recalculate_all_scores_in_db(conn: sqlite3.Connection):
    """Recalculates repeat clusters and explainable priority scores for all observations."""
    cursor = conn.cursor()
    cursor.execute("SELECT w_frp, w_recency, w_confidence, w_persistence, half_life_hours FROM scoring_config WHERE id = 1;")
    cfg_row = cursor.fetchone()
    if cfg_row:
        w_frp, w_recency, w_conf, w_persist, half_life = cfg_row
    else:
        w_frp, w_recency, w_conf, w_persist, half_life = 0.35, 0.25, 0.20, 0.20, 6.0

    cursor.execute("SELECT * FROM observations ORDER BY acq_datetime ASC;")
    rows = cursor.fetchall()
    if not rows:
        return

    records = [row_to_dict(r) for r in rows]
    records = cluster_repeat_detections(records, distance_threshold_km=2.0, time_window_hours=48.0)

    latest_dt = max(
        parse_iso_or_firms_datetime(r["acq_date"], r["acq_time"]) for r in records
    )

    update_payloads = []
    for r in records:
        dt = parse_iso_or_firms_datetime(r["acq_date"], r["acq_time"])
        score, tier, f_pts, r_pts, c_pts, p_pts = calculate_priority_score(
            frp=r["frp"],
            acq_dt=dt,
            conf_score=r["confidence_score"],
            repeat_count=r["repeat_count"],
            reference_now=latest_dt,
            w_frp=w_frp,
            w_recency=w_recency,
            w_confidence=w_conf,
            w_persistence=w_persist,
            half_life_hours=half_life
        )
        update_payloads.append((
            score, tier, f_pts, r_pts, c_pts, p_pts,
            r["is_repeat"], r["repeat_cluster_id"], r["repeat_count"],
            r.get("anomaly_flags", ""), r.get("anomaly_explanation", ""),
            r["id"]
        ))

    cursor.executemany("""
        UPDATE observations SET
            priority_score = ?,
            priority_tier = ?,
            frp_points = ?,
            recency_points = ?,
            conf_points = ?,
            persistence_points = ?,
            is_repeat = ?,
            repeat_cluster_id = ?,
            repeat_count = ?,
            anomaly_flags = ?,
            anomaly_explanation = ?
        WHERE id = ?;
    """, update_payloads)
    conn.commit()

def insert_records_to_db(conn: sqlite3.Connection, records: List[Dict[str, Any]], source_type: str = "synthetic_sample"):
    cursor = conn.cursor()
    query = """
    INSERT OR REPLACE INTO observations (
        obs_id, latitude, longitude, brightness, scan, track,
        acq_date, acq_time, acq_datetime, satellite, instrument,
        confidence, confidence_score, version, bright_t31, frp,
        daynight, region, priority_score, priority_tier,
        frp_points, recency_points, conf_points, persistence_points,
        is_repeat, repeat_cluster_id, repeat_count, source_type,
        anomaly_flags, anomaly_explanation,
        validation_status, review_status, review_notes, reviewed_at
    ) VALUES (
        :obs_id, :latitude, :longitude, :brightness, :scan, :track,
        :acq_date, :acq_time, :acq_datetime, :satellite, :instrument,
        :confidence, :confidence_score, :version, :bright_t31, :frp,
        :daynight, :region, :priority_score, :priority_tier,
        :frp_points, :recency_points, :conf_points, :persistence_points,
        :is_repeat, :repeat_cluster_id, :repeat_count, :source_type,
        :anomaly_flags, :anomaly_explanation,
        :validation_status, :review_status, :review_notes, :reviewed_at
    );
    """
    cleaned_records = []
    for r in records:
        r_copy = dict(r)
        r_copy["source_type"] = source_type
        r_copy.setdefault("validation_status", "valid")
        r_copy.setdefault("review_status", "unreviewed")
        r_copy.setdefault("review_notes", "")
        r_copy.setdefault("reviewed_at", None)
        r_copy.setdefault("priority_score", 0.0)
        r_copy.setdefault("priority_tier", "Tier-4 Routine")
        r_copy.setdefault("frp_points", 0.0)
        r_copy.setdefault("recency_points", 0.0)
        r_copy.setdefault("conf_points", 0.0)
        r_copy.setdefault("persistence_points", 0.0)
        r_copy.setdefault("is_repeat", 0)
        r_copy.setdefault("repeat_cluster_id", None)
        r_copy.setdefault("repeat_count", 1)
        r_copy.setdefault("anomaly_flags", "")
        r_copy.setdefault("anomaly_explanation", "")
        cleaned_records.append(r_copy)

    cursor.executemany(query, cleaned_records)
    conn.commit()
    recalculate_all_scores_in_db(conn)

# ----------------- ENDPOINTS -----------------

@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "FireWatch API",
        "version": "1.2.0-NRT",
        "health": "/api/health"
    }

@app.get("/health")
def get_root_health():
    return get_health()

@app.get("/api/health")
def get_health():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM observations;")
    obs_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM validation_reports;")
    import_count = cursor.fetchone()[0]
    conn.close()
    return {
        "status": "healthy",
        "service": "FireWatch Thermal Intelligence Engine",
        "version": "1.2.0-NRT",
        "observations_loaded": obs_count,
        "import_batches": import_count,
        "firms_configured": is_firms_configured(),
        "database": os.path.basename(DB_PATH)
    }

@app.get("/api/dashboard/overview")
def get_dashboard_overview(
    daynight: Optional[str] = None,
    min_frp: Optional[float] = None,
    satellite: Optional[str] = None,
    region: Optional[str] = None,
    source_type: Optional[str] = None,
    priority_tier: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = ["1=1"]
    params: List[Any] = []

    if daynight:
        conditions.append("daynight = ?")
        params.append(daynight.upper())
    if min_frp is not None:
        conditions.append("frp >= ?")
        params.append(min_frp)
    if satellite:
        conditions.append("satellite = ?")
        params.append(satellite)
    if region:
        conditions.append("region LIKE ?")
        params.append(f"%{region.strip()}%")
    if source_type:
        st_clean = source_type.strip().lower()
        if "synth" in st_clean or "demo" in st_clean:
            conditions.append("(source_type LIKE '%synth%' OR source_type LIKE '%demo%')")
        elif "csv" in st_clean or "upload" in st_clean or "import" in st_clean:
            conditions.append("(source_type LIKE '%csv%' OR source_type LIKE '%upload%' OR source_type LIKE '%import%')")
        elif "live" in st_clean or "firms" in st_clean:
            conditions.append("source_type = 'LIVE_FIRMS'")
        else:
            conditions.append("source_type = ?")
            params.append(source_type)
    if priority_tier:
        conditions.append("priority_tier = ?")
        params.append(priority_tier)

    where_clause = " AND ".join(conditions)

    cursor.execute(f"SELECT COUNT(*) FROM observations WHERE {where_clause};", params)
    total_obs = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM observations WHERE {where_clause} AND validation_status = 'valid';", params)
    valid_obs = cursor.fetchone()[0]

    cursor.execute("SELECT SUM(invalid_rows) FROM validation_reports;")
    rejected_raw = cursor.fetchone()[0] or 0

    cursor.execute(f"SELECT COUNT(*) FROM observations WHERE {where_clause} AND priority_score >= 80.0;", params)
    high_priority = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM observations WHERE {where_clause} AND is_repeat = 1;", params)
    repeat_count = cursor.fetchone()[0]

    cursor.execute(f"SELECT acq_datetime, satellite, instrument FROM observations WHERE {where_clause} ORDER BY acq_datetime DESC LIMIT 1;", params)
    latest_row = cursor.fetchone()
    latest_time = latest_row["acq_datetime"] if latest_row else None
    latest_source = f"{latest_row['satellite']} ({latest_row['instrument']})" if latest_row else "VIIRS / MODIS"

    # FRP stats
    cursor.execute(f"SELECT frp FROM observations WHERE {where_clause} AND frp > 0 ORDER BY frp ASC;", params)
    frp_vals = [r[0] for r in cursor.fetchall()]
    median_frp = 0.0
    max_frp = 0.0
    if frp_vals:
        mid = len(frp_vals) // 2
        median_frp = round((frp_vals[mid] if len(frp_vals) % 2 != 0 else (frp_vals[mid - 1] + frp_vals[mid]) / 2.0), 1)
        max_frp = round(frp_vals[-1], 1)

    # Sensor counts
    cursor.execute(f"SELECT satellite, COUNT(*) as cnt FROM observations WHERE {where_clause} GROUP BY satellite;", params)
    sensor_counts = {r["satellite"] or "Unknown": r["cnt"] for r in cursor.fetchall()}

    # Source provenance counts
    cursor.execute(f"SELECT source_type, COUNT(*) as cnt FROM observations WHERE {where_clause} GROUP BY source_type;", params)
    source_counts = {r["source_type"] or "Unknown": r["cnt"] for r in cursor.fetchall()}

    # Anomaly counts
    cursor.execute(f"""
        SELECT 
            SUM(CASE WHEN LENGTH(anomaly_flags) > 0 THEN 1 ELSE 0 END) as total_anomalies,
            SUM(CASE WHEN anomaly_flags LIKE '%extreme_frp%' THEN 1 ELSE 0 END) as extreme_frp,
            SUM(CASE WHEN anomaly_flags LIKE '%static_heat_source%' THEN 1 ELSE 0 END) as static_heat_source,
            SUM(CASE WHEN anomaly_flags LIKE '%bow_tie_distortion%' THEN 1 ELSE 0 END) as bow_tie_distortion,
            SUM(CASE WHEN anomaly_flags LIKE '%nocturnal_intense%' THEN 1 ELSE 0 END) as nocturnal_intense,
            SUM(CASE WHEN anomaly_flags LIKE '%low_confidence_subpixel%' THEN 1 ELSE 0 END) as low_confidence_subpixel
        FROM observations WHERE {where_clause};
    """, params)
    anom_row = cursor.fetchone()
    anomaly_counts = {
        "total_anomalies": anom_row["total_anomalies"] or 0,
        "extreme_frp": anom_row["extreme_frp"] or 0,
        "static_heat_source": anom_row["static_heat_source"] or 0,
        "bow_tie_distortion": anom_row["bow_tie_distortion"] or 0,
        "nocturnal_intense": anom_row["nocturnal_intense"] or 0,
        "low_confidence_subpixel": anom_row["low_confidence_subpixel"] or 0
    }

    # Priority tier counts
    cursor.execute(f"SELECT priority_tier, COUNT(*) as cnt FROM observations WHERE {where_clause} GROUP BY priority_tier;", params)
    tier_counts = {r["priority_tier"]: r["cnt"] for r in cursor.fetchall()}

    # Confidence counts
    cursor.execute(f"""
        SELECT 
            CASE 
                WHEN confidence_score >= 0.85 THEN 'High'
                WHEN confidence_score >= 0.55 THEN 'Nominal'
                ELSE 'Low'
            END as conf_tier,
            COUNT(*) as cnt
        FROM observations
        WHERE {where_clause}
        GROUP BY conf_tier;
    """, params)
    conf_counts = {r["conf_tier"]: r["cnt"] for r in cursor.fetchall()}

    # Top Incident Corridors
    cursor.execute(f"""
        SELECT region, COUNT(*) as cluster_points, ROUND(AVG(frp), 1) as avg_frp, MAX(frp) as max_frp
        FROM observations
        WHERE {where_clause}
        GROUP BY region
        ORDER BY cluster_points DESC
        LIMIT 6;
    """, params)
    corridors = [row_to_dict(r) for r in cursor.fetchall()]

    # Diurnal Curve (Counts by UTC hour 00 to 23)
    cursor.execute(f"""
        SELECT SUBSTR(acq_time, 1, 2) as hr, COUNT(*) as cnt, ROUND(AVG(frp), 1) as avg_frp
        FROM observations
        WHERE {where_clause} AND LENGTH(acq_time) >= 2
        GROUP BY hr
        ORDER BY hr ASC;
    """, params)
    diurnal_map = {int(r["hr"]): {"count": r["cnt"], "avg_frp": r["avg_frp"]} for r in cursor.fetchall()}
    diurnal_curve = []
    for h in range(24):
        item = diurnal_map.get(h, {"count": 0, "avg_frp": 0.0})
        diurnal_curve.append({
            "hour": f"{h:02d}z",
            "count": item["count"],
            "avg_frp": item["avg_frp"]
        })

    # FRP Distribution Bins
    cursor.execute(f"""
        SELECT 
            SUM(CASE WHEN frp < 10 THEN 1 ELSE 0 END) as bin_low,
            SUM(CASE WHEN frp >= 10 AND frp < 50 THEN 1 ELSE 0 END) as bin_mod,
            SUM(CASE WHEN frp >= 50 AND frp < 100 THEN 1 ELSE 0 END) as bin_high,
            SUM(CASE WHEN frp >= 100 THEN 1 ELSE 0 END) as bin_extreme
        FROM observations
        WHERE {where_clause};
    """, params)
    bin_row = cursor.fetchone()
    b_low = bin_row["bin_low"] or 0
    b_mod = bin_row["bin_mod"] or 0
    b_high = bin_row["bin_high"] or 0
    b_ext = bin_row["bin_extreme"] or 0
    total_b = max(1, b_low + b_mod + b_high + b_ext)

    frp_distribution = [
        {"label": "< 10 MW (Low Intensity)", "count": b_low, "percent": round(100.0 * b_low / total_b, 1), "color": "#68B5E8"},
        {"label": "10 - 50 MW (Moderate Front)", "count": b_mod, "percent": round(100.0 * b_mod / total_b, 1), "color": "#FFB547"},
        {"label": "50 - 100 MW (Intense Canopy)", "count": b_high, "percent": round(100.0 * b_high / total_b, 1), "color": "#FF8442"},
        {"label": "> 100 MW (Extreme Anomaly)", "count": b_ext, "percent": round(100.0 * b_ext / total_b, 1), "color": "#F04438"}
    ]

    active_filters_count = len(params)
    conn.close()

    return {
        "total_observations": total_obs,
        "valid_observations": valid_obs,
        "rejected_raw_count": rejected_raw,
        "high_priority_count": high_priority,
        "repeat_detections_count": repeat_count,
        "latest_ingestion_time": latest_time,
        "latest_satellite_source": latest_source,
        "median_frp": median_frp,
        "max_frp": max_frp,
        "sensor_counts": sensor_counts,
        "source_counts": source_counts,
        "anomaly_counts": anomaly_counts,
        "priority_tier_counts": tier_counts,
        "confidence_counts": conf_counts,
        "top_incident_corridors": corridors,
        "diurnal_curve": diurnal_curve,
        "frp_distribution": frp_distribution,
        "active_filters_count": active_filters_count
    }

@app.get("/api/observations")
def get_observations(
    query: Optional[str] = None,
    min_frp: Optional[float] = None,
    max_frp: Optional[float] = None,
    min_confidence: Optional[float] = None,
    priority_tier: Optional[str] = None,
    min_priority: Optional[float] = None,
    repeat_only: Optional[bool] = None,
    satellite: Optional[str] = None,
    instrument: Optional[str] = None,
    daynight: Optional[str] = None,
    region: Optional[str] = None,
    source_type: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    review_status: Optional[str] = None,
    limit: int = Query(200, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("priority_score", pattern="^(priority_score|acq_datetime|frp|confidence_score|brightness|repeat_count)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$")
):
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = ["1=1"]
    params: List[Any] = []

    if query:
        conditions.append("(obs_id LIKE ? OR region LIKE ? OR satellite LIKE ? OR instrument LIKE ?)")
        search_pattern = f"%{query.strip()}%"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    if min_frp is not None:
        conditions.append("frp >= ?")
        params.append(min_frp)

    if max_frp is not None:
        conditions.append("frp <= ?")
        params.append(max_frp)

    if min_confidence is not None:
        conditions.append("confidence_score >= ?")
        params.append(min_confidence)

    if priority_tier:
        conditions.append("priority_tier = ?")
        params.append(priority_tier)

    if min_priority is not None:
        conditions.append("priority_score >= ?")
        params.append(min_priority)

    if repeat_only:
        conditions.append("is_repeat = 1")

    if satellite:
        conditions.append("satellite = ?")
        params.append(satellite)

    if instrument:
        conditions.append("instrument = ?")
        params.append(instrument)

    if daynight:
        conditions.append("daynight = ?")
        params.append(daynight.upper())

    if region:
        conditions.append("region LIKE ?")
        params.append(f"%{region.strip()}%")

    if source_type:
        st_clean = source_type.strip().lower()
        if "synth" in st_clean or "demo" in st_clean:
            conditions.append("(source_type LIKE '%synth%' OR source_type LIKE '%demo%')")
        elif "csv" in st_clean or "upload" in st_clean or "import" in st_clean:
            conditions.append("(source_type LIKE '%csv%' OR source_type LIKE '%upload%' OR source_type LIKE '%import%')")
        elif "live" in st_clean or "firms" in st_clean:
            conditions.append("source_type = 'LIVE_FIRMS'")
        else:
            conditions.append("source_type = ?")
            params.append(source_type)

    if anomaly_type:
        if anomaly_type == "any":
            conditions.append("LENGTH(anomaly_flags) > 0")
        else:
            conditions.append("anomaly_flags LIKE ?")
            params.append(f"%{anomaly_type}%")

    if start_date:
        conditions.append("acq_date >= ?")
        params.append(start_date)

    if end_date:
        conditions.append("acq_date <= ?")
        params.append(end_date)

    if review_status:
        conditions.append("review_status = ?")
        params.append(review_status)

    where_clause = " AND ".join(conditions)

    # Count matching
    cursor.execute(f"SELECT COUNT(*) FROM observations WHERE {where_clause};", params)
    total_matching = cursor.fetchone()[0]

    # Query items
    safe_sort_by = sort_by if isinstance(sort_by, str) else "priority_score"
    safe_sort_order = sort_order.upper() if isinstance(sort_order, str) else "DESC"
    order_clause = f"ORDER BY {safe_sort_by} {safe_sort_order}"
    cursor.execute(f"""
        SELECT * FROM observations 
        WHERE {where_clause} 
        {order_clause} 
        LIMIT ? OFFSET ?;
    """, params + [limit, offset])

    items = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total": total_matching,
        "limit": limit,
        "offset": offset,
        "items": items
    }

@app.get("/api/observations/{obs_id}")
def get_observation_detail(obs_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM observations WHERE obs_id = ?;", (obs_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Observation '{obs_id}' not found.")

    obs = row_to_dict(row)

    # Fetch cluster members if part of repeat cluster
    cluster_members = []
    if obs["repeat_cluster_id"]:
        cursor.execute("""
            SELECT * FROM observations 
            WHERE repeat_cluster_id = ? AND obs_id != ?
            ORDER BY acq_datetime DESC LIMIT 10;
        """, (obs["repeat_cluster_id"], obs["obs_id"]))
        cluster_members = [row_to_dict(r) for r in cursor.fetchall()]

    conn.close()

    contributing_factors = {
        "frp": {
            "value": obs["frp"],
            "unit": "MW",
            "points": obs["frp_points"],
            "description": f"Fire Radiative Power: {obs['frp']} MW instantaneous radiant intensity."
        },
        "recency": {
            "value": obs["acq_datetime"],
            "points": obs["recency_points"],
            "description": f"Overpass timestamp {obs['acq_time']} UTC on {obs['acq_date']}."
        },
        "confidence": {
            "value": obs["confidence"],
            "score": obs["confidence_score"],
            "points": obs["conf_points"],
            "description": f"Sensor algorithmic confidence: {obs['confidence']} ({int(obs['confidence_score'] * 100)}%)."
        },
        "persistence": {
            "repeat_count": obs["repeat_count"],
            "cluster_id": obs["repeat_cluster_id"],
            "points": obs["persistence_points"],
            "description": f"{obs['repeat_count']} consecutive orbital detections within 2.0 km."
        }
    }

    provenance = {
        "source_type": obs["source_type"],
        "satellite": obs["satellite"],
        "instrument": obs["instrument"],
        "version": obs["version"],
        "pixel_footprint": "375m × 375m nadir" if "VIIRS" in (obs["instrument"] or "") else "1000m × 1000m nadir",
        "ingested_at": obs["created_at"],
        "attribution": "NASA ESDIS / LANCE FIRMS Open Data Protocol"
    }

    integrity_notices = [
        {
            "type": "non_tactical",
            "title": "Non-Tactical Decision Support",
            "message": "Heuristic triage score indicates priority for analyst review. It is NOT an emergency dispatch confirmation or verified fire perimeter."
        },
        {
            "type": "sub_pixel",
            "title": "Sub-pixel Flaming Centroid",
            "message": f"Coordinates ({obs['latitude']}, {obs['longitude']}) represent the geometric pixel center, not the active flame front edge."
        },
        {
            "type": "potential_confounder",
            "title": "Industrial Confounder Check",
            "message": "Thermal radiance may result from oil gas flaring, aggregate mining, or agricultural controlled burns."
        }
    ]

    if obs.get("anomaly_flags"):
        integrity_notices.insert(0, {
            "type": "flagged_anomaly",
            "title": f"Algorithmic Anomaly Flag ({obs['anomaly_flags'].replace('_', ' ').upper()})",
            "message": obs.get("anomaly_explanation") or "Heuristic algorithm flagged atypical sensor signature requiring analyst triage."
        })

    return {
        "observation": obs,
        "contributing_factors": contributing_factors,
        "repeat_cluster_members": cluster_members,
        "provenance": provenance,
        "scientific_integrity_notices": integrity_notices
    }

@app.post("/api/observations/{obs_id}/review")
def update_observation_review(obs_id: str, update: ObservationReviewUpdate):
    valid_statuses = [
        "unreviewed", "needs_review", "verified_fire",
        "flagged_false_positive", "reviewed_anomaly", "reviewed_insufficient"
    ]
    if update.review_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review_status. Must be one of: {', '.join(valid_statuses)}"
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM observations WHERE obs_id = ?;", (obs_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Observation '{obs_id}' not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    if update.clear_anomaly:
        cursor.execute("""
            UPDATE observations SET
                review_status = ?,
                review_notes = ?,
                anomaly_flags = '',
                anomaly_explanation = 'Analyst reviewed and dismissed algorithmic anomaly flag.',
                reviewed_at = ?
            WHERE obs_id = ?;
        """, (update.review_status, update.review_notes, now_iso, obs_id))
    else:
        cursor.execute("""
            UPDATE observations SET
                review_status = ?,
                review_notes = ?,
                reviewed_at = ?
            WHERE obs_id = ?;
        """, (update.review_status, update.review_notes, now_iso, obs_id))

    cursor.execute("""
        INSERT INTO audit_logs (action, obs_id, details)
        VALUES (?, ?, ?);
    """, (
        "update_review",
        obs_id,
        f"Status: {update.review_status} | ClearedAnomaly: {update.clear_anomaly} | Notes: {update.review_notes[:100]}"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "obs_id": obs_id,
        "review_status": update.review_status,
        "review_notes": update.review_notes,
        "anomaly_flags": "" if update.clear_anomaly else None,
        "reviewed_at": now_iso
    }

@app.get("/api/scoring/weights")
def get_scoring_weights():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT w_frp, w_recency, w_confidence, w_persistence, half_life_hours FROM scoring_config WHERE id = 1;")
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            "w_frp": row[0],
            "w_recency": row[1],
            "w_confidence": row[2],
            "w_persistence": row[3],
            "half_life_hours": row[4]
        }
    return {
        "w_frp": 0.35,
        "w_recency": 0.25,
        "w_confidence": 0.20,
        "w_persistence": 0.20,
        "half_life_hours": 6.0
    }

@app.put("/api/scoring/weights")
def update_scoring_weights(weights: ScoringWeights):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE scoring_config SET
            w_frp = ?,
            w_recency = ?,
            w_confidence = ?,
            w_persistence = ?,
            half_life_hours = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1;
    """, (weights.w_frp, weights.w_recency, weights.w_confidence, weights.w_persistence, weights.half_life_hours))
    conn.commit()
    recalculate_all_scores_in_db(conn)
    conn.close()
    return {
        "success": True,
        "message": "Scoring weights updated and all observation priorities recalculated across the database.",
        "weights": weights.model_dump()
    }

@app.post("/api/scoring/simulate")
def simulate_scoring(payload: Dict[str, Any]):
    """
    Interactive 'What-If' Priority Simulator:
    Computes priority without persisting changes to the database.
    """
    frp = float(payload.get("frp", 85.0))
    age_hours = float(payload.get("age_hours", 1.5))
    confidence = payload.get("confidence", "high")
    repeat_count = int(payload.get("repeat_count", 3))

    w_frp = float(payload.get("w_frp", 0.35))
    w_rec = float(payload.get("w_recency", 0.25))
    w_conf = float(payload.get("w_confidence", 0.20))
    w_persist = float(payload.get("w_persistence", 0.20))
    half_life = float(payload.get("half_life_hours", 6.0))

    ref_now = datetime.now(timezone.utc)
    acq_dt = ref_now - (datetime.now(timezone.utc) - datetime.now(timezone.utc))
    from datetime import timedelta
    acq_dt = ref_now - timedelta(hours=age_hours)

    conf_score = normalize_confidence(confidence)
    score, tier, f_pts, r_pts, c_pts, p_pts = calculate_priority_score(
        frp=frp,
        acq_dt=acq_dt,
        conf_score=conf_score,
        repeat_count=repeat_count,
        reference_now=ref_now,
        w_frp=w_frp,
        w_recency=w_rec,
        w_confidence=w_conf,
        w_persistence=w_persist,
        half_life_hours=half_life
    )

    return {
        "simulated_score": score,
        "simulated_tier": tier,
        "frp_contribution": f_pts,
        "recency_contribution": r_pts,
        "confidence_contribution": c_pts,
        "persistence_contribution": p_pts,
        "total_points": score
    }

@app.post("/api/import/preview")
async def preview_csv_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(exc)}")

    preview_res = preview_csv_content(content, filename=file.filename, max_preview_rows=6)
    return preview_res

@app.post("/api/import/csv")
async def upload_csv_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported.")

    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file: {str(exc)}")

    valid_records, invalid_rows, summary = validate_and_parse_csv(
        file_content=content,
        filename=file.filename,
        source_type="csv_upload"
    )

    conn = get_db_connection()
    cursor = conn.cursor()

    if valid_records:
        insert_records_to_db(conn, valid_records, source_type="csv_upload")

    # Store validation report
    cursor.execute("""
        INSERT INTO validation_reports (
            batch_id, filename, total_rows, valid_rows, invalid_rows, duplicate_rows, status, details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        summary["batch_id"],
        summary["filename"],
        summary["total_rows"],
        summary["valid_rows"],
        summary["invalid_rows"],
        summary["duplicate_rows"],
        summary["status"],
        json.dumps({"invalid_rows": invalid_rows[:100]})
    ))
    conn.commit()
    conn.close()

    return {
        "summary": summary,
        "errors": invalid_rows[:100],
        "sample_records": valid_records[:5]
    }

@app.get("/api/import/history")
def get_import_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT batch_id, filename, imported_at, total_rows, valid_rows, invalid_rows, duplicate_rows, status, details_json
        FROM validation_reports
        ORDER BY id DESC LIMIT 20;
    """)
    rows = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/sample/download")
def download_sample_csv():
    """Generates a downloadable standard sample CSV with expected columns."""
    sample_records = generate_synthetic_firms_dataset()[:25]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPECTED_COLUMNS)
    writer.writeheader()
    for r in sample_records:
        writer.writerow({
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "brightness": r.get("brightness", 320.0),
            "scan": r.get("scan", 0.38),
            "track": r.get("track", 0.36),
            "acq_date": r["acq_date"],
            "acq_time": r["acq_time"],
            "satellite": r.get("satellite", "Suomi-NPP"),
            "instrument": r.get("instrument", "VIIRS"),
            "confidence": r.get("confidence", "high"),
            "version": r.get("version", "2.0NRT"),
            "bright_t31": r.get("bright_t31", 295.0),
            "frp": r.get("frp", 45.0),
            "daynight": r.get("daynight", "D")
        })
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=firewatch_sample_observations.csv"}
    )

@app.post("/api/sample/reset")
def reset_to_synthetic_dataset():
    """Resets observations table and reloads the full synthetic demonstration dataset."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM observations;")
    cursor.execute("DELETE FROM validation_reports WHERE batch_id != 'batch-seed-001';")
    conn.commit()

    seed_data = generate_synthetic_firms_dataset()
    insert_records_to_db(conn, seed_data, source_type="synthetic_sample")

    cursor.execute("""
        INSERT INTO validation_reports (batch_id, filename, total_rows, valid_rows, invalid_rows, duplicate_rows, status, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        f"batch-reset-{int(datetime.now().timestamp())}",
        "synthetic_firms_may2026.csv",
        len(seed_data),
        len(seed_data),
        0,
        0,
        "completed",
        json.dumps({"info": "Reloaded 1,248 synthetic observations matching Stitch designs."})
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "Observation catalog successfully reloaded with 1,248 synthetic demonstration observations.",
        "count": len(seed_data)
    }

@app.get("/api/firms/status")
def get_firms_status():
    configured = is_firms_configured()
    masked = get_masked_firms_key()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM observations WHERE source_type = 'LIVE_FIRMS';")
    live_count = cursor.fetchone()[0]
    conn.close()

    return {
        "configured": configured,
        "key_env_var": "FIRMS_MAP_KEY",
        "masked_key": masked,
        "live_records_count": live_count,
        "message": (
            f"NASA FIRMS MAP_KEY is configured ({masked}). Live satellite ingestion active."
            if configured else
            "NASA FIRMS MAP_KEY is not configured. Running in high-fidelity synthetic demo mode. To connect live satellite feeds, get a free key from https://firms.modaps.eosdis.nasa.gov/api/map_key and set FIRMS_MAP_KEY in your local .env file."
        )
    }

@app.get("/api/firms/verify-key")
def verify_firms_key_endpoint():
    """Validates the configured key directly against NASA's API without downloading large swaths."""
    return verify_firms_connection()

@app.post("/api/firms/sync")
def sync_firms_data(
    source: str = Query("VIIRS_NOAA20_NRT"),
    area_bbox: str = Query("-125,30,-100,50"),
    day_range: int = Query(1, ge=1, le=5)
):
    if not is_firms_configured():
        raise HTTPException(
            status_code=400,
            detail="NASA FIRMS MAP_KEY is not configured in environment variables or .env file. Real satellite feeds require an active key. Application remains safely in demonstration mode."
        )

    success, message, valid_records, summary = fetch_firms_nrt_data(
        source=source,
        area_bbox=area_bbox,
        day_range=day_range
    )

    if not success:
        raise HTTPException(status_code=502, detail=message)

    if valid_records:
        conn = get_db_connection()
        insert_records_to_db(conn, valid_records, source_type="LIVE_FIRMS")
        conn.close()

    return {
        "success": True,
        "message": message,
        "new_observations_count": len(valid_records),
        "summary": summary
    }

@app.get("/api/export/csv")
def export_filtered_csv(
    query: Optional[str] = None,
    min_frp: Optional[float] = None,
    priority_tier: Optional[str] = None,
    repeat_only: Optional[bool] = None,
    region: Optional[str] = None,
    source_type: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    limit: int = 5000
):
    """Exports current filtered observations to a downloadable CSV file."""
    res = get_observations(
        query=query,
        min_frp=min_frp,
        priority_tier=priority_tier,
        repeat_only=repeat_only,
        region=region,
        source_type=source_type,
        anomaly_type=anomaly_type,
        limit=limit,
        offset=0
    )
    items = res["items"]

    output = io.StringIO()
    headers = [
        "obs_id", "latitude", "longitude", "acq_date", "acq_time",
        "satellite", "instrument", "confidence", "confidence_score",
        "frp", "priority_score", "priority_tier", "is_repeat",
        "repeat_cluster_id", "repeat_count", "region", "review_status",
        "source_type", "anomaly_flags", "anomaly_explanation"
    ]
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for it in items:
        writer.writerow({h: it.get(h, "") for h in headers})

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=firewatch_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@app.get("/api/export/geojson")
def export_geojson():
    """Exports all valid observations as a GeoJSON FeatureCollection."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM observations WHERE validation_status = 'valid' ORDER BY priority_score DESC LIMIT 1500;")
    rows = cursor.fetchall()
    conn.close()

    features = []
    for r in rows:
        d = row_to_dict(r)
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [d["longitude"], d["latitude"]]
            },
            "properties": {
                "obs_id": d["obs_id"],
                "frp": d["frp"],
                "priority_score": d["priority_score"],
                "priority_tier": d["priority_tier"],
                "confidence": d["confidence"],
                "satellite": d["satellite"],
                "instrument": d["instrument"],
                "acq_datetime": d["acq_datetime"],
                "is_repeat": bool(d["is_repeat"]),
                "review_status": d["review_status"]
            }
        })

    return {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "features": features
    }

@app.get("/api/export/summary-report")
def export_summary_report():
    """Generates an executive analytical intelligence report in markdown format."""
    overview = get_dashboard_overview()
    report_md = f"""# FireWatch Satellite Thermal Intelligence Executive Summary
**Report Generated (UTC):** {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")}  
**System Build:** FireWatch v1.2.0-NRT | NASA LANCE/FIRMS Analytics Pipeline  
**Scientific Classification:** Academic Heuristic Decision Support System (Non-Tactical)

---

### Executive Overview
- **Cumulative Active Detections:** {overview['total_observations']}
- **Valid Radiometric Records:** {overview['valid_observations']} ({round(100.0 * overview['valid_observations'] / max(1, overview['total_observations']), 1)}%)
- **Quarantined / Rejected Raw Rows:** {overview['rejected_raw_count']}
- **Priority Tier-1 Review Queue:** {overview['high_priority_count']} critical observations
- **Repeat / Multi-Pass Clusters:** {overview['repeat_detections_count']} persistent anomalies
- **Median Fire Radiative Power:** {overview['median_frp']} MW
- **Peak FRP Anomaly:** {overview['max_frp']} MW

---

### Radiative Energy Profile (FRP)
"""
    for b in overview["frp_distribution"]:
        report_md += f"- **{b['label']}:** {b['count']} observations ({b['percent']}%)\n"

    report_md += """
---

### Regional Incident Corridors
"""
    for c in overview["top_incident_corridors"]:
        report_md += f"- **{c['region']}:** {c['cluster_points']} cluster points | Avg FRP: {c['avg_frp']} MW | Max FRP: {c['max_frp']} MW\n"

    report_md += """
---

### Methodological & Scientific Limitations
1. **Cloud & Aerosol Attenuation:** Heavy cumulus or thick pyrocumulonimbus plumes attenuate 3.9–4.0µm radiance, inducing potential False Negatives.
2. **Pixel Centroid Footprint:** Lat/Lon coordinates reflect the geometric pixel center (375m for VIIRS, 1000m for MODIS), not the perimeter of active flaming fronts.
3. **Temporal Orbital Gaps:** Sun-synchronous polar passes occur 2-4 times per 24h. Intermittent ignitions may escape nadir scans until the subsequent overpass.
4. **Industrial Confounders:** Persistent thermal anomalies (petrochemical flaring, smelters) are heuristically downweighted but require manual analyst confirmation.
"""
    return PlainTextResponse(report_md, media_type="text/markdown")
