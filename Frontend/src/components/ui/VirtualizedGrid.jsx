import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Enterprise Virtualized Data Grid
 * - Sticky header (fixed during vertical scroll, synchronized with horizontal scroll)
 * - Row numbers fixed column
 * - Windowed rendering (only visible DOM rows mounted)
 * - Tooltip on long cell values
 * - Horizontal + vertical scroll sync
 */
export function VirtualizedGrid({
  columns = [],
  rows = [],
  rowHeight = 44,
  height = 560,
  className = '',
}) {
  const outerRef = useRef(null);       // The scrollable container
  const headerRef = useRef(null);      // The sticky header bar
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Compute which columns to display: use provided columns, fall back to keys of first row
  const displayColumns = useMemo(() => {
    if (columns && columns.length > 0) return columns;
    if (rows && rows.length > 0) return Object.keys(rows[0]);
    return [];
  }, [columns, rows]);

  const totalRows = rows.length;
  const totalHeight = totalRows * rowHeight;

  // Column sizing
  const ROW_NUM_WIDTH = 56;
  const COL_MIN_WIDTH = 160;
  const totalContentWidth = ROW_NUM_WIDTH + displayColumns.length * COL_MIN_WIDTH;

  // Windowing with overscan
  const overscan = 8;
  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleEnd = Math.min(totalRows, Math.ceil((scrollTop + height) / rowHeight) + overscan);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleStart; i < visibleEnd; i++) {
      items.push({ index: i, data: rows[i], top: i * rowHeight });
    }
    return items;
  }, [rows, visibleStart, visibleEnd, rowHeight]);

  // Sync scroll: update state on scroll event
  const handleScroll = useCallback((e) => {
    const { scrollTop: st, scrollLeft: sl } = e.currentTarget;
    setScrollTop(st);
    setScrollLeft(sl);
    // Keep header synchronized horizontally
    if (headerRef.current) {
      headerRef.current.scrollLeft = sl;
    }
  }, []);

  // Keep header scroll position synced on mount / col changes
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  if (totalRows === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-xl">
        <p className="text-sm font-semibold text-slate-700">No records found</p>
        <p className="text-xs text-slate-400 mt-1">This dataset appears to be empty or the search returned no results.</p>
      </div>
    );
  }

  return (
    <div className={`enterprise-card rounded-xl overflow-hidden bg-white flex flex-col ${className}`}>

      {/* ── Sticky Header (overflow hidden so it follows horizontal scroll via JS) ── */}
      <div
        ref={headerRef}
        className="overflow-hidden shrink-0 bg-slate-100/95 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider shadow-xs"
        style={{ height: 40 }}
        aria-hidden="true"
      >
        {/* Inner flex row — width matches body content */}
        <div
          className="flex items-center h-full"
          style={{ minWidth: totalContentWidth }}
        >
          {/* Row-number header cell */}
          <div
            className="shrink-0 flex items-center justify-center border-r border-slate-200 text-slate-400 font-mono"
            style={{ width: ROW_NUM_WIDTH, height: '100%' }}
          >
            #
          </div>

          {/* Column header cells */}
          {displayColumns.map((col) => (
            <div
              key={col}
              className="flex items-center px-4 border-r border-slate-200/60 last:border-r-0 truncate"
              style={{ minWidth: COL_MIN_WIDTH, height: '100%' }}
              title={col}
            >
              {col}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div
        ref={outerRef}
        onScroll={handleScroll}
        className="overflow-auto custom-scrollbar focus:outline-none"
        style={{ height, maxHeight: height }}
        tabIndex={0}
      >
        {/* Total height spacer so scrollbar is correct */}
        <div style={{ minWidth: totalContentWidth, height: totalHeight, position: 'relative' }}>

          {/* Windowed rows */}
          {visibleItems.map(({ index, data, top }) => {
            if (!data) return null;
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={`absolute left-0 flex items-center text-xs border-b border-slate-100 group transition-colors ${
                  isEven ? 'bg-white' : 'bg-slate-50/50'
                } hover:bg-indigo-50/40`}
                style={{
                  top,
                  height: rowHeight,
                  minWidth: totalContentWidth,
                  width: '100%',
                }}
              >
                {/* Row number */}
                <div
                  className="shrink-0 flex items-center justify-center text-[11px] font-mono text-slate-400 border-r border-slate-100 group-hover:text-indigo-600 group-hover:font-semibold"
                  style={{ width: ROW_NUM_WIDTH, height: '100%' }}
                >
                  {index + 1}
                </div>

                {/* Cell data */}
                {displayColumns.map((col) => {
                  const raw = data[col];
                  const cellValue = raw !== undefined && raw !== null ? String(raw) : '—';
                  const isLong = cellValue.length > 60;

                  return (
                    <div
                      key={col}
                      className="flex items-center px-4 border-r border-slate-100/60 last:border-r-0 text-slate-700 font-normal"
                      style={{ minWidth: COL_MIN_WIDTH, height: '100%' }}
                    >
                      {isLong ? (
                        <span
                          className="truncate max-w-full cursor-help"
                          title={cellValue}
                        >
                          {cellValue}
                        </span>
                      ) : (
                        <span className="truncate max-w-full">{cellValue}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer stats bar ── */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>
            Showing <strong className="text-slate-800 font-mono">1 – {totalRows.toLocaleString()}</strong> rows
            <span className="text-slate-400"> • virtual window: {visibleItems.length} DOM rows</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {displayColumns.length} columns • Virtualized Rendering
        </div>
      </div>
    </div>
  );
}

export default VirtualizedGrid;
