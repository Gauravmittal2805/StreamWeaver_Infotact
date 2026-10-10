import React from 'react';
import { Link } from 'react-router-dom';
import {
  Workflow,
  ArrowRight,
  Plus,
  Database,
  Layers,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useDatasets } from '../hooks/useDatasets';
import { formatDate, formatBytes } from '../utils/formatters';

export function PipelinesPage() {
  const { datasets, loading } = useDatasets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Streaming Pipelines
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure visual data flow pipelines, field transformations, and streaming output sinks.
          </p>
        </div>

        <Link to="/upload">
          <Button
            variant="primary"
            leftIcon={Plus}
          >
            Create New Pipeline
          </Button>
        </Link>
      </div>

      {/* Pipeline Information Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              High-Throughput Streaming Engine
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Select any registered dataset below to configure schema mappings, transformations, and sandboxed Custom JS.
            </p>
          </div>
        </div>

        <Link to="/datasets">
          <Button variant="outline" size="sm" className="whitespace-nowrap bg-white dark:bg-slate-900">
            View All Datasets
          </Button>
        </Link>
      </div>

      {/* Pipelines / Datasets List */}
      <Card>
        <CardBody className="p-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs">Loading available pipeline sources...</p>
            </div>
          ) : datasets.length === 0 ? (
            <EmptyState
              title="No streaming pipelines configured"
              description="Upload a CSV or JSON dataset to initialize your first ETL transformation pipeline."
              icon={Workflow}
              actionLabel="Upload Dataset"
              actionIcon={Plus}
              onAction={() => { window.location.href = '/upload'; }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {datasets.map((dataset) => (
                <Card key={dataset.id} className="flex flex-col justify-between hover:border-indigo-200 transition-colors">
                  <CardBody className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        {dataset.format === 'csv' ? (
                          <FileSpreadsheet className="w-5 h-5" />
                        ) : (
                          <FileCode className="w-5 h-5" />
                        )}
                      </div>
                      <Badge
                        variant={dataset.status === 'completed' || dataset.status === 'uploaded' ? 'success' : 'purple'}
                        size="sm"
                        dot
                      >
                        {(dataset.status || 'READY').toUpperCase()}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1" title={dataset.filename}>
                        {dataset.filename}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        ID: {dataset.id}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        {formatBytes(dataset.size)}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(dataset.uploadedAt)}
                      </span>
                    </div>
                  </CardBody>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <Link
                      to={`/datasets/${dataset.id}/preview`}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                    >
                      Preview Source
                    </Link>
                    <Link
                      to={`/datasets/${dataset.id}/mapping`}
                      className="text-indigo-600 hover:text-indigo-800 dark:hover:text-indigo-400 font-semibold inline-flex items-center gap-1"
                    >
                      Configure Pipeline <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default PipelinesPage;
