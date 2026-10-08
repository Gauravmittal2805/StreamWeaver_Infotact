import React from 'react';
import { Link } from 'react-router-dom';
import {
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  FileSpreadsheet,
  Layers,
  ArrowLeft,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatNumber } from '../../utils/formatters';

/**
 * ProcessingFailureScreen
 *
 * Professional ETL failure recovery screen (Step 9):
 * - What failed (clean user-facing error description, avoiding technical stack traces)
 * - Records processed before failure
 * - Failed records count
 * - Retry option
 * - View error details
 */
export function ProcessingFailureScreen({
  jobData = {},
  jobId,
  datasetId,
  datasetName = 'Dataset',
  onRetry,
  onViewErrors,
  retryLoading = false,
}) {
  const processedRows = Number(jobData.processedRows ?? 0);
  const failedRows = Number(jobData.failedRows ?? 0);
  const successfulRows = Number(jobData.successfulRows ?? 0);
  const errors = Array.isArray(jobData.errors) ? jobData.errors : [];

  // Sanitize error message to avoid technical stack traces (Step 9 requirement)
  const getCleanErrorMessage = () => {
    const raw = jobData.error;
    if (!raw) {
      return 'The pipeline encountered unexpected data or an unrecoverable transformation error during stream execution.';
    }

    if (typeof raw === 'object') {
      if (raw.message) {
        return sanitizeMessage(raw.message);
      }
      return 'The dataset could not be processed due to a validation or schema mismatch.';
    }

    return sanitizeMessage(String(raw));
  };

  function sanitizeMessage(msg) {
    if (!msg) return 'Pipeline processing interrupted.';
    // Strip file paths, node stack traces, line numbers
    const firstLine = msg.split('\n')[0];
    const cleaned = firstLine
      .replace(/at\s+.*\(.*:\d+:\d+\)/g, '')
      .replace(/(node_modules|file:\/\/|[\w\-./\\]+\.js:\d+)/g, '')
      .replace(/^Error:\s*/i, '')
      .trim();

    if (cleaned.length < 5) {
      return 'The dataset could not be processed. Please verify your mapping rules and field formats.';
    }
    return cleaned;
  }

  const cleanReason = getCleanErrorMessage();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Main Failure Card ───────────────────────────────────────────────── */}
      <Card className="p-8 border-rose-200 dark:border-rose-800 bg-gradient-to-b from-rose-50/60 to-white dark:from-rose-950/20 dark:to-slate-900">
        <div className="text-center max-w-xl mx-auto space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
            <XCircle className="w-10 h-10 animate-in zoom-in-75 duration-300" />
          </div>

          <div>
            <Badge variant="danger" size="md" className="mb-2">
              PROCESSING HALTED
            </Badge>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Processing Could Not Be Completed
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Dataset <strong className="text-slate-800 dark:text-slate-200">{datasetName}</strong> encountered an error during pipeline execution.
            </p>
          </div>

          {/* Clean User-Facing Reason Card (No stack trace) */}
          <div className="p-4 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-left text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              What Failed:
            </div>
            <p className="text-rose-900 dark:text-rose-200 font-medium leading-relaxed">
              {cleanReason}
            </p>
          </div>
        </div>

        {/* ── Diagnostics Metrics (Step 9 Required Fields) ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto mt-6">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Processed Before Failure
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {formatNumber(processedRows)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Streamed records</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-center shadow-sm">
            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Successful
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatNumber(successfulRows)}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">Written records</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-center shadow-sm">
            <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
              Failed Records
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatNumber(failedRows || errors.length)}
            </div>
            <div className="text-[10px] text-rose-600/80 mt-0.5">Rejected rows</div>
          </div>
        </div>

        {/* ── Actions (Step 9 Required Actions) ───────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          {/* Action 1: Retry Option */}
          {onRetry && (
            <Button
              variant="primary"
              size="md"
              leftIcon={RotateCcw}
              isLoading={retryLoading}
              onClick={onRetry}
              className="min-w-36 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Retry Job
            </Button>
          )}

          {/* Action 2: View Error Details */}
          {(failedRows > 0 || errors.length > 0) && (
            <Button
              variant="outline"
              size="md"
              leftIcon={AlertTriangle}
              onClick={onViewErrors}
              className="border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-w-36"
            >
              View Error Details ({formatNumber(failedRows || errors.length)})
            </Button>
          )}

          {/* Action 3: Edit Mapping / Dataset */}
          {datasetId && (
            <Link to={`/datasets/${datasetId}/mapping`}>
              <Button
                variant="outline"
                size="md"
                leftIcon={Layers}
                className="min-w-36"
              >
                Adjust Mappings
              </Button>
            </Link>
          )}

          {/* Action 4: Process Another Dataset */}
          <Link to="/datasets">
            <Button
              variant="ghost"
              size="md"
              leftIcon={ArrowLeft}
              className="text-slate-600 dark:text-slate-400"
            >
              All Datasets
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default ProcessingFailureScreen;
