const { pipeline } = require("stream/promises");
const fileService = require("./file.service");
const jobService = require("./job.service");
const { createParserStream } = require("../parsers/parser.factory");
const { createETLTransform } = require("../streams/etl.stream");
const { createCounterStream } = require("../streams/counter.stream");
const { JOB_STATUS } = require("../utils/job.utils");

/**
 * Orchestrates the full ETL processing pipeline for a given dataset and job.
 * Pipeline stages:
 * Member 1 File Service -> Format Detection -> Parser Stream -> ETL Transform -> Counter Stream -> Job Updates
 *
 * Preserves backpressure throughout and processes multi-GB files incrementally.
 *
 * @param {string} datasetId
 * @param {string} jobId
 * @param {object} [options]
 * @returns {Promise<object>} ETL summary result
 */
async function processDataset(datasetId, jobId, options = {}) {
  console.log(`[ETL] Starting processing for dataset '${datasetId}' (Job: ${jobId})`);

  // Ensure job exists and mark as processing
  const startedAt = new Date();
  await jobService.updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    startedAt
  });

  try {
    // 1. Retrieve dataset metadata from Member 1
    const metadata = await fileService.getDatasetMetadata(datasetId);
    if (!metadata || !metadata.format) {
      throw new Error(`Invalid metadata for dataset '${datasetId}': missing format`);
    }

    const format = metadata.format.toLowerCase();
    console.log(`[ETL] Detected format '${format}' for dataset '${datasetId}'`);

    // 2. Obtain readable stream from Member 1
    const fileReadStream = await fileService.getReadStream(datasetId);

    // 3. Instantiate format-agnostic parser stream
    const parserStream = createParserStream(format, options.parserOptions);

    // 4. Instantiate core ETL Transform stream
    const transformStream = createETLTransform(options.transformOptions);

    // 5. Instantiate Metric & Counter stream with throttled job updates
    const counterStream = createCounterStream({
      progressIntervalMs: options.progressIntervalMs || 1000,
      onProgress: async (metrics) => {
        try {
          await jobService.updateJob(jobId, {
            totalRows: metadata.totalRows || metrics.recordsReceived,
            processedRows: metrics.processedRows || metrics.recordsProcessed || 0,
            successfulRows: metrics.successfulRows || 0,
            failedRows: metrics.failedRows || 0,
            rowsPerSecond: metrics.rowsPerSecond || 0,
            errors: metrics.errors || []
          });
        } catch (err) {
          console.error(`[ETL] Failed to update progress for job ${jobId}:`, err.message);
        }
      }
    });

    // 6. Execute pipeline with full backpressure
    await pipeline(
      fileReadStream,
      parserStream,
      transformStream,
      counterStream
    );

    // 7. Complete job with final metrics
    const finalMetrics = counterStream.getMetrics();
    const completedAt = new Date();

    const completedJob = await jobService.updateJob(jobId, {
      status: JOB_STATUS.COMPLETED,
      totalRows: metadata.totalRows || finalMetrics.recordsReceived,
      processedRows: finalMetrics.processedRows || finalMetrics.recordsProcessed || 0,
      successfulRows: finalMetrics.successfulRows || 0,
      failedRows: finalMetrics.failedRows || 0,
      rowsPerSecond: finalMetrics.rowsPerSecond || 0,
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
    const completedAt = new Date();

    await jobService.updateJob(jobId, {
      status: JOB_STATUS.FAILED,
      completedAt,
      error: error.message
    });

    return {
      success: false,
      jobId,
      status: JOB_STATUS.FAILED,
      error: error.message
    };
  }
}

module.exports = {
  processDataset
};

