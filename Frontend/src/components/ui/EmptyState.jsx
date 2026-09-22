import React from 'react';
import { Database } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState component for clean fallback screens
 */
export function EmptyState({
  icon: Icon = Database,
  title = 'No data available',
  description = 'There is currently no information to display.',
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white ${className}`}>
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 mb-4 shadow-xs">
        <Icon className="w-8 h-8" />
      </div>
      
      <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          leftIcon={actionIcon}
          variant="primary"
          size="md"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
