import React, { useState } from 'react';
import { 
  Eye, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Table as TableIcon, 
  Columns, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { EmptyState } from '../ui/EmptyState';
import { getTransformationMeta } from '../../utils/transformationUtils';

/**
 * Enterprise Transformation Preview Component
 * Showcases side-by-side Before & After sample data, live transformation results,
 * "Preview Changes" trigger button, status indicators, and friendly error alerts.
 */
export function TransformationPreview({
  mappings = [],
  sampleRows = [],
  previewComparisons = [],
  onPreviewChanges,
  isLoading = false,
  previewError = null,
  lastPreviewedAt = null,
  hasUnsavedChanges = false,
  isMappingSaved = false,
  validationErrors = []
}) {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' (Before -> After) or 'table' (Tabular Output)

  const activeMappings = mappings.filter(m => m.sourceField && m.destinationField);
  const activeTransformCount = activeMappings.filter(m => m.transformation && m.transformation !== 'none').length;

  // Use provided backend/computed preview comparisons if available; otherwise generate local view
  const displayRows = previewComparisons.length > 0
    ? previewComparisons
    : sampleRows.slice(0, 5).map((row, rowIndex) => ({
        rowIndex,
        raw: row,
        fields: activeMappings.map(rule => {
          const sourceVal = row[rule.sourceField];
          return {
            sourceField: rule.sourceField,
            destinationField: rule.destinationField,
            transformation: rule.transformation || 'none',
            before: sourceVal !== undefined ? sourceVal : null,
            after: sourceVal !== undefined ? sourceVal : null
          };
        })
      }));

  if (activeMappings.length === 0) {
    return (
      <Card className="enterprise-card border-dashed bg-slate-50/50 dark:bg-slate-900/30">
        <CardBody className="p-8">
          <EmptyState
            icon={Eye}
            title="Data Transformation Preview"
            description="Create field mappings above to view how source records transform into destination schema."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="enterprise-card overflow-hidden border-slate-200 dark:border-slate-800">
      {/* ── Preview Header ─────────────────────────────────────────────── */}
      <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Live Transformation Preview
            </h3>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>Showing first {displayRows.length} sample records</span>
              {lastPreviewedAt && (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Updated {new Date(lastPreviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicators & Preview Trigger Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badges */}
          {isMappingSaved && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mapping saved</span>
            </div>
          )}

          {activeTransformCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{activeTransformCount} configured</span>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Transformation requires valid field</span>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'diff'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Before & After
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Output Table
            </button>
          </div>

          {/* Preview Changes Button */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={isLoading ? undefined : RefreshCw}
            isLoading={isLoading}
            onClick={onPreviewChanges}
            className="text-xs h-8 shadow-xs"
          >
            Preview Changes
          </Button>
        </div>
      </CardHeader>

      {/* ── Professional Error Banner (Step 15) ────────────────────────── */}
      {previewError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="font-semibold text-rose-800 dark:text-rose-200">
              Unable to apply transformation.
            </div>
            <div className="text-rose-600 dark:text-rose-400">
              Please check the selected field parameters and try again.
            </div>
            {typeof previewError === 'string' && previewError !== 'Failed to fetch' && (
              <div className="text-[10px] font-mono text-rose-500 mt-1">
                Details: {previewError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Preview Body ───────────────────────────────────────────────── */}
      <CardBody className="p-0 overflow-x-auto">
        {viewMode === 'diff' ? (
          /* BEFORE & AFTER DIFF VIEW */
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayRows.map((rowItem, rowIdx) => {
              const fields = rowItem.fields || [];
              return (
                <div key={`row-${rowIdx}`} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Record #{rowIdx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fields.map((fieldItem, fIdx) => {
                      const transformMeta = getTransformationMeta(fieldItem.transformation);
                      const isModified = fieldItem.transformation && fieldItem.transformation !== 'none';
                      const beforeVal = fieldItem.before !== null && fieldItem.before !== undefined ? String(fieldItem.before) : 'null';
                      const afterVal = fieldItem.after !== null && fieldItem.after !== undefined ? String(fieldItem.after) : 'null';

                      return (
                        <div
                          key={`f-${fIdx}`}
                          className={`
                            rounded-xl p-3 border transition-all text-xs
                            ${isModified 
                              ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50' 
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'}
                          `}
                        >
                          {/* Field Header */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                              {fieldItem.destinationField}
                            </span>
                            <Badge 
                              size="sm" 
                              className={transformMeta.badgeColor}
                            >
                              {transformMeta.shortLabel}
                            </Badge>
                          </div>

                          {/* Before -> After Comparison */}
                          <div className="space-y-1.5 font-mono text-[11px]">
                            {/* Before */}
                            <div className="flex items-center justify-between gap-2 text-slate-500">
                              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                                BEFORE
                              </span>
                              <span className="truncate bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 max-w-[160px]" title={beforeVal}>
                                {beforeVal}
                              </span>
                            </div>

                            {/* Arrow */}
                            <div className="flex justify-center text-slate-300 dark:text-slate-600">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>

                            {/* After */}
                            <div className="flex items-center justify-between gap-2 font-semibold">
                              <span className="text-[10px] uppercase font-bold text-indigo-500 shrink-0">
                                AFTER
                              </span>
                              <span className={`truncate px-2 py-0.5 rounded max-w-[160px] ${
                                isModified
                                  ? 'bg-indigo-100/80 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200 shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`} title={afterVal}>
                                {afterVal}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABULAR DESTINATION OUTPUT VIEW */
          <div className="min-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <th className="py-2.5 px-3 font-semibold w-12 text-center text-slate-400">#</th>
                  {activeMappings.map((m) => {
                    const meta = getTransformationMeta(m.transformation);
                    return (
                      <th key={m.destinationField} className="py-2.5 px-4 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-indigo-700 dark:text-indigo-300">{m.destinationField}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({meta.shortLabel})</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {displayRows.map((rowItem, rowIdx) => {
                  const fields = rowItem.fields || [];
                  const fieldMap = fields.reduce((acc, curr) => {
                    acc[curr.destinationField] = curr.after;
                    return acc;
                  }, {});

                  return (
                    <tr key={`tbl-row-${rowIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{rowIdx + 1}</td>
                      {activeMappings.map((m) => {
                        const val = fieldMap[m.destinationField];
                        const displayVal = val !== undefined && val !== null ? String(val) : <span className="text-slate-300 dark:text-slate-600 italic font-sans">null</span>;
                        const isTransformed = m.transformation && m.transformation !== 'none';

                        return (
                          <td
                            key={`tbl-cell-${rowIdx}-${m.destinationField}`}
                            className={`py-2 px-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${
                              isTransformed ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300'
                            }`}
                            title={String(val)}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default TransformationPreview;
