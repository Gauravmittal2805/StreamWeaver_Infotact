const jobService = require("../services/job.service");

async function createJob(req, res) {
  try {
    const { datasetId } = req.body;
    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: "datasetId is required"
      });
    }
    const job = await jobService.createJob(datasetId);
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

module.exports = {
  createJob,
  getJob
};
