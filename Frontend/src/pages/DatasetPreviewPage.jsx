import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Search,
  Download,
  WifiOff,
  FileX,
  ServerCrash,
  FileQuestion,
  BarChart3,
  Rows,
  Columns,
  HardDrive,
  FileType,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import VirtualizedGrid from '../components/ui/VirtualizedGrid';
import StatusBadge from '../components/common/StatusBadge';
import { fileService } from '../services/fileService';
import { formatBytes, formatDate, formatNumber } from '../utils/formatters';

// ─── Error type classification ─────────────────────────────────────────────────
function classifyError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('not found') || msg.includes('404')) {
    return {
      type: 'not_found',
      title: 'Dataset not found.',
      description: 'The requested dataset does not exist or has been deleted.',
      icon: FileX,
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-100',
      borderColor: 'border-slate-200',
    };
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connect') || msg.includes('offline')) {
    return {
      type: 'network',
      title: 'Connection interrupted.',
      description: 'Please check your network connection and try again.',
      icon: WifiOff,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      borderColor: 'border-amber-200',
    };
  }
  if (msg.includes('unsupported') || msg.includes('format') || msg.includes('parse')) {
    return {
      type: 'unsupported',
      title: 'Preview not available for this file format.',
      description: 'StreamWeaver currently supports CSV and JSON dataset previews.',
      icon: FileQuestion,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      borderColor: 'border-purple-200',
    };
  }
  return {
    type: 'server',
    title: 'Unable to load dataset preview.',
    description: err?.message || 'An unexpected error occurred while loading the preview.',
    icon: ServerCrash,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    borderColor: 'border-rose-200',
  };
}

// ─── Statistics pill ────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${accents[accent] || accents.indigo}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 leading-none">{label}</p>
        <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Loading skeleton table ────────────────────────────────────────────────────
function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="enterprise-card rounded-xl overflow-hidden">
      {/* Header skeleton */}
      <div className="h-10 bg-slate-100 flex items-center gap-4 px-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-3 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 h-11 border-b border-slate-100 ${
            i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
          }`}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="flex-1 h-3 bg-slate-200 rounded animate-pulse"
              style={{ opacity: 1 - j * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function DatasetPreviewPage() {
  const { datasetId } = useParams();

  // ── State ─────────────────────────────────────────────────────────────────
  const [metaLoading, setMetaLoading] = useState(true);
  const [dataLoading, setDataLoading]  = useState(true);
  const [error, setError]              = useState(null);
  const [datasetMeta, setDatasetMeta]  = useState(null);
  const [previewData, setPreviewData]  = useState(null);
  const [searchTerm, setSearchTerm]    = useState('');
  const [copiedId, setCopiedId]        = useState(false);

  const abortRef = useRef(null);

  // ── Fetch metadata ─────────────────────────────────────────────────────────
  const fetchMeta = useCallback(async () => {
    if (!datasetId) return;
    setMetaLoading(true);
    try {
      const result = await fileService.getDataset(datasetId);
      if (result?.dataset) {
        setDatasetMeta(result.dataset);
      }
    } catch {
      // Meta fetch failed — keep null, preview will show what it can
    } finally {
      setMetaLoading(false);
    }
  }, [datasetId]);

  // ── Fetch preview data ────────────────────────────────────────────────────
  const fetchPreview = useCallback(async () => {
    if (!datasetId) return;
    setDataLoading(true);
    setError(null);

    try {
      const result = await fileService.getDatasetPreview(datasetId, {
        limit: 1000,
        fallbackMock: false,
      });
      setPreviewData(result);
    } catch (err) {
      setError(err);
    } finally {
      setDataLoading(false);
    }
  }, [datasetId]);

  // ── On mount: fetch both concurrently ────────────────────────────────────
  useEffect(() => {
    let active = true;
    setMetaLoading(true);
    setDataLoading(true);
    setError(null);
    setDatasetMeta(null);
    setPreviewData(null);

    Promise.allSettled([
      fileService.getDataset(datasetId),
      fileService.getDatasetPreview(datasetId, { limit: 1000, fallbackMock: false }),
    ]).then(([metaRes, previewRes]) => {
      if (!active) return;

      // Metadata
      if (metaRes.status === 'fulfilled' && metaRes.value?.dataset) {
        setDatasetMeta(metaRes.value.dataset);
      }
      setMetaLoading(false);

      // Preview
      if (previewRes.status === 'fulfilled' && previewRes.value) {
        setPreviewData(previewRes.value);
        setError(null);
      } else {
        setError(previewRes.reason || new Error('Failed to generate dataset preview'));
      }
      setDataLoading(false);
    });

    return () => { active = false; };
  }, [datasetId]);

  // ── Retry handler ──────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    fetchPreview();
    if (!datasetMeta) fetchMeta();
  }, [fetchPreview, fetchMeta, datasetMeta]);

  // ── Copy dataset ID ────────────────────────────────────────────────────────
  const handleCopyId = useCallback(() => {
    if (!datasetId) return;
    navigator.clipboard.writeText(datasetId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [datasetId]);

  // ── In-memory search filter ────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!previewData?.rows) return [];
    if (!searchTerm.trim()) return previewData.rows;
    const term = searchTerm.toLowerCase();
    return previewData.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [previewData, searchTerm]);

  // ── Export sample as JSON ──────────────────────────────────────────────────
  const handleExportSample = useCallback(() => {
    if (!filteredRows.length) return;
    const jsonStr = JSON.stringify(filteredRows.slice(0, 100), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetMeta?.filename || 'dataset'}-sample.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRows, datasetMeta]);

  // ── Derived display values ──────────────────────────────────────────────────
  const displayName = datasetMeta?.filename || previewData?.filename || datasetId || 'Dataset Preview';
  const displayFormat = (datasetMeta?.format || previewData?.format || 'csv').toLowerCase();
  const displaySize = datasetMeta?.size;
  const displayStatus = datasetMeta?.status;
  const displayUploadedAt = datasetMeta?.uploadedAt;
  const totalRecordsEstimated = previewData?.totalRecordsEstimated;
  const previewRowCount = filteredRows.length;
  const columnCount = previewData?.columns?.length || (previewData?.rows?.[0] ? Object.keys(previewData.rows[0]).length : 0);

  const isLoading = metaLoading || dataLoading;
  const errInfo = error ? classifyError(error) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Top navigation bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link to="/datasets">
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-slate-600 hover:text-slate-900">
            Back to Datasets
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={handleRetry}
            isLoading={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={Download}
            onClick={handleExportSample}
            disabled={isLoading || !previewData || filteredRows.length === 0}
          >
            Export Sample
          </Button>
        </div>
      </div>

      {/* ── Dataset header card ─────────────────────────────────────────────── */}
      <Card className="p-5 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

          {/* Left: icon + title + meta */}
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border shrink-0 shadow-xs ${
              displayFormat === 'json'
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {displayFormat === 'json'
                ? <FileCode className="w-7 h-7" />
                : <FileSpreadsheet className="w-7 h-7" />
              }
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 truncate">
                  {displayName}
                </h2>
                <Badge variant={displayFormat === 'json' ? 'purple' : 'info'} size="md">
                  {displayFormat.toUpperCase()}
                </Badge>
                {displayStatus && <StatusBadge status={displayStatus} size="md" />}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono">
                {displaySize && (
                  <span>Size: <strong className="text-slate-700">{formatBytes(displaySize)}</strong></span>
                )}
                {displayUploadedAt && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>Uploaded: <strong className="text-slate-700">{formatDate(displayUploadedAt)}</strong></span>
                  </>
                )}
                <span className="text-slate-300">•</span>
                <div className="inline-flex items-center gap-1 text-slate-400">
                  <span>ID: {datasetId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-0.5 hover:text-slate-700 rounded cursor-pointer transition-colors"
                    title="Copy dataset ID"
                  >
                    {copiedId
                      ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Statistics pills (Step 10) — only when data is ready ── */}
        {!dataLoading && previewData && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              {totalRecordsEstimated && totalRecordsEstimated > previewRowCount && (
                <StatPill
                  icon={BarChart3}
                  label="Total Records"
                  value={formatNumber(totalRecordsEstimated)}
                  accent="indigo"
                />
              )}
              <StatPill
                icon={Rows}
                label="Preview Rows"
                value={`${formatNumber(previewRowCount)} rows`}
                accent="emerald"
              />
              <StatPill
                icon={Columns}
                label="Columns"
                value={`${columnCount} columns`}
                accent="sky"
              />
              {displaySize && (
                <StatPill
                  icon={HardDrive}
                  label="File Size"
                  value={formatBytes(displaySize)}
                  accent="amber"
                />
              )}
              <StatPill
                icon={FileType}
                label="Format"
                value={displayFormat.toUpperCase()}
                accent="indigo"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Showing first 1,000 records — backend streams only preview rows, not the full dataset.
            </p>
          </div>
        )}
      </Card>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      {!isLoading && !error && previewData && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search across all columns..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
              <span className="font-mono font-bold text-slate-800">{formatNumber(filteredRows.length)}</span>
              {' '}matching rows
            </div>
          )}
        </div>
      )}

      {/* ── Main content area ───────────────────────────────────────────────── */}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {/* Status message card */}
          <Card className="p-6 bg-white border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Preparing dataset preview…</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Loading first 1,000 records — the backend streams only this slice, not the full file.
                </p>
              </div>
            </div>
          </Card>

          {/* Skeleton table */}
          <TableSkeleton rows={8} cols={6} />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && errInfo && (
        <Card className={`p-8 sm:p-12 text-center bg-white ${errInfo.borderColor} shadow-xs`}>
          <div className="max-w-md mx-auto space-y-4">
            <div className={`w-12 h-12 rounded-2xl ${errInfo.iconBg} ${errInfo.iconColor} flex items-center justify-center mx-auto border ${errInfo.borderColor}`}>
              <errInfo.icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">{errInfo.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{errInfo.description}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to="/datasets">
                <Button variant="outline">Back to Datasets</Button>
              </Link>
              <Button variant="primary" leftIcon={RefreshCw} onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Success: virtualized grid */}
      {!isLoading && !error && previewData && (
        <VirtualizedGrid
          columns={previewData.columns || []}
          rows={filteredRows}
          height={580}
          rowHeight={42}
        />
      )}
    </div>
  );
}

export default DatasetPreviewPage;
