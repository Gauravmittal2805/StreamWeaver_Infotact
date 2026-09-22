import { getDB } from "../config/db.js";
import { JOB_STATUS, calculateProgressPercent } from "../utils/job.utils.js";

const COLLECTION = "jobs";
const inMemoryJobs = new Map();

export async function createJob(datasetId) {
  const job = {
    jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    datasetId,
    status: JOB_STATUS.QUEUED,
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    rowsPerSecond: 0,
    progressPercent: 0,
    errors: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null
  };

  inMemoryJobs.set(job.jobId, { ...job });

  try {
    const db = getDB();
    await db.collection(COLLECTION).insertOne(job);
  } catch (err) {
    // Database might not be connected in isolated test mode
  }

  return job;
}

export async function getJob(jobId) {
  try {
    const db = getDB();
    const job = await db.collection(COLLECTION).findOne({ jobId });
    if (job) return formatJobResponse(job);
  } catch (err) {
    // Fall back to memory
  }

  const memJob = inMemoryJobs.get(jobId);
  return memJob ? formatJobResponse(memJob) : null;
}

export async function updateJob(jobId, updates) {
  // Cap errors array if provided to keep document size bounded
  const cleanUpdates = { ...updates };
  if (cleanUpdates.errors && Array.isArray(cleanUpdates.errors)) {
    cleanUpdates.errors = cleanUpdates.errors.slice(0, 100);
  }

  const existing = inMemoryJobs.get(jobId) || {};
  const merged = { ...existing, ...cleanUpdates };

  // Calculate progress percent automatically if processedRows and totalRows exist
  merged.progressPercent = calculateProgressPercent(
    merged.processedRows || 0,
    merged.totalRows || 0
  );

  inMemoryJobs.set(jobId, merged);

  try {
    const db = getDB();
    await db.collection(COLLECTION).updateOne(
      { jobId },
      { $set: merged }
    );
    return formatJobResponse(merged);
  } catch (err) {
    // Return in-memory copy if DB is unavailable
    return formatJobResponse(merged);
  }
}

function formatJobResponse(job) {
  const total = job.totalRows || 0;
  const processed = job.processedRows || 0;
  const progressPercent = job.progressPercent !== undefined
    ? job.progressPercent
    : calculateProgressPercent(processed, total);

  return {
    jobId: job.jobId,
    datasetId: job.datasetId,
    status: job.status,
    totalRows: total,
    processedRows: processed,
    successfulRows: job.successfulRows || 0,
    failedRows: job.failedRows || 0,
    rowsPerSecond: job.rowsPerSecond || 0,
    progressPercent,
    errors: job.errors || [],
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error || null
  };
}

export default {
  createJob,
  getJob,
  updateJob
};
