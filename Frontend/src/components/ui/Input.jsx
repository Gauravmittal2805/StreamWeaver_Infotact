import React from 'react';

/**
 * Enterprise Form Input component
 */
export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative rounded-lg">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          className={`block w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          } py-2 ${
            error ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
      )}

      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

export default Input;
