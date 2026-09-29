import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Code2,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Check,
  X,
  Layers,
  ArrowRight,
  BookOpen,
  Copy,
  Info,
  RefreshCw,
  Terminal,
  Clock,
  Save
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { mappingService } from '../../services/mappingService';
import { CUSTOM_JS_EXAMPLES } from '../../utils/transformationUtils';

/**
 * Validation States enum
 */
export const VALIDATION_STATE = {
  NOT_CONFIGURED: 'not_configured',
  CHECKING: 'checking',
  VALID: 'valid',
  INVALID: 'invalid',
};

/**
 * Professional Custom JavaScript Transformation Builder & Rule Previewer.
 * 
 * Supports:
 * - Code editor area with line numbers and monospace syntax UI
 * - Input value and record documentation
 * - Selectable quick preset examples
 * - Backend server-side VM sandbox execution for security
 * - Before / After live comparison table with real dataset samples
 * - Validation state indicator (Not Configured, Checking, Valid, Invalid)
 * - Security messaging note
 * - Friendly error handling for syntax, runtime, timeout, and server errors
 * - Unsaved changes detection with Save, Discard, and Reset actions
 */
export function CustomRuleEditor({
  mapping,
  sampleRows = [],
  onSaveRule,
  onCancel,
  initialCode = '',
  standalone = false,
}) {
  const currentField = mapping?.destinationField || mapping?.sourceField || 'value';
  const initialValue = initialCode || mapping?.transformConfig?.code || 'return value.toUpperCase();';

  const [code, setCode] = useState(initialValue);
  const [savedCode, setSavedCode] = useState(initialValue);
  const [validationState, setValidationState] = useState(
    initialValue ? VALIDATION_STATE.NOT_CONFIGURED : VALIDATION_STATE.NOT_CONFIGURED
  );
  const [isValidating, setIsValidating] = useState(false);
  const [previewResults, setPreviewResults] = useState([]);
  const [errorDetails, setErrorDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('examples'); // 'examples' | 'docs'
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Extract sample values from actual dataset rows or provide defaults
  const sampleValues = useMemo(() => {
    if (sampleRows && sampleRows.length > 0) {
      return sampleRows.slice(0, 5).map(row => {
        if (typeof row === 'object' && row !== null) {
          return row[mapping?.sourceField] !== undefined ? row[mapping?.sourceField] : '';
        }
        return String(row);
      });
    }
    return ['gaurav', 'rahul', 'amit', '1049.50', 'admin@example.com'];
  }, [sampleRows, mapping?.sourceField]);

  // Check if there are unsaved modifications
  const hasUnsavedCode = useMemo(() => {
    return code.trim() !== savedCode.trim();
  }, [code, savedCode]);

  // Code lines for line-number display
  const lineCount = useMemo(() => {
    return Math.max(code.split('\n').length, 5);
  }, [code]);

  // ── Step 6: Backend Preview Rule execution ──────────────────────────────────
  const handlePreviewRule = useCallback(async (codeToTest = code) => {
    if (!codeToTest || !codeToTest.trim()) {
      setValidationState(VALIDATION_STATE.NOT_CONFIGURED);
      setPreviewResults([]);
      setErrorDetails(null);
      return;
    }

    setIsValidating(true);
    setValidationState(VALIDATION_STATE.CHECKING);
    setErrorDetails(null);

    try {
      const response = await mappingService.previewCustomRule({
        code: codeToTest,
        sampleValues,
        fieldName: mapping?.sourceField || 'value',
        sampleRows: sampleRows.slice(0, 5),
      });

      if (response && response.preview) {
        const preview = response.preview;
        setPreviewResults(preview.comparisons || []);

        if (preview.valid) {
          setValidationState(VALIDATION_STATE.VALID);
          setErrorDetails(null);
        } else {
          setValidationState(VALIDATION_STATE.INVALID);
          
          let friendlyMsg = 'The transformation could not be executed.';
          if (preview.errorType === 'syntax_error') {
            friendlyMsg = 'Invalid JavaScript rule. Please check your syntax.';
          } else if (preview.errorType === 'timeout_error') {
            friendlyMsg = 'The transformation took too long to execute (Timeout limit 1000ms).';
          } else if (preview.errorMessage) {
            friendlyMsg = preview.errorMessage;
          }

          setErrorDetails({
            type: preview.errorType || 'execution_error',
            message: friendlyMsg,
            raw: preview.errorMessage
          });
        }
      } else {
        throw new Error('Invalid response structure from backend preview');
      }
    } catch (err) {
      console.warn('Backend sandbox preview failed:', err);
      setValidationState(VALIDATION_STATE.INVALID);
      setErrorDetails({
        type: 'server_error',
        message: 'Unable to validate transformation. Please check your JavaScript rule and try again.',
        raw: err.message
      });
    } finally {
      setIsValidating(false);
    }
  }, [code, sampleValues, mapping?.sourceField, sampleRows]);

  // Automatically run preview once on mount if code is present
  useEffect(() => {
    if (initialValue) {
      handlePreviewRule(initialValue);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When user edits code, reset validation to Checking/Not Configured until Preview is clicked
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (validationState === VALIDATION_STATE.VALID || validationState === VALIDATION_STATE.INVALID) {
      setValidationState(VALIDATION_STATE.NOT_CONFIGURED);
    }
  };

  // Insert an example rule
  const handleInsertExample = (example) => {
    setCode(example.code);
    setValidationState(VALIDATION_STATE.NOT_CONFIGURED);
    handlePreviewRule(example.code);
  };

  // Reset to initial saved code
  const handleReset = () => {
    setCode(savedCode);
    handlePreviewRule(savedCode);
  };

  // Discard changes
  const handleDiscard = () => {
    setCode(savedCode);
    if (onCancel) onCancel();
  };

  // Save the custom rule configuration
  const handleSave = () => {
    if (onSaveRule) {
      onSaveRule(code);
      setSavedCode(code);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header & Context ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Custom JavaScript Transformation</span>
                {mapping && (
                  <Badge variant="purple" size="sm" className="font-mono">
                    {mapping.sourceField} → {mapping.destinationField}
                  </Badge>
                )}
              </h4>
              <p className="text-xs text-slate-500">
                Write a JavaScript expression or function body to transform the field value.
              </p>
            </div>
          </div>
        </div>

        {/* Validation Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {validationState === VALIDATION_STATE.NOT_CONFIGURED && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>○ Not configured</span>
            </div>
          )}

          {validationState === VALIDATION_STATE.CHECKING && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>◌ Checking...</span>
            </div>
          )}

          {validationState === VALIDATION_STATE.VALID && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>✓ Valid transformation</span>
            </div>
          )}

          {validationState === VALIDATION_STATE.INVALID && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-in fade-in">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>⚠ Invalid transformation</span>
            </div>
          )}

          {hasUnsavedCode && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>● Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 8: Security Banner ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
        <span>
          <strong>Security notice:</strong> Custom transformations are executed in a secure server-side sandbox.
        </span>
      </div>

      {/* ── Main Code Editor Area (Step 3 & Step 5) ────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>JavaScript Rule Editor</span>
            <span className="text-[11px] font-normal text-slate-400">
              (Input: <code className="text-indigo-600 dark:text-indigo-400 font-bold">value</code>)
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              {code.length} chars
            </span>
          </div>
        </div>

        {/* Code Editor Container */}
        <div className="relative rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-950 text-slate-100 overflow-hidden shadow-inner font-mono text-xs">
          {/* Top Editor Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-slate-300">transform.js</span>
            </div>
            <span className="text-slate-500 text-[10px]">Node.js Sandbox Engine</span>
          </div>

          {/* Editor Body with Line Numbers */}
          <div className="flex">
            {/* Line Numbers Column */}
            <div className="py-3 px-2 bg-slate-900/50 text-slate-600 select-none text-right font-mono text-xs border-r border-slate-800/80 min-w-[36px]">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="return value.toUpperCase();"
                rows={Math.max(5, lineCount)}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                className="w-full bg-transparent text-emerald-400 font-mono text-xs p-3 leading-6 focus:outline-hidden resize-y min-h-[120px] custom-scrollbar selection:bg-indigo-700 selection:text-white"
              />
            </div>
          </div>
        </div>

        {/* Editor Helper Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>The current field value is passed in as <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-bold rounded">value</code>. Always <code className="font-semibold text-slate-700 dark:text-slate-300">return</code> the transformed result.</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={isValidating ? undefined : Play}
            isLoading={isValidating}
            onClick={() => handlePreviewRule(code)}
            className="text-xs h-8 shadow-xs"
          >
            {isValidating ? 'Executing Sandbox...' : 'Preview Rule'}
          </Button>
        </div>
      </div>

      {/* ── Step 4 & 5: Example Rules & Documentation Tabs ──────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 overflow-hidden">
        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3 pt-2 gap-2 bg-slate-100/60 dark:bg-slate-800/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('examples')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'examples'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Examples</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-t-lg transition-colors cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t border-x border-slate-200 dark:border-slate-800 -mb-px'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rule Documentation</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-3">
          {activeTab === 'examples' ? (
            /* PRESET EXAMPLES (Step 4) */
            <div className="space-y-2">
              <div className="text-[11px] text-slate-500">
                Click any example to quickly insert it into the rule editor:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CUSTOM_JS_EXAMPLES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleInsertExample(ex)}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-xs transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                        {ex.label}
                      </span>
                      <span className="text-[10px] text-indigo-500 group-hover:underline">Use rule →</span>
                    </div>
                    <code className="block font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded truncate">
                      {ex.code}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* DOCUMENTATION (Step 5) */
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Available Inputs</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div>
                      <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">value</code>: The current field's scalar value (string, number, or null).
                    </div>
                    <div>
                      <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">record</code>: The entire current row record object (e.g. <code className="font-mono">record.email</code>).
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Return Requirement</span>
                  </div>
                  <div className="text-[11px] space-y-1">
                    <div>
                      Use <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">return &lt;transformed_value&gt;;</code> to produce the destination output.
                    </div>
                    <div className="text-slate-400">
                      Standard utilities available: <code className="font-mono">Math</code>, <code className="font-mono">Number</code>, <code className="font-mono">String</code>, <code className="font-mono">JSON</code>, <code className="font-mono">Date</code>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 7 & 13: Error Display ──────────────────────────────────── */}
      {errorDetails && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-1 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>⚠ Transformation Error</span>
          </div>
          <div className="text-xs text-rose-700 dark:text-rose-300 pl-6">
            {errorDetails.message}
          </div>
          {errorDetails.raw && errorDetails.type !== 'server_error' && (
            <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 pl-6 opacity-80">
              Details: {errorDetails.raw}
            </div>
          )}
        </div>
      )}

      {/* ── Step 7: Live Before/After Custom Rule Preview Table ──────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Sandbox Preview Results</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {previewResults.length} sample records evaluated
          </span>
        </div>

        {previewResults.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Click <strong>[ Preview Rule ]</strong> to execute this rule against sample values in the backend sandbox.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-3.5 py-2 bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-1">#</div>
              <div className="col-span-5">BEFORE</div>
              <div className="col-span-1 text-center">→</div>
              <div className="col-span-5">AFTER</div>
            </div>

            {/* Rows */}
            {previewResults.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-12 items-center px-3.5 py-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                  item.valid === false ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-700' : ''
                }`}
              >
                <div className="col-span-1 text-slate-400 text-[11px]">{idx + 1}</div>
                <div className="col-span-5 truncate text-slate-600 dark:text-slate-400" title={String(item.before)}>
                  {item.before !== null && item.before !== undefined ? String(item.before) : <span className="italic text-slate-400">null</span>}
                </div>
                <div className="col-span-1 text-center text-slate-300 dark:text-slate-600">
                  <ArrowRight className="w-3 h-3 mx-auto" />
                </div>
                <div className="col-span-5 truncate font-semibold" title={String(item.after)}>
                  {item.valid === false ? (
                    <span className="text-rose-600 dark:text-rose-400 text-[11px]">⚠ Error</span>
                  ) : item.after !== null && item.after !== undefined ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                      {String(item.after)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">null</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 11 & Step 12: Actions Footer (Save / Discard / Reset) ──── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {hasUnsavedCode && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={handleReset}
              className="text-xs"
            >
              Reset to Saved
            </Button>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {saveSuccessNotice && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>✓ Transformation saved</span>
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={Save}
            onClick={handleSave}
            disabled={!code.trim() || validationState === VALIDATION_STATE.INVALID}
            className="text-xs"
          >
            Save Transformation
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CustomRuleEditor;
