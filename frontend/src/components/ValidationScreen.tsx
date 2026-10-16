import React, { useState, useEffect } from 'react';
import { uploadCsvFile, previewCsvFile, fetchImportHistory, fetchFirmsStatus, syncFirmsData, verifyFirmsKey, API_BASE } from '../api';
import type { ValidationReport, ValidationRowError, CsvPreviewResult } from '../types';
import { Upload, FileCheck, AlertCircle, Download, CheckCircle2, RefreshCw, Satellite, Table, XCircle, Check, Key, ShieldCheck } from 'lucide-react';

interface ValidationScreenProps {
  onImportComplete: () => void;
}

export const ValidationScreen: React.FC<ValidationScreenProps> = ({ onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<CsvPreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [latestReport, setLatestReport] = useState<{
    summary: any;
    errors: ValidationRowError[];
    sample_records: any[];
  } | null>(null);
  const [history, setHistory] = useState<ValidationReport[]>([]);
  const [firmsStatus, setFirmsStatus] = useState<{
    configured: boolean;
    key_env_var: string;
    masked_key?: string | null;
    live_records_count?: number;
    message: string;
  } | null>(null);
  const [isSyncingFirms, setIsSyncingFirms] = useState(false);
  const [firmsSyncResult, setFirmsSyncResult] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [firmsTestResult, setFirmsTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadHistory = async () => {
    try {
      const data = await fetchImportHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load import history:', err);
    }
  };

  const loadFirmsStatus = async () => {
    try {
      const data = await fetchFirmsStatus();
      setFirmsStatus(data);
    } catch (err) {
      console.error('Failed to load FIRMS status:', err);
    }
  };

  useEffect(() => {
    loadHistory();
    loadFirmsStatus();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewData(null);
      setPreviewError(null);
      setLatestReport(null);
      setIsPreviewing(true);

      try {
        const preview = await previewCsvFile(file);
        setPreviewData(preview);
      } catch (err: any) {
        setPreviewError(err.message || 'Failed to inspect CSV file structure.');
      } finally {
        setIsPreviewing(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const res = await uploadCsvFile(selectedFile);
      setLatestReport(res);
      setPreviewData(null);
      loadHistory();
      onImportComplete();
      setSelectedFile(null);
    } catch (err: any) {
      alert(`Import validation failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setPreviewError(null);
  };

  const handleSyncFirms = async () => {
    setIsSyncingFirms(true);
    setFirmsSyncResult(null);
    try {
      const res = await syncFirmsData({
        source: 'VIIRS_NOAA20_NRT',
        area_bbox: '-125,30,-100,50',
        day_range: 1
      });
      setFirmsSyncResult(`Successfully synced ${res.new_observations_count} records from NASA FIRMS.`);
      onImportComplete();
    } catch (err: any) {
      setFirmsSyncResult(`Sync Error: ${err.message}`);
    } finally {
      setIsSyncingFirms(false);
    }
  };

  const handleTestFirmsKey = async () => {
    setIsTestingKey(true);
    setFirmsTestResult(null);
    try {
      const res = await verifyFirmsKey();
      setFirmsTestResult(res);
      loadFirmsStatus();
    } catch (err: any) {
      setFirmsTestResult({ success: false, message: `Key validation error: ${err.message}` });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 py-3 space-y-3 pb-24">
      {/* Header Banner */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#55B887]">verified</span>
            <h1 className="font-headline text-[16px] text-[#F4F1E9] font-bold">
              Data Ingestion &amp; Validation Engine
            </h1>
          </div>
          <a
            href={`${API_BASE}/sample/download`}
            download="firewatch_sample.csv"
            className="flex items-center gap-1 text-[#68B5E8] hover:underline font-mono text-[11px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </a>
        </div>
        <p className="font-body text-[12.5px] text-[#9BA3AF]">
          Enforces ISO-8601 temporal parsing, WGS 84 coordinate boundaries [-90..90, -180..180], non-negative FRP integrity, sensor schema checks, and duplicate record mitigation.
        </p>
      </section>

      {/* CSV Upload & Preview Zone */}
      <section className="bg-[#20262C] rounded-lg p-4 border border-[#323B43] shadow-sm space-y-4">
        <div className="border-2 border-dashed border-[#323B43] rounded-lg p-5 flex flex-col items-center justify-center text-center hover:border-[#68B5E8] transition-colors">
          <Upload className="w-9 h-9 text-[#FFB547] mb-2" />
          <h3 className="font-headline text-sm font-bold text-[#F4F1E9] mb-1">
            Upload NASA FIRMS / MODIS / VIIRS Observation CSV
          </h3>
          <p className="text-xs text-[#9BA3AF] max-w-md mb-3 font-body">
            Upload active fire CSV exports. The engine inspects columns, validates coordinates, checks data types, and displays a pre-import preview.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <label className="cursor-pointer px-4 py-2 rounded bg-[#252C32] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] font-mono text-xs flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#68B5E8]" />
              <span>{selectedFile ? selectedFile.name : 'Choose CSV File'}</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>

            {selectedFile && (
              <button
                onClick={handleCancelSelection}
                className="px-3 py-2 rounded bg-[#1C2227] hover:bg-[#252C32] border border-[#323B43] text-[#9BA3AF] hover:text-[#F4F1E9] font-mono text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading Preview */}
        {isPreviewing && (
          <div className="p-4 bg-[#1C2227] rounded border border-[#323B43] flex items-center justify-center gap-2 font-mono text-xs text-[#FFB547]">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Auditing CSV headers and parsing pre-ingestion sample...</span>
          </div>
        )}

        {/* Preview Error */}
        {previewError && (
          <div className="p-3 bg-[#3D1715] rounded border border-[#F04438]/60 flex items-start gap-2.5 font-mono text-xs text-[#F04438]">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">CSV Inspection Error</div>
              <div className="text-[11px] text-[#F4F1E9] mt-0.5">{previewError}</div>
            </div>
          </div>
        )}

        {/* Two-Step Pre-Ingestion Preview Report */}
        {previewData && (
          <div className="bg-[#1C2227] rounded-lg p-3.5 border border-[#323B43] space-y-3">
            {/* Header / Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#323B43]">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-[#68B5E8]" />
                <span className="font-mono text-xs font-bold text-[#F4F1E9]">
                  Pre-Ingestion Audit: {previewData.filename}
                </span>
                <span className="font-mono text-[11px] text-[#9BA3AF]">
                  (~{previewData.total_rows_estimate} rows detected)
                </span>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  previewData.is_valid_header
                    ? 'bg-[#112F21] text-[#55B887] border border-[#55B887]/50'
                    : 'bg-[#3D1715] text-[#F04438] border border-[#F04438]/50'
                }`}
              >
                {previewData.is_valid_header ? 'HEADER SCHEMA VALID' : 'MISSING REQUIRED HEADERS'}
              </span>
            </div>

            {/* Column Audit Badges */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-[10px] text-[#9BA3AF] uppercase">Detected Column Mapping:</div>
              <div className="flex flex-wrap gap-1.5">
                {previewData.headers.map((col: string) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded bg-[#15191D] border border-[#323B43] text-[#F4F1E9] text-[10px] flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 text-[#55B887]" />
                    <span>{col}</span>
                  </span>
                ))}
              </div>

              {previewData.missing_required_columns.length > 0 && (
                <div className="mt-2 p-2 rounded bg-[#3D1715] border border-[#F04438]/50 text-[#F04438] text-[11px]">
                  <span className="font-bold">Missing Required Columns:</span>{' '}
                  {previewData.missing_required_columns.join(', ')}
                </div>
              )}
            </div>

            {/* 5-Row Data Preview Table */}
            {previewData.preview_rows.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-[#9BA3AF] uppercase mb-1">
                  Sample Record Preview (First 5 Rows):
                </div>
                <div className="overflow-x-auto rounded border border-[#323B43]">
                  <table className="w-full text-left font-mono text-[10px] border-collapse bg-[#15191D]">
                    <thead>
                      <tr className="bg-[#20262C] text-[#9BA3AF] border-b border-[#323B43]">
                        {Object.keys(previewData.preview_rows[0]).map((h) => (
                          <th key={h} className="p-2 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#323B43]/50">
                      {previewData.preview_rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#1C2227]">
                          {Object.values(row).map((val: any, cidx) => (
                            <td key={cidx} className="p-2 whitespace-nowrap text-[#F4F1E9]">
                              {val !== null && val !== undefined ? String(val) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sample Errors Preview */}
            {previewData.preview_errors.length > 0 && (
              <div className="p-2 rounded bg-[#2D2114] border border-[#FFB547]/50 text-[#FFB547] font-mono text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Sample Validation Warnings (will be sanitized or rejected on commit):</span>
                </div>
                {previewData.preview_errors.map((e, i) => (
                  <div key={i} className="text-[10px] text-[#F4F1E9]">
                    Row {e.row_number}: [{e.field}] {e.error}
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#323B43]">
              <div className="text-[11px] font-mono text-[#9BA3AF]">
                {previewData.is_valid_header
                  ? 'All core telemetry parameters present. Ready for database ingestion and spatial indexing.'
                  : 'Cannot ingest: file lacks essential FIRMS coordinates or timestamp fields.'}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCancelSelection}
                  className="px-3 py-1.5 rounded bg-[#15191D] hover:bg-[#20262C] border border-[#323B43] text-[#9BA3AF] font-mono text-xs w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!previewData.is_valid_header || isUploading}
                  className="px-4 py-1.5 rounded bg-[#55B887] hover:bg-[#489e73] disabled:opacity-40 disabled:cursor-not-allowed text-[#15191D] font-mono text-xs font-bold transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting into Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Commit Ingestion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Latest Validation Report */}
      {latestReport && (
        <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#323B43]">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-[#F4F1E9]">Batch Report: {latestReport.summary.batch_id}</span>
              <span className="text-[#9BA3AF]">({latestReport.summary.filename})</span>
            </div>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                latestReport.summary.valid_rows > 0
                  ? 'bg-[#112F21] text-[#55B887] border border-[#55B887]/40'
                  : 'bg-[#3D1715] text-[#F04438] border border-[#F04438]/40'
              }`}
            >
              {latestReport.summary.status.toUpperCase()}
            </span>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 font-mono text-xs">
            <div className="bg-[#1C2227] p-2 rounded border border-[#323B43]">
              <span className="text-[#9BA3AF] text-[10px]">TOTAL ROWS</span>
              <div className="font-bold text-[#F4F1E9] text-base">{latestReport.summary.total_rows}</div>
            </div>
            <div className="bg-[#1C2227] p-2 rounded border border-[#323B43]">
              <span className="text-[#55B887] text-[10px]">VALID INGESTED</span>
              <div className="font-bold text-[#55B887] text-base">{latestReport.summary.valid_rows}</div>
            </div>
            <div className="bg-[#1C2227] p-2 rounded border border-[#323B43]">
              <span className="text-[#F04438] text-[10px]">REJECTED ROWS</span>
              <div className="font-bold text-[#F04438] text-base">{latestReport.summary.invalid_rows}</div>
            </div>
            <div className="bg-[#1C2227] p-2 rounded border border-[#323B43]">
              <span className="text-[#FFB547] text-[10px]">DUPLICATES CAUGHT</span>
              <div className="font-bold text-[#FFB547] text-base">{latestReport.summary.duplicate_rows}</div>
            </div>
          </div>

          {/* Errors List */}
          {latestReport.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#F04438] mb-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Detected Validation Errors ({latestReport.errors.length}):</span>
              </div>
              <div className="max-h-48 overflow-y-auto bg-[#15191D] border border-[#323B43] rounded p-2 divide-y divide-[#323B43]/50 font-mono text-[10px]">
                {latestReport.errors.map((err, i) => (
                  <div key={i} className="py-1 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[#F04438] font-bold">Row {err.row_number}:</span>{' '}
                      <span className="text-[#F4F1E9]">[{err.field}]</span> {err.error}
                    </div>
                    {err.value && (
                      <span className="text-[#9BA3AF] truncate max-w-[120px]">
                        Value: "{String(err.value)}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* NASA FIRMS Integration Card */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#323B43]">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-[#68B5E8]" />
            <div>
              <h2 className="font-headline text-[15px] font-bold text-[#F4F1E9]">
                NASA FIRMS Live API Connectivity
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-[#9BA3AF] mt-0.5">
                <span>Variable: <code className="text-[#FFB547]">FIRMS_MAP_KEY</code></span>
                <span>•</span>
                {firmsStatus?.configured ? (
                  <span className="text-[#55B887] flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    Key: {firmsStatus.masked_key}
                  </span>
                ) : (
                  <span className="text-[#9BA3AF]">Key: Not set in .env (Demo Mode)</span>
                )}
              </div>
            </div>
          </div>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border self-start sm:self-auto ${
              firmsStatus?.configured
                ? 'bg-[#112F21] text-[#55B887] border-[#55B887]/40'
                : 'bg-[#103248] text-[#68B5E8] border-[#68B5E8]/40'
            }`}
          >
            {firmsStatus?.configured ? 'API ACTIVE' : 'DEMO MODE'}
          </span>
        </div>

        <p className="font-body text-xs text-[#9BA3AF] leading-relaxed">
          {firmsStatus?.message ||
            'NASA FIRMS provides real-time active fire observations from VIIRS (Suomi-NPP / NOAA-20) and MODIS (Terra / Aqua). When an API key is set via FIRMS_MAP_KEY in your local .env, live satellite observations are securely proxied through the backend.'}
        </p>

        <div className="bg-[#1C2227] p-3 rounded border border-[#323B43] flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-xs">
          <div className="space-y-0.5 text-left w-full md:w-auto">
            <div className="text-[#F4F1E9] font-medium">BBox: Western North America (-125, 30, -100, 50)</div>
            <div className="text-[#9BA3AF] text-[10px]">
              Source: VIIRS_NOAA20_NRT • Cadence: 1 Day Window • Live Ingested: {firmsStatus?.live_records_count || 0} obs
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleTestFirmsKey}
              disabled={isTestingKey}
              className="w-full md:w-auto px-3 py-2 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#323B43] text-[#F4F1E9] font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-[#FFB547]" />
              <span>{isTestingKey ? 'Verifying with NASA...' : 'Test NASA Key'}</span>
            </button>

            <button
              onClick={handleSyncFirms}
              disabled={isSyncingFirms}
              className="w-full md:w-auto px-4 py-2 rounded bg-[#20262C] hover:bg-[#2D353D] border border-[#68B5E8]/50 text-[#68B5E8] font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFirms ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirms ? 'Ingesting from FIRMS...' : 'Sync Live Satellite Feed'}</span>
            </button>
          </div>
        </div>

        {/* Live Key Test Result */}
        {firmsTestResult && (
          <div className={`p-2.5 rounded border font-mono text-xs flex items-start gap-2 ${
            firmsTestResult.success
              ? 'bg-[#112F21] border-[#55B887]/60 text-[#55B887]'
              : 'bg-[#3D1715] border-[#F04438]/60 text-[#F04438]'
          }`}>
            {firmsTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{firmsTestResult.success ? 'NASA FIRMS Verification Succeeded' : 'NASA FIRMS Verification Notice'}</div>
              <div className="text-[11px] text-[#F4F1E9] mt-0.5">{firmsTestResult.message}</div>
            </div>
          </div>
        )}

        {firmsSyncResult && (
          <div className="p-2.5 rounded bg-[#1C2227] border border-[#323B43] font-mono text-xs text-[#F4F1E9]">
            {firmsSyncResult}
          </div>
        )}
      </section>

      {/* Import History */}
      <section className="bg-[#252C32] rounded-lg p-3.5 border border-[#323B43] shadow-sm">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="material-symbols-outlined text-[18px] text-[#FFB547]">history</span>
          <h2 className="font-headline text-[15px] font-bold text-[#F4F1E9]">Ingestion Audit History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#1C2227] text-[#9BA3AF] border-b border-[#323B43]">
                <th className="p-2">Batch ID</th>
                <th className="p-2">Filename</th>
                <th className="p-2">Imported (UTC)</th>
                <th className="p-2">Valid</th>
                <th className="p-2">Rejected</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#323B43]/50">
              {history.map((h) => (
                <tr key={h.batch_id} className="hover:bg-[#20262C]">
                  <td className="p-2 text-[#FFB547] font-semibold">{h.batch_id}</td>
                  <td className="p-2 text-[#F4F1E9]">{h.filename}</td>
                  <td className="p-2 text-[#9BA3AF]">{h.imported_at?.substring(0, 19).replace('T', ' ')}</td>
                  <td className="p-2 text-[#55B887] font-semibold">{h.valid_rows}</td>
                  <td className="p-2 text-[#F04438]">{h.invalid_rows}</td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.2 rounded bg-[#112F21] text-[#55B887] text-[9px] uppercase font-bold">
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
