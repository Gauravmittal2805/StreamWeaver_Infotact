import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  FileCheck,
  Zap,
  Target,
  Clock,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatNumber, formatDuration } from '../../utils/formatters';

/**
 * ProcessingCompletionScreen
 *
 * Professional ETL completion summary screen (Step 8):
 * - Total records
 * - Successful
 * - Failed
 * - Processing time
 * - Average rows/sec
 * - Destination
 *
 * Actions:
 * - View Results (view processed dataset preview or job details)
 * - View Errors (open failed records UI)
 * - Process Another Dataset (navigate to /datasets)
 */
export function ProcessingCompletionScreen({
  jobData = {},
  jobId,
  datasetId,
  datasetName = 'Dataset',
  destination = 'MongoDB / Output Stream',
  onViewErrors,
  onViewResults
}) {
  const totalRows = Number(jobData.totalRows ?? jobData.processedRows ?? 0);
  const successfulRows = Number(jobData.successfulRows ?? 0);
  const failedRows = Number(jobData.failedRows ?? 0);
  const rowsPerSecond = Number(jobData.rowsPerSecond ?? 0);
  const errors = Array.isArray(jobData.errors) ? jobData.errors : [];

  // Calculate elapsed time
  let durationText = '—';
  if (jobData.startedAt && jobData.completedAt) {
    const elapsedSec = Math.max(
      1,
      Math.round((new Date(jobData.completedAt) - new Date(jobData.startedAt)) / 1000)
    );
    durationText = formatDuration(elapsedSec);
  } else if (jobData.durationSeconds) {
    durationText = `${jobData.durationSeconds}s`;
  }

  // Integrity rate
  const integrityPercent = totalRows > 0
    ? ((successfulRows / totalRows) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Main Completion Hero Card ────────────────────────────────────────── */}
      <Card className="p-8 border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900">
        <div className="text-center max-w-xl mx-auto space-y-5">
          {/* Animated checkmark icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in-75 duration-300" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow">
              ✓
            </div>
          </div>

          <div>
            <Badge variant="success" size="md" className="mb-2">
              ETL PIPELINE COMPLETED
            </Badge>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {formatNumber(totalRows)} Records Successfully Processed
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Dataset <strong className="text-slate-800 dark:text-slate-200">{datasetName}</strong> has been transformed and streamed to its destination.
            </p>
          </div>

          {/* Quick Integrity Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{integrityPercent}% Pipeline Data Integrity</span>
          </div>
        </div>

        {/* ── Detailed Metrics Grid (Step 8 Required Fields) ──────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
          {/* Total Records */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              Total Records
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatNumber(totalRows)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Records parsed</div>
          </div>

          {/* Successful */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Successful
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatNumber(successfulRows)}
            </div>
            <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Written to target</div>
          </div>

          {/* Failed */}
          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Failed
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatNumber(failedRows)}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Rejected rows</div>
          </div>

          {/* Processing Time */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Processing Time
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {durationText}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Total duration</div>
          </div>

          {/* Average Rows/sec */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5 text-purple-500" />
              Throughput
            </div>
            <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              {formatNumber(rowsPerSecond)} <span className="text-xs font-normal">r/s</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stream throughput</div>
          </div>

          {/* Destination */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <Target className="w-3.5 h-3.5 text-slate-500" />
              Destination
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate" title={destination}>
              {destination}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Target buffer</div>
          </div>
        </div>

        {/* ── Action Buttons (Step 8 Required Actions) ────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          {/* Action 1: View Results */}
          <Link to={datasetId ? `/datasets/${datasetId}/preview` : `/jobs/${jobId}`}>
            <Button
              variant="outline"
              size="md"
              leftIcon={Eye}
              className="min-w-36"
            >
              View Results
            </Button>
          </Link>

          {/* Action 2: View Errors (if failed > 0) */}
          {(failedRows > 0 || errors.length > 0) && (
            <Button
              variant="outline"
              size="md"
              leftIcon={AlertTriangle}
              onClick={onViewErrors}
              className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-w-36"
            >
              View Errors ({formatNumber(failedRows || errors.length)})
            </Button>
          )}

          {/* Action 3: Process Another Dataset */}
          <Link to="/datasets">
            <Button
              variant="primary"
              size="md"
              leftIcon={RotateCcw}
              className="min-w-44"
            >
              Process Another Dataset
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default ProcessingCompletionScreen;
