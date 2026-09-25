import React, { useState } from 'react';
import { Target, Plus, X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { EmptyState } from '../ui/EmptyState';

/**
 * Component to manage destination fields for ETL mapping.
 */
export default function DestinationFieldsPanel({
  fields = [],
  mappedFields = [],
  onAddField,
  onRemoveField,
  onSelectField,
  selectedField,
  loading = false,
  validationErrors = [],
}) {
  const [newField, setNewField] = useState('');

  const handleAddField = (e) => {
    e.preventDefault();
    if (newField.trim() && !fields.includes(newField.trim())) {
      onAddField?.(newField.trim());
      setNewField('');
    }
  };

  const mappedCount = mappedFields.length;
  const totalCount = fields.length;

  return (
    <Card className="enterprise-card h-full flex flex-col font-jakarta">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">DESTINATION FIELDS</h2>
        </div>
        <Badge variant="outline" className="text-slate-500">
          {mappedCount} of {totalCount} connected
        </Badge>
      </CardHeader>

      <CardBody className="flex flex-col p-4 flex-1 overflow-hidden">
        <form onSubmit={handleAddField} className="mb-4 flex gap-2">
          <Input
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            placeholder="Add new destination field..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!newField.trim() || fields.includes(newField.trim())}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))
          ) : fields.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No destination fields"
              description="Add your first destination field to start mapping."
            />
          ) : (
            fields.map((field) => {
              const isMapped = mappedFields.includes(field);
              const isSelected = selectedField === field;

              return (
                <div
                  key={field}
                  onClick={() => onSelectField?.(field)}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {isMapped ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                    )}
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      {field}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isMapped && (
                      <Tooltip content="Connected to source">
                        <LinkIcon className="w-4 h-4 text-emerald-500" />
                      </Tooltip>
                    )}
                    
                    {!isMapped && (
                      <Tooltip content="Remove field">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveField?.(field);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {validationErrors && validationErrors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              {validationErrors.map((error, idx) => (
                <span key={idx} className="text-sm text-rose-600 dark:text-rose-400">
                  {error}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
