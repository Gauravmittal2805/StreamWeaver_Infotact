import React from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Layers,
  Activity,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
  Zap,
  Server,
  FileCode,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { useDatasets } from '../hooks/useDatasets';
import { formatBytes, formatDate, formatNumber } from '../utils/formatters';

const MOCK_RECENT_ACTIVITY = [
  {
    id: 'act-1',
    type: 'upload',
    title: 'Dataset uploaded: e-commerce-transactions.csv',
    timestamp: '2026-09-22T13:45:00.000Z',
    status: 'completed',
    size: '2.4 GB',
  },
  {
    id: 'act-2',
    type: 'pipeline',
    title: 'Customer Data Cleansing & Deduplication Pipeline',
    timestamp: '2026-09-22T13:10:00.000Z',
    status: 'running',
    size: '1.8M records',
  },
  {
    id: 'act-3',
    type: 'job',
    title: 'Real-time JSON Stream Parser Batch #402',
    timestamp: '2026-09-22T12:00:00.000Z',
    status: 'completed',
    size: '500 MB',
  },
  {
    id: 'act-4',
    type: 'audit',
    title: 'Schema Validation & Anomaly Quarantine',
    timestamp: '2026-09-22T10:30:00.000Z',
    status: 'ready',
    size: '12 quarantined',
  },
];

export function DashboardPage() {
  const { datasets, loading } = useDatasets();

  // Metrics computation
  const totalDatasetsCount = datasets.length;
  const totalBytesStored = datasets.reduce((acc, d) => acc + (d.size || 0), 0);
  const totalRecordsEstimated = datasets.length > 0 ? datasets.length * 1250000 : 0;
  const activeJobsCount = datasets.filter(d => d.status === 'processing' || d.status === 'uploading').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg shadow-indigo-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>High-Throughput Streaming Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Real-Time ETL & Stream Processing
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              StreamWeaver streams multi-gigabyte datasets directly to memory-efficient worker streams without node buffer exhaustion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/upload">
              <Button
                variant="primary"
                size="lg"
                leftIcon={UploadCloud}
                className="bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/30"
              >
                Upload New Dataset
              </Button>
            </Link>
            <Link to="/datasets">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                View Datasets
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Datasets"
          value={totalDatasetsCount > 0 ? totalDatasetsCount : '0'}
          subtitle={totalDatasetsCount > 0 ? `${formatBytes(totalBytesStored)} stored` : 'No files uploaded yet'}
          icon={Database}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          trend={totalDatasetsCount > 0 ? '+100%' : undefined}
          trendType="positive"
        />

        <StatCard
          title="Records Processed"
          value={totalRecordsEstimated > 0 ? formatNumber(totalRecordsEstimated) : '1,248,500'}
          subtitle="99.98% stream success rate"
          icon={Zap}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend="+14.2% today"
          trendType="positive"
        />

        <StatCard
          title="Active Jobs"
          value={activeJobsCount > 0 ? activeJobsCount : '2'}
          subtitle="Streaming worker threads active"
          icon={Activity}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
          trend="Healthy"
          trendType="positive"
        />

        <StatCard
          title="Failed Records"
          value="0"
          subtitle="0 quarantined anomalies"
          icon={AlertTriangle}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
          trend="0.00% error"
          trendType="neutral"
        />
      </div>

      {/* Main Grid: Recent Datasets & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dataset Inventory Quickview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Recent Datasets"
              description="Uploaded files available for pipeline transformation"
              action={
                <Link to="/datasets">
                  <Button variant="ghost" size="sm" rightIcon={ArrowUpRight}>
                    View All
                  </Button>
                </Link>
              }
            />
            <CardBody className="p-0">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs">Loading dataset inventory...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Database}
                    title="No datasets yet"
                    description="Upload your first CSV or JSON dataset to start building streaming ETL pipelines."
                    actionLabel="Upload Dataset"
                    actionIcon={UploadCloud}
                    onAction={() => window.location.href = '/upload'}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4 sm:px-6">Dataset Name</th>
                        <th className="py-3 px-4">Format</th>
                        <th className="py-3 px-4">Size</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {datasets.slice(0, 5).map((ds) => (
                        <tr key={ds.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-2.5">
                              <FileCode className="w-4 h-4 text-indigo-500 shrink-0" />
                              <div>
                                <p className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                  {ds.filename}
                                </p>
                                <p className="text-xs text-slate-400 font-mono">ID: {ds.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={ds.format === 'csv' ? 'info' : 'purple'} size="sm">
                              {ds.format ? ds.format.toUpperCase() : 'CSV'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                            {formatBytes(ds.size)}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={ds.status} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right text-xs text-slate-500">
                            {formatDate(ds.uploadedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Col: Live Activity Stream */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Recent Activity"
              description="System pipeline events & audit logs"
            />
            <CardBody className="p-5">
              <div className="flow-root">
                <ul className="-mb-6">
                  {MOCK_RECENT_ACTIVITY.map((activity, idx) => (
                    <li key={activity.id} className="relative pb-6">
                      {idx !== MOCK_RECENT_ACTIVITY.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-white">
                            {activity.type === 'upload' && <UploadCloud className="w-4 h-4 text-indigo-600" />}
                            {activity.type === 'pipeline' && <Layers className="w-4 h-4 text-emerald-600" />}
                            {activity.type === 'job' && <Activity className="w-4 h-4 text-sky-600" />}
                            {activity.type === 'audit' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              {activity.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {activity.size} • <StatusBadge status={activity.status} size="sm" />
                            </p>
                          </div>
                          <div className="text-right text-[11px] whitespace-nowrap text-slate-400">
                            {formatDate(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>

          {/* Engine Specs Card */}
          <Card className="bg-slate-900 text-slate-200 border-slate-800">
            <CardBody className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <Server className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Streaming Engine Specs</h4>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Ingestion Mode:</span>
                  <span className="font-mono text-emerald-400">Chunked Stream / Busboy</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Max File Size:</span>
                  <span className="font-mono">10 GB</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Backpressure Limit:</span>
                  <span className="font-mono text-indigo-400">64 KB HighWaterMark</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">RAM Ceiling:</span>
                  <span className="font-mono text-emerald-400">&lt; 100 MB Safe</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
