import React, { useState, useEffect, useCallback } from 'react';
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
  FileSpreadsheet,
  Cpu,
  Clock,
  Play,
  RotateCcw,
  Ban,
  XCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { useDatasets } from '../hooks/useDatasets';
import { jobService } from '../services/jobService';
import { formatBytes, formatDate, formatNumber, formatDuration } from '../utils/formatters';

export function DashboardPage() {
  const { datasets, loading: datasetsLoading, refresh: refreshDatasets } = useDatasets();
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await jobService.getAllJobs();
      if (res?.jobs) {
        const sorted = [...res.jobs].sort((a, b) => {
          const tA = new Date(a.createdAt || a.startedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.startedAt || 0).getTime();
          return tB - tA;
        });
        setJobs(sorted);
      }
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefreshAll = () => {
    refreshDatasets();
    fetchJobs();
  };

  // Real KPI computation strictly from backend data
  const totalDatasetsCount = datasets.length;
  const totalJobsCount = jobs.length;
  const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
  const failedJobsCount = jobs.filter(j => j.status === 'failed').length;
  const activeJobsCount = jobs.filter(j => j.status === 'processing' || j.status === 'queued' || j.status === 'retrying').length;
  const totalProcessedRows = jobs.reduce((acc, j) => acc + (Number(j.processedRows) || 0), 0);
  const totalBytesStored = datasets.reduce((acc, d) => acc + (Number(d.size) || 0), 0);

  const loading = datasetsLoading || jobsLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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
                Upload Dataset
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

      {/* KPI Cards Section - Real Backend Data */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Total Datasets */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Datasets</span>
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {totalDatasetsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalBytesStored > 0 ? formatBytes(totalBytesStored) : '0 bytes stored'}
          </div>
        </Card>

        {/* 2. Total Processing Jobs */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Jobs</span>
            <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-2">
            {totalJobsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {activeJobsCount > 0 ? `${activeJobsCount} active in flight` : 'All streams idle'}
          </div>
        </Card>

        {/* 3. Completed Jobs */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {completedJobsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalJobsCount > 0 ? `${((completedJobsCount / totalJobsCount) * 100).toFixed(0)}% success rate` : '0 jobs'}
          </div>
        </Card>

        {/* 4. Failed Jobs */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Failed Jobs</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-2">
            {failedJobsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {failedJobsCount > 0 ? 'Requires remediation' : 'Zero failures'}
          </div>
        </Card>

        {/* 5. Total Processed Rows */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Processed Rows</span>
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-2">
            {formatNumber(totalProcessedRows)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across all streaming pipeline jobs
          </div>
        </Card>
      </div>

      {/* Main Grid: Recent Jobs & Recent Datasets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Processing Jobs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Recent Processing Jobs"
              description="Live and past streaming ETL task executions"
              action={
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={handleRefreshAll} isLoading={loading}>
                    Refresh
                  </Button>
                  <Link to="/history">
                    <Button variant="ghost" size="sm" rightIcon={ArrowUpRight}>
                      View All Jobs
                    </Button>
                  </Link>
                </div>
              }
            />
            <CardBody className="p-0">
              {jobsLoading && jobs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs">Loading execution history...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={Activity}
                    title="No processing jobs yet"
                    description="Upload a dataset and start an ETL job to begin streaming rows through the transformation pipeline."
                    actionLabel="Upload & Process"
                    actionIcon={UploadCloud}
                    onAction={() => window.location.href = '/upload'}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 sm:px-6">Job ID / Dataset</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Rows</th>
                        <th className="py-3 px-3 text-right">Speed</th>
                        <th className="py-3 px-3">Duration</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {jobs.slice(0, 5).map((j) => {
                        const isRunning = j.status === 'processing' || j.status === 'queued' || j.status === 'retrying';
                        let durationStr = '—';
                        if (j.startedAt && j.completedAt) {
                          const sec = Math.max(1, Math.round((new Date(j.completedAt) - new Date(j.startedAt)) / 1000));
                          durationStr = formatDuration(sec);
                        } else if (j.startedAt) {
                          const sec = Math.max(1, Math.round((Date.now() - new Date(j.startedAt).getTime()) / 1000));
                          durationStr = formatDuration(sec);
                        }

                        return (
                          <tr key={j.jobId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 sm:px-6">
                              <div className="flex items-center gap-2.5">
                                <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                                <div>
                                  <Link
                                    to={`/jobs/${j.jobId}`}
                                    className="font-bold text-slate-900 hover:text-indigo-600 font-mono"
                                  >
                                    {j.jobId}
                                  </Link>
                                  <p className="text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-xs font-sans">
                                    {j.datasetId}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <StatusBadge status={j.status} size="sm" />
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatNumber(j.processedRows || 0)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-purple-700 font-bold">
                              {j.rowsPerSecond ? `${formatNumber(j.rowsPerSecond)} r/s` : '—'}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-slate-600">
                              {durationStr}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              {isRunning ? (
                                <Link to={`/processing/${j.jobId}`}>
                                  <Button variant="primary" size="sm" leftIcon={Zap} className="px-2 text-xs bg-indigo-600 text-white">
                                    Live
                                  </Button>
                                </Link>
                              ) : (
                                <Link to={`/jobs/${j.jobId}`}>
                                  <Button variant="ghost" size="sm" leftIcon={Eye} className="px-2 text-xs">
                                    Details
                                  </Button>
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Col: Recent Datasets Inventory */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Recent Datasets"
              description="Uploaded files available for ETL"
              action={
                <Link to="/datasets">
                  <Button variant="ghost" size="sm" rightIcon={ArrowUpRight}>
                    View All
                  </Button>
                </Link>
              }
            />
            <CardBody className="p-0">
              {datasetsLoading && datasets.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading datasets...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="p-6 text-center">
                  <EmptyState
                    icon={Database}
                    title="No datasets yet"
                    description="Upload your first CSV or JSON dataset to get started."
                    actionLabel="Upload"
                    actionIcon={UploadCloud}
                    onAction={() => window.location.href = '/upload'}
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {datasets.slice(0, 5).map((ds) => (
                    <div key={ds.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-indigo-600 shrink-0">
                          {ds.format === 'csv' ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <FileCode className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/datasets/${ds.id}/preview`}
                            className="text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 truncate block"
                          >
                            {ds.filename}
                          </Link>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {formatBytes(ds.size)} • {ds.format?.toUpperCase() || 'CSV'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link to={`/datasets/${ds.id}/preview`}>
                          <Button variant="ghost" size="sm" className="px-2 text-xs" title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Link to={`/datasets/${ds.id}/mapping`}>
                          <Button variant="outline" size="sm" className="px-2 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                            Map
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
