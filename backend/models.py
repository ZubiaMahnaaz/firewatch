from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ScoringWeights(BaseModel):
    w_frp: float = Field(0.35, ge=0.0, le=1.0, description="Weight for Fire Radiative Power")
    w_recency: float = Field(0.25, ge=0.0, le=1.0, description="Weight for temporal recency decay")
    w_confidence: float = Field(0.20, ge=0.0, le=1.0, description="Weight for source confidence")
    w_persistence: float = Field(0.20, ge=0.0, le=1.0, description="Weight for repeat-pass persistence")
    half_life_hours: float = Field(6.0, gt=0.0, le=72.0, description="Recency exponential half-life in hours")

class ObservationReviewUpdate(BaseModel):
    review_status: str = Field(..., description="unreviewed, needs_review, verified_fire, flagged_false_positive, reviewed_anomaly, reviewed_insufficient")
    review_notes: str = Field("", description="Analyst review notes and rationale")
    clear_anomaly: Optional[bool] = Field(False, description="Whether to clear or dismiss flagged anomaly status")

class ObservationFilterParams(BaseModel):
    query: Optional[str] = None
    min_frp: Optional[float] = None
    max_frp: Optional[float] = None
    min_confidence: Optional[float] = None
    priority_tier: Optional[str] = None
    min_priority: Optional[float] = None
    repeat_only: Optional[bool] = None
    satellite: Optional[str] = None
    instrument: Optional[str] = None
    daynight: Optional[str] = None
    region: Optional[str] = None
    source_type: Optional[str] = None
    anomaly_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    review_status: Optional[str] = None
    limit: int = Field(200, ge=1, le=5000)
    offset: int = Field(0, ge=0)
    sort_by: str = Field("priority_score", description="priority_score, acq_datetime, frp, confidence_score")
    sort_order: str = Field("desc", description="asc, desc")

class ObservationItem(BaseModel):
    id: int
    obs_id: str
    latitude: float
    longitude: float
    brightness: Optional[float] = None
    scan: Optional[float] = None
    track: Optional[float] = None
    acq_date: str
    acq_time: str
    acq_datetime: str
    satellite: Optional[str] = None
    instrument: Optional[str] = None
    confidence: Optional[str] = None
    confidence_score: float
    version: Optional[str] = None
    bright_t31: Optional[float] = None
    frp: float
    daynight: str
    region: str
    priority_score: float
    priority_tier: str
    frp_points: float
    recency_points: float
    conf_points: float
    persistence_points: float
    is_repeat: int
    repeat_cluster_id: Optional[str] = None
    repeat_count: int
    source_type: str
    anomaly_flags: str = ""
    anomaly_explanation: str = ""
    validation_status: str
    review_status: str
    review_notes: str
    reviewed_at: Optional[str] = None
    created_at: str

class ObservationDetailResponse(BaseModel):
    observation: ObservationItem
    contributing_factors: Dict[str, Any]
    repeat_cluster_members: List[ObservationItem]
    provenance: Dict[str, Any]
    scientific_integrity_notices: List[Dict[str, str]]

class DashboardOverviewResponse(BaseModel):
    total_observations: int
    valid_observations: int
    rejected_raw_count: int
    high_priority_count: int
    repeat_detections_count: int
    latest_ingestion_time: Optional[str] = None
    latest_satellite_source: str
    median_frp: float
    max_frp: float
    sensor_counts: Dict[str, int]
    priority_tier_counts: Dict[str, int]
    confidence_counts: Dict[str, int]
    top_incident_corridors: List[Dict[str, Any]]
    diurnal_curve: List[Dict[str, Any]]
    frp_distribution: List[Dict[str, Any]]
    active_filters_count: int

class ValidationRowError(BaseModel):
    row_number: int
    field: str
    error: str
    value: Any

class ValidationReportSummary(BaseModel):
    batch_id: str
    filename: str
    imported_at: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    status: str
    errors: List[ValidationRowError]
    sample_records: List[Dict[str, Any]]
