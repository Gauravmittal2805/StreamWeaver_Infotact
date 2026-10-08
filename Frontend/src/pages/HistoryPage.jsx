import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Play,
  RotateCcw,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Database
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
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

export function HistoryPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'

  // Sorting
  const [sortField, setSortField] = useState('startedAt'); // 'jobId' | 'datasetId' | 'status' | 'totalRows' | 'successfulRows' | 'failedRows' | 'duration' | 'rowsPerSecond' | 'startedAt' | 'completedAt'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Actions & Modals
  const [copiedId, setCopiedId] = useState(null);
  const [cancelingJobId, setCancelingJobId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [retryingJob, setRetryingJob] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState(null);

  // Fetch all jobs from backend
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await jobService.getAllJobs();
      if (res?.jobs) {
        setJobs(res.jobs);
      } else {
        setJobs([]);
      }
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch job history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Copy Job ID
  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Cancel Job Action
  const handleConfirmCancel = async () => {
    if (!cancelingJobId) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      await jobService.cancelJob(cancelingJobId);
      setCancelingJobId(null);
      await fetchJobs();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel job');
    } finally {
      setCancelLoading(false);
    }
  };

  // Retry Job Action
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

  // Toggle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Helper to compute duration in seconds
  const getJobDurationSeconds = (job) => {
    if (!job.startedAt) return 0;
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    return Math.max(0, Math.round((end - new Date(job.startedAt).getTime()) / 1000));
  };

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(j => j.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const now = Date.now();
      result = result.filter(j => {
        const time = new Date(j.startedAt || j.createdAt || 0).getTime();
        if (dateFilter === 'TODAY') {
          return now - time <= 24 * 60 * 60 * 1000;
        }
        if (dateFilter === 'WEEK') {
          return now - time <= 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === 'MONTH') {
          return now - time <= 30 * 24 * 60 * 60 * 1000;
        }
        return true;
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(j =>
        (j.jobId && j.jobId.toLowerCase().includes(q)) ||
        (j.datasetId && j.datasetId.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'duration') {
        valA = getJobDurationSeconds(a);
        valB = getJobDurationSeconds(b);
      } else if (sortField === 'startedAt' || sortField === 'completedAt' || sortField === 'createdAt') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      } else {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [jobs, statusFilter, dateFilter, searchTerm, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

  // Render sort icon on table headers
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Detailed Job History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete audit log of previous ETL stream executions, throughput metrics, and validation records.
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

      {/* ── Filters & Search Toolbar (Requirement 3) ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Job ID or Dataset ID…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs py-2 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Statuses ({jobs.length})</option>
              <option value={JOB_STATUS.COMPLETED}>Completed</option>
              <option value={JOB_STATUS.PROCESSING}>Processing</option>
              <option value={JOB_STATUS.QUEUED}>Queued</option>
              <option value={JOB_STATUS.FAILED}>Failed</option>
              <option value={JOB_STATUS.CANCELLED}>Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs py-2 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Last 24 Hours</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDateFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline px-1 py-1"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{fetchError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* ── Job History Table (Requirement 3) ─────────────────────────────────── */}
      <Card>
        <CardBody className="p-0">
          {/* Loading Skeleton (Requirement 10) */}
          {loading && jobs.length === 0 ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            /* Empty State (Requirement 10) */
            <div className="p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-800">
                <History className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  No processing jobs yet
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Start an ETL job to see your processing history here. All runs will record throughput, row integrity, and execution timestamps.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/upload">
                  <Button variant="primary" size="sm" leftIcon={Play}>
                    Upload Dataset & Run Job
                  </Button>
                </Link>
              </div>
            </div>
          ) : filteredJobs.length === 0 ? (
            /* Filter Empty State */
            <div className="p-10 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No jobs match your search or filter criteria
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setDateFilter('ALL');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* Real Data Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {/* Job ID */}
                    <th
                      className="py-3 px-5 cursor-pointer group"
                      onClick={() => handleSort('jobId')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Job ID</span>
                        {renderSortIcon('jobId')}
                      </div>
                    </th>

                    {/* Dataset */}
                    <th
                      className="py-3 px-4 cursor-pointer group"
                      onClick={() => handleSort('datasetId')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Dataset</span>
                        {renderSortIcon('datasetId')}
                      </div>
                    </th>

                    {/* Status */}
                    <th
                      className="py-3 px-4 cursor-pointer group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>

                    {/* Total Rows */}
                    <th
                      className="py-3 px-4 text-right cursor-pointer group"
                      onClick={() => handleSort('totalRows')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total Rows</span>
                        {renderSortIcon('totalRows')}
                      </div>
                    </th>

                    {/* Successful */}
                    <th
                      className="py-3 px-4 text-right cursor-pointer group"
                      onClick={() => handleSort('successfulRows')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Successful</span>
                        {renderSortIcon('successfulRows')}
                      </div>
                    </th>

                    {/* Failed */}
                    <th
                      className="py-3 px-4 text-right cursor-pointer group"
                      onClick={() => handleSort('failedRows')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Failed</span>
                        {renderSortIcon('failedRows')}
                      </div>
                    </th>

                    {/* Processing Time (Duration) */}
                    <th
                      className="py-3 px-4 cursor-pointer group"
                      onClick={() => handleSort('duration')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Processing Time</span>
                        {renderSortIcon('duration')}
                      </div>
                    </th>

                    {/* Rows/sec */}
                    <th
                      className="py-3 px-4 text-right cursor-pointer group"
                      onClick={() => handleSort('rowsPerSecond')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Rows/sec</span>
                        {renderSortIcon('rowsPerSecond')}
                      </div>
                    </th>

                    {/* Started At */}
                    <th
                      className="py-3 px-4 cursor-pointer group"
                      onClick={() => handleSort('startedAt')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Started At</span>
                        {renderSortIcon('startedAt')}
                      </div>
                    </th>

                    {/* Completed At */}
                    <th
                      className="py-3 px-4 cursor-pointer group"
                      onClick={() => handleSort('completedAt')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Completed At</span>
                        {renderSortIcon('completedAt')}
                      </div>
                    </th>

                    {/* Actions */}
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {paginatedJobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
                    const isRunning = job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED || job.status === JOB_STATUS.RETRYING;
                    const canCancel = isRunning;
                    const canRetry = job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CANCELLED || job.status === JOB_STATUS.COMPLETED;
                    const durationSec = getJobDurationSeconds(job);

                    return (
                      <tr key={job.jobId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Job ID */}
                        <td className="py-3.5 px-5 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/jobs/${job.jobId}`}
                              className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs"
                            >
                              {job.jobId}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopyId(job.jobId)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                              title="Copy Job ID"
                            >
                              {copiedId === job.jobId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Dataset */}
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/datasets/${job.datasetId}/preview`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:underline truncate max-w-[140px] block"
                            title={job.datasetId}
                          >
                            {job.datasetId}
                          </Link>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge variant={cfg.badge} size="sm">
                            {cfg.label.toUpperCase()}
                          </Badge>
                        </td>

                        {/* Total Rows */}
                        <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-900 dark:text-slate-100">
                          {formatNumber(job.totalRows || job.processedRows || 0)}
                        </td>

                        {/* Successful Rows */}
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatNumber(job.successfulRows || 0)}
                        </td>

                        {/* Failed Rows */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          {job.failedRows > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                              {formatNumber(job.failedRows)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Processing Time (Duration) */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {durationSec > 0 ? formatDuration(durationSec) : '—'}
                          {isRunning && <span className="text-[10px] text-indigo-500 ml-1">(live)</span>}
                        </td>

                        {/* Rows/sec */}
                        <td className="py-3.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                          {formatNumber(job.rowsPerSecond || 0)}
                        </td>

                        {/* Started At */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {job.startedAt ? formatDate(job.startedAt) : 'Pending'}
                        </td>

                        {/* Completed At */}
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {job.completedAt ? formatDate(job.completedAt) : isRunning ? 'In Flight…' : '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Details */}
                            <Link to={`/jobs/${job.jobId}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={Eye}
                                className="px-2 text-xs"
                                title="View Details"
                              >
                                Details
                              </Button>
                            </Link>

                            {/* Live Monitor */}
                            {isRunning && (
                              <Link to={`/processing/${job.jobId}`}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  leftIcon={Zap}
                                  className="px-2.5 text-xs bg-indigo-600 text-white"
                                  title="View Live Stream"
                                >
                                  Live
                                </Button>
                              </Link>
                            )}

                            {/* Cancel */}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={Ban}
                                onClick={() => setCancelingJobId(job.jobId)}
                                className="px-2 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
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
                                className="px-2 text-xs"
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

      {/* ── Pagination Controls ──────────────────────────────────────────────── */}
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
              <option value={100}>100 / page</option>
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

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(cancelingJobId)}
        onClose={() => { setCancelingJobId(null); setCancelError(null); }}
        title="Cancel Job Processing?"
        description={`Are you sure you want to stop processing job ${cancelingJobId}? Processed rows will remain committed.`}
      >
        {cancelError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 mb-3">
            {cancelError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => { setCancelingJobId(null); setCancelError(null); }}>
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

      {/* ── Retry Confirmation Modal (Requirement 6) ──────────────────────────── */}
      <Modal
        isOpen={Boolean(retryingJob)}
        onClose={() => { setRetryingJob(null); setRetryError(null); }}
        title="Retry Processing Job?"
        description={`Are you sure you want to retry job ${retryingJob?.jobId}? This will re-initialize the streaming pipeline.`}
      >
        {retryError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 mb-3">
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

export default HistoryPage;
