import React, { useState, useEffect } from 'react';
import type { Observation } from '../types';
import { updateObservationReview } from '../api';
import { X, AlertTriangle } from 'lucide-react';

interface ObservationModalProps {
  observation: Observation | null;
  onClose: () => void;
  onReviewUpdated: () => void;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
  observation,
  onClose,
  onReviewUpdated
}) => {
  const [reviewStatus, setReviewStatus] = useState(observation?.review_status || 'unreviewed');
  const [reviewNotes, setReviewNotes] = useState(observation?.review_notes || '');
  const [dismissAnomaly, setDismissAnomaly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (observation) {
      setReviewStatus(observation.review_status);
      setReviewNotes(observation.review_notes || '');
      setDismissAnomaly(false);
    }
  }, [observation]);

  if (!observation) return null;

  const handleSaveReview = async () => {
    setIsSaving(true);
    try {
      await updateObservationReview(observation.obs_id, reviewStatus, reviewNotes, dismissAnomaly);
      setSaveMessage('Review assessment saved to database.');
      setTimeout(() => setSaveMessage(null), 2500);
      onReviewUpdated();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isCrit = observation.priority_score >= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1C2227] border border-[#323B43] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#252C32] px-4 py-3 border-b border-[#323B43] flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#FFB547]">analytics</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-[15px] font-bold text-[#F4F1E9]">
                  {observation.obs_id}
                </h2>
                {observation.source_type === 'LIVE_FIRMS' ? (
                  <span className="px-2 py-0.5 rounded bg-[#102A1E] text-[#55B887] border border-[#55B887]/40 text-[9px] font-bold tracking-wider">
                    LIVE FIRMS
                  </span>
                ) : observation.source_type === 'CSV_IMPORT' ? (
                  <span className="px-2 py-0.5 rounded bg-[#1A2E3D] text-[#68B5E8] border border-[#68B5E8]/40 text-[9px] font-bold tracking-wider">
                    CSV IMPORT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-[#2D2114] text-[#FFB547] border border-[#FFB547]/40 text-[9px] font-bold tracking-wider">
                    DEMO FIXTURE
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-[#9BA3AF]">
                {observation.region} • {observation.satellite} ({observation.instrument})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded border border-[#323B43] bg-[#1C2227] hover:bg-[#2E373F] text-[#9BA3AF] hover:text-[#F4F1E9] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-3.5">
          {/* Top Score Banner */}
          <div className="bg-[#252C32] p-3 rounded border border-[#323B43] flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] text-[#9BA3AF] uppercase">Explainable Triage Score</span>
              <div className="flex items-baseline gap-1">
                <span className={`font-headline text-3xl font-bold ${isCrit ? 'text-[#F04438]' : 'text-[#FFB547]'}`}>
                  {observation.priority_score}
                </span>
                <span className="font-mono text-xs text-[#9BA3AF]">/ 100</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`font-mono text-xs px-2.5 py-1 rounded border font-bold uppercase tracking-wider ${
                  isCrit
                    ? 'bg-[#3D1715] text-[#F04438] border-[#F04438]/50'
                    : 'bg-[#38270F] text-[#FFB547] border-[#FFB547]/50'
                }`}
              >
                {observation.priority_tier}
              </span>
              <div className="font-mono text-[10px] text-[#9BA3AF] mt-1">
                Acquired: {observation.acq_time} UTC ({observation.acq_date})
              </div>
            </div>
          </div>

          {/* Anomaly Diagnostic & Analyst Dismissal Box */}
          {observation.anomaly_flags && (
            <div className="p-3 rounded bg-[#38270F] border border-[#FFB547]/60 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[#FFB547]">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-[#FFB547]" />
                  <span>DATA INTEGRITY ALERT: {observation.anomaly_flags.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
                <span className="text-[10px] bg-[#1C2227] px-1.5 py-0.5 rounded border border-[#FFB547]/40 font-semibold">
                  QA Flagged
                </span>
              </div>
              <p className="text-[11px] text-[#F4F1E9] leading-relaxed">
                {observation.anomaly_explanation || 'Satellite radiometric telemetry flagged this observation for automated quality review.'}
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-[#FFB547]">
                <input
                  type="checkbox"
                  checked={dismissAnomaly}
                  onChange={(e) => setDismissAnomaly(e.target.checked)}
                  className="rounded bg-[#15191D] border-[#FFB547] text-[#FFB547] focus:ring-0"
                />
                <span>Dismiss anomaly flag upon save (confirms natural wildfire activity)</span>
              </label>
            </div>
          )}

          {/* Factor Points Decomposition */}
          <div className="bg-[#20262C] p-3 rounded border border-[#323B43]">
            <span className="font-mono text-[10px] uppercase text-[#9BA3AF] block mb-2 font-semibold">
              Score Point Contributions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center text-xs">
              <div className="bg-[#15191D] p-2 rounded border border-[#323B43]">
                <span className="text-[#9BA3AF] text-[10px]">FRP INTENSITY</span>
                <div className="text-[#F04438] font-bold text-base mt-0.5">+{observation.frp_points}</div>
                <span className="text-[#6C7684] text-[9px]">{observation.frp} MW</span>
              </div>
              <div className="bg-[#15191D] p-2 rounded border border-[#323B43]">
                <span className="text-[#9BA3AF] text-[10px]">RECENCY DECAY</span>
                <div className="text-[#68B5E8] font-bold text-base mt-0.5">+{observation.recency_points}</div>
                <span className="text-[#6C7684] text-[9px]">{observation.acq_time}z</span>
              </div>
              <div className="bg-[#15191D] p-2 rounded border border-[#323B43]">
                <span className="text-[#9BA3AF] text-[10px]">CONFIDENCE</span>
                <div className="text-[#FFB547] font-bold text-base mt-0.5">+{observation.conf_points}</div>
                <span className="text-[#6C7684] text-[9px]">{Math.round(observation.confidence_score * 100)}%</span>
              </div>
              <div className="bg-[#15191D] p-2 rounded border border-[#323B43]">
                <span className="text-[#9BA3AF] text-[10px]">MULTI-PASS</span>
                <div className="text-[#55B887] font-bold text-base mt-0.5">+{observation.persistence_points}</div>
                <span className="text-[#6C7684] text-[9px]">{observation.repeat_count} passes</span>
              </div>
            </div>
          </div>

          {/* Telemetry & Radiometric Readings */}
          <div className="bg-[#20262C] p-3 rounded border border-[#323B43] space-y-2">
            <span className="font-mono text-[10px] uppercase text-[#9BA3AF] font-semibold block">
              Sensor Telemetry &amp; Coordinates
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-[#6C7684]">Latitude:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.latitude.toFixed(4)}°N</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Longitude:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.longitude.toFixed(4)}°W</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Day / Night:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.daynight === 'D' ? 'Daytime' : 'Nocturnal'}</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Brightness:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.brightness || 320.0} K</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Bright T31:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.bright_t31 || 295.0} K</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Scan / Track:</span>{' '}
                <span className="text-[#F4F1E9]">{observation.scan || 0.38} / {observation.track || 0.36}</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Footprint:</span>{' '}
                <span className="text-[#68B5E8]">
                  {observation.instrument === 'VIIRS' ? '375m × 375m nadir' : '1000m × 1000m nadir'}
                </span>
              </div>
              <div>
                <span className="text-[#6C7684]">Cluster ID:</span>{' '}
                <span className="text-[#FFB547]">{observation.repeat_cluster_id || 'Single pass'}</span>
              </div>
              <div>
                <span className="text-[#6C7684]">Data Provenance:</span>{' '}
                <span className="text-[#55B887]">{observation.source_type}</span>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer Notice */}
          <div className="p-2.5 rounded bg-[#15191D] border border-[#323B43] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFB547] flex-shrink-0 mt-0.5" />
            <p className="font-mono text-[10px] text-[#9BA3AF] leading-relaxed">
              Coordinates represent radiometric pixel centroid. Cloud obscuration, bow-tie distortion, or industrial static heat anomalies (petrochemical flaring) may confound readings. Ground verification required before tactical dispatch.
            </p>
          </div>

          {/* Review Status & Analyst Notes Form */}
          <div className="bg-[#252C32] p-3 rounded border border-[#323B43] space-y-2.5">
            <span className="font-mono text-xs font-bold text-[#F4F1E9] block">
              Analyst Verification &amp; Review Notes
            </span>

            <div>
              <label className="text-[10px] text-[#9BA3AF] font-mono block mb-1">
                Select Assessment Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full bg-[#15191D] border border-[#323B43] rounded px-3 py-1.5 text-xs text-[#F4F1E9] font-mono focus:outline-none focus:border-[#68B5E8]"
              >
                <option value="unreviewed">Unreviewed</option>
                <option value="needs_review">Needs Further Review</option>
                <option value="verified_fire">Verified Active Fire Front</option>
                <option value="flagged_false_positive">Flagged False Positive / Flare</option>
                <option value="reviewed_anomaly">Reviewed — Thermal Anomaly</option>
                <option value="reviewed_insufficient">Reviewed — Insufficient Evidence</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#9BA3AF] font-mono block mb-1">
                Analyst Observations &amp; Verification Rationale
              </label>
              <textarea
                rows={3}
                placeholder="Enter field notes, weather station corroboration, or reason for classification..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-[#15191D] border border-[#323B43] rounded px-3 py-1.5 text-xs text-[#F4F1E9] font-mono focus:outline-none focus:border-[#68B5E8]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[11px] text-[#55B887]">
                {saveMessage}
              </span>
              <button
                onClick={handleSaveReview}
                disabled={isSaving}
                className="px-4 py-2 rounded bg-[#FFB547] text-[#15191D] font-mono text-xs font-bold hover:bg-[#E69E35] transition-colors"
              >
                {isSaving ? 'Saving to Database...' : 'Save Review Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
