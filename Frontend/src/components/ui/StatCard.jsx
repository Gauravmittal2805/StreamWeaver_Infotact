import React from 'react';
import Card from './Card';
import Badge from './Badge';

/**
 * Metric / KPI Card component for Dashboard
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-50',
  trend,
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
  className = '',
}) {
  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {trend && (
            <Badge
              size="sm"
              variant={trendType === 'positive' ? 'success' : trendType === 'negative' ? 'error' : 'default'}
            >
              {trend}
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
}

export default StatCard;
