import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertCircle,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { formatNumber } from '../../utils/formatters';

/**
 * FailedRecordsTable
 *
 * Professional table displaying failed/malformed ETL records:
 * Row | Field | Error | Status
 *
 * Features:
 * - Real-time client-side search across Row, Field, and Error text
 * - Dynamic field-level and error-type filtering
 * - Responsive pagination with configurable page size
 * - Deep inspection modal showing raw payload and sanitized failure analysis
 * - One-click CSV export of failed records
 */
export function FailedRecordsTable({
  errors = [],
  totalFailedCount = 0,
  datasetName = 'Dataset',
  className = ''
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fieldFilter, setFieldFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedError, setSelectedError] = useState(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Normalize error items so both backend formats (row/rowNumber, error/message) are supported
  const normalizedErrors = useMemo(() => {
    if (!Array.isArray(errors)) return [];
    return errors.map((item, idx) => {
      const rowNumber = item.rowNumber ?? item.row ?? (idx + 1);
      const field = item.field || (item.column ? String(item.column) : '—');
      const rawMessage = item.message || item.error || 'Validation or transformation failure';
      // Clean up technical stack traces if accidentally passed
      const cleanMessage = typeof rawMessage === 'string'
        ? rawMessage.split('\n')[0].replace(/^Error:\s*/i, '').trim()
        : String(rawMessage);

      return {
        id: `err-${idx}-${rowNumber}`,
        rowNumber,
        field,
        type: item.type || 'VALIDATION_ERROR',
        message: cleanMessage,
        raw: item.raw || item.record || null,
        original: item
      };
    });
  }, [errors]);

  // Extract unique fields for filter dropdown
  const availableFields = useMemo(() => {
    const fields = new Set();
    normalizedErrors.forEach(err => {
      if (err.field && err.field !== '—') {
        fields.add(err.field);
      }
    });
    return Array.from(fields).sort();
  }, [normalizedErrors]);

  // Filtered dataset
  const filteredErrors = useMemo(() => {
    let result = normalizedErrors;

    if (fieldFilter !== 'ALL') {
      result = result.filter(err => err.field === fieldFilter);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(err =>
        String(err.rowNumber).includes(query) ||
        err.field.toLowerCase().includes(query) ||
        err.message.toLowerCase().includes(query) ||
        (err.type && err.type.toLowerCase().includes(query))
      );
    }

    return result;
  }, [normalizedErrors, fieldFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredErrors.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedErrors = filteredErrors.slice(startIndex, startIndex + pageSize);

  // Export errors as CSV
  const handleExportCSV = () => {
    if (normalizedErrors.length === 0) return;

    const headers = ['Row', 'Field', 'Error', 'Status', 'Raw Data'];
    const rows = normalizedErrors.map(err => [
      err.rowNumber,
      `"${err.field.replace(/"/g, '""')}"`,
      `"${err.message.replace(/"/g, '""')}"`,
      'Failed',
      err.raw ? `"${JSON.stringify(err.raw).replace(/"/g, '""')}"` : '""'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `failed_records_${datasetName.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyRaw = (rawData) => {
    if (!rawData) return;
    const text = typeof rawData === 'object' ? JSON.stringify(rawData, null, 2) : String(rawData);
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Toolbar: Search, Filter, Export ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by row, field, or error message…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Field Filter */}
          {availableFields.length > 0 && (
            <div className="relative">
              <select
                value={fieldFilter}
                onChange={(e) => {
                  setFieldFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs py-2 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ALL">All Fields ({normalizedErrors.length})</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>
                    Field: {field}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Export & Count */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {normalizedErrors.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={FileDown}
              onClick={handleExportCSV}
              className="text-xs"
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-24">Row</th>
              <th className="py-3 px-4 w-40">Field</th>
              <th className="py-3 px-4">Error</th>
              <th className="py-3 px-4 w-28">Status</th>
              <th className="py-3 px-4 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedErrors.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <div className="space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {searchTerm || fieldFilter !== 'ALL'
                        ? 'No failed records match your search or filter.'
                        : 'No recorded row failures.'}
                    </p>
                    {(searchTerm || fieldFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setFieldFilter('ALL'); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedErrors.map((err) => (
                <tr
                  key={err.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedError(err)}
                >
                  {/* Row */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    #{formatNumber(err.rowNumber)}
                  </td>

                  {/* Field */}
                  <td className="py-3.5 px-4">
                    {err.field && err.field !== '—' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {err.field}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Record Level</span>
                    )}
                  </td>

                  {/* Error Message */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-rose-700 dark:text-rose-400">
                        {err.message}
                      </span>
                      {err.type && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Type: {err.type}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <Badge variant="danger" size="sm">
                      Failed
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedError(err);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Inspect record details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {filteredErrors.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {Math.min(startIndex + pageSize, filteredErrors.length)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{formatNumber(filteredErrors.length)}</strong> failed records
            {totalFailedCount > filteredErrors.length && (
              <span className="text-slate-400 ml-1">
                ({formatNumber(totalFailedCount)} total recorded by engine)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 font-mono">
                {validCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Details Inspection Modal ────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedError)}
        onClose={() => setSelectedError(null)}
        title={`Failed Record Inspection — Row #${selectedError?.rowNumber}`}
        description="Detailed diagnostics for this record failure."
        maxWidth="max-w-2xl"
      >
        {selectedError && (
          <div className="space-y-4 pt-2">
            {/* Quick summary chips */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Row Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #{selectedError.rowNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Failing Field</span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                  {selectedError.field}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Failure Type</span>
                <Badge variant="danger" size="sm">
                  {selectedError.type}
                </Badge>
              </div>
            </div>

            {/* Error Message */}
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs">
              <span className="font-bold text-rose-700 dark:text-rose-300 block mb-1">
                Reason:
              </span>
              <p className="text-rose-800 dark:text-rose-200 leading-relaxed font-mono">
                {selectedError.message}
              </p>
            </div>

            {/* Raw Record Data */}
            {selectedError.raw && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Raw Record Data
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyRaw(selectedError.raw)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy JSON
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] max-h-48 overflow-auto border border-slate-800">
                  {typeof selectedError.raw === 'object'
                    ? JSON.stringify(selectedError.raw, null, 2)
                    : String(selectedError.raw)}
                </pre>
              </div>
            )}

            {/* Resolution guidance */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              <strong className="block font-semibold mb-0.5">Recommended Action:</strong>
              Check the source dataset formatting for field <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-semibold">{selectedError.field}</code> or update the transformation pipeline rule to gracefully handle unexpected values or nulls.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedError(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FailedRecordsTable;
