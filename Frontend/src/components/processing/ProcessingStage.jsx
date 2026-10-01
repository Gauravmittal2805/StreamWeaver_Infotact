import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Layers, Sparkles, AlertCircle, CheckCircle2,
  FileSpreadsheet, FileCode, Zap, Target
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { jobService } from '../../services/jobService';
import { formatNumber, formatBytes } from '../../utils/formatters';

/**
 * Stage 5: Pre-processing summary and Start Processing CTA.
 *
 * Shows a clean summary of the configured pipeline and launches
 * the ETL job via the real backend API. Navigates to the live
 * ProcessingDashboardPage on successful job creation.
 *
 * No mock data. All values come from real props or the backend.
 */
export function ProcessingStage({
  datasetMeta,
  mappings = [],
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

  const destination = 'Output Stream';

  const handleStartProcessing = async () => {
    if (!datasetId) {
      setStartError('Dataset ID is missing. Please go back and select a valid dataset.');
      return;
    }
    if (mappings.length === 0) {
      setStartError('No field mappings configured. Please set up at least one mapping before processing.');
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
      setStartError(
        err.message || 'Failed to start processing job. Please check the backend is running.'
      );
    } finally {
      setStarting(false);
    }
  };

  const isReady = mappings.length > 0 && Boolean(datasetId);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ready to Process
            </h3>
            <p className="text-xs text-slate-500">
              Review your pipeline configuration and launch ETL processing.
            </p>
          </div>
        </div>
      </Card>

      {/* ── Pre-flight Pipeline Summary ──────────────────────────────────────── */}
      <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Processing Summary
        </div>

        <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Dataset */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              {displayFormat === 'JSON'
                ? <FileCode className="w-4 h-4 text-indigo-500" />
                : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              }
              <span className="font-medium">Dataset</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{filename}</div>
              {(fileSize || totalRows > 0) && (
                <div className="text-[11px] text-slate-500">
                  {fileSize ? formatBytes(fileSize) : ''}
                  {fileSize && totalRows > 0 ? ' · ' : ''}
                  {totalRows > 0 ? `${formatNumber(totalRows)} rows` : ''}
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
              <span className="font-medium">Transformations</span>
            </div>
            <Badge variant={transformedCount > 0 ? 'purple' : 'default'} size="sm">
              {transformedCount} active
            </Badge>
          </div>

          {/* Destination */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="font-medium">Destination</span>
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{destination}</div>
          </div>
        </div>
      </Card>

      {/* ── Validation Warnings ───────────────────────────────────────────────── */}
      {!datasetId && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Dataset ID missing.</strong> Please navigate back to Datasets and re-open this file.
          </div>
        </div>
      )}

      {mappings.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>No mappings configured.</strong> Please set up field mappings in the Mapping tab before starting processing.
          </div>
        </div>
      )}

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
            {isReady
              ? 'Your pipeline is configured and ready. Click below to begin streaming ETL processing.'
              : 'Complete the required configuration above to enable processing.'}
          </div>

          <Button
            variant="primary"
            size="lg"
            leftIcon={starting ? undefined : Play}
            isLoading={starting}
            disabled={!isReady || starting}
            onClick={handleStartProcessing}
            className="w-full sm:w-auto min-w-48"
          >
            {starting ? 'Starting…' : 'Start Processing'}
          </Button>

          {isReady && !starting && (
            <p className="text-xs text-slate-400">
              This will launch a background ETL job. You can monitor progress in real-time.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ProcessingStage;
