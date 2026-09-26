import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Workflow, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Target,
  Layers,
  Scissors,
  ArrowUpAZ,
  ArrowDownAZ,
  Info,
  SlidersHorizontal,
  Link2
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { Tooltip } from '../ui/Tooltip';
import TransformationCard from './TransformationCard';

/**
 * Dedicated Transformation Builder Section for StreamWeaver.
 * Communicates:
 * - Mapping = Where the data goes
 * - Transformation = How the data changes
 * - Pipeline = Source -> Mapping -> Transformation -> Output
 */
export function TransformationSection({
  mappings = [],
  sampleRows = [],
  onChangeTransformation,
  onRemoveTransformation,
  onResetTransformation,
  onUpdateConfig,
  onBatchApplyTransform,
  onNavigateToMapping,
  disabled = false
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Sample record used for single-card live preview
  const firstSampleRow = useMemo(() => sampleRows?.[0] || {}, [sampleRows]);

  // Filter mappings by destination/source search
  const filteredMappings = useMemo(() => {
    if (!searchTerm) return mappings;
    const lower = searchTerm.toLowerCase();
    return mappings.filter(
      m => m.destinationField?.toLowerCase().includes(lower) || m.sourceField?.toLowerCase().includes(lower)
    );
  }, [mappings, searchTerm]);

  // Count active transformations
  const activeTransformCount = useMemo(() => {
    return mappings.filter(m => m.transformation && m.transformation !== 'none').length;
  }, [mappings]);

  // Quick batch actions
  const handleApplyToAll = (transformId) => {
    if (onBatchApplyTransform) {
      onBatchApplyTransform(transformId);
    } else {
      mappings.forEach(m => {
        onChangeTransformation(m.id, transformId, {});
      });
    }
  };

  const handleResetAllTransforms = () => {
    mappings.forEach(m => {
      onRemoveTransformation(m.id);
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Section Header ────────────────────────────────────────────── */}
      <Card className="enterprise-card bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardBody className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Core Philosophy explanation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Transformation Builder
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Mapping</span> defines where data goes • <span className="font-semibold text-indigo-600 dark:text-indigo-400">Transformation</span> defines how data changes
                  </p>
                </div>
              </div>
            </div>

            {/* Stats & Batch quick buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={activeTransformCount > 0 ? 'purple' : 'neutral'} size="md">
                {activeTransformCount} of {mappings.length} transformed
              </Badge>

              {mappings.length > 0 && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <Tooltip content="Set all mapped fields to Uppercase">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={ArrowUpAZ}
                      onClick={() => handleApplyToAll('uppercase')}
                      className="text-xs h-8"
                    >
                      All UPPER
                    </Button>
                  </Tooltip>
                  <Tooltip content="Set all mapped fields to Trim">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={Scissors}
                      onClick={() => handleApplyToAll('trim')}
                      className="text-xs h-8"
                    >
                      All Trim
                    </Button>
                  </Tooltip>
                  {activeTransformCount > 0 && (
                    <Tooltip content="Reset all fields to None (Direct)">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={RotateCcw}
                        onClick={handleResetAllTransforms}
                        className="text-xs h-8 text-slate-500 hover:text-rose-600"
                      >
                        Reset
                      </Button>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Key UX Concept Banner: Pipeline Flow Architecture ──────────── */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-800/40 dark:via-indigo-950/20 dark:to-slate-800/40 border border-indigo-100/60 dark:border-indigo-900/30">
            <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs py-1">
              
              {/* Step 1: SOURCE */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                  1
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">SOURCE</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">First Name</div>
                  <div className="text-[10px] text-slate-500 font-mono italic">"gaurav"</div>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 shrink-0 mx-1" />

              {/* Step 2: MAPPING */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                  2
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">MAPPING</div>
                  <div className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">firstName</div>
                  <div className="text-[10px] text-slate-500">Destination target</div>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 shrink-0 mx-1" />

              {/* Step 3: TRANSFORMATION */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                  3
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">TRANSFORMATION</div>
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300">Uppercase</div>
                  <div className="text-[10px] text-indigo-500">String transform</div>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-indigo-300 dark:text-indigo-600 shrink-0 mx-1" />

              {/* Step 4: OUTPUT */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                  ✓
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">OUTPUT</div>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">"GAURAV"</div>
                  <div className="text-[10px] text-emerald-600/80">Result record</div>
                </div>
              </div>

            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Search and Filter bar (when mappings exist) ────────────────── */}
      {mappings.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter mapped fields..."
              className="pl-9 text-xs h-9"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredMappings.length} of {mappings.length} cards
          </span>
        </div>
      )}

      {/* ── Transformation Cards Grid or Empty State ───────────────────── */}
      {mappings.length === 0 ? (
        <Card className="enterprise-card border-dashed p-10 text-center bg-slate-50/50 dark:bg-slate-900/20">
          <EmptyState
            icon={Link2}
            title="No fields mapped yet"
            description="Connect source fields to destination fields to start building your transformation pipeline."
            action={
              onNavigateToMapping && (
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={Workflow}
                  onClick={onNavigateToMapping}
                >
                  Start Mapping
                </Button>
              )
            }
          />
        </Card>
      ) : filteredMappings.length === 0 ? (
        <Card className="enterprise-card border-dashed p-8 text-center bg-slate-50/50">
          <EmptyState
            icon={Search}
            title="No matching fields"
            description={`No mapped fields match "${searchTerm}".`}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMappings.map((mapping, index) => (
            <TransformationCard
              key={mapping.id}
              mapping={mapping}
              index={index}
              sampleValue={firstSampleRow?.[mapping.sourceField]}
              onChangeTransformation={onChangeTransformation}
              onRemoveTransformation={onRemoveTransformation}
              onResetTransformation={onResetTransformation}
              onUpdateConfig={onUpdateConfig}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TransformationSection;
