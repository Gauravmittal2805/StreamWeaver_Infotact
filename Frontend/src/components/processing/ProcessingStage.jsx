import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Layers, Sparkles, AlertCircle, CheckCircle2,
  FileSpreadsheet, FileCode, Zap, Target, ShieldCheck,
  AlertTriangle, Code2, ArrowLeft
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';
import { formatNumber, formatBytes } from '../../utils/formatters';
import { validatePipelineBeforeProcessing } from '../../utils/pipelineValidation';

/**
 * Stage 5: Pre-processing summary and Start Processing CTA.
 *
 * Runs comprehensive client-side pipeline validation:
 * - Dataset selected
 * - Mapping completed
 * - Destination fields valid
 * - Transformation configuration valid
 * - Custom JavaScript valid
 * - Required fields mapped
 *
 * Shows clear human-readable messages and prevents execution on invalid configuration.
 */
export function ProcessingStage({
  datasetMeta,
  mappings = [],
  destinationFields = [],
  sampleRows = [],
  onBackToTransform,
  onNavigateToJobs
}) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  const filename = datasetMeta?.filename || datasetMeta?.originalName || 'Dataset';
  const displayFormat = (datasetMeta?.format || 'csv').toUpperCase();
  const datasetId = datasetMeta?.datasetId || datasetMeta?.id || datasetMeta?._id;
  const totalRows = datasetMeta?.totalRows || datasetMeta?.rowCount || sampleRows.length || 0;
  const fileSize = datasetMeta?.size || datasetMeta?.fileSize;

  const transformedCount = mappings.filter(
    m => m.transformation && m.transformation !== 'none'
  ).length;

  const destination = 'MongoDB / Output Stream';

  // Perform rigorous frontend validation
  const validation = useMemo(() => {
    return validatePipelineBeforeProcessing({
      datasetMeta,
      mappings,
      destinationFields
    });
  }, [datasetMeta, mappings, destinationFields]);

  const handleStartProcessing = async () => {
    if (!validation.isValid) {
      setStartError(validation.errors[0] || 'Please resolve all validation errors before processing.');
      return;
    }

    setStarting(true);
    setStartError(null);

    try {
      const res = await jobService.createJob({ datasetId, autoStart: true });
      if (!res?.job?.jobId) {
        throw new Error('Invalid response from server. Please try again.');
      }

      const jobId = res.job.jobId;

      // Pass pipeline summary as query params so the dashboard can display it
      const params = new URLSearchParams({
        dataset: filename,
        mappings: String(mappings.length),
        transforms: String(transformedCount),
        destination,
      });

      navigate(`/processing/${jobId}?${params.toString()}`);
    } catch (err) {
      // Map technical errors to friendly explanations
      let friendlyMsg = err.message || 'Failed to start processing job. Please check that the server is active.';
      if (friendlyMsg.includes('Failed to fetch') || friendlyMsg.includes('NetworkError')) {
        friendlyMsg = 'Unable to communicate with the ETL processing server. Please verify your connection.';
      }
      setStartError(friendlyMsg);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pre-Execution Pipeline Review
              </h3>
              <p className="text-xs text-slate-500">
                Verify schema mapping, transformations, and runtime constraints before launch.
              </p>
            </div>
          </div>

          {onBackToTransform && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={ArrowLeft}
              onClick={onBackToTransform}
              className="self-start sm:self-auto text-xs"
            >
              Modify Transforms
            </Button>
          )}
        </div>
      </Card>

      {/* ── Validation Checklist & Pre-flight Status ────────────────────────── */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Pre-flight Validation Checks
          </div>
          <Badge variant={validation.isValid ? 'success' : 'danger'} size="sm">
            {validation.isValid ? 'READY TO PROCESS' : `${validation.errors.length} ISSUE${validation.errors.length === 1 ? '' : 'S'} DETECTED`}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Check 1: Dataset */}
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            datasetId
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          }`}>
            {datasetId ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <div>
              <span className="font-semibold block">Source Dataset</span>
              <span className="text-[11px] opacity-80">{datasetId ? `${filename}` : 'No dataset selected'}</span>
            </div>
          </div>

          {/* Check 2: Mappings */}
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            mappings.length > 0
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          }`}>
            {mappings.length > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <div>
              <span className="font-semibold block">Field Mappings</span>
              <span className="text-[11px] opacity-80">{mappings.length > 0 ? `${mappings.length} fields mapped` : 'No mappings configured'}</span>
            </div>
          </div>

          {/* Check 3: Destination fields */}
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            validation.errors.every(e => !e.includes('destination field') && !e.includes('required destination'))
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          }`}>
            {validation.errors.every(e => !e.includes('destination field') && !e.includes('required destination'))
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <div>
              <span className="font-semibold block">Destination Schema</span>
              <span className="text-[11px] opacity-80">Schema & required fields verified</span>
            </div>
          </div>

          {/* Check 4: Transformations */}
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            validation.errors.every(e => !e.includes('transformation') && !e.includes('JavaScript') && !e.includes('expression'))
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          }`}>
            {validation.errors.every(e => !e.includes('transformation') && !e.includes('JavaScript') && !e.includes('expression'))
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <div>
              <span className="font-semibold block">Transformations & Code</span>
              <span className="text-[11px] opacity-80">{transformedCount > 0 ? `${transformedCount} active rules verified` : 'Direct mapping (no transforms)'}</span>
            </div>
          </div>
        </div>

        {/* Validation Errors List */}
        {!validation.isValid && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Validation Constraints Must Be Resolved Before Processing:
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300 pl-1">
              {validation.errors.map((err, idx) => (
                <li key={idx} className="font-medium">{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings List */}
        {validation.warnings.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Notice:</span>
              {validation.warnings.map((warn, idx) => (
                <p key={idx}>{warn}</p>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Pre-flight Pipeline Summary ──────────────────────────────────────── */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Pipeline Execution Specification
        </div>

        <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Dataset */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              {displayFormat === 'JSON'
                ? <FileCode className="w-4 h-4 text-indigo-500" />
                : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              }
              <span className="font-medium">Target Dataset</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{filename}</div>
              {(fileSize || totalRows > 0) && (
                <div className="text-[11px] text-slate-500">
                  {fileSize ? formatBytes(fileSize) : ''}
                  {fileSize && totalRows > 0 ? ' · ' : ''}
                  {totalRows > 0 ? `${formatNumber(totalRows)} records` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Field Mappings */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="font-medium">Field Mappings</span>
            </div>
            <Badge variant={mappings.length > 0 ? 'info' : 'warning'} size="sm">
              {mappings.length} {mappings.length === 1 ? 'mapping' : 'mappings'}
            </Badge>
          </div>

          {/* Transformations */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="font-medium">Transformation Rules</span>
            </div>
            <Badge variant={transformedCount > 0 ? 'purple' : 'default'} size="sm">
              {transformedCount} active
            </Badge>
          </div>

          {/* Destination */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Storage Destination</span>
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{destination}</div>
          </div>
        </div>
      </Card>

      {/* ── Start Processing Error ───────────────────────────────────────────── */}
      {startError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-700 dark:text-rose-300">{startError}</div>
        </div>
      )}

      {/* ── Start Processing CTA ─────────────────────────────────────────────── */}
      <Card className="p-6 text-center border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10">
        <div className="space-y-4">
          <div className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {validation.isValid
              ? 'All pipeline checks passed. Click below to begin streaming ETL processing.'
              : 'Please map all required destination fields before processing.'}
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={starting ? undefined : Play}
            isLoading={starting}
            disabled={!validation.isValid || starting}
            onClick={handleStartProcessing}
            className="w-full sm:w-auto min-w-48 text-sm font-semibold"
          >
            {starting ? 'Initializing Engine…' : 'Start Processing'}
          </Button>

          {validation.isValid && !starting && (
            <p className="text-xs text-slate-400">
              This initiates real streaming parsing, transformations, and database commitment.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ProcessingStage;
