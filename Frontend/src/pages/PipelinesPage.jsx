import React, { useState } from 'react';
import {
  Workflow,
  ArrowRight,
  Plus
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

export function PipelinesPage() {
  const [pipelines] = useState([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Streaming Pipelines</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure visual data flow pipelines, field transformations, and streaming output sinks.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => alert('Visual Pipeline Builder coming soon.')}
        >
          Create New Pipeline
        </Button>
      </div>

      {/* Pipelines List */}
      <Card>
        <CardBody className="p-6">
          {pipelines.length === 0 ? (
            <EmptyState
              title="No streaming pipelines created"
              description="No real streaming pipelines configured yet. Click 'Create New Pipeline' to define a transformation stream."
              icon={Workflow}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pipelines.map((pipeline) => (
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
                      onClick={() => alert('Pipeline inspector coming soon.')}
                    >
                      Inspect <ArrowRight className="w-3.5 h-3.5" />
                    </button>
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
