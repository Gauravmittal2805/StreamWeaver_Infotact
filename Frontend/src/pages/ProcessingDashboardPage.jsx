import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, AlertCircle, XCircle, Zap, Clock,
  RefreshCw, Ban, ArrowLeft, RotateCcw, Database,
  AlertTriangle, Activity
} from 'lucide-react';
import { useProcessingJob, JOB_STATUS } from '../hooks/useProcessingJob';
import { formatNumber, formatDuration } from '../utils/formatters';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

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

  // Pipeline summary from query params (set when navigating from ProcessingStage)
  const datasetName = searchParams.get('dataset') || 'Dataset';
  const mappingsCount = searchParams.get('mappings') || '—';
  const transformsCount = searchParams.get('transforms') || '—';
  const destination = searchParams.get('destination') || 'Output Stream';

  const {
    jobId, jobData, status, wsStatus,
    attachJob, cancelJob, isRunning, isTerminal
  } = useProcessingJob();

  // On mount: attach to existing job from URL param
  useEffect(() => {
    if (routeJobId) {
      attachJob(routeJobId);
    }
  }, [routeJobId, attachJob]);

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

  // Derive metrics from jobData
  const progress = Number(jobData?.progressPercent ?? 0);
  const processedRows = Number(jobData?.processedRows ?? 0);
  const totalRows = Number(jobData?.totalRows ?? 0);
  const successfulRows = Number(jobData?.successfulRows ?? 0);
  const failedRows = Number(jobData?.failedRows ?? 0);
  const rowsPerSecond = Number(jobData?.rowsPerSecond ?? 0);
  const errors = Array.isArray(jobData?.errors) ? jobData.errors : [];
  // Show a user-friendly error message, never expose a stack trace
  const errorMessage = jobData?.error
    ? 'The dataset could not be processed. Please check your mappings and dataset format.'
    : null;

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
  const successRate = processedRows > 0
    ? ((successfulRows / processedRows) * 100).toFixed(1)
    : null;

  const isWebSocketIssue = isRunning && (wsStatus === 'disconnected' || wsStatus === 'reconnecting');

  // ── No job context yet (loading) ───────────────────────────────────────────
  if (status === JOB_STATUS.IDLE) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loading Job…</h3>
            <p className="text-sm text-slate-500 mt-1">Connecting to job {routeJobId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={ArrowLeft}
          onClick={() => navigate(-1)}
          className="text-slate-600 hover:text-slate-900"
        >
          Back
        </Button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Job ID:</span>
          <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 text-[11px]">
            {jobId || routeJobId || '—'}
          </code>
        </div>
      </div>

      {/* ── WebSocket Reconnection Banner ────────────────────────────────────── */}
      {isWebSocketIssue && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Connection interrupted. Reconnecting… Progress data may be slightly delayed.
          </p>
        </div>
      )}

      {/* ── Status Header Card ───────────────────────────────────────────────── */}
      <Card className={`p-5 border ${statusConfig.border} ${statusConfig.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${statusConfig.border} bg-white dark:bg-slate-900`}>
              {status === JOB_STATUS.PROCESSING && <Zap className={`w-6 h-6 ${statusConfig.color} animate-pulse`} />}
              {status === JOB_STATUS.QUEUED && <Clock className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.COMPLETED && <CheckCircle2 className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.FAILED && <XCircle className={`w-6 h-6 ${statusConfig.color}`} />}
              {status === JOB_STATUS.CANCELLED && <Ban className={`w-6 h-6 ${statusConfig.color}`} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {status === JOB_STATUS.PROCESSING && 'Processing Dataset…'}
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
                StreamWeaver Pipeline Engine
                {jobData?.startedAt && (
                  <> · <ElapsedTimer startedAt={jobData.startedAt} completedAt={jobData?.completedAt} /></>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {status === JOB_STATUS.PROCESSING && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={Ban}
                onClick={() => setShowCancelModal(true)}
                className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Cancel Processing
              </Button>
            )}
            {isTerminal && (
              <Link to="/datasets">
                <Button variant="outline" size="sm" leftIcon={RotateCcw}>
                  Process Another Dataset
                </Button>
              </Link>
            )}
            {(errors.length > 0 || failedRows > 0) && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={AlertTriangle}
                onClick={() => setShowErrorModal(true)}
                className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50"
              >
                {errors.length > 0
                  ? `View Errors (${formatNumber(errors.length)})`
                  : `View Errors (${formatNumber(failedRows)} rows)`}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── QUEUED state ─────────────────────────────────────────────────────── */}
      {status === JOB_STATUS.QUEUED && (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Waiting in Queue</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your job has been submitted and will begin processing shortly.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── PROCESSING: Progress bar + live metrics ─────────────────────────── */}
      {status === JOB_STATUS.PROCESSING && (
        <>
          {/* Progress Card */}
          <Card className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Pipeline Execution Progress</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">{progress}%</span>
              </div>
              {/* Animated progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ width: `${Math.max(progress, 2)}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-bar-stripes_1s_linear_infinite]" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-0.5">
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{formatNumber(processedRows)}</strong>
                  {totalRows > 0 && <> / {formatNumber(totalRows)}</>} rows
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                  {formatNumber(rowsPerSecond)} rows/sec
                </span>
              </div>
            </div>
          </Card>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Records</div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {totalRows > 0 ? formatNumber(totalRows) : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{formatNumber(processedRows)} streamed</div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Successful
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(successfulRows)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {successRate ? `${successRate}% integrity` : 'Calculating…'}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Failed
              </div>
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
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
                <div className="text-[11px] text-slate-500 mt-1">No failures</div>
              )}
            </Card>

            <Card className="p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Processing Speed
              </div>
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {formatNumber(rowsPerSecond)}
                <span className="text-xs font-normal text-slate-400 ml-1">rows/s</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Live throughput</div>
            </Card>
          </div>
        </>
      )}

      {/* ── COMPLETED state ──────────────────────────────────────────────────── */}
      {status === JOB_STATUS.COMPLETED && (
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(totalRows)} records processed
              </h3>
              <p className="text-sm text-slate-500 mt-1">Processing completed successfully</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {formatNumber(successfulRows)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Successful</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
                  {formatNumber(failedRows)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Failed</div>
              </div>
            </div>
            {jobData?.startedAt && jobData?.completedAt && (
              <p className="text-sm text-slate-500">
                Processing time:{' '}
                <strong>
                  <ElapsedTimer startedAt={jobData.startedAt} completedAt={jobData.completedAt} />
                </strong>
              </p>
            )}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {errors.length > 0 && (
                <Button
                  variant="outline"
                  leftIcon={AlertTriangle}
                  onClick={() => setShowErrorModal(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  View Errors
                </Button>
              )}
              <Link to="/datasets">
                <Button variant="primary" leftIcon={RotateCcw}>
                  Process Another Dataset
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── FAILED state ─────────────────────────────────────────────────────── */}
      {status === JOB_STATUS.FAILED && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Processing Failed</h3>
              <p className="text-sm text-slate-500 mt-1">The dataset could not be fully processed.</p>
            </div>
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300 max-w-md mx-auto">
                {errorMessage}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="text-center">
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatNumber(processedRows)}</div>
                <div className="text-xs text-slate-500">Processed</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-emerald-600">{formatNumber(successfulRows)}</div>
                <div className="text-xs text-slate-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-rose-600">{formatNumber(failedRows)}</div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              {errors.length > 0 && (
                <Button
                  variant="outline"
                  leftIcon={AlertTriangle}
                  onClick={() => setShowErrorModal(true)}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  View Details
                </Button>
              )}
              <Link to="/datasets">
                <Button variant="primary" leftIcon={RotateCcw}>
                  Retry with Another Dataset
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ── CANCELLED state ──────────────────────────────────────────────────── */}
      {status === JOB_STATUS.CANCELLED && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <Ban className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Processing Cancelled</h3>
              <p className="text-sm text-slate-500 mt-1">The job was stopped before completion.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="text-center">
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{formatNumber(processedRows)}</div>
                <div className="text-xs text-slate-500">Processed</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-emerald-600">{formatNumber(successfulRows)}</div>
                <div className="text-xs text-slate-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="font-mono font-bold text-rose-600">{formatNumber(failedRows)}</div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>
            <Link to="/datasets">
              <Button variant="primary" leftIcon={RotateCcw}>
                Process Another Dataset
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Pipeline Summary Card ─────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Processing Summary</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Dataset</div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{datasetName}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Records</div>
            <div className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
              {totalRows > 0 ? formatNumber(totalRows) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Mappings</div>
            <div className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{mappingsCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Transformations</div>
            <div className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200">{transformsCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Destination</div>
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{destination}</div>
          </div>
        </div>
      </Card>

      {/* ── Failed Records Table ──────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <Card className="p-5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            Failed Records
            <Badge variant="danger" size="sm">{formatNumber(errors.length)}</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Row</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Field</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {errors.slice(0, 10).map((err, idx) => (
                  <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                      {formatNumber(err.row ?? idx + 1)}
                    </td>
                    <td className="px-3 py-2">
                      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400">
                        {err.field ?? '—'}
                      </code>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {err.error ?? err.message ?? 'Unknown error'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.length > 10 && (
              <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
                Showing 10 of {formatNumber(errors.length)} errors.{' '}
                <button
                  type="button"
                  onClick={() => setShowErrorModal(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View all →
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setCancelError(null); }}
        title="Cancel Processing?"
        description="This will stop the ETL pipeline. Records processed so far will be preserved in the job summary."
      >
        {cancelError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 mb-3">
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

      {/* ── All Errors Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Processing Errors"
        description={`${formatNumber(errors.length || failedRows)} rows encountered errors during transformation.`}
        maxWidth="max-w-2xl"
      >
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Detailed error records are not available for this job.
            </div>
          ) : (
            errors.map((err, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    Row #{formatNumber(err.row ?? idx + 1)}
                    {err.field && (
                      <>
                        {' '}· Field:{' '}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{err.field}</code>
                      </>
                    )}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {err.error ?? err.message ?? 'Unknown error'}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default ProcessingDashboardPage;
