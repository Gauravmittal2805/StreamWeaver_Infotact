import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';
import { TRANSFORMATIONS, getTransformationMeta } from '../../utils/transformationUtils';

/**
 * Clean, professional dropdown selector for choosing transformations
 * @param {Object} props
 * @param {string} props.value - Selected transformation ID
 * @param {Function} props.onChange - Callback(newTransformId)
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className='']
 */
export function TransformationSelector({
  value = 'none',
  onChange,
  disabled = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentMeta = getTransformationMeta(value);
  const CurrentIcon = currentMeta.icon || Sparkles;

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (transformId) => {
    if (onChange) {
      onChange(transformId);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={`
          flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
          transition-all border shadow-xs
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200' 
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'}
        `}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <CurrentIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">{currentMeta.label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-1.5 w-64 origin-top-left bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1.5 focus:outline-hidden animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Select Transformation
          </div>

          <div className="p-1 space-y-0.5">
            {TRANSFORMATIONS.map((transform) => {
              const Icon = transform.icon;
              const isSelected = (value || 'none').toLowerCase() === transform.id.toLowerCase();

              return (
                <button
                  key={transform.id}
                  type="button"
                  onClick={() => handleSelect(transform.id)}
                  className={`
                    w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors
                    ${isSelected 
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'}
                  `}
                >
                  <div className="flex items-start gap-2 min-w-0 pr-2">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {transform.label}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight truncate">
                        {transform.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TransformationSelector;
