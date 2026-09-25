import React from 'react';
import { Link2, Zap, LayoutDashboard } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { MappingCard } from './MappingCard';

/**
 * Central workspace showing visual connections between source and destination fields.
 * @param {Object} props
 * @param {Array} props.mappings - Array of {id, sourceField, destinationField}
 * @param {Function} props.onRemoveMapping - Callback to remove a mapping
 * @param {Function} props.onCreateMapping - Callback(sourceField, destinationField) to create new mapping
 * @param {Array} props.sourceColumns - Array of source column name strings
 * @param {Array} props.destinationFields - Array of destination field name strings
 * @param {string} props.selectedSource - Currently selected source field
 * @param {string} props.selectedDestination - Currently selected destination field
 * @param {Function} props.onSelectSource - Callback when source is selected
 * @param {Function} props.onSelectDestination - Callback when destination is selected
 */
export function MappingWorkspace({
  mappings,
  onRemoveMapping,
  onCreateMapping,
  sourceColumns,
  destinationFields,
  selectedSource,
  selectedDestination,
  onSelectSource,
  onSelectDestination
}) {
  const handleSourceClick = (field) => {
    onSelectSource(field);
    if (selectedDestination) {
      onCreateMapping(field, selectedDestination);
      onSelectSource(null);
      onSelectDestination(null);
    }
  };

  const handleDestinationClick = (field) => {
    onSelectDestination(field);
    if (selectedSource) {
      onCreateMapping(selectedSource, field);
      onSelectSource(null);
      onSelectDestination(null);
    }
  };

  // Helper to check if a field is already mapped
  const isSourceMapped = (field) => mappings.some(m => m.sourceField === field);
  const isDestinationMapped = (field) => mappings.some(m => m.destinationField === field);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      
      {/* LEFT: Source Fields */}
      <Card className="lg:col-span-3 enterprise-card flex flex-col h-full max-h-[600px]">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-indigo-500" />
            Source Fields
          </h3>
        </CardHeader>
        <CardBody className="overflow-y-auto p-3 space-y-1.5 flex-1 custom-scrollbar">
          {sourceColumns.map((field) => {
            const mapped = isSourceMapped(field);
            const selected = selectedSource === field;
            return (
              <div
                key={field}
                onClick={() => handleSourceClick(field)}
                className={`
                  px-3 py-2 text-sm rounded-lg cursor-pointer transition-all border
                  ${selected 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300' 
                    : mapped
                      ? 'bg-slate-50 border-transparent text-slate-500 opacity-60 dark:bg-slate-800/50 dark:text-slate-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-slate-800/80'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{field}</span>
                  {mapped && <Link2 className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* CENTER: Mapping Area */}
      <div className="lg:col-span-6 flex flex-col h-full max-h-[600px]">
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 overflow-y-auto custom-scrollbar relative">
          
          {selectedSource && selectedDestination && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 animate-in fade-in">
              <div className="flex flex-col items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-indigo-100 dark:border-indigo-500/20">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mb-3 animate-pulse">
                  <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Creating Mapping</h4>
                <p className="text-sm text-slate-500 text-center">
                  Connecting {selectedSource} to {selectedDestination}...
                </p>
              </div>
            </div>
          )}

          {mappings.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState 
                icon={Link2}
                title="No Mappings Yet"
                description="Select a source field and a destination field to connect them."
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">Active Connections</div>
              {mappings.map((mapping, index) => (
                <MappingCard 
                  key={mapping.id} 
                  mapping={mapping} 
                  index={index} 
                  onRemove={onRemoveMapping} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Destination Fields */}
      <Card className="lg:col-span-3 enterprise-card flex flex-col h-full max-h-[600px]">
        <CardHeader className="py-4 px-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-emerald-500" />
            Destination Fields
          </h3>
        </CardHeader>
        <CardBody className="overflow-y-auto p-3 space-y-1.5 flex-1 custom-scrollbar">
          {destinationFields.map((field) => {
            const mapped = isDestinationMapped(field);
            const selected = selectedDestination === field;
            return (
              <div
                key={field}
                onClick={() => handleDestinationClick(field)}
                className={`
                  px-3 py-2 text-sm rounded-lg cursor-pointer transition-all border
                  ${selected 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-300' 
                    : mapped
                      ? 'bg-slate-50 border-transparent text-slate-500 opacity-60 dark:bg-slate-800/50 dark:text-slate-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:bg-slate-800/80'}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{field}</span>
                  {mapped && <Badge className="bg-emerald-100 text-emerald-700 border-none px-1.5 py-0.5 text-[10px] dark:bg-emerald-500/20 dark:text-emerald-400">Mapped</Badge>}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
      
    </div>
  );
}

export default MappingWorkspace;
