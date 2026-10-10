import { pipeline } from "stream/promises";
import * as fileService from "./file.service.js";
import * as jobService from "./job.service.js";
import { getMapping } from "./mapping.service.js";
import { getTransformation } from "./transformation.service.js";
import { createParserStream } from "../parsers/parser.factory.js";
import { createMappingTransform } from "../streams/mapping.transform.js";
import { createTransformationTransform } from "../streams/transformation.transform.js";
import { createMongoStream } from "../streams/mongo.stream.js";
import { createCounterStream } from "../streams/counter.stream.js";
import { JOB_STATUS } from "../utils/job.utils.js";
import { ERROR_CODES } from "../utils/errors.js";

// ─── WebSocket Broadcast Integration ─────────────────────────────────────────
// Set by server.js after WebSocket server is initialized.
let _broadcast = null;

/**
 * Register the WebSocket broadcast function from server.js.
 * @param {Function} fn - broadcast(jobId, data) function
 */
export function setBroadcast(fn) {
  _broadcast = fn;
}

/**
 * Safely broadcast a message for a given job.
 * @param {string} jobId
 * @param {object} data
 */
function broadcastJobEvent(jobId, data) {
  if (!_broadcast) return;
  try {
    _broadcast(jobId, data);
  } catch (err) {
    console.warn(`[ETL] Broadcast failed for job ${jobId}:`, err.message);
  }
}

// ─── Active Job Registry & Cancellation Support ────────────────────────────────
const activeJobs = new Map(); // jobId -> { fileReadStream, isCancelled: boolean }

/**
 * Cancels an actively running ETL job stream.
 * Stops accepting new records and safely finishes the current batch.
 * @param {string} jobId 
 */
export async function cancelETLJob(jobId) {
  const active = activeJobs.get(jobId);
  if (active) {
    active.isCancelled = true;
    if (active.fileReadStream && typeof active.fileReadStream.destroy === 'function') {
      active.fileReadStream.destroy();
    }
  }

  const completedAt = new Date().toISOString();
  const updatedJob = await jobService.updateJob(jobId, {
    status: JOB_STATUS.CANCELLED,
    completedAt
  });

  broadcastJobEvent(jobId, {
    type: "cancelled",
    jobId,
    status: JOB_STATUS.CANCELLED,
    processedRows: updatedJob.processedRows || 0,
    successfulRows: updatedJob.successfulRows || 0,
    failedRows: updatedJob.failedRows || 0,
    progressPercent: updatedJob.progressPercent || 0,
    rowsPerSecond: updatedJob.rowsPerSecond || 0,
    completedAt
  });

  return updatedJob;
}

/**
 * Orchestrates the full StreamWeaver ETL processing pipeline for a dataset and job.
 *
 * Stream Pipeline:
 * File Read Stream → Parser Stream → Mapping & Transformation Stream → MongoDB Bulk Buffer Stream → Metric & Counter Stream
 *
 * Preserves streaming backpressure throughout and processes multi-GB files incrementally with flat memory profile.
 *
 * @param {string} datasetId
 * @param {string} jobId
 * @param {object} [options]
 * @returns {Promise<object>} ETL summary result
 */
export async function processDataset(datasetId, jobId, options = {}) {
  console.log(`[ETL Engine] Starting real stream pipeline for dataset '${datasetId}' (Job: ${jobId})`);

  const startedAt = new Date().toISOString();
  await jobService.updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    startedAt
  });

  // Register active job for cancellation tracking
  const activeJobRef = { fileReadStream: null, isCancelled: false };
  activeJobs.set(jobId, activeJobRef);

  // Broadcast job start
  broadcastJobEvent(jobId, {
    type: "progress",
    jobId,
    status: JOB_STATUS.PROCESSING,
    startedAt,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    rowsPerSecond: 0,
    progressPercent: 0,
  });

  try {
    // 1. Obtain readable stream & metadata
    const readStreamResult = await fileService.getReadStream(datasetId);

    if (!readStreamResult || !readStreamResult.success) {
      const errMsg = (readStreamResult && readStreamResult.error) || `Dataset '${datasetId}' read stream not available`;
      throw new Error(errMsg);
    }

    const { stream: fileReadStream, metadata } = readStreamResult;
    activeJobRef.fileReadStream = fileReadStream;

    const format = (metadata && metadata.format) ? metadata.format.toLowerCase() : (options.format || "csv");
    console.log(`[ETL Engine] Stream acquired. Format '${format}' for dataset '${datasetId}'`);

    // 2. Parser stream (CSV or JSON)
    const parserStream = createParserStream(format, options.parserOptions);

    // 3. Mapping and transformation stream
    const mappingConfig = options.mapping || getMapping(datasetId);
    const mappingTransform = mappingConfig ? createMappingTransform(mappingConfig) : null;
    if (mappingConfig) {
      console.log(`[ETL Engine] Applied mapping rules for dataset '${datasetId}':`, mappingConfig.mappings);
    }

    // 4. Retrieve optional transformation configuration
    const transformationConfig = options.transformations || getTransformation(datasetId);
    const transformationTransform = transformationConfig ? createTransformationTransform(transformationConfig) : null;

    // 5. Configurable MongoDB Bulk Buffer stream (Step 10 & 11)
    const batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE || '1000', 10);
    const mongoStream = createMongoStream({
      datasetId,
      batchSize,
      dropExisting: options.dropExisting !== undefined ? options.dropExisting : true,
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : 3,
      onBatchResult: (result) => {
        if (result.failed > 0) {
          console.warn(`[ETL Engine] MongoDB Batch write reported ${result.failed} failures.`);
        }
      }
    });

    // 6. Metric & Counter stream with progress callbacks (Step 12 & 13)
    const counterStream = createCounterStream({
      progressIntervalMs: options.progressIntervalMs || 500,
      totalExpectedRows: (metadata && metadata.totalRows) || options.totalRows || 0,
      onProgress: async (metrics) => {
        try {
          if (activeJobRef.isCancelled) return;

          // Combine malformed record errors and MongoDB write errors for tracking (Step 7)
          const dbErrors = (typeof mongoStream.getErrors === 'function') ? mongoStream.getErrors() : [];
          const combinedErrors = [...(metrics.errors || []), ...dbErrors].slice(0, 100);

          const mongoFailed = mongoStream.failedCount || 0;

          const totalFailed = metrics.failedRows + mongoFailed;
          const totalSuccessful = Math.max(0, metrics.successfulRows - mongoFailed);

          await jobService.updateJob(jobId, {
            totalRows: (metadata && metadata.totalRows) || metrics.recordsReceived,
            processedRows: metrics.processedRows || 0,
            successfulRows: totalSuccessful,
            failedRows: totalFailed,
            rowsPerSecond: metrics.rowsPerSecond || 0,
            progressPercent: metrics.progressPercent || 0,
            errors: combinedErrors
          });

          // Broadcast live progress to subscribed WebSocket clients
          broadcastJobEvent(jobId, {
            type: "progress",
            jobId,
            status: JOB_STATUS.PROCESSING,
            totalRows: (metadata && metadata.totalRows) || metrics.recordsReceived,
            processedRows: metrics.processedRows || 0,
            successfulRows: totalSuccessful,
            failedRows: totalFailed,
            rowsPerSecond: metrics.rowsPerSecond || 0,
            progressPercent: metrics.progressPercent || 0,
          });
        } catch (err) {
          console.error(`[ETL Engine] Failed to update progress for job ${jobId}:`, err.message);
        }
      }
    });

    // 7. Assemble real stream pipeline
    const pipelineStages = [
      fileReadStream,
      parserStream
    ];

    if (mappingTransform) {
      pipelineStages.push(mappingTransform);
    }

    if (transformationTransform) {
      pipelineStages.push(transformationTransform);
    }

    pipelineStages.push(mongoStream, counterStream);

    // 8. Execute pipeline with full streaming backpressure
    await pipeline(...pipelineStages);

    if (activeJobRef.isCancelled) {
      return {
        success: false,
        jobId,
        status: JOB_STATUS.CANCELLED,
        message: "Job processing was cancelled by user"
      };
    }

    // 9. Final job update on completion
    const finalMetrics = counterStream.getMetrics();
    const dbErrors = (typeof mongoStream.getErrors === 'function') ? mongoStream.getErrors() : [];
    const combinedErrors = [...(finalMetrics.errors || []), ...dbErrors].slice(0, 100);

    const completedAt = new Date().toISOString();

    const finalFailed = finalMetrics.failedRows + (mongoStream.failedCount || 0);
    const finalSuccessful = Math.max(0, finalMetrics.successfulRows - (mongoStream.failedCount || 0));
    const finalTotal = finalSuccessful + finalFailed;

    const completedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.COMPLETED,
      totalRows: (metadata && metadata.totalRows) || finalTotal,
      processedRows: finalTotal,
      successfulRows: finalSuccessful,
      failedRows: finalFailed,
      rowsPerSecond: finalMetrics.rowsPerSecond || 0,
      progressPercent: 100,
      errors: combinedErrors,
      completedAt
    });

    console.log(`[ETL Engine] Completed job '${jobId}': ${finalSuccessful} success, ${finalFailed} failed in ${finalMetrics.durationSeconds}s (${finalMetrics.rowsPerSecond} rows/sec)`);

    // Broadcast completion event
    broadcastJobEvent(jobId, {
      type: "completed",
      jobId,
      status: JOB_STATUS.COMPLETED,
      totalRows: completedJob.totalRows,
      processedRows: completedJob.processedRows,
      successfulRows: completedJob.successfulRows,
      failedRows: completedJob.failedRows,
      rowsPerSecond: completedJob.rowsPerSecond,
      progressPercent: 100,
      completedAt,
    });

    return {
      success: true,
      jobId,
      status: JOB_STATUS.COMPLETED,
      metrics: {
        ...finalMetrics,
        successfulRows: finalSuccessful,
        failedRows: finalFailed,
        mongoDbTimeSeconds: (typeof mongoStream.getDbTimeSeconds === 'function') ? mongoStream.getDbTimeSeconds() : 0
      },
      job: completedJob
    };
  } catch (error) {
    if (activeJobRef.isCancelled) {
      console.log(`[ETL Engine] Job '${jobId}' stopped due to cancellation.`);
      const currentJob = await jobService.getJob(jobId);
      return {
        success: false,
        jobId,
        status: JOB_STATUS.CANCELLED,
        job: currentJob
      };
    }

    console.error(`[ETL Engine] Processing failed for job '${jobId}':`, error.message);
    const completedAt = new Date().toISOString();

    const failedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.FAILED,
      completedAt,
      error: {
        code: ERROR_CODES.PROCESSING_ERROR,
        message: error.message
      }
    });

    // Broadcast failure event with full progress state
    broadcastJobEvent(jobId, {
      type: "failed",
      jobId,
      status: JOB_STATUS.FAILED,
      processedRows: failedJob.processedRows || 0,
      successfulRows: failedJob.successfulRows || 0,
      failedRows: failedJob.failedRows || 0,
      rowsPerSecond: failedJob.rowsPerSecond || 0,
      progressPercent: failedJob.progressPercent || 0,
      error: error.message || "Processing failed. Please check your dataset and pipeline configuration.",
      completedAt,
    });

    return {
      success: false,
      jobId,
      status: JOB_STATUS.FAILED,
      error: error.message,
      job: failedJob
    };
  } finally {
    activeJobs.delete(jobId);
  }
}

export default {
  processDataset,
  cancelETLJob,
  setBroadcast
};
