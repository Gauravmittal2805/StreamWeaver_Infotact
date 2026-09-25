import React from 'react';
import { History, UploadCloud } from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useDatasets } from '../hooks/useDatasets';
import { formatDate, formatBytes } from '../utils/formatters';

export function HistoryPage() {
  const { datasets } = useDatasets();

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
        <CardBody className="p-6">
          {datasets.length === 0 ? (
            <EmptyState
              title="No execution or audit logs"
              description="No real file upload or ETL transformation history recorded yet."
              icon={History}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {datasets.map((ds) => (
                <div key={ds.id} className="py-4 sm:py-5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
                      <UploadCloud className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">Dataset Upload Stream Received</span>
                        <Badge variant="success" size="sm">COMPLETED</Badge>
                      </div>
                      <p className="text-xs text-slate-600 font-mono">
                        Target: {ds.id} ({ds.filename})
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        File format: {(ds.format || 'raw').toUpperCase()} • Storage size: {formatBytes(ds.size)}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 text-xs text-slate-400">
                    <div className="font-medium text-slate-600">System Ingestion Service</div>
                    <div className="mt-0.5">{formatDate(ds.uploadedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default HistoryPage;
