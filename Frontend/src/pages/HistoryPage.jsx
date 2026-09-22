import React from 'react';
import { History } from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatDate } from '../utils/formatters';

const MOCK_AUDIT_LOGS = [
  {
    id: 'evt-101',
    actor: 'System Ingestion Service',
    action: 'Dataset Upload Stream Received',
    resource: 'dataset_172700192 (customers.csv)',
    status: 'success',
    timestamp: '2026-09-22T13:45:00.000Z',
    details: 'Wrote 2.4 GB to storage in 3.42 seconds with 0 memory backpressure throttling.',
  },
  {
    id: 'evt-102',
    actor: 'Pipeline Engine #1',
    action: 'ETL Transformation Completed',
    resource: 'job_8921a (Orders-Q3.csv)',
    status: 'success',
    timestamp: '2026-09-22T13:15:00.000Z',
    details: 'Transformed 1,540,200 records with 12 anomalies routed to quarantine sink.',
  },
  {
    id: 'evt-103',
    actor: 'Security & Schema Validator',
    action: 'File Format Verification',
    resource: 'dataset_172700831 (telemetry.json)',
    status: 'success',
    timestamp: '2026-09-22T12:00:00.000Z',
    details: 'JSON array parsed and verified with streaming NDJSON validator.',
  },
];

export function HistoryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Execution & Audit History</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Immutable audit trail of dataset uploads, transformation jobs, and security events.
        </p>
      </div>

      {/* History List */}
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-100">
            {MOCK_AUDIT_LOGS.map((log) => (
              <div key={log.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
                    <History className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{log.action}</span>
                      <Badge variant="success" size="sm">COMPLETED</Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">
                      Target: {log.resource}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 text-xs text-slate-400">
                  <div className="font-medium text-slate-600">{log.actor}</div>
                  <div className="mt-0.5">{formatDate(log.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default HistoryPage;
