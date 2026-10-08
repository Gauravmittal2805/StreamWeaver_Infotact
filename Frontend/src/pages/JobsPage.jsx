import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Cpu,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Ban,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Activity
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { jobService } from '../services/jobService';
import { JOB_STATUS } from '../hooks/useProcessingJob';
import { formatDate, formatNumber, formatDuration } from '../utils/formatters';

const STATUS_CONFIG = {
  [JOB_STATUS.QUEUED]: { label: 'Queued', badge: 'warning' },
  [JOB_STATUS.RETRYING]: { label: 'Retrying', badge: 'warning' },
  [JOB_STATUS.PROCESSING]: { label: 'Processing', badge: 'purple' },
  [JOB_STATUS.COMPLETED]: { label: 'Completed', badge: 'success' },
  [JOB_STATUS.FAILED]: { label: 'Failed', badge: 'danger' },
  [JOB_STATUS.CANCELLED]: { label: 'Cancelled', badge: 'default' },
};

export function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  // Modals & Action States
  const [cancelingJobId, setCancelingJobId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [retryingJob, setRetryingJob] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch jobs from backend
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobService.getAllJobs();
      if (res?.jobs) {
        // Sort newest first
        const sorted = [...res.jobs].sort((a, b) => {
          const tA = new Date(a.createdAt || a.startedAt || 0).getTime();
          const tB = new Date(b.createdAt || b.startedAt || 0).getTime();
          return tB - tA;
        });
        setJobs(sorted);
      }
    } catch (err) {
      console.warn('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Cancel (Requirement 7)
  const handleConfirmCancel = async () => {
    if (!cancelingJobId) return;
    setCancelLoading(true);
    try {
      await jobService.cancelJob(cancelingJobId);
      setCancelingJobId(null);
      await fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to cancel job');
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Retry (Requirement 6)
  const handleConfirmRetry = async () => {
    if (!retryingJob) return;
    setRetryLoading(true);
    setRetryError(null);
    try {
      await jobService.retryJob(retryingJob.jobId);
      setRetryingJob(null);
      navigate(`/processing/${retryingJob.jobId}`);
    } catch (err) {
      setRetryError(err.message || 'Failed to retry job');
    } finally {
      setRetryLoading(false);
    }
  };

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        (job.jobId && job.jobId.toLowerCase().includes(q)) ||
        (job.datasetId && job.datasetId.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [jobs, statusFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            ETL Processing Jobs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time worker execution streams, throughput, and error diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            isLoading={loading}
            onClick={fetchJobs}
            className="text-xs"
          >
            Refresh
          </Button>
          <Link to="/datasets">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Play}
              className="text-xs shadow-xs"
            >
              Start New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Job ID or Dataset…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-2 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Statuses ({jobs.length})</option>
            <option value={JOB_STATUS.PROCESSING}>Processing</option>
            <option value={JOB_STATUS.QUEUED}>Queued</option>
            <option value={JOB_STATUS.COMPLETED}>Completed</option>
            <option value={JOB_STATUS.FAILED}>Failed</option>
            <option value={JOB_STATUS.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardBody className="p-0">
          {loading && jobs.length === 0 ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-10 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-800">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  No active ETL processing jobs
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No real worker streams are running or completed yet. Upload a dataset and click Start Processing.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/upload">
                  <Button variant="primary" size="sm" leftIcon={Play}>
                    Upload Dataset
                  </Button>
                </Link>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No jobs match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-6">Job Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 w-44">Progress</th>
                    <th className="py-3 px-4">Processed Records</th>
                    <th className="py-3 px-4">Throughput</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {paginatedJobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
                    const isRunning = job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED || job.status === JOB_STATUS.RETRYING;
                    const canCancel = isRunning;
                    const canRetry = job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CANCELLED || job.status === JOB_STATUS.COMPLETED;
                    const hasErrors = (job.failedRows > 0) || (job.errors && job.errors.length > 0);

                    // Duration
                    let durationStr = '—';
                    if (job.startedAt && job.completedAt) {
                      const sec = Math.max(1, Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000));
                      durationStr = formatDuration(sec);
                    } else if (job.startedAt) {
                      const sec = Math.max(1, Math.round((Date.now() - new Date(job.startedAt).getTime()) / 1000));
                      durationStr = `${formatDuration(sec)}`;
                    }

                    return (
                      <tr key={job.jobId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Job Details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                              <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                              <Link
                                to={`/jobs/${job.jobId}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                {job.datasetId}
                              </Link>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>{job.jobId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(job.jobId)}
                                  className="text-slate-400 hover:text-indigo-600 p-0.5"
                                  title="Copy Job ID"
                                >
                                  {copiedId === job.jobId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <Badge variant={cfg.badge} size="sm">
                            {cfg.label.toUpperCase()}
                          </Badge>
                        </td>

                        {/* Progress */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <ProgressBar
                              progress={job.progressPercent || 0}
                              size="sm"
                              variant={job.status === JOB_STATUS.COMPLETED ? 'emerald' : job.status === JOB_STATUS.FAILED ? 'rose' : 'indigo'}
                            />
                            <div className="flex justify-between text-[10px] font-mono text-slate-500">
                              <span>{job.progressPercent || 0}%</span>
                              <span>{job.status === JOB_STATUS.PROCESSING ? 'Streaming' : cfg.label}</span>
                            </div>
                          </div>
                        </td>

                        {/* Records */}
                        <td className="py-4 px-4 font-mono text-xs">
                          <span className="text-slate-900 dark:text-slate-100 font-semibold">
                            {formatNumber(job.processedRows || 0)}
                          </span>
                          {job.totalRows > 0 && (
                            <span className="text-slate-400"> / {formatNumber(job.totalRows)}</span>
                          )}
                          <div className="text-[10px] text-slate-500">
                            {formatNumber(job.successfulRows || 0)} ok
                            {job.failedRows > 0 && (
                              <span className="text-rose-600 font-semibold ml-1">· {job.failedRows} err</span>
                            )}
                          </div>
                        </td>

                        {/* Throughput */}
                        <td className="py-4 px-4 font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          {formatNumber(job.rowsPerSecond || 0)} r/s
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {durationStr}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* View Details */}
                            <Link to={`/jobs/${job.jobId}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={Eye}
                                title="View Details"
                                className="px-2"
                              >
                                Details
                              </Button>
                            </Link>

                            {/* Live view if processing */}
                            {isRunning && (
                              <Link to={`/processing/${job.jobId}`}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={Zap}
                                  className="px-2.5 bg-indigo-600 text-white"
                                >
                                  Live
                                </Button>
                              </Link>
                            )}

                            {/* View Errors */}
                            {hasErrors && (
                              <Link to={`/jobs/${job.jobId}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={AlertTriangle}
                                  title="View Errors"
                                  className="px-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  Errors
                                </Button>
                              </Link>
                            )}

                            {/* Cancel (Requirement 7) */}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={Ban}
                                onClick={() => setCancelingJobId(job.jobId)}
                                className="px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                                title="Cancel Job"
                              >
                                Cancel
                              </Button>
                            )}

                            {/* Retry (Requirement 6) */}
                            {canRetry && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={RotateCcw}
                                onClick={() => setRetryingJob(job)}
                                className="px-2"
                                title="Retry Job"
                              >
                                Retry
                              </Button>
                            )}
                          </div>
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

      {/* Pagination */}
      {filteredJobs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{startIndex + 1}</strong> to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {Math.min(startIndex + pageSize, filteredJobs.length)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{formatNumber(filteredJobs.length)}</strong> jobs
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

      {/* Cancel Modal (Requirement 7) */}
      <Modal
        isOpen={Boolean(cancelingJobId)}
        onClose={() => setCancelingJobId(null)}
        title="Cancel Job Processing?"
        description={`Are you sure you want to stop processing job ${cancelingJobId}?`}
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setCancelingJobId(null)}>
            Keep Running
          </Button>
          <Button
            variant="danger"
            leftIcon={Ban}
            isLoading={cancelLoading}
            onClick={handleConfirmCancel}
          >
            Cancel Job
          </Button>
        </div>
      </Modal>

      {/* Retry Modal (Requirement 6) */}
      <Modal
        isOpen={Boolean(retryingJob)}
        onClose={() => { setRetryingJob(null); setRetryError(null); }}
        title="Retry Processing Job?"
        description={`Are you sure you want to retry job ${retryingJob?.jobId}? This will re-initialize worker stream processing.`}
      >
        {retryError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-3">
            {retryError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => { setRetryingJob(null); setRetryError(null); }}>
            Dismiss
          </Button>
          <Button
            variant="primary"
            leftIcon={RotateCcw}
            isLoading={retryLoading}
            onClick={handleConfirmRetry}
          >
            Retry Job
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default JobsPage;
