import React, { useState } from 'react';
import { Download, RefreshCw, Upload, RotateCcw, FileText, Globe } from 'lucide-react';
import { resetSyntheticDataset, API_BASE } from '../api';

interface HeaderProps {
  onOpenUpload: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNotification?: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onRefresh,
  isRefreshing,
  onNotification
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!confirm('Reset observation catalog to 1,248 synthetic demonstration observations?')) return;
    setIsResetting(true);
    try {
      const res = await resetSyntheticDataset();
      onRefresh();
      if (onNotification) onNotification(res.message);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/api') ? url.slice(4) : url}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShowExportMenu(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#15191D]/95 backdrop-blur-md border-b border-[#323B43] pt-safe">
      <div className="h-16 px-4 flex items-center justify-between gap-2">
        {/* Left: Brand & Telemetry Source */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded bg-[#FFB547]/10 border border-[#FFB547]/30 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px] text-[#FFB547]">local_fire_department</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[16px] text-[#F4F1E9] font-bold tracking-tight truncate">
                FireWatch
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#103248] border border-[#68B5E8]/30 text-[#68B5E8] font-semibold uppercase tracking-wider">
                GIS-NRT
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-pulse flex-shrink-0"></span>
              <span className="font-mono text-[11px] text-[#9BA3AF] truncate">
                NASA FIRMS MODIS/VIIRS Active Ingestion - NRT
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Upload CSV */}
          <button
            onClick={onOpenUpload}
            aria-label="Upload CSV"
            title="Import Satellite Fire Observations CSV"
            className="h-9 px-2.5 flex items-center gap-1.5 rounded border border-[#323B43] bg-[#252C32] text-[#9BA3AF] hover:text-[#F4F1E9] hover:border-[#68B5E8] transition-colors font-mono text-[11px]"
          >
            <Upload className="w-4 h-4 text-[#FFB547]" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetData}
            disabled={isResetting}
            aria-label="Reset Dataset"
            title="Reload Synthetic Demonstration Dataset (1,248 Records)"
            className="h-9 px-2 flex items-center justify-center rounded border border-[#323B43] bg-[#252C32] text-[#9BA3AF] hover:text-[#FFB547] hover:border-[#FFB547] transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin text-[#FFB547]' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-label="Export Data"
              title="Export Observations & Analytical Reports"
              className="h-9 px-2.5 flex items-center gap-1.5 rounded border border-[#323B43] bg-[#252C32] text-[#9BA3AF] hover:text-[#F4F1E9] hover:border-[#68B5E8] transition-colors font-mono text-[11px]"
            >
              <Download className="w-4 h-4 text-[#68B5E8]" />
              <span className="hidden md:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-[#1C2227] border border-[#323B43] rounded shadow-xl py-1 z-50 font-mono text-[11px]">
                <button
                  onClick={() => downloadFile('/api/export/csv', 'firewatch_observations.csv')}
                  className="w-full px-3 py-2 text-left text-[#F4F1E9] hover:bg-[#252C32] flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#FFB547]" />
                  <span>Export Observations (CSV)</span>
                </button>
                <button
                  onClick={() => downloadFile('/api/export/geojson', 'firewatch_active_fires.geojson')}
                  className="w-full px-3 py-2 text-left text-[#F4F1E9] hover:bg-[#252C32] flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5 text-[#68B5E8]" />
                  <span>Export GIS Layers (GeoJSON)</span>
                </button>
                <button
                  onClick={() => downloadFile('/api/export/summary-report', 'firewatch_summary_report.md')}
                  className="w-full px-3 py-2 text-left text-[#F4F1E9] hover:bg-[#252C32] flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#55B887]" />
                  <span>Executive Summary (MD)</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Telemetry */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh Telemetry"
            title="Refresh Telemetry Feed"
            className="w-9 h-9 flex items-center justify-center rounded border border-[#323B43] bg-[#252C32] text-[#9BA3AF] hover:text-[#F4F1E9] hover:border-[#68B5E8] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#68B5E8]' : ''}`} />
          </button>

          {/* Analyst Profile */}
          <div className="flex items-center pl-1">
            <div className="w-8 h-8 rounded border border-[#323B43] bg-[#252C32] flex items-center justify-center text-[#FFB547] font-mono text-xs font-bold ring-1 ring-[#FFB547]/30">
              AN
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
