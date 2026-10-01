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
          code: ERROR_CODES.PROCESSING_ERROR,
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
          code: ERROR_CODES.PROCESSING_ERROR,
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
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (job.status === "completed" || job.status === "failed") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a job with status: ${job.status}`
      });
    }
    const updated = await jobService.updateJob(jobId, {
      status: "cancelled",
      completedAt: new Date().toISOString()
    });
    res.json({ success: true, job: updated });
  } catch (error) {
    console.error("Cancel job error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel job" });
  }
}

export default {
  createJob,
  getJob,
  getAllJobs,
  startJob
};
