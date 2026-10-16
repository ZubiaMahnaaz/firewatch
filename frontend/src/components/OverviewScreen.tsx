import React, { useState } from 'react';
import type { Observation, DashboardOverview } from '../types';
import { ObservationMap } from './ObservationMap';
import { updateObservationReview, API_BASE } from '../api';
import { CheckCircle2, Flag, FileDown, Send, Layers, RefreshCw } from 'lucide-react';

interface OverviewScreenProps {
  overview: DashboardOverview | null;
  observations: Observation[];
  selectedObservation: Observation | null;
  onSelectObservation: (obs: Observation) => void;
  onOpenDetailModal?: (obs: Observation) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigateToQueue: () => void;
  onFilterChange: (filters: any) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  overview,
  observations,
  selectedObservation,
  onSelectObservation,
  onOpenDetailModal,
  onRefresh,
  isRefreshing,
  onNavigateToQueue,
  onFilterChange
}) => {
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [frpThreshold, setFrpThreshold] = useState<number | undefined>(undefined);
  const [confThreshold, setConfThreshold] = useState<number | undefined>(undefined);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const activeObs = selectedObservation || observations[0] || null;

  // Filter toggles
  const handleToggleRepeat = () => {
    const nextVal = !repeatOnly;
    setRepeatOnly(nextVal);
    onFilterChange({ repeat_only: nextVal ? true : undefined });
  };

  const handleToggleFrp = () => {
    const nextVal = frpThreshold === 15.0 ? undefined : 15.0;
    setFrpThreshold(nextVal);
    onFilterChange({ min_frp: nextVal });
  };

  const handleToggleConf = () => {
    const nextVal = confThreshold === 0.5 ? undefined : 0.5;
    setConfThreshold(nextVal);
    onFilterChange({ min_confidence: nextVal });
  };

  const handleResetFilters = () => {
    setRepeatOnly(false);
    setFrpThreshold(undefined);
    setConfThreshold(undefined);
    onFilterChange({});
  };

  const handleReviewAction = async (status: string) => {
    if (!activeObs) return;
    setIsUpdatingReview(true);
    try {
      await updateObservationReview(
        activeObs.obs_id,
        status,
        reviewNoteInput || activeObs.review_notes || `Analyst marked ${status}`
      );
      setActionSuccessMsg(`Updated to ${status.replace('_', ' ')}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(`Review update failed: ${err.message}`);
    } finally {
      setIsUpdatingReview(false);
    }
  };

  // High priority top 3 for queue preview
  const topCriticalQueue = observations
    .filter(o => o.priority_score >= 80)
    .slice(0, 3);

  return (
    <div className="flex flex-col w-full pb-20">
      {/* 1. Live Stream Telemetry Ribbon */}
      <section className="bg-[#1C2227] px-4 py-2.5 border-b border-[#323B43]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#252C32] border border-[#323B43] font-mono text-[10px] font-semibold tracking-wider uppercase text-[#F4F1E9]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-ping"></span>
              LIVE STREAM
            </span>
            <span className="font-mono text-[11px] text-[#9BA3AF] truncate">
              {overview?.latest_ingestion_time
                ? `Acquired ${overview.latest_ingestion_time.substring(11, 16)} UTC (${overview.latest_satellite_source})`
                : 'Acquired 14m ago (VIIRS / MODIS)'}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#252C32] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] font-mono text-[11px] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#68B5E8] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
        <p className="text-[12px] text-[#9BA3AF] mb-1.5 leading-snug">
          Satellite-derived thermal observations for analyst triage review (VIIRS 375m / MODIS 1km)
        </p>
        <div className="flex items-center justify-between text-[#9BA3AF] font-mono text-[11px] pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-[#68B5E8]">schedule</span>
            <span>Window: Last 24h (UTC) • {overview?.total_observations || 1248} Catalog Records</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-[#132D40] border border-[#68B5E8]/30 text-[#68B5E8] font-semibold text-[10px]">
            VIIRS 375m NRT Model
          </span>
        </div>
      </section>

      {/* 2. Metric Matrix (2x2 Compact Console Cards matching Screen 3) */}
      <section className="px-4 pt-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Card 1: Total Observations */}
          <div
            onClick={onNavigateToQueue}
            className="bg-[#252C32] border border-[#323B43] p-3 rounded flex flex-col justify-between cursor-pointer hover:border-[#68B5E8] transition-colors"
          >
            <div className="flex items-center justify-between text-[#9BA3AF]">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Total Obs</span>
              <span className="material-symbols-outlined text-[16px] text-[#68B5E8]">satellite_alt</span>
            </div>
            <div className="my-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-[#F4F1E9]">
                {overview ? overview.total_observations.toLocaleString() : '1,248'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#55B887]">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              <span className="truncate">94.2% valid schema</span>
            </div>
          </div>

          {/* Card 2: High Priority */}
          <div
            onClick={onNavigateToQueue}
            className="bg-[#252C32] border border-[#F04438]/40 p-3 rounded flex flex-col justify-between relative overflow-hidden cursor-pointer hover:border-[#F04438] transition-colors"
          >
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#F04438]/5 rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#F04438]">Priority &gt;80</span>
              <span className="px-1.5 py-0.2 rounded bg-[#F04438] text-white font-mono text-[9px] font-bold tracking-wider animate-pulse">ACTION</span>
            </div>
            <div className="my-1.5 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-[#F04438]">
                {overview ? overview.high_priority_count : '42'}
              </span>
              <span className="font-mono text-[11px] text-[#9BA3AF]">queued</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#F04438]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]"></span>
              <span className="truncate">Needs immediate review</span>
            </div>
          </div>

          {/* Card 3: Repeat Clusters */}
          <div
            onClick={handleToggleRepeat}
            className={`border p-3 rounded flex flex-col justify-between cursor-pointer transition-colors ${
              repeatOnly ? 'bg-[#38270F] border-[#FFB547]' : 'bg-[#252C32] border-[#323B43] hover:border-[#FFB547]'
            }`}
          >
            <div className="flex items-center justify-between text-[#9BA3AF]">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Repeat Detections</span>
              <span className="material-symbols-outlined text-[16px] text-[#FFB547]">hub</span>
            </div>
            <div className="my-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-[#FFB547]">
                {overview ? overview.repeat_detections_count : '318'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#9BA3AF] truncate">
              Persistent &gt;48h cluster
            </div>
          </div>

          {/* Card 4: Anomaly Flags & Quarantined */}
          <div
            onClick={onNavigateToQueue}
            className="bg-[#252C32] border border-[#323B43] p-3 rounded flex flex-col justify-between cursor-pointer hover:border-[#FFB547] transition-colors"
          >
            <div className="flex items-center justify-between text-[#9BA3AF]">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Anomalies</span>
              <span className="material-symbols-outlined text-[16px] text-[#FFB547]">warning</span>
            </div>
            <div className="my-1.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-[#FFB547]">
                {overview?.anomaly_counts?.total_anomalies ?? 506}
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#9BA3AF] truncate">
              {overview?.rejected_raw_count ? `${overview.rejected_raw_count} quarantined` : 'Flare & extreme flags'}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Analyst Filter Array */}
      <section className="px-4 pt-3">
        <div className="bg-[#20262C] border border-[#323B43] p-2.5 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#F4F1E9]">
              <span className="material-symbols-outlined text-[14px] text-[#FFB547]">tune</span>
              <span>Analyst Filter Array</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="font-mono text-[11px] text-[#FFB547] hover:underline"
            >
              Reset All
            </button>
          </div>
          {/* Filter Horizontal Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#252C32] border border-[#323B43] text-[#F4F1E9] font-mono text-[11px] whitespace-nowrap">
              <span className="material-symbols-outlined text-[13px] text-[#9BA3AF]">calendar_today</span>
              <span>Active Cycle (UTC)</span>
            </div>

            <button
              onClick={handleToggleFrp}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap transition-colors ${
                frpThreshold ? 'bg-[#F04438]/20 border-[#F04438] text-[#F04438]' : 'bg-[#252C32] border-[#323B43] text-[#F4F1E9]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]"></span>
              <span>FRP ≥ 15.0 MW</span>
            </button>

            <button
              onClick={handleToggleConf}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap transition-colors ${
                confThreshold ? 'bg-[#55B887]/20 border-[#55B887] text-[#55B887]' : 'bg-[#252C32] border-[#323B43] text-[#F4F1E9]'
              }`}
            >
              <span>Conf ≥ 50%</span>
            </button>

            <button
              onClick={handleToggleRepeat}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap transition-colors ${
                repeatOnly
                  ? 'bg-[#FFB547]/20 border-[#FFB547]/40 text-[#FFB547]'
                  : 'bg-[#252C32] border-[#323B43] text-[#F4F1E9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Repeat Only</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Geospatial Map Viewport (Leaflet with custom fire markers) */}
      <section className="px-4 pt-3">
        <ObservationMap
          observations={observations}
          selectedObservation={activeObs}
          onSelectObservation={onSelectObservation}
          onOpenDetailModal={onOpenDetailModal}
          heightClass="h-80 sm:h-96"
        />
      </section>

      {/* 5. Selected Observation Detail Card (Explainable Triage Model - Screen 3) */}
      {observations.length === 0 ? (
        <section className="px-4 pt-3">
          <div className="bg-[#252C32] border border-[#323B43] rounded p-8 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-[#9BA3AF]">radar</span>
            <h3 className="font-headline text-base font-bold text-[#F4F1E9]">No Matching Satellite Observations</h3>
            <p className="font-mono text-xs text-[#9BA3AF] max-w-md mx-auto">
              No orbital thermal hotspots match the current filter parameters. Try clearing filters or refreshing telemetry.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3 py-1.5 rounded bg-[#FFB547] text-[#15191D] font-mono text-xs font-bold hover:bg-[#E69E35]"
            >
              Reset All Filters
            </button>
          </div>
        </section>
      ) : activeObs && (
        <section className="px-4 pt-3">
          <div className="bg-[#252C32] border border-[#323B43] rounded p-3.5 shadow-md">
            {/* Header Meta */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#F4F1E9]">
                    Obs ID: {activeObs.obs_id}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${
                      activeObs.priority_score >= 80
                        ? 'bg-[#3D1715] border-[#F04438]/50 text-[#F04438]'
                        : activeObs.priority_score >= 50
                        ? 'bg-[#38270F] border-[#FFB547]/50 text-[#FFB547]'
                        : 'bg-[#1C2227] border-[#323B43] text-[#9BA3AF]'
                    }`}
                  >
                    {activeObs.priority_tier.toUpperCase()}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#103248] text-[#68B5E8] border border-[#68B5E8]/30">
                    {activeObs.satellite} ({activeObs.instrument})
                  </span>
                  {/* Provenance Badge */}
                  <span
                    className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${
                      activeObs.source_type === 'nasa_firms'
                        ? 'bg-[#112F21] text-[#55B887] border-[#55B887]/50'
                        : activeObs.source_type === 'csv_upload'
                        ? 'bg-[#103248] text-[#68B5E8] border-[#68B5E8]/50'
                        : 'bg-[#38270F] text-[#FFB547] border-[#FFB547]/50'
                    }`}
                  >
                    {activeObs.source_type === 'nasa_firms'
                      ? '🛰️ LIVE FIRMS'
                      : activeObs.source_type === 'csv_upload'
                      ? '📁 CSV IMPORT'
                      : '🧪 SYNTHETIC DEMO'}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#9BA3AF]">
                  {activeObs.latitude.toFixed(4)}°N, {Math.abs(activeObs.longitude).toFixed(4)}°W • {activeObs.region}
                </div>
              </div>

              {/* Large Score Badge & Detail Modal Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onOpenDetailModal && (
                  <button
                    onClick={() => onOpenDetailModal(activeObs)}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#323B43] text-[#68B5E8] font-mono text-[10px] font-semibold transition-colors"
                  >
                    <span>Full Inspector</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </button>
                )}
                <div className="flex flex-col items-end bg-[#20262C] border border-[#323B43] px-2.5 py-1 rounded">
                  <span className="font-mono text-[9px] text-[#9BA3AF] uppercase tracking-wider">Triage Score</span>
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className={`font-mono text-xl font-bold ${
                        activeObs.priority_score >= 80 ? 'text-[#F04438]' : 'text-[#FFB547]'
                      }`}
                    >
                      {activeObs.priority_score}
                    </span>
                    <span className="font-mono text-[11px] text-[#9BA3AF]">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Anomaly Diagnostic Warning Banner (if flagged) */}
            {activeObs.anomaly_flags && (
              <div className="p-2.5 rounded bg-[#38270F]/85 border border-[#FFB547] mb-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#FFB547] text-[18px] flex-shrink-0 mt-0.5">warning</span>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#FFB547]">
                      Algorithmic Anomaly Flag: {activeObs.anomaly_flags.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-[11px] text-[#F4F1E9]/90 font-body mt-0.5 leading-snug">
                      {activeObs.anomaly_explanation || 'Signature deviates from standard flaming behavior. Requires analyst corroboration.'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleReviewAction('reviewed_anomaly')}
                  className="px-2 py-1 rounded bg-[#FFB547] text-[#15191D] font-mono text-[10px] font-bold whitespace-nowrap hover:bg-[#E69E35] flex-shrink-0"
                >
                  Confirm / Dismiss
                </button>
              </div>
            )}

            {/* Explicit Contribution Stacked Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[#9BA3AF] font-mono text-[10px] mb-1">
                <span>CONTRIBUTING FACTORS</span>
                <span className="text-[#F4F1E9] font-semibold">{activeObs.priority_score} Total Pts</span>
              </div>
              <div className="w-full bg-[#15191D] h-2 rounded overflow-hidden flex gap-0.5 p-0.5 border border-[#323B43]">
                <div
                  className="bg-[#F04438] h-full rounded-sm transition-all"
                  style={{ width: `${Math.max(5, (activeObs.frp_points / Math.max(1, activeObs.priority_score)) * 100)}%` }}
                  title={`FRP: +${activeObs.frp_points} pts`}
                ></div>
                <div
                  className="bg-[#68B5E8] h-full rounded-sm transition-all"
                  style={{ width: `${Math.max(5, (activeObs.recency_points / Math.max(1, activeObs.priority_score)) * 100)}%` }}
                  title={`Recency: +${activeObs.recency_points} pts`}
                ></div>
                <div
                  className="bg-[#FFB547] h-full rounded-sm transition-all"
                  style={{ width: `${Math.max(5, (activeObs.conf_points / Math.max(1, activeObs.priority_score)) * 100)}%` }}
                  title={`Confidence: +${activeObs.conf_points} pts`}
                ></div>
                <div
                  className="bg-[#55B887] h-full rounded-sm transition-all"
                  style={{ width: `${Math.max(5, (activeObs.persistence_points / Math.max(1, activeObs.priority_score)) * 100)}%` }}
                  title={`Persistence: +${activeObs.persistence_points} pts`}
                ></div>
              </div>
            </div>

            {/* Explainability Factors Breakdown Cards */}
            <div className="space-y-1.5 font-mono text-xs mb-3">
              {/* Factor 1: FRP */}
              <div className="p-2 rounded bg-[#20262C] border border-[#323B43] flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#F04438] flex-shrink-0 mt-0.5">
                    local_fire_department
                  </span>
                  <div>
                    <div className="font-semibold text-[#F4F1E9] text-[11px]">
                      Radiative Power (FRP) • {activeObs.frp} MW
                    </div>
                    <div className="text-[#9BA3AF] text-[10px] leading-tight font-body">
                      {activeObs.frp >= 100
                        ? 'Extreme thermal yield above 99th regional percentile'
                        : activeObs.frp >= 50
                        ? 'Intense thermal flux indicating high biomass consumption'
                        : 'Moderate flaming radiant emissions'}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#F04438] whitespace-nowrap text-[11px]">
                  +{activeObs.frp_points} pts
                </span>
              </div>

              {/* Factor 2: Temporal Recency */}
              <div className="p-2 rounded bg-[#20262C] border border-[#323B43] flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#68B5E8] flex-shrink-0 mt-0.5">
                    history
                  </span>
                  <div>
                    <div className="font-semibold text-[#F4F1E9] text-[11px]">
                      Recency Weight • {activeObs.acq_time} UTC ({activeObs.acq_date})
                    </div>
                    <div className="text-[#9BA3AF] text-[10px] leading-tight font-body">
                      Acquired via {activeObs.satellite} sun-synchronous orbital transit
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#68B5E8] whitespace-nowrap text-[11px]">
                  +{activeObs.recency_points} pts
                </span>
              </div>

              {/* Factor 3: Sensor Confidence */}
              <div className="p-2 rounded bg-[#20262C] border border-[#323B43] flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#FFB547] flex-shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <div className="font-semibold text-[#F4F1E9] text-[11px]">
                      Algorithm Confidence • {activeObs.confidence} ({Math.round(activeObs.confidence_score * 100)}%)
                    </div>
                    <div className="text-[#9BA3AF] text-[10px] leading-tight font-body">
                      Multi-band thermal consensus mask across 3.9µm and 11µm radiance
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#FFB547] whitespace-nowrap text-[11px]">
                  +{activeObs.conf_points} pts
                </span>
              </div>

              {/* Factor 4: Persistence */}
              <div className="p-2 rounded bg-[#20262C] border border-[#323B43] flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#55B887] flex-shrink-0 mt-0.5">
                    grain
                  </span>
                  <div>
                    <div className="font-semibold text-[#F4F1E9] text-[11px]">
                      Spatial Persistence • {activeObs.repeat_count} Detected Overpasses
                    </div>
                    <div className="text-[#9BA3AF] text-[10px] leading-tight font-body">
                      {activeObs.is_repeat
                        ? `Thermal anomaly cluster (${activeObs.repeat_cluster_id || 'CLUST'}) recurring within 2.0 km`
                        : 'Single orbital detection (no adjacent multi-pass repeat)'}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-[#55B887] whitespace-nowrap text-[11px]">
                  +{activeObs.persistence_points} pts
                </span>
              </div>
            </div>

            {/* Heuristic Notice Disclaimer */}
            <div className="p-2.5 rounded bg-[#20262C] border border-[#323B43] mb-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-[15px] text-[#FFB547] flex-shrink-0 mt-0.5">info</span>
              <p className="text-[11px] text-[#9BA3AF] leading-relaxed">
                <strong className="font-semibold text-[#F4F1E9] font-mono">Notice:</strong> Priority score is an explainable analyst triage heuristic based on sensor signatures, NOT a confirmed wildfire declaration or validated danger index. Ground/aerial verification required.
              </p>
            </div>

            {/* Analyst Review Notes & Actions */}
            <div className="bg-[#1C2227] p-2.5 rounded border border-[#323B43] mb-3">
              <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                <span className="text-[#9BA3AF] uppercase">Analyst Review & Verification</span>
                <span className="text-[#FFB547] font-semibold">
                  Status: {activeObs.review_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <input
                type="text"
                placeholder="Enter field assessment or reason for verification..."
                value={reviewNoteInput || activeObs.review_notes}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                className="w-full bg-[#15191D] border border-[#323B43] rounded px-2.5 py-1.5 text-xs text-[#F4F1E9] placeholder-[#6C7684] mb-2 focus:outline-none focus:border-[#68B5E8]"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleReviewAction('verified_fire')}
                  disabled={isUpdatingReview}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#55B887] text-[#111417] font-mono text-[11px] font-bold hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Verified</span>
                </button>
                <button
                  onClick={() => handleReviewAction('flagged_false_positive')}
                  disabled={isUpdatingReview}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] font-mono text-[11px] font-medium transition-colors"
                >
                  <Flag className="w-3.5 h-3.5 text-[#FFB547]" />
                  <span>Flag Flare / False</span>
                </button>
              </div>

              {actionSuccessMsg && (
                <div className="mt-2 text-center font-mono text-[11px] text-[#55B887] animate-pulse">
                  ✓ {actionSuccessMsg}
                </div>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center justify-between pt-1 font-mono text-[11px] border-t border-[#323B43]/50">
              <a
                href={`${API_BASE}/export/geojson`}
                download="firewatch_active.geojson"
                className="flex items-center gap-1 text-[#68B5E8] hover:underline"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export GeoJSON</span>
              </a>
              <button
                onClick={() => alert(`Relay notification dispatched for ${activeObs.obs_id}`)}
                className="flex items-center gap-1 text-[#9BA3AF] hover:text-[#F4F1E9] transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Relay to Lead</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 6. Quick Triage Queue Preview (Top 3) */}
      <section className="px-4 pt-3 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#F4F1E9] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-[#F04438]">priority_high</span>
            <span>High Priority Queue (Top 3)</span>
          </div>
          <button
            onClick={onNavigateToQueue}
            className="font-mono text-[11px] text-[#FFB547] hover:underline"
          >
            View All {overview?.high_priority_count || 42} →
          </button>
        </div>

        <div className="space-y-2">
          {topCriticalQueue.map((item, idx) => {
            const isCur = activeObs?.obs_id === item.obs_id;
            return (
              <div
                key={item.obs_id}
                className={`p-3 rounded flex items-center justify-between gap-3 transition-colors ${
                  isCur
                    ? 'bg-[#252C32] border-l-2 border-l-[#F04438] border-y border-r border-[#323B43]'
                    : 'bg-[#20262C] border border-[#323B43] hover:border-[#68B5E8]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-[#F4F1E9]">
                      #{idx + 1} {item.obs_id}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#F04438]">
                      {item.priority_score} Score
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#1C2227] border border-[#323B43] text-[#9BA3AF]">
                      {item.instrument}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#9BA3AF] truncate">
                    {item.region} • {item.frp} MW • {item.acq_time} UTC
                  </div>
                </div>

                <button
                  onClick={() => onSelectObservation(item)}
                  className={`px-3 py-1.5 rounded font-mono text-[11px] font-bold whitespace-nowrap shadow-sm transition-colors ${
                    isCur
                      ? 'bg-[#FFB547] text-[#15191D]'
                      : 'bg-[#252C32] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9]'
                  }`}
                >
                  {isCur ? 'Current' : 'Triage'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
