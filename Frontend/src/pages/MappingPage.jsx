import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  WifiOff,
} from 'lucide-react';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import SourceFieldsPanel from '../components/mapping/SourceFieldsPanel';
import DestinationFieldsPanel from '../components/mapping/DestinationFieldsPanel';
import MappingWorkspace from '../components/mapping/MappingWorkspace';
import MappingPreview from '../components/mapping/MappingPreview';
import { useMapping } from '../hooks/useMapping';
import { fileService } from '../services/fileService';
import { formatBytes, formatDate } from '../utils/formatters';

// ─── Workflow step definitions ─────────────────────────────────────────────────
const STEPS = [
  { id: 'mapping', label: 'Field Mapping', icon: Layers },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'process', label: 'Process', icon: Workflow },
];

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function MappingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="enterprise-card rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="enterprise-card rounded-xl p-6 space-y-3">
            <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stepper component ─────────────────────────────────────────────────────────
function WorkflowStepper({ currentStep, steps }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : isComplete
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-400 border border-transparent'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isComplete
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {isComplete ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className={`w-4 h-4 shrink-0 ${
                index < currentIndex ? 'text-emerald-400' : 'text-slate-300'
              }`} />
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
    addDestinationField,
    removeDestinationField,
    saveMapping,
    resetMapping,
    clearAllMappings,
    getMappedSourceFields,
    getUnmappedSourceFields,
    validate,
  } = useMapping(datasetId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentStep] = useState('mapping');
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Fetch dataset metadata and preview ────────────────────────────────────
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
      }

      // Only set error if BOTH failed
      if (metaRes.status === 'rejected' && previewRes.status === 'rejected') {
        setPageError('Unable to load dataset. Please check your connection and try again.');
      }

      setPageLoading(false);
    });

    return () => { active = false; };
  }, [datasetId]);

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

  const displayName = datasetMeta?.filename || previewData?.filename || datasetId || 'Dataset';
  const displayFormat = (datasetMeta?.format || previewData?.format || 'csv').toLowerCase();
  const displaySize = datasetMeta?.size;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateMapping = useCallback((sourceField, destinationField) => {
    // Prevent duplicate mappings
    const alreadyMapped = mappings.some(
      m => m.sourceField === sourceField || m.destinationField === destinationField
    );
    if (alreadyMapped) return;

    addMapping(sourceField, destinationField);
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
    }
    setSaving(false);
  }, [saveMapping]);

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

  // Auto-create mapping when both source and destination are selected
  useEffect(() => {
    if (selectedSource && selectedDestination) {
      handleCreateMapping(selectedSource, selectedDestination);
    }
  }, [selectedSource, selectedDestination, handleCreateMapping]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Loading state
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

  // Error state
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
    <div className="space-y-5">

      {/* ── Top navigation ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link to={`/datasets/${datasetId}/preview`}>
          <Button variant="ghost" size="sm" leftIcon={ArrowLeft} className="text-slate-600 hover:text-slate-900">
            Back to Preview
          </Button>
        </Link>
        <WorkflowStepper currentStep={currentStep} steps={STEPS} />
      </div>

      {/* ── Dataset header card ─────────────────────────────────────────── */}
      <Card className="p-5 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Dataset info */}
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shrink-0 shadow-xs ${
              displayFormat === 'json'
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {displayFormat === 'json'
                ? <FileCode className="w-7 h-7" />
                : <FileSpreadsheet className="w-7 h-7" />
              }
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Transform Dataset
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{displayName}</span>
                {displaySize && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{formatBytes(displaySize)}</span>
                  </>
                )}
                <span className="text-slate-300">•</span>
                <Badge variant={displayFormat === 'json' ? 'purple' : 'info'} size="sm">
                  {displayFormat.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Status and actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
              </div>
            )}

            {/* Save success indicator */}
            {saveSuccess && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Mapping saved successfully</span>
              </div>
            )}

            {/* Last saved timestamp */}
            {lastSavedAt && !saveSuccess && !hasUnsavedChanges && (
              <span className="text-[11px] text-slate-400 font-mono">
                Saved {formatDate(lastSavedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Mapping stats bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-slate-600">
                <strong className="text-slate-800">{mappedSourceFields.length}</strong> of {sourceColumns.length} fields mapped
              </span>
            </div>
            {unmappedSourceFields.length > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-600">
                  <strong className="text-amber-700">{unmappedSourceFields.length}</strong> unmapped
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-600">
                <strong className="text-slate-800">{destinationFields.length}</strong> destination fields
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-600">
                <strong className="text-slate-800">{mappings.length}</strong> active mappings
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Mapping error ───────────────────────────────────────────────── */}
      {mappingError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm text-rose-700">{mappingError}</p>
        </div>
      )}

      {/* ── Source + Workspace + Destination panels ──────────────────────── */}
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

      {/* ── Mapping Preview ─────────────────────────────────────────────── */}
      <MappingPreview
        sourceColumns={sourceColumns}
        mappings={mappings}
        previewRows={previewData?.rows || []}
      />

      {/* ── Actions bar ─────────────────────────────────────────────────── */}
      <Card className="bg-white border-slate-200">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left actions */}
          <div className="flex items-center gap-2">
            <Tooltip content="Reset to last saved state">
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
            <Tooltip content="Remove all mappings">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Trash2}
                onClick={() => setShowClearModal(true)}
                disabled={mappings.length === 0 || mappingLoading}
                className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              >
                Clear All
              </Button>
            </Tooltip>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Validation errors summary */}
            {validationErrors.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              leftIcon={saving ? undefined : Save}
              isLoading={saving}
              onClick={handleSave}
              disabled={mappings.length === 0 || validationErrors.length > 0 || mappingLoading}
            >
              {saveSuccess ? 'Saved!' : 'Save Mapping'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Reset Confirmation Modal ────────────────────────────────────── */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Discard Changes?"
        description="This will reset all mappings to the last saved state. Any unsaved changes will be lost."
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
        description="This will remove all field mappings. Your destination fields will be preserved but all connections will be removed."
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
    </div>
  );
}

export default MappingPage;
