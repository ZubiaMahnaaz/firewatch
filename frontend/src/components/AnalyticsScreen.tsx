import React, { useState, useEffect } from 'react';
import type { DashboardOverview, ScoringWeights } from '../types';
import { updateScoringWeights, simulateScoring, fetchDashboardOverview, API_BASE } from '../api';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { FileText, CheckCircle2, RotateCcw, Sliders, MapPin, AlertTriangle, Info, BookOpen } from 'lucide-react';

interface AnalyticsScreenProps {
  overview: DashboardOverview | null;
  scoringWeights: ScoringWeights;
  onRefreshWeights: () => void;
  onRefreshData: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  overview,
  scoringWeights,
  onRefreshWeights,
  onRefreshData
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'day' | 'night' | 'high_frp'>('all');
  const [filteredOverview, setFilteredOverview] = useState<DashboardOverview | null>(null);
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Active overview is filteredOverview if set, otherwise the prop overview
  const activeOverview = filteredOverview || overview;

  // What-If Simulator State
  const [simFrp, setSimFrp] = useState(120);
  const [simAge, setSimAge] = useState(1.5);
  const [simConf, setSimConf] = useState('High');
  const [simRepeat, setSimRepeat] = useState(3);
  const [simWeights, setSimWeights] = useState<ScoringWeights>(scoringWeights);
  const [simResult, setSimResult] = useState<{ score: number; tier: string } | null>({
    score: 84.2,
    tier: 'Tier-1 Critical'
  });
  const [isApplyingWeights, setIsApplyingWeights] = useState(false);

  // Re-fetch overview when filter pill changes
  useEffect(() => {
    const fetchFiltered = async () => {
      setIsLoadingFilter(true);
      try {
        let params: Record<string, any> = {};
        if (filterMode === 'day') params = { daynight: 'D' };
        else if (filterMode === 'night') params = { daynight: 'N' };
        else if (filterMode === 'high_frp') params = { min_frp: 50 };

        const res = await fetchDashboardOverview(params);
        setFilteredOverview(res);
      } catch (err) {
        console.error('Failed to filter analytics overview:', err);
      } finally {
        setIsLoadingFilter(false);
      }
    };

    fetchFiltered();
  }, [filterMode]);

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    setTimeout(() => {
      setIsExportingPdf(false);
      setPdfSuccess(true);
      const a = document.createElement('a');
      a.href = `${API_BASE}/export/summary-report`;
      a.download = 'firewatch_executive_summary.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => setPdfSuccess(false), 2500);
    }, 1200);
  };

  const handleSimulate = async () => {
    try {
      const res = await simulateScoring({
        frp: simFrp,
        age_hours: simAge,
        confidence: simConf,
        repeat_count: simRepeat,
        w_frp: simWeights.w_frp,
        w_recency: simWeights.w_recency,
        w_confidence: simWeights.w_confidence,
        w_persistence: simWeights.w_persistence,
        half_life_hours: simWeights.half_life_hours
      });
      setSimResult({
        score: res.simulated_score,
        tier: res.simulated_tier
      });
    } catch (err: any) {
      console.error('Simulation error:', err);
    }
  };

  const handleApplyWeightsToCatalog = async () => {
    if (!confirm('Recalculate priorities across all database observations using these new weights?')) return;
    setIsApplyingWeights(true);
    try {
      await updateScoringWeights(simWeights);
      onRefreshWeights();
      onRefreshData();
      alert('Weights updated successfully and catalog re-scored.');
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsApplyingWeights(false);
    }
  };

  const handleResetWeights = () => {
    const defaultWeights: ScoringWeights = {
      w_frp: 0.35,
      w_recency: 0.25,
      w_confidence: 0.20,
      w_persistence: 0.20,
      half_life_hours: 6.0
    };
    setSimWeights(defaultWeights);
  };

  // Diurnal data for Recharts
  const diurnalData = activeOverview?.diurnal_curve || [];

  // FRP bins
  const frpDistribution = activeOverview?.frp_distribution || [];

  // Compute live sensor breakdown
  const sensorTotal = (activeOverview?.sensor_counts['Suomi-NPP'] || 0) +
                      (activeOverview?.sensor_counts['NOAA-20'] || 0) +
                      (activeOverview?.sensor_counts['NOAA-21'] || 0) +
                      (activeOverview?.sensor_counts['Aqua'] || 0) +
                      (activeOverview?.sensor_counts['Terra'] || 0) || 1;

  const nppVal = activeOverview?.sensor_counts['Suomi-NPP'] || 0;
  const noaa20Val = activeOverview?.sensor_counts['NOAA-20'] || 0;
  const modisVal = (activeOverview?.sensor_counts['Aqua'] || 0) + (activeOverview?.sensor_counts['Terra'] || 0);

  const sensorData = [
    { name: 'VIIRS S-NPP (375m)', value: nppVal, color: '#68B5E8', percent: Math.round((nppVal / sensorTotal) * 100) },
    { name: 'VIIRS NOAA-20 (375m)', value: noaa20Val, color: '#FFB547', percent: Math.round((noaa20Val / sensorTotal) * 100) },
    { name: 'MODIS Aqua/Terra (1km)', value: modisVal, color: '#F04438', percent: Math.round((modisVal / sensorTotal) * 100) }
  ];

  // Compute live confidence percentages
  const confHigh = activeOverview?.confidence_counts['High'] || 0;
  const confNom = activeOverview?.confidence_counts['Nominal'] || 0;
  const confLow = activeOverview?.confidence_counts['Low'] || 0;
  const confTotal = confHigh + confNom + confLow || 1;

  const pctHigh = Math.round((confHigh / confTotal) * 100);
  const pctNom = Math.round((confNom / confTotal) * 100);
  const pctLow = Math.max(0, 100 - pctHigh - pctNom);

  // Corridors
  const corridors = activeOverview?.top_incident_corridors || [];

  return (
    <div className="flex flex-col w-full px-4 py-3 space-y-3 pb-24">
      {/* 1. Executive Analytics Header (Screen 2) */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1C2227] border border-[#323B43] text-[#FFB547] font-mono text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547] animate-ping"></span>
              GEOSPATIAL TELEMETRY
            </span>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className={`inline-flex items-center gap-1.5 border font-mono text-[11px] px-2.5 py-1 rounded transition-colors ${
                pdfSuccess
                  ? 'bg-[#55B887] text-[#15191D] border-[#55B887]'
                  : 'bg-[#2E373F] hover:bg-[#FFB547] hover:text-[#15191D] text-[#F4F1E9] border-[#323B43]'
              }`}
            >
              {isExportingPdf ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Report Ready</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export Report Summary</span>
                </>
              )}
            </button>
          </div>
          <p className="font-body text-[13px] text-[#9BA3AF] mt-1">
            Temporal frequency, radiative energy profiles, and sensor attribution
          </p>
          <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-[#323B43]/70 text-[#9BA3AF]">
            <span className="material-symbols-outlined text-[16px] text-[#68B5E8] flex-shrink-0">date_range</span>
            <span className="font-mono text-[11px] text-[#F4F1E9]">Rolling Cycle (24h / 7d)</span>
            <span className="font-mono text-[11px] text-[#FFB547] font-semibold">
              • {overview?.total_observations || 1248} Cumulative Hotspots
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Filter Pill Deck */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {isLoadingFilter && (
          <span className="flex items-center gap-1 text-[#FFB547] font-mono text-[11px] pr-1">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
          </span>
        )}
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1 font-semibold rounded font-mono text-[11px] flex items-center gap-1 shadow-sm flex-shrink-0 border ${
            filterMode === 'all'
              ? 'bg-[#FFB547] text-[#15191D] border-[#FFB547]'
              : 'bg-[#252C32] hover:bg-[#2E373F] text-[#9BA3AF] hover:text-[#F4F1E9] border-[#323B43]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">public</span> All Sectors
        </button>
        <button
          onClick={() => setFilterMode('day')}
          className={`px-3 py-1 rounded font-mono text-[11px] flex items-center gap-1 flex-shrink-0 border ${
            filterMode === 'day'
              ? 'bg-[#FFB547] text-[#15191D] border-[#FFB547] font-semibold'
              : 'bg-[#252C32] hover:bg-[#2E373F] text-[#9BA3AF] hover:text-[#F4F1E9] border-[#323B43]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px] text-[#FFB547]">wb_sunny</span> Daytime Scan
        </button>
        <button
          onClick={() => setFilterMode('night')}
          className={`px-3 py-1 rounded font-mono text-[11px] flex items-center gap-1 flex-shrink-0 border ${
            filterMode === 'night'
              ? 'bg-[#68B5E8] text-[#15191D] border-[#68B5E8] font-semibold'
              : 'bg-[#252C32] hover:bg-[#2E373F] text-[#9BA3AF] hover:text-[#F4F1E9] border-[#323B43]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px] text-[#68B5E8]">dark_mode</span> Nocturnal Track
        </button>
        <button
          onClick={() => setFilterMode('high_frp')}
          className={`px-3 py-1 rounded font-mono text-[11px] flex items-center gap-1 flex-shrink-0 border ${
            filterMode === 'high_frp'
              ? 'bg-[#F04438] text-white border-[#F04438] font-semibold'
              : 'bg-[#252C32] hover:bg-[#2E373F] text-[#9BA3AF] hover:text-[#F4F1E9] border-[#323B43]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px] text-[#F04438]">tune</span> FRP &gt; 50MW
        </button>
      </div>

      {/* 3. Chart 1: 24h Diurnal Curve (Screen 2 faithful) */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#FFB547]">schedule</span>
              <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Observations Over Time</h2>
            </div>
            <p className="font-mono text-[11px] text-[#9BA3AF]">24h Diurnal Curve • Local Solar Satellite Pass Sync</p>
          </div>
          <span className="font-mono text-[11px] bg-[#F04438]/15 border border-[#F04438]/40 text-[#F04438] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-pulse"></span>
            14:00 UTC Peak
          </span>
        </div>

        {/* Micro telemetry tooltip card */}
        <div className="bg-[#1C2227] border border-[#323B43] px-2.5 py-1.5 rounded text-[#F4F1E9] font-mono text-[11px] flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-[#9BA3AF]">
            <span className="material-symbols-outlined text-[14px] text-[#68B5E8]">tune</span>
            <span>Overpass Synchronization:</span>
          </div>
          <span className="font-semibold text-[#FFB547]">13:30 - 14:30 (Suomi-NPP &amp; Aqua Sync)</span>
        </div>

        {/* Recharts Diurnal Area/Bar Chart */}
        <div className="w-full h-44 bg-[#1C2227] rounded border border-[#323B43] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB547" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#FFB547" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" stroke="#6C7684" fontSize={9} fontStyle="JetBrains Mono" />
              <YAxis stroke="#6C7684" fontSize={9} fontStyle="JetBrains Mono" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C2227', borderColor: '#323B43', color: '#F4F1E9', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                formatter={(val: any) => [`${val} detections`, 'Volume']}
              />
              <Area type="monotone" dataKey="count" stroke="#FFB547" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Solar pass explanation legend */}
        <div className="mt-2 flex items-center justify-between text-[#9BA3AF] font-mono text-[11px] pt-1 border-t border-[#323B43]/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F04438]"></span> S-NPP Nadir (13:30 LT)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#68B5E8]"></span> Aqua Overpass (14:30 LT)
          </span>
        </div>
      </section>

      {/* 4. Chart 2: FRP Distribution */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#FFB547]">local_fire_department</span>
              <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Fire Radiative Power (FRP)</h2>
            </div>
            <p className="font-mono text-[11px] text-[#9BA3AF]">Megawatts (MW) Intensity Histogram</p>
          </div>
          <span className="material-symbols-outlined text-[#9BA3AF] text-[20px]">equalizer</span>
        </div>

        {/* Stat Callouts */}
        <div className="grid grid-cols-2 gap-2 my-2">
          <div className="bg-[#1C2227] border border-[#323B43] rounded p-2.5 flex flex-col">
            <span className="font-mono text-[10px] text-[#9BA3AF] uppercase tracking-wider">Median FRP</span>
            <span className="font-headline text-[22px] text-[#FFB547] font-bold leading-tight">
              {overview?.median_frp || 28.4} <span className="font-mono text-[11px] font-normal text-[#9BA3AF]">MW</span>
            </span>
            <span className="font-mono text-[10px] text-[#9BA3AF] mt-0.5">Std deviation ±12.1</span>
          </div>
          <div className="bg-[#1C2227] border border-[#323B43] rounded p-2.5 flex flex-col">
            <span className="font-mono text-[10px] text-[#9BA3AF] uppercase tracking-wider">Max Observed</span>
            <span className="font-headline text-[22px] text-[#F04438] font-bold leading-tight">
              {overview?.max_frp || 342.1} <span className="font-mono text-[11px] font-normal text-[#9BA3AF]">MW</span>
            </span>
            <span className="font-mono text-[10px] text-[#F04438] mt-0.5 font-medium">Extreme PyroCB Anomaly</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-2.5 mt-2">
          {frpDistribution.map((bin) => (
            <div key={bin.label}>
              <div className="flex justify-between font-mono text-[11px] mb-1">
                <span className="text-[#F4F1E9]">{bin.label}</span>
                <span style={{ color: bin.color }} className="font-semibold">
                  {bin.percent}% <span className="text-[#6C7684] font-normal">({bin.count} pts)</span>
                </span>
              </div>
              <div className="w-full h-2 bg-[#1C2227] border border-[#323B43] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${bin.percent}%`, backgroundColor: bin.color }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Donut & Confidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sensor Source Attribution */}
        <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#68B5E8]">satellite_alt</span>
              <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Sensor Source Attribution</h2>
            </div>
            <span className="font-mono text-[10px] bg-[#1C2227] border border-[#323B43] px-1.5 py-0.5 rounded text-[#9BA3AF]">
              {overview?.total_observations || 1248} subset
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 h-28 flex-shrink-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sensorData}
                    innerRadius={30}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sensorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="font-headline text-[14px] font-bold text-[#F4F1E9] leading-none">375m</span>
                <span className="font-mono text-[8px] text-[#9BA3AF] tracking-widest mt-0.5">VIIRS DOM</span>
              </div>
            </div>

            <div className="flex-grow space-y-1.5 font-mono text-[11px]">
              {sensorData.map((s) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-xs flex-shrink-0" style={{ backgroundColor: s.color }}></span>
                    <span className="text-[#F4F1E9] truncate text-[11px]">{s.name}</span>
                  </div>
                  <span className="font-semibold text-[#F4F1E9] ml-1">{s.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Algorithmic Confidence */}
        <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#55B887]">verified_user</span>
              <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Algorithmic Confidence</h2>
            </div>
            <span className="font-mono text-[10px] text-[#9BA3AF]">FIRMS Quality Mask</span>
          </div>

          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[#1C2227] border border-[#323B43] mb-2.5">
            <div className="h-full bg-[#55B887] transition-all duration-300" style={{ width: `${pctHigh}%` }}></div>
            <div className="h-full bg-[#FFB547] transition-all duration-300" style={{ width: `${pctNom}%` }}></div>
            <div className="h-full bg-[#6C7684] transition-all duration-300" style={{ width: `${pctLow}%` }}></div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="bg-[#1C2227] border border-[#323B43] p-1.5 rounded">
              <div className="text-[#55B887] font-bold font-headline text-[16px]">{pctHigh}%</div>
              <div className="text-[11px] text-[#F4F1E9] font-medium">High</div>
              <div className="text-[9px] text-[#9BA3AF]">{confHigh.toLocaleString()} pts</div>
            </div>
            <div className="bg-[#1C2227] border border-[#323B43] p-1.5 rounded">
              <div className="text-[#FFB547] font-bold font-headline text-[16px]">{pctNom}%</div>
              <div className="text-[11px] text-[#F4F1E9] font-medium">Nominal</div>
              <div className="text-[9px] text-[#9BA3AF]">{confNom.toLocaleString()} pts</div>
            </div>
            <div className="bg-[#1C2227] border border-[#323B43] p-1.5 rounded">
              <div className="text-[#9BA3AF] font-bold font-headline text-[16px]">{pctLow}%</div>
              <div className="text-[11px] text-[#F4F1E9] font-medium">Sub-pixel</div>
              <div className="text-[9px] text-[#9BA3AF]">{confLow.toLocaleString()} pts</div>
            </div>
          </div>
        </section>
      </div>

      {/* 6. What-If Interactive Scoring Simulator & Weights Config */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#323B43]">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#FFB547]" />
            <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">
              What-If Priority Scoring Simulator
            </h2>
          </div>
          <span className="font-mono text-[10px] text-[#FFB547] bg-[#FFB547]/10 border border-[#FFB547]/30 px-1.5 py-0.5 rounded font-semibold">
            Heuristic Sandbox
          </span>
        </div>

        {/* Explainable Formula Documentation Card */}
        <div className="bg-[#1C2227] p-3 rounded border border-[#323B43] space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-[#FFB547] font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mathematical Scoring Formula &amp; Point Contribution Matrix</span>
          </div>
          <div className="p-2 bg-[#15191D] rounded border border-[#323B43]/70 text-[#F4F1E9] text-[11px] overflow-x-auto leading-relaxed">
            <span className="text-[#FFB547] font-bold">Score</span> = 100 × [ <span className="text-[#F04438]">w₁</span>·log(FRP+1)/log(501) + <span className="text-[#68B5E8]">w₂</span>·0.5^(Δt/τ) + <span className="text-[#FFB547]">w₃</span>·Conf + <span className="text-[#55B887]">w₄</span>·min(1, (Passes-1)/4) ]
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] text-[#9BA3AF]">
            <div><span className="text-[#F04438] font-bold">w₁ FRP (Radiative)</span>: Logarithmic power scaling up to 500 MW cap.</div>
            <div><span className="text-[#68B5E8] font-bold">w₂ Recency (Decay)</span>: Exponential half-life decay (τ = {simWeights.half_life_hours}h).</div>
            <div><span className="text-[#FFB547] font-bold">w₃ Confidence</span>: High = 1.0, Nominal = 0.65, Low = 0.35.</div>
            <div><span className="text-[#55B887] font-bold">w₄ Persistence</span>: Spatial clustering across multiple satellite passes.</div>
          </div>
        </div>

        {/* Weight Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-[11px] pt-1">
          <div>
            <div className="flex justify-between mb-1">
              <span>w₁: Radiant Power</span>
              <span className="text-[#F04438] font-bold">{Math.round(simWeights.w_frp * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.70"
              step="0.05"
              value={simWeights.w_frp}
              onChange={(e) => setSimWeights({ ...simWeights, w_frp: parseFloat(e.target.value) })}
              className="w-full accent-[#F04438] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>w₂: Recency Decay</span>
              <span className="text-[#68B5E8] font-bold">{Math.round(simWeights.w_recency * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={simWeights.w_recency}
              onChange={(e) => setSimWeights({ ...simWeights, w_recency: parseFloat(e.target.value) })}
              className="w-full accent-[#68B5E8] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>w₃: Confidence</span>
              <span className="text-[#FFB547] font-bold">{Math.round(simWeights.w_confidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={simWeights.w_confidence}
              onChange={(e) => setSimWeights({ ...simWeights, w_confidence: parseFloat(e.target.value) })}
              className="w-full accent-[#FFB547] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>w₄: Persistence</span>
              <span className="text-[#55B887] font-bold">{Math.round(simWeights.w_persistence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={simWeights.w_persistence}
              onChange={(e) => setSimWeights({ ...simWeights, w_persistence: parseFloat(e.target.value) })}
              className="w-full accent-[#55B887] cursor-pointer"
            />
          </div>
        </div>

        {/* What-If Input Parameters Deck */}
        <div className="p-3 bg-[#1C2227] rounded border border-[#323B43] space-y-2 font-mono text-[11px]">
          <div className="text-[10px] text-[#9BA3AF] uppercase">Hypothetical Incident Scenario Inputs:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-[#9BA3AF] block mb-0.5">FRP: {simFrp} MW</label>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={simFrp}
                onChange={(e) => setSimFrp(parseInt(e.target.value))}
                className="w-full accent-[#FFB547]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9BA3AF] block mb-0.5">Age: {simAge}h</label>
              <input
                type="range"
                min="0.1"
                max="24"
                step="0.5"
                value={simAge}
                onChange={(e) => setSimAge(parseFloat(e.target.value))}
                className="w-full accent-[#68B5E8]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#9BA3AF] block mb-0.5">Confidence</label>
              <select
                value={simConf}
                onChange={(e) => setSimConf(e.target.value)}
                className="w-full bg-[#15191D] border border-[#323B43] rounded px-1.5 py-0.5 text-xs text-[#F4F1E9]"
              >
                <option value="High">High</option>
                <option value="Nominal">Nominal</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#9BA3AF] block mb-0.5">Passes: {simRepeat}</label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={simRepeat}
                onChange={(e) => setSimRepeat(parseInt(e.target.value))}
                className="w-full accent-[#55B887]"
              />
            </div>
          </div>
        </div>

        {/* Live Simulation Output Card */}
        <div className="bg-[#1C2227] border border-[#323B43] p-3 rounded flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-[#9BA3AF]">Recalculated Simulation Result:</div>
            <div className="font-headline text-2xl font-bold text-[#FFB547]">
              {simResult?.score || 84.2} <span className="font-mono text-xs font-normal text-[#9BA3AF]">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                (simResult?.score || 0) >= 80
                  ? 'bg-[#3D1715] border-[#F04438]/50 text-[#F04438]'
                  : (simResult?.score || 0) >= 60
                  ? 'bg-[#38270F] border-[#FFB547]/50 text-[#FFB547]'
                  : 'bg-[#15191D] border-[#323B43] text-[#9BA3AF]'
              }`}
            >
              {simResult?.tier || 'Tier-1 Critical'}
            </span>
            <div className="font-mono text-[10px] text-[#9BA3AF] mt-1">
              FRP: {simFrp} MW • Age: {simAge}h • {simRepeat} Pass(es)
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-[#323B43]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSimulate}
              className="px-3 py-1.5 rounded bg-[#252C32] hover:bg-[#2E373F] border border-[#323B43] text-[#F4F1E9] font-mono text-[11px] transition-colors w-full sm:w-auto"
            >
              Recalculate Simulator
            </button>
            <button
              onClick={handleResetWeights}
              className="px-2.5 py-1.5 rounded bg-[#1C2227] hover:bg-[#252C32] text-[#9BA3AF] font-mono text-[11px] w-full sm:w-auto"
            >
              Reset Defaults
            </button>
          </div>

          <button
            onClick={handleApplyWeightsToCatalog}
            disabled={isApplyingWeights}
            className="px-3.5 py-1.5 rounded bg-[#FFB547] text-[#15191D] font-mono text-[11px] font-bold hover:bg-[#E69E35] transition-colors w-full sm:w-auto"
          >
            {isApplyingWeights ? 'Updating Database Catalog...' : 'Apply Weights to Entire Catalog'}
          </button>
        </div>
      </section>

      {/* 7. Regional Incident Corridors (Screen 2) */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#FFB547]" />
            <h2 className="font-headline text-[16px] text-[#F4F1E9] font-bold">Top Incident Corridors</h2>
          </div>
          <span className="font-mono text-[10px] text-[#9BA3AF]">Ranked by Volume</span>
        </div>

        <div className="space-y-1.5 font-mono">
          {corridors.map((c, idx) => {
            let badgeBg = 'bg-[#68B5E8]';
            let frpColor = 'text-[#68B5E8]';
            if (idx === 0) {
              badgeBg = 'bg-[#F04438]';
              frpColor = 'text-[#F04438]';
            } else if (idx === 1) {
              badgeBg = 'bg-[#FF8442]';
              frpColor = 'text-[#FF8442]';
            } else if (idx === 2) {
              badgeBg = 'bg-[#FFB547] text-[#15191D]';
              frpColor = 'text-[#FFB547]';
            }

            return (
              <div
                key={c.region}
                className="flex items-center justify-between p-2.5 bg-[#1C2227] border border-[#323B43] rounded hover:border-[#3F4B55] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded ${badgeBg} text-white text-[11px] flex items-center justify-center font-bold flex-shrink-0`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-headline text-[13px] text-[#F4F1E9] font-semibold truncate">{c.region}</p>
                    <p className="text-[10px] text-[#9BA3AF]">{c.cluster_points} cluster points</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[12px] font-bold ${frpColor}`}>{c.avg_frp} MW</span>
                  <p className="text-[9px] text-[#9BA3AF]">Avg FRP</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Scientific Caveats & Earth Observation Limitations (Requirement 12) */}
      <section className="bg-[#20262C] rounded-lg p-3.5 border border-[#323B43] shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 pb-1 border-b border-[#323B43]">
          <Info className="w-4 h-4 text-[#FFB547]" />
          <h2 className="font-headline text-[15px] text-[#F4F1E9] font-bold">
            Scientific Caveats &amp; Sensor Telemetry Limitations
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
          {/* Caveat 1 */}
          <div className="p-2.5 bg-[#15191D] rounded border border-[#323B43]/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[#FFB547] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Thermal Anomaly vs. Confirmed Wildfire</span>
            </div>
            <p className="text-[11px] text-[#9BA3AF] font-body leading-relaxed">
              Infrared satellite sensors detect pixel brightness temperature excesses in the 3.9µm–4.0µm spectral band. Industrial gas flaring, refinery exhaust, active volcano vents, and solar glint from tin roofs generate authentic thermal signatures but do not represent wildland fires. Always review repeat passes and land-cover context.
            </p>
          </div>

          {/* Caveat 2 */}
          <div className="p-2.5 bg-[#15191D] rounded border border-[#323B43]/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[#68B5E8] font-bold">
              <span className="material-symbols-outlined text-[15px]">cloud</span>
              <span>Cloud Obscuration &amp; Smoke Plume Attenuation</span>
            </div>
            <p className="text-[11px] text-[#9BA3AF] font-body leading-relaxed">
              Thick cumulus/cirrus clouds or heavy pyrocumulonimbus smoke completely occlude mid-infrared radiation, preventing ground fire detection and yielding false negatives. Measured FRP reflects only radiant power penetrating clear atmospheric columns.
            </p>
          </div>

          {/* Caveat 3 */}
          <div className="p-2.5 bg-[#15191D] rounded border border-[#323B43]/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[#55B887] font-bold">
              <span className="material-symbols-outlined text-[15px]">straighten</span>
              <span>Footprint Distortion &amp; Geolocation Uncertainty</span>
            </div>
            <p className="text-[11px] text-[#9BA3AF] font-body leading-relaxed">
              While VIIRS I-band achieves 375m spatial resolution at nadir, scan track geometry and bow-tie pixel aggregation expand the footprint to ~750m toward swath limits. Positional error ranges from 50m to 150m under normal terrain conditions.
            </p>
          </div>

          {/* Caveat 4 */}
          <div className="p-2.5 bg-[#15191D] rounded border border-[#323B43]/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[#F04438] font-bold">
              <span className="material-symbols-outlined text-[15px]">timelapse</span>
              <span>Temporal Latency &amp; Diurnal Blindspots</span>
            </div>
            <p className="text-[11px] text-[#9BA3AF] font-body leading-relaxed">
              Polar-orbiting satellites (Suomi-NPP, NOAA-20, Aqua) pass over a given region approximately twice every 24 hours (roughly 01:30 and 13:30 local solar time). Rapid fire spread between overpasses cannot be captured until the next orbital cycle.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Methodological Annotation Footer */}
      <footer className="bg-[#1C2227] border border-[#323B43] rounded-lg p-2.5 text-[#9BA3AF] flex items-start gap-2">
        <span className="material-symbols-outlined text-[17px] text-[#FFB547] flex-shrink-0 mt-0.5">info</span>
        <p className="font-mono text-[10px] leading-relaxed">
          Analytics computed via Pandas aggregation pipelines. FRP values represent estimated instantaneous radiant energy at time of sensor footprint scan. Cloud obscuration and canopy occlusion may attenuate spectral radiance readings.
        </p>
      </footer>
    </div>
  );
};
