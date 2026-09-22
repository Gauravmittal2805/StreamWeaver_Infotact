import React from 'react';

/**
 * Animated Progress Bar for streaming upload and job monitoring
 */
export function ProgressBar({
  progress = 0, // 0 - 100
  size = 'md', // 'sm' | 'md' | 'lg'
  variant = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'rose'
  animated = true,
  className = '',
}) {
  const cleanProgress = Math.min(100, Math.max(0, progress));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 ${sizeStyles[size]} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${variantStyles[variant]} ${
          animated && cleanProgress > 0 && cleanProgress < 100 ? 'relative overflow-hidden' : ''
        }`}
        style={{ width: `${cleanProgress}%` }}
      >
        {animated && cleanProgress > 0 && cleanProgress < 100 && (
          <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_ease-in-out_infinite]" />
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
