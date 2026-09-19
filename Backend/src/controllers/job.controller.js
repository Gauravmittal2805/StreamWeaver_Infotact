const jobService = require("../services/job.service");
const etlService = require("../services/etl.service");

async function createJob(req, res) {
  try {
    const { datasetId, autoStart = true } = req.body;
    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: "datasetId is required"
      });
    }

    const job = await jobService.createJob(datasetId);

    // If autoStart is enabled, dispatch processing in the background
    if (autoStart) {
      setImmediate(() => {
        etlService.processDataset(datasetId, job.jobId).catch((err) => {
          console.error(`Background job processing error for ${job.jobId}:`, err);
        });
      });
    }

    res.status(201).json({
      success: true,
      job
    });
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create job"
    });
  }
}

async function getJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }
    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch job"
    });
  }
}

async function startJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = await jobService.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    // Trigger processing
    etlService.processDataset(job.datasetId, job.jobId).catch((err) => {
      console.error(`Start job error for ${jobId}:`, err);
    });

    res.json({
      success: true,
      message: "Job processing initiated",
      jobId
    });
  } catch (error) {
    console.error("Start job error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start job"
    });
  }
}

module.exports = {
  createJob,
  getJob,
  startJob
};

