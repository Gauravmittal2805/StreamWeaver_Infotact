import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Play,
  RotateCcw,
  Ban,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Layers,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  Activity,
  Database,
  ExternalLink,
  Target,
  Server,
  BarChart3,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import FailedRecordsTable from '../components/processing/FailedRecordsTable';
import { jobService } from '../services/jobService';
import { fileService } from '../services/fileService';
import { JOB_STATUS } from '../hooks/useProcessingJob';
import { formatNumber, formatDate, formatDuration, formatBytes } from '../utils/formatters';

const STATUS_CONFIG = {
  [JOB_STATUS.QUEUED]: { label: 'Queued', badge: 'warning', color: 'text-amber-600', icon: Clock },
  [JOB_STATUS.RETRYING]: { label: 'Retrying', badge: 'warning', color: 'text-amber-600', icon: RefreshCw },
  [JOB_STATUS.PROCESSING]: { label: 'Processing', badge: 'purple', color: 'text-indigo-600', icon: Zap },
  [JOB_STATUS.COMPLETED]: { label: 'Completed', badge: 'success', color: 'text-emerald-600', icon: CheckCircle2 },
  [JOB_STATUS.FAILED]: { label: 'Failed', badge: 'danger', color: 'text-rose-600', icon: XCircle },
  [JOB_STATUS.CANCELLED]: { label: 'Cancelled', badge: 'default', color: 'text-slate-600', icon: Ban },
};

/**
 * JobDetailsPage (Requirement 4)
 *
 * Dedicated inspection page for any ETL processing job:
 * Sections:
 * 1. Overview: Dataset, Status, Duration, Total rows
 * 2. Performance: Rows/sec, Processing time, Batch information
 * 3. Results: Successful rows, Failed rows
 * 4. Errors: Error types, Failed records
 */
export function JobDetailsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Modals & Actions
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [retryError, setRetryError] = useState(null);

  // Section Tab Navigation: 'all' | 'overview' | 'performance' | 'results' | 'errors'
  const [activeSection, setActiveSection] = useState('all');

  // Fetch job details
  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await jobService.getJob(jobId);
      if (res?.job) {
        setJob(res.job);
        if (res.job.datasetId) {
          try {
            const dsRes = await fileService.getDataset(res.job.datasetId);
            if (dsRes?.dataset) {
              setDatasetMeta(dsRes.dataset);
            }
          } catch {
            // Non-critical if dataset metadata fails
          }
        }
      } else {
        throw new Error(res?.error?.message || 'Job not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Copy Job ID
  const handleCopyJobId = () => {
    if (!jobId) return;
    navigator.clipboard.writeText(jobId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Cancel Job Action (Requirement 7)
  const handleCancelJob = async () => {
    if (!jobId) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await jobService.cancelJob(jobId);
      if (res?.job) {
        setJob(res.job);
      }
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel job');
    } finally {
      setCancelLoading(false);
    }
  };

  // Retry Job Action (Requirement 6)
  const handleRetryJob = async () => {
    if (!job?.jobId) return;
    setRetryLoading(true);
    setRetryError(null);
    try {
      await jobService.retryJob(job.jobId);
      setShowRetryModal(false);
      navigate(`/processing/${job.jobId}`);
    } catch (err) {
      setRetryError(err.message || 'Failed to retry job');
    } finally {
      setRetryLoading(false);
    }
  };

  // Error type breakdown calculation
  const errorTypeBreakdown = useMemo(() => {
    if (!job?.errors || !Array.isArray(job.errors)) return [];
    const counts = {};
    job.errors.forEach(err => {
      const type = err.type || 'VALIDATION_ERROR';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count }));
  }, [job?.errors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading Job Diagnostics…</p>
          <p className="text-xs text-slate-400 font-mono">Job {jobId}</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <Card className="p-10 text-center max-w-lg mx-auto">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Job Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{error || `No ETL execution job found matching ID: ${jobId}`}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/history">
            <Button variant="primary" leftIcon={ArrowLeft}>
              View Job History
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchJob} leftIcon={RefreshCw}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const status = job.status || JOB_STATUS.QUEUED;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
  const StatusIcon = cfg.icon;

  const totalRows = Number(job.totalRows ?? 0);
  const processedRows = Number(job.processedRows ?? 0);
  const successfulRows = Number(job.successfulRows ?? 0);
  const failedRows = Number(job.failedRows ?? 0);
  const progressPercent = Number(job.progressPercent ?? 0);
  const rowsPerSecond = Number(job.rowsPerSecond ?? 0);
  const errors = Array.isArray(job.errors) ? job.errors : [];

  // Duration
  let durationSeconds = 0;
  if (job.startedAt && job.completedAt) {
    durationSeconds = Math.max(1, Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000));
  } else if (job.startedAt) {
    durationSeconds = Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 1000));
  }
  const durationText = durationSeconds > 0 ? formatDuration(durationSeconds) : '—';

  const successRate = processedRows > 0
    ? ((successfulRows / processedRows) * 100).toFixed(1)
    : '—';

  const isRunning = status === JOB_STATUS.PROCESSING || status === JOB_STATUS.QUEUED || status === JOB_STATUS.RETRYING;
  const canCancel = isRunning;
  const canRetry = status === JOB_STATUS.FAILED || status === JOB_STATUS.CANCELLED || status === JOB_STATUS.COMPLETED;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ArrowLeft}
            onClick={() => navigate('/history')}
            className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            History
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Job Details & Analytics
              </h1>
              <Badge variant={cfg.badge} size="sm">
                {cfg.label.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
              <span>{job.jobId}</span>
              <button
                type="button"
                onClick={handleCopyJobId}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                title="Copy Job ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Action Buttons (Requirement 6 & 7) ─────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={fetchJob}
            className="text-xs"
          >
            Refresh
          </Button>

          {isRunning && (
            <Link to={`/processing/${job.jobId}`}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Activity}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Live Monitor
              </Button>
            </Link>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Ban}
              onClick={() => setShowCancelModal(true)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
            >
              Cancel Job
            </Button>
          )}

          {canRetry && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={RotateCcw}
              isLoading={retryLoading}
              onClick={() => setShowRetryModal(true)}
              className="text-xs font-semibold shadow-xs"
            >
              Retry Job
            </Button>
          )}
        </div>
      </div>

      {/* ── Section Navigation Filter ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All Sections' },
          { id: 'overview', label: 'Overview' },
          { id: 'performance', label: 'Performance' },
          { id: 'results', label: 'Results' },
          { id: 'errors', label: `Errors (${formatNumber(errors.length || failedRows)})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              activeSection === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SECTION 1: OVERVIEW (Requirement 4) ──────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'overview') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Job Overview & Dataset Specifications
            </h2>
            <Badge variant={cfg.badge} size="sm">
              {cfg.label.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dataset */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dataset</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1 truncate block" title={datasetMeta?.filename || job.datasetId}>
                {datasetMeta?.filename || datasetMeta?.originalName || job.datasetId}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Format: {(datasetMeta?.format || 'CSV').toUpperCase()}
                {datasetMeta?.size ? ` · ${formatBytes(datasetMeta.size)}` : ''}
              </span>
            </div>

            {/* Status */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Status</span>
              <div className="flex items-center gap-1.5 font-bold text-sm mt-1">
                <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                <span className={cfg.color}>{cfg.label}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {progressPercent}% execution progress
              </span>
            </div>

            {/* Duration */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Execution Duration</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                {durationText}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Started: {job.startedAt ? formatDate(job.startedAt) : 'Not started'}
              </span>
            </div>

            {/* Total Rows */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rows</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                {totalRows > 0 ? formatNumber(totalRows) : formatNumber(processedRows)}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
                {formatNumber(processedRows)} processed
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 2: PERFORMANCE (Requirement 4) ──────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'performance') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Engine Performance & Batch Architecture
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Live Backpressure Metric
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rows/sec */}
            <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60">
              <span className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-semibold block">
                Throughput Rate (Rows/sec)
              </span>
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                {formatNumber(rowsPerSecond)} <span className="text-xs font-normal text-slate-500">rows/s</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Streaming worker throughput velocity
              </p>
            </div>

            {/* Processing Time */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Total Processing Time
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {durationText}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {job.completedAt ? `Completed at ${formatDate(job.completedAt)}` : 'Job currently in progress'}
              </p>
            </div>

            {/* Batch Information */}
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-semibold block">
                Batch Information
              </span>
              <div className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                1,000 docs / buffer batch
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                MongoDB bulk write stream with flat O(1) memory
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 3: RESULTS (Requirement 4) ──────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'results') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Stream Execution Results
            </h2>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {successRate}% Integrity Score
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Successful Rows */}
            <div className="p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Successful Rows
                </span>
                <Badge variant="success" size="sm">
                  COMMITTED
                </Badge>
              </div>
              <div className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {formatNumber(successfulRows)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Records transformed, verified, and saved to destination stream.
              </p>
            </div>

            {/* Failed Rows */}
            <div className="p-5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Failed Rows
                </span>
                <Badge variant={failedRows > 0 ? 'danger' : 'default'} size="sm">
                  {failedRows > 0 ? `${formatNumber(failedRows)} REJECTIONS` : '0 ERRORS'}
                </Badge>
              </div>
              <div className="text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
                {formatNumber(failedRows)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {failedRows > 0
                  ? 'Records encountering validation constraints or parsing anomalies.'
                  : 'Perfect stream execution with zero recorded failure events.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── SECTION 4: ERRORS (Requirement 4) ────────────────────────────────── */}
      {(activeSection === 'all' || activeSection === 'errors') && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Error Diagnostics & Failed Records ({formatNumber(errors.length || failedRows)})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive classification of failure events and raw payload inspection.
              </p>
            </div>
          </div>

          {/* Error Types Summary */}
          {errorTypeBreakdown.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Classified Error Types
              </span>
              <div className="flex flex-wrap gap-2">
                {errorTypeBreakdown.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  >
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{item.type}</span>
                    <Badge variant="danger" size="sm">
                      {formatNumber(item.count)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Records Table Component (Requirement 5) */}
          <FailedRecordsTable
            errors={errors}
            totalFailedCount={failedRows}
            datasetName={datasetMeta?.filename || job.datasetId}
          />
        </Card>
      )}

      {/* ── Cancel Confirmation Modal (Requirement 7) ─────────────────────────── */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelError(null); }}
        title="Cancel Job Processing?"
        description="Are you sure you want to cancel this processing job? This will stop the streaming ETL pipeline. Records already written will be preserved."
      >
        {cancelError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-3">
            {cancelError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowCancelModal(false)}>
            Keep Running
          </Button>
          <Button
            variant="danger"
            leftIcon={Ban}
            isLoading={cancelLoading}
            onClick={handleCancelJob}
          >
            Cancel Job
          </Button>
        </div>
      </Modal>

      {/* ── Retry Confirmation Modal (Requirement 6) ──────────────────────────── */}
      <Modal
        isOpen={showRetryModal}
        onClose={() => { setShowRetryModal(false); setRetryError(null); }}
        title="Retry Processing Job?"
        description="Are you sure you want to retry this processing job? This will re-initialize the stream and process all records from the source dataset."
      >
        {retryError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-3">
            {retryError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowRetryModal(false)}>
            Dismiss
          </Button>
          <Button
            variant="primary"
            leftIcon={RotateCcw}
            isLoading={retryLoading}
            onClick={handleRetryJob}
          >
            Retry Job
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default JobDetailsPage;
