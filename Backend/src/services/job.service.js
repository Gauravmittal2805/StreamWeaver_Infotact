const { getDB } = require("../config/db");
const { JOB_STATUS } = require("../utils/job.utils");

const COLLECTION = "jobs";
const inMemoryJobs = new Map();

async function createJob(datasetId) {
  const job = {
    jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    datasetId,
    status: JOB_STATUS.QUEUED,
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    rowsPerSecond: 0,
    errors: [],
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };

  inMemoryJobs.set(job.jobId, { ...job });

  try {
    const db = getDB();
    await db.collection(COLLECTION).insertOne(job);
  } catch (err) {
    // Database might not be connected in isolated unit test mode
  }

  return job;
}

async function getJob(jobId) {
  try {
    const db = getDB();
    const job = await db.collection(COLLECTION).findOne({ jobId });
    if (job) return job;
  } catch (err) {
    // Fall back to memory
  }

  return inMemoryJobs.get(jobId) || null;
}

async function updateJob(jobId, updates) {
  // Cap errors array if provided to keep document size bounded
  const cleanUpdates = { ...updates };
  if (cleanUpdates.errors && Array.isArray(cleanUpdates.errors)) {
    cleanUpdates.errors = cleanUpdates.errors.slice(0, 100);
  }

  const existing = inMemoryJobs.get(jobId) || {};
  const merged = { ...existing, ...cleanUpdates };
  inMemoryJobs.set(jobId, merged);

  try {
    const db = getDB();
    await db.collection(COLLECTION).updateOne(
      { jobId },
      { $set: cleanUpdates }
    );
    return getJob(jobId);
  } catch (err) {
    // Return in-memory copy if DB is unavailable
    return merged;
  }
}

module.exports = {
  createJob,
  getJob,
  updateJob
};

