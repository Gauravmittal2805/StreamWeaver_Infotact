import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Download,
  AlertCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import VirtualizedGrid from '../components/ui/VirtualizedGrid';
import StatusBadge from '../components/common/StatusBadge';
import { fileService } from '../services/fileService';
import { formatBytes } from '../utils/formatters';

export function DatasetPreviewPage() {
  const { datasetId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [sampleLimit, setSampleLimit] = useState(1000); // Step 10: initial 1,000 rows
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const fetchPreview = useCallback(async (limit = sampleLimit) => {
    setLoading(true);
    setError(null);
    try {
      // Step 11: Coordination with Member 1
      const [metaResult, previewResult] = await Promise.allSettled([
        fileService.getDataset(datasetId),
        fileService.getDatasetPreview(datasetId, { limit, fallbackMock: true })
      ]);

      if (metaResult.status === 'fulfilled' && metaResult.value?.dataset) {
        setDatasetMeta(metaResult.value.dataset);
      } else {
        setDatasetMeta({
          id: datasetId,
          filename: datasetId ? `${datasetId}.csv` : 'dataset.csv',
          format: datasetId?.includes('json') ? 'json' : 'csv',
          size: 5.2 * 1024 * 1024 * 1024,
          status: 'uploaded',
        });
      }

      if (previewResult.status === 'fulfilled' && previewResult.value) {
        setPreviewData(previewResult.value);
      } else {
        throw new Error(previewResult.reason?.message || 'Failed to generate dataset preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.message || 'Dataset preview unavailable.');
    } finally {
      setLoading(false);
    }
  }, [datasetId, sampleLimit]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [metaResult, previewResult] = await Promise.allSettled([
          fileService.getDataset(datasetId),
          fileService.getDatasetPreview(datasetId, { limit: sampleLimit, fallbackMock: true })
        ]);

        if (isMounted) {
          if (metaResult.status === 'fulfilled' && metaResult.value?.dataset) {
            setDatasetMeta(metaResult.value.dataset);
          } else {
            setDatasetMeta({
              id: datasetId,
              filename: datasetId ? `${datasetId}.csv` : 'dataset.csv',
              format: datasetId?.includes('json') ? 'json' : 'csv',
              size: 5.2 * 1024 * 1024 * 1024,
              status: 'uploaded',
            });
          }

          if (previewResult.status === 'fulfilled' && previewResult.value) {
            setPreviewData(previewResult.value);
          } else {
            setError(previewResult.reason?.message || 'Failed to generate dataset preview');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Dataset preview unavailable.');
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [datasetId, sampleLimit]);

  const handleCopyId = () => {
    if (!datasetId) return;
    navigator.clipboard.writeText(datasetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter rows based on in-memory search
  const filteredRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    if (!searchTerm.trim()) return previewData.rows;

    const term = searchTerm.toLowerCase();
    return previewData.rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [previewData, searchTerm]);

  // Export sample as JSON / CSV
  const handleExportSample = () => {
    if (!filteredRows || filteredRows.length === 0) return;
    const jsonStr = JSON.stringify(filteredRows.slice(0, 100), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetMeta?.filename || 'dataset'}-sample.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <Link to="/datasets">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ArrowLeft}
            className="text-slate-600 hover:text-slate-900"
          >
            Back to Datasets
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={() => fetchPreview(sampleLimit)}
            isLoading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={Download}
            onClick={handleExportSample}
            disabled={loading || !previewData}
          >
            Export Sample (JSON)
          </Button>
        </div>
      </div>

      {/* Preview Header Section (Step 7) */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0 shadow-xs">
              {datasetMeta?.format === 'json' ? (
                <FileCode className="w-8 h-8" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                  {datasetMeta?.filename || datasetId || 'Dataset Preview'}
                </h2>
                <Badge variant={datasetMeta?.format === 'json' ? 'purple' : 'info'} size="md">
                  {datasetMeta?.format?.toUpperCase() || 'CSV'}
                </Badge>
                <StatusBadge status={datasetMeta?.status || 'uploaded'} size="md" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono pt-0.5">
                <span>Size: <strong className="text-slate-700">{formatBytes(datasetMeta?.size || 5500000000)}</strong></span>
                <span>•</span>
                <span>Total records: <strong className="text-slate-700">~5,000,000 records</strong></span>
                <span>•</span>
                <div className="inline-flex items-center gap-1 text-slate-400">
                  <span>ID: {datasetId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-0.5 hover:text-slate-700 rounded cursor-pointer"
                    title="Copy dataset ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Virtualization Scale Switcher (Step 10 & 14) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rows Window:</span>
            </span>
            <div className="flex items-center gap-1">
              {[1000, 10000, 100000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSampleLimit(count)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-all cursor-pointer ${
                    sampleLimit === count
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {count.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Search & In-Preview Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search across columns in preview..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Previewing <span className="font-mono font-bold text-slate-800">1 – {filteredRows.length.toLocaleString()}</span> rows (streaming memory limit: {sampleLimit.toLocaleString()})
        </div>
      </div>

      {/* Main Preview Container */}
      {loading ? (
        /* STEP 12: Loading & Skeleton State */
        <Card className="p-8 sm:p-12 text-center bg-white border-slate-200">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-indigo-100">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Loading dataset preview...</h3>
              <p className="text-xs text-slate-500">
                Preparing the first {sampleLimit.toLocaleString()} records for high-throughput stream inspection
              </p>
            </div>

            {/* Skeleton Table Placeholder */}
            <div className="pt-4 space-y-2">
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-50 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-50 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-50 rounded-lg animate-pulse" />
              <div className="h-8 bg-slate-50 rounded-lg animate-pulse" />
            </div>
          </div>
        </Card>
      ) : error ? (
        /* STEP 13: Error State */
        <Card className="p-8 sm:p-12 text-center bg-white border-rose-200 shadow-xs">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Dataset Preview Unavailable</h3>
              <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link to="/datasets">
                <Button variant="outline">Back to Datasets</Button>
              </Link>
              <Button variant="primary" leftIcon={RefreshCw} onClick={() => fetchPreview(sampleLimit)}>
                Retry Preview
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* STEPS 8, 9, 14: Virtualized Data Grid */
        <VirtualizedGrid
          columns={previewData?.columns || []}
          rows={filteredRows}
          height={580}
          rowHeight={42}
        />
      )}
    </div>
  );
}

export default DatasetPreviewPage;
