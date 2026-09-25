import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

/**
 * Individual mapping card showing a source -> destination connection.
 * @param {Object} props
 * @param {Object} props.mapping - {id, sourceField, destinationField}
 * @param {Function} props.onRemove - Callback to remove this mapping
 * @param {number} props.index - Card index number
 */
export function MappingCard({ mapping, onRemove, index }) {
  return (
    <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="enterprise-card mb-2 hover:shadow-md transition-shadow">
        <CardBody className="flex items-center justify-between p-3">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-slate-400 font-mono text-xs w-6">{index + 1}.</span>
            
            <div className="flex-1 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
              {/* Source Field */}
              <div className="flex-1 text-right pr-4">
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-sm font-medium">
                  {mapping.sourceField}
                </Badge>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-slate-400">
                <ArrowRight className="w-5 h-5" />
              </div>

              {/* Destination Field */}
              <div className="flex-1 pl-4">
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-sm font-medium">
                  {mapping.destinationField}
                </Badge>
              </div>
            </div>
          </div>

          <div className="ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(mapping.id)}
              className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-8 w-8 p-0 rounded-full transition-colors"
              aria-label="Remove mapping"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default MappingCard;
