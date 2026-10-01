import React, { useState, useEffect, useCallback } from 'react';
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
  Target
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
  [JOB_STATUS.PROCESSING]: { label: 'Processing', badge: 'purple', color: 'text-indigo-600', icon: Zap },
  [JOB_STATUS.COMPLETED]: { label: 'Completed', badge: 'success', color: 'text-emerald-600', icon: CheckCircle2 },
  [JOB_STATUS.FAILED]: { label: 'Failed', badge: 'danger', color: 'text-rose-600', icon: XCircle },
  [JOB_STATUS.CANCELLED]: { label: 'Cancelled', badge: 'default', color: 'text-slate-600', icon: Ban },
};

/**
 * JobDetailsPage (Step 5 & Step 7)
 *
 * Dedicated inspection page for any ETL processing job:
 * - Dataset metadata (name, format, size, ID)
 * - Job status & lifecycle
 * - Start/end time & duration
 * - Processing statistics (processed, successful, failed, success rate)
 * - Performance metrics (rows/sec, streaming throughput)
 * - Errors UI (embedded FailedRecordsTable)
 * - Actions (View Live Dashboard, Retry, Cancel, View Errors)
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
  const [cancelLoading, setCancelLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'errors' | 'performance'

  // Fetch job details
  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await jobService.getJob(jobId);
      if (res?.job) {
        setJob(res.job);
        // Attempt to fetch dataset metadata if datasetId is present
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

  // Cancel Job Action (Step 7)
  const handleCancelJob = async () => {
    if (!jobId) return;
    setCancelLoading(true);
    try {
      const res = await jobService.cancelJob(jobId);
      if (res?.job) {
        setJob(res.job);
      }
      setShowCancelModal(false);
    } catch (err) {
      alert(err.message || 'Failed to cancel job');
    } finally {
      setCancelLoading(false);
    }
  };

  // Retry Job Action (Step 7)
  const handleRetryJob = async () => {
    if (!job?.datasetId) {
      alert('Cannot retry: dataset reference missing');
      return;
    }
    setRetryLoading(true);
    try {
      const res = await jobService.createJob({ datasetId: job.datasetId, autoStart: true });
      if (res?.job?.jobId) {
        navigate(`/processing/${res.job.jobId}?dataset=${encodeURIComponent(datasetMeta?.filename || 'Dataset')}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to retry job');
    } finally {
      setRetryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Job Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 mb-5">{error || `No job found with ID: ${jobId}`}</p>
        <Link to="/jobs">
          <Button variant="primary" leftIcon={ArrowLeft}>
            Back to Jobs
          </Button>
        </Link>
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
  let durationText = '—';
  if (job.startedAt && job.completedAt) {
    const sec = Math.max(1, Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000));
    durationText = formatDuration(sec);
  } else if (job.startedAt) {
    const sec = Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 1000));
    durationText = `${formatDuration(sec)} (running)`;
  }

  const successRate = processedRows > 0
    ? ((successfulRows / processedRows) * 100).toFixed(1)
    : '—';

  // Action states (Step 7)
  const canCancel = status === JOB_STATUS.PROCESSING || status === JOB_STATUS.QUEUED;
  const canRetry = status === JOB_STATUS.FAILED || status === JOB_STATUS.CANCELLED || status === JOB_STATUS.COMPLETED;
  const isRunning = status === JOB_STATUS.PROCESSING || status === JOB_STATUS.QUEUED;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ArrowLeft}
            onClick={() => navigate('/jobs')}
            className="text-slate-600 hover:text-slate-900"
          >
            All Jobs
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Job Details
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

        {/* ── Action Buttons (Step 7) ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={fetchJob}
          >
            Refresh
          </Button>

          {isRunning && (
            <Link to={`/processing/${job.jobId}`}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Activity}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Live Dashboard
              </Button>
            </Link>
          )}

          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Ban}
              onClick={() => setShowCancelModal(true)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
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
              onClick={handleRetryJob}
            >
              Retry Job
            </Button>
          )}
        </div>
      </div>

      {/* ── Key Metrics Ribbon (Step 5 Processing Stats) ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {totalRows > 0 ? formatNumber(totalRows) : formatNumber(processedRows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{formatNumber(processedRows)} streamed</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Successful</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {formatNumber(successfulRows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{successRate}% rate</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Failed Records</div>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {formatNumber(failedRows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {failedRows > 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab('errors')}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Inspect failures →
              </button>
            ) : '0 errors'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Throughput</div>
          <div className="text-xl font-bold font-mono text-purple-600 mt-1">
            {formatNumber(rowsPerSecond)} <span className="text-xs font-normal">r/s</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Stream speed</div>
        </Card>

        <Card className="p-4 col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {durationText}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {job.startedAt ? formatDate(job.startedAt) : 'Not started'}
          </div>
        </Card>
      </div>

      {/* ── Progress Bar Card (for active/queued jobs) ────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="text-slate-700 dark:text-slate-300">Execution Progress</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
        </div>
        <ProgressBar
          progress={progressPercent}
          size="md"
          variant={status === JOB_STATUS.COMPLETED ? 'emerald' : status === JOB_STATUS.FAILED ? 'rose' : 'indigo'}
        />
      </Card>

      {/* ── Tab Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'overview'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Job Overview & Dataset
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'errors'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Failed Records
          {errors.length > 0 && (
            <Badge variant="danger" size="sm">
              {formatNumber(errors.length)}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'performance'
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Performance & Diagnostics
        </button>
      </div>

      {/* ── Tab 1: Overview & Dataset Metadata (Step 5) ───────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Dataset Information Card */}
          <Card className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Source Dataset Details
            </h3>
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Dataset Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {datasetMeta?.filename || datasetMeta?.originalName || job.datasetId || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Format</span>
                <Badge variant="info" size="sm">
                  {(datasetMeta?.format || 'CSV').toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">File Size</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {datasetMeta?.size ? formatBytes(datasetMeta.size) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Dataset ID</span>
                <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {job.datasetId}
                </code>
              </div>
              {job.datasetId && (
                <div className="pt-3 flex justify-end">
                  <Link
                    to={`/datasets/${job.datasetId}/preview`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    Open Dataset Preview <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Job Lifecycle & Timing Card (Step 5) */}
          <Card className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              Execution Lifecycle
            </h3>
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Status</span>
                <div className="flex items-center gap-1.5 font-semibold">
                  <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                  <span className={cfg.color}>{cfg.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Created At</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {job.createdAt ? formatDate(job.createdAt) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Started At</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {job.startedAt ? formatDate(job.startedAt) : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Completed At</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {job.completedAt ? formatDate(job.completedAt) : isRunning ? 'In Progress…' : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-500">Total Duration</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {durationText}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab 2: Failed Records UI (Step 6) ─────────────────────────────────── */}
      {activeTab === 'errors' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Failed Records ({formatNumber(errors.length || failedRows)})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rows that encountered schema mismatches, type coercion failures, or validation rejections.
              </p>
            </div>
          </div>

          <FailedRecordsTable
            errors={errors}
            totalFailedCount={failedRows}
            datasetName={datasetMeta?.filename || job.datasetId}
          />
        </Card>
      )}

      {/* ── Tab 3: Performance & Diagnostics (Step 5) ────────────────────────── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Stream Engine Performance Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Throughput Rate</div>
                <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                  {formatNumber(rowsPerSecond)} <span className="text-xs font-normal">rows/sec</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Live streaming backpressure rate</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Data Integrity</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {successRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Successful vs total rows ratio</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Memory Profile</div>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  Flat O(1)
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Bounded streaming buffer</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Cancel Job Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Job Processing?"
        description="Are you sure you want to stop this ETL job? Records processed prior to cancellation will be preserved."
      >
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
    </div>
  );
}

export default JobDetailsPage;
