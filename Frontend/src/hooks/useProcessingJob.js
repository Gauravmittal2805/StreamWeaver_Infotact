import { useState, useEffect, useCallback, useRef } from 'react';
import { jobService } from '../services/jobService';

// ─── Job Status Constants ─────────────────────────────────────────────────────
// Match the backend's lowercase JOB_STATUS values exactly
export const JOB_STATUS = {
  IDLE: 'idle',        // Frontend-only: no job started yet
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const TERMINAL_STATUSES = new Set([
  JOB_STATUS.COMPLETED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELLED,
]);

const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Merges incoming job updates into previous state while guaranteeing that
 * progress percentages, processed counts, and metrics NEVER reset backwards
 * or revert to 0 on reconnect or partial payload delivery.
 */
function mergeJobData(prev, incoming) {
  if (!incoming) return prev;
  if (!prev) return incoming;

  const prevProgress = Number(prev.progressPercent ?? 0);
  const incomingProgress = Number(incoming.progressPercent ?? 0);
  const isCompleted = incoming.status === JOB_STATUS.COMPLETED || prev.status === JOB_STATUS.COMPLETED;
  const finalProgress = isCompleted
    ? 100
    : Math.max(prevProgress, incomingProgress);

  const prevProcessed = Number(prev.processedRows ?? 0);
  const incomingProcessed = Number(incoming.processedRows ?? 0);
  const finalProcessed = Math.max(prevProcessed, incomingProcessed);

  const prevSuccess = Number(prev.successfulRows ?? 0);
  const incomingSuccess = Number(incoming.successfulRows ?? 0);
  const finalSuccess = Math.max(prevSuccess, incomingSuccess);

  const prevFailed = Number(prev.failedRows ?? 0);
  const incomingFailed = Number(incoming.failedRows ?? 0);
  const finalFailed = Math.max(prevFailed, incomingFailed);

  const finalTotal = Number(incoming.totalRows || prev.totalRows || 0);
  const finalSpeed = incoming.rowsPerSecond !== undefined
    ? Number(incoming.rowsPerSecond)
    : Number(prev.rowsPerSecond ?? 0);

  const incomingErrors = Array.isArray(incoming.errors) ? incoming.errors : [];
  const prevErrors = Array.isArray(prev.errors) ? prev.errors : [];
  const finalErrors = incomingErrors.length >= prevErrors.length ? incomingErrors : prevErrors;

  return {
    ...prev,
    ...incoming,
    totalRows: finalTotal,
    processedRows: finalProcessed,
    successfulRows: finalSuccess,
    failedRows: finalFailed,
    progressPercent: finalProgress,
    rowsPerSecond: finalSpeed,
    errors: finalErrors,
    startedAt: incoming.startedAt || prev.startedAt || null,
    completedAt: incoming.completedAt || prev.completedAt || null,
    datasetId: incoming.datasetId || prev.datasetId || null,
  };
}

/**
 * Hook for managing a live ETL processing job.
 * Connects via WebSocket for real-time progress updates and
 * falls back to REST polling if WebSocket is unavailable.
 */
export function useProcessingJob() {
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [status, setStatus] = useState(JOB_STATUS.IDLE);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connected' | 'disconnected' | 'reconnecting'
  const [wsError, setWsError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const currentJobIdRef = useRef(null);
  const currentStatusRef = useRef(JOB_STATUS.IDLE);

  // Keep status ref in sync for use in closures
  useEffect(() => {
    currentStatusRef.current = status;
  }, [status]);

  // ── REST Polling (fallback / supplemental) ──────────────────────────────────
  const pollJobStatus = useCallback(async (jId) => {
    if (!jId) return;
    try {
      const res = await jobService.getJob(jId);
      if (res?.job) {
        setJobData(prev => mergeJobData(prev, res.job));
        if (res.job.status) {
          setStatus(res.job.status);
        }
      }
    } catch (err) {
      console.warn('[useProcessingJob] Poll failed:', err.message);
    }
  }, []);

  // ── WebSocket Connection ────────────────────────────────────────────────────
  const connectWebSocket = useCallback((jId) => {
    if (!jId) return;

    // Clean up existing connection
    if (wsRef.current) {
      const old = wsRef.current;
      old.onclose = null;
      old.onerror = null;
      if (old._pingInterval) clearInterval(old._pingInterval);
      if (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING) {
        old.close();
      }
      wsRef.current = null;
    }

    // In dev, Vite proxies /ws to the backend. In production use VITE_WS_URL.
    let WS_URL;
    try {
      const VITE_WS_URL = import.meta.env.VITE_WS_URL;
      if (VITE_WS_URL) {
        WS_URL = VITE_WS_URL + '/ws';
      } else {
        const loc = window.location;
        const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
        WS_URL = `${wsProtocol}//${loc.host}/ws`;
      }
    } catch {
      WS_URL = 'ws://localhost:5001/ws';
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setWsStatus('reconnecting');

      ws.onopen = () => {
        setWsStatus('connected');
        setWsError(null);
        reconnectAttemptsRef.current = 0;
        setReconnectAttempt(0);

        // Subscribe to this job's events
        ws.send(JSON.stringify({ type: 'subscribe', jobId: jId }));

        // Immediately retrieve latest job status upon connection/reconnection
        pollJobStatus(jId);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Ignore messages for other jobs
          if (msg.jobId && msg.jobId !== jId) return;

          switch (msg.type) {
            case 'progress':
            case 'job_progress':
              setJobData(prev => mergeJobData(prev, msg));
              if (msg.status) setStatus(msg.status);
              break;
            case 'completed':
              setJobData(prev => mergeJobData(prev, { ...msg, status: JOB_STATUS.COMPLETED }));
              setStatus(JOB_STATUS.COMPLETED);
              break;
            case 'failed':
              setJobData(prev => mergeJobData(prev, { ...msg, status: JOB_STATUS.FAILED }));
              setStatus(JOB_STATUS.FAILED);
              break;
            case 'cancelled':
              setJobData(prev => mergeJobData(prev, { ...msg, status: JOB_STATUS.CANCELLED }));
              setStatus(JOB_STATUS.CANCELLED);
              break;
            case 'subscribed':
            case 'pong':
              break;
            default:
              if (msg.status) {
                setJobData(prev => mergeJobData(prev, msg));
                setStatus(msg.status);
              }
              break;
          }
        } catch (e) {
          console.warn('[WS] Message parse error:', e);
        }
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
        setWsError('WebSocket connection error');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        setWsStatus('disconnected');

        // Immediately retrieve latest job status via REST when socket drops
        if (currentJobIdRef.current) {
          pollJobStatus(currentJobIdRef.current);
        }

        // Don't reconnect if job reached terminal state
        if (TERMINAL_STATUSES.has(currentStatusRef.current)) return;

        // Exponential backoff reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          setReconnectAttempt(reconnectAttemptsRef.current);
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          setWsStatus('reconnecting');
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket(currentJobIdRef.current);
          }, delay);
        }
      };

      // Heartbeat ping every 25s to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
      ws._pingInterval = pingInterval;

    } catch (err) {
      console.warn('[useProcessingJob] WebSocket connection failed:', err.message);
      setWsStatus('disconnected');
      setWsError(err.message);
    }
  }, [pollJobStatus]);

  // Manual reconnect trigger
  const reconnectNow = useCallback(() => {
    if (!currentJobIdRef.current) return;
    clearTimeout(reconnectTimerRef.current);
    reconnectAttemptsRef.current = 0;
    setReconnectAttempt(0);
    pollJobStatus(currentJobIdRef.current);
    connectWebSocket(currentJobIdRef.current);
  }, [connectWebSocket, pollJobStatus]);

  // ── Start a new job ─────────────────────────────────────────────────────────
  const startJob = useCallback(async (datasetId) => {
    setStatus(JOB_STATUS.QUEUED);
    setJobData(null);
    setWsError(null);
    reconnectAttemptsRef.current = 0;

    try {
      const res = await jobService.createJob({ datasetId, autoStart: true });
      if (!res?.job?.jobId) throw new Error('Invalid job response from server');

      const newJobId = res.job.jobId;
      currentJobIdRef.current = newJobId;
      setJobId(newJobId);
      setJobData(res.job);
      setStatus(res.job.status || JOB_STATUS.QUEUED);

      // Start WebSocket connection
      connectWebSocket(newJobId);

      // Also start REST polling as fallback every 3s
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => pollJobStatus(newJobId), 3000);

      return newJobId;
    } catch (err) {
      setStatus(JOB_STATUS.FAILED);
      setJobData({ error: err.message });
      throw err;
    }
  }, [connectWebSocket, pollJobStatus]);

  // ── Attach to an existing job (for direct URL navigation) ──────────────────
  const attachJob = useCallback(async (existingJobId) => {
    if (!existingJobId) return;

    currentJobIdRef.current = existingJobId;
    setJobId(existingJobId);
    reconnectAttemptsRef.current = 0;

    // Fetch current state immediately
    try {
      const res = await jobService.getJob(existingJobId);
      if (res?.job) {
        setJobData(res.job);
        setStatus(res.job.status || JOB_STATUS.QUEUED);

        // Only connect WS and poll if job isn't already terminal
        if (!TERMINAL_STATUSES.has(res.job.status)) {
          connectWebSocket(existingJobId);
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = setInterval(() => pollJobStatus(existingJobId), 3000);
        }
      }
    } catch (err) {
      console.error('[useProcessingJob] Failed to attach to existing job:', err.message);
      setStatus(JOB_STATUS.FAILED);
      setJobData({ error: err.message });
    }
  }, [connectWebSocket, pollJobStatus]);

  // ── Cancel a running job ────────────────────────────────────────────────────
  const cancelJob = useCallback(async () => {
    const jId = currentJobIdRef.current;
    if (!jId) return;
    const res = await jobService.cancelJob(jId);
    if (res?.job) {
      setJobData(res.job);
      setStatus(JOB_STATUS.CANCELLED);
    }
  }, []);

  // ── Reset to idle state ─────────────────────────────────────────────────────
  const reset = useCallback(() => {
    currentJobIdRef.current = null;
    setJobId(null);
    setJobData(null);
    setStatus(JOB_STATUS.IDLE);
    setWsStatus('disconnected');
    setWsError(null);
    reconnectAttemptsRef.current = 0;

    if (wsRef.current) {
      const ws = wsRef.current;
      ws.onclose = null;
      ws.onerror = null;
      if (ws._pingInterval) clearInterval(ws._pingInterval);
      ws.close();
      wsRef.current = null;
    }
    clearInterval(pollTimerRef.current);
    clearTimeout(reconnectTimerRef.current);
  }, []);

  // ── Cleanup WebSocket & polling when job reaches terminal state ─────────────
  useEffect(() => {
    if (TERMINAL_STATUSES.has(status)) {
      clearInterval(pollTimerRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onclose = null;
        ws.onerror = null;
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        ws.close();
        wsRef.current = null;
      }
    }
  }, [status]);

  // ── Cleanup on component unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onclose = null;
        ws.onerror = null;
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        ws.close();
      }
      clearInterval(pollTimerRef.current);
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return {
    jobId,
    jobData,
    status,
    wsStatus,
    wsError,
    reconnectAttempt,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectNow,
    startJob,
    attachJob,
    cancelJob,
    reset,
    isRunning: status === JOB_STATUS.PROCESSING || status === JOB_STATUS.QUEUED,
    isTerminal: TERMINAL_STATUSES.has(status),
  };
}

export default useProcessingJob;
