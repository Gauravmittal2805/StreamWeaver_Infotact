import React from 'react';
import { Link2, Zap, ArrowRight, Layers, Sparkles, Check } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { MappingCard } from './MappingCard';

/**
 * Central workspace showing visual connections between source and destination fields.
 */
export function MappingWorkspace({
  mappings = [],
  onRemoveMapping,
  onCreateMapping,
  sourceColumns = [],
  destinationFields = [],
  selectedSource,
  selectedDestination,
  onSelectSource,
  onSelectDestination,
  onChangeTransformation,
  onProceedToTransform
}) {
  const isConnecting = Boolean(selectedSource || selectedDestination);

  return (
    <Card className="enterprise-card h-full flex flex-col font-jakarta border-slate-200 dark:border-slate-800">
      <CardHeader className="py-4 px-5 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">
              FIELD MAPPING
            </h2>
            <p className="text-[11px] text-slate-400">
              Connect source columns to target destination fields
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-slate-500">
          {mappings.length} active {mappings.length === 1 ? 'connection' : 'connections'}
        </Badge>
      </CardHeader>

      <CardBody className="p-4 flex-1 flex flex-col justify-between overflow-hidden">
        {/* Connection status helper / helper banner */}
        {isConnecting && (
          <div className="mb-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span className="text-indigo-900 dark:text-indigo-200 font-medium">
                {selectedSource && !selectedDestination && (
                  <>Selected Source: <strong className="font-mono text-indigo-700 dark:text-indigo-300">{selectedSource}</strong>. Now click a Destination field.</>
                )}
                {!selectedSource && selectedDestination && (
                  <>Selected Destination: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{selectedDestination}</strong>. Now click a Source column.</>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectSource(null);
                onSelectDestination(null);
              }}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Active Mappings List or Empty State */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[300px]">
          {mappings.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6">
              <EmptyState
                icon={Link2}
                title="No Connections Created"
                description="Click a Source Column on the left, then click a Destination Field on the right to connect them."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {mappings.map((mapping, index) => (
                <MappingCard
                  key={mapping.id}
                  mapping={mapping}
                  index={index}
                  onRemove={onRemoveMapping}
                  onChangeTransformation={onChangeTransformation}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick footer hint */}
        {mappings.length > 0 && onProceedToTransform && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Ready to configure transformations?
            </span>
            <Button
              variant="outline"
              size="sm"
              rightIcon={ArrowRight}
              onClick={onProceedToTransform}
              className="text-xs h-8 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50"
            >
              Configure Transformations
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default MappingWorkspace;
