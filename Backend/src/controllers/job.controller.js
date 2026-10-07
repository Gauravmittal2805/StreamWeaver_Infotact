import * as jobService from "../services/job.service.js";
import * as etlService from "../services/etl.service.js";
import { ERROR_CODES, sendErrorResponse } from "../utils/errors.js";

export async function createJob(req, res) {
  try {
    const { datasetId, autoStart = true, batchSize } = req.body || {};
    if (!datasetId) {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_DATA,
          message: "datasetId is required"
        }
      });
    }

    const job = await jobService.createJob(datasetId);

    if (autoStart) {
      setImmediate(() => {
        etlService.processDataset(datasetId, job.jobId, { batchSize }).catch((err) => {
          console.error(`Background job processing error for ${job.jobId}:`, err);
        });
      });
    }

    res.status(201).json({
      success: true,
      jobId: job.jobId,
      job
    });
  } catch (error) {
    console.error("Create job error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function getJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }
    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error("Get job error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function getJobStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }
    res.json({
      success: true,
      jobId: job.jobId,
      datasetId: job.datasetId,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successfulRows: job.successfulRows,
      failedRows: job.failedRows,
      rowsPerSecond: job.rowsPerSecond,
      progressPercent: job.progressPercent,
      error: job.error || null,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    });
  } catch (error) {
    console.error("Get job status error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function getJobStats(req, res) {
  try {
    const { jobId } = req.params;
    const stats = await jobService.getJobStats(jobId);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Get job stats error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function getAllJobs(req, res) {
  try {
    const { datasetId } = req.query;
    const jobs = await jobService.getAllJobs(datasetId);
    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error("Get all jobs error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function startJob(req, res) {
  try {
    const { jobId } = req.params;
    const { batchSize } = req.body || {};

    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }

    etlService.processDataset(job.datasetId, job.jobId, { batchSize }).catch((err) => {
      console.error(`Start job error for ${jobId}:`, err);
    });

    res.json({
      success: true,
      message: "Job processing initiated",
      jobId
    });
  } catch (error) {
    console.error("Start job error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function cancelJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_JOB_STATUS,
          message: `Cannot cancel job '${jobId}' with terminal status '${job.status}'`
        }
      });
    }

    const cancelledJob = await etlService.cancelETLJob(jobId);
    res.json({
      success: true,
      message: `Job '${jobId}' has been cancelled`,
      job: cancelledJob
    });
  } catch (error) {
    console.error("Cancel job error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function retryJob(req, res) {
  try {
    const { jobId } = req.params;
    const { batchSize } = req.body || {};

    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }

    if (job.status !== "failed" && job.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_JOB_STATUS,
          message: `Only failed or cancelled jobs can be retried (current status: '${job.status}')`
        }
      });
    }

    const resetJob = await jobService.updateJob(jobId, {
      status: "queued",
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      rowsPerSecond: 0,
      progressPercent: 0,
      errors: [],
      startedAt: null,
      completedAt: null,
      error: null
    });

    setImmediate(() => {
      etlService.processDataset(job.datasetId, jobId, { batchSize }).catch((err) => {
        console.error(`Retry processing error for ${jobId}:`, err);
      });
    });

    res.json({
      success: true,
      message: `Job '${jobId}' retry initiated`,
      job: resetJob
    });
  } catch (error) {
    console.error("Retry job error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export async function getJobFailedRecords(req, res) {
  try {
    const { jobId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 500);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.JOB_NOT_FOUND,
          message: `Job '${jobId}' not found`
        }
      });
    }

    const allErrors = job.errors || [];
    const totalFailed = job.failedRows || allErrors.length;
    const paginatedErrors = allErrors.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      jobId,
      totalFailed,
      limit,
      offset,
      count: paginatedErrors.length,
      failedRecords: paginatedErrors
    });
  } catch (error) {
    console.error("Get job failed records error:", error);
    return sendErrorResponse(res, error, 500);
  }
}

export default {
  createJob,
  getJob,
  getJobStatus,
  getJobStats,
  getJobFailedRecords,
  getAllJobs,
  startJob,
  cancelJob,
  retryJob
};
