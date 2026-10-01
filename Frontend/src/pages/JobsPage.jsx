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
  Eye
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

  // Cancel action state
  const [cancelingJobId, setCancelingJobId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
    // Poll every 5s if there are running jobs
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Handle Cancel
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

  // Handle Retry
  const handleRetryJob = async (job) => {
    if (!job?.datasetId) return;
    try {
      const res = await jobService.createJob({ datasetId: job.datasetId, autoStart: true });
      if (res?.job?.jobId) {
        navigate(`/processing/${res.job.jobId}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to retry job');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            ETL Processing Jobs
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
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
          >
            Refresh
          </Button>
          <Link to="/datasets">
            <Button
              variant="primary"
              size="sm"
              leftIcon={Play}
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
          {jobs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No active ETL processing jobs"
                description="No real worker streams are running or completed yet. Upload a dataset and click Start Processing."
                icon={Cpu}
                action={
                  <Link to="/upload">
                    <Button variant="primary" size="sm" leftIcon={Play}>
                      Upload Dataset
                    </Button>
                  </Link>
                }
              />
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
                  {filteredJobs.map((job) => {
                    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG[JOB_STATUS.QUEUED];
                    const isRunning = job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED;
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
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ID: {job.jobId}
                              </p>
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
                        <td className="py-4 px-4 font-mono text-xs text-purple-600 dark:text-purple-400">
                          {formatNumber(job.rowsPerSecond || 0)} r/s
                        </td>

                        {/* Duration */}
                        <td className="py-4 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {durationStr}
                        </td>

                        {/* Actions (Step 7) */}
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

                            {/* Cancel */}
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

                            {/* Retry */}
                            {canRetry && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={RotateCcw}
                                onClick={() => handleRetryJob(job)}
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

      {/* Cancel Modal */}
      <Modal
        isOpen={Boolean(cancelingJobId)}
        onClose={() => setCancelingJobId(null)}
        title="Cancel Job Processing?"
        description={`Are you sure you want to stop job ${cancelingJobId}?`}
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
    </div>
  );
}

export default JobsPage;
