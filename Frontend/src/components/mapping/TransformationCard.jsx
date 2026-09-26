import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  Settings2, 
  X, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  ArrowDownRight,
  Database,
  Target
} from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import TransformationSelector from './TransformationSelector';
import TransformationConfigModal from './TransformationConfigModal';
import { getTransformationMeta, applyClientTransformation } from '../../utils/transformationUtils';

/**
 * Transformation card showcasing:
 * SOURCE -> MAPPING -> TRANSFORMATION -> OUTPUT
 * With transformation selector, config options, reset, and remove controls.
 */
export function TransformationCard({
  mapping,
  index,
  sampleValue = 'sample_value',
  onChangeTransformation,
  onRemoveTransformation,
  onResetTransformation,
  onUpdateConfig,
  disabled = false
}) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const currentTransform = mapping.transformation || 'none';
  const transformMeta = getTransformationMeta(currentTransform);
  const hasConfig = transformMeta.hasConfig;
  const isTransformed = currentTransform !== 'none';

  // Calculate live preview value for this specific field
  const previewBefore = sampleValue !== undefined && sampleValue !== null ? String(sampleValue) : '—';
  const previewAfter = useMemo(() => {
    if (sampleValue === undefined || sampleValue === null) return '—';
    const res = applyClientTransformation(sampleValue, currentTransform, mapping.transformConfig);
    return res !== null && res !== undefined ? String(res) : 'null';
  }, [sampleValue, currentTransform, mapping.transformConfig]);

  const handleSelectorChange = (newTransformId) => {
    const meta = getTransformationMeta(newTransformId);
    if (meta.hasConfig) {
      onChangeTransformation(mapping.id, newTransformId, mapping.transformConfig || {});
      setIsConfigOpen(true);
    } else {
      onChangeTransformation(mapping.id, newTransformId, {});
    }
  };

  const handleSaveConfig = (id, newConfig) => {
    if (onUpdateConfig) {
      onUpdateConfig(id, newConfig);
    } else {
      onChangeTransformation(id, mapping.transformation, newConfig);
    }
  };

  return (
    <>
      <Card className="enterprise-card transition-all duration-200 hover:shadow-md border-slate-200 dark:border-slate-800">
        <CardBody className="p-4 space-y-3.5">
          {/* Top row: Header with field names & action buttons */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  <span className="text-slate-500 font-normal">Field:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{mapping.destinationField}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  <span>from source</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">{mapping.sourceField}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {hasConfig && (
                <Tooltip content="Edit configuration">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigOpen(true)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>
              )}

              {isTransformed && (
                <Tooltip content="Reset transformation to None">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTransformation(mapping.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Middle: Transformation Selector & Config info */}
          <div className="bg-slate-50/80 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Transformation
              </span>
              <TransformationSelector
                value={currentTransform}
                onChange={handleSelectorChange}
                disabled={disabled}
              />
            </div>

            {/* Config summary tag if configured */}
            {hasConfig && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/50 dark:border-slate-800">
                <span className="truncate">
                  {currentTransform === 'replace' && (
                    <>Find: <strong className="font-mono text-slate-700 dark:text-slate-300">"{mapping.transformConfig?.find || ''}"</strong> → Replace: <strong className="font-mono text-slate-700 dark:text-slate-300">"{mapping.transformConfig?.replaceWith || ''}"</strong></>
                  )}
                  {currentTransform === 'prefix' && (
                    <>Prefix: <strong className="font-mono text-slate-700 dark:text-slate-300">"{mapping.transformConfig?.prefix || ''}"</strong></>
                  )}
                  {currentTransform === 'suffix' && (
                    <>Suffix: <strong className="font-mono text-slate-700 dark:text-slate-300">"{mapping.transformConfig?.suffix || ''}"</strong></>
                  )}
                  {currentTransform === 'default_value' && (
                    <>Default: <strong className="font-mono text-slate-700 dark:text-slate-300">"{mapping.transformConfig?.defaultValue || ''}"</strong></>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(true)}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold cursor-pointer shrink-0 ml-2"
                >
                  Configure
                </button>
              </div>
            )}
          </div>

          {/* Bottom: Visual Pipeline flow (Source -> Mapping -> Transformation -> Output) */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              {/* Before preview */}
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                  Sample Before
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-100 dark:border-slate-800" title={previewBefore}>
                  {previewBefore}
                </div>
              </div>

              {/* After preview */}
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider mb-0.5 flex items-center justify-between">
                  <span>Output After</span>
                  {isTransformed && <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />}
                </div>
                <div className={`font-mono text-xs truncate px-2 py-1 rounded border font-semibold ${
                  isTransformed
                    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                }`} title={previewAfter}>
                  {previewAfter}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Configuration Modal */}
      <TransformationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        mapping={mapping}
        onSaveConfig={handleSaveConfig}
      />
    </>
  );
}

export default TransformationCard;
