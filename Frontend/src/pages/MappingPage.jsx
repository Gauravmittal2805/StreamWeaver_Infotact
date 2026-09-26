import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  Save,
  RotateCcw,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Workflow,
  ChevronRight,
  ServerCrash,
  Sparkles,
  SlidersHorizontal,
  Play,
  Database,
  Target
} from 'lucide-react';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import SourceFieldsPanel from '../components/mapping/SourceFieldsPanel';
import DestinationFieldsPanel from '../components/mapping/DestinationFieldsPanel';
import MappingWorkspace from '../components/mapping/MappingWorkspace';
import TransformationSection from '../components/mapping/TransformationSection';
import TransformationPreview from '../components/mapping/TransformationPreview';
import { useMapping } from '../hooks/useMapping';
import { fileService } from '../services/fileService';
import { formatBytes, formatDate } from '../utils/formatters';

// ─── 5-Stage SaaS/Enterprise Workflow Step Definitions (Step 12) ───────────────
const WORKFLOW_STEPS = [
  { id: 'dataset', label: '1. Dataset', icon: Database },
  { id: 'mapping', label: '2. Map Fields', icon: Layers },
  { id: 'transform', label: '3. Transform', icon: Sparkles },
  { id: 'preview', label: '4. Preview', icon: Eye },
  { id: 'process', label: '5. Process', icon: Play },
];

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function MappingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="enterprise-card rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 enterprise-card rounded-xl p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-6 enterprise-card rounded-xl p-6 space-y-3">
          <div className="h-5 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          {[1, 2, 3].map(j => (
            <div key={j} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="lg:col-span-3 enterprise-card rounded-xl p-6 space-y-3">
          <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Stepper Component (Step 12) ─────────────────────────────────────
function WorkflowStepper({ activeTab, onSelectTab, hasMappings }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full custom-scrollbar">
      {WORKFLOW_STEPS.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = activeTab === step.id;
        const isPast = (
          (step.id === 'dataset') ||
          (step.id === 'mapping' && hasMappings && activeTab !== 'mapping') ||
          (step.id === 'transform' && (activeTab === 'preview' || activeTab === 'process')) ||
          (step.id === 'preview' && activeTab === 'process')
        );

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onSelectTab(step.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isPast
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'}
              `}
            >
              <StepIcon className="w-3.5 h-3.5" />
              <span>{step.label}</span>
              {isPast && !isActive && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />}
            </button>
            {index < WORKFLOW_STEPS.length - 1 && (
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isPast ? 'text-emerald-400' : 'text-slate-300 dark:text-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function MappingPage() {
  const { datasetId } = useParams();
  const navigate = useNavigate();

  // ── Dataset state ─────────────────────────────────────────────────────────
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // Active view tab: 'mapping' | 'transform' | 'preview' | 'all'
  const [activeTab, setActiveTab] = useState('mapping');

  // ── Mapping hook ──────────────────────────────────────────────────────────
  const {
    mappings,
    destinationFields,
    loading: mappingLoading,
    error: mappingError,
    hasUnsavedChanges,
    lastSavedAt,
    validationErrors,
    addMapping,
    removeMapping,
    updateTransformation,
    removeTransformation,
    resetTransformation,
    addDestinationField,
    removeDestinationField,
    saveMapping,
    resetMapping,
    clearAllMappings,
    getMappedSourceFields,
    getUnmappedSourceFields,
    validate,
    // Preview states & triggers
    sampleRows,
    setSampleRows,
    previewComparisons,
    previewError,
    isPreviewLoading,
    lastPreviewedAt,
    requestPreview,
  } = useMapping(datasetId, previewData?.rows || []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // References for scrolling to sections
  const transformRef = useRef(null);
  const previewRef = useRef(null);

  // ── Fetch dataset metadata and sample preview ─────────────────────────────
  useEffect(() => {
    if (!datasetId) return;
    let active = true;

    setPageLoading(true);
    setPageError(null);

    Promise.allSettled([
      fileService.getDataset(datasetId),
      fileService.getDatasetPreview(datasetId, { limit: 100, fallbackMock: true }),
    ]).then(([metaRes, previewRes]) => {
      if (!active) return;

      if (metaRes.status === 'fulfilled' && metaRes.value?.dataset) {
        setDatasetMeta(metaRes.value.dataset);
      }

      if (previewRes.status === 'fulfilled' && previewRes.value) {
        setPreviewData(previewRes.value);
        if (previewRes.value.rows) {
          setSampleRows(previewRes.value.rows);
        }
      }

      // Only set error if BOTH failed
      if (metaRes.status === 'rejected' && previewRes.status === 'rejected') {
        setPageError('Unable to load dataset. Please check your connection and try again.');
      }

      setPageLoading(false);
    });

    return () => { active = false; };
  }, [datasetId, setSampleRows]);

  // Auto-run preview when sample data and mappings are loaded
  useEffect(() => {
    if (mappings.length > 0 && previewData?.rows?.length > 0 && previewComparisons.length === 0) {
      requestPreview(previewData.rows);
    }
  }, [mappings.length, previewData, previewComparisons.length, requestPreview]);

  // ── Derived values ────────────────────────────────────────────────────────
  const sourceColumns = useMemo(() => {
    if (previewData?.columns) return previewData.columns;
    if (previewData?.rows?.[0]) return Object.keys(previewData.rows[0]);
    return [];
  }, [previewData]);

  const mappedSourceFields = useMemo(() =>
    getMappedSourceFields(sourceColumns),
    [getMappedSourceFields, sourceColumns]
  );

  const unmappedSourceFields = useMemo(() =>
    getUnmappedSourceFields(sourceColumns),
    [getUnmappedSourceFields, sourceColumns]
  );

  const mappedDestinationFields = useMemo(() =>
    mappings.map(m => m.destinationField).filter(Boolean),
    [mappings]
  );

  const transformedCount = useMemo(() => {
    return mappings.filter(m => m.transformation && m.transformation !== 'none').length;
  }, [mappings]);

  const displayName = datasetMeta?.filename || previewData?.filename || datasetId || 'Dataset';
  const displayFormat = (datasetMeta?.format || previewData?.format || 'csv').toLowerCase();
  const displaySize = datasetMeta?.size;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateMapping = useCallback((sourceField, destinationField) => {
    const alreadyMapped = mappings.some(
      m => m.sourceField === sourceField || m.destinationField === destinationField
    );
    if (alreadyMapped) return;

    addMapping(sourceField, destinationField, 'none', {});
    setSelectedSource(null);
    setSelectedDestination(null);
  }, [mappings, addMapping]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);

    const result = await saveMapping();

    if (result) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Automatically refresh preview
      requestPreview(previewData?.rows || sampleRows);
    }
    setSaving(false);
  }, [saveMapping, requestPreview, previewData, sampleRows]);

  const handleReset = useCallback(() => {
    resetMapping();
    setShowResetModal(false);
    setSelectedSource(null);
    setSelectedDestination(null);
  }, [resetMapping]);

  const handleClearAll = useCallback(() => {
    clearAllMappings();
    setShowClearModal(false);
    setSelectedSource(null);
    setSelectedDestination(null);
  }, [clearAllMappings]);

  const handleSelectSource = useCallback((field) => {
    setSelectedSource(prev => prev === field ? null : field);
  }, []);

  const handleSelectDestination = useCallback((field) => {
    setSelectedDestination(prev => prev === field ? null : field);
  }, []);

  const handleWorkflowTabSelect = (tabId) => {
    if (tabId === 'dataset') {
      navigate(`/datasets/${datasetId}/preview`);
      return;
    }
    if (tabId === 'process') {
      setShowProcessModal(true);
      return;
    }
    setActiveTab(tabId);
  };

  // Auto-create mapping when both source and destination are selected
  useEffect(() => {
    if (selectedSource && selectedDestination) {
      handleCreateMapping(selectedSource, selectedDestination);
    }
  }, [selectedSource, selectedDestination, handleCreateMapping]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link to={`/datasets/${datasetId}/preview`}>
            <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-slate-600 hover:text-slate-900">
              Back to Preview
            </Button>
          </Link>
        </div>
        <MappingSkeleton />
      </div>
    );
  }

  if (pageError && !previewData) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/datasets">
            <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-slate-600 hover:text-slate-900">
              Back to Datasets
            </Button>
          </Link>
        </div>
        <Card className="p-8 sm:p-12 text-center bg-white border-rose-200 shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <ServerCrash className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Unable to load dataset</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{pageError}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to="/datasets">
                <Button variant="outline">Back to Datasets</Button>
              </Link>
              <Button variant="primary" leftIcon={RefreshCw} onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">

      {/* ── Top Navigation & SaaS Workflow Stepper (Step 12) ─────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <Link to={`/datasets/${datasetId}/preview`}>
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-slate-600 hover:text-slate-900">
            Back to Preview
          </Button>
        </Link>
        
        <WorkflowStepper
          activeTab={activeTab}
          onSelectTab={handleWorkflowTabSelect}
          hasMappings={mappings.length > 0}
        />
      </div>

      {/* ── Dataset Header Card ─────────────────────────────────────────── */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Dataset info */}
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shrink-0 shadow-xs ${
              displayFormat === 'json'
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-800'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-800'
            }`}>
              {displayFormat === 'json'
                ? <FileCode className="w-7 h-7" />
                : <FileSpreadsheet className="w-7 h-7" />
              }
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  ETL Pipeline: Mapping & Transformations
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
                {displaySize && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>{formatBytes(displaySize)}</span>
                  </>
                )}
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Badge variant={displayFormat === 'json' ? 'purple' : 'info'} size="sm">
                  {displayFormat.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Status Indicators & Save / CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* Step 10: Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">● Unsaved changes</span>
              </div>
            )}

            {/* Step 9: Save success indicator */}
            {saveSuccess && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">✓ Mapping saved</span>
              </div>
            )}

            {/* Save Button */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={saving ? undefined : Save}
              isLoading={saving}
              onClick={handleSave}
              disabled={mappings.length === 0 || validationErrors.length > 0 || mappingLoading}
            >
              {saveSuccess ? 'Saved!' : 'Save Pipeline'}
            </Button>

            {/* Step 13: Processing CTA Button */}
            <Button
              variant="outline"
              size="sm"
              rightIcon={ArrowRight}
              onClick={() => setShowProcessModal(true)}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              Continue to Processing →
            </Button>
          </div>
        </div>

        {/* Pipeline Summary Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">{mappedSourceFields.length}</strong> of {sourceColumns.length} fields mapped
                </span>
              </div>
              {unmappedSourceFields.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    <strong className="text-amber-700 dark:text-amber-400">{unmappedSourceFields.length}</strong> unmapped
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">{destinationFields.length}</strong> destinations
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">{transformedCount}</strong> transformations configured
                </span>
              </div>
            </div>

            {lastSavedAt && !saveSuccess && !hasUnsavedChanges && (
              <span className="text-[11px] text-slate-400 font-mono">
                Saved {formatDate(lastSavedAt)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Mapping / Validation Error Banners ──────────────────────────── */}
      {mappingError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{mappingError}</p>
        </div>
      )}

      {/* ── View Tab Selector (Mapping / Transformations / Preview) ────── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mapping')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'mapping'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Field Mapping Workspace</span>
            <Badge size="sm" className="bg-white dark:bg-slate-900 border-slate-200">{mappings.length}</Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transform')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'transform'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Transformation Builder</span>
            {transformedCount > 0 && (
              <Badge size="sm" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">{transformedCount}</Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'preview'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live Output Preview</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          StreamWeaver Pipeline Engine
        </span>
      </div>

      {/* ── Stage 2: Field Mapping Workspace ────────────────────────────── */}
      {(activeTab === 'mapping' || activeTab === 'all') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Source Fields Panel */}
          <div className="lg:col-span-3">
            <SourceFieldsPanel
              columns={sourceColumns}
              mappedFields={mappedSourceFields}
              onSelectField={handleSelectSource}
              selectedField={selectedSource}
              loading={pageLoading}
            />
          </div>

          {/* Central Mapping Workspace */}
          <div className="lg:col-span-6">
            <MappingWorkspace
              mappings={mappings}
              onRemoveMapping={removeMapping}
              onCreateMapping={handleCreateMapping}
              sourceColumns={sourceColumns}
              destinationFields={destinationFields}
              selectedSource={selectedSource}
              selectedDestination={selectedDestination}
              onSelectSource={handleSelectSource}
              onSelectDestination={handleSelectDestination}
              onChangeTransformation={updateTransformation}
              onProceedToTransform={() => setActiveTab('transform')}
            />
          </div>

          {/* Destination Fields Panel */}
          <div className="lg:col-span-3">
            <DestinationFieldsPanel
              fields={destinationFields}
              mappedFields={mappedDestinationFields}
              onAddField={addDestinationField}
              onRemoveField={removeDestinationField}
              onSelectField={handleSelectDestination}
              selectedField={selectedDestination}
              loading={pageLoading}
              validationErrors={validationErrors}
            />
          </div>
        </div>
      )}

      {/* ── Stage 3: Transformation Section (Steps 2 - 6, 11) ───────────── */}
      {(activeTab === 'transform' || activeTab === 'all') && (
        <div ref={transformRef}>
          <TransformationSection
            mappings={mappings}
            sampleRows={previewData?.rows || sampleRows}
            onChangeTransformation={updateTransformation}
            onRemoveTransformation={removeTransformation}
            onResetTransformation={resetTransformation}
            onNavigateToMapping={() => setActiveTab('mapping')}
          />
        </div>
      )}

      {/* ── Stage 4: Live Before/After Preview (Steps 7, 8, 9, 15) ───────── */}
      {(activeTab === 'preview' || activeTab === 'all' || activeTab === 'transform' || activeTab === 'mapping') && (
        <div ref={previewRef} className="pt-2">
          <TransformationPreview
            mappings={mappings}
            sampleRows={previewData?.rows || sampleRows}
            previewComparisons={previewComparisons}
            onPreviewChanges={() => requestPreview(previewData?.rows || sampleRows)}
            isLoading={isPreviewLoading}
            previewError={previewError}
            lastPreviewedAt={lastPreviewedAt}
            hasUnsavedChanges={hasUnsavedChanges}
            isMappingSaved={Boolean(lastSavedAt && !hasUnsavedChanges)}
            validationErrors={validationErrors}
          />
        </div>
      )}

      {/* ── Bottom Actions Bar ───────────────────────────────────────────── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Discard / Clear All */}
          <div className="flex items-center gap-2">
            <Tooltip content="Discard unsaved mapping and transformation changes">
              <Button
                variant="outline"
                size="sm"
                leftIcon={RotateCcw}
                onClick={() => setShowResetModal(true)}
                disabled={!hasUnsavedChanges || mappingLoading}
              >
                Discard Changes
              </Button>
            </Tooltip>
            <Tooltip content="Remove all field mappings and transformations">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Trash2}
                onClick={() => setShowClearModal(true)}
                disabled={mappings.length === 0 || mappingLoading}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Clear All
              </Button>
            </Tooltip>
          </div>

          {/* Validation summary and Main Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {validationErrors.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="md"
              leftIcon={RefreshCw}
              isLoading={isPreviewLoading}
              onClick={() => requestPreview(previewData?.rows || sampleRows)}
              disabled={mappings.length === 0}
            >
              Preview Changes
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={saving ? undefined : Save}
              isLoading={saving}
              onClick={handleSave}
              disabled={mappings.length === 0 || validationErrors.length > 0 || mappingLoading}
            >
              {saveSuccess ? 'Saved!' : 'Save Pipeline'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Discard Confirmation Modal ──────────────────────────────────── */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Discard Changes?"
        description="This will reset all mappings and transformations to the last saved state. Any unsaved edits will be discarded."
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" leftIcon={RotateCcw} onClick={handleReset}>
            Discard Changes
          </Button>
        </div>
      </Modal>

      {/* ── Clear All Confirmation Modal ────────────────────────────────── */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Mappings?"
        description="This will remove all field mappings and their transformations. Destination field definitions will be preserved."
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" leftIcon={Trash2} onClick={handleClearAll}>
            Clear All Mappings
          </Button>
        </div>
      </Modal>

      {/* ── Continue to Processing Modal (Step 13) ───────────────────────── */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Ready to Process Dataset?"
        description={`Your ETL pipeline configured with ${mappings.length} mapped fields and ${transformedCount} transformations is ready for execution.`}
      >
        <div className="space-y-3 mt-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Dataset:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Mappings:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{mappings.length} fields</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Transformations:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{transformedCount} active</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="outline" onClick={() => setShowProcessModal(false)}>
              Back to Editing
            </Button>
            <Button
              variant="primary"
              leftIcon={Play}
              onClick={() => {
                setShowProcessModal(false);
                navigate('/jobs');
              }}
            >
              Go to Jobs Engine
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default MappingPage;
