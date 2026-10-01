import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, XCircle, Zap, Clock,
  RefreshCw, Ban, ArrowLeft, RotateCcw, Database,
  AlertTriangle, Activity, Wifi, WifiOff, Copy, Check,
  ExternalLink, Layers
} from 'lucide-react';
import { useProcessingJob, JOB_STATUS } from '../hooks/useProcessingJob';
import { fileService } from '../services/fileService';
import { jobService } from '../services/jobService';
import { formatNumber, formatDuration } from '../utils/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import FailedRecordsTable from '../components/processing/FailedRecordsTable';
import ProcessingCompletionScreen from '../components/processing/ProcessingCompletionScreen';
import ProcessingFailureScreen from '../components/processing/ProcessingFailureScreen';

// ─── Status configuration ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [JOB_STATUS.QUEUED]: {
    label: 'Queued',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badgeVariant: 'warning',
  },
  [JOB_STATUS.PROCESSING]: {
    label: 'Processing',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    badgeVariant: 'purple',
  },
  [JOB_STATUS.COMPLETED]: {
    label: 'Completed',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeVariant: 'success',
  },
  [JOB_STATUS.FAILED]: {
    label: 'Failed',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badgeVariant: 'danger',
  },
  [JOB_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    badgeVariant: 'default',
  },
};

// ─── Elapsed time counter ─────────────────────────────────────────────────────
function ElapsedTimer({ startedAt, completedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    if (completedAt) {
      setElapsed(Math.round((new Date(completedAt) - new Date(startedAt)) / 1000));
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  return <span>{formatDuration(elapsed)}</span>;
}

// ─── Main Processing Dashboard Page ──────────────────────────────────────────
export function ProcessingDashboardPage() {
  const { jobId: routeJobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [datasetMeta, setDatasetMeta] = useState(null);

  // Pipeline summary from query params (set when navigating from ProcessingStage)
  const queryDataset = searchParams.get('dataset');
  const mappingsCount = searchParams.get('mappings') || '—';
  const transformsCount = searchParams.get('transforms') || '—';
  const destination = searchParams.get('destination') || 'MongoDB / Output Stream';

  const {
    jobId, jobData, status, wsStatus,
    reconnectAttempt, maxReconnectAttempts, reconnectNow,
    attachJob, cancelJob, isRunning, isTerminal
  } = useProcessingJob();

  // On mount: attach to existing job from URL param
  useEffect(() => {
    if (routeJobId) {
      attachJob(routeJobId);
    }
  }, [routeJobId, attachJob]);

  // If datasetId is known and we haven't loaded metadata, load it
  useEffect(() => {
    if (jobData?.datasetId && !datasetMeta) {
      fileService.getDataset(jobData.datasetId)
        .then(res => {
          if (res?.dataset) {
            setDatasetMeta(res.dataset);
          }
        })
        .catch(() => {});
    }
  }, [jobData?.datasetId, datasetMeta]);

  // Copy Job ID
  const handleCopyId = () => {
    const idToCopy = jobId || routeJobId;
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy);
    setCopiedJobId(true);
    setTimeout(() => setCopiedJobId(false), 2000);
  };

  // Step 7: Cancel Action
  const handleCancel = useCallback(async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      await cancelJob();
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel job. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }, [cancelJob]);

  // Step 7: Retry Action
  const handleRetry = useCallback(async () => {
    const dsId = jobData?.datasetId;
    if (!dsId) {
      alert('Unable to retry: source dataset ID is missing');
      return;
    }
    setRetryLoading(true);
    try {
      const res = await jobService.createJob({ datasetId: dsId, autoStart: true });
      if (res?.job?.jobId) {
        navigate(`/processing/${res.job.jobId}?dataset=${encodeURIComponent(queryDataset || datasetMeta?.filename || 'Dataset')}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to retry job');
    } finally {
      setRetryLoading(false);
    }
  }, [jobData?.datasetId, navigate, queryDataset, datasetMeta]);

  // Derive metrics from jobData (Guaranteed never to reset backwards or zero out)
  const progress = Number(jobData?.progressPercent ?? 0);
  const processedRows = Number(jobData?.processedRows ?? 0);
  const totalRows = Number(jobData?.totalRows ?? 0);
  const successfulRows = Number(jobData?.successfulRows ?? 0);
  const failedRows = Number(jobData?.failedRows ?? 0);
  const rowsPerSecond = Number(jobData?.rowsPerSecond ?? 0);
  const errors = Array.isArray(jobData?.errors) ? jobData.errors : [];

  const datasetDisplayName = queryDataset || datasetMeta?.filename || datasetMeta?.originalName || (jobData?.datasetId ? `Dataset ${jobData.datasetId}` : 'Dataset');

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
  const successRate = processedRows > 0
    ? ((successfulRows / processedRows) * 100).toFixed(1)
    : null;

  // Step 4: Reconnection indicator states
  const isWebSocketDisconnected = wsStatus === 'disconnected';
  const isWebSocketReconnecting = wsStatus === 'reconnecting';
  const isWebSocketConnected = wsStatus === 'connected';

  // ── No job context yet (loading) ───────────────────────────────────────────
  if (status === JOB_STATUS.IDLE) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Connecting to ETL Engine…</h3>
            <p className="text-sm text-slate-500 mt-1 font-mono">Job {routeJobId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">

      {/* ── Page Header & Nav ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={ArrowLeft}
          onClick={() => navigate('/jobs')}
          className="text-slate-600 hover:text-slate-900 self-start"
        >
          All Jobs
        </Button>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* Connection Status Badge (Step 4) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {isWebSocketConnected && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-[11px]">Live WebSocket</span>
              </>
            )}
            {isWebSocketReconnecting && (
              <>
                <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                <span className="font-medium text-[11px] text-amber-600 dark:text-amber-400">
                  Reconnecting ({reconnectAttempt}/{maxReconnectAttempts})
                </span>
              </>
            )}
            {isWebSocketDisconnected && (
              <>
                <WifiOff className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-[11px] text-slate-500">Polling Active</span>
              </>
            )}
          </div>

          {/* Job ID with Copy */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl font-mono text-slate-700 dark:text-slate-300 text-[11px]">
            <span>ID: {jobId || routeJobId || '—'}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Copy Job ID"
            >
              {copiedJobId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* View Details Link (Step 7) */}
          <Link
            to={`/jobs/${jobId || routeJobId}`}
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Job Details <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── WebSocket Reconnection Banner (Step 4) ───────────────────────────── */}
      {isRunning && (isWebSocketDisconnected || isWebSocketReconnecting) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Connection interrupted. Reconnecting (attempt {reconnectAttempt}/{maxReconnectAttempts})…
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                Current progress is preserved and real-time updates will resume immediately upon reconnection.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={reconnectNow}
            className="self-end sm:self-auto border-amber-300 text-amber-800 hover:bg-amber-100 text-xs py-1"
          >
            Reconnect Now
          </Button>
        </div>
      )}

      {/* ── Status Header Card (Step 2) ───────────────────────────────────────── */}
      <Card className={`p-5 border ${statusConfig.border} ${statusConfig.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${statusConfig.border} bg-white dark:bg-slate-900 shadow-sm`}>
              {status === JOB_STATUS.PROCESSING && <Zap className={`w-6 h-6 ${statusConfig.color} animate-pulse`} />}
              {status === JOB_STATUS.QUEUED && <Clock className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.COMPLETED && <CheckCircle2 className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.FAILED && <XCircle className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.CANCELLED && <Ban className={`w-6 h-6 ${statusConfig.color}`} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {status === JOB_STATUS.PROCESSING && 'Processing Stream…'}
                  {status === JOB_STATUS.QUEUED && 'Job Queued'}
                  {status === JOB_STATUS.COMPLETED && '✓ Processing Completed'}
                  {status === JOB_STATUS.FAILED && 'Processing Failed'}
                  {status === JOB_STATUS.CANCELLED && 'Processing Cancelled'}
                </h2>
                <Badge variant={statusConfig.badgeVariant} size="sm">
                  {statusConfig.label.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dataset: <strong className="text-slate-700 dark:text-slate-300">{datasetDisplayName}</strong>
                {jobData?.startedAt && (
                  <> · Duration: <ElapsedTimer startedAt={jobData.startedAt} completedAt={jobData?.completedAt} /></>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons (Step 7) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Details Action */}
            <Link to={`/jobs/${jobId || routeJobId}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                View Details
              </Button>
            </Link>

            {/* Cancel Action (Only when queued or processing) */}
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={Ban}
                onClick={() => setShowCancelModal(true)}
                className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
              >
                Cancel Processing
              </Button>
            )}

            {/* Retry Action (Enabled when failed, completed, or cancelled) */}
            {isTerminal && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={RotateCcw}
                isLoading={retryLoading}
                onClick={handleRetry}
                className="text-xs"
              >
                Retry Job
              </Button>
            )}

            {/* View Errors Action */}
            {(errors.length > 0 || failedRows > 0) && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={AlertTriangle}
                onClick={() => setShowErrorModal(true)}
                className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 text-xs"
              >
                View Errors ({formatNumber(errors.length || failedRows)})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── QUEUED State ─────────────────────────────────────────────────────── */}
      {status === JOB_STATUS.QUEUED && (
        <Card className="p-8 text-center">
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Waiting in Pipeline Queue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your job has been queued and stream allocation is initializing.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── PROCESSING State: Progress bar + Live metrics (Step 2 & Step 3) ───── */}
      {status === JOB_STATUS.PROCESSING && (
        <>
          {/* Progress Card */}
          <Card className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Live Pipeline Execution Progress</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-base font-bold">
                  {progress}%
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ width: `${Math.max(progress, 2)}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-0.5">
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{formatNumber(processedRows)}</strong>
                  {totalRows > 0 && <> / {formatNumber(totalRows)}</>} records streamed
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {formatNumber(rowsPerSecond)} rows/sec
                </span>
              </div>
            </div>
          </Card>

          {/* Live Metrics Grid (Step 2 Required Displays) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Records */}
            <Card className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Records
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {totalRows > 0 ? formatNumber(totalRows) : formatNumber(processedRows)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{formatNumber(processedRows)} streamed</div>
            </Card>

            {/* Successful */}
            <Card className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Successful Records
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(successfulRows)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {successRate ? `${successRate}% integrity` : 'Streaming…'}
              </div>
            </Card>

            {/* Failed */}
            <Card className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed Records
              </div>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {formatNumber(failedRows)}
              </div>
              {failedRows > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowErrorModal(true)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer block text-left"
                >
                  Inspect errors →
                </button>
              ) : (
                <div className="text-[11px] text-slate-500 mt-1">0 errors encountered</div>
              )}
            </Card>

            {/* Throughput Speed */}
            <Card className="p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Speed (Rows/sec)
              </div>
              <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatNumber(rowsPerSecond)}
                <span className="text-xs font-normal text-slate-400 ml-1">rows/s</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Real-time throughput</div>
            </Card>
          </div>
        </>
      )}

      {/* ── COMPLETED State Screen (Step 8) ──────────────────────────────────── */}
      {status === JOB_STATUS.COMPLETED && (
        <ProcessingCompletionScreen
          jobData={jobData}
          jobId={jobId || routeJobId}
          datasetId={jobData?.datasetId}
          datasetName={datasetDisplayName}
          destination={destination}
          onViewErrors={() => setShowErrorModal(true)}
        />
      )}

      {/* ── FAILED State Screen (Step 9) ─────────────────────────────────────── */}
      {status === JOB_STATUS.FAILED && (
        <ProcessingFailureScreen
          jobData={jobData}
          jobId={jobId || routeJobId}
          datasetId={jobData?.datasetId}
          datasetName={datasetDisplayName}
          onRetry={handleRetry}
          onViewErrors={() => setShowErrorModal(true)}
          retryLoading={retryLoading}
        />
      )}

      {/* ── CANCELLED State Screen ───────────────────────────────────────────── */}
      {status === JOB_STATUS.CANCELLED && (
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Ban className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Processing Cancelled</h3>
            <p className="text-sm text-slate-500 mt-1">
              The job was stopped. {formatNumber(successfulRows)} records were successfully committed.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" leftIcon={RotateCcw} onClick={handleRetry} isLoading={retryLoading}>
              Retry Job
            </Button>
            <Link to="/datasets">
              <Button variant="outline">
                All Datasets
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Pipeline Configuration Summary Card ──────────────────────────────── */}
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Pipeline Specifications</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Dataset</div>
            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate font-semibold" title={datasetDisplayName}>
              {datasetDisplayName}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Total Records</div>
            <div className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">
              {totalRows > 0 ? formatNumber(totalRows) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Mappings</div>
            <div className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">{mappingsCount}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Transformations</div>
            <div className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200">{transformsCount}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Destination</div>
            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{destination}</div>
          </div>
        </div>
      </Card>

      {/* ── Failed Records UI (Step 6) ────────────────────────────────────────── */}
      {errors.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Failed Records
              </h3>
              <Badge variant="danger" size="sm">
                {formatNumber(errors.length)}
              </Badge>
            </div>
          </div>

          <FailedRecordsTable
            errors={errors}
            totalFailedCount={failedRows}
            datasetName={datasetDisplayName}
          />
        </Card>
      )}

      {/* ── Cancel Confirmation Modal (Step 7) ─────────────────────────────────── */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelError(null); }}
        title="Cancel Processing?"
        description="This will stop the streaming ETL pipeline. Records already written will be preserved in the job history."
      >
        {cancelError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-3">
            {cancelError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => { setShowCancelModal(false); setCancelError(null); }}>
            Keep Running
          </Button>
          <Button
            variant="danger"
            leftIcon={Ban}
            isLoading={cancelLoading}
            onClick={handleCancel}
          >
            Cancel Processing
          </Button>
        </div>
      </Modal>

      {/* ── All Errors Modal (Step 6) ─────────────────────────────────────────── */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Processing Errors & Failed Records"
        description={`${formatNumber(errors.length || failedRows)} records encountered validation or transformation issues.`}
        maxWidth="max-w-4xl"
      >
        <div className="mt-3">
          <FailedRecordsTable
            errors={errors}
            totalFailedCount={failedRows}
            datasetName={datasetDisplayName}
          />
        </div>
        <div className="flex justify-end pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default ProcessingDashboardPage;
