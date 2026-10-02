import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  Clock,
  Gauge
} from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatNumber, formatDuration } from '../../utils/formatters';

const MAX_HISTORY_POINTS = 35; // Strict cap to guarantee flat O(1) memory usage (Requirement 12)

/**
 * High-performance SVG Area Chart for streaming throughput or cumulative progress.
 * Renders smooth vector curves without external dependencies or memory leaks.
 */
function StreamingAreaChart({
  data = [],
  color = '#6366f1',
  gradientId = 'chartGrad',
  unit = '',
  height = 140,
  minVal = 0,
  maxVal
}) {
  const points = data.length > 0 ? data : [0];
  const computedMax = maxVal !== undefined ? maxVal : Math.max(...points, 10);
  const range = computedMax - minVal || 1;

  const width = 500;
  const paddingY = 15;
  const chartHeight = height - paddingY * 2;

  // Convert points to SVG coordinates
  const coords = points.map((val, idx) => {
    const x = points.length === 1 ? width / 2 : (idx / (points.length - 1)) * width;
    const normalized = Math.min(Math.max((val - minVal) / range, 0), 1);
    const y = height - paddingY - normalized * chartHeight;
    return { x, y, val };
  });

  const pathD = coords.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x},${pt.y}`;
    // Smooth line curve
    const prev = coords[idx - 1];
    const midX = (prev.x + pt.x) / 2;
    return `${acc} C ${midX},${prev.y} ${midX},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = coords.length > 0
    ? `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`
    : '';

  const currentVal = points[points.length - 1] || 0;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            y1={height - paddingY - ratio * chartHeight}
            x2={width}
            y2={height - paddingY - ratio * chartHeight}
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        ))}

        {/* Gradient fill area */}
        {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

        {/* Curve stroke */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Current head dot */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="4.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * LivePerformanceCharts
 *
 * Real-time visualizations driven entirely by live WebSocket/backend metrics:
 * 1. Rows processed progression
 * 2. Rows/sec throughput stream with peak and average
 * 3. Successful vs Failed records ratio & integrity gauge
 * 4. Overall processing progress & velocity
 *
 * Strictly prevents fake data and memory leakage.
 */
export function LivePerformanceCharts({
  processedRows = 0,
  totalRows = 0,
  rowsPerSecond = 0,
  successfulRows = 0,
  failedRows = 0,
  progressPercent = 0,
  status = 'processing'
}) {
  // Bounded time-series buffers for real metrics
  const [speedHistory, setSpeedHistory] = useState([0]);
  const [processedHistory, setProcessedHistory] = useState([0]);

  // Keep track of peak speed seen during this session
  const peakSpeedRef = useRef(0);
  if (rowsPerSecond > peakSpeedRef.current) {
    peakSpeedRef.current = rowsPerSecond;
  }

  // Update time series on each real metric change (bounded strictly to MAX_HISTORY_POINTS)
  useEffect(() => {
    setSpeedHistory((prev) => {
      const next = [...prev, rowsPerSecond];
      return next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next;
    });

    setProcessedHistory((prev) => {
      const next = [...prev, processedRows];
      return next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next;
    });
  }, [rowsPerSecond, processedRows]);

  // Calculated throughput statistics
  const avgSpeed = useMemo(() => {
    const valid = speedHistory.filter((s) => s > 0);
    if (valid.length === 0) return rowsPerSecond;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }, [speedHistory, rowsPerSecond]);

  // Ratio calculations
  const totalAccounted = successfulRows + failedRows || processedRows || 1;
  const successRatio = ((successfulRows / totalAccounted) * 100).toFixed(1);
  const failureRatio = ((failedRows / totalAccounted) * 100).toFixed(1);

  // Estimated time remaining (ETA)
  const remainingRows = totalRows > processedRows ? totalRows - processedRows : 0;
  const estimatedSecondsLeft = rowsPerSecond > 0 && remainingRows > 0
    ? Math.round(remainingRows / rowsPerSecond)
    : null;

  return (
    <div className="space-y-4">
      {/* ── Top Grid: Throughput & Processed Curves ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Real-time Throughput (Rows/sec) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Throughput Rate (Rows/sec)
                  </h4>
                  <p className="text-[11px] text-slate-400">Live streaming ingestion velocity</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  {formatNumber(rowsPerSecond)}
                </span>
                <span className="text-xs text-slate-400 ml-1">rows/s</span>
              </div>
            </div>

            {/* Throughput Stats Ribbon */}
            <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatNumber(rowsPerSecond)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Average</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(avgSpeed)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Peak Rate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatNumber(peakSpeedRef.current)}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Stream Chart */}
          <div className="mt-4">
            <StreamingAreaChart
              data={speedHistory}
              color="#9333ea"
              gradientId="throughputGrad"
              unit="rows/s"
              height={120}
              minVal={0}
              maxVal={Math.max(peakSpeedRef.current, 100)}
            />
          </div>
        </Card>

        {/* Chart 2: Rows Processed Progression */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Cumulative Rows Streamed
                  </h4>
                  <p className="text-[11px] text-slate-400">Processed records progression curve</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatNumber(processedRows)}
                </span>
                {totalRows > 0 && (
                  <span className="text-xs text-slate-400 block font-mono">
                    of {formatNumber(totalRows)}
                  </span>
                )}
              </div>
            </div>

            {/* Progression Stats Ribbon */}
            <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {progressPercent}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {totalRows > 0 ? formatNumber(Math.max(totalRows - processedRows, 0)) : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Est. Time Left</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {estimatedSecondsLeft !== null ? formatDuration(estimatedSecondsLeft) : 'Streaming…'}
                </span>
              </div>
            </div>
          </div>

          {/* SVG Progression Chart */}
          <div className="mt-4">
            <StreamingAreaChart
              data={processedHistory}
              color="#4f46e5"
              gradientId="processedGrad"
              unit="rows"
              height={120}
              minVal={0}
              maxVal={totalRows > 0 ? totalRows : Math.max(processedRows, 100)}
            />
          </div>
        </Card>
      </div>

      {/* ── Bottom Grid: Successful vs Failed Records Breakdown ──────────────── */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Record Integrity Breakdown (Successful vs Failed)
              </h4>
              <p className="text-[11px] text-slate-400">Data quality ratio of all processed stream items</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              {successRatio}% Successful
            </span>
            {failedRows > 0 && (
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                {failureRatio}% Failed
              </span>
            )}
          </div>
        </div>

        {/* Visual Ratio Split Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden flex p-0.5 border border-slate-200 dark:border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-l-full transition-all duration-300"
            style={{ width: `${Math.max(Number(successRatio) || 0, successfulRows > 0 ? 2 : 0)}%` }}
            title={`Successful: ${formatNumber(successfulRows)} (${successRatio}%)`}
          />
          {failedRows > 0 && (
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-r-full transition-all duration-300"
              style={{ width: `${Math.max(Number(failureRatio) || 0, 2)}%` }}
              title={`Failed: ${formatNumber(failedRows)} (${failureRatio}%)`}
            />
          )}
        </div>

        {/* 3 Metrics Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold block">
              Committed Clean Records
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatNumber(successfulRows)}
            </span>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
              Valid schema & transformations applied
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/40">
            <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold block">
              Failed / Quarantined Records
            </span>
            <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1 block">
              {formatNumber(failedRows)}
            </span>
            <span className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
              {failedRows > 0 ? 'Malformed or validation rejections' : 'Zero errors encountered'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Overall Pipeline Integrity
            </span>
            <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
              {processedRows > 0 ? `${successRatio}%` : 'Pending…'}
            </span>
            <span className="text-[11px] text-slate-500">
              Stream compliance score
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default LivePerformanceCharts;
