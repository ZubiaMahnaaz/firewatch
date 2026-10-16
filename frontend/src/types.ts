export interface Observation {
  id: number;
  obs_id: string;
  latitude: number;
  longitude: number;
  brightness?: number;
  scan?: number;
  track?: number;
  acq_date: string;
  acq_time: string;
  acq_datetime: string;
  satellite: string;
  instrument: string;
  confidence: string;
  confidence_score: number;
  version: string;
  bright_t31?: number;
  frp: number;
  daynight: string;
  region: string;
  priority_score: number;
  priority_tier: string;
  frp_points: number;
  recency_points: number;
  conf_points: number;
  persistence_points: number;
  is_repeat: number;
  repeat_cluster_id?: string;
  repeat_count: number;
  source_type: string;
  anomaly_flags?: string;
  anomaly_explanation?: string;
  validation_status: string;
  review_status: string;
  review_notes: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ContributingFactor {
  value?: any;
  score?: number;
  unit?: string;
  points: number;
  description: string;
  repeat_count?: number;
  cluster_id?: string;
}

export interface ObservationDetail {
  observation: Observation;
  contributing_factors: {
    frp: ContributingFactor;
    recency: ContributingFactor;
    confidence: ContributingFactor;
    persistence: ContributingFactor;
  };
  repeat_cluster_members: Observation[];
  provenance: {
    source_type: string;
    satellite: string;
    instrument: string;
    version: string;
    pixel_footprint: string;
    ingested_at: string;
    attribution: string;
  };
  scientific_integrity_notices: Array<{
    type: string;
    title: string;
    message: string;
  }>;
}

export interface CorridorStats {
  region: string;
  cluster_points: number;
  avg_frp: number;
  max_frp: number;
}

export interface DiurnalPoint {
  hour: string;
  count: number;
  avg_frp: number;
}

export interface FrpBin {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface DashboardOverview {
  total_observations: number;
  valid_observations: number;
  rejected_raw_count: number;
  high_priority_count: number;
  repeat_detections_count: number;
  latest_ingestion_time: string | null;
  latest_satellite_source: string;
  median_frp: number;
  max_frp: number;
  sensor_counts: Record<string, number>;
  source_counts?: Record<string, number>;
  anomaly_counts?: Record<string, number>;
  priority_tier_counts: Record<string, number>;
  confidence_counts: Record<string, number>;
  top_incident_corridors: CorridorStats[];
  diurnal_curve: DiurnalPoint[];
  frp_distribution: FrpBin[];
  active_filters_count: number;
}

export interface ScoringWeights {
  w_frp: number;
  w_recency: number;
  w_confidence: number;
  w_persistence: number;
  half_life_hours: number;
}

export interface ValidationRowError {
  row_number: number;
  field: string;
  error: string;
  value: any;
}

export interface ValidationReport {
  batch_id: string;
  filename: string;
  imported_at: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: string;
  details_json?: string;
}

export interface CsvPreviewResult {
  filename: string;
  total_rows_estimate: number;
  headers: string[];
  required_columns_found: string[];
  missing_required_columns: string[];
  optional_columns_found: string[];
  is_valid_header: boolean;
  preview_rows: Record<string, any>[];
  preview_errors: Array<{ row_number: number; field: string; error: string }>;
}
