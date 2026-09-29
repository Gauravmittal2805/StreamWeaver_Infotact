import { pipeline } from "stream/promises";
import * as fileService from "./file.service.js";
import * as jobService from "./job.service.js";
import { getMapping } from "./mapping.service.js";
import { getTransformation } from "./transformation.service.js";
import { createParserStream } from "../parsers/parser.factory.js";
import { createMappingTransform } from "../streams/mapping.transform.js";
import { createTransformationTransform } from "../streams/transformation.transform.js";
import { createETLTransform } from "../streams/etl.stream.js";
import { createCounterStream } from "../streams/counter.stream.js";
import { JOB_STATUS } from "../utils/job.utils.js";

/**
 * Orchestrates the full StreamWeaver ETL processing pipeline for a given dataset and job.
 * Pipeline stages (Step 8):
 * CSV / JSON -> Parser -> Mapping Transform -> Transformation Transform -> ETL Transform -> Counter Stream
 *
 * Preserves streaming backpressure throughout and processes multi-GB files incrementally (Step 9).
 *
 * @param {string} datasetId
 * @param {string} jobId
 * @param {object} [options]
 * @returns {Promise<object>} ETL summary result
 */
export async function processDataset(datasetId, jobId, options = {}) {
  console.log(`[ETL] Starting processing for dataset '${datasetId}' (Job: ${jobId})`);

  const startedAt = new Date().toISOString();
  await jobService.updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    startedAt
  });

  try {
    // 1. Obtain readable stream & metadata from Member 1's getReadStream interface
    const readStreamResult = await fileService.getReadStream(datasetId);

    if (!readStreamResult || !readStreamResult.success) {
      const errMsg = (readStreamResult && readStreamResult.error) || `Dataset '${datasetId}' read stream not available`;
      throw new Error(errMsg);
    }

    const { stream: fileReadStream, metadata } = readStreamResult;
    const format = (metadata && metadata.format) ? metadata.format.toLowerCase() : (options.format || "csv");
    console.log(`[ETL] Stream acquired. Detected format '${format}' for dataset '${datasetId}'`);

    // 2. Instantiate format-agnostic parser stream
    const parserStream = createParserStream(format, options.parserOptions);

    // 3. Retrieve optional mapping configuration
    const mappingConfig = options.mapping || getMapping(datasetId);
    const mappingTransform = mappingConfig ? createMappingTransform(mappingConfig) : null;
    if (mappingConfig) {
      console.log(`[ETL] Applied mapping rules for dataset '${datasetId}':`, mappingConfig.mappings);
    }

    // 4. Retrieve optional transformation configuration (Step 8 & 9 integration)
    const transformationConfig = options.transformations || getTransformation(datasetId);
    const transformationTransform = transformationConfig ? createTransformationTransform(transformationConfig) : null;
    if (transformationConfig) {
      console.log(`[ETL] Applied transformation rules for dataset '${datasetId}':`, transformationConfig.transformations);
    }

    // 5. Instantiate core ETL Transform stream
    const transformStream = createETLTransform(options.transformOptions);

    // 6. Instantiate Metric & Counter stream with throttled job updates
    const counterStream = createCounterStream({
      progressIntervalMs: options.progressIntervalMs || 500,
      totalExpectedRows: (metadata && metadata.totalRows) || options.totalRows || 0,
      onProgress: async (metrics) => {
        try {
          await jobService.updateJob(jobId, {
            totalRows: (metadata && metadata.totalRows) || metrics.recordsReceived,
            processedRows: metrics.processedRows || 0,
            successfulRows: metrics.successfulRows || 0,
            failedRows: metrics.failedRows || 0,
            mappedRows: metrics.mappedRows || 0,
            transformedRows: metrics.transformedRows || 0,
            rowsPerSecond: metrics.rowsPerSecond || 0,
            progressPercent: metrics.progressPercent || 0,
            errors: metrics.errors || []
          });
        } catch (err) {
          console.error(`[ETL] Failed to update progress for job ${jobId}:`, err.message);
        }
      }
    });

    // 7. Build stream pipeline stages: CSV/JSON -> Parser -> Mapping -> Transformation -> ETL -> Counter
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

    pipelineStages.push(transformStream, counterStream);

    // 8. Execute pipeline with full streaming backpressure
    await pipeline(...pipelineStages);

    // 9. Complete job with final metrics
    const finalMetrics = counterStream.getMetrics();
    const completedAt = new Date().toISOString();

    const completedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.COMPLETED,
      totalRows: (metadata && metadata.totalRows) || finalMetrics.recordsReceived,
      processedRows: finalMetrics.processedRows || 0,
      successfulRows: finalMetrics.successfulRows || 0,
      failedRows: finalMetrics.failedRows || 0,
      mappedRows: finalMetrics.mappedRows || 0,
      transformedRows: finalMetrics.transformedRows || 0,
      rowsPerSecond: finalMetrics.rowsPerSecond || 0,
      progressPercent: 100,
      errors: finalMetrics.errors || [],
      completedAt
    });

    console.log(`[ETL] Completed job '${jobId}': ${finalMetrics.successfulRows} success, ${finalMetrics.failedRows} failed in ${finalMetrics.durationSeconds}s (${finalMetrics.rowsPerSecond} rows/sec)`);

    return {
      success: true,
      jobId,
      status: JOB_STATUS.COMPLETED,
      metrics: finalMetrics,
      job: completedJob
    };
  } catch (error) {
    console.error(`[ETL] Processing failed for job '${jobId}':`, error.message);
    const completedAt = new Date().toISOString();

    const failedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.FAILED,
      completedAt,
      error: error.message
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
