import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
  Layers,
  Database,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  XCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import { formatBytes, formatNumber } from '../../utils/formatters';

/**
 * Stage 5: Processing Screen & Execution Monitor
 * 
 * Showcases:
 * - Dataset status header (e.g. Processing customers.csv)
 * - Live animated progress bar (72%)
 * - Rows processed: 3,600,000 / 5,000,000 rows
 * - High-speed throughput: Rows/sec: 42,000
 * - Metrics counters: Successful: 3,590,000 | Failed: 10,000
 * - [ View Errors ] interactive inspector modal
 * - Interactive controls (Start, Pause, Cancel, View Output)
 */
export function ProcessingStage({
  datasetMeta,
  mappings = [],
  sampleRows = [],
  onBackToTransform,
  onNavigateToJobs
}) {
  const [isRunning, setIsRunning] = useState(true);
  const [progress, setProgress] = useState(72);
  const [processedRows, setProcessedRows] = useState(3600000);
  const [totalRows, setTotalRows] = useState(5000000);
  const [successfulRows, setSuccessfulRows] = useState(3590000);
  const [failedRows, setFailedRows] = useState(10000);
  const [throughput, setThroughput] = useState(42000);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('33s');

  const filename = datasetMeta?.filename || datasetMeta?.originalName || 'customers.csv';
  const displayFormat = (datasetMeta?.format || 'csv').toUpperCase();

  // Simulated live counter progress tick if running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        const next = Math.min(100, prev + 1);
        const newProcessed = Math.min(totalRows, Math.round((next / 100) * totalRows));
        setProcessedRows(newProcessed);
        setSuccessfulRows(Math.max(0, newProcessed - failedRows));
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isRunning, totalRows, failedRows]);

  const mockErrors = [
    {
      row: 14205,
      field: 'age',
      value: 'N/A_INVALID',
      error: 'Number conversion failed: Received non-numeric string',
      severity: 'warning'
    },
    {
      row: 89431,
      field: 'custom_js_rule',
      value: 'undefined',
      error: 'Custom JavaScript Runtime Error: Cannot read properties of undefined',
      severity: 'error'
    },
    {
      row: 154200,
      field: 'email',
      value: 'plainword_no_at',
      error: 'Malformed email format',
      severity: 'warning'
    },
    {
      row: 289110,
      field: 'postal_code',
      value: 'null',
      error: 'Required destination constraint missing',
      severity: 'error'
    }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Top Header & Status ────────────────────────────────────────── */}
      <Card className="enterprise-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <CardBody className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Processing {filename}
                  </h3>
                  <Badge variant={progress >= 100 ? 'success' : 'purple'} size="sm">
                    {progress >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  StreamWeaver Pipeline Engine • {mappings.length} transformation rules executing
                </p>
              </div>
            </div>

            {/* Stage Action Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={isRunning ? 'outline' : 'primary'}
                size="sm"
                leftIcon={isRunning ? Pause : Play}
                onClick={() => setIsRunning(prev => !prev)}
                className="text-xs h-8"
              >
                {isRunning ? 'Pause Engine' : 'Resume Engine'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                leftIcon={AlertTriangle}
                onClick={() => setShowErrorModal(true)}
                className="text-xs h-8 border-rose-200 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                View Errors ({formatNumber(failedRows)})
              </Button>
            </div>
          </div>

          {/* ── Progress Bar & Core Metrics (Step 16) ───────────────────── */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">
                Pipeline Execution Progress
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                {progress}%
              </span>
            </div>

            {/* High visual enterprise progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progress-bar-stripes_1s_linear_infinite]" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
              <span>
                <strong>{formatNumber(processedRows)}</strong> / {formatNumber(totalRows)} rows
              </span>
              <span>
                Rows/sec: <strong className="text-indigo-600 dark:text-indigo-400">{formatNumber(throughput)}</strong>
              </span>
              <span>
                Est. Remaining: <strong>{timeRemaining}</strong>
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Key Metrics Cards (Step 16) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Processed Total */}
        <Card className="enterprise-card p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Records
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatNumber(totalRows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatNumber(processedRows)} streamed ({progress}%)
          </div>
        </Card>

        {/* Successful */}
        <Card className="enterprise-card p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Successful</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatNumber(successfulRows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            99.7% integrity score
          </div>
        </Card>

        {/* Failed */}
        <Card className="enterprise-card p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed / Skipped</span>
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatNumber(failedRows)}
          </div>
          <button
            type="button"
            onClick={() => setShowErrorModal(true)}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-semibold cursor-pointer block text-left"
          >
            Inspect error logs →
          </button>
        </Card>

        {/* Processing Throughput */}
        <Card className="enterprise-card p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Processing Speed</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {formatNumber(throughput)} <span className="text-xs font-normal text-slate-400">rows/s</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Zero backpressure latency
          </div>
        </Card>
      </div>

      {/* ── Pipeline Architecture Map ──────────────────────────────────── */}
      <Card className="enterprise-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-5">
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Active Pipeline Execution Topology</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Source:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{filename} ({displayFormat})</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 hidden sm:inline" />

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Transform Engine:</span>
              <Badge variant="purple" size="sm">Node VM Sandbox ({mappings.length} fields)</Badge>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 hidden sm:inline" />

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Destination:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">Processed Output Stream</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── View Errors Modal (Step 16) ─────────────────────────────────── */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Processing Errors & Quarantine Log"
        description={`Found ${formatNumber(failedRows)} rows with transformation or validation discrepancies during streaming.`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 mt-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden font-mono text-xs max-h-72 overflow-y-auto custom-scrollbar">
            {mockErrors.map((err, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Row #{formatNumber(err.row)} • Field: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{err.field}</code>
                  </span>
                  <Badge variant={err.severity === 'error' ? 'danger' : 'warning'} size="sm">
                    {err.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-slate-600 dark:text-slate-300 font-sans text-xs">
                  {err.error}
                </div>
                <div className="text-[10px] text-slate-400">
                  Raw input value: <code className="text-slate-700 dark:text-slate-300">{err.value}</code>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setShowErrorModal(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowErrorModal(false)}>
              Export Error Report (.CSV)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProcessingStage;
