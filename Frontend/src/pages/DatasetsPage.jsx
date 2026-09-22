import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Search,
  UploadCloud,
  Trash2,
  CheckCircle,
  FileCode,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { useDatasets } from '../hooks/useDatasets';
import { fileService } from '../services/fileService';
import { formatBytes, formatDate } from '../utils/formatters';

export function DatasetsPage() {
  const { datasets, loading, refresh, deleteDataset } = useDatasets();
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [readinessModalData, setReadinessModalData] = useState(null);

  const filteredDatasets = datasets.filter((ds) => {
    const matchesSearch = (ds.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ds.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = formatFilter === 'all' || (ds.format || '').toLowerCase() === formatFilter;
    return matchesSearch && matchesFormat;
  });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this dataset? This cannot be undone.')) {
      setDeletingId(id);
      await deleteDataset(id);
      setDeletingId(null);
    }
  };

  const handleInspectReadiness = async (datasetId) => {
    try {
      const res = await fileService.checkDatasetReady(datasetId);
      setReadinessModalData(res);
    } catch (err) {
      setReadinessModalData({
        ready: false,
        reason: err.message,
        dataset: { id: datasetId }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Datasets Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your persistent data sources and inspect stream readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={refresh}
            isLoading={loading}
          >
            Refresh
          </Button>
          <Link to="/upload">
            <Button
              variant="primary"
              size="sm"
              leftIcon={UploadCloud}
            >
              Upload Dataset
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by filename or ID..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Format:
            </span>
            {['all', 'csv', 'json'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer ${
                  formatFilter === fmt
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Datasets Table / List */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Fetching datasets from StreamWeaver server...</p>
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Database}
                title={searchTerm ? 'No matching datasets' : 'No datasets uploaded yet'}
                description={
                  searchTerm
                    ? `No datasets matched your query "${searchTerm}". Try a different keyword or filter.`
                    : 'Start by uploading your first CSV or JSON dataset.'
                }
                actionLabel={searchTerm ? 'Clear Search' : 'Upload Dataset'}
                actionIcon={searchTerm ? RefreshCw : UploadCloud}
                onAction={() => (searchTerm ? setSearchTerm('') : (window.location.href = '/upload'))}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Dataset Details</th>
                    <th className="py-3.5 px-4">Format</th>
                    <th className="py-3.5 px-4">File Size</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Uploaded Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDatasets.map((ds) => (
                    <tr key={ds.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-indigo-600">
                            {ds.format === 'csv' ? (
                              <FileSpreadsheet className="w-5 h-5" />
                            ) : (
                              <FileCode className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{ds.filename}</p>
                            <p className="text-xs text-slate-400 font-mono">ID: {ds.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={ds.format === 'csv' ? 'info' : 'purple'} size="sm">
                          {ds.format?.toUpperCase() || 'CSV'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        {formatBytes(ds.size)}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={ds.status} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {formatDate(ds.uploadedAt)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={ShieldCheck}
                            onClick={() => handleInspectReadiness(ds.id)}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            Check Readiness
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ds.id)}
                            disabled={deletingId === ds.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Dataset Readiness Inspection Modal */}
      <Modal
        isOpen={!!readinessModalData}
        onClose={() => setReadinessModalData(null)}
        title="Dataset Readiness Inspection"
        description="Verify dataset availability for streaming ETL jobs"
      >
        {readinessModalData && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                readinessModalData.ready
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {readinessModalData.ready ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-sm">
                  {readinessModalData.ready
                    ? 'Dataset is Ready for Processing'
                    : 'Dataset Not Ready'}
                </h4>
                <p className="text-xs mt-1 opacity-90">
                  {readinessModalData.readyReason || readinessModalData.message || (readinessModalData.ready ? 'Passed file existence, stream lock, and schema integrity checks.' : 'Dataset is undergoing verification.')}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
              <div>Dataset ID: {readinessModalData.dataset?.id}</div>
              <div>Status: {readinessModalData.dataset?.status || 'uploaded'}</div>
              <div>Exists On Disk: {readinessModalData.exists !== false ? 'true' : 'false'}</div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setReadinessModalData(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DatasetsPage;
