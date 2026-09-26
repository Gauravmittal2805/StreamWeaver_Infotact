import React, { useState, useMemo } from 'react';
import { Database, GripVertical, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { EmptyState } from '../ui/EmptyState';

/**
 * Component to display and manage source fields for ETL mapping.
 */
export default function SourceFieldsPanel({
  columns = [],
  mappedFields = [],
  onSelectField,
  selectedField,
  loading = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = useMemo(() => {
    return columns.filter(col => col.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [columns, searchTerm]);

  const mappedCount = mappedFields.length;
  const totalCount = columns.length;

  return (
    <Card className="enterprise-card h-full flex flex-col font-jakarta">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-200">SOURCE COLUMNS</h2>
        </div>
        <Badge variant="outline" className="text-slate-500">
          {mappedCount} of {totalCount} mapped
        </Badge>
      </CardHeader>

      <CardBody className="flex flex-col p-4 flex-1 overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search source fields..."
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
            ))
          ) : filteredColumns.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No source columns"
              description={searchTerm ? "No columns match your search." : "No columns found in the dataset."}
            />
          ) : (
            filteredColumns.map((col) => {
              const isMapped = mappedFields.includes(col);
              const isSelected = selectedField === col;

              return (
                <div
                  key={col}
                  onClick={() => onSelectField?.(col)}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700'}
                    ${isMapped ? 'opacity-75' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      {col}
                    </span>
                  </div>
                  
                  <div>
                    {isMapped ? (
                      <Tooltip content="Mapped">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </Tooltip>
                    ) : (
                      <Tooltip content="Not mapped">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not mapped</span>
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardBody>
    </Card>
  );
}
