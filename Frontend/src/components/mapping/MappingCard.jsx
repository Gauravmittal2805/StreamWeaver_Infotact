import React from 'react';
import { ArrowRight, X, Sparkles, Layers, ArrowUpAZ } from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { getTransformationMeta } from '../../utils/transformationUtils';

/**
 * Individual mapping card showing source -> destination connection with transformation tag.
 */
export function MappingCard({
  mapping,
  onRemove,
  index,
  onChangeTransformation
}) {
  const transformMeta = getTransformationMeta(mapping.transformation);
  const isTransformed = mapping.transformation && mapping.transformation !== 'none';

  return (
    <div className="relative group animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Card className="enterprise-card mb-2 hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
        <CardBody className="flex items-center justify-between p-3 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-slate-400 font-mono text-xs w-5 shrink-0 text-center">{index + 1}.</span>
            
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/80 gap-2">
              {/* Source Field */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">SRC:</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 truncate">
                  {mapping.sourceField}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center text-slate-400 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Destination Field */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">DEST:</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60 truncate">
                  {mapping.destinationField}
                </span>
              </div>

              {/* Transformation Indicator */}
              {isTransformed && (
                <div className="shrink-0 flex items-center">
                  <Badge size="sm" className={transformMeta.badgeColor}>
                    <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-500" />
                    {transformMeta.label}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(mapping.id)}
              className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-8 w-8 p-0 rounded-full transition-colors"
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
