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
  Target,
  Code2,
  CheckCircle2,
  AlertTriangle
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
 * With transformation selector, custom JS rule preview, config options, reset, and remove controls.
 */
export function TransformationCard({
  mapping,
  index,
  sampleValue = 'sample_value',
  sampleRows = [],
  onChangeTransformation,
  onRemoveTransformation,
  onResetTransformation,
  onUpdateConfig,
  disabled = false
}) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const currentTransform = mapping.transformation || 'none';
  const isCustomJs = currentTransform === 'custom_js' || currentTransform === 'custom_javascript' || currentTransform === 'custom';
  const customCode = mapping.transformConfig?.code;
  const isConfigured = !isCustomJs || Boolean(customCode && customCode.trim());

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
      const defaultCfg = newTransformId === 'custom_js'
        ? { code: mapping.transformConfig?.code || 'return value.toUpperCase();' }
        : (mapping.transformConfig || {});
      onChangeTransformation(mapping.id, newTransformId, defaultCfg);
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
          {/* Top row: Header with field names & action buttons (Step 9) */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                  <span className="text-slate-500 font-normal">Mapped →</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{mapping.destinationField}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  <span>Source:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">{mapping.sourceField}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {hasConfig && (
                <Tooltip content={isCustomJs ? 'Edit JavaScript Rule' : 'Edit Configuration'}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfigOpen(true)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                  >
                    {isCustomJs ? <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <Settings2 className="w-3.5 h-3.5" />}
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  Transformation
                </span>
                {isCustomJs && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                    isConfigured
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isConfigured ? '✓ Valid' : '○ Not configured'}
                  </span>
                )}
              </div>
              <TransformationSelector
                value={currentTransform}
                onChange={handleSelectorChange}
                disabled={disabled}
              />
            </div>

            {/* Custom JS Code Snippet Preview (Step 9) */}
            {isCustomJs && (
              <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">JS Rule:</div>
                  <code className="block text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/30 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/40 truncate">
                    {customCode || 'return value.toUpperCase();'}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Code2}
                  onClick={() => setIsConfigOpen(true)}
                  className="text-xs h-7 text-purple-700 dark:text-purple-300 border-purple-200 hover:bg-purple-50 shrink-0 mt-3"
                >
                  Edit Rule
                </Button>
              </div>
            )}

            {/* Standard Config summary tag if configured */}
            {hasConfig && !isCustomJs && (
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

      {/* Configuration Modal with CustomRuleEditor support */}
      <TransformationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        mapping={mapping}
        sampleRows={sampleRows}
        onSaveConfig={handleSaveConfig}
      />
    </>
  );
}

export default TransformationCard;
