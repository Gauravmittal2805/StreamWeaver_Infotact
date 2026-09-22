import React from 'react';
import {
  Workflow,
  ArrowRight,
  Plus
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export function PipelinesPage() {
  const mockPipelines = [
    {
      id: 'pipe-01',
      name: 'Customer Record Cleansing & Anomaly Removal',
      sourceFormat: 'CSV',
      targetFormat: 'NDJSON',
      stagesCount: 4,
      status: 'active',
      recordsProcessed: '1,450,200',
      description: 'Strips empty email fields, normalizes international phone prefixes, and quarantines bad zip codes.'
    },
    {
      id: 'pipe-02',
      name: 'Financial Transaction Deduplication & Enrichment',
      sourceFormat: 'JSON',
      targetFormat: 'CSV',
      stagesCount: 3,
      status: 'active',
      recordsProcessed: '820,000',
      description: 'Deduplicates transactions on UUID + timestamp with sliding memory buffers and currency conversions.'
    },
    {
      id: 'pipe-03',
      name: 'Log Stream Event Flattening & Filtering',
      sourceFormat: 'JSON',
      targetFormat: 'NDJSON',
      stagesCount: 5,
      status: 'paused',
      recordsProcessed: '4,100,500',
      description: 'Filters debug events and flattens nested metadata into top-level key-value pairs for analytics.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Streaming Pipelines</h2>
            <Badge variant="purple" size="sm">Day 2 Milestone</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure visual data flow pipelines, field transformations, and streaming output sinks.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => alert('Visual Pipeline Builder is scheduled for Day 2.')}
        >
          Create New Pipeline
        </Button>
      </div>

      {/* Pipelines List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockPipelines.map((pipeline) => (
          <Card key={pipeline.id} className="flex flex-col justify-between">
            <CardBody className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Workflow className="w-5 h-5" />
                </div>
                <Badge
                  variant={pipeline.status === 'active' ? 'success' : 'warning'}
                  size="sm"
                  dot
                >
                  {pipeline.status.toUpperCase()}
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">{pipeline.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {pipeline.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 text-slate-600">
                <span>{pipeline.stagesCount} Transform Stages</span>
                <span className="font-mono font-semibold">{pipeline.recordsProcessed} recs</span>
              </div>
            </CardBody>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">{pipeline.id}</span>
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                onClick={() => alert('Pipeline details inspector ready on Day 2.')}
              >
                Inspect <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default PipelinesPage;
