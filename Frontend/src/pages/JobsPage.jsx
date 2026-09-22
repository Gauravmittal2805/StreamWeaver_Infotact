import React from 'react';
import { Play, Cpu, RefreshCw } from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate } from '../utils/formatters';

const MOCK_JOBS_LIST = [
  {
    id: 'job_8921a',
    name: 'Batch Transform: Orders-Q3.csv',
    datasetId: 'dataset_172700192',
    status: 'completed',
    progress: 100,
    recordsIn: 1540200,
    recordsOut: 1540188,
    duration: '4.82s',
    startedAt: '2026-09-22T13:30:00.000Z',
  },
  {
    id: 'job_8922b',
    name: 'Streaming ETL: Clickstream-Telemetry.json',
    datasetId: 'dataset_172700831',
    status: 'running',
    progress: 68,
    recordsIn: 3200000,
    recordsOut: 2176000,
    duration: '12.4s',
    startedAt: '2026-09-22T13:55:00.000Z',
  },
  {
    id: 'job_8923c',
    name: 'Schema Cleansing: Users-Master.csv',
    datasetId: 'dataset_172700940',
    status: 'pending',
    progress: 0,
    recordsIn: 500000,
    recordsOut: 0,
    duration: '—',
    startedAt: '2026-09-22T14:00:00.000Z',
  },
];

export function JobsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">ETL Processing Jobs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor real-time worker execution streams, memory consumption, and record throughput.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Play}
            onClick={() => alert('New Job Dispatcher integrated with Day 2 Transform Engine.')}
          >
            Dispatch Job
          </Button>
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Job Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 w-48">Progress</th>
                  <th className="py-3.5 px-4">Processed Records</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-6 text-right">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {MOCK_JOBS_LIST.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{job.name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            Job: {job.id} • Dataset: {job.datasetId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={job.status} size="sm" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <ProgressBar
                          progress={job.progress}
                          size="sm"
                          variant={job.status === 'completed' ? 'emerald' : 'indigo'}
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>{job.progress}%</span>
                          <span>{job.status === 'running' ? 'Active' : 'Finished'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-700">
                      {job.recordsOut.toLocaleString()} / {job.recordsIn.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-slate-600">
                      {job.duration}
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500">
                      {formatDate(job.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default JobsPage;
