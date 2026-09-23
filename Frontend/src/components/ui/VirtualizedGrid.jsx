import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Enterprise Virtualized Data Grid Component (Steps 8 & 9)
 * Efficiently renders tabular data (1,000 to 100,000+ rows)
 * using windowing so only visible DOM rows are mounted.
 */
export function VirtualizedGrid({
  columns = [],
  rows = [],
  rowHeight = 44,
  height = 560,
  className = '',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalRows = rows.length;
  const totalHeight = totalRows * rowHeight;

  // Windowing calculation with overscan buffer
  const overscan = 6;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(totalRows, Math.floor((scrollTop + height) / rowHeight) + overscan);

  const visibleRows = useMemo(() => {
    const items = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push({
        index: i,
        data: rows[i],
        top: i * rowHeight,
      });
    }
    return items;
  }, [rows, startIndex, endIndex, rowHeight]);

  // Compute column formatting
  const formattedColumns = useMemo(() => {
    if (columns.length > 0) return columns;
    if (rows.length > 0) return Object.keys(rows[0]);
    return [];
  }, [columns, rows]);

  if (totalRows === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-xl">
        <p className="text-sm font-semibold text-slate-700">No records found</p>
        <p className="text-xs text-slate-400 mt-1">This dataset appears to be empty.</p>
      </div>
    );
  }

  return (
    <div className={`enterprise-card rounded-xl overflow-hidden bg-white flex flex-col ${className}`}>
      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ height, maxHeight: height }}
        className="overflow-auto relative custom-scrollbar select-text focus:outline-none"
        tabIndex={0}
      >
        {/* Inner sizing container to establish scroll geometry */}
        <div style={{ minWidth: Math.max(containerWidth, formattedColumns.length * 160 + 80), width: '100%', height: totalHeight + 40, position: 'relative' }}>
          
          {/* Sticky Header Row */}
          <div
            className="sticky top-0 z-20 flex items-center bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider shadow-xs"
            style={{ height: 40 }}
          >
            {/* Row Number Header */}
            <div className="w-16 px-3 py-2.5 text-center shrink-0 border-r border-slate-200 text-slate-400 font-mono">
              #
            </div>

            {/* Column Headers */}
            {formattedColumns.map((col) => (
              <div
                key={col}
                className="flex-1 min-w-[150px] px-4 py-2.5 text-left truncate border-r border-slate-200/60 last:border-r-0"
                title={col}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Virtualized Rows Container */}
          <div className="relative w-full" style={{ height: totalHeight }}>
            {visibleRows.map(({ index, data, top }) => {
              if (!data) return null;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={`absolute left-0 right-0 flex items-center text-xs border-b border-slate-100 transition-colors ${
                    isEven ? 'bg-white' : 'bg-slate-50/50'
                  } hover:bg-indigo-50/50 group`}
                  style={{
                    top,
                    height: rowHeight,
                  }}
                >
                  {/* Row Number */}
                  <div className="w-16 px-3 text-center shrink-0 text-[11px] font-mono text-slate-400 border-r border-slate-100 group-hover:text-indigo-600 group-hover:font-semibold">
                    {index + 1}
                  </div>

                  {/* Cell Data */}
                  {formattedColumns.map((col) => {
                    const cellValue = data[col] !== undefined && data[col] !== null ? String(data[col]) : '—';
                    return (
                      <div
                        key={col}
                        className="flex-1 min-w-[150px] px-4 truncate text-slate-700 font-normal border-r border-slate-100/60 last:border-r-0"
                        title={cellValue}
                      >
                        {cellValue}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Footer Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>
            Showing <strong className="text-slate-800 font-mono">1 – {totalRows.toLocaleString()}</strong> rows (virtual window active: {visibleRows.length} DOM rows rendered)
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {formattedColumns.length} columns • 60 FPS Virtualized Engine
        </div>
      </div>
    </div>
  );
}

export default VirtualizedGrid;
