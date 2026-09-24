/**
 * ETL Job Data Contract — Frontend ↔ Member 2 (ETL Processing System)
 *
 * This file defines the data structures the frontend expects to receive
 * from the ETL processing backend (Member 2's system).
 *
 * Current status: STRUCTURE ONLY — WebSocket/polling integration is NOT
 * implemented yet. This serves as the agreed contract for future integration.
 *
 * Coordination: Member 3 (Frontend) ↔ Member 2 (ETL Backend)
 */

// ── Job Status Enum ──────────────────────────────────────────────────────────
/**
 * @typedef {'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'} ETLJobStatus
 */

// ── ETL Job Object (received from Member 2's API) ────────────────────────────
/**
 * @typedef {Object} ETLJob
 * @property {string}        jobId            - Unique job identifier (e.g. "job_abc123")
 * @property {string}        datasetId        - Source dataset ID (links to Member 1's file service)
 * @property {ETLJobStatus}  status           - Current job lifecycle state
 * @property {number}        processedRows    - Total rows processed so far
 * @property {number}        successfulRows   - Rows successfully transformed
 * @property {number}        failedRows       - Rows that failed transformation/validation
 * @property {number}        rowsPerSecond    - Current processing throughput
 * @property {number|null}   totalRows        - Total rows in source (null if unknown)
 * @property {number}        progressPercent  - 0–100 completion percentage (null if totalRows unknown)
 * @property {string}        startedAt        - ISO 8601 timestamp when job started
 * @property {string|null}   completedAt      - ISO 8601 timestamp when job finished (null if running)
 * @property {string|null}   error            - Error message if status === 'failed'
 * @property {Object|null}   outputMeta       - Output dataset metadata after completion
 */

// ── Example payload Member 2 should send ─────────────────────────────────────
/*
{
  "jobId": "job_abc123",
  "datasetId": "dataset_cust_5200m",
  "status": "running",
  "processedRows": 120000,
  "successfulRows": 119850,
  "failedRows": 150,
  "rowsPerSecond": 8400,
  "totalRows": null,
  "progressPercent": null,
  "startedAt": "2026-09-24T14:30:00.000Z",
  "completedAt": null,
  "error": null,
  "outputMeta": null
}
*/

// ── Expected API Endpoints (Member 2 to implement) ───────────────────────────
/*
  GET  /api/jobs/:jobId              → Returns ETLJob object
  GET  /api/jobs?datasetId=:id       → Returns array of ETLJob for a dataset
  POST /api/jobs                     → Start new ETL job
    body: { datasetId: string, pipelineConfig: Object }
  POST /api/jobs/:jobId/cancel       → Cancel running job
  GET  /api/jobs/:jobId/logs         → Stream processing logs

  Future: WebSocket ws://host/jobs/:jobId for real-time updates
*/

// ── Frontend JobService interface (for future use) ───────────────────────────
export const ETLJobContract = {
  /**
   * Validates that a job payload matches the expected structure
   * @param {any} payload
   * @returns {{ valid: boolean, missing: string[] }}
   */
  validate(payload) {
    const required = [
      'jobId', 'datasetId', 'status',
      'processedRows', 'successfulRows', 'failedRows',
      'rowsPerSecond', 'startedAt',
    ];
    const missing = required.filter((k) => payload[k] === undefined);
    return { valid: missing.length === 0, missing };
  },

  /**
   * Creates an empty/default ETL job object (useful for optimistic UI)
   * @param {string} jobId
   * @param {string} datasetId
   * @returns {ETLJob}
   */
  createEmpty(jobId, datasetId) {
    return {
      jobId,
      datasetId,
      status: 'queued',
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      rowsPerSecond: 0,
      totalRows: null,
      progressPercent: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
      outputMeta: null,
    };
  },

  /**
   * Computes derived display values for UI rendering
   * @param {ETLJob} job
   * @returns {{ errorRate: string, throughput: string, eta: string|null }}
   */
  getDerivedStats(job) {
    const errorRate =
      job.processedRows > 0
        ? ((job.failedRows / job.processedRows) * 100).toFixed(2) + '%'
        : '0.00%';

    const throughput =
      job.rowsPerSecond > 0
        ? job.rowsPerSecond.toLocaleString() + ' rows/s'
        : '—';

    let eta = null;
    if (job.totalRows && job.rowsPerSecond > 0 && job.processedRows < job.totalRows) {
      const remainingRows = job.totalRows - job.processedRows;
      const etaSeconds = Math.ceil(remainingRows / job.rowsPerSecond);
      eta = etaSeconds < 60
        ? `~${etaSeconds}s`
        : `~${Math.ceil(etaSeconds / 60)}m`;
    }

    return { errorRate, throughput, eta };
  },
};

export default ETLJobContract;
