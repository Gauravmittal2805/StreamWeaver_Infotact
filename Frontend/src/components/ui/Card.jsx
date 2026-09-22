import React from 'react';

/**
 * Enterprise Card component
 */
export function Card({
  children,
  className = '',
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={`enterprise-card rounded-xl overflow-hidden ${hover ? 'enterprise-card-hover cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  title,
  description,
  action,
  className = '',
  ...props
}) {
  return (
    <div className={`p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`} {...props}>
      {children || (
        <div>
          {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
      )}
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = '',
  ...props
}) {
  return (
    <div className={`p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
