import { Writable } from "stream";
import { calculateRowsPerSecond, calculateProgressPercent } from "../utils/job.utils.js";

/**
 * RecordCounterStream
 * Tracks ETL streaming metrics:
 * - recordsReceived
 * - recordsProcessed
 * - successfulRows
 * - failedRows
 * - rowsPerSecond
 * - progressPercent
 * - malformed errors (capped)
 *
 * Terminal consumer stream that emits progress events and invokes throttled callbacks for job status updates.
 */
export class RecordCounterStream extends Writable {
  constructor(options = {}) {
    super({
      ...options,
      objectMode: true
    });

    this.totalExpectedRows = options.totalExpectedRows || 0;
    this.recordsReceived = 0;
    this.recordsProcessed = 0;
    this.successfulRows = 0;
    this.failedRows = 0;
    this.errors = [];
    this.maxErrorSample = options.maxErrorSample || 100;

    this.startTime = Date.now();
    this.lastProgressTime = Date.now();
    this.progressIntervalMs = options.progressIntervalMs || 500; // 500ms throttle
    this.onProgress = options.onProgress || null;
  }

  _write(record, encoding, callback) {
    this.recordsReceived++;

    if (record && record._isMalformed) {
      this.failedRows++;
      this.recordsProcessed++;

      if (this.errors.length < this.maxErrorSample) {
        this.errors.push({
          rowNumber: record.rowNumber || record._rowNumber || this.recordsReceived,
          field: record.field || null,
          type: (record.error && record.error.type) || "MALFORMED_RECORD",
          message: (record.error && record.error.message) || "Malformed record structure",
          raw: record.raw ? (typeof record.raw === 'object' ? JSON.stringify(record.raw).substring(0, 100) : String(record.raw).substring(0, 100)) : undefined
        });
      }
    } else {
      this.successfulRows++;
      this.recordsProcessed++;
    }

    this._checkProgressThrottle();
    callback();
  }

  _final(callback) {
    // Send final progress update
    this._emitProgress(true);
    callback();
  }

  _checkProgressThrottle() {
    const now = Date.now();
    if (now - this.lastProgressTime >= this.progressIntervalMs) {
      this.lastProgressTime = now;
      this._emitProgress(false);
    }
  }

  _emitProgress(isFinal = false) {
    const metrics = this.getMetrics();
    this.emit("progress", { ...metrics, isFinal });

    if (typeof this.onProgress === "function") {
      try {
        this.onProgress({ ...metrics, isFinal });
      } catch (err) {
        // Prevent callback errors from terminating the stream
        console.error("Error in counter onProgress callback:", err);
      }
    }
  }

  getMetrics() {
    const elapsedSeconds = Math.max((Date.now() - this.startTime) / 1000, 0.001);
    const rowsPerSecond = calculateRowsPerSecond(this.recordsProcessed, this.startTime, Date.now());
    const total = this.totalExpectedRows || this.recordsReceived;
    const progressPercent = calculateProgressPercent(this.recordsProcessed, total);

    return {
      recordsReceived: this.recordsReceived,
      recordsProcessed: this.recordsProcessed,
      processedRows: this.recordsProcessed,
      successfulRows: this.successfulRows,
      failedRows: this.failedRows,
      rowsPerSecond,
      progressPercent,
      errors: this.errors,
      durationSeconds: Number(elapsedSeconds.toFixed(2))
    };
  }
}

export function createCounterStream(options = {}) {
  return new RecordCounterStream(options);
}

export default {
  RecordCounterStream,
  createCounterStream
};
