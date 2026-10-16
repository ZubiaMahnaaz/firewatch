import type {
  Observation,
  ObservationDetail,
  DashboardOverview,
  ScoringWeights,
  ValidationReport,
  ValidationRowError,
  CsvPreviewResult
} from './types';

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
export const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/$/, '')}/api` : '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDashboardOverview(params: {
  daynight?: string;
  min_frp?: number;
  satellite?: string;
  region?: string;
  source_type?: string;
  priority_tier?: string;
} = {}): Promise<DashboardOverview> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  const url = queryString ? `${API_BASE}/dashboard/overview?${queryString}` : `${API_BASE}/dashboard/overview`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dashboard overview');
  return res.json();
}

export async function fetchObservations(params: {
  query?: string;
  min_frp?: number;
  max_frp?: number;
  min_confidence?: number;
  priority_tier?: string;
  repeat_only?: boolean;
  satellite?: string;
  instrument?: string;
  daynight?: string;
  region?: string;
  source_type?: string;
  anomaly_type?: string;
  start_date?: string;
  end_date?: string;
  review_status?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<{ total: number; limit: number; offset: number; items: Observation[] }> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const res = await fetch(`${API_BASE}/observations?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch observations');
  return res.json();
}

export async function fetchObservationDetail(obsId: string): Promise<ObservationDetail> {
  const res = await fetch(`${API_BASE}/observations/${encodeURIComponent(obsId)}`);
  if (!res.ok) throw new Error(`Failed to fetch observation ${obsId}`);
  return res.json();
}

export async function updateObservationReview(
  obsId: string,
  review_status: string,
  review_notes: string,
  clear_anomaly: boolean = false
): Promise<{ success: boolean; obs_id: string; review_status: string; review_notes: string }> {
  const res = await fetch(`${API_BASE}/observations/${encodeURIComponent(obsId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_status, review_notes, clear_anomaly })
  });
  if (!res.ok) throw new Error('Failed to update observation review');
  return res.json();
}

export async function fetchScoringWeights(): Promise<ScoringWeights> {
  const res = await fetch(`${API_BASE}/scoring/weights`);
  if (!res.ok) throw new Error('Failed to fetch scoring weights');
  return res.json();
}

export async function updateScoringWeights(weights: ScoringWeights): Promise<{ success: boolean; weights: ScoringWeights }> {
  const res = await fetch(`${API_BASE}/scoring/weights`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights)
  });
  if (!res.ok) throw new Error('Failed to update scoring weights');
  return res.json();
}

export async function simulateScoring(payload: {
  frp: number;
  age_hours: number;
  confidence: string;
  repeat_count: number;
  w_frp?: number;
  w_recency?: number;
  w_confidence?: number;
  w_persistence?: number;
  half_life_hours?: number;
}) {
  const res = await fetch(`${API_BASE}/scoring/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Simulation failed');
  return res.json();
}

export async function previewCsvFile(file: File): Promise<CsvPreviewResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/import/preview`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'CSV preview failed' }));
    throw new Error(err.detail || 'CSV preview failed');
  }
  return res.json();
}

export async function uploadCsvFile(file: File): Promise<{
  summary: {
    batch_id: string;
    filename: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    duplicate_rows: number;
    status: string;
  };
  errors: ValidationRowError[];
  sample_records: Observation[];
}> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/import/csv`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function fetchImportHistory(): Promise<ValidationReport[]> {
  const res = await fetch(`${API_BASE}/import/history`);
  if (!res.ok) throw new Error('Failed to fetch import history');
  return res.json();
}

export async function resetSyntheticDataset(): Promise<{ success: boolean; message: string; count: number }> {
  const res = await fetch(`${API_BASE}/sample/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset dataset');
  return res.json();
}

export async function fetchFirmsStatus(): Promise<{
  configured: boolean;
  key_env_var: string;
  masked_key?: string | null;
  live_records_count?: number;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/firms/status`);
  if (!res.ok) throw new Error('Failed to check FIRMS status');
  return res.json();
}

export async function verifyFirmsKey(): Promise<{
  success: boolean;
  status: string;
  message: string;
  http_code?: number | null;
}> {
  const res = await fetch(`${API_BASE}/firms/verify-key`);
  if (!res.ok) throw new Error('Failed to run FIRMS verification');
  return res.json();
}

export async function syncFirmsData(params: { source?: string; area_bbox?: string; day_range?: number }) {
  const searchParams = new URLSearchParams();
  if (params.source) searchParams.append('source', params.source);
  if (params.area_bbox) searchParams.append('area_bbox', params.area_bbox);
  if (params.day_range) searchParams.append('day_range', String(params.day_range));

  const res = await fetch(`${API_BASE}/firms/sync?${searchParams.toString()}`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'FIRMS sync failed' }));
    throw new Error(err.detail || 'FIRMS sync failed');
  }
  return res.json();
}
