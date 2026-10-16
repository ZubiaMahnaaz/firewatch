import React, { useState } from 'react';
import type { Observation } from '../types';
import { API_BASE } from '../api';
import { Search, Download, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Flag, Eye, AlertTriangle, ShieldCheck } from 'lucide-react';

interface QueueScreenProps {
  observations: Observation[];
  totalObservations: number;
  selectedObservation: Observation | null;
  onSelectObservation: (obs: Observation) => void;
  onFilterChange: (filters: any) => void;
  onOpenDetailModal: (obs: Observation) => void;
}

export const QueueScreen: React.FC<QueueScreenProps> = ({
  observations,
  totalObservations,
  selectedObservation,
  onSelectObservation,
  onFilterChange,
  onOpenDetailModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>('');
  const [selectedSatellite, setSelectedSatellite] = useState<string>('');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('');
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<string>('');
  const [minFrp, setMinFrp] = useState<number | undefined>(undefined);
  const [repeatOnly, setRepeatOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('priority_score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      query: searchQuery || undefined,
      priority_tier: selectedTier || undefined,
      review_status: selectedReviewStatus || undefined,
      satellite: selectedSatellite || undefined,
      source_type: selectedSourceType || undefined,
      anomaly_type: selectedAnomalyType || undefined,
      min_frp: minFrp,
      repeat_only: repeatOnly ? true : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      offset: (currentPage - 1) * pageSize,
      limit: pageSize
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedTier('');
    setSelectedReviewStatus('');
    setSelectedSatellite('');
    setSelectedSourceType('');
    setSelectedAnomalyType('');
    setMinFrp(undefined);
    setRepeatOnly(false);
    setSortBy('priority_score');
    setSortOrder('desc');
    setCurrentPage(1);
    onFilterChange({ limit: pageSize, offset: 0 });
  };

  const handleSortChange = (field: string) => {
    const nextOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(nextOrder);
    onFilterChange({
      query: searchQuery || undefined,
      priority_tier: selectedTier || undefined,
      review_status: selectedReviewStatus || undefined,
      satellite: selectedSatellite || undefined,
      source_type: selectedSourceType || undefined,
      anomaly_type: selectedAnomalyType || undefined,
      min_frp: minFrp,
      repeat_only: repeatOnly ? true : undefined,
      sort_by: field,
      sort_order: nextOrder,
      offset: (currentPage - 1) * pageSize,
      limit: pageSize
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onFilterChange({
      query: searchQuery || undefined,
      priority_tier: selectedTier || undefined,
      review_status: selectedReviewStatus || undefined,
      satellite: selectedSatellite || undefined,
      source_type: selectedSourceType || undefined,
      anomaly_type: selectedAnomalyType || undefined,
      min_frp: minFrp,
      repeat_only: repeatOnly ? true : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      offset: (newPage - 1) * pageSize,
      limit: pageSize
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalObservations / pageSize));

  return (
    <div className="flex flex-col w-full px-4 py-3 space-y-3 pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#252C32] p-3 rounded border border-[#323B43]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#FFB547]">table_chart</span>
            <h1 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Observation Triage Queue</h1>
          </div>
          <p className="font-mono text-[11px] text-[#9BA3AF] mt-0.5">
            Displaying {observations.length} of {totalObservations.toLocaleString()} records • Sorted by {sortBy.replace('_', ' ')} ({sortOrder})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${API_BASE}/export/csv?limit=5000${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ''}${selectedTier ? `&priority_tier=${encodeURIComponent(selectedTier)}` : ''}${selectedReviewStatus ? `&review_status=${encodeURIComponent(selectedReviewStatus)}` : ''}${selectedSatellite ? `&satellite=${encodeURIComponent(selectedSatellite)}` : ''}${selectedSourceType ? `&source_type=${encodeURIComponent(selectedSourceType)}` : ''}${selectedAnomalyType ? `&anomaly_type=${encodeURIComponent(selectedAnomalyType)}` : ''}${minFrp !== undefined ? `&min_frp=${minFrp}` : ''}${repeatOnly ? `&repeat_only=true` : ''}`}
            download="firewatch_filtered_observations.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] font-mono text-[11px] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#68B5E8]" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={handleResetFilters}
            className="px-2.5 py-1.5 rounded bg-[#1C2227] hover:bg-[#20262C] text-[#9BA3AF] hover:text-[#F4F1E9] font-mono text-[11px] border border-[#323B43]"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-[#20262C] p-3 rounded border border-[#323B43] space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[#6C7684]" />
            <input
              type="text"
              placeholder="Search Obs ID, Region, Satellite (e.g. FW-8842, Sierra, VIIRS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded pl-8 pr-3 py-1.5 text-xs text-[#F4F1E9] placeholder-[#6C7684] focus:outline-none focus:border-[#68B5E8]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-[#FFB547] text-[#15191D] font-mono text-[11px] font-bold hover:bg-[#E69E35] transition-colors"
          >
            Apply Filters
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[11px]">
          <div>
            <label className="text-[10px] text-[#9BA3AF] mb-0.5 block">Priority Tier</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded px-2 py-1 text-xs text-[#F4F1E9] focus:outline-none"
            >
              <option value="">All Tiers</option>
              <option value="Tier-1 Critical">Tier-1 Critical (&gt;80)</option>
              <option value="Tier-2 Priority">Tier-2 Priority (60-79)</option>
              <option value="Tier-3 Advisory">Tier-3 Advisory (35-59)</option>
              <option value="Tier-4 Routine">Tier-4 Routine (&lt;35)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#9BA3AF] mb-0.5 block">Review Status</label>
            <select
              value={selectedReviewStatus}
              onChange={(e) => setSelectedReviewStatus(e.target.value)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded px-2 py-1 text-xs text-[#F4F1E9] focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="needs_review">Needs Review</option>
              <option value="verified_fire">Verified Fire</option>
              <option value="flagged_false_positive">Flagged False/Flare</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#9BA3AF] mb-0.5 block">Provenance</label>
            <select
              value={selectedSourceType}
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded px-2 py-1 text-xs text-[#F4F1E9] focus:outline-none"
            >
              <option value="">All Provenance</option>
              <option value="LIVE_FIRMS">Live NASA FIRMS</option>
              <option value="CSV_IMPORT">CSV Ingested</option>
              <option value="SYNTHETIC_DEMO">Synthetic Fixture</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#9BA3AF] mb-0.5 block">QA &amp; Anomalies</label>
            <select
              value={selectedAnomalyType}
              onChange={(e) => setSelectedAnomalyType(e.target.value)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded px-2 py-1 text-xs text-[#F4F1E9] focus:outline-none"
            >
              <option value="">All Integrity States</option>
              <option value="any">Flagged Anomalies</option>
              <option value="extreme_frp">Extreme FRP (≥100MW)</option>
              <option value="static_heat_source">Static Heat / Flare</option>
              <option value="bow_tie_distortion">Bow-tie Distortion</option>
              <option value="nocturnal_intense">Nocturnal Intense</option>
              <option value="low_confidence_subpixel">Low Conf Subpixel</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#9BA3AF] mb-0.5 block">Min FRP (MW)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={minFrp ?? ''}
              onChange={(e) => setMinFrp(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full bg-[#15191D] border border-[#323B43] rounded px-2 py-1 text-xs text-[#F4F1E9] focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={repeatOnly}
                onChange={(e) => setRepeatOnly(e.target.checked)}
                className="rounded bg-[#15191D] border-[#323B43] text-[#FFB547] focus:ring-0"
              />
              <span className="text-xs text-[#F4F1E9]">Repeat Only</span>
            </label>
          </div>
        </div>
      </form>

      {/* Observation Table */}
      <div className="bg-[#252C32] rounded border border-[#323B43] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#1C2227] text-[#9BA3AF] border-b border-[#323B43]">
                <th
                  onClick={() => handleSortChange('priority_score')}
                  className="p-2.5 cursor-pointer hover:text-[#F4F1E9]"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-[#FFB547]" />
                  </div>
                </th>
                <th className="p-2.5">Obs ID</th>
                <th className="p-2.5">Provenance</th>
                <th className="p-2.5">Region</th>
                <th className="p-2.5">Coordinates</th>
                <th
                  onClick={() => handleSortChange('frp')}
                  className="p-2.5 cursor-pointer hover:text-[#F4F1E9]"
                >
                  <div className="flex items-center gap-1">
                    <span>FRP (MW)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#F04438]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('confidence_score')}
                  className="p-2.5 cursor-pointer hover:text-[#F4F1E9]"
                >
                  <div className="flex items-center gap-1">
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3 text-[#55B887]" />
                  </div>
                </th>
                <th className="p-2.5">Sensor</th>
                <th
                  onClick={() => handleSortChange('acq_datetime')}
                  className="p-2.5 cursor-pointer hover:text-[#F4F1E9]"
                >
                  <div className="flex items-center gap-1">
                    <span>Acquired (UTC)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#68B5E8]" />
                  </div>
                </th>
                <th className="p-2.5">Multi-Pass</th>
                <th className="p-2.5">QA Flags</th>
                <th className="p-2.5">Review Status</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#323B43]/60">
              {observations.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-[#9BA3AF] font-body">
                    No active fire observations match current filter criteria.
                  </td>
                </tr>
              ) : (
                observations.map((obs) => {
                  const isSelected = selectedObservation?.obs_id === obs.obs_id;
                  const isCrit = obs.priority_score >= 80;
                  const isMod = obs.priority_score >= 50 && obs.priority_score < 80;

                  return (
                    <tr
                      key={obs.obs_id}
                      onClick={() => onSelectObservation(obs)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2E373F] border-l-2 border-l-[#FFB547]'
                          : 'hover:bg-[#20262C]'
                      }`}
                    >
                      {/* Priority Score & Tier */}
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isCrit ? 'text-[#F04438]' : isMod ? 'text-[#FFB547]' : 'text-[#9BA3AF]'
                            }`}
                          >
                            {obs.priority_score}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isCrit
                                ? 'bg-[#3D1715] text-[#F04438] border border-[#F04438]/50'
                                : isMod
                                ? 'bg-[#38270F] text-[#FFB547] border border-[#FFB547]/50'
                                : 'bg-[#15191D] text-[#9BA3AF] border border-[#323B43]'
                            }`}
                          >
                            {obs.priority_tier.split(' ')[0]}
                          </span>
                        </div>
                      </td>

                      {/* Obs ID */}
                      <td className="p-2.5 font-bold text-[#F4F1E9] whitespace-nowrap">
                        {obs.obs_id}
                      </td>

                      {/* Provenance */}
                      <td className="p-2.5 whitespace-nowrap">
                        {obs.source_type === 'LIVE_FIRMS' ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#102A1E] text-[#55B887] border border-[#55B887]/40 text-[9px] font-bold tracking-wider">
                            LIVE FIRMS
                          </span>
                        ) : (obs.source_type?.toLowerCase().includes('csv') || obs.source_type?.toLowerCase().includes('upload')) ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#1A2E3D] text-[#68B5E8] border border-[#68B5E8]/40 text-[9px] font-bold tracking-wider">
                            CSV IMPORT
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-[#2D2114] text-[#FFB547] border border-[#FFB547]/40 text-[9px] font-bold tracking-wider">
                            DEMO
                          </span>
                        )}
                      </td>

                      {/* Region */}
                      <td className="p-2.5 max-w-[160px] truncate text-[#9BA3AF]">
                        {obs.region}
                      </td>

                      {/* Coordinates */}
                      <td className="p-2.5 whitespace-nowrap text-[#9BA3AF]">
                        {obs.latitude.toFixed(3)}°, {obs.longitude.toFixed(3)}°
                      </td>

                      {/* FRP */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            obs.frp >= 100
                              ? 'text-[#F04438]'
                              : obs.frp >= 50
                              ? 'text-[#FF8442]'
                              : obs.frp >= 20
                              ? 'text-[#FFB547]'
                              : 'text-[#68B5E8]'
                          }`}
                        >
                          {obs.frp}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            obs.confidence_score >= 0.85
                              ? 'text-[#55B887]'
                              : obs.confidence_score >= 0.55
                              ? 'text-[#FFB547]'
                              : 'text-[#9BA3AF]'
                          }`}
                        >
                          {obs.confidence} ({Math.round(obs.confidence_score * 100)}%)
                        </span>
                      </td>

                      {/* Sensor */}
                      <td className="p-2.5 whitespace-nowrap text-[#9BA3AF]">
                        {obs.satellite} ({obs.instrument})
                      </td>

                      {/* Acquired Time */}
                      <td className="p-2.5 whitespace-nowrap text-[#F4F1E9]">
                        {obs.acq_time}z <span className="text-[#6C7684] text-[10px]">{obs.acq_date.substring(5)}</span>
                      </td>

                      {/* Repeat Count */}
                      <td className="p-2.5 whitespace-nowrap">
                        {obs.is_repeat ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#FFB547]/20 border border-[#FFB547]/40 text-[#FFB547] text-[10px] font-semibold">
                            {obs.repeat_count} passes
                          </span>
                        ) : (
                          <span className="text-[#6C7684]">1 pass</span>
                        )}
                      </td>

                      {/* QA Flags */}
                      <td className="p-2.5 whitespace-nowrap">
                        {obs.anomaly_flags ? (
                          <div className="flex items-center gap-1" title={obs.anomaly_explanation || obs.anomaly_flags}>
                            <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547] shrink-0" />
                            <span className="text-[10px] text-[#FFB547] bg-[#38270F] px-1.5 py-0.5 rounded border border-[#FFB547]/40 truncate max-w-[90px]">
                              {obs.anomaly_flags.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[#6C7684]">
                            <ShieldCheck className="w-3 h-3 text-[#55B887]/60" />
                            <span className="text-[10px] text-[#6C7684]">Nominal</span>
                          </div>
                        )}
                      </td>

                      {/* Review Status */}
                      <td className="p-2.5 whitespace-nowrap">
                        {obs.review_status === 'verified_fire' ? (
                          <span className="inline-flex items-center gap-1 text-[#55B887]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : obs.review_status === 'flagged_false_positive' ? (
                          <span className="inline-flex items-center gap-1 text-[#FFB547]">
                            <Flag className="w-3 h-3" />
                            <span>False/Flare</span>
                          </span>
                        ) : obs.review_status === 'needs_review' ? (
                          <span className="text-[#F04438] font-semibold">Needs Review</span>
                        ) : (
                          <span className="text-[#6C7684]">Unreviewed</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetailModal(obs);
                          }}
                          className="px-2 py-1 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] text-[10px] flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3 text-[#68B5E8]" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-[#1C2227] border-t border-[#323B43] flex items-center justify-between font-mono text-[11px] text-[#9BA3AF]">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded bg-[#252C32] border border-[#323B43] text-[#F4F1E9] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D353D]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded bg-[#252C32] border border-[#323B43] text-[#F4F1E9] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#2D353D]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
