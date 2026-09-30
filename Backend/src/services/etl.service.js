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

  try {
    // 1. Obtain readable stream & metadata
    const readStreamResult = await fileService.getReadStream(datasetId);

    if (!readStreamResult || !readStreamResult.success) {
      const errMsg = (readStreamResult && readStreamResult.error) || `Dataset '${datasetId}' read stream not available`;
      throw new Error(errMsg);
    }

    const { stream: fileReadStream, metadata } = readStreamResult;
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

    // 4. Standalone transformation stream (if any)
    const transformationConfig = options.transformations || getTransformation(datasetId);
    const transformationTransform = transformationConfig ? createTransformationTransform(transformationConfig) : null;

    // 5. Configurable MongoDB Bulk Buffer stream (Step 10 & 11)
    const batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE || '1000', 10);
    const mongoStream = createMongoStream({
      datasetId,
      batchSize,
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
          // Adjust successful/failed counts with MongoDB write metrics if available
          const mongoInserted = mongoStream.insertedCount || 0;
          const mongoFailed = mongoStream.failedCount || 0;

          const totalFailed = metrics.failedRows + mongoFailed;
          const totalSuccessful = Math.max(metrics.successfulRows - mongoFailed, mongoInserted);

          await jobService.updateJob(jobId, {
            totalRows: (metadata && metadata.totalRows) || metrics.recordsReceived,
            processedRows: metrics.processedRows || 0,
            successfulRows: totalSuccessful,
            failedRows: totalFailed,
            rowsPerSecond: metrics.rowsPerSecond || 0,
            progressPercent: metrics.progressPercent || 0,
            errors: metrics.errors || []
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

    // 9. Final job update on completion
    const finalMetrics = counterStream.getMetrics();
    const completedAt = new Date().toISOString();

    const finalFailed = finalMetrics.failedRows + (mongoStream.failedCount || 0);
    const finalSuccessful = Math.max(finalMetrics.successfulRows - (mongoStream.failedCount || 0), mongoStream.insertedCount || 0);

    const completedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.COMPLETED,
      totalRows: (metadata && metadata.totalRows) || finalMetrics.recordsReceived,
      processedRows: finalMetrics.processedRows || 0,
      successfulRows: finalSuccessful,
      failedRows: finalFailed,
      rowsPerSecond: finalMetrics.rowsPerSecond || 0,
      progressPercent: 100,
      errors: finalMetrics.errors || [],
      completedAt
    });

    console.log(`[ETL Engine] Completed job '${jobId}': ${finalSuccessful} success, ${finalFailed} failed in ${finalMetrics.durationSeconds}s (${finalMetrics.rowsPerSecond} rows/sec)`);

    return {
      success: true,
      jobId,
      status: JOB_STATUS.COMPLETED,
      metrics: {
        ...finalMetrics,
        successfulRows: finalSuccessful,
        failedRows: finalFailed
      },
      job: completedJob
    };
  } catch (error) {
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

    return {
      success: false,
      jobId,
      status: JOB_STATUS.FAILED,
      error: error.message,
      job: failedJob
    };
  }
}

export default {
  processDataset
};
